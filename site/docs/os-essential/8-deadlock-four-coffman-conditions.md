---
id: 8-deadlock-four-coffman-conditions
title: "Deadlocks & The 4 Necessary Coffman Conditions"
description: "Four things that must all be true at once, and what a cycle in the graph does and does not prove"

sidebar_position: 8
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a deadlock? State the four necessary Coffman conditions, and explain the Resource Allocation Graph (RAG) rule regarding cycles."

---

### Picture it

Picture a narrow bridge with cars arriving from both ends.

A car from the east drives halfway across. A car from the west does the same. Now neither can advance, and neither will reverse. They will sit there indefinitely, and so will everyone queued behind them.

Notice what had to be true for that to happen, because this is the whole topic.

**The bridge is single file.** If two cars could pass, nothing would be stuck.

**Each car is occupying bridge while waiting for more.** A car that waited at the entrance until the whole bridge was clear would never contribute to this.

**Nobody can be pushed back.** If a traffic officer could reverse one car, the jam would clear.

**Each is waiting for the other, in a loop.** East waits on West, West waits on East. A straight line of waiting would eventually reach somebody who is not waiting at all.

Remove any one of those and the jam cannot form. That is exactly what the four conditions say, and it is also why fixing deadlock means attacking one of them.

---

### The proper terms

#### Deadlock

A **deadlock** is a state in which a set of processes are each waiting for an event that only another process in the set can cause, so none can ever proceed.

Distinguish it from two neighbours. **Starvation** is a process waiting indefinitely while others proceed, so the system is making progress and one participant is not. **Livelock** is processes actively changing state in response to each other without making progress, like two people stepping aside in the same direction repeatedly. Deadlock means nothing in the set moves at all.

#### The four Coffman conditions

Deadlock requires **all four** of these to hold simultaneously. They are **necessary** conditions, so breaking any one makes deadlock impossible.

**Mutual exclusion.** At least one resource is held in a non-shareable mode, so only one process can use it at a time. Read-only resources do not qualify.

**Hold and wait.** A process holding at least one resource is waiting to acquire additional resources held by others.

**No preemption.** A resource cannot be forcibly taken from the process holding it; it must be released voluntarily.

**Circular wait.** There exists a set of waiting processes P0 through Pn such that each is waiting for a resource held by the next, and the last is waiting for one held by the first.

The relationship between the last two is worth being precise about: circular wait implies hold and wait, but not the reverse. They are listed separately because they can be attacked separately.

#### The Resource Allocation Graph

A **Resource Allocation Graph** is a directed graph with two kinds of node, **processes** and **resources**, and two kinds of edge.

A **request edge** runs from a process to a resource, meaning the process is waiting for it. An **assignment edge** runs from a resource to a process, meaning it is currently held.

The rule has two halves, and the second is what interviewers are checking.

**If the graph has no cycle, there is no deadlock.** This holds always.

**If the graph has a cycle, it depends on instances.** With one instance per resource type, a cycle is both necessary and sufficient: a cycle means deadlock. With multiple instances per resource type, a cycle is necessary but **not sufficient**: there may be a cycle and no deadlock, because a process outside the cycle may release an instance that satisfies one of the waiters and breaks it.

So "cycle means deadlock" is only true in the single-instance case, and saying so unprompted is the mark of having understood the model.

---

### In code

```text
Single instance per resource, so the cycle is conclusive:

      P1 ──request──► R2
      ▲                │
      │             assigned
   assigned             │
      │                 ▼
      R1 ◄──request─── P2

  P1 holds R1 and wants R2; P2 holds R2 and wants R1.
  One instance each, cycle present, therefore deadlocked.
```

```text
Multiple instances, cycle present, NOT deadlocked:

  R1 has two instances, held by P1 and P3.
  R2 has two instances, held by P2 and P4.

      P1 ──request──► R2 ──assigned──► P2 ──request──► R1 ──assigned──► P1
                              └──assigned──► P4             └──assigned──► P3

  The cycle P1 -> R2 -> P2 -> R1 -> P1 exists.
  But P4 holds an R2 instance and needs nothing, so when P4 finishes
  it frees an R2 instance, P1 proceeds, and the cycle dissolves.
```

```c
// The ordinary way to produce one in code: two locks taken in opposite orders
void *thread_a(void *arg) {
    pthread_mutex_lock(&lock1);
    pthread_mutex_lock(&lock2);      // waits on what B holds
    /* ... */
}

void *thread_b(void *arg) {
    pthread_mutex_lock(&lock2);
    pthread_mutex_lock(&lock1);      // waits on what A holds
    /* ... */
}
// All four conditions hold, so this deadlocks whenever the timing lines up.
```

---

### What they ask next

**"Which condition is easiest to break in practice?"**
Circular wait, by imposing a **global ordering** on resources and requiring every process to acquire them in that order. It is cheap, needs no runtime machinery, and is what the two-lock example above violates.

**"Why can't you just break mutual exclusion?"**
Because it is inherent to many resources. A printer or a write lock cannot be shared by definition. It is the condition you generally cannot remove.

**"Is a cycle always a deadlock?"**
Only with one instance per resource type. With multiple instances a cycle is necessary but not sufficient, because a process outside the cycle may release an instance that unblocks it.

**"What is the difference between deadlock and starvation?"**
In deadlock nothing in the set progresses and the state is permanent without intervention. In starvation the system progresses while one process is repeatedly passed over, and it may eventually run.

**"Can a single process deadlock itself?"**
Yes. Locking a non-recursive mutex it already holds satisfies all four conditions trivially, with the cycle being one process waiting on itself.

**The common wrong answer** is listing the four conditions as alternatives, as if any one causes deadlock. They are jointly necessary, and that is precisely why prevention works: removing one is enough.

---

### Say this in the interview

*"A deadlock is a state where a set of processes are each waiting for an event only another process in the set can cause, so none can proceed. That differs from starvation, where the system progresses but one process is passed over, and livelock, where processes keep changing state without progressing.*

*Deadlock requires all four Coffman conditions simultaneously. Mutual exclusion: at least one resource is non-shareable. Hold and wait: a process holds one resource while waiting for another. No preemption: resources cannot be forcibly taken. Circular wait: a set of processes each waits for a resource held by the next, closing a loop. Because they are jointly necessary, breaking any one prevents deadlock, which is the basis of prevention.*

*A Resource Allocation Graph has process and resource nodes, with request edges from process to resource and assignment edges from resource to process. If there is no cycle there is definitely no deadlock. If there is a cycle, it depends: with a single instance per resource type a cycle is necessary and sufficient, so it means deadlock, but with multiple instances a cycle is necessary and not sufficient, because a process outside the cycle may release an instance and break it."*
