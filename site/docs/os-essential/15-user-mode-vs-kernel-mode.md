---
id: 15-user-mode-vs-kernel-mode
title: "User Mode vs. Kernel Mode"
description: "Understand dual-mode CPU operation, protection rings, privileged instructions, and the difference between a mode switch and a context switch."
sidebar_position: 15
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between user mode and kernel mode? Which specific CPU instructions are privileged, and what is the difference between a mode switch and a context switch?"

Think of an airplane. Passengers sit in the cabin — they can read, eat, move around, but they can't touch the flight controls. The pilots sit in the cockpit — they can do anything: change altitude, lower the landing gear, cut engine power.

That's the whole idea behind **user mode** and **kernel mode**. Your app runs in the cabin (user mode). The OS runs in the cockpit (kernel mode). If a passenger wants the cabin temperature changed, they don't walk into the cockpit — they press the call button and ask a flight attendant to do it for them. That button press is a **system call**.

Under the hood, this isn't a software convention — it's enforced by the CPU itself. A hardware flag (the **mode bit**) tells the processor whether it's currently running untrusted application code or trusted OS code.

---

### Hardware protection rings

x86 CPUs actually support four privilege rings (0 through 3), but modern OSs (Linux, Windows, macOS) only use two of them:

<Diagram>
<Row>
<Box label="Ring 3" sub="User Mode — apps" />
<Arrow label="syscall / trap" />
<Box label="Ring 0" sub="Kernel Mode — OS" />
</Row>
</Diagram>

- **Ring 3 (user mode):** lowest privilege. A process can only touch its own virtual memory. Hardware ports and privileged instructions are physically blocked.
- **Ring 0 (kernel mode):** full privilege. Can run any instruction, touch physical RAM directly, talk to hardware.

---

### What instructions are actually off-limits in user mode?

This is the classic follow-up question. A few examples of **privileged instructions** — ones only kernel mode can run:

1. **`CLI` / `STI`** — disable/enable hardware interrupts. If user code could run this, it could disable the timer interrupt and hog the CPU forever.
2. **`HLT`** — halt the CPU entirely.
3. **`LIDT` / `LGDT`** — load the interrupt/descriptor tables.
4. **Writing control registers (`CR0`, `CR3`, `CR4`)** — `CR3` holds the page table address; writing it would let a process remap anyone's memory.
5. **`IN` / `OUT`** — raw reads/writes to hardware I/O ports.

If user-mode code tries any of these, the CPU itself raises a **General Protection Fault** (`#GP`). The kernel catches it, sends the process a `SIGSEGV`/`SIGILL`, and kills it on the spot. There's no graceful failure here — the hardware simply refuses to execute the instruction.

---

### Mode switch vs. context switch — don't mix these up

These sound similar but are completely different things:

| | Mode Switch | Context Switch |
| :--- | :--- | :--- |
| **What changes** | Privilege level flips (Ring 3 → Ring 0 → Ring 3), same process the whole time | The CPU stops running Process A and starts running Process B |
| **Triggered by** | A system call, interrupt, or page fault | The scheduler deciding it's someone else's turn |
| **Memory mapping** | Unchanged — TLB and caches stay warm | Page tables swap out — TLB gets flushed, caches go cold |
| **Cost** | Cheap: ~10-50 nanoseconds | Expensive: ~1-5 microseconds, roughly 100x more |

A mode switch is just "same program, temporarily borrow kernel privileges, come back." A context switch is "stop this program entirely, run a different one." That's why the second one is so much more expensive — it has to reload the whole memory map.

---

### Say this in the interview

*"User mode and kernel mode are hardware-enforced privilege levels. User mode blocks apps from running privileged instructions like disabling interrupts or touching control registers. A mode switch changes privilege within the same process via a system call — cheap, memory mapping untouched. A context switch replaces the running process entirely — expensive, because it flushes the TLB and invalidates caches."*

---

### Code: tripping the hardware fault on purpose

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
