---
id: 13-starvation-deadlock-livelock
title: "Starvation vs Deadlock vs Livelock"
description: "Three ways to make no progress, told apart by what the CPU is doing and whether anyone else is getting on with it"

sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the precise difference between Starvation, Deadlock, and Livelock? Compare them across process states and CPU consumption, and explain how systems recover from each."

---

### Picture it

Three ways of failing to get through a doorway.

**Two people, each holding something the other needs.** You have the key and they have the handle. You will hand over the key once you are through; they will hand over the handle once they are through. Neither of you will ever be through. You are both standing perfectly still, consuming nothing, waiting for an event that **can only be caused by someone who is also waiting**. Nothing will change if you wait a thousand years.

**Two people stepping out of each other's way, in unison.** You step left; they step right, into you. You both apologise and step back. You step right; they step left. This can go on indefinitely, and the striking thing is that **you are both working extremely hard**. You are moving, reacting, responding constantly. From a distance you look busy. The corridor is not blocked by anything except your own perfectly polite, perfectly synchronised reactions. And it **might fix itself**: one small hesitation, one person pausing half a second longer, and you both get through.

**One person standing aside, for ever, while a stream of more important people goes past.** You are not stuck on anything, you are not holding anything, and nothing is wrong with the doorway. **Everybody else is getting through perfectly well.** You are simply never chosen, because somebody more urgent keeps arriving. This is the only one of the three where the building as a whole is functioning fine, and the failure is a failure of **fairness** rather than of mechanism.

Three failures, and you can tell them apart by asking **two questions**: is anyone doing anything, and is anyone making progress.

---

### The proper terms

#### Deadlock

A **deadlock** is a state in which every process in a set is **waiting for an event that only another process in that set can cause**.

It requires all four **Coffman conditions** simultaneously: **mutual exclusion**, **hold and wait**, **no preemption** and **circular wait**.

Its defining properties:

**The processes are blocked**, in the **waiting** state, not on a run queue.

**They consume no CPU at all.**

**No process in the set ever progresses**, and the situation is permanent. It cannot resolve itself, because the only events that could unblock anyone are events that the blocked processes themselves would have to cause.

The last point is the discriminator: deadlock has no probability component. Waiting longer, retrying, or changing the timing changes nothing.

#### Livelock

A **livelock** is a state in which processes are **actively executing and changing state**, but no useful work is accomplished, because each keeps reacting to the others in a way that undoes the reaction.

Its defining properties:

**The processes are running**, not blocked.

**They consume CPU, often a great deal of it**, which is what makes it look so different from deadlock in monitoring.

**No useful progress is made**, so the outcome is the same as deadlock from the outside.

**It can resolve spontaneously**, which deadlock cannot. Livelock depends on the participants reacting in **lockstep**, so any perturbation of the timing may break it.

The archetypal cause in software is **symmetric reaction**: a thread detects contention, releases its locks to be polite, backs off, retries, and collides with the other thread doing exactly the same thing at exactly the same moment. Naive deadlock-avoidance code that releases and retries in step is the usual source, and the irony is worth naming: **livelock is frequently created by a bad fix for deadlock.**

#### Starvation

**Starvation** is a state in which a process is **runnable and eligible** but is **perpetually denied** the resource or CPU time it needs, because the policy keeps preferring others.

Its defining properties:

**The victim is ready or runnable**, or blocked on a resource that is repeatedly granted to others. It is not waiting on an impossible event.

**The victim consumes no CPU**, while **the system as a whole makes progress normally**.

**It is a fairness failure**, not a mechanism failure. Nothing is broken; the policy simply never selects this participant.

**It can resolve spontaneously** if the load changes, for example when the stream of higher-priority work dries up.

The common causes: **strict priority scheduling with no ageing**, **reader-preference reader-writer locks**, **unfair or LIFO lock handoff**, and the **convoy effect**, where a slow holder repeatedly recaptures a lock because it is already running and cache-warm.

#### The comparison

| | **Deadlock** | **Livelock** | **Starvation** |
| --- | --- | --- | --- |
| Process state | blocked / waiting | **running** | ready / runnable |
| CPU consumption | **none** | high | none, by the victim |
| Whole-system progress | **none** | **none** | normal, for others |
| Resolves on its own | **never** | possibly, if timing changes | possibly, if the load changes |
| Root cause | **circular wait** | **symmetric reaction** | unfair policy |
| How it looks in monitoring | processes in D state, idle CPU | 100 percent CPU, no throughput | one slow client, everything else fine |

The two questions that separate them: is anyone executing? Deadlock, no; livelock and starvation, yes. Is anyone making progress? Starvation, yes for others; deadlock and livelock, no.

