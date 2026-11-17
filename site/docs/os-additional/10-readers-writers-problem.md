---
id: 10-readers-writers-problem
title: "The Readers-Writers Problem"
description: "A mutex is correct here and still wrong, because it forbids the one thing that was always safe"

sidebar_position: 10
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Readers-Writers problem? Why can't you solve it with a single mutex the same way you'd solve Producer-Consumer, and how do you prevent writer starvation using a fair turnstile?"

---

### Picture it

A noticeboard in a corridor.

**Any number of people can read it at once.** Ten people standing in front of it, all reading, interfere with each other not at all. Nothing anyone reads is affected by anyone else reading.

**Someone changing it needs the corridor to themselves.** No other editor, and no readers either, because a reader who looks halfway through a change sees a sentence that was never true: half the old notice and half the new one.

So the rule is **readers together, a writer alone**.

**Now the tempting mistake.** Put a lock on the corridor and let one person in at a time. That is unquestionably correct: nobody ever sees a half-finished notice.

And it is also **a terrible solution**, because you have just forbidden the one thing that was always perfectly safe. Nine readers now queue in the corridor to do something they could all have done simultaneously. On a board that is read a thousand times for every change, you have thrown away almost all the available concurrency to solve a problem that only ever arises during a change.

This is why the previous problem's solution does not transfer. On a shared tray where **every** person adds or removes an item, a single lock costs nothing, because every pair of accesses genuinely conflicts. Here **most pairs do not conflict at all**, and a lock that cannot tell the difference over-synchronises.

**And then the trap in the obvious fix.** Say the corridor is locked out for writers only while at least one reader is present. Readers arrive at random, overlapping each other. There is **never an instant with zero readers**. The editor stands at the end of the corridor holding their new notice, **for ever**, while a continuous stream of readers wanders past. Nothing is broken, nothing is deadlocked, and the change is never made.

**The fix is a doorway with a turnstile.** Everybody passes through it on the way in, readers included, but readers do not stop in it. When an editor arrives, they **stand in the turnstile** and stay there. Readers already inside finish and leave. New readers **pile up behind the editor** rather than slipping past. The corridor empties, the editor goes in, makes the change, and steps out of the turnstile, releasing the queue.

The editor waits only for the readers who were **already inside**, not for the infinite stream of ones who had not arrived yet.

---

### The proper terms

#### The problem

A shared resource is accessed by two kinds of thread:

**Readers**, which only inspect it. **Reads do not conflict with each other**, so any number may proceed concurrently.

**Writers**, which modify it. A writer needs **exclusive access**: no other writer and no readers, because a reader observing a partial update sees a state that never validly existed.

The constraint is therefore **asymmetric**, and that asymmetry is the entire problem. This is also the canonical justification for a **reader-writer lock**, `pthread_rwlock_t` or Rust's `RwLock`, as distinct from a plain mutex.

#### Why a single mutex is the wrong tool

A mutex is **not incorrect** here. It is **over-restrictive**, and understanding the difference is what the question is testing.

A mutex enforces one thread at a time, unconditionally. Applied here, it serialises **reader against reader**, which is a pair of operations that **never conflicted**. On a workload that is 95 percent reads, you have eliminated almost all the available parallelism to prevent a problem that only exists during the other 5 percent.

The contrast with producer-consumer is exact and worth stating:

In **producer-consumer**, every participant **mutates** the buffer, inserting or removing. Every pair of accesses genuinely conflicts, so a single mutex forfeits **no** concurrency that was ever available. It is the right tool.

In **readers-writers**, most pairs of accesses do not conflict at all. A mutex cannot express "these two may overlap, but those two may not", because it has only one kind of acquisition. What is needed is a lock with **two modes**: shared and exclusive.

So the reason you cannot reuse the earlier solution is not that it fails, but that it answers a different question. The producer-consumer mutex costs nothing because nothing was lost; here it costs nearly everything.

