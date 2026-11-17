---
id: 11-spinlock-vs-mutex
title: "Spinlock vs Mutex"
description: "Waiting awake or waiting asleep, decided by whether the wait is shorter than the cost of going to sleep"

sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between a spinlock and a mutex? Given that both enforce mutual exclusion, when is busy-waiting faster than sleeping, and why must interrupt handlers NEVER use mutexes?"

---

### Picture it

You need a meeting room that someone else is using. Two ways to wait.

**Stand outside the door and keep trying the handle.** You are doing nothing useful, but the instant it opens you are in. No arrangements, no delay.

**Go back to your desk and ask them to call you when it is free.** You get other work done while you wait, but there is a cost: packing up, walking back, being called, walking over again. If the room frees up **ten seconds** after you leave, you have spent two minutes of walking to avoid ten seconds of standing.

So the choice is not about which is nicer. **It is arithmetic.** If the wait is shorter than the round trip to your desk, stand at the door. If it is longer, go and sit down. Everything else about spinlocks and mutexes follows from that single comparison.

**One precondition is easy to miss.** Standing at the door only works if the person inside **can still finish and leave**. If there were only one person who could do any work at all, and that person is now you standing in the corridor, the room will never open. You would be waiting for someone you have just prevented from working.

**And now the case where one choice is not merely slower but impossible.**

A fire alarm goes off. You are not a person with a desk any more; you are **an alarm response**, and an alarm response **has no desk to go back to**. There is nothing to pack up, nobody to call you, no state to resume from. If the alarm response tries to "wait at its desk", there is no desk, and the building is left with no one responding.

Worse: the alarm interrupted **the very person who is in the room**. They cannot come out and release it, because they are standing in the corridor dealing with the alarm. The alarm response is waiting for a room that only the thing it interrupted can free.

---

### The proper terms

#### The architectural difference

Both enforce **mutual exclusion**. The difference is entirely in **what happens to a thread that cannot acquire the lock**.

**A spinlock** makes the waiter **busy-wait**: it loops on an atomic test, typically a **compare-and-swap** or **test-and-set**, never yielding the CPU. The thread stays in the **running** state, and the core is occupied doing nothing.

**A mutex** makes the waiter **sleep**: it is placed on a wait queue, its state becomes blocked, and the scheduler runs something else. When the holder releases the lock, the waiter is **woken** and becomes runnable again.

So the trade is stated in one line: **a spinlock spends CPU cycles, a mutex spends context switches.**

Everything downstream follows:

**A spinlock has no sleeping cost and no wakeup latency**, so it is acquired the instant the lock is free.

**A mutex frees the core** for other work, so nothing is wasted while waiting.

**A spinlock scales badly under contention**, because many cores hammer the same cache line.

**A mutex wastes nothing but pays twice**, once to sleep and once to wake.

#### When busy-waiting is faster

This is an arithmetic comparison, and giving the numbers is what makes the answer concrete.

**The cost of sleeping** is roughly **two context switches**, one to deschedule and one to wake, which is about 2 to 10 microseconds, plus the indirect cost of a **cold cache and TLB** afterwards.

**The cost of spinning** is the **hold time of the lock**, during which one core does nothing.

So:

**If the expected hold time is shorter than the cost of two context switches, spinning wins.** In practice that means critical sections of a few hundred nanoseconds up to about a microsecond: incrementing a counter, updating a list head, flipping a flag.

**If the hold time is longer, or unbounded, sleeping wins**, and by a wide margin. Anything that performs I/O, allocates memory, or waits on another lock must use a mutex.

There is also a precondition that is easy to forget: **spinning requires more than one core.** On a uniprocessor, the holder cannot run while you spin, so you are burning the very time slice in which it would have released the lock. Linux reflects this directly: on a non-SMP build, `spin_lock` reduces to **disabling preemption** and nothing else.

The practical compromise is the **adaptive mutex**, and modern implementations all use it. `pthread_mutex_lock` **spins briefly** and only then falls back to a **`futex`** system call to sleep, so uncontended and briefly contended acquisitions never enter the kernel at all. Linux goes further with **adaptive spinning**: it spins **only while the lock holder is observed to be running on another core**, and sleeps immediately if the holder has been descheduled, since no amount of spinning will help then.

#### Why interrupt handlers must never use a mutex

Three reasons, and the first is the decisive one.

**An interrupt handler cannot sleep, because there is nothing to put to sleep.**

