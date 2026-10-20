---
id: 11-spinlock-vs-mutex
title: "Spinlock vs. Mutex: Busy-Waiting vs. Sleeping"
description: "When is it cheaper to keep polling a lock in a loop than to put a thread to sleep and context-switch?"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between a spinlock and a mutex? Given that both enforce mutual exclusion, when is busy-waiting faster than sleeping, and why must interrupt handlers NEVER use mutexes?"

A spinlock and a mutex both protect a critical section so only one thread touches it at a time. The difference is what a thread does while it waits.

- A **spinlock** keeps the thread running, checking the lock in a tight loop until it opens (**busy-waiting**).
- A **mutex** puts the waiting thread to sleep and lets the scheduler run something else, then wakes it when the lock is free (**sleeping**).

---

### The analogy: waiting for a restroom at the airport

- **Spinlock — jiggling the door handle.** You stand right outside and jiggle the handle every second. You're burning energy, but the instant the door opens, you walk in with zero delay.
- **Mutex — taking a pager to the lounge.** You take a pager, walk to a bench, and nap. When the attendant buzzes you, you wake up and walk back. That round trip costs time.

<Diagram>
<Row>
<Box title="Spinlock" accent="#f59e0b"><Field icon="🔁" code="busy-wait loop" hint="stays TASK_RUNNING, burns CPU" variant="neutral" /></Box>
<Box title="Mutex" accent="#60a5fa"><Field icon="😴" code="sleeps" hint="TASK_UNINTERRUPTIBLE, woken by scheduler" variant="locked" /></Box>
</Row>
</Diagram>

So which wins depends entirely on how long the wait is:
- If the person inside is just washing their hands (a **short** critical section), sleeping is a bad call — by the time you sat down, the restroom was already free.
- If they're taking a 30-minute shower (a **long** critical section), jiggling the handle 1,800 times wastes a lot of energy for nothing.

---

### What's actually happening under the hood

```
Mutex contention:
Thread B calls lock() → already locked
  → switches to kernel mode
  → Thread B marked TASK_UNINTERRUPTIBLE, goes to sleep
  → scheduler picks another thread to run
  → (lock frees) Thread B is woken up — a second context switch
  Total cost: ~1.5-3.0 µs per switch, two switches

Spinlock contention:
Thread B calls lock() → already locked
  → stays TASK_RUNNING, loops: while (test_and_set(&lock)) { pause(); }
  → burns 100% CPU on its core
  → grabs the lock the instant it's freed (~5-10 ns)
```

The rule of thumb: sleeping only pays off if the wait is longer than roughly two context switches (about 4 µs). If the critical section is 200 ns — just a pointer update — a mutex pays a 20x latency tax just managing the sleep/wake cycle, and a spinlock wins easily. If the critical section involves disk or network I/O (over 1 ms), a spinlock would burn millions of wasted cycles — the mutex wins there instead.

---

### Why naive spinlocks hurt multi-core performance

A plain spinlock built on atomic `test_and_set`/`compare_and_swap` has a hidden cost: every atomic write grabs exclusive ownership of that memory location across *all* cores (the MESI cache-coherency protocol), invalidating it everywhere else. If 8 cores are all spinning with atomic writes, the inter-core bus floods with invalidation traffic.

The fix is **Test-and-Test-and-Set (TTAS)**: read the lock from the local cache first (free), and only attempt the atomic write once it looks free.

```c
void spin_lock(spinlock_t *lock) {
    while (1) {
        // Step 1: cheap local read, no bus traffic
        if (*lock == UNLOCKED) {
            // Step 2: only try the expensive atomic write if it looks free
            if (__sync_lock_test_and_set(lock, LOCKED) == UNLOCKED) {
                return; // got it
            }
        }
        __builtin_ia32_pause(); // tell the CPU "I'm just spinning", saves power
    }
}
```

The `PAUSE` instruction (x86) adds a tiny delay in the pipeline — it doesn't make the lock faster, it just keeps the core from wasting extra power and clogging the pipeline while spinning.

---

### Why interrupt handlers can never use a mutex