#### The basic solution, and the starvation it causes

The classic first readers-writers problem gives readers priority:

```text
int   readcount = 0;
sem_t mutex   = 1;    // protects readcount ONLY
sem_t rw_lock = 1;    // the actual resource lock

reader:
    wait(mutex);
      readcount++;
      if (readcount == 1) wait(rw_lock);   // FIRST reader locks writers out
    signal(mutex);

    ... read ...

    wait(mutex);
      readcount--;
      if (readcount == 0) signal(rw_lock); // LAST reader lets them back in
    signal(mutex);

writer:
    wait(rw_lock);
      ... write ...
    signal(rw_lock);
```

Two things to notice:

**There are two locks doing different jobs.** `rw_lock` guards the **resource**; `mutex` guards **`readcount`**, which is itself shared state and would otherwise be subject to a lost update. Forgetting the second is a classic error.

**Only the first and last readers touch `rw_lock`.** Readers in between pay only the cost of incrementing a counter, which is what makes concurrent reading cheap.

**The starvation** is structural rather than a bug in the code. `rw_lock` is released only when `readcount` reaches **zero**. If readers arrive at overlapping intervals, **that moment may never come**, and a waiting writer waits indefinitely.

This is not a theoretical concern: on a read-heavy workload, overlapping readers are the **normal** condition, so writer starvation is the expected outcome rather than an unlucky one.

#### The fair turnstile

The fix, the third readers-writers problem, adds one more semaphore through which every arriving thread must pass.

```text
sem_t turnstile = 1;

reader:
    wait(turnstile); signal(turnstile);   // pass THROUGH, do not hold
    wait(mutex);
      readcount++;
      if (readcount == 1) wait(rw_lock);
    signal(mutex);
    ... read ...
    wait(mutex);
      readcount--;
      if (readcount == 0) signal(rw_lock);
    signal(mutex);

writer:
    wait(turnstile);                      // HOLD it
      wait(rw_lock);
        ... write ...
      signal(rw_lock);
    signal(turnstile);                    // release the queue
```

How it works:

**Readers pass straight through** the turnstile and release it immediately, so in the absence of a writer it costs almost nothing.

**A writer holds the turnstile** for the whole of its wait and its write. From that instant, **every newly arriving reader blocks at the turnstile** instead of joining the readers inside.

**The readers already inside drain**, `readcount` falls to zero, `rw_lock` is released, and the writer proceeds.

The guarantee this produces is precise: **a writer waits only for the readers already inside the critical section, not for readers who have not yet arrived.** The wait is now **bounded**, which is exactly what starvation freedom means.

Note what it does not do: it does not give writers priority, and it does not make writers fast. It makes their wait **finite**.

#### The variants, and what real implementations do

**Reader-preference**, the first problem: maximum read throughput, writers can starve.

**Writer-preference**, the second problem: a waiting writer blocks new readers, so writers never starve, but a stream of writers can starve **readers**.

**Fair or FIFO**, the third problem: the turnstile above, or a ticket scheme where everyone is served in arrival order. Neither side starves, at some cost in read throughput.

In practice:

**`pthread_rwlock_t`** is unspecified by default, and glibc offers `PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP` to avoid writer starvation. Being unspecified matters: portable code should not assume fairness.

**Writer-preference is the common default in practice**, because writers are usually rarer and more urgent, and a starved writer is more damaging than a slightly delayed reader.

Two alternatives worth naming, because they change the trade entirely:

**Seqlocks.** The writer never blocks and bumps a sequence counter before and after writing. Readers read the counter, read the data, read the counter again, and **retry if it changed or was odd**. Readers take no lock at all, so writers are never delayed by readers. It suits very frequent reads with rare, short writes, and it requires that readers tolerate reading torn data before retrying, so it cannot be used where a read has side effects.

