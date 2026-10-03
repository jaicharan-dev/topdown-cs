---
id: 1-cpu-scheduling-fcfs-sjf-srtf-round-robin
title: "CPU Scheduling Problem: FCFS, SJF, SRTF, and Round Robin Walkthrough"
description: "Step-by-step problem walkthrough comparing FCFS, Non-Preemptive SJF, Preemptive SRTF, and Round Robin on arrival and burst time data with Gantt charts."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given four processes with varying arrival times and burst times, construct Gantt charts and compute completion time (CT), turnaround time (TAT), and waiting time (WT) for FCFS, Non-Preemptive SJF, Preemptive SRTF, and Round Robin (q = 3 ms). Why does SRTF achieve minimal average waiting time, and why is it rarely used in production kernels?"

---

### Problem Specification & Dataset

Consider four processes arriving in the ready queue with the following characteristics:

| Process | Arrival Time (AT) | Burst Time (BT) |
| :---: | :---: | :---: |
| **P1** | 0 ms | 8 ms |
| **P2** | 1 ms | 4 ms |
| **P3** | 2 ms | 9 ms |
| **P4** | 3 ms | 5 ms |

#### Standard Scheduling Formulas:
- **Turnaround Time (TAT):** Total elapsed time from arrival to completion.
  $$TAT = CT - AT$$
- **Waiting Time (WT):** Total time spent waiting in the ready queue without CPU allocation.
  $$WT = TAT - BT$$

---

### Part 1: First-Come, First-Served (FCFS)

FCFS executes processes strictly in order of their arrival without preemption.

#### Gantt Chart
```
[  P1 (8ms)  ][ P2 (4ms) ][    P3 (9ms)    ][  P4 (5ms)  ]
0            8           12                21            26
```

#### Step-by-Step Calculation Table

| Process | AT | BT | Completion (CT) | Turnaround Time (TAT = CT - AT) | Waiting Time (WT = TAT - BT) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 8 ms | 8 ms | 8 - 0 = 8 ms | 8 - 8 = 0 ms |
| **P2** | 1 ms | 4 ms | 12 ms | 12 - 1 = 11 ms | 11 - 4 = 7 ms |
| **P3** | 2 ms | 9 ms | 21 ms | 21 - 2 = 19 ms | 19 - 9 = 10 ms |
| **P4** | 3 ms | 5 ms | 26 ms | 26 - 3 = 23 ms | 23 - 5 = 18 ms |

- **Average Turnaround Time:** (8 + 11 + 19 + 23) / 4 = 61 / 4 = **15.25 ms**
- **Average Waiting Time:** (0 + 7 + 10 + 18) / 4 = 35 / 4 = **8.75 ms**

> **The Convoy Effect:** P4 only requires 5 ms of computation, but sat waiting for 18 ms behind the long burst of P3. FCFS heavily penalizes short jobs when scheduled behind long CPU-bound tasks.

---

### Part 2: Shortest Job First (SJF): Non-Preemptive

In Non-Preemptive SJF, once a process begins execution, it runs to completion. Whenever the CPU becomes idle, the scheduler dispatches the available arrived process with the shortest burst time.

#### Execution Timeline:
- **t = 0 ms:** Only P1 has arrived. P1 starts and runs uninterrupted until t = 8 ms.
- **t = 8 ms:** P1 finishes. Arrived processes in ready queue: P2 (BT = 4 ms), P3 (BT = 9 ms), P4 (BT = 5 ms). Shortest job is P2. Runs t = 8 -> 12 ms.
- **t = 12 ms:** P2 finishes. Remaining in queue: P4 (BT = 5 ms), P3 (BT = 9 ms). Shortest job is P4. Runs t = 12 -> 17 ms.
- **t = 17 ms:** P4 finishes. Remaining in queue: P3 (BT = 9 ms). Runs t = 17 -> 26 ms.

#### Gantt Chart
```
[  P1 (8ms)  ][ P2 (4ms) ][  P4 (5ms)  ][    P3 (9ms)    ]
0            8           12            17                26
```

#### Step-by-Step Calculation Table

| Process | AT | BT | Completion (CT) | Turnaround Time (TAT = CT - AT) | Waiting Time (WT = TAT - BT) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 8 ms | 8 ms | 8 - 0 = 8 ms | 8 - 8 = 0 ms |
| **P2** | 1 ms | 4 ms | 12 ms | 12 - 1 = 11 ms | 11 - 4 = 7 ms |
| **P4** | 3 ms | 5 ms | 17 ms | 17 - 3 = 14 ms | 14 - 5 = 9 ms |
| **P3** | 2 ms | 9 ms | 26 ms | 26 - 2 = 24 ms | 24 - 9 = 15 ms |

