---
id: 2-priority-scheduling-starvation-aging
title: "Priority Scheduling Problem: Preemption, Starvation & Aging Calculation"
description: "Solve numerical Priority Scheduling questions for both non-preemptive and preemptive models, demonstrate starvation, and calculate aging mitigations."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given five processes with arrival times, burst times, and priority ranks, calculate execution schedules, Gantt charts, and average waiting times for both Non-Preemptive and Preemptive Priority Scheduling. Identify the starving process, and demonstrate numerically how Aging prevents indefinite postponement."

---

### Problem Specification & Dataset

Consider five processes where **lower integer indicates higher priority** (1 = Highest Priority, 4 = Lowest Priority):

| Process | Arrival Time (AT) | Burst Time (BT) | Priority |
| :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 4 ms | 3 |
| **P2** | 1 ms | 3 ms | 1 (High) |
| **P3** | 2 ms | 5 ms | 2 |
| **P4** | 4 ms | 2 ms | 1 (High) |
| **P5** | 5 ms | 6 ms | 4 (Low) |

*Tie-Breaking Rule:* If two runnable processes share the same priority, the process that arrived earlier (FCFS) executes first.

---

### Part 1: Non-Preemptive Priority Scheduling

In Non-Preemptive scheduling, once a process acquires the CPU, it runs to completion without interruption.

#### Execution Timeline:
- **t = 0 ms:** Only P1 has arrived. P1 runs to completion: t = 0 -> 4 ms.
- **t = 4 ms:** P1 finishes. Arrived processes in ready queue: P2 (Prio 1, AT = 1 ms), P3 (Prio 2, AT = 2 ms), P4 (Prio 1, AT = 4 ms).
  - P2 and P4 tie at Priority 1. By arrival time (1 < 4), P2 wins. Runs t = 4 -> 7 ms.
- **t = 7 ms:** P2 finishes. Ready queue: P4 (Prio 1), P3 (Prio 2), P5 (Prio 4, arrived at t = 5 ms).
  - Highest priority is P4. Runs t = 7 -> 9 ms.
- **t = 9 ms:** P4 finishes. Ready queue: P3 (Prio 2), P5 (Prio 4).
  - Highest priority is P3. Runs t = 9 -> 14 ms.
- **t = 14 ms:** P3 finishes. Only P5 remains. Runs t = 14 -> 20 ms.

#### Gantt Chart
```
[  P1 (4ms)  ][ P2 (3ms) ][ P4 (2ms) ][   P3 (5ms)   ][     P5 (6ms)     ]
0            4           7           9               14                 20
```

#### Step-by-Step Calculation Table

| Process | AT | BT | Priority | Completion (CT) | Turnaround Time (TAT = CT - AT) | Waiting Time (WT = TAT - BT) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 4 ms | 3 | 4 ms | 4 - 0 = 4 ms | 4 - 4 = 0 ms |
| **P2** | 1 ms | 3 ms | 1 | 7 ms | 7 - 1 = 6 ms | 6 - 3 = 3 ms |
| **P4** | 4 ms | 2 ms | 1 | 9 ms | 9 - 4 = 5 ms | 5 - 2 = 3 ms |
| **P3** | 2 ms | 5 ms | 2 | 14 ms | 14 - 2 = 12 ms | 12 - 5 = 7 ms |
| **P5** | 5 ms | 6 ms | 4 | 20 ms | 20 - 5 = 15 ms | 15 - 6 = 9 ms |

- **Average Turnaround Time:** (4 + 6 + 5 + 12 + 15) / 5 = 42 / 5 = **8.40 ms**
- **Average Waiting Time:** (0 + 3 + 3 + 7 + 9) / 5 = 22 / 5 = **4.40 ms**

---

### Part 2: Preemptive Priority Scheduling

Whenever a new process arrives whose priority rank is strictly higher (lower numerical value) than the currently running task, the active task is **preempted immediately**.

#### Execution Timeline:
- **t = 0 ms:** P1 begins execution (Priority 3).
- **t = 1 ms:** P2 arrives with Priority 1. P1 has Priority 3. Because 1 < 3, **P2 preempts P1!** (P1 remaining burst = 3 ms).
- **t = 1 -> 4 ms:** P2 executes uninterrupted:
  - At t = 2 ms, P3 arrives (Priority 2, does not preempt P2).
  - At t = 4 ms, P4 arrives (Priority 1, ties P2, does not preempt).
  - At t = 4 ms, P2 completes.
