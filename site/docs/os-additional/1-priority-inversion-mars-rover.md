---
id: 1-priority-inversion-mars-rover
title: "Priority Inversion & Priority Inheritance: The Mars Pathfinder Bug"
description: "How a low-priority thread holding a lock can block a high-priority thread, why it rebooted the Mars Pathfinder, and how priority inheritance fixes it."
sidebar_position: 1
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is Priority Inversion? What causes it, why did it repeatedly reboot the Mars Pathfinder in 1997, and how does Priority Inheritance fix it?"

Priority inversion is what happens when a high-priority task ends up waiting on a low-priority one — and a medium-priority task that has nothing to do with either of them is the real reason it's stuck.

---

### The analogy: the office projector

Three people, one projector:
- **The CEO** — highest priority.
- **The Manager** — medium priority.
- **The Intern** — lowest priority.

1. The Intern checks out the projector to rehearse a presentation.
2. The CEO shows up needing it for an emergency pitch. The Intern has it, so the CEO waits.
3. Right then, the Manager walks in and tells the Intern to drop everything and update some spreadsheets. The Manager doesn't need the projector at all — but outranks the Intern, so the Intern has to stop and comply.
4. Now the CEO is waiting on the Intern, and the Intern is stuck doing the Manager's spreadsheets. The CEO — the highest-priority person in the building — is effectively waiting on the Manager, who never even asked for the projector.

That's the inversion: the schedule is supposed to run high priority before medium before low, but a medium-priority task ends up delaying a high-priority one indirectly, through a lock.

---

### What's actually happening

<Diagram>
<Row>
<Box title="Low-priority task" accent="#34d399">
<Field icon="🔒" code="holds the lock" hint="in its critical section" variant="neutral" />
</Box>
<Arrow label="blocks" />
<Box title="High-priority task" accent="#fb7185">
<Field icon="⏳" code="needs that lock" hint="stuck waiting" variant="neutral" />
</Box>
</Row>
<Row>
<Box title="Medium-priority task" accent="#f59e0b">
<Field icon="⚡" code="doesn't need the lock" hint="keeps preempting Low anyway" variant="neutral" />
</Box>
</Row>
</Diagram>

Step by step:

1. **Low** grabs a shared lock (`Mutex_X`) and enters its critical section.
2. **High** wakes up and, being highest priority, preempts Low — but then asks for `Mutex_X` and finds Low already holds it. High has to go to sleep and wait.
3. The scheduler hands the CPU back to Low so it can finish and release the lock.
4. Before that happens, **Medium** wakes up. Medium outranks Low, so it preempts Low again — even though Medium never touches the lock.
5. Medium runs for as long as it wants. Low never gets the CPU back, never releases the lock, and High never gets unblocked. A task that should never have been able to delay High just did, indirectly.

---

### The real incident: Mars Pathfinder (1997)

On July 4, 1997, NASA's Pathfinder landed on Mars. A few days in, it started randomly rebooting and losing data.

The spacecraft ran three relevant tasks:
- **`bc_dist`** (high priority) — managed the information bus.
- **comm/radio tasks** (medium priority) — long-running communication jobs.
- **`asi_publish`** (low priority) — read weather sensors.

What happened:

1. `asi_publish` grabbed a mutex protecting the bus memory table.
2. `bc_dist` woke up on an interrupt, tried to grab the same mutex, and blocked.
3. The medium-priority comm tasks woke up and, outranking `asi_publish`, kept preempting it — for longer than expected.
4. Pathfinder had a hardware watchdog timer. If `bc_dist` didn't run within its expected window, the watchdog assumed the whole system had locked up and triggered a full reboot.
5. Engineers back on Earth reproduced the bug on a lab copy of the rover, and uploaded a patch that turned on **priority inheritance** for that mutex (`semMCreate(..., SEM_INVERSION_SAFE)` in VxWorks) — without ever touching the hardware.

---

### The fix: priority inheritance vs. priority ceiling

**Priority Inheritance Protocol (PIP).** When a high-priority task blocks on a lock held by a low-priority one, the OS temporarily *lends* the high task's priority to the low task for as long as it holds the lock. Medium-priority tasks can no longer cut in front of it. Low finishes fast, releases the lock, drops back to its normal priority, and High runs immediately.
- Downside: inheritance can chain through several locks (High → Medium → Low), and it doesn't by itself prevent deadlocks if locks are grabbed in different orders.

**Priority Ceiling Protocol (PCP).** Every lock is given a fixed "ceiling" priority upfront — the highest priority of any task that could ever take it. The moment a task grabs the lock, its priority jumps to that ceiling.
- Advantage: a high-priority task can be blocked at most once, and deadlocks are mathematically impossible. The cost is more bookkeeping ahead of time.

---

### Comparison

| | Plain mutex | Priority Inheritance | Priority Ceiling |
| :--- | :--- | :--- | :--- |
| **How bad can the delay get** | Unbounded — could starve forever | Bounded to one critical section | Bounded to one blocking event, period |
| **Deadlock risk** | Not addressed | Still possible | Impossible by construction |
| **Overhead** | Minimal | Some — priorities change dynamically | More — ceilings computed ahead of time |
| **Used in** | General OSes (Linux, Windows) | Real-time kernels (VxWorks, FreeRTOS) | Safety-critical RTOS (avionics, automotive) |

