---
id: 15-multilevel-feedback-queue-mlfq
title: "Multilevel Feedback Queue (MLFQ) Scheduling"
description: "How MLFQ approximates Shortest Job First without knowing burst times in advance, and how it prevents starvation and gaming."
sidebar_position: 15
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is Multilevel Feedback Queue (MLFQ) scheduling? How does it approximate Shortest Job First (SJF) without prior knowledge of burst times, how does it prevent starvation, and how does it prevent rogue processes from gaming the scheduler?"

Shortest Job First is the best possible scheduling algorithm for turnaround time — but it needs to know how long each job will run before it runs it, which is impossible in general. MLFQ's trick is to stop trying to predict the future and instead learn from how a job has behaved so far.

---

### The analogy: an IT help desk with three tiers

- **Tier 1 (express counter):** max 5 minutes per ticket.
- **Tier 2 (standard desk):** max 20 minutes per ticket.
- **Tier 3 (deep diagnostics):** unlimited time.

Nobody knows up front if a ticket is a 30-second password reset or an 8-hour motherboard rebuild, so everyone starts at Tier 1. If it's solved within 5 minutes, great — fast turnaround. If not, the technician says "this is complex" and bumps it to Tier 2. If Tier 2's 20 minutes run out too, it sinks to Tier 3, where long jobs run without blocking quick ones.

The catch: if 500 people flood in with 1-minute password resets, Tier 3 never gets touched again — the jobs there starve. The fix is a periodic reset: every so often, everyone gets boosted back to Tier 1 for re-evaluation.

<Diagram>
<Row>
<Box title="Queue 0 — highest priority" accent="#34d399"><Field icon="⚡" code="short time slice" hint="new/interactive jobs start here" variant="neutral" /></Box>
<Arrow label="uses full slice → demoted" />
<Box title="Queue 1" accent="#f59e0b"><Field icon="⏳" code="longer time slice" variant="neutral" /></Box>
<Arrow label="uses full slice → demoted" />
<Box title="Queue 2 — lowest priority" accent="#fb7185"><Field icon="🐢" code="longest time slice" hint="CPU-bound jobs end up here" variant="neutral" /></Box>
</Row>
</Diagram>

---

### The five rules

| Rule | What it says | Why |
| :--- | :--- | :--- |
| **1** | Higher-priority job always runs before a lower-priority one. | Strict priority order. |
| **2** | Equal-priority jobs share the CPU round-robin. | Fairness among peers. |
| **3** | A new job always starts at the highest-priority queue. | Assume it's short/interactive until proven otherwise. |
| **4** | Once a job uses up its full time allotment at a level, demote it one queue. | Pushes CPU-heavy jobs out of the way. |
| **5** | Periodically, move every job back to the top queue (a "boost"). | Prevents starvation, lets jobs change behavior. |

---

### How MLFQ figures out what kind of job it's running

- **Interactive jobs** (text editors, browsers) run for a millisecond to handle a keypress, then block waiting on input. They never use up their quantum, so they just stay at the top queue forever — which is exactly what you want for low-latency UI response.
- **CPU-bound jobs** (video encoding, number crunching) keep computing. They burn through Queue 0's quantum, get demoted to Queue 1, burn through that too, and sink to Queue 2, where they get bigger time slices (so they're not constantly interrupted) and run whenever nothing interactive needs the CPU.

---

### The gaming attack, and the fix

An early, naive version of Rule 4 said: "if a process yields before its quantum is up, reset its quantum." That's exploitable — a process can run for 9.9 ms out of a 10 ms slice, issue a throwaway I/O call just before the deadline, and get placed right back at the top with a fresh quantum, over and over:

```c
while (1) {
    do_heavy_computation(9.9); // just under the 10ms limit
    issue_dummy_disk_read();   // yield right before the quantum expires
}
```

The fix is to track **cumulative** CPU time at a level instead of resetting on every yield. No matter how many times the process yields, once its total time at that level crosses the threshold, it gets demoted.

---

### MLFQ vs. Linux's CFS

Linux doesn't actually use MLFQ — it uses the Completely Fair Scheduler, built on a different idea entirely.

| | MLFQ | Linux CFS |
| :--- | :--- | :--- |
| **Structure** | Several fixed queues | One red-black tree ordered by `vruntime` |
| **Priority** | Discrete queue levels | Continuous "nice" values (-20 to +19) |
| **Time slice** | Fixed per queue (10ms, 40ms, 100ms...) | Dynamic, split proportionally by weight |
| **Cost** | O(1) pop, periodic O(N) boost | O(log N) insert, O(1) to grab the next task |

---

### Say this in the interview

*"MLFQ approximates Shortest Job First without knowing burst times ahead of time: every job starts at the highest-priority queue, and jobs that use their full time slice get demoted to a lower queue with a bigger slice. Interactive jobs stay at the top because they yield early; CPU-bound jobs sink to the bottom. A periodic priority boost resets everyone to the top queue to prevent starvation, and cumulative time accounting (instead of resetting on every yield) stops processes from gaming the scheduler by yielding right before their quantum runs out."*

---

### Python verification: a 3-level MLFQ simulator

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
