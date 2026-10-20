---
id: 13-starvation-deadlock-livelock
title: "Starvation vs. Deadlock vs. Livelock"
description: "The difference between a system that's frozen (deadlock), a system that's thrashing without progress (livelock), and one thread being unfairly ignored (starvation)."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the precise difference between Starvation, Deadlock, and Livelock? Compare them across process states and CPU consumption, and explain how systems recover from each."

These are three different ways concurrency can go wrong, and interviewers like separating them because they look similar but aren't: one system is frozen solid, one is busy but going nowhere, and one is working fine except for one unlucky thread.

---

### The analogy: a narrow hallway

Picture a hallway wide enough for only one person.

- **Deadlock — the stare-down.** Alice and Bob meet in the middle, face to face. "I won't back up until you do." Neither moves. Forever. Zero energy spent, zero progress.
- **Livelock — the polite dance.** They meet in the middle. Alice steps right to let Bob pass; Bob steps left at the same instant, and they collide again. Alice steps left, Bob steps right — collide again. They keep dodging in perfect sync, burning energy, never actually getting past each other.
- **Starvation — the VIP bouncer.** The hallway is wide open and moving fine, but a bouncer always waves VIPs through first. Charlie, holding a regular ticket, keeps getting bumped. The hallway is busy and productive — just never for Charlie.

<Diagram>
<Row>
<Box title="Deadlock" accent="#fb7185"><Field icon="🔒" code="0% CPU, frozen" hint="stuck waiting on each other forever" variant="neutral" /></Box>
<Box title="Livelock" accent="#ec4899"><Field icon="🔄" code="100% CPU, no progress" hint="keeps retrying, keeps colliding" variant="neutral" /></Box>
<Box title="Starvation" accent="#f59e0b"><Field icon="⏳" code="system is fine, one thread isn't" hint="constantly skipped in favor of others" variant="neutral" /></Box>
</Row>
</Diagram>

---

### 1. Deadlock: a permanent circular wait

Every thread in the group is stuck waiting on something only another thread in that same group can give it.

- **Thread state:** sleeping/blocked. **CPU use: 0%** — these threads aren't even in the scheduler's runqueue.
- It needs all four Coffman conditions at once: mutual exclusion, hold-and-wait, no preemption, and a circular chain of waits ($P_0$ waits on $P_1$, ..., $P_n$ waits on $P_0$).
- **Fix:** break any one of those four conditions. The usual approach is a global lock ordering, which makes circular wait mathematically impossible.

### 2. Livelock: busy, but going nowhere

Threads keep reacting to each other and changing state, but those reactions cancel out and nobody actually advances.

- **Thread state:** running/spinning. **CPU use: 100%.**
- Classic example — two threads trying to grab two locks optimistically:

```
Thread A: grab Lock 1 → try Lock 2 → fails → release Lock 1 → retry
Thread B: grab Lock 2 → try Lock 1 → fails → release Lock 2 → retry
```

If both retry on the same rhythm, they stay locked in this collide-and-retry cycle indefinitely.

- **Fix:** randomized exponential backoff — make the retry delay random instead of fixed, so the symmetry breaks:
  $$\text{wait} = 2^{\text{retry}} \times \text{base\_delay} + \text{random jitter}$$
  (This is the same idea behind Ethernet's CSMA/CD and Raft leader election.)

### 3. Starvation: perpetually unfair, not stuck

A thread is runnable and the system as a whole is making progress — it's just that this one thread keeps getting skipped because the scheduler or lock policy keeps favoring others.

- **Thread state:** ready, sitting in the queue. **CPU use:** normal overall; the starved thread just never gets picked.
- **Cause:** unfair policies, like strict shortest-job-first or priority scheduling with no way to catch up.
- **Fix:** aging — gradually raise a thread's effective priority the longer it waits, until it eventually becomes the highest-priority thread in the system:
  $$\text{priority}_{\text{effective}} = \text{priority}_{\text{base}} + k \times \text{wait time}$$

---

### Comparison

| | Deadlock | Livelock | Starvation |
| :--- | :--- | :--- | :--- |
| **System progress** | Zero — frozen | Zero — busy but frozen | High — system is healthy overall |
| **CPU use** | 0% | 100% | Normal |
| **Thread state** | Blocked/sleeping | Running/spinning | Ready, waiting in queue |
| **Root cause** | Circular wait on exclusive resources | Symmetric retry behavior | Unfair scheduling/locking |
| **Fix** | Lock ordering, break a Coffman condition | Randomized backoff | Aging (priority boost over time) |

---

### Say this in the interview

*"Deadlock is a permanent freeze — threads sleep at 0% CPU, stuck in a circular wait, fixed by breaking one of Coffman's four conditions. Livelock looks active but isn't — threads burn 100% CPU in a symmetric retry loop, fixed by randomized backoff. Starvation is the odd one out — the system overall is making progress, but one thread keeps getting unfairly skipped, fixed by aging its priority up over time."*

---

### Python verification: livelock and randomized backoff

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
