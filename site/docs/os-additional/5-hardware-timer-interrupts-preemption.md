---
id: 5-hardware-timer-interrupts-preemption
title: "Hardware Timer Interrupts: Regaining CPU Control & Enforcing Time Slices"
description: "How a physical hardware timer lets the OS forcibly interrupt a running program — even one stuck in an infinite loop — to enforce time slices."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a Hardware Timer Interrupt? How does the operating system regain control of the CPU from a running user application or an infinite loop without hardware assistance?"

Here's the problem a hardware timer solves: once the OS hands the CPU to a user program, the OS itself isn't running anymore on that core. If that program hits `while(true);`, there's no OS code left running anywhere to stop it — software alone is powerless. Something outside the CPU's normal instruction stream has to physically interrupt it.

---

### The analogy: the chess clock

A tournament chess match:
- **The player** is thinking about their move.
- **The arbiter** (the OS) can't read the player's mind or push their hands — if the player just sits there forever, the game freezes.
- **The chess clock** is set for a fixed amount of time before the turn starts.
- When the clock hits zero, a buzzer goes off. The player is forced to stop immediately, and the arbiter steps in and passes the board to the next player.

The buzzer is the hardware interrupt. It's the one thing that can force a stop regardless of what the player (or the program) wants to do.

---

### Why software by itself can't do this

1. The CPU just runs instructions one after another, following its instruction pointer.
2. When the kernel hands off to a user thread, the CPU drops to user mode (Ring 3) and jumps into user code.
3. From that point, the OS has no thread, no loop, nothing actively running on that core.
4. If the user program never yields — stuck in a loop, frozen, whatever — there's no OS code around to intervene.
5. Only an external electrical signal, arriving from outside the normal fetch-decode-execute cycle, can interrupt it.

---

### What generates that signal

Old PCs used a chip called the PIT (Programmable Interval Timer). Modern multi-core CPUs instead have a **Local APIC** built into every core, and the OS programs it directly:

<Diagram>
<Row>
<Box title="CPU Core (User Mode)" accent="#60a5fa">
<Field icon="🧑" code="runs user code" hint="OS isn't running here" variant="neutral" />
</Box>
<Arrow label="timer fires" />
<Box title="Local APIC" accent="#f59e0b">
<Field icon="⏰" code="countdown hits 0" hint="sends interrupt signal" variant="neutral" />
</Box>
<Arrow label="traps into kernel" />
<Box title="Scheduler" accent="#34d399">
<Field icon="🔁" code="picks next task" hint="context switch" variant="neutral" />
</Box>
</Row>
</Diagram>

Step by step:

1. **Arm the timer.** Before handing the CPU to a thread, the OS programs the core's Local APIC with that thread's time slice (say, 4ms).
2. **Drop to user mode.** The kernel executes `sysret`/`iret`, switching from Ring 0 to Ring 3.
3. **Independent countdown.** The user program runs. Meanwhile the APIC counts down on its own, completely separate from whatever instructions the CPU is executing.
4. **The pulse.** When the countdown hits zero, the APIC fires an interrupt signal straight onto the core's interrupt pin.
5. **Hardware takes over.** The CPU's own microcode suspends the current instruction, pushes the execution state (`SS`, `RSP`, `RFLAGS`, `CS`, `RIP`) onto the kernel stack, and flips back to Ring 0 — all before any OS code runs.
6. **Jump to the kernel's handler.** The CPU looks up the timer's entry in the Interrupt Descriptor Table and jumps to the kernel's interrupt handler (`timer_interrupt()` on Linux).
7. **Accounting.** The handler updates runtime stats, and if the thread used up its quantum, flags it as needing to be rescheduled (`TIF_NEED_RESCHED`).
8. **Switch.** On the way back out of the interrupt, the kernel checks that flag — if set, it calls `schedule()` and performs the actual context switch to the next thread.

None of this needed the user program's cooperation at any point.

---

### Cooperative vs. preemptive multitasking

| | Cooperative (legacy) | Preemptive (modern) |
| :--- | :--- | :--- |
| **Examples** | Windows 3.1, classic Mac OS | Linux, Windows NT+, macOS, RTOSes |
| **How control returns to the OS** | The program has to voluntarily call `Yield()` or sleep | Hardware timer forces it, no cooperation needed |
| **An infinite loop does what** | Freezes the whole system — needs a hard reboot | Nothing — the OS preempts it smoothly at the next tick |
| **What triggers a switch** | Application code | Hardware interrupt |
| **Timing guarantees** | None — totally dependent on good citizenship | Predictable, bounded latency |

