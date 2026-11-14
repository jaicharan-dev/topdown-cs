---
id: 6-mutex-vs-semaphore
title: "Mutex vs. Semaphore: Concurrency Primitives & Tradeoffs"
description: "A key that belongs to whoever took it against a counter anyone may signal"

sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a mutex and a semaphore? What is a spinlock, how does ownership impact priority inheritance, and when do you use each?"

---

### Picture it

Two different problems that look alike.

**One toilet with one key.** You take the key, you use the room, you return the key. The key is **yours** while you hold it: nobody else can hand it back on your behalf, and it makes no sense for someone who never took it to return it. The purpose is to keep everyone else out while you are inside.

**A car park with forty spaces and a counter at the barrier.** The counter starts at forty and drops as cars enter. At zero, arrivals wait. The counter is not owned by anybody. A driver leaving increments it, and crucially, so could an attendant who never parked at all. The purpose is to track how much of a resource remains.

The second difference is subtler and more useful. The key is about **protecting** something. The counter can also be about **telling** somebody that something is ready: a chef putting a meal on the pass rings a bell, and a waiter waiting on that bell collects it. The person who signals is deliberately not the person who waits.

---

### The proper terms

#### Mutex

A **mutex**, short for **mutual exclusion**, is a lock with exactly two states, locked and unlocked, and with **ownership**. The thread that locks it is its owner and is the only one permitted to unlock it. Unlocking a mutex you do not own is an error.

Its purpose is to protect a **critical section**, and its operations are **lock** and **unlock**.

#### Semaphore

A **semaphore** is an integer counter with two atomic operations: **wait**, historically **P**, which decrements and blocks if the result would be negative, and **signal**, historically **V**, which increments and wakes a waiter.

A **counting semaphore** is initialised to the number of available instances of a resource. A **binary semaphore** is initialised to 1 and so permits one holder at a time.

A semaphore has no ownership. Any thread may signal it, which is what makes it suitable for **signalling** between threads as well as for limiting concurrent access.

#### Why ownership matters: priority inversion

**Priority inversion** is when a high-priority task is blocked by a low-priority one. A low-priority task holds a lock, a high-priority task needs it and blocks, and then a medium-priority task preempts the low-priority one. The high-priority task is now indirectly waiting on the medium one, which may run for a long time. This is what delayed the Mars Pathfinder in 1997 and caused repeated system resets.

The standard fix is **priority inheritance**: while a high-priority task waits on a lock, the holder temporarily **inherits** that priority, so it cannot be preempted by medium-priority work and releases the lock promptly.

This is only possible with **ownership**. The system has to know which thread holds the lock in order to boost it. A semaphore does not record a holder, so priority inheritance cannot be implemented for one. That is the single most important practical consequence of the ownership difference, and it is why real-time systems use mutexes for protection and semaphores only for signalling.

The alternative mechanism is the priority ceiling protocol, where a lock carries a ceiling priority and any holder runs at it.

#### Spinlocks

A **spinlock** is a lock whose waiter **busy-waits**, repeatedly testing the lock in a loop rather than blocking. It burns CPU while waiting but avoids the cost of a context switch, which is roughly a microsecond.

So the rule is about expected wait time. If the critical section is shorter than a context switch, spinning wins; if it is longer, blocking wins. Spinlocks are used inside kernels for very short sections, and they require more than one core to make sense: on a single core, spinning waits for a holder that cannot run until you stop spinning.

An adaptive mutex spins briefly and then blocks, getting both behaviours.

#### Choosing

Use a **mutex** to protect shared data, which is the common case. Use a **counting semaphore** to limit concurrent access to a pool of N resources, such as a connection pool. Use a **binary semaphore** or a **condition variable** for signalling between threads, such as the producer-consumer handoff. Use a **spinlock** only for extremely short critical sections inside kernel code.

---

### In code

```c
// Mutex: protecting shared data. Lock and unlock in the same thread.
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

void *worker(void *arg) {
    pthread_mutex_lock(&m);
    shared_counter++;                 // critical section
    pthread_mutex_unlock(&m);         // only this thread may unlock
    return NULL;
}
```

```c
// Counting semaphore: at most 3 threads inside at once
sem_t pool;
sem_init(&pool, 0, 3);                // three permits

void *use_connection(void *arg) {
    sem_wait(&pool);                  // P: take a permit, block if none
    /* use one of the three connections */
    sem_post(&pool);                  // V: return it
    return NULL;
}
```

```c
// Binary semaphore as a signal: different threads wait and post,
// which a mutex could not legally express
sem_t ready;
sem_init(&ready, 0, 0);               // starts at zero: nothing ready yet

void *producer(void *arg) {
    prepare_item();
    sem_post(&ready);                 // signal: this thread never waited
    return NULL;
}

void *consumer(void *arg) {
    sem_wait(&ready);                 // wait: a different thread signals it
    consume_item();
    return NULL;
}
```

The third example is the one that cannot be rewritten with a mutex. The consumer would have to unlock a lock the producer owned.

---

### What they ask next

**"Can a binary semaphore replace a mutex?"**
Functionally for exclusion, yes, but it loses ownership, and therefore loses priority inheritance and the error check for unlocking from the wrong thread. For protecting data a mutex is the correct choice.

**"What happens if you unlock a mutex you do not own?"**
It is undefined behaviour in POSIX. An error-checking mutex returns `EPERM`; a normal one may corrupt its state. This check exists only because the mutex records an owner.

**"When does a spinlock beat a mutex?"**
When the expected wait is shorter than a context switch and there are multiple cores. Otherwise the spinning wastes more CPU than the switch would have cost.

**"What is a recursive mutex?"**
One the owning thread may lock repeatedly without deadlocking, with a count released by matching unlocks. It is useful when a locked function calls another that locks the same mutex, though it often signals that the locking design needs rethinking.

**"Is a semaphore's count ever negative?"**
Not in POSIX, where `sem_wait` blocks at zero. In the classical formulation the count goes negative and its magnitude is the number of waiting processes, which is a common exam convention.

**The common wrong answer** is "a mutex is a binary semaphore". Ownership is the difference, and priority inheritance is the concrete consequence to cite.

---

### Say this in the interview

*"A mutex, short for mutual exclusion, is a lock with two states and, crucially, ownership: the thread that locks it is the only one that may unlock it. Its purpose is to protect a critical section.*

*A semaphore is a counter with two atomic operations, wait, which decrements and blocks at zero, and signal, which increments and wakes a waiter. A counting semaphore limits access to N instances of a resource; a binary semaphore starts at 1. A semaphore has no owner, so any thread may signal it, which makes it suitable for signalling between threads as well as for limiting concurrency.*

*Ownership matters because of priority inversion, where a high-priority task blocks on a lock held by a low-priority task that is then preempted by a medium-priority one. The fix is priority inheritance, where the holder temporarily inherits the waiter's priority. That requires knowing who holds the lock, so it is possible with a mutex and impossible with a semaphore. The Mars Pathfinder resets were a famous case.*

*A spinlock busy-waits instead of blocking, trading CPU for avoiding a context switch, so it suits critical sections shorter than a switch and only makes sense on multiple cores.*

*I use a mutex to protect data, a counting semaphore for a resource pool, a binary semaphore or condition variable for signalling, and a spinlock only for very short kernel-level sections."*
