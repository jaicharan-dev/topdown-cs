---
id: 13-starvation-deadlock-livelock
title: "Starvation vs. Deadlock vs. Livelock: Concurrency Failure Modes"
description: "Clarify the differences between permanent waiting due to unfair scheduling (starvation), circular resource blocking (deadlock), and active state thrashing (livelock)."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the precise difference between Starvation, Deadlock, and Livelock? Compare them across process states and CPU consumption, and explain how systems recover from each."

Concurrency failures in operating systems and distributed architectures are broadly categorized into three distinct failure modes: **Deadlock**, **Livelock**, and **Starvation**.

Interviewers test this to see if you understand the boundary between a system that has **completely halted** (Deadlock), a system that is **actively thrashing without making progress** (Livelock), and a system that is **making aggregate progress while unfairly starving a specific task** (Starvation).

---

### The ELI5 Analogy: The Narrow Hallway

Imagine a narrow hallway wide enough for only one person to pass at a time:
- **Deadlock (The Stare-down):** Alice and Bob enter from opposite sides and meet in the center. Alice says: *"I won't back up until you back up."* Bob says: *"I won't back up until you back up."* Both stand frozen, glaring at each other forever. Zero energy is spent; zero progress is made.
- **Livelock (The Polite Dance):** Alice and Bob meet in the center. Being polite, Alice steps to her right, but Bob simultaneously steps to his left, bumping into each other again. Alice steps left; Bob steps right. Bump. They rapidly dodge side-to-side in perfect synchronization. They are sweating and burning calories, but neither can walk down the hall.
- **Starvation (The VIP Bouncer):** The hallway is open, but a bouncer stands at the door giving priority to anyone with a VIP badge. Charlie has a regular ticket and waits in line. Every time Charlie reaches the front, a new VIP arrives and gets ushered through. The hallway is moving 100 people per minute (System progress is great!), but Charlie waits in line forever.

---

### Deep Dive: The Three Failure Modes

#### 1. Deadlock: Permanent Circular Wait
A condition where every process in a set is suspended waiting for an event or resource that can only be triggered by another process in that same set.

- **Process State:** `TASK_UNINTERRUPTIBLE` (Sleeping/Blocked).
- **CPU Utilization:** **0% CPU**. The threads are removed from the scheduler's runqueue.
- **Coffman's Four Necessary & Sufficient Conditions:**
  1. **Mutual Exclusion:** At least one resource is held in a non-shareable mode.
  2. **Hold and Wait:** A process holds at least one resource and is waiting to acquire another.
  3. **No Preemption:** Resources cannot be forcibly confiscated; they can only be released voluntarily.
  4. **Circular Wait:** A closed chain of processes exists: $P_0$ waits for $P_1$, $P_1$ waits for $P_2$, $\dots$, and $P_n$ waits for $P_0$.
- **Resolution:** Deadlock can be mathematically prevented by breaking **any single one of the four conditions** (e.g., establishing a global lock hierarchy to eliminate circular wait).

---

#### 2. Livelock: Active State Thrashing
A condition where processes actively change their internal state in response to each other, but these state changes prevent any process from advancing forward.

- **Process State:** `TASK_RUNNING` (Active / Spinning).
- **CPU Utilization:** **100% CPU**. Hardware cores are saturated with execution cycles.
- **Real-World Manifestation:** Two threads attempt optimistic locking:
  ```
  Thread A acquires Lock 1 -> Tries Lock 2 -> Fails! -> Releases Lock 1 -> Retries
  Thread B acquires Lock 2 -> Tries Lock 1 -> Fails! -> Releases Lock 2 -> Retries
  ```
  If both threads retry at the exact same frequency, they enter a lockstep cycle of acquiring, colliding, releasing, and retrying indefinitely.
- **Resolution: Randomized Exponential Backoff.** Systems resolve livelocks by breaking symmetry (e.g., in Ethernet CSMA/CD, Raft leader election, or optimistic database transaction retries) by introducing random jitter into the retry timer:
  $$\text{Wait\_Time} = 2^{\text{retry}} \times \text{Base\_Delay} + \text{Random\_Jitter}$$

---

#### 3. Starvation: Perpetual Unfairness
A condition where a runnable process is perpetually denied necessary resources (CPU time, memory, or locks) because the scheduler or locking protocol continuously favors other processes.

- **Process State:** `TASK_RUNNING` (Sitting in the Ready queue) or waiting on a fair lock.
- **CPU Utilization:** **Normal / Healthy**. The system as a whole achieves high throughput.
- **Underlying Cause:** Unfair scheduling policies (such as strict Shortest Job First or priority-preemptive scheduling without aging).
- **Resolution: Aging.** The operating system dynamically elevates the effective priority of a process the longer it waits in the ready queue:
  $$\text{Priority}_{\text{effective}} = \text{Priority}_{\text{base}} + k \times (\text{Wait Time})$$
  Eventually, even the lowest-priority process becomes the highest-priority task in the system and runs.

---

### Architectural Comparison Matrix

