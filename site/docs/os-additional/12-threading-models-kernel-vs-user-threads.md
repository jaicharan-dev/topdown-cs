---
id: 12-threading-models-kernel-vs-user-threads
title: "Threading Models: User-Level vs. Kernel-Level Threads"
description: "Compare Many-to-One, One-to-One, and Many-to-Many threading models, and how each maps user threads onto real OS threads."
sidebar_position: 12
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What are the three main threading models (Many-to-One, One-to-One, Many-to-Many), what is the fundamental tradeoff between User-Level Threads (ULTs) and Kernel-Level Threads (KLTs), and how does Go's M:N scheduler resolve historical limitations?"

A program's threads (the ones your code creates) have to run on real OS threads somehow. How that mapping works is the whole story here, and it comes down to a tradeoff: cheap-but-limited vs. expensive-but-truly-parallel.

---

### The analogy: a restaurant kitchen

- **User-level threads** are the recipes the chefs want to cook — chop onions, boil pasta, sear salmon.
- **Kernel-level threads** are the actual gas burners the building provides.

- **Many-to-one:** 10 recipes, 1 burner. The chef shuffles pans on and off that single flame. If one recipe needs someone to just stand and watch a pot boil (a blocking call), the whole kitchen freezes — nothing else can use that burner either.
- **One-to-one:** every recipe gets its own dedicated burner. 10 recipes, 10 burners, so if one is boiling, the other 9 still cook in parallel. But burners aren't free — 10,000 of them would blow the budget (memory).
- **Many-to-many:** the hybrid. Install 4 heavy-duty burners (one per CPU core) and let the chefs dynamically share 100 recipes across them as burners free up.

<Diagram>
<Row>
<Box title="Many-to-One" accent="#fb7185"><Field icon="🔥" code="N threads → 1 kernel thread" hint="one blocking call freezes everything" variant="neutral" /></Box>
<Box title="One-to-One" accent="#60a5fa"><Field icon="🔥🔥" code="1 thread → 1 kernel thread" hint="true parallelism, heavy per-thread cost" variant="neutral" /></Box>
<Box title="Many-to-Many" accent="#34d399"><Field icon="🔥🔥" code="M threads → N kernel threads" hint="shared pool, e.g. Go goroutines" variant="neutral" /></Box>
</Row>
</Diagram>

---

### User-level threads (ULTs) vs. kernel-level threads (KLTs)

| | User-Level Threads | Kernel-Level Threads |
| :--- | :--- | :--- |
| **Who manages it** | A user-space library/runtime (e.g. goroutines, green threads) | The OS kernel itself |
| **Does the kernel know it exists?** | No — the kernel sees one single-threaded process | Yes — each one is a real scheduled entity |
| **Create / switch cost** | Nanoseconds, no syscall | Microseconds, needs a kernel-mode trap |
| **Stack size** | Small and growable (Go starts at 2 KB) | Fixed, usually 2-8 MB |
| **If one blocks on I/O** | The whole process blocks — lethal | Only that one thread blocks, others keep going |
| **Multi-core parallelism** | None — they all run on whichever core the process gets | True parallelism across cores |

---

### The three classic models

**1. Many-to-One.** Many user threads share one kernel thread. Switching is extremely fast and you can create huge numbers of threads, but you can't use more than one core, and one blocking call halts everything. Used by old green-thread runtimes (GNU Pth, pre-1.9 Ruby).