**RCU**, read-copy-update, used heavily in the Linux kernel. Readers are **nearly free**, with no locks and no atomic operations. A writer copies the structure, modifies the copy, and **atomically swaps a pointer**, then waits for a **grace period** until every pre-existing reader has finished before freeing the old version. It gives the best possible read performance at the cost of a more complex writer path and deferred reclamation.

---

### In code

```text
Why a single mutex is correct and still wrong:

  PRODUCER-CONSUMER
     every participant MUTATES the buffer
     every pair of accesses genuinely CONFLICTS
     -> a single mutex forfeits NO concurrency that ever existed
     -> it is the right tool

  READERS-WRITERS
     reader + reader   do NOT conflict          <- the whole point
     reader + writer   conflict
     writer + writer   conflict

     a mutex has only ONE kind of acquisition, so it cannot express
     "these two may overlap, those two may not"
     -> it serialises reader against reader, which was always safe
     -> on a 95% read workload, almost all parallelism is thrown away
        to prevent a problem that exists during the other 5%

  what is needed is a lock with TWO MODES: shared and exclusive.
```

```c
// The basic solution: readers-preference. Note the TWO locks.
int   readcount = 0;
sem_t mutex   = 1;    // protects readcount, which is itself shared
sem_t rw_lock = 1;    // the resource lock

void reader(void) {
    sem_wait(&mutex);
      readcount++;
      if (readcount == 1)
          sem_wait(&rw_lock);     // the FIRST reader locks writers out
    sem_post(&mutex);

    read_resource();              // many readers are in here at once

    sem_wait(&mutex);
      readcount--;
      if (readcount == 0)
          sem_post(&rw_lock);     // the LAST reader lets writers back
    sem_post(&mutex);
}

void writer(void) {
    sem_wait(&rw_lock);
      write_resource();
    sem_post(&rw_lock);
}

// forgetting `mutex` is the classic error: readcount is shared state,
// so ++ and -- would race and the lock would be acquired or released
// the wrong number of times.
```

```text
Why that starves writers, and why it is the NORMAL case:

  rw_lock is released only when readcount reaches ZERO

  time -->
  R1  [=========]
  R2       [==========]
  R3            [=========]
  R4                 [==========]
  R5                      [=========]
  readcount: 1  2   2   3  2   2   1  2 ...  NEVER ZERO

  W   [waiting......................................... for ever]

  nothing is broken. Nothing is deadlocked. Every reader is making
  progress. The write simply never happens.

  and on a read-heavy workload, OVERLAPPING READERS ARE NORMAL,
  so this is the expected outcome, not an unlucky one.
```

```c
// The fair turnstile: one extra semaphore everybody passes through
sem_t turnstile = 1;

void reader(void) {
    sem_wait(&turnstile);         // pass THROUGH...
    sem_post(&turnstile);         // ...do not hold it

    sem_wait(&mutex);
      readcount++;
      if (readcount == 1) sem_wait(&rw_lock);
    sem_post(&mutex);

    read_resource();

    sem_wait(&mutex);
      readcount--;
      if (readcount == 0) sem_post(&rw_lock);
    sem_post(&mutex);
}

void writer(void) {
    sem_wait(&turnstile);         // HOLD it for the whole wait + write
      sem_wait(&rw_lock);
        write_resource();
      sem_post(&rw_lock);
    sem_post(&turnstile);         // release the queue of readers
}
```

```text
What the turnstile actually changes:

  WITHOUT                           WITH
  R1 [====]                         R1 [====]
  R2   [=====]                      R2   [=====]
  W      [waiting...                W      W TAKES THE TURNSTILE
  R3       [=====]                  R3       [blocked at turnstile]
  R4         [=====]                R4         [blocked at turnstile]
  W            ...for ever]         R1, R2 finish -> readcount = 0
                                    W            [writes]
                                    R3, R4             [====]

  the guarantee, stated precisely:
     a writer waits only for the readers ALREADY INSIDE the critical
     section, never for readers who have not yet arrived.
     -> the wait is BOUNDED, which is exactly what starvation
        freedom means.

  note what it does NOT do: it does not give writers priority and
  does not make them fast. It makes their wait FINITE.
```