The monitoring signature is worth carrying: deadlock looks like an **idle machine with stuck processes**, livelock looks like a **pegged machine doing nothing useful**, and starvation looks like a **healthy machine with one unhappy participant**.

#### Recovering from each

**Deadlock.**

**Prevention** removes one Coffman condition structurally. The practical one is a **global lock ordering**, since circular wait is the condition application code controls.

**Avoidance** examines each request, as in the Banker's Algorithm, and is essentially unused in general-purpose systems because it needs maximum demand declared in advance.

**Detection and recovery** builds a **wait-for graph**, finds a cycle, and kills or rolls back a victim, usually the one that has done the least work. This is what databases do, and the victim must be able to **retry**.

**Timeouts** are the crude practical fallback: abort anything that waits too long, which cannot distinguish deadlock from slowness but requires no graph.

**Ignoring it**, the **ostrich algorithm**, is what general-purpose operating systems do for most resources, because deadlocks are rare and avoidance costs more.

**Livelock.** The fix is always the same shape: introduce asymmetry, because the failure depends on both sides behaving identically.

**Randomised exponential backoff with jitter** is the canonical answer. Each retry waits a random, growing interval, so two participants cannot stay in step. **Ethernet's CSMA/CD** used precisely this, and it is why every retry loop should have jitter.

**Priorities or a tie-break**, so a deterministic rule decides who yields, such as the lower thread identifier.

**Bounded retries, then block.** Try optimistically a fixed number of times, then fall back to acquiring a real lock and waiting. This converts a potential livelock into bounded waiting.

**Timestamp ordering**, such as Wait-Die or Wound-Wait, which is asymmetry by construction and prevents both deadlock and livelock.

**Starvation.** The fix is to make the policy **fair**, with a bounded-waiting guarantee.

**Ageing**, gradually raising the priority of a task as it waits, so it eventually outranks newcomers. This is the classic answer for priority scheduling.

**FIFO or fair queueing**, including **ticket locks** and **queued spinlocks**, which grant in arrival order so the wait is bounded by the number already queued.

**A fair turnstile**, as in the readers-writers problem, where an arriving writer blocks future readers rather than waiting for an instant with none.

**Fair-share schedulers** such as Linux's **CFS** and now **EEVDF**, which track accumulated service and always run the task that has received least, so starvation is structurally impossible.

**Priority boosting**, as in multilevel feedback queues, where everything is periodically lifted to the top queue.

One relationship worth stating: **livelock is formally a special case of starvation**, since in both cases a participant is scheduled yet makes no progress. For interviews the distinction above is what is wanted, but knowing the formal relationship is a good thing to add.

---

### In code

```text
Telling them apart with two questions:

                      is anyone      is anyone making
                      EXECUTING?     PROGRESS?
  DEADLOCK               no               no
  LIVELOCK              YES               no
  STARVATION            YES              YES, for others

  and the monitoring signature:
  DEADLOCK      an IDLE machine with stuck processes (D state)
  LIVELOCK      a PEGGED machine doing nothing useful
  STARVATION    a HEALTHY machine with one unhappy participant
```

```text
DEADLOCK: blocked, 0% CPU, permanent

  thread A: holds L1, waits for L2
  thread B: holds L2, waits for L1

       A --waits for--> L2 --held by--> B
       ^                                |
       +---------- held by L1 <---------+

  both in the WAITING state. Zero CPU. For ever.

  the discriminator: there is NO PROBABILITY COMPONENT. Waiting
  longer, retrying, or changing the timing changes NOTHING, because
  the only events that could unblock anyone are events the blocked
  processes themselves would have to cause.
```

```c
// LIVELOCK: running, 100% CPU, no progress
// and note WHERE IT CAME FROM: a bad fix for deadlock
while (1) {
    lock(L1);
    if (!try_lock(L2)) {
        unlock(L1);          // "be polite, avoid deadlock"
        continue;            // and retry IMMEDIATELY
    }
    do_work();
    unlock(L2); unlock(L1);
    break;
}

// thread A: lock L1, try L2 -> fails -> release L1, retry
// thread B: lock L2, try L1 -> fails -> release L2, retry
// ... both retry at the SAME INSTANT, and collide again ...
//
// both threads are RUNNING FLAT OUT. The CPU graph is at 100%.
// Throughput is zero.
//
// the irony: LIVELOCK IS FREQUENTLY CREATED BY A BAD FIX FOR
// DEADLOCK. The polite release is what makes it symmetric.
```