A handler runs in **interrupt context**, not process context. It has **no `task_struct` of its own**, no scheduling entity, and borrows the kernel stack of whatever was interrupted. Sleeping means saving a thread's state and scheduling another, and here **there is no thread whose state could be saved or later resumed**. Calling `schedule()` from interrupt context is a kernel bug, and Linux reports it as **`BUG: scheduling while atomic`**.

**It would self-deadlock.**

Suppose a thread holds mutex M and is interrupted on the same CPU. The handler tries to acquire M and blocks. The holder can only release M by continuing to run, but it cannot, because the handler is executing on its stack and will not return until it acquires the lock. **The handler is waiting for the very thing it interrupted**, on one CPU, with no possible intervention.

**It would destroy latency.**

Handlers run with that interrupt line masked, and often with interrupts disabled entirely. Blocking there stalls the device, delays every other interrupt, and can lose data in hardware buffers. Interrupt handlers must be short and bounded, and sleeping is neither.

So interrupt context uses **spinlocks only**. And when a lock is shared between an interrupt handler and ordinary process context, the process-context side must use **`spin_lock_irqsave()`**, which disables interrupts on that CPU while holding the lock. Without that, an interrupt arriving **on the same CPU** while process context holds the lock would produce exactly the self-deadlock above.

#### The rules that follow, and the implementations

**While holding a spinlock you may not sleep, at all.** No `kmalloc(GFP_KERNEL)`, which may wait for memory reclaim; no `copy_to_user`, which may page fault; no acquiring a mutex; no `msleep`. Each of these is a real bug and Linux's `might_sleep()` checks catch them in debug builds.

**Preemption is disabled** while a spinlock is held, which Linux does automatically, because being preempted while holding one would leave every spinner burning CPU for a full time slice.

**Naive spinlocks bounce cache lines.** A plain test-and-set has every waiting core repeatedly writing the same cache line, so it ping-pongs between caches and contention makes things dramatically worse rather than merely slower. Real implementations use **ticket locks** or queued spinlocks, `qspinlock` in Linux, based on **MCS** locks, where each waiter spins on **its own** cache line and is granted the lock in **FIFO order**. That fixes both the bouncing and the fairness.

The usual mapping:

**Spinlock**: very short critical sections, interrupt context, kernel code with a hard no-sleep requirement.

**Mutex**: everything else, including anything that may block, anything user-space, and any critical section whose length is not tiny and bounded.

---

### In code

```text
The architectural difference, in one picture:

  SPINLOCK                            MUTEX
  while (!try_acquire())              if (!try_acquire())
      ;        <- burns CPU               sleep on a wait queue
                                          <- yields the CPU

  thread state: RUNNING               thread state: BLOCKED
  core:         occupied, idle work   core:         runs other work
  acquire on release: IMMEDIATE       acquire on release: after a
                                                          WAKEUP

  a spinlock spends CPU CYCLES.
  a mutex spends CONTEXT SWITCHES.
```

```text
The arithmetic, which is the whole decision:

  cost of SLEEPING   ~2 context switches (one to sleep, one to wake)
                     ~2-10 microseconds
                     PLUS cold cache and TLB afterwards

  cost of SPINNING   the HOLD TIME of the lock
                     one core doing nothing for that long

  so:
     hold time   100 ns    spin   (sleeping costs 20-100x more)
     hold time     1 us    marginal
     hold time    10 us    sleep
     hold time  I/O-bound  sleep, obviously

  rule: if the expected hold time is shorter than two context
        switches, spin. Otherwise sleep.

  and a PRECONDITION that is easy to forget:
     spinning needs MORE THAN ONE CORE.
     on a uniprocessor the holder cannot run while you spin, so you
     are burning the very time slice in which it would have released
     the lock.
     -> on a non-SMP Linux build, spin_lock reduces to DISABLING
        PREEMPTION and nothing else.
```

```c
// What everyone actually uses: the adaptive mutex
// pthread_mutex_lock does roughly this:
for (int i = 0; i < SPIN_LIMIT; i++) {
    if (try_acquire()) return;        // uncontended or brief: never
    cpu_relax();                      // enters the kernel at all
}
futex_wait(&lock, LOCKED);            // only now pay for a syscall
                                      // and a context switch

// Linux goes further with ADAPTIVE SPINNING:
//   spin ONLY while the lock holder is observed to be RUNNING on
//   another core. If the holder has been descheduled, sleep
//   immediately, because no amount of spinning will help.
```

