---
id: 11-spinlock-vs-mutex
title: "Spinlock vs. Mutex: Busy-Waiting vs. Sleeping & Multi-Core Tradeoffs"
description: "Understand when polling a lock in a CPU loop (busy-waiting) is cheaper than paying the latency of putting a thread to sleep and context switching."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between a spinlock and a mutex? Given that both enforce mutual exclusion, when is busy-waiting faster than sleeping, and why must interrupt handlers NEVER use mutexes?"

Both **Spinlocks** and **Mutexes** solve the same fundamental problem: protecting a critical section from concurrent race conditions. 

However, they handle lock contention through diametrically opposed strategies:
- A **Spinlock** keeps the waiting thread in the `TASK_RUNNING` state, executing a tight polling loop on the CPU hardware until the lock is freed (**Busy-Waiting**).
- A **Mutex** yields the CPU, transitioning the waiting thread into the `TASK_UNINTERRUPTIBLE` state and putting it to sleep via the OS scheduler (**Blocking/Sleeping**).

---

### The ELI5 Analogy: The Restroom Queue

Imagine waiting for a single-occupancy restroom at a bustling airport terminal:
- **The Spinlock (Jiggling the Door Handle):** You stand directly outside the door. Every second, you jiggle the brass handle. You are burning calories and pacing back and forth, but the exact microsecond the person inside exits, you walk in immediately with **zero delay**.
- **The Mutex (Taking a Pager to the Lounge):** You take an electronic pager from the attendant, walk 5 minutes over to a lounge bench, and go to sleep. When the restroom opens, the attendant buzzes your pager, you wake up, gather your luggage, and walk 5 minutes back to the door.

#### When Which Strategy Wins:
- If the person inside is merely washing their hands (**Short Critical Section**, e.g., 5 seconds), going to sleep was a terrible decision: by the time you sat down on the bench, the restroom was already empty.
- If the person inside is taking a 30-minute shower (**Long Critical Section**), standing at the door jiggling the handle 1,800 times is a massive, exhausting waste of energy.

---

### Deep Dive: Architectural Mechanics

```
1. MUTEX LOCK CONTENTION (Heavyweight OS Context Switch Path):
Thread B calls mutex_lock() ──> Already Locked!
  ├──> CPU switches to Kernel Mode (Ring 0)
  ├──> Thread B state set to TASK_UNINTERRUPTIBLE
  ├──> Thread B registers saved to TCB/stack
  ├──> Kernel CFS Scheduler invokes pick_next_task()
  └──> Context switch to Thread C (~1.5 to 3.0 µs)
  [When unlocked: Second Context Switch to wake up Thread B]


2. SPINLOCK CONTENTION (Zero Context Switch Hardware Path):
Thread B calls spin_lock() ──> Already Locked!
  ├──> Thread B remains in User/Kernel Mode in TASK_RUNNING
  ├──> Executes tight CPU loop: while (test_and_set(&lock)) { _mm_pause(); }
  ├──> Burns 100% CPU on that core
  └──> Acquires lock the EXACT cycle it is freed (~5 to 10 ns)
```

---

### The Mathematical Break-Even Formula

The definitive engineering rule for choosing between a spinlock and a mutex is governed by the relation:

$$T_{\text{wait}} < 2 \times T_{\text{context\_switch}}$$

- If performing a context switch takes $T_{\text{cs}} \approx 2\ \mu\text{s}$, putting a thread to sleep and subsequently waking it back up incurs a round-trip latency penalty of:
  $$2 \times T_{\text{cs}} \approx 4\ \mu\text{s}$$
- **If the critical section takes 200 nanoseconds** (e.g., updating a pointer or incrementing an atomic counter), a mutex incurs a **$20\times$ latency penalty** just to manage the sleep/wakeup transitions! A spinlock is vastly superior.
- **If the critical section involves disk I/O or network calls** ($> 1\text{ ms}$), a spinlock will burn millions of wasted CPU cycles, starving other productive workloads.