```c
// The fix for livelock is always ASYMMETRY
int attempt = 0;
while (1) {
    lock(L1);
    if (!try_lock(L2)) {
        unlock(L1);
        if (++attempt > MAX_RETRIES) {
            // bounded retries, then BLOCK properly in a fixed order
            lock_in_order(L1, L2);
            break;
        }
        // randomised exponential backoff: the two threads CANNOT
        // stay in step. Ethernet's CSMA/CD used exactly this.
        usleep(base * (1 << attempt) + rand() % base);
        continue;
    }
    do_work();
    unlock(L2); unlock(L1);
    break;
}
```

```text
STARVATION: runnable, 0% CPU for the victim, system fine

  strict priority scheduling, no ageing:

  time -->
  HIGH   [==][==][==][==][==][==][==][==][==][==]
  MED            [=====]        [=====]
  LOW    ..............................................  never runs

  the LOW task is READY. It is not blocked on anything impossible.
  It is simply NEVER CHOSEN.

  and crucially: THE SYSTEM IS WORKING PERFECTLY. Throughput is fine.
  It is a FAIRNESS failure, not a mechanism failure.

  common causes:
     strict priority with no ageing
     reader-preference rwlocks (writers starve)
     unfair or LIFO lock handoff
     the CONVOY EFFECT: a slow holder keeps recapturing the lock
     because it is already running and cache-warm
```

```text
Recovering from each:

  DEADLOCK
     PREVENTION   remove a Coffman condition structurally.
                  In practice: a GLOBAL LOCK ORDERING, since circular
                  wait is the one application code controls.
     AVOIDANCE    check each request (Banker's). Essentially unused:
                  it needs maximum demand declared in advance.
     DETECTION    wait-for graph -> find a cycle -> KILL OR ROLL BACK
                  a victim, usually the one that has done least work.
                  What databases do. The victim must RETRY.
     TIMEOUT      abort anything waiting too long. Crude: cannot tell
                  deadlock from slowness. Needs no graph.
     OSTRICH      ignore it. What general-purpose OSes do, because
                  deadlocks are rare and avoidance costs more.

  LIVELOCK  -> INTRODUCE ASYMMETRY (the failure needs both sides
               behaving identically)
     randomised EXPONENTIAL BACKOFF WITH JITTER   <- the canonical fix
     priorities or a tie-break (lower thread id yields)
     bounded retries, then fall back to BLOCKING in a fixed order
     timestamp ordering (Wait-Die / Wound-Wait): asymmetry by
     construction, and it prevents deadlock too

  STARVATION  -> MAKE THE POLICY FAIR, with bounded waiting
     AGEING: raise a waiting task's priority over time until it
             outranks newcomers        <- the classic fix
     FIFO / FAIR QUEUEING: ticket locks, queued spinlocks; the wait
             is bounded by the number already queued
     A FAIR TURNSTILE: an arriving writer blocks FUTURE readers
             rather than waiting for an instant with none
     FAIR-SHARE SCHEDULERS: Linux CFS and now EEVDF track accumulated
             service and always run the task that has had least, so
             starvation is STRUCTURALLY IMPOSSIBLE
     PRIORITY BOOSTING: periodically lift everything to the top queue
             (as in MLFQ)
```

```text
One relationship worth knowing:

  LIVELOCK is formally a SPECIAL CASE OF STARVATION, since in both
  a participant is scheduled yet makes no progress.

  for interviews the practical distinction is what is wanted:
     livelock   = nobody progresses, everyone burns CPU
     starvation = one party does not progress, everyone else is fine
```

---

### What they ask next

**"Which is worse, deadlock or livelock?"**
Deadlock is more final but easier to diagnose: processes sit in `D` state, the CPU is idle, and a wait-for graph shows the cycle. Livelock is harder to find because everything looks busy and healthy, and monitoring based on CPU utilisation reports a fully loaded system. Many teams spend longer chasing livelock.

**"Can a deadlock resolve itself?"**
No. The only events that could unblock anyone are events the blocked processes themselves would have to cause. There is no probability involved, which is exactly what distinguishes it from livelock and starvation, both of which can clear if the timing or load changes.

**"How is livelock usually created?"**
By a naive deadlock fix. A thread detects contention, politely releases its locks and retries immediately, and the other thread does the same at the same moment. The politeness is what makes the behaviour symmetric, which is precisely the ingredient livelock needs.

**"Why does jitter matter in a retry loop?"**
Because without it every participant retries at the same instants and collides again. Randomising the backoff breaks the symmetry, which is the entire fix for livelock, and it is why the canonical retry policy is exponential backoff **with jitter** rather than exponential backoff alone.

**"Is priority inversion one of these three?"**
It is closest to starvation, since the high-priority task is runnable and perpetually denied. But it is distinct in that the cause is a shared resource held by a lower-priority task rather than a scheduling policy, and the fix is priority inheritance rather than ageing.