---

### The tickless kernel

Traditionally the timer fired at a fixed rate (say, 1000Hz — every 1ms), whether or not anything needed it. That's wasteful: it wakes idle CPU cores up a thousand times a second, draining battery, and it adds jitter for latency-sensitive workloads like real-time audio or trading systems.

Linux's **tickless kernel** (`NO_HZ`) fixes this: when a core is idle or running just one task, the kernel turns off the periodic tick and reprograms the timer in one-shot mode — it fires only when something actually needs to happen, letting idle cores sleep for seconds at a stretch.

---

### Say this in the interview

*"A hardware timer interrupt is an electrical signal from a hardware clock — the Local APIC on modern CPUs — that fires when its countdown hits zero. It exists because the OS isn't running at all while user code executes, so only hardware can forcibly reclaim the CPU: it suspends the instruction stream, switches to kernel mode, and jumps into the kernel's interrupt handler so the scheduler can preempt even an infinite loop."*

---

### Python: cooperative starvation vs. preemptive fairness

```python
"""
Preemption vs Cooperative Multitasking Simulator
Demonstrates:
  1. Cooperative multitasking starvation caused by an infinite loop
  2. Preemptive multitasking driven by hardware timer interrupts
"""

from typing import List

class SimulatedProcess:
    def __init__(self, name: str, instructions: int, is_rogue_loop: bool = False):
        self.name = name
        self.instructions_remaining = instructions
        self.is_rogue_loop = is_rogue_loop
        self.instructions_executed = 0

    def run_cooperative_step(self) -> bool:
        """Runs until process voluntarily yields or finishes."""
        if self.is_rogue_loop:
            # Simulates while(true) loop that never yields
            self.instructions_executed += 5
            return False  # Never yields!
        else:
            executed = min(self.instructions_remaining, 5)
            self.instructions_remaining -= executed
            self.instructions_executed += executed
            return self.instructions_remaining == 0


def run_cooperative_simulation():
    print("--- 1. Cooperative Multitasking (No Hardware Timer) ---")
    p1 = SimulatedProcess("Proc_1 (Normal)", instructions=10)
    p2 = SimulatedProcess("Proc_2 (Infinite while(1) Loop)", instructions=100, is_rogue_loop=True)
    p3 = SimulatedProcess("Proc_3 (Normal)", instructions=10)

    queue = [p1, p2, p3]
    timeline = []

    # Process 1 runs and yields
    p1.run_cooperative_step()
    p1.run_cooperative_step()
    timeline.append(f"{p1.name} (Finished)")

    # Process 2 runs... and never yields!
    for step in range(3):
        p2.run_cooperative_step()
        timeline.append(f"{p2.name} (Hogging CPU step {step+1})")

    print(f"System State: SYSTEM FROZEN! {p3.name} never gets CPU time.")
    print("Timeline: " + " -> ".join(timeline[:4]) + " -> ... [Starvation]")


def run_preemptive_simulation():
    print("\n--- 2. Preemptive Multitasking (Hardware Timer Quantum = 3 cycles) ---")
    p1 = SimulatedProcess("Proc_1 (Normal)", instructions=6)
    p2 = SimulatedProcess("Proc_2 (Infinite while(1) Loop)", instructions=100, is_rogue_loop=True)
    p3 = SimulatedProcess("Proc_3 (Normal)", instructions=6)

    queue = [p1, p2, p3]
    QUANTUM = 3  # Hardware timer fires every 3 cycles
    total_ticks = 0
    timeline = []

    for timer_interrupt in range(1, 9):
        if not queue:
            break
        current = queue.pop(0)

        # Process executes up to quantum limit
        if current.is_rogue_loop:
            current.instructions_executed += QUANTUM
            status = "Preempted by Timer Interrupt"
            queue.append(current)  # Moved to back of ready queue
        else:
            executed = min(current.instructions_remaining, QUANTUM)
            current.instructions_remaining -= executed
            current.instructions_executed += executed
            if current.instructions_remaining > 0:
                status = "Quantum Expired (Preempted)"
                queue.append(current)
            else:
                status = "Completed"

        timeline.append(f"Tick {timer_interrupt} [{current.name.split()[0]}]: {status}")

    for entry in timeline:
        print(f"  {entry}")

    print("\nResult: Despite Proc_2 running an infinite loop, Hardware Timer Interrupts")
    print("guaranteed that Proc_1 and Proc_3 completed their workloads without starvation!")


if __name__ == "__main__":
    run_cooperative_simulation()
    run_preemptive_simulation()
```
