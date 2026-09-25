---
id: 15-user-mode-vs-kernel-mode
title: "User Mode vs. Kernel Mode: Dual-Mode Operation & Hardware Rings"
description: "Understand dual-mode CPU operation, protection rings, privilege levels, privileged CPU instructions, and mode switch vs context switch."
sidebar_position: 15
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between user mode and kernel mode? Which specific CPU instructions are privileged, and what is the difference between a mode switch and a context switch?"

To ensure stability, security, and hardware isolation, modern computer processors enforce **Dual-Mode Operation**. A physical hardware flag on the CPU (the **mode bit**) dictates whether the processor is executing untrusted application code (**User Mode**) or the trusted operating system core (**Kernel Mode**).

---

### The ELI5 Analogy: The Commercial Airplane

Imagine a passenger aircraft in flight:
- **User Mode (The Passenger Cabin):** Passengers (user applications) can read, eat, sleep, and move around their seats. However, passengers have zero access to aircraft flight controls.
- **Kernel Mode (The Cockpit):** The pilots (the Operating System) have total control: adjusting altitude, lowering landing gear, or cutting engine power.
- If a passenger wants to change cabin temperature, they cannot walk into the cockpit; they must press the flight attendant call button (a **System Call**), asking authorized personnel to perform the action safely.

---

### Hardware Protection Rings

On CPU architectures like x86, hardware enforces four privilege rings (Rings 0 through 3). Modern operating systems (Linux, Windows, macOS) simplify this into two levels:

```
┌──────────────────────────────────────────────┐
│ Ring 3: USER MODE (Applications, Web Browsers)│
│    ┌────────────────────────────────────┐    │
│    │ Ring 0: KERNEL MODE (OS Kernel,    │    │
│    │         Device Drivers, Hardware)  │    │
│    └────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- **Ring 3 (User Mode):** Lowest privilege. Memory access is restricted to the process's own virtual address space; direct access to hardware ports and privileged instructions is physically blocked by CPU gates.
- **Ring 0 (Kernel Mode / Supervisor Mode):** Unrestricted privilege. Can execute any machine instruction, access physical RAM directly, and communicate with hardware peripherals.

---

### The Core Interview Trap: Privileged CPU Instructions

Interviewers will ask: *"What specific CPU instructions are illegal in User Mode, and what happens if a user app attempts them?"*

#### Examples of Privileged Instructions:
1. **`CLI` / `STI` (Clear/Set Interrupt Flag):** Disabling hardware interrupts. If a user app could execute `CLI`, it could disable timer interrupts and seize the CPU forever.
2. **`HLT` (Halt CPU):** Shuts down processor execution until the next external interrupt.
3. **`LIDT` / `LGDT`:** Loading base addresses of the Interrupt Descriptor Table (IDT) or Global Descriptor Table (GDT).
4. **Modifying Control Registers (`CR0`, `CR3`, `CR4`):** Writing to `CR3` reloads the page table base address.
5. **`IN` / `OUT`:** Direct I/O bus port reads and writes to peripherals.

#### The Hardware Trap:
If code in User Mode attempts any privileged instruction, the CPU hardware raises a **General Protection Fault (`#GP`, Exception 13)**. The kernel catches the fault, sends a `SIGSEGV` or `SIGILL` signal to the process, and terminates it instantly.

---

### Mode Switch vs. Context Switch

Candidates frequently confuse these two transitions:

| Dimension | Mode Switch (Privilege Shift) | Context Switch (Process Swap) |
| :--- | :--- | :--- |
| **What Changes?** | CPU privilege level shifts (Ring 3 $\to$ Ring 0 $\to$ Ring 3) within the **same process**. | The CPU stops executing Process A and starts executing Process B. |
| **Trigger** | System call (`syscall`), hardware interrupt, or page fault. | Short-term CPU scheduler decision (time quantum expired or I/O block). |
| **Memory Mapping** | **Virtual address space remains unchanged.** TLB and CPU caches stay valid. | **Page tables swapped (`CR3`).** TLB invalidated and CPU caches thrashed. |
| **Performance Cost** | Nanoseconds ($\approx 10 - 50\text{ ns}$). | Microseconds ($\approx 1 - 5\ \mu\text{s}$, **100× more expensive**). |

---

### Summary
"User Mode and Kernel Mode are hardware-enforced privilege levels. User Mode prevents applications from executing privileged instructions (like disabling interrupts, altering control registers, or direct hardware I/O). A mode switch changes privilege level within the same process via a system call, whereas a context switch replaces the running process and invalidates memory mappings."

---

### Code Demonstration: Attempting a Privileged Instruction in User Space

```c
#include <stdio.h>
#include <signal.h>
#include <stdlib.h>

void signal_handler(int sig) {
    printf("[Caught Signal %d] Hardware General Protection Fault intercepted!\n", sig);
    printf("The CPU blocked the privileged instruction and kernel sent SIGSEGV/SIGILL.\n");
    exit(1);
}

int main() {
    signal(SIGSEGV, signal_handler);
    signal(SIGILL, signal_handler);

    printf("Executing in User Mode (Ring 3)...\n");

    // Attempting a privileged CPU instruction via inline x86 assembly:
    // "cli" (Clear Interrupt Flag) is strictly forbidden in User Mode!
    __asm__ __volatile__("cli");

    // This line will NEVER be reached:
    printf("Successfully disabled interrupts! (Impossible in Ring 3)\n");
    return 0;
}
```