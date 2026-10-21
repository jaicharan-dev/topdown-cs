---
id: 16-system-call-lifecycle
title: "System Calls: The Full Lifecycle"
description: "Walk through exactly what happens when an app makes a system call — the SYSCALL trap, the kernel dispatch table, and libc's buffering trick."
sidebar_position: 16
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a system call, and what exact sequence of hardware and software steps occurs when an application executes one? How do modern SYSCALL instructions differ from legacy INT 0x80 traps?"

A system call is how an app asks the OS to do something it isn't allowed to do itself — read a file, allocate memory, open a socket. It's the one legal door between user mode and kernel mode.

Think of it like going to a bank. You can't walk into the vault yourself. You go to the teller window, hand over a withdrawal slip, and the teller — who's allowed into the vault — gets your cash and hands it back through the slot. You never set foot inside.

---

### What actually happens, step by step

<Diagram>
<Row>
<Box label="App" sub="write(fd, buf, n)" />
<Arrow label="SYSCALL trap" />
<Box label="Kernel" sub="dispatch + run" />
<Arrow label="SYSRET" />
<Box label="App" sub="resumes" />
</Row>
</Diagram>

1. **The app calls a libc wrapper.** You write `write(fd, buf, count)`, not raw assembly.
2. **libc loads the registers.** It puts the syscall number for `write` (1, on x86-64) into `RAX`, and the arguments into `RDI`, `RSI`, `RDX`.
3. **The `SYSCALL` instruction runs.** This is the actual hardware trap.
4. **The CPU flips privilege levels.** It saves the current instruction pointer, switches from Ring 3 to Ring 0, and loads the kernel's own stack.
5. **The kernel dispatches the call.** It jumps to a fixed entry point (stored in a CPU register called `MSR_LSTAR`), then looks up `RAX` in its syscall table to find the right handler. It also double-checks that the buffer pointer the app passed is actually valid — a process can't be allowed to trick the kernel into reading or writing kernel memory.
6. **The kernel does the real work**, then puts the result back into `RAX`.
7. **`SYSRET` runs**, flipping back to Ring 3 and resuming the app exactly where it left off.

None of this is visible to you as a programmer — it all happens inside that one call to `write()`.

---

### Old way vs. new way: `INT 0x80` vs. `SYSCALL`

Older 32-bit x86 used a software interrupt (`INT 0x80`) to make this jump. It worked, but it was slow — it had to walk a table in RAM and push a bunch of registers. Modern 64-bit CPUs added a dedicated instruction pair, `SYSCALL`/`SYSRET`, built specifically for this job:

| | Legacy (`INT 0x80`) | Modern (`SYSCALL` / `SYSRET`) |
| :--- | :--- | :--- |
| **How it jumps** | Walks the Interrupt Descriptor Table in RAM | Jumps straight to an address cached in a CPU register (`MSR_LSTAR`) |
| **Registers touched** | Pushes `CS`, `SS`, `EFLAGS`, and more | Minimal — built for speed |
| **Cost** | ~100-250 CPU cycles | ~10-20 CPU cycles |

---

### Why bother with libc at all?

You could, in theory, write raw `SYSCALL` assembly yourself. Nobody does, for two reasons:

1. **Buffering.** `printf()` doesn't make a system call per character. It collects output in a user-space buffer and only calls `write()` once it's full (or you flush it) — turning what could be 50 expensive trips into the kernel into one.
2. **Portability.** The actual syscall numbers differ between Linux, macOS, and BSD. libc hides that behind one stable API (`fopen`, `read`, `write`...) so your code doesn't care.

---

### Say this in the interview

*"A system call is the controlled gateway from user mode into kernel mode. The app loads a syscall number and arguments into registers, executes `SYSCALL`, and the CPU traps into the kernel, which validates the request, does the privileged work, and returns via `SYSRET`. Modern 64-bit CPUs replaced the older `INT 0x80` software interrupt with the dedicated `SYSCALL`/`SYSRET` instructions because they skip the interrupt table and jump straight to the kernel's entry point — about 10x faster. Libraries like libc buffer I/O so you're not paying that cost on every single byte."*

---

### Code: the libc wrapper vs. raw assembly, side by side

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