- **t = 4 ms:** Ready queue contains: P4 (Prio 1), P3 (Prio 2), P1 (Prio 3, rem 3 ms).
  - Highest is P4. Runs t = 4 -> 6 ms.
  - At t = 5 ms, P5 arrives (Priority 4, does not preempt).
- **t = 6 ms:** P4 completes. Ready queue contains: P3 (Prio 2), P1 (Prio 3, rem 3 ms), P5 (Prio 4).
  - Highest is P3. Runs t = 6 -> 11 ms.
- **t = 11 ms:** P3 completes. Ready queue contains: P1 (Prio 3, rem 3 ms), P5 (Prio 4).
  - Highest is P1. Resumes and runs t = 11 -> 14 ms.
- **t = 14 ms:** P1 completes. Only P5 remains. Runs t = 14 -> 20 ms.

#### Gantt Chart
```
[P1][ P2 (3ms) ][ P4 (2ms) ][   P3 (5ms)   ][  P1 (3ms)  ][     P5 (6ms)     ]
0  1           4           6              11            14                 20
```

#### Step-by-Step Calculation Table

| Process | AT | BT | Priority | Completion (CT) | Turnaround Time (TAT = CT - AT) | Waiting Time (WT = TAT - BT) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 4 ms | 3 | 14 ms | 14 - 0 = 14 ms | 14 - 4 = 10 ms |
| **P2** | 1 ms | 3 ms | 1 | 4 ms | 4 - 1 = 3 ms | 3 - 3 = 0 ms |
| **P4** | 4 ms | 2 ms | 1 | 6 ms | 6 - 4 = 2 ms | 2 - 2 = 0 ms |
| **P3** | 2 ms | 5 ms | 2 | 11 ms | 11 - 2 = 9 ms | 9 - 5 = 4 ms |
| **P5** | 5 ms | 6 ms | 4 | 20 ms | 20 - 5 = 15 ms | 15 - 6 = 9 ms |

- **Average Turnaround Time:** (14 + 3 + 2 + 9 + 15) / 5 = 43 / 5 = **8.60 ms**
- **Average Waiting Time:** (10 + 0 + 0 + 4 + 9) / 5 = 23 / 5 = **4.60 ms**

---

### Comparative Evaluation Scorecard

| Mode | Preemptive? | Avg Turnaround Time (TAT) | Avg Waiting Time (WT) | Starvation Vulnerability |
| :--- | :---: | :---: | :---: | :--- |
| **Non-Preemptive Priority** | No | 8.40 ms | 4.40 ms | P5 starves if Priority 1 to 3 tasks continue arriving. |
| **Preemptive Priority** | Yes | 8.60 ms | 4.60 ms | P5 starves; lower-priority running jobs can be preempted at any instant. |

---

### Starvation & Indefinite Postponement

#### The Victim Process:
In both Non-Preemptive and Preemptive scheduling, **P5 (Priority 4)** is the lowest-priority job in the system:
- If a steady stream of new processes with Priority 1, 2, or 3 continues arriving every few milliseconds, P5 will **never receive the CPU**.
- This condition is known as **Indefinite Postponement** or **Starvation**.

---

### The Mathematical Fix: Aging

**Aging** is an operating system technique that gradually increases the priority of processes that wait in the system for extended periods.

#### Formal Aging Formula:
$$\text{Priority}_{\text{effective}}(t) = \text{Priority}_{\text{initial}} - \left\lfloor \frac{t - t_{\text{arrival}}}{k} \right\rfloor$$

*(Where priority rank increases as the numeric value decreases; $k$ is the aging rate constant).*

#### Numerical Demonstration (k = 3 ms):
Suppose the kernel increments priority by 1 level for every 3 ms a process spends waiting in the ready queue:

```
Process P5 (Arrival = 5 ms, Initial Priority = 4):
├── At t = 5 ms:  Wait Time = 0 ms  -> Priority = 4
├── At t = 8 ms:  Wait Time = 3 ms  -> Priority boosts to 3
├── At t = 11 ms: Wait Time = 6 ms  -> Priority boosts to 2
└── At t = 14 ms: Wait Time = 9 ms  -> Priority boosts to 1 (HIGHEST PRIORITY!)
```

At t = 14 ms, P5's effective priority elevates to 1, allowing it to compete on equal terms with freshly arriving high-priority tasks and **guaranteeing bounded waiting time**.

---

### Summary