- **Average Turnaround Time:** (8 + 11 + 14 + 24) / 4 = 57 / 4 = **14.25 ms**
- **Average Waiting Time:** (0 + 7 + 9 + 15) / 4 = 31 / 4 = **7.75 ms**

---

### Part 3: Shortest Remaining Time First (SRTF): Preemptive SJF

In SRTF, if a newly arrived process has a remaining burst time strictly less than the currently running process, the current process is **preempted immediately**.

#### Execution Timeline:
- **t = 0 ms:** P1 starts running (BT = 8 ms).
- **t = 1 ms:** P2 arrives with BT = 4 ms. P1 has remaining burst 7 ms. Because 4 < 7, **P2 preempts P1!**
- **t = 1 -> 5 ms:** P2 runs to completion at t = 5 ms. During this interval, P3 arrives at t = 2 ms (BT = 9 ms) and P4 arrives at t = 3 ms (BT = 5 ms).
- **t = 5 ms:** Ready queue: P4 (BT = 5 ms), P1 (rem = 7 ms), P3 (BT = 9 ms). Shortest remaining job is P4. Runs t = 5 -> 10 ms.
- **t = 10 ms:** P4 completes. Ready queue: P1 (rem = 7 ms), P3 (BT = 9 ms). Shortest remaining job is P1. Runs t = 10 -> 17 ms.
- **t = 17 ms:** P1 completes. Only P3 remains (rem = 9 ms). Runs t = 17 -> 26 ms.

#### Gantt Chart
```
[P1][ P2 (4ms) ][  P4 (5ms)  ][   P1 (7ms)   ][    P3 (9ms)    ]
0  1           5             10              17                26
```

#### Step-by-Step Calculation Table

| Process | AT | BT | Completion (CT) | Turnaround Time (TAT = CT - AT) | Waiting Time (WT = TAT - BT) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 8 ms | 17 ms | 17 - 0 = 17 ms | 17 - 8 = 9 ms |
| **P2** | 1 ms | 4 ms | 5 ms | 5 - 1 = 4 ms | 4 - 4 = 0 ms |
| **P4** | 3 ms | 5 ms | 10 ms | 10 - 3 = 7 ms | 7 - 5 = 2 ms |
| **P3** | 2 ms | 9 ms | 26 ms | 26 - 2 = 24 ms | 24 - 9 = 15 ms |

- **Average Turnaround Time:** (17 + 4 + 7 + 24) / 4 = 52 / 4 = **13.00 ms**
- **Average Waiting Time:** (9 + 0 + 2 + 15) / 4 = 26 / 4 = **6.50 ms**

---

### Part 4: Round Robin (RR, Quantum = 3 ms)

Processes are dispatched in a circular FIFO queue for a maximum time quantum of q = 3 ms. If a process does not finish within 3 ms, it is preempted and returned to the tail of the ready queue.

#### Ready Queue Trace (q = 3 ms):
- **t = 0 ms:** P1 arrives. Queue: `[P1]`. P1 runs t = 0 -> 3 ms (remaining burst = 5 ms).
- During this window: P2 arrives at t = 1 ms, P3 arrives at t = 2 ms, and P4 arrives at t = 3 ms.
- Newly arrived P4 is enqueued before preempted P1. Queue becomes: `[P2, P3, P4, P1]`.
- **t = 3 -> 6 ms:** P2 runs 3 ms (remaining burst = 1 ms). Queue: `[P3, P4, P1, P2]`.
- **t = 6 -> 9 ms:** P3 runs 3 ms (remaining burst = 6 ms). Queue: `[P4, P1, P2, P3]`.
- **t = 9 -> 12 ms:** P4 runs 3 ms (remaining burst = 2 ms). Queue: `[P1, P2, P3, P4]`.
- **t = 12 -> 15 ms:** P1 runs 3 ms (remaining burst = 2 ms). Queue: `[P2, P3, P4, P1]`.
- **t = 15 -> 16 ms:** P2 runs its remaining 1 ms and **completes at t = 16 ms!** Queue: `[P3, P4, P1]`.
- **t = 16 -> 19 ms:** P3 runs 3 ms (remaining burst = 3 ms). Queue: `[P4, P1, P3]`.
- **t = 19 -> 21 ms:** P4 runs its remaining 2 ms and **completes at t = 21 ms!** Queue: `[P1, P3]`.
- **t = 21 -> 23 ms:** P1 runs its remaining 2 ms and **completes at t = 23 ms!** Queue: `[P3]`.
- **t = 23 -> 26 ms:** P3 runs its remaining 3 ms and **completes at t = 26 ms!** Queue empty.