```text
Why an interrupt handler must never take a mutex:

  1. THERE IS NOTHING TO PUT TO SLEEP          <- the decisive reason
        a handler runs in INTERRUPT CONTEXT, not process context
        no task_struct of its own
        no scheduling entity
        it BORROWS the kernel stack of whatever it interrupted

        sleeping means saving a thread's state and scheduling
        another. Here there is NO THREAD whose state could be saved
        or later resumed.

        schedule() in interrupt context is a kernel bug:
            "BUG: scheduling while atomic"

  2. SELF-DEADLOCK
        thread T holds mutex M
        an interrupt fires ON THE SAME CPU
        the handler tries to take M -> blocks
        T can only release M by continuing to run...
        ...but the handler is executing ON T'S STACK and will not
           return until it gets the lock

        the handler waits for the very thing it interrupted.
        One CPU, no possible intervention.

  3. LATENCY
        handlers run with that IRQ line masked, often with interrupts
        disabled entirely. Blocking there stalls the device, delays
        every other interrupt, and can lose data in hardware buffers.
        Handlers must be SHORT and BOUNDED. Sleeping is neither.
```

```c
// Which is why a lock shared with an interrupt handler needs this:
unsigned long flags;

spin_lock_irqsave(&dev->lock, flags);
//               ^ takes the spinlock AND disables interrupts on
//                 THIS CPU, saving the previous state
    dev->count++;
    list_add(&item->node, &dev->queue);
spin_unlock_irqrestore(&dev->lock, flags);

// without disabling interrupts, an IRQ arriving ON THIS CPU while
// process context holds the lock would produce exactly the
// self-deadlock above.

// and the handler side simply uses:
spin_lock(&dev->lock);      // interrupts are already off here
    /* ... */
spin_unlock(&dev->lock);
```

```c
// Things you may NEVER do while holding a spinlock, because they sleep
spin_lock(&lock);

    kmalloc(size, GFP_KERNEL);   // may wait for memory reclaim
    copy_to_user(dst, src, n);   // may page fault
    mutex_lock(&other);          // obviously sleeps
    msleep(10);                  // obviously sleeps

spin_unlock(&lock);
// each one is a real bug. Linux's might_sleep() checks catch them
// in debug builds with a loud stack trace.
//
// GFP_ATOMIC is the allocation flag that does not sleep, and is
// the only one usable here.
```

```text
Why naive spinlocks make contention WORSE, not just slower:

  TEST-AND-SET spinlock, 8 cores waiting:
     every waiter repeatedly WRITES the same cache line
     -> the line ping-pongs between all 8 caches
     -> each attempt invalidates everyone else's copy
     -> contention makes throughput COLLAPSE, not merely degrade
     -> and it is UNFAIR: whoever happens to win, wins again

  TICKET LOCK / QUEUED SPINLOCK (qspinlock, based on MCS):
     each waiter spins on ITS OWN cache line
     the lock is handed on in FIFO order
     -> no bouncing, and fairness for free

  this is why real kernel spinlocks are not the three-line version
  from a textbook.
```

```text
The mapping, in practice:

  SPINLOCK   very short, bounded critical sections
             INTERRUPT CONTEXT (no choice: it cannot sleep)
             kernel code with a hard no-sleep requirement
             multiprocessor only

  MUTEX      everything else
             anything that may block, allocate, fault or do I/O
             all user-space code
             any critical section not tiny and bounded

  and in user space the question is mostly moot: pthread_mutex is
  adaptive, so it spins briefly and then sleeps, giving you both.
```

---

### What they ask next

**"Why is spinning ever acceptable, given it wastes CPU?"**
Because sleeping also costs, and the cost is fixed at roughly two context switches plus cache damage. If the lock is held for a hundred nanoseconds, sleeping costs twenty to a hundred times more than the wait itself. Spinning is cheaper when the wait is shorter than the price of going away.

**"What happens if you spin on a uniprocessor?"**
You burn the entire time slice in which the holder would have released the lock, because it cannot run while you spin. This is why Linux reduces `spin_lock` to disabling preemption on non-SMP builds, and why spinning requires multiple cores to make any sense.

**"Why exactly can an interrupt handler not sleep?"**
Because there is no schedulable entity to sleep. It runs in interrupt context with no `task_struct`, borrowing the stack of whatever it interrupted, so there is no thread whose state could be saved and resumed. Linux reports an attempt as `BUG: scheduling while atomic`.

**"What is `spin_lock_irqsave` for?"**
For locks shared between process context and an interrupt handler. It disables interrupts on the local CPU while holding the lock, so a handler cannot fire on that CPU and deadlock against the lock its own interrupted thread holds. It saves and restores the previous interrupt state, so nesting is safe.

