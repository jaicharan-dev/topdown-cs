---
id: 14-interrupt-vs-trap-vs-exception
title: "Interrupt vs. Trap vs. Exception"
description: "Asynchronous hardware interrupts, deliberate software traps, and accidental processor exceptions — and how each resumes execution differently."
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between an interrupt, a trap, and an exception? In x86 architecture, how does the saved instruction pointer (`RIP`) behave differently across faults, traps, and aborts?"

Whenever the kernel takes control of the CPU away from a running program, it's for one of three reasons: something external just happened, the program asked for help on purpose, or the program hit an error it couldn't handle itself. Those are interrupts, traps, and exceptions.

---

### The analogy: a student in an exam hall

- **Interrupt — the fire alarm.** It has nothing to do with the calculus problem the student is solving. It comes from outside, and it forces a pause regardless of what they were doing.
- **Exception — dividing by zero.** The student hits an error mid-step and can't continue that line of work. They raise their hand because something inside their own work went wrong.
- **Trap — asking to use the restroom.** The student finishes a section and deliberately, voluntarily asks the proctor for permission to step out. It's planned, not accidental.

<Diagram>
<Row>
<Box title="Interrupt" accent="#60a5fa"><Field icon="🔔" code="external hardware" hint="unrelated to current instruction, async" variant="neutral" /></Box>
<Box title="Trap" accent="#34d399"><Field icon="🙋" code="deliberate syscall" hint="program asks for it on purpose" variant="neutral" /></Box>
<Box title="Exception" accent="#fb7185"><Field icon="⚠️" code="accidental error" hint="CPU detects a problem mid-instruction" variant="neutral" /></Box>
</Row>
</Diagram>

The two properties that actually separate them: **when** they happen relative to the running instruction (sync vs. async), and **why** they happen (deliberate vs. accidental).

---

### Interrupts: asynchronous, from outside

An interrupt is an electrical signal from external hardware — it has nothing to do with whatever instruction the CPU happens to be running.

- **Maskable** (`INTR` pin): keystrokes, network packets, disk completions. The kernel can temporarily turn these off during critical code with the `CLI` instruction.
- **Non-maskable** (`NMI` pin): serious hardware events — ECC memory errors, bus faults — that can't be ignored even if the kernel wants to.
- **Resume point:** execution picks back up at the **next instruction** after the one that was running when the interrupt hit.

---

### Exceptions: synchronous, and split into three kinds

Exceptions come from the CPU itself noticing something during an instruction. Run the same instruction with the same inputs twice, and you get the same exception both times — that's what makes them synchronous. Intel/AMD split these into three types:

**A. Faults — recoverable.** Something went wrong, but the OS can likely fix it and continue. The CPU saves the address of the **faulting instruction itself** so it can be retried. The page fault is the textbook case: a thread touches memory that isn't loaded yet, the CPU traps into the OS, the OS loads the page from disk, and then re-runs the *exact same instruction* — this time it succeeds.

**B. Traps — deliberate.** The program itself asked for this, on purpose, via an instruction like `syscall` or `int 3`. The CPU saves the address of the **next instruction**, since there's nothing to retry — the request already succeeded.
- System calls (`read()`, `write()`) go through here.
- Debugger breakpoints (`INT 3`, the single byte `0xCC`) work the same way.

**C. Aborts — unrecoverable.** Something has gone seriously wrong (a double fault, a machine-check exception). There's no instruction to resume — the process or the whole system crashes.

---

### The Interrupt Descriptor Table

x86 routes every interrupt and exception through a 256-entry table (the IDT), loaded via `LIDT`. Vectors 0-31 are reserved for CPU-defined exceptions (0 = divide-by-zero, 3 = breakpoint, 8 = double fault, 13 = general protection fault, 14 = page fault). Vectors 32-255 are for hardware interrupts and syscalls (32 = timer, 33 = keyboard, 0x80 = legacy 32-bit Linux syscall).

---

### Comparison