**"How do you prevent starvation in a scheduler?"**
Ageing, raising a waiting task's priority over time, or a fair-share design that tracks accumulated service and always runs whoever has had least. Linux's CFS and EEVDF take the second approach, which makes starvation structurally impossible rather than merely unlikely.

**"How would you diagnose each in production?"**
Deadlock: idle CPU with processes stuck, confirmed by stack traces or a wait-for graph. Livelock: pinned CPU with no throughput, confirmed by profiling showing repeated retry loops. Starvation: normal throughput with one client's latency unbounded, confirmed by per-task wait times rather than aggregates.

**The common wrong answer** is treating livelock as "a deadlock where things move". The distinction that matters is **CPU consumption and recoverability**: deadlock consumes nothing and never resolves, livelock consumes everything and may resolve by itself, and starvation is the only one where **the system is working perfectly** and a single participant is being treated unfairly.

---

### Say this in the interview

*"A deadlock is a state where every process in a set waits for an event only another process in that set can cause, and it needs all four Coffman conditions: mutual exclusion, hold and wait, no preemption and circular wait. The processes are blocked, in the waiting state, consuming no CPU at all, and no one in the set ever progresses. The discriminator is that there is no probability component: waiting longer, retrying or changing the timing changes nothing, because the only events that could unblock anyone are events the blocked processes themselves would have to cause.*

*A livelock is a state where processes are actively executing and changing state but accomplish no useful work, because each keeps reacting to the others in a way that undoes the reaction. They are running, not blocked, and they consume CPU, often a great deal, which is what makes it look so different from deadlock in monitoring. No useful progress is made, so the outcome from outside is the same. But unlike deadlock it can resolve spontaneously, because it depends on the participants reacting in lockstep, so any perturbation of timing may break it. The archetypal cause is symmetric reaction: a thread detects contention, politely releases its locks, backs off and retries, and collides with another thread doing exactly the same at exactly the same moment. The irony worth naming is that livelock is frequently created by a bad fix for deadlock.*

*Starvation is a state where a process is runnable and eligible but is perpetually denied what it needs because the policy keeps preferring others. The victim is ready, or blocked on a resource repeatedly granted to others, and consumes no CPU, while the system as a whole makes progress normally. So it is a fairness failure rather than a mechanism failure: nothing is broken, the policy simply never selects this participant. It can also resolve if the load changes. Common causes are strict priority scheduling with no ageing, reader-preference reader-writer locks, unfair or LIFO lock handoff, and the convoy effect where a slow holder keeps recapturing a lock because it is already running and cache-warm.*

*Comparing them: on process state, deadlock is blocked, livelock is running, starvation is ready. On CPU, deadlock consumes none, livelock consumes a lot, and in starvation the victim consumes none while others do. On whole-system progress, deadlock and livelock produce none while starvation leaves the system working normally. On self-recovery, deadlock never recovers, livelock may if timing changes, starvation may if load changes. And the monitoring signature is useful: deadlock looks like an idle machine with stuck processes, livelock looks like a pegged machine doing nothing useful, and starvation looks like a healthy machine with one unhappy participant.*

*For recovery: deadlock is handled by prevention through a global lock ordering, which is the practical one since circular wait is what application code controls; by avoidance such as the Banker's Algorithm, essentially unused because it needs maximum demand declared in advance; by detection and recovery, building a wait-for graph, finding a cycle and killing or rolling back the victim that has done least work, which is what databases do and which requires the victim to retry; by timeouts as a crude fallback that cannot distinguish deadlock from slowness; or by the ostrich algorithm, which is what general-purpose operating systems do for most resources.*

*Livelock is fixed by introducing asymmetry, since the failure requires both sides behaving identically. Randomised exponential backoff with jitter is the canonical answer, and Ethernet's CSMA/CD used exactly that. You can also use priorities or a tie-break so a deterministic rule decides who yields, or bounded retries followed by falling back to blocking in a fixed order, or timestamp ordering like Wait-Die and Wound-Wait, which is asymmetry by construction and prevents deadlock too.*

*Starvation is fixed by making the policy fair with a bounded-waiting guarantee: ageing, which raises a waiting task's priority until it outranks newcomers; FIFO or fair queueing such as ticket locks and queued spinlocks, where the wait is bounded by the number already queued; a fair turnstile as in readers-writers, where an arriving writer blocks future readers; fair-share schedulers like Linux's CFS and now EEVDF, which always run whoever has received least service so starvation is structurally impossible; and priority boosting as in multilevel feedback queues. One last point: livelock is formally a special case of starvation, since in both a participant is scheduled yet makes no progress, though the practical distinction is the one I gave."*
