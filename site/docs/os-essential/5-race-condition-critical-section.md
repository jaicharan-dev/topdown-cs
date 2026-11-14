---
id: 5-race-condition-critical-section
title: "Race Conditions & The Critical Section Problem"
description: "One increment that is really three steps, and the three rules any fix must satisfy"

sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a race condition? What is the critical section problem, what three formal requirements must any solution satisfy, and why do pure software algorithms fail on modern hardware?"

---

### Picture it

Two people are updating the same attendance sheet, which currently reads 10.

Each of them does three separate actions: read the number, add one in their head, write the new number down. If one finishes completely before the other starts, the sheet ends at 12, which is right.

But suppose both read 10, both think 11, and both write 11. Two people were added and the sheet says 11. Nothing was corrupted and nobody made an arithmetic mistake. The update was simply not a single action, and they interleaved in the gap.

The fix is a rule about the sheet, not about the arithmetic: only one person may be at the sheet at a time. And writing that rule down carefully is harder than it sounds. It must genuinely exclude two people at once, it must not leave the sheet unused while people are queuing for it, and nobody should be left waiting at the sheet forever while others keep nipping in front.

---

### The proper terms

#### Race condition

A **race condition** is when the result depends on the **relative timing** of concurrent operations rather than on the program's logic alone. The classic case is a **read-modify-write** sequence such as `count++`, which compiles to a load, an add and a store. A context switch between any two of those steps lets another thread interleave, and one update is lost.

The defining property is that the code is correct in isolation and incorrect only under certain interleavings, which is why these bugs are intermittent and hard to reproduce.

#### The critical section problem

A **critical section** is the region of code that accesses shared data. The **critical section problem** is designing an **entry section** and an **exit section** around it so that concurrent processes cooperate safely. The remaining code is the remainder section.

#### The three requirements

Any correct solution must satisfy all three.

**Mutual exclusion.** If one process is in its critical section, no other may be in its own critical section at the same time. This is the safety property.

**Progress.** If no process is in its critical section and some processes want to enter, only those not in their remainder section may take part in the decision, and the choice cannot be postponed indefinitely. Informally: a free resource must not sit idle while someone is waiting for it.

**Bounded waiting.** There must be a limit on how many times other processes may enter their critical sections after a process has requested entry and before it is granted. This is what rules out **starvation**.

Mutual exclusion alone is easy, which is why the other two are the interesting ones. A lock that nobody can ever acquire provides perfect mutual exclusion and fails progress.

#### Why software-only algorithms fail today

**Peterson's algorithm** solves the problem for two processes using only shared variables, a `flag` array and a `turn` variable. It is correct on the abstract model, and it does not work reliably on real hardware for two reasons.

**Instruction reordering.** Compilers and **out-of-order** CPUs reorder memory operations that look independent. Peterson's algorithm depends on `flag` being visible before `turn` is read, and nothing in the source enforces that ordering.

**Cache coherence and visibility.** Each core has its own cache and **store buffer**. A write may sit in the store buffer, visible to its own core but not yet to others, so a process can read a stale `flag` and both enter.

The fix is a **memory barrier**, or fence, which forces ordering and visibility at that point. Once you need a barrier, you are no longer in pure software: the solution depends on a hardware guarantee.

In practice the real mechanism is an **atomic instruction**: **test-and-set**, **compare-and-swap** or **fetch-and-add**. These perform read-modify-write as one indivisible operation that the hardware guarantees cannot be interleaved, which is exactly what the attendance sheet lacked. Locks, semaphores and mutexes are all built from these.

#### Disabling interrupts

On a single processor, disabling interrupts prevents preemption and so provides mutual exclusion. It is used inside kernels for very short sections. It does not work on multiprocessors, since another core keeps running, and it is a **privileged** operation unavailable to user code.

---

### In code

```c
// The race, in full
int count = 10;

void *worker(void *arg) {
    for (int i = 0; i < 100000; i++) {
        count++;            // load, add, store: three steps, not one
    }
    return NULL;
}
// Two threads running this rarely produce 200010.
```

```text
One interleaving that loses an update:

  Thread A            Thread B           count
  load  -> 10                             10
                      load  -> 10         10
  add   -> 11                             10
                      add   -> 11         10
  store 11                                11
                      store 11            11     <- two increments, one effect
```

```c
// The fix: an atomic instruction the hardware cannot interleave
__atomic_fetch_add(&count, 1, __ATOMIC_SEQ_CST);

// Or a lock, which is itself built from such an instruction
pthread_mutex_lock(&m);
count++;                    // entry section / critical section / exit section
pthread_mutex_unlock(&m);
```

---

### What they ask next

**"Is `count++` atomic in any language?"**
Not by default in C, C++ or Java. It is a read-modify-write sequence. Java's `AtomicInteger` and C++'s `std::atomic` provide genuinely atomic versions built on hardware instructions.

**"Does `volatile` solve a race condition?"**
No. In Java it guarantees **visibility** and ordering but not atomicity, so `count++` on a volatile is still racy. In C and C++ it means even less, having nothing to do with threads.

**"What is the difference between a race condition and a data race?"**
A **data race** is the narrower, formally defined case of two unsynchronised accesses to the same location with at least one write. A race condition is the broader notion of behaviour depending on timing, and can exist even in code with no data race, for example a check-then-act sequence where each step is individually synchronised.

**"Is Peterson's algorithm useless then?"**
Not conceptually. It proves the problem is solvable with only shared memory, and it is still the clearest illustration of the three requirements. It simply needs memory barriers to run correctly on modern hardware.

**"What is a TOCTOU bug?"**
Time-of-check to time-of-use: validating a condition and acting on it as separate steps, so the condition can change in between. Checking that a file exists and then opening it is the standard example, and it is a race condition with security consequences.

**The common wrong answer** is "a race condition means two threads run at the same time". Concurrency alone is harmless. The problem is unsynchronised access to shared mutable state, and it happens on a single core too, since a context switch mid-sequence produces the same interleaving.

---

### Say this in the interview

*"A race condition is when the outcome depends on the relative timing of concurrent operations rather than the program's logic. The classic case is a read-modify-write such as count++, which is a load, an add and a store, so an interleaving between those steps loses an update.*

*A critical section is the code that accesses shared data, and the critical section problem is designing the entry section and exit section around it. Any solution must satisfy three requirements: mutual exclusion, so at most one process is in its critical section; progress, so a free resource is not left idle while processes wait to enter; and bounded waiting, so there is a limit on how many times others may enter first, which prevents starvation.*

*Pure software solutions like Peterson's algorithm fail on modern hardware for two reasons. Compilers and out-of-order CPUs reorder memory operations the algorithm depends on being ordered, and per-core caches and store buffers mean a write may not be visible to other cores immediately, so both processes can read a stale flag and enter. Correcting it requires memory barriers, at which point the solution depends on hardware anyway.*

*In practice synchronisation is built on atomic instructions such as test-and-set, compare-and-swap or fetch-and-add, which perform read-modify-write indivisibly. Disabling interrupts also gives mutual exclusion but only on a uniprocessor, and it is privileged."*
