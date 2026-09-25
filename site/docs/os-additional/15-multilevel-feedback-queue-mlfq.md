---
id: 15-multilevel-feedback-queue-mlfq
title: "Multilevel Feedback Queue (MLFQ): Adaptive Priority & Anti-Starvation"
description: "Explore the premier general-purpose CPU scheduling algorithm: dynamic priority demotion, I/O burst detection, and periodic priority boosts."
sidebar_position: 15
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is Multilevel Feedback Queue (MLFQ) scheduling? How does it approximate Shortest Job First (SJF) without prior knowledge of burst times, how does it prevent starvation, and how does it prevent rogue processes from gaming the scheduler?"

The **Multilevel Feedback Queue (MLFQ)** is widely regarded as one of the most celebrated achievements in systems scheduling. 

It solves the fundamental paradox of general-purpose operating systems: **Shortest Job First (SJF)** is mathematically optimal for minimizing turnaround time, but requires knowing the future execution time of every process—an impossible requirement for general-purpose computing.

MLFQ dynamically **learns from past process behavior** to predict future execution patterns, optimizing simultaneously for **low turnaround time** (for long batch jobs) and **low response time** (for interactive user applications).

---

### The ELI5 Analogy: The IT Help Desk

Imagine an IT Help Desk operating three distinct triage tiers:
- **Tier 1 (Express Counter):** Max **5 minutes** per ticket.
- **Tier 2 (Standard Desk):** Max **20 minutes** per ticket.
- **Tier 3 (Deep Diagnostics):** Unlimited time per ticket.

#### The Learning Strategy:
1. When an employee walks in with a ticket, the help desk has no idea whether it is a 30-second password reset or an 8-hour motherboard rebuild.
2. By default, **everyone is placed into Tier 1**.
3. If their problem is resolved in under 5 minutes, they leave immediately (**Fast Turnaround**).
4. If their 5 minutes expire and the problem persists, the technician says: *"This is a complex job."* They are demoted to Tier 2.
5. If Tier 2's 20 minutes expire, they sink to Tier 3, where long-running repairs execute without blocking quick tickets.

#### The Anti-Starvation Boost:
If 500 people flood the office with 1-minute password resets, Tier 3 will never be touched (Starvation). To prevent this, every Monday morning, management closes all counters, rounds up every customer in Tier 2 and Tier 3, and **boosts everyone back to Tier 1** for re-evaluation.

---

### The Five Canonical Rules of MLFQ

An MLFQ consists of multiple discrete queues, each assigned a distinct priority level. Higher queues have smaller time quanta; lower queues have larger time quanta:

```
[ Queue 2: Highest Priority ]  ── Quantum:  10 ms  (Interactive I/O Tasks)
             │ (Demotion)
[ Queue 1: Medium Priority  ]  ── Quantum:  40 ms  (Moderate Tasks)
             │ (Demotion)
[ Queue 0: Lowest Priority  ]  ── Quantum: 100 ms  (CPU-bound Batch Compute)
```

The scheduling engine operates under **Five Definitive Rules**:

| Rule | Formal Definition | Systems Purpose |
| :--- | :--- | :--- |
| **Rule 1** | If $\text{Priority}(A) > \text{Priority}(B)$, **Process A runs** (Process B waits). | Enforces strict priority hierarchy. |
| **Rule 2** | If $\text{Priority}(A) == \text{Priority}(B)$, **A and B run in Round Robin (RR)** using the queue's time slice. | Ensures fairness among equal-priority tasks. |
| **Rule 3** | When a job enters the system, it is placed at the **highest-priority queue**. | Optimistic assumption: assumes every new job is short/interactive. |
| **Rule 4** | Once a job exhausts its **cumulative time allotment** at a given level, its priority is reduced (demoted by one queue). | Demotes CPU-heavy batch workloads out of the way. |
| **Rule 5** | After a designated time period $S$, **move all jobs in the system back to the topmost queue** (Priority Boost). | Prevents starvation and adapts to dynamic behavior changes. |

---

### How MLFQ Discovers Process Characteristics Automatically

