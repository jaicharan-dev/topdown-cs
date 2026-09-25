---
id: 16-system-call-lifecycle
title: "System Calls: Hardware Traps, Mode Switching & Vector Tables"
description: "Learn how user-mode applications safely request OS services via modern SYSCALL/SYSRET instructions, the IDT, and libc wrapper buffering."
sidebar_position: 16
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a system call, and what exact sequence of hardware and software steps occurs when an application executes one? How do modern SYSCALL instructions differ from legacy INT 0x80 traps?"

A **System Call** is the programmatic boundary through which a user-mode application requests privileged services from the operating system kernel (such as allocating memory, reading files, or opening network sockets). It transitions the CPU from unprivileged **User Mode (Ring 3)** into privileged **Kernel Mode (Ring 0)**.

---

### The ELI5 Analogy: The Bank Teller

- **User Space:** The bank lobby. You can write on forms and talk to other customers, but you are strictly forbidden from entering the vault.
- **Kernel Space:** The secure subterranean vault holding all currency and gold bars (hardware, disk sectors, network interfaces).
- **The System Call:** You walk up to the Bank Teller's bulletproof window and hand them a withdrawal slip. The Teller validates your identity, steps into the vault on your behalf, retrieves the cash, hands it to you through the slot, and returns you to the lobby. You never stepped foot into the vault.

---

### The Step-by-Step System Call Lifecycle

```
USER SPACE (Ring 3)                                    KERNEL SPACE (Ring 0)
┌─────────────────────────────────┐                    ┌───────────────────────────────────┐
│ 1. Application calls write(...) │                    │                                   │
│    in C Standard Library (libc) │                    │                                   │
├─────────────────────────────────┤                    │                                   │
│ 2. libc loads RAX = 1 (sys_write)                    │                                   │
│    Loads RDI, RSI, RDX args     │                    │                                   │
├─────────────────────────────────┤                    │                                   │
│ 3. Executes "SYSCALL"           │ ── Hardware Trap ─►│ 4. CPU flips to Ring 0            │
│                                 │                    │    Saves RIP, loads Kernel Stack  │
│                                 │                    ├───────────────────────────────────┤
│                                 │                    │ 5. Indexes sys_call_table[RAX]    │
│                                 │                    │    Validates user pointers        │
│                                 │                    │    Calls sys_write() driver       │
│                                 │                    ├───────────────────────────────────┤
│ 7. Application resumes execution│ ◄── Executes ──────│ 6. Writes return value to RAX     │
│    with bytes written in RAX    │     "SYSRET"       │    Cleans kernel stack            │
└─────────────────────────────────┘                    └───────────────────────────────────┘
```

1. **User Wrapper Invocation:** Application calls `write(fd, buf, count)` via `libc`.
2. **Register Setup:** `libc` places the unique **System Call Number** (`1` for `sys_write` on x86-64) into the `RAX` register and copies arguments into `RDI`, `RSI`, and `RDX`.
3. **The Hardware Trap:** The CPU executes the dedicated machine instruction: **`SYSCALL`**.
4. **Privilege Mode Switch:** The CPU automatically saves the user Instruction Pointer (`RIP`) into `RCX`, switches from Ring 3 to Ring 0, and loads the kernel stack pointer (`RSP`).
5. **Table Dispatch:** The kernel jumps to the address stored in the hardware `MSR_LSTAR` register, indexing into `sys_call_table` using the number in `RAX`.
6. **Kernel Execution & Safety Verification:** The kernel verifies that the user-space memory buffer pointer is valid and legal (preventing processes from tricking the kernel into overwriting kernel memory). It then calls the underlying device driver or filesystem handler.
7. **Return to User Space:** The kernel stores the result in `RAX` and executes **`SYSRET`**, restoring the user stack and returning execution to the application.

---

### The Core Interview Trap: Legacy `INT 0x80` vs. Modern `SYSCALL` / `SYSRET`

Interviewers frequently ask: *"How did system call invocation change from 32-bit x86 to modern 64-bit architectures?"*

| Feature | Legacy 32-bit (`INT 0x80`) | Modern 64-bit (`SYSCALL` / `SYSRET`) |
| :--- | :--- | :--- |
| **Mechanism** | Software Interrupt via Interrupt Descriptor Table (IDT). | Dedicated CPU hardware instruction. |
| **Execution Path** | Traverses memory-mapped IDT table in RAM, pushes multiple segment registers (`CS`, `SS`, `EFLAGS`). | Bypasses IDT entirely; jumps directly to target address stored in CPU Model-Specific Register (**`MSR_LSTAR`**). |
| **Latency Cost** | **Slow:** $\approx 100 - 250$ CPU clock cycles. | **Fast:** $\approx 10 - 20$ CPU clock cycles. |

---

### The Role of the `libc` Wrapper Layer

Why do developers use `printf()` and `fopen()` rather than executing raw assembly `syscall`s directly?
1. **User-Space Buffering:** `printf()` buffers string outputs in user space. If you print 50 individual characters, `libc` makes **one** single `write()` system call instead of 50 expensive trips to kernel mode!
2. **Portability:** Translates standardized POSIX APIs across Linux, macOS, and BSD architectures where raw syscall numbers differ.

---

### Summary
"A system call provides a controlled hardware gateway from User Mode to Kernel Mode. Modern 64-bit systems replace legacy INT 0x80 interrupts with high-speed SYSCALL/SYSRET instructions that jump directly to kernel entry points registered in CPU MSRs. Libraries like libc buffer I/O to minimize system call overhead."

---

### Code Demonstration: Invoking a System Call via Raw Assembly vs. `libc`

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/syscall.h>

int main() {
    const char msg1[] = "1. Output via standard libc write() wrapper\n";
    const char msg2[] = "2. Output via direct inline assembly SYSCALL instruction\n";

    // Method A: Standard libc wrapper
    write(STDOUT_FILENO, msg1, sizeof(msg1) - 1);

    // Method B: Raw x86-64 assembly SYSCALL
    // System Call #1 is sys_write(rdi=1, rsi=msg, rdx=len)
    long bytes_written;
    __asm__ __volatile__(
        "mov $1, %%rax\n\t"        // Syscall number 1 = sys_write
        "mov $1, %%rdi\n\t"        // File descriptor 1 = stdout
        "mov %1, %%rsi\n\t"        // Buffer address
        "mov %2, %%rdx\n\t"        // Buffer length
        "syscall\n\t"              // Execute hardware trap to Ring 0
        "mov %%rax, %0\n\t"        // Return value in RAX
        : "=r"(bytes_written)
        : "r"(msg2), "r"((long)sizeof(msg2) - 1)
        : "%rax", "%rdi", "%rsi", "%rdx", "%rcx", "%r11", "memory"
    );

    printf("Bytes written via raw assembly: %ld\n", bytes_written);
    return 0;
}
```