| Dimension | Deadlock | Livelock | Starvation |
| :--- | :--- | :--- | :--- |
| **System Progress** | **Zero.** The affected subsystem is completely frozen. | **Zero.** Subsystem is frozen despite high activity. | **High.** Overall system throughput is healthy and productive. |
| **CPU Utilization** | **0%** (All involved threads sleep in wait queues). | **100%** (Threads spin actively on CPU cores). | Normal (Starved thread burns 0%, active threads burn CPU). |
| **Process State** | Blocked (`TASK_UNINTERRUPTIBLE`) | Running (`TASK_RUNNING`) | Ready (`TASK_RUNNING` in runqueue) |
| **Root Cause** | Circular dependency on exclusive resources. | Symmetrical reactive retry behavior. | Unfair or greedy scheduling algorithms. |
| **Remediation** | Lock ordering, abort & rollback, OOM killer. | **Randomized backoff / jitter**. | **Aging** (Priority boosting over wait time). |

---

### Summary

"Deadlock is a permanent cessation of progress where threads sleep at 0% CPU due to circular resource dependencies, resolvable by breaking one of Coffman's four conditions. Livelock involves active state changes where threads burn 100% CPU in symmetric retry loops without making progress, resolvable via randomized exponential backoff. Starvation is an unfairness defect where the overall system makes progress, but an individual thread is perpetually neglected, resolvable through dynamic priority aging."

---

### Python Verification: Livelock Detection & Randomized Backoff Recovery

The following executable Python script simulates two threads caught in a synchronized livelock (releasing and retrying locks in lockstep), and demonstrates how injecting randomized exponential backoff instantly breaks the livelock:

```python
"""
Livelock Simulation & Randomized Backoff Recovery
Demonstrates:
  1. Synchronous livelock where threads burn cycles without progress
  2. Breaking livelock symmetry via randomized backoff jitter
"""

import threading
import time
import random

class LivelockSimulation:
    def __init__(self, enable_jitter: bool = False):
        self.lock_a = threading.Lock()
        self.lock_b = threading.Lock()
        self.enable_jitter = enable_jitter
        self.completed = 0
        self.attempts = 0

    def worker_1(self):
        for _ in range(5):
            while True:
                self.attempts += 1
                # Try to acquire Lock A
                if self.lock_a.acquire(blocking=False):
                    time.sleep(0.001)  # Simulate small work
                    # Try to acquire Lock B
                    if self.lock_b.acquire(blocking=False):
                        self.completed += 1
                        self.lock_b.release()
                        self.lock_a.release()
                        break  # Step completed
                    else:
                        # Failed to get B; politely yield A to avoid deadlock!
                        self.lock_a.release()

                # Backoff delay
                if self.enable_jitter:
                    # Randomized jitter breaks lockstep symmetry!
                    time.sleep(random.uniform(0.001, 0.005))
                else:
                    # Fixed identical delay -> triggers LIVELOCK!
                    time.sleep(0.002)

    def worker_2(self):
        for _ in range(5):
            while True:
                self.attempts += 1
                # Try to acquire Lock B
                if self.lock_b.acquire(blocking=False):
                    time.sleep(0.001)
                    # Try to acquire Lock A
                    if self.lock_a.acquire(blocking=False):
                        self.completed += 1
                        self.lock_a.release()
                        self.lock_b.release()
                        break
                    else:
                        # Failed to get A; politely yield B to avoid deadlock!
                        self.lock_b.release()

                if self.enable_jitter:
                    time.sleep(random.uniform(0.001, 0.005))
                else:
                    time.sleep(0.002)


def main():
    print("=== Livelock vs. Randomized Backoff Simulation ===\n")

    # 1. Test WITH Randomized Jitter (Instant Resolution)
    print("--- 1. With Randomized Backoff (Symmetry Broken) ---")
    sim_clean = LivelockSimulation(enable_jitter=True)
    t1 = threading.Thread(target=sim_clean.worker_1)
    t2 = threading.Thread(target=sim_clean.worker_2)

    start = time.perf_counter()
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    elapsed = time.perf_counter() - start

    print(f"Tasks Completed: {sim_clean.completed}/10")
    print(f"Total Attempts:  {sim_clean.attempts}")
    print(f"Time Taken:      {elapsed:.4f} seconds")
    print("Result: Randomized backoff broke the symmetry immediately!")

    # 2. Test Without Jitter (Demonstrates high contention / livelock thrashing)
    print("\n--- 2. Without Jitter (Symmetric Retries Cause Heavy Collisions) ---")
    sim_busy = LivelockSimulation(enable_jitter=False)
    t1 = threading.Thread(target=sim_busy.worker_1)
    t2 = threading.Thread(target=sim_busy.worker_2)
    start = time.perf_counter()
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    elapsed = time.perf_counter() - start

    print(f"Tasks Completed: {sim_busy.completed}/10")
    print(f"Total Attempts:  {sim_busy.attempts} (Significant retry thrashing observed)")
    print(f"Time Taken:      {elapsed:.4f} seconds")

if __name__ == "__main__":
    main()
```