```text
The three variants, and what real implementations choose:

  READER-PREFERENCE   (first problem)
      maximum read throughput; WRITERS CAN STARVE

  WRITER-PREFERENCE   (second problem)
      a waiting writer blocks new readers; writers never starve,
      but a stream of writers can starve READERS

  FAIR / FIFO         (third problem)
      the turnstile above, or a ticket scheme serving in arrival
      order; NEITHER starves, at some cost in read throughput

  in practice:
      pthread_rwlock_t is UNSPECIFIED by default; glibc offers
      PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP
      -> portable code should NOT assume fairness
      writer-preference is the common default, since writers are
      usually rarer and a starved writer hurts more than a slightly
      delayed reader
```

```c
// Seqlock: the writer never blocks, the reader retries
// good for VERY frequent reads with RARE, SHORT writes
unsigned seq;

void writer(void) {
    seq++;                   // now ODD: "a write is in progress"
    smp_wmb();
    data = new_value;
    smp_wmb();
    seq++;                   // now EVEN again
}

int reader(void) {
    unsigned s;
    int v;
    do {
        s = seq;
        if (s & 1) continue;         // odd: a write is in progress
        smp_rmb();
        v = data;
        smp_rmb();
    } while (seq != s);              // changed under us? read again
    return v;
}
// readers take NO LOCK, so writers are never delayed by readers.
// the price: a reader may read torn data and must be able to simply
// discard it and retry, so it cannot be used where a read has side
// effects.

// RCU goes further: readers are nearly free, with no locks and no
// atomics. A writer copies the structure, modifies the copy, swaps
// a pointer atomically, then waits for a GRACE PERIOD until every
// pre-existing reader has finished before freeing the old version.
```

---

### What they ask next

**"Why does a single mutex work for producer-consumer but not here?"**
Because in producer-consumer every access mutates the buffer, so every pair genuinely conflicts and the mutex forfeits no concurrency that ever existed. In readers-writers most pairs do not conflict, and a mutex has only one acquisition mode, so it cannot permit the overlaps that were always safe.

**"Why are there two semaphores in the basic solution?"**
`rw_lock` protects the resource, and `mutex` protects `readcount`. The counter is itself shared mutable state, so incrementing it unguarded would race and the resource lock would be acquired or released the wrong number of times.

**"Why do only the first and last readers touch the resource lock?"**
Because exclusion against writers needs to hold for the whole period during which **any** reader is present. The first reader establishes it and the last releases it, so the readers in between pay only a counter update, which is what makes concurrent reading cheap.

**"Is writer starvation a bug in the code?"**
No, it is a property of the policy. The code is correct and does exactly what reader-preference specifies. Starvation is the consequence of that choice meeting a read-heavy workload, which is why the fix is a different policy rather than a correction.

**"How does the turnstile avoid deadlock?"**
Readers acquire and release it immediately, holding nothing else at the time, so they never block while holding it. Only the writer holds it, and it then acquires `rw_lock` in a consistent order. No circular wait can form.

**"What does `pthread_rwlock_t` do by default?"**
It is unspecified, which is the practical point. glibc provides `PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP` to avoid writer starvation, and portable code should set the policy explicitly rather than assume fairness.

**"When would you use a seqlock or RCU instead?"**
A seqlock when reads are very frequent, writes are rare and short, and a reader can safely discard a torn read and retry, so it cannot be used where a read has side effects. RCU when reads must be essentially free and you can tolerate a more complex writer path with deferred reclamation, which is why the Linux kernel uses it so heavily.

**"Is a reader-writer lock always better than a mutex?"**
No. It is more expensive to acquire, since it maintains more state, so with short critical sections or a write-heavy workload a plain mutex is often faster. The gain only appears when reads dominate and are long enough for the parallelism to pay for the extra bookkeeping.