**"What may you not do while holding a spinlock?"**
Anything that might sleep: `kmalloc` with `GFP_KERNEL`, `copy_to_user`, acquiring a mutex, or any explicit sleep. Use `GFP_ATOMIC` if you must allocate, and keep the critical section to a handful of instructions.

**"Why are real spinlocks queued rather than test-and-set?"**
Because a plain test-and-set has every waiter writing the same cache line, so it ping-pongs between caches and throughput collapses under contention, and it is also unfair. Queued locks such as `qspinlock`, built on MCS, let each waiter spin on its own cache line and grant the lock in FIFO order.

**"Does user-space code ever use a pure spinlock?"**
Rarely, and it is usually a mistake, because a user thread can be preempted while holding one and every spinner then burns a full time slice. The adaptive mutex is almost always the right choice, and where pure spinning is genuinely wanted, such as in a trading hot path, it is paired with CPU pinning and isolated cores.

**The common wrong answer** is "a spinlock busy-waits and a mutex sleeps, so a mutex is better". The choice is **arithmetic**, comparing the hold time against the cost of two context switches, and for interrupt handlers it is not a choice at all: there is **no thread to put to sleep**, so a mutex is not slow there, it is impossible.

---

### Say this in the interview

*"Both enforce mutual exclusion, and the entire difference is what happens to a thread that cannot acquire the lock. A spinlock busy-waits, looping on an atomic test like compare-and-swap, never yielding, so the thread stays running and the core is occupied doing nothing. A mutex puts the waiter on a wait queue and blocks it, so the scheduler runs something else and the waiter is woken when the lock is released. In one line: a spinlock spends CPU cycles and a mutex spends context switches.*

*So the choice is arithmetic. Sleeping costs roughly two context switches, one to deschedule and one to wake, about two to ten microseconds, plus the indirect cost of a cold cache and TLB afterwards. Spinning costs the hold time of the lock, with one core idle for that long. So if the expected hold time is shorter than two context switches, spinning wins, which in practice means critical sections of a few hundred nanoseconds to about a microsecond: incrementing a counter, updating a list head, flipping a flag. If the hold time is longer or unbounded, sleeping wins by a wide margin, so anything doing I/O, allocating memory or waiting on another lock must use a mutex.*

*There is also a precondition people forget: spinning requires more than one core. On a uniprocessor the holder cannot run while you spin, so you burn the very time slice in which it would have released the lock, which is why Linux reduces spin_lock to disabling preemption on non-SMP builds. And in practice everyone uses adaptive mutexes: pthread_mutex_lock spins briefly and only then falls back to a futex syscall, so uncontended and briefly contended acquisitions never enter the kernel. Linux goes further with adaptive spinning, spinning only while the holder is observed to be running on another core and sleeping immediately if it has been descheduled.*

*Interrupt handlers must never use a mutex, for three reasons. The decisive one is that there is nothing to put to sleep: a handler runs in interrupt context, not process context, with no task_struct of its own and no scheduling entity, borrowing the kernel stack of whatever it interrupted. Sleeping means saving a thread's state and scheduling another, and here there is no thread whose state could be saved or resumed, so calling schedule is a kernel bug that Linux reports as BUG: scheduling while atomic. Second, it would self-deadlock: if a thread holds a mutex and is interrupted on the same CPU, and the handler blocks on that mutex, the holder can only release it by continuing to run, but it cannot, because the handler is executing on its stack and will not return until it gets the lock. The handler waits for the very thing it interrupted, on one CPU, with no possible intervention. Third, latency: handlers run with that IRQ masked and often with interrupts disabled, so blocking stalls the device, delays every other interrupt and can lose data in hardware buffers.*

*So interrupt context uses spinlocks only, and when a lock is shared with process context the process side must use spin_lock_irqsave, which disables interrupts on that CPU while holding the lock, because otherwise an interrupt arriving on the same CPU would produce exactly that self-deadlock. The rules that follow are that you may never sleep while holding a spinlock, so no kmalloc with GFP_KERNEL, no copy_to_user, no mutex, no msleep, and Linux's might_sleep checks catch those in debug builds; and preemption is disabled while one is held, because being preempted would leave every spinner burning a full time slice.*

*One last implementation point: naive test-and-set spinlocks make contention worse rather than merely slower, because every waiter writes the same cache line and it ping-pongs between caches, and they are unfair. Real kernel spinlocks are ticket locks or queued locks, Linux's qspinlock based on MCS, where each waiter spins on its own cache line and the lock is granted in FIFO order, which fixes both the bouncing and the fairness."*