**2. One-to-one (today's standard).** Every thread you create gets a real kernel thread. You get true parallel execution and non-blocking I/O for free. The cost is memory — each thread needs a multi-megabyte kernel stack, so you can't spawn 500,000 of them. This is what Linux (NPTL), Windows, macOS, and Java's `Thread` (pre-Project Loom) do. On Linux, this goes through `clone()`:

```c
clone(child_func, stack, CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD, arg);
```

**3. Many-to-many.** A pool of M user threads shares N kernel threads (N is usually the core count). This is the hybrid that gives you cheap, plentiful user threads *and* real parallelism — if it's built well.

---

### Why many-to-many used to fail, and how Go fixed it

Older M:N runtimes struggled with "scheduler activation": when a user thread blocked in the kernel on I/O, the kernel had no clean way to tell user-space "swap in another task, this one's stuck."

Go's runtime solves this with three pieces, often called **G:M:P**:
- **G (goroutine):** a lightweight user thread, starting at just 2 KB of stack.
- **M (machine):** a real OS thread.
- **P (processor):** a logical "slot" to run on, one per `GOMAXPROCS` (usually = core count).

```
[ P0 queue: G1, G2, G3 ] ──> [ M0 (OS thread) ] ──> Core 0
[ P1 queue: G4, G5, G6 ] ──> [ M1 (OS thread) ] ──> Core 1
```

Three things make this work where older attempts didn't:
1. **Work stealing** — if P0 runs out of goroutines, it steals half of P1's queue, keeping all cores busy.
2. **Non-blocking network I/O** — sockets go through `epoll`/`kqueue` instead of a blocking `read()`. A goroutine waiting on a socket doesn't block the OS thread underneath it at all.
3. **Syscall handoff** — if a goroutine does make an unavoidable blocking syscall, its M blocks, but its P immediately detaches and pairs with a fresh or idle M, so other goroutines keep running.

---

### Say this in the interview

*"Many-to-one gives fast switching but no multicore parallelism and one blocking call freezes everything. One-to-one, what Linux and Windows use today, gives true parallelism at the cost of a heavy per-thread memory footprint. Many-to-many, like Go's scheduler, tries to get both — lightweight user threads multiplexed over a small pool of OS threads — using work-stealing and non-blocking I/O to avoid the problems that sank earlier M:N attempts."*

---

### Python verification: user-space cooperative scheduler

```python
"""
User-Level Thread (Green Thread / Coroutine) Scheduler Simulation
Demonstrates:
  1. Nanosecond user-space cooperative context switching
  2. Multiplexing multiple user tasks over a single thread of execution
  3. Workload completion without kernel-mode transitions
"""

import time
from typing import List, Generator

class GreenThreadScheduler:
    def __init__(self):
        self.runqueue: List[Generator] = []
        self.switches = 0

    def spawn(self, coroutine: Generator):
        """Adds a user-level thread to the scheduler queue."""
        self.runqueue.append(coroutine)

    def run(self):
        """Executes the cooperative user-space event loop."""
        start = time.perf_counter()
        while self.runqueue:
            # Pop task from front of user queue
            task = self.runqueue.pop(0)
            try:
                # Execute user task until its next voluntary yield
                self.switches += 1
                next(task)
                # Re-queue task if it has more work
                self.runqueue.append(task)
            except StopIteration:
                # Task completed
                pass

        total_time = time.perf_counter() - start
        return total_time, self.switches


def task_worker(task_id: str, steps: int):
    for step in range(1, steps + 1):
        # Perform tiny compute, then cooperatively yield CPU
        yield
    print(f"  [ULT Finished] {task_id} completed all {steps} steps.")


def main():
    print("=== User-Level Thread (ULT) Cooperative Scheduler ===\n")
    sched = GreenThreadScheduler()

    NUM_THREADS = 10_000
    STEPS_PER_THREAD = 3

    print(f"Spawning {NUM_THREADS:,} User-Level Threads (Green Threads)...")
    for i in range(NUM_THREADS):
        sched.spawn(task_worker(f"Thread_{i}", STEPS_PER_THREAD))

    print("Running user-space scheduler loop (Zero Kernel Syscalls)...")
    total_time, switches = sched.run()

    per_switch_ns = (total_time / switches) * 1_000_000_000
    print(f"\nExecution Summary:")
    print(f"  Total User Context Switches: {switches:,}")
    print(f"  Total Runtime:               {total_time:.4f} seconds")
    print(f"  Average Switch Latency:      {per_switch_ns:5.1f} nanoseconds per switch")
    print("Result: Spawning 10,000 OS Kernel Threads would consume gigabytes of RAM;")
    print("        ULTs executed 30,000 context switches in milliseconds in user space!")

if __name__ == "__main__":
    main()
```