---

### Say this in the interview

*"Priority inversion happens when a low-priority thread holding a lock gets preempted by medium-priority threads that don't even want the lock, which indirectly starves a high-priority thread waiting on it. The fix is priority inheritance: temporarily boost the lock-holder's priority to match the highest thread waiting on it, so nothing in between can cut in line."*

---

### Python: simulating the bug and the fix

The script below runs a tiny priority scheduler twice — once with a plain mutex (where the high-priority task gets starved by an unrelated medium-priority task), and once with priority inheritance turned on (where it doesn't):

```python
"""
Priority Inversion & Priority Inheritance Simulator
Demonstrates:
  1. Unbounded priority inversion under standard mutexes
  2. Bounded execution when priority inheritance is applied
"""

from typing import Optional, List

class Task:
    def __init__(self, name: str, base_priority: int, work_units: int, needs_lock: bool = False):
        self.name = name
        self.base_priority = base_priority
        self.effective_priority = base_priority
        self.work_remaining = work_units
        self.needs_lock = needs_lock
        self.holds_lock = False
        self.blocked = False

    def __repr__(self):
        return f"{self.name}(prio={self.effective_priority}, rem={self.work_remaining})"


class Mutex:
    def __init__(self, enable_priority_inheritance: bool = False):
        self.owner: Optional[Task] = None
        self.waiters: List[Task] = []
        self.enable_pi = enable_priority_inheritance

    def acquire(self, task: Task) -> bool:
        if self.owner is None:
            self.owner = task
            task.holds_lock = True
            return True
        else:
            task.blocked = True
            self.waiters.append(task)
            # Priority Inheritance: Boost owner's priority to match highest waiter
            if self.enable_pi and self.owner.effective_priority < task.effective_priority:
                self.owner.effective_priority = task.effective_priority
            return False

    def release(self, task: Task) -> Optional[Task]:
        assert self.owner == task, "Only owner can release mutex"
        task.holds_lock = False
        self.owner = None
        # Restore owner's base priority
        if self.enable_pi:
            task.effective_priority = task.base_priority

        if self.waiters:
            # Wake up highest priority waiter
            self.waiters.sort(key=lambda t: t.effective_priority, reverse=True)
            next_task = self.waiters.pop(0)
            next_task.blocked = False
            self.owner = next_task
            next_task.holds_lock = True
            return next_task
        return None


def run_simulation(enable_pi: bool):
    mode = "WITH Priority Inheritance" if enable_pi else "WITHOUT Priority Inheritance (VULNERABLE)"
    print(f"\n================ Running {mode} ================")

    mutex = Mutex(enable_priority_inheritance=enable_pi)
    low = Task("Task_L (Low)", base_priority=1, work_units=3, needs_lock=True)
    med = Task("Task_M (Med)", base_priority=5, work_units=4, needs_lock=False)
    high = Task("Task_H (High)", base_priority=10, work_units=2, needs_lock=True)

    tasks = [low, med, high]
    execution_timeline = []

    # Step 0: Low task starts and acquires the mutex
    mutex.acquire(low)
    print(f"Step 0: {low.name} acquired Mutex.")

    for tick in range(1, 12):
        # Determine all non-blocked, unfinished tasks
        runnable = [t for t in tasks if not t.blocked and t.work_remaining > 0]
        if not runnable:
            break

        # Pick task with highest effective priority
        runnable.sort(key=lambda t: t.effective_priority, reverse=True)
        active_task = runnable[0]

        # Simulate High task waking up at tick 1 and requesting the mutex
        if tick == 1 and not high.holds_lock and not high.blocked:
            print(f"Tick {tick}: {high.name} wakes up and requests Mutex...")
            acquired = mutex.acquire(high)
            if not acquired:
                print(f"       -> Mutex locked by {mutex.owner.name}! {high.name} BLOCKED.")
                if enable_pi:
                    print(f"       -> [PI ACTIVE] {low.name} boosted to priority {low.effective_priority}!")
            # Re-evaluate active task
            runnable = [t for t in tasks if not t.blocked and t.work_remaining > 0]
            runnable.sort(key=lambda t: t.effective_priority, reverse=True)
            active_task = runnable[0]

        # Execute 1 unit of work
        active_task.work_remaining -= 1
        execution_timeline.append(active_task.name.split()[0])
        print(f"Tick {tick:02d}: Running {active_task.name} (Effective Prio: {active_task.effective_priority})")

        # If Low finishes its work, it releases the mutex
        if active_task == low and active_task.work_remaining == 0 and active_task.holds_lock:
            print(f"       -> {low.name} finished critical section and released Mutex!")
            woken = mutex.release(low)
            if woken:
                print(f"       -> {woken.name} unblocked and granted Mutex!")

    print(f"\nExecution Timeline: {' -> '.join(execution_timeline)}")


if __name__ == "__main__":
    # Case 1: Priority Inversion without fix
    run_simulation(enable_pi=False)
    # Case 2: Priority Inversion resolved via Priority Inheritance
    run_simulation(enable_pi=True)
```