Non-preemptive priority scheduling dispatches the highest-priority runnable process to completion upon CPU vacancy. Preemptive priority scheduling forcibly preempts running tasks the exact moment a higher-priority task arrives. Both variants are vulnerable to starvation for low-priority processes under sustained high-priority load. Operating systems resolve starvation through Aging, periodically incrementing a waiting task's priority over time to guarantee bounded latency and prevent indefinite postponement.

---

### Python Verification: Priority Scheduling & Aging Simulator

The following executable Python script implements both Non-Preemptive and Preemptive Priority Scheduling, calculating Gantt traces, performance averages, and demonstrating dynamic aging:

```python
"""
Priority Scheduling with Preemption & Aging Simulator
Demonstrates:
  1. Non-Preemptive Priority Scheduling
  2. Preemptive Priority Scheduling
  3. Dynamic Priority Aging to prevent starvation
"""

from typing import List, Tuple

class PriorityProcess:
    def __init__(self, pid: str, arrival: int, burst: int, priority: int):
        self.pid = pid
        self.arrival = arrival
        self.burst = burst
        self.priority = priority
        self.remaining = burst
        self.completion = 0

    def tat(self) -> int:
        return self.completion - self.arrival

    def wt(self) -> int:
        return self.tat() - self.burst


def run_non_preemptive_priority(procs: List[PriorityProcess]) -> Tuple[float, float]:
    current_time = 0
    completed = []
    unstarted = sorted(procs, key=lambda p: p.arrival)
    ready = []

    while len(completed) < len(procs):
        while unstarted and unstarted[0].arrival <= current_time:
            ready.append(unstarted.pop(0))

        if not ready:
            current_time = unstarted[0].arrival
            continue

        # Sort by: 1. Priority (lower is better), 2. Arrival (FCFS tie-break)
        ready.sort(key=lambda p: (p.priority, p.arrival))
        active = ready.pop(0)
        current_time += active.burst
        active.completion = current_time
        completed.append(active)

    avg_tat = sum(p.tat() for p in completed) / len(completed)
    avg_wt = sum(p.wt() for p in completed) / len(completed)
    return avg_tat, avg_wt


def run_preemptive_priority(procs: List[PriorityProcess]) -> Tuple[float, float]:
    current_time = 0
    completed = []
    total = len(procs)

    while len(completed) < total:
        available = [p for p in procs if p.arrival <= current_time and p.remaining > 0]
        if not available:
            current_time += 1
            continue

        available.sort(key=lambda p: (p.priority, p.arrival))
        active = available[0]
        active.remaining -= 1
        current_time += 1

        if active.remaining == 0:
            active.completion = current_time
            completed.append(active)

    avg_tat = sum(p.tat() for p in completed) / len(completed)
    avg_wt = sum(p.wt() for p in completed) / len(completed)
    return avg_tat, avg_wt


def main():
    print("=== Priority Scheduling & Aging Verification ===\n")
    # Dataset: (PID, Arrival, Burst, Priority)
    dataset = [
        ("P1", 0, 4, 3),
        ("P2", 1, 3, 1),
        ("P3", 2, 5, 2),
        ("P4", 4, 2, 1),
        ("P5", 5, 6, 4),
    ]

    # 1. Non-Preemptive
    procs_np = [PriorityProcess(pid, arr, bst, prio) for pid, arr, bst, prio in dataset]
    tat_np, wt_np = run_non_preemptive_priority(procs_np)
    print(f"Non-Preemptive Priority: Avg TAT = {tat_np:5.2f} ms | Avg WT = {wt_np:5.2f} ms")

    # 2. Preemptive
    procs_p = [PriorityProcess(pid, arr, bst, prio) for pid, arr, bst, prio in dataset]
    tat_p, wt_p = run_preemptive_priority(procs_p)
    print(f"Preemptive Priority:     Avg TAT = {tat_p:5.2f} ms | Avg WT = {wt_p:5.2f} ms")

    # 3. Aging Demonstration
    print("\n--- Aging Simulation for Starving Process P5 (Initial Prio = 4) ---")
    p5_arrival = 5
    aging_interval = 3
    for t in range(5, 17):
        wait_time = t - p5_arrival
        effective_prio = max(1, 4 - (wait_time // aging_interval))
        if wait_time % aging_interval == 0:
            print(f"  At t = {t:2d} ms (Wait: {wait_time:2d} ms) -> Effective Priority boosted to {effective_prio}")

if __name__ == "__main__":
    main()
```