**The common wrong answer** is presenting the counter solution as the answer and stopping. That solution **starves writers by construction** on exactly the workload it was designed for. The question is really about two insights: that a mutex **over-synchronises** because reads do not conflict, and that the obvious fix needs a **turnstile** so that an arriving writer blocks **future** readers rather than waiting for an instant with none.

---

### Say this in the interview

*"In the readers-writers problem a shared resource is accessed by readers, which only inspect it so any number may proceed concurrently since reads do not conflict, and writers, which need exclusive access against both other writers and all readers, because a reader seeing a partial update observes a state that never validly existed. The constraint is asymmetric, and that asymmetry is the whole problem. It is also the canonical justification for a reader-writer lock as distinct from a mutex.*

*A single mutex is not incorrect here, it is over-restrictive, and the distinction matters. A mutex enforces one thread at a time unconditionally, so it serialises reader against reader, a pair that never conflicted. On a workload that is ninety-five percent reads you have eliminated almost all the available parallelism to prevent a problem that only exists during the other five. The contrast with producer-consumer is exact: there every participant mutates the buffer so every pair genuinely conflicts, and a single mutex forfeits no concurrency that ever existed, which makes it the right tool. Here most pairs do not conflict, and a mutex has only one kind of acquisition, so it cannot express that these two may overlap while those two may not. What is needed is a lock with two modes, shared and exclusive.*

*The classic solution is reader-preference. You keep a readcount, protected by its own mutex because the counter is itself shared state, and a separate rw_lock for the resource. The first reader to arrive takes rw_lock, locking writers out, and the last reader to leave releases it, so readers in between pay only a counter update, which is what makes concurrent reading cheap. A writer simply takes rw_lock. Forgetting the second lock on readcount is the classic error, because the increments would race.*

*That starves writers, and structurally rather than as a bug. rw_lock is released only when readcount reaches zero, so if readers arrive at overlapping intervals that moment may never come and a waiting writer waits indefinitely. On a read-heavy workload overlapping readers are the normal condition, so writer starvation is the expected outcome rather than an unlucky one.*

*The fair turnstile fixes it with one extra semaphore that every arriving thread passes through. Readers acquire and immediately release it, so it costs almost nothing when no writer is present. A writer holds it for the whole of its wait and its write, so from that instant every newly arriving reader blocks at the turnstile instead of joining the readers inside. The readers already inside drain, readcount falls to zero, rw_lock is released, and the writer proceeds. The guarantee is precise: a writer waits only for the readers already inside the critical section, never for readers who have not yet arrived, so the wait is bounded, which is exactly what starvation freedom means. Note what it does not do: it gives writers no priority and does not make them fast, it makes their wait finite.*

*The variants are reader-preference, which maximises read throughput and can starve writers; writer-preference, where a waiting writer blocks new readers so writers never starve but a stream of them can starve readers; and fair or FIFO, the turnstile or a ticket scheme, where neither starves at some cost in read throughput. In practice pthread_rwlock_t is unspecified by default, glibc offers PREFER_WRITER_NONRECURSIVE to avoid writer starvation, and portable code should set the policy rather than assume fairness. Writer-preference is the common default, since writers are usually rarer and a starved writer hurts more than a slightly delayed reader.*

*Two alternatives change the trade entirely. A seqlock has the writer bump a sequence counter before and after writing, while readers read the counter, the data and the counter again and retry if it changed or was odd. Readers take no lock at all, so writers are never delayed by readers, which suits very frequent reads with rare short writes, and the price is that a reader may read torn data and must be able to discard it and retry, so it cannot be used where a read has side effects. RCU goes further: readers are nearly free with no locks and no atomics, while a writer copies the structure, modifies the copy, atomically swaps a pointer and then waits for a grace period until every pre-existing reader has finished before freeing the old version. That gives the best possible read performance at the cost of a more complex writer path and deferred reclamation, which is why the Linux kernel relies on it so heavily."*