---

### Hardware Internals: TTAS and the `PAUSE` Instruction

Naive spinlocks implemented with raw atomic `test_and_set` or `compare_and_swap` suffer from severe hardware performance degradation:

#### The Cache Invalidation Storm
Every atomic write instruction (`LOCK CMPXCHG` on x86) asserts an exclusive ownership claim on the memory bus, invalidating the L1/L2 cache line across **all other CPU cores** via the MESI cache coherency protocol. If 8 cores spin simultaneously using atomic writes, the interconnect saturates with cache invalidation traffic.

#### The Remedy: Test and Test-and-Set (TTAS) with `PAUSE`
```c
void spin_lock(spinlock_t *lock) {
    while (1) {
        // Step 1: Read locally from shared L1 cache without bus writes
        if (*lock == UNLOCKED) {
            // Step 2: Only attempt atomic bus-locked write when lock appears free
            if (__sync_lock_test_and_set(lock, LOCKED) == UNLOCKED) {
                return; // Lock acquired!
            }
        }
        // Step 3: Emit CPU PAUSE instruction
        __builtin_ia32_pause(); 
    }
}
```
The **`PAUSE` instruction** (x86) introduces a minor delay (10–140 cycles) in the core's pipeline. It prevents pipeline execution replays and drastically lowers core power consumption during busy waiting.

---

### Why Interrupt Handlers (ISRs) MUST Use Spinlocks

A paramount rule of OS kernel engineering: **An Interrupt Service Routine must NEVER sleep.**

1. An interrupt handler executes asynchronously in **Interrupt Context** (outside of any user process or `task_struct`).
2. Because it has no schedulable backing process structure, **it cannot be suspended or put to sleep by the scheduler**.
3. If an ISR attempts to acquire a sleeping mutex (`mutex_lock()`) that is currently held, the kernel has no thread context to switch away from, triggering an immediate **Kernel Panic / Blue Screen of Death**.
4. Consequently, synchronization inside hardware and software interrupt handlers is strictly restricted to spinlocks (e.g., `spin_lock_irqsave()`).

---

### Single-Core vs. Multi-Core Reality

- **On a Single-Core (Uniprocessor) System:** Spinlocks with preemption disabled are lethal. If Thread B spins on the only CPU core, Thread A (the lock holder) cannot run to release the lock! The system locks up in a permanent freeze. (On single-core kernels, spinlocks are compiled away into simple interrupt-disabling macros).
- **On Multi-Core Systems:** Thread A holds the lock on Core 0 while Thread B spins harmlessly on Core 1, allowing true parallel handoff.

---

### The Modern Compromise: Hybrid (Adaptive) Mutexes

Modern production mutexes (such as glibc's `pthread_mutex_t` configured with `PTHREAD_MUTEX_ADAPTIVE_NP`) combine both strategies:
1. When contention occurs, the thread checks if the lock owner is currently running on another CPU core.
2. If yes, the mutex acts as a **spinlock for a brief threshold** (e.g., 100 iterations), hoping the owner exits quickly.
3. If the lock is not freed within that window, it gracefully falls back to a **sleeping mutex**, invoking the Linux **`futex`** system call to put the thread to sleep.

---

### Summary

"A spinlock keeps a waiting thread in an active CPU polling loop, achieving near-instantaneous lock acquisition at the expense of 100% CPU utilization. A mutex puts the thread to sleep via the OS scheduler, preserving CPU cycles at the cost of two expensive context switches. Spinlocks are ideal for extremely short critical sections and mandatory inside interrupt handlers where sleeping is forbidden, while mutexes are preferred for long critical sections and general user-space programming."

---

### Python Verification: Spinlock vs. Mutex Benchmark

The following executable Python script simulates and benchmarks a busy-wait spinlock versus an OS-managed sleeping lock across short and long critical sections:

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