| | Interrupt | Trap | Exception (fault) |
| :--- | :--- | :--- | :--- |
| **Where it comes from** | External hardware (timer, NIC, disk) | The program, on purpose (`syscall`, `INT 3`) | CPU detecting an error mid-instruction |
| **Timing** | Async — unrelated to current instruction | Sync — deterministic | Sync — deterministic |
| **Intent** | Just a notification | Deliberate | Accidental |
| **Saved RIP** | Next instruction | Next instruction | The faulting instruction itself (so it can retry) |
| **Can it be masked?** | Yes, for maskable lines | No | No |

---

### Say this in the interview

*"An interrupt is an asynchronous signal from external hardware and resumes at the next instruction. A trap is a deliberate, synchronous request from the program — a syscall or breakpoint — and also resumes at the next instruction, since the request already succeeded. An exception is an accidental synchronous error; a fault saves the address of the instruction that failed so it can be retried after the kernel fixes things (like a page fault), while an abort means the system can't recover at all."*

---

### Python verification: interrupt, trap, and exception dispatch

```python
"""
CPU Interrupt, Trap, and Exception Dispatcher Simulator
Demonstrates:
  1. Synchronous Fault recovery with instruction re-execution (Page Fault)
  2. Intentional Software Trap dispatch (Syscall)
  3. Asynchronous Hardware Interrupt handling
"""

from typing import List, Dict, Any

class Instruction:
    def __init__(self, op: str, arg: Any = None):
        self.op = op
        self.arg = arg

    def __repr__(self):
        return f"{self.op}({self.arg})" if self.arg is not None else self.op


class CPUExecutionPipeline:
    def __init__(self, code: List[Instruction]):
        self.code = code
        self.rip = 0  # Instruction Pointer
        self.page_table: Dict[int, str] = {}  # Virtual Page -> Physical Frame
        self.interrupt_pending = False
        self.execution_log = []

    def trigger_hardware_interrupt(self):
        self.interrupt_pending = True

    def run(self):
        while self.rip < len(self.code):
            # Check for Asynchronous Hardware Interrupts BEFORE fetching instruction
            if self.interrupt_pending:
                self.execution_log.append(f"[ASYNCHRONOUS INTERRUPT] Timer IRQ caught! Saved RIP = {self.rip}")
                self.interrupt_pending = False
                # Interrupt resumes at the exact same RIP after ISR

            instr = self.code[self.rip]
            self.execution_log.append(f"Executing [RIP={self.rip}]: {instr}")

            # 1. Intentional Software Trap (System Call)
            if instr.op == "SYSCALL":
                self.execution_log.append(f"  -> [SOFTWARE TRAP] Entering Ring 0 for {instr.arg}. Next RIP = {self.rip + 1}")
                self.rip += 1  # Traps resume at NEXT instruction

            # 2. Synchronous Fault (Page Fault)
            elif instr.op == "ACCESS_MEM":
                page = instr.arg
                if page not in self.page_table:
                    self.execution_log.append(f"  -> [SYNCHRONOUS FAULT] Page Fault on page {page}! Saved RIP = {self.rip}")
                    # OS Page Fault Handler allocates frame
                    self.page_table[page] = f"Frame_0x{page:04X}"
                    self.execution_log.append(f"  -> OS loaded {page} into {self.page_table[page]}. Re-executing instruction at RIP={self.rip}!")
                    # DO NOT increment RIP! Re-execute the exact same instruction!
                else:
                    self.execution_log.append(f"  -> Resolved memory address in {self.page_table[page]}.")
                    self.rip += 1

            else:
                self.rip += 1


def main():
    print("=== CPU Interrupt, Trap & Exception Dispatch Simulation ===\n")

    program = [
        Instruction("LOAD_REG", "RAX"),
        Instruction("ACCESS_MEM", 42),       # Triggers Page Fault first time, re-executed
        Instruction("SYSCALL", "sys_write"), # Software Trap
        Instruction("ADD", 5),
    ]

    cpu = CPUExecutionPipeline(program)
    # Simulate an external hardware timer firing mid-execution
    cpu.trigger_hardware_interrupt()
    cpu.run()

    for entry in cpu.execution_log:
        print(entry)

    print("\nVerification: Page Fault re-executed RIP=1; Syscall advanced to RIP=3; Timer paused pipeline.")

if __name__ == "__main__":
    main()
```