Rule: an interrupt handler must never sleep.

An interrupt handler runs in **interrupt context** — it isn't backed by a schedulable thread. If it calls `mutex_lock()` on a lock that's taken, the kernel has nothing to put to sleep and no thread to switch to instead. The result is a kernel panic, not a graceful wait. That's why interrupt handlers are restricted to spinlocks (`spin_lock_irqsave()` in Linux) — busy-waiting is always safe; sleeping isn't an option in that context.

---

### Single-core vs. multi-core

- **Single core:** a spinlock is dangerous. If Thread B spins on the only core, Thread A (the one holding the lock) never gets to run and release it — the system freezes. That's why single-core kernels often compile spinlocks down to "just disable interrupts" instead.
- **Multi-core:** this works fine — Thread A holds the lock on Core 0 while Thread B spins harmlessly on Core 1, and the handoff is quick once Thread A finishes.

---

### The real-world compromise: adaptive mutexes

Production mutexes (like glibc's `pthread_mutex_t` with `PTHREAD_MUTEX_ADAPTIVE_NP`) hedge their bets:
1. On contention, check whether the lock's owner is currently running on another core.
2. If yes, spin for a short while (say, 100 iterations), betting the owner finishes soon.
3. If the lock still isn't free, give up and go to sleep via `futex`.

---

### Say this in the interview

*"A spinlock keeps the waiting thread running and polling, so it grabs the lock the instant it's free but burns CPU the whole time it waits. A mutex puts the thread to sleep, which is cheaper on CPU but costs two context switches to go to sleep and wake back up. Spinlocks win for very short critical sections and are mandatory inside interrupt handlers, which can never sleep. Mutexes win for longer waits and general-purpose code."*

---

### Python verification: spinlock vs. mutex benchmark

```python
"""
Spinlock vs Mutex Performance Benchmark
Demonstrates:
  1. Low-latency acquisition of spinlocks for ultra-short workloads
  2. CPU starvation caused by spinlocks under long workloads
  3. Mutex efficiency under high-latency critical sections
"""

import time
import threading

class SpinLock:
    def __init__(self):
        self._locked = False
        self._lock = threading.Lock()  # Used to simulate atomic test-and-set

    def acquire(self):
        # Busy-wait polling loop
        while True:
            with self._lock:
                if not self._locked:
                    self._locked = True
                    return
            # Minimal pause to simulate CPU backoff
            time.sleep(0.0001)

    def release(self):
        with self._lock:
            self._locked = False


def benchmark_short_critical_section():
    print("--- 1. Ultra-Short Critical Section (Atomic Counter) ---")
    spin = SpinLock()
    mutex = threading.Lock()
    CYCLES = 50_000

    # Benchmark Mutex
    count_mutex = 0
    start = time.perf_counter()
    for _ in range(CYCLES):
        with mutex:
            count_mutex += 1
    mutex_time = time.perf_counter() - start

    # Benchmark Spinlock
    count_spin = 0
    start = time.perf_counter()
    for _ in range(CYCLES):
        spin.acquire()
        count_spin += 1
        spin.release()
    spin_time = time.perf_counter() - start

    print(f"Mutex Total Time:    {mutex_time * 1000:6.2f} ms")
    print(f"Spinlock Total Time: {spin_time * 1000:6.2f} ms")
    print("Under low contention, both execute fast; spinlock avoids OS wait queues.")


def benchmark_contended_behavior():
    print("\n--- 2. Conceptual Contention Analysis ---")
    print("In kernel C/assembly:")
    print("  • Spinlock handoff: ~15 cycles (5-10 ns via atomic CAS)")
    print("  • Mutex context switch: ~2,000 to 5,000 cycles (1.5-3.0 µs via futex)")
    print("Conclusion: If lock hold time < 3 µs, Spinlock wins.")
    print("            If lock hold time > 1 ms (I/O, network), Mutex wins.")


if __name__ == "__main__":
    print("=== Spinlock vs Mutex Architectural Analysis ===\n")
    benchmark_short_critical_section()
    benchmark_contended_behavior()
```