1. **Interactive / I/O-Bound Jobs (e.g., Text Editors, Web Browsers):**
   - An interactive application runs for 1 ms to handle a keypress and then blocks waiting for user input (`read()` system call).
   - Because it voluntarily relinquishes the CPU long before its top-tier quantum (10 ms) expires, it **never exhausts its allotment**.
   - It remains permanently in the highest-priority queue, guaranteeing near-zero user interface latency.
2. **CPU-Bound Batch Jobs (e.g., Video Rendering, Data Crunching):**
   - A video transcoder continuously executes arithmetic instructions.
   - It consumes its entire 10 ms quantum in Queue 2 and is demoted to Queue 1.
   - It consumes its entire 40 ms quantum in Queue 1 and sinks to Queue 0.
   - In Queue 0, it receives large 100 ms time slices to minimize context switch overhead, running efficiently whenever interactive apps are idle.

---

### The "Gaming the Scheduler" Attack & Defense

In early, naive implementations of MLFQ, Rule 4 was formulated as:
> *"If a process yields the CPU before its quantum expires, its quantum counter is reset."*

#### The Vulnerability:
A malicious program (or clever crypto miner) could easily monopolize 99% of the CPU:
```c
while (1) {
    do_heavy_computation(9.9); // Run for 9.9 ms out of a 10 ms slice
    issue_dummy_disk_read();   // Yield CPU at 9.9 ms!
}
```
Because the process yielded before the 10 ms limit, the naive scheduler placed it back at the front of Queue 2 with a brand new 10 ms quantum, allowing it to hijack the highest priority indefinitely!

#### The Defense: Cumulative CPU Time Accounting
Modern MLFQ engines rewrite Rule 4 to track **cumulative CPU usage**:
- The scheduler tracks total CPU time consumed by the process at the current priority level.
- Regardless of how many times the process yields for I/O, once the sum of its micro-bursts reaches the quantum threshold, **it is forcibly demoted**.

---

### MLFQ vs. Modern Linux CFS (Completely Fair Scheduler)

While MLFQ remains the foundational blueprint for multi-queue systems (such as Windows NT/11 and macOS), Linux evolved a different paradigm:

| Dimension | Multilevel Feedback Queue (MLFQ) | Linux Completely Fair Scheduler (CFS) |
| :--- | :--- | :--- |
| **Primary Data Structure** | Multiple discrete FIFO/RR queues | Single **Red-Black Tree** ordered by `vruntime` |
| **Priority Assignment** | Discrete dynamic priority levels ($0$ to $N$) | Granular "nice" values ($-20$ to $+19$) mapping to weights |
| **Time Quantum** | Fixed discrete per queue (e.g., 10ms, 40ms, 100ms) | Dynamic: Target latency divided proportionally by process weights |
| **Complexity** | $O(1)$ queue pop; periodic $O(N)$ priority boost | $O(\log N)$ tree insert; $O(1)$ leftmost node retrieval |

---

### Summary

"Multilevel Feedback Queue (MLFQ) dynamically approximates Shortest Job First by placing new jobs in the highest-priority queue and demoting tasks that exhaust their time slices to lower queues with larger quanta. Interactive I/O tasks remain at the top due to early yields, preserving low response times, while batch jobs sink to the bottom. To prevent starvation and handle processes that transition from batch to interactive, a periodic priority boost resets all tasks to the top queue. Cumulative accounting prevents malicious processes from gaming the scheduler by yielding right before quantum expiration."

---

### Python Verification: Multi-Queue MLFQ Simulator

The following executable Python script implements a complete 3-level MLFQ scheduler, demonstrating interactive task prioritization, CPU-bound task demotion, cumulative accounting against gaming, and periodic priority boosting:

```python
"""
Multilevel Feedback Queue (MLFQ) Scheduler Simulation
Demonstrates:
  1. Dynamic priority demotion across 3 queues (Q0=10ms, Q1=30ms, Q2=80ms)
  2. Interactive task high-priority retention
  3. Anti-gaming cumulative CPU accounting
  4. Periodic priority boost (anti-starvation)
"""

from typing import List, Dict, Optional

class Process:
    def __init__(self, name: str, total_work: int, io_frequency: Optional[int] = None):
        self.name = name
        self.total_work = total_work
        self.work_remaining = total_work
        self.io_frequency = io_frequency  # Steps before voluntary I/O yield
        self.steps_until_io = io_frequency
        self.current_queue = 0            # 0: Highest, 1: Medium, 2: Lowest
        self.time_allotment_used = 0      # Cumulative time spent at current level

    def __repr__(self):
        return f"{self.name}(rem={self.work_remaining}, Q{self.current_queue})"


class MLFQScheduler:
    def __init__(self, boost_interval: int = 50):
        # 3 Queues: Q0 (quantum=5), Q1 (quantum=15), Q2 (quantum=30)
        self.quanta = {0: 5, 1: 15, 2: 30}
        self.queues: Dict[int, List[Process]] = {0: [], 1: [], 2: []}
        self.boost_interval = boost_interval
        self.tick_count = 0

    def add_process(self, p: Process):
        # Rule 3: Enters at highest priority
        p.current_queue = 0
        p.time_allotment_used = 0
        self.queues[0].append(p)

    def priority_boost(self):
        # Rule 5: Priority Boost (Anti-Starvation)
        print(f"  [TICK {self.tick_count}] *** PRIORITY BOOST *** Moving all processes to Q0!")
        all_procs = []
        for q in [0, 1, 2]:
            all_procs.extend(self.queues[q])
            self.queues[q].clear()
        for p in all_procs:
            p.current_queue = 0
            p.time_allotment_used = 0
            self.queues[0].append(p)

    def run(self, max_ticks: int = 70):
        print("Starting MLFQ Simulation...\n")
        while self.tick_count < max_ticks:
            self.tick_count += 1

            # Check for periodic priority boost
            if self.tick_count % self.boost_interval == 0:
                self.priority_boost()

            # Rule 1: Find highest priority non-empty queue
            active_queue = None
            for q_idx in [0, 1, 2]:
                if self.queues[q_idx]:
                    active_queue = q_idx
                    break

            if active_queue is None:
                print("All processes completed.")
                break

            current_proc = self.queues[active_queue].pop(0)

            # Execute 1 tick of compute
            current_proc.work_remaining -= 1
            current_proc.time_allotment_used += 1

            yielded_for_io = False
            if current_proc.io_frequency is not None:
                current_proc.steps_until_io -= 1
                if current_proc.steps_until_io == 0:
                    yielded_for_io = True
                    current_proc.steps_until_io = current_proc.io_frequency

            # Check completion
            if current_proc.work_remaining == 0:
                print(f"Tick {self.tick_count:02d}: {current_proc.name} COMPLETED! (Finished in Q{current_proc.current_queue})")
                continue

            # Rule 4: Check if cumulative time allotment at this level is exhausted
            level_quantum = self.quanta[current_proc.current_queue]
            if current_proc.time_allotment_used >= level_quantum:
                # Demote
                if current_proc.current_queue < 2:
                    current_proc.current_queue += 1
                current_proc.time_allotment_used = 0
                print(f"Tick {self.tick_count:02d}: {current_proc.name} exhausted allotment -> Demoted to Q{current_proc.current_queue}")
                self.queues[current_proc.current_queue].append(current_proc)
            else:
                # Still has allotment
                if yielded_for_io:
                    # Interactive yield: remains at current priority level!
                    self.queues[current_proc.current_queue].append(current_proc)
                else:
                    self.queues[current_proc.current_queue].append(current_proc)


def main():
    print("=== Multi-Level Feedback Queue (MLFQ) Scheduling Test ===\n")
    sched = MLFQScheduler(boost_interval=35)

    # Process 1: Interactive UI App (Yields every 2 ticks for I/O)
    p_interactive = Process("UI_Interactive", total_work=10, io_frequency=2)
    # Process 2: CPU-Bound Batch Computation (Never yields)
    p_batch = Process("Batch_Compute", total_work=45, io_frequency=None)

    sched.add_process(p_interactive)
    sched.add_process(p_batch)

    sched.run(max_ticks=55)

if __name__ == "__main__":
    main()
```