#### Gantt Chart
```
[ P1 ][ P2 ][ P3 ][ P4 ][ P1 ][P2][ P3 ][P4][P1][ P3 ]
0    3     6     9    12    15  16   19   21  23    26
```

#### Step-by-Step Calculation Table

| Process | AT | BT | Completion (CT) | Turnaround Time (TAT = CT - AT) | Waiting Time (WT = TAT - BT) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 8 ms | 23 ms | 23 - 0 = 23 ms | 23 - 8 = 15 ms |
| **P2** | 1 ms | 4 ms | 16 ms | 16 - 1 = 15 ms | 15 - 4 = 11 ms |
| **P3** | 2 ms | 9 ms | 26 ms | 26 - 2 = 24 ms | 24 - 9 = 15 ms |
| **P4** | 3 ms | 5 ms | 21 ms | 21 - 3 = 18 ms | 18 - 5 = 13 ms |

- **Average Turnaround Time:** (23 + 15 + 24 + 18) / 4 = 80 / 4 = **20.00 ms**
- **Average Waiting Time:** (15 + 11 + 15 + 13) / 4 = 54 / 4 = **13.50 ms**

---

### Comparative Scorecard & Engineering Analysis

| Algorithm | Preemptive? | Avg Turnaround Time (TAT) | Avg Waiting Time (WT) | Best / Worst Property |
| :--- | :---: | :---: | :---: | :--- |
| **SRTF** | Yes | **13.00 ms (Optimal)** | **6.50 ms (Lowest)** | Mathematically optimal average wait time, but causes severe starvation. |
| **SJF** | No | 14.25 ms | 7.75 ms | Excellent throughput, but non-preemptive convoy delays possible. |
| **FCFS** | No | 15.25 ms | 8.75 ms | Minimal scheduling overhead, but suffers from convoy effect. |
| **Round Robin (q = 3 ms)** | Yes | 20.00 ms | 13.50 ms | Highest average wait time, but provides excellent interactive response time and zero starvation. |

---

### Why SRTF is Rejected in Production Operating Systems

Although SRTF is mathematically proven to minimize average waiting time, modern kernels (Linux CFS, Windows NT) reject it for three critical reasons:

1. **The Clairvoyance Problem:** SRTF requires knowing the future burst time of every thread before it executes. General-purpose kernels cannot predict how long a process will run before blocking on user input or disk I/O.
2. **Pathological Starvation:** If a continuous stream of short 1 ms tasks arrives, large tasks (like video encoding or scientific simulations) will never receive CPU time.
3. **Context Switch Thrashing:** In textbook models, context switches cost 0 ms. In physical silicon, saving registers, switching page tables (`CR3`), and cold-cache misses cost 2 to 5 microseconds. Aggressive preemption under SRTF degrades aggregate throughput.

> **Production Solution:** General-purpose kernels use **Multilevel Feedback Queues (MLFQ)** or **Completely Fair Scheduling (CFS)** with virtual runtime (`vruntime`) to approximate the benefits of SRTF dynamically without requiring future knowledge or causing starvation.

---

### Python Verification: Multi-Algorithm CPU Scheduling Simulator

The following executable Python script implements FCFS, SJF, SRTF, and Round Robin, calculating exact completion times, Gantt traces, and waiting time averages:

```python
"""
CPU Scheduling Algorithms Simulator
Demonstrates:
  1. FCFS (First-Come, First-Served)
  2. SJF (Shortest Job First - Non-Preemptive)
  3. SRTF (Shortest Remaining Time First - Preemptive)
  4. Round Robin (Time Quantum = 3)
"""

from typing import List, Dict, Tuple

class Process:
    def __init__(self, pid: str, arrival: int, burst: int):
        self.pid = pid
        self.arrival = arrival
        self.burst = burst
        self.remaining = burst
        self.completion = 0

    def tat(self) -> int:
        return self.completion - self.arrival

    def wt(self) -> int:
        return self.tat() - self.burst


def run_fcfs(procs: List[Process]) -> Tuple[float, float]:
    p_sorted = sorted(procs, key=lambda p: p.arrival)
    current_time = 0
    for p in p_sorted:
        if current_time < p.arrival:
            current_time = p.arrival
        current_time += p.burst
        p.completion = current_time

    avg_tat = sum(p.tat() for p in p_sorted) / len(p_sorted)
    avg_wt = sum(p.wt() for p in p_sorted) / len(p_sorted)
    return avg_tat, avg_wt


def run_sjf_non_preemptive(procs: List[Process]) -> Tuple[float, float]:
    current_time = 0
    completed = []
    ready = []
    unstarted = sorted(procs, key=lambda p: p.arrival)

    while len(completed) < len(procs):
        while unstarted and unstarted[0].arrival <= current_time:
            ready.append(unstarted.pop(0))

        if not ready:
            current_time = unstarted[0].arrival
            continue

        ready.sort(key=lambda p: (p.burst, p.arrival))
        active = ready.pop(0)
        current_time += active.burst
        active.completion = current_time
        completed.append(active)

    avg_tat = sum(p.tat() for p in completed) / len(completed)
    avg_wt = sum(p.wt() for p in completed) / len(completed)
    return avg_tat, avg_wt


def run_srtf(procs: List[Process]) -> Tuple[float, float]:
    current_time = 0
    completed = []
    total = len(procs)

    while len(completed) < total:
        available = [p for p in procs if p.arrival <= current_time and p.remaining > 0]
        if not available:
            current_time += 1
            continue

        available.sort(key=lambda p: (p.remaining, p.arrival))
        active = available[0]
        active.remaining -= 1
        current_time += 1

        if active.remaining == 0:
            active.completion = current_time
            completed.append(active)

    avg_tat = sum(p.tat() for p in completed) / len(completed)
    avg_wt = sum(p.wt() for p in completed) / len(completed)
    return avg_tat, avg_wt


def run_round_robin(procs: List[Process], quantum: int = 3) -> Tuple[float, float]:
    current_time = 0
    queue: List[Process] = []
    unstarted = sorted(procs, key=lambda p: p.arrival)
    completed = []

    while len(completed) < len(procs):
        while unstarted and unstarted[0].arrival <= current_time:
            queue.append(unstarted.pop(0))

        if not queue:
            current_time = unstarted[0].arrival
            continue

        active = queue.pop(0)
        run_slice = min(active.remaining, quantum)
        active.remaining -= run_slice
        current_time += run_slice

        # Enqueue new arrivals that landed during this time slice
        while unstarted and unstarted[0].arrival <= current_time:
            queue.append(unstarted.pop(0))

        if active.remaining == 0:
            active.completion = current_time
            completed.append(active)
        else:
            queue.append(active)

    avg_tat = sum(p.tat() for p in completed) / len(completed)
    avg_wt = sum(p.wt() for p in completed) / len(completed)
    return avg_tat, avg_wt


def main():
    print("=== CPU Scheduling Problem Verification ===\n")
    dataset = [("P1", 0, 8), ("P2", 1, 4), ("P3", 2, 9), ("P4", 3, 5)]

    # 1. FCFS
    fcfs_procs = [Process(pid, arr, bst) for pid, arr, bst in dataset]
    tat_fcfs, wt_fcfs = run_fcfs(fcfs_procs)
    print(f"FCFS:        Avg TAT = {tat_fcfs:5.2f} ms | Avg WT = {wt_fcfs:5.2f} ms")

    # 2. SJF
    sjf_procs = [Process(pid, arr, bst) for pid, arr, bst in dataset]
    tat_sjf, wt_sjf = run_sjf_non_preemptive(sjf_procs)
    print(f"SJF (NP):    Avg TAT = {tat_sjf:5.2f} ms | Avg WT = {wt_sjf:5.2f} ms")

    # 3. SRTF
    srtf_procs = [Process(pid, arr, bst) for pid, arr, bst in dataset]
    tat_srtf, wt_srtf = run_srtf(srtf_procs)
    print(f"SRTF:        Avg TAT = {tat_srtf:5.2f} ms | Avg WT = {wt_srtf:5.2f} ms [Optimal]")

    # 4. Round Robin (q=3)
    rr_procs = [Process(pid, arr, bst) for pid, arr, bst in dataset]
    tat_rr, wt_rr = run_round_robin(rr_procs, quantum=3)
    print(f"Round Robin: Avg TAT = {tat_rr:5.2f} ms | Avg WT = {wt_rr:5.2f} ms")

if __name__ == "__main__":
    main()
```