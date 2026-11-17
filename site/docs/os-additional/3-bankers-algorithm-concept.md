---
id: 3-bankers-algorithm-concept
title: "The Banker's Algorithm"
description: "Granting a request only if everyone could still be paid off afterwards, and why no real operating system can run it"

sidebar_position: 3
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Banker's Algorithm? How does it model resource allocation, safe states, and avoid deadlock in multi-resource systems? Why is it rarely implemented in modern operating systems like Linux?"

---

### Picture it

A small bank with a fixed amount of cash and several customers holding credit lines.

Each customer told the bank up front the **maximum** they might ever borrow. They draw it down in pieces, and crucially, **a customer only repays once they have borrowed their full limit** and finished their business. Until then the money they hold is simply gone from the bank's drawer.

Now a customer asks for another instalment. The question the manager asks is **not** "do I have the cash?" That is obvious. The question is: **"if I hand this over, is there still some order in which I could satisfy every customer, one after another, to completion?"**

To check, the manager does a thought experiment. Look at who could be finished off **right now** with the cash remaining. Pretend to finish them; their entire holding comes back to the drawer. With that larger pile, see who else could now be finished. Keep going. **If every customer can be cleared this way, in some order, the state is safe** and the instalment is handed over. If the manager gets stuck partway, with cash left but nobody who can be completed with it, the request is refused and the customer waits.

Two things about this are worth noticing, and they are what the question is really after.

**Refused does not mean the bank would have failed.** Getting stuck in the thought experiment means failure is **possible**, not certain. Some of those customers might never have drawn their full limit. The manager is being deliberately pessimistic, and the price is turning away perfectly survivable requests.

**The whole thing rests on one assumption: everyone declared their maximum in advance, honestly.** Without that number the thought experiment cannot even begin, because the manager has no idea what a customer might still ask for.

And that is exactly why no operating system works this way. **No program can tell you, when it starts, the most memory it will ever need.** It depends on the input, the user, the file it happens to open. The bank's one essential input does not exist.

---

### The proper terms

#### What it is

The **Banker's Algorithm**, from Dijkstra, is a **deadlock avoidance** algorithm. It is worth placing it against the alternatives immediately, because the question is really about why this category lost:

**Prevention** structurally removes one of the four Coffman conditions, for example by enforcing a global lock ordering.

**Avoidance** permits the conditions but **examines each request before granting it**, refusing any that could lead to deadlock. This is the Banker's Algorithm.

**Detection and recovery** allows deadlock, finds it afterwards with a wait-for graph, and kills a victim.

**Ignoring it**, the **ostrich algorithm**, does nothing at all. This is what general-purpose systems actually do for most resources.

The defining requirement of avoidance: **each process must declare its maximum resource need in advance.** Everything else follows from that, including why it is not used.

#### The data structures

For **n** processes and **m** resource types:

**`Available[m]`**, the units of each resource type currently free.

**`Max[n][m]`**, the maximum demand each process declared.

**`Allocation[n][m]`**, what each process currently holds.

**`Need[n][m]`**, computed as `Max - Allocation`: what each process could still request.

#### Safe states

A state is **safe** if there exists a **safe sequence**, an ordering of all processes such that each process's remaining **Need** can be met by the currently **Available** resources **plus everything held by all processes earlier in the sequence**.

In other words: **there is some order in which you could run every process to completion**, each one releasing its holdings to fund the next.

The distinction that is the point of the whole topic:

**Safe** means deadlock is **impossible** from here, whatever the processes do next.

**Unsafe** means deadlock is **possible**, not that it has happened or will happen.

**Deadlocked** means it has happened.

So **every deadlocked state is unsafe, but not every unsafe state is deadlocked.** The algorithm refuses to enter unsafe states at all, which makes it **conservative**: it denies requests that would, in fact, have been survivable, because the processes might not have drawn their full declared maximum.

#### The safety algorithm

```text
Work   = Available            (a working copy)
Finish = [false] * n

repeat:
    find an i such that  Finish[i] == false  and  Need[i] <= Work
    if none exists: break
    Work    = Work + Allocation[i]     (pretend i finishes and releases)
    Finish[i] = true

if all Finish[i] are true -> SAFE
else                      -> UNSAFE
```

The loop is the thought experiment: repeatedly find a process that can be completed with what is available, add back everything it holds, and continue with the larger pool.

#### The resource-request algorithm

When process `Pi` requests `Request[m]`:

**1.** If `Request > Need[i]`, the process has **exceeded its declared maximum**, which is an error.

**2.** If `Request > Available`, the resources are not there, so `Pi` waits.

**3.** Otherwise, **pretend to grant it**:

```text
Available    = Available    - Request
Allocation[i] = Allocation[i] + Request
Need[i]       = Need[i]       - Request
```

Run the safety algorithm on this hypothetical state. If it is **safe**, the allocation stands. If **unsafe**, **roll back all three updates** and make Pi wait.

The cost is `O(n^2 x m)` per safety check, and a check runs on **every request**.

#### Why modern operating systems do not use it

Several reasons, and the first is decisive on its own.

**Maximum demand is unknowable in advance.** This is the one that ends the discussion. A process cannot state at startup the most memory, file descriptors, sockets or locks it will ever need, because that depends on its input, the user's actions, and files it has not opened yet. The algorithm's single essential input **does not exist**. Forcing a declaration means every process declaring an enormous number to be safe, which makes almost every state look unsafe and the system refuses everything.

**The process set is not fixed.** The algorithm assumes a known, fixed **n**. A real system creates and destroys processes continuously, so the matrices would have to be rebuilt constantly.

**Resources are not a small, countable, fixed set.** Memory is virtual, overcommitted and swappable rather than a fixed pool of units. Devices appear and disappear. A kernel has thousands of distinct lock types. The model assumes something much simpler than reality.

**The cost is on the hot path.** `O(n^2 x m)` on every allocation request, with thousands of processes and many resource types, is unacceptable for an operation that must take nanoseconds.

**It is too conservative.** Refusing every unsafe state also refuses many states that would never have deadlocked, so processes block needlessly and utilisation falls.

**The alternative is simply cheaper.** Deadlocks in general-purpose systems are **rare**, and the cost of avoiding them exceeds the cost of handling the occasional one. So Linux uses the **ostrich algorithm** for most resources: ignore the possibility, and let the administrator kill a process if it happens. That sounds unserious and is the correct engineering trade.

Where deadlock genuinely matters, in the **kernel's own locking**, Linux uses **prevention** rather than avoidance: a documented global **lock ordering**, plus **lockdep**, a runtime validator that records lock acquisition orders and warns when a **potential** cycle is observed, even if no deadlock occurred. That catches the bug in testing rather than paying a cost in production.

**Where avoidance does appear**: constrained systems with statically known workloads, some real-time and embedded schedulers, and resource managers where a client genuinely can declare its full resource set in advance, such as a transaction that acquires a known set of locks.

---

### In code

```text
The four strategies, so you can place the Banker's Algorithm:

  PREVENTION   structurally remove a Coffman condition
               e.g. a global lock ordering (what Linux does internally)
  AVOIDANCE    allow the conditions, but CHECK EACH REQUEST and refuse
               any that could lead to deadlock          <- Banker's
  DETECTION    allow it, find it with a wait-for graph, kill a victim
               (what databases do)
  OSTRICH      ignore it; deadlocks are rare and avoidance costs more
               (what general-purpose OSes actually do)
```

```text
A worked example. 5 processes, 3 resource types A B C.

  Total: A=10  B=5  C=7

              Allocation      Max          Need = Max - Allocation
               A  B  C       A  B  C          A  B  C
  P0           0  1  0       7  5  3          7  4  3
  P1           2  0  0       3  2  2          1  2  2
  P2           3  0  2       9  0  2          6  0  0
  P3           2  1  1       2  2  2          0  1  1
  P4           0  0  2       4  3  3          4  3  1

  Allocated totals: A=7 B=2 C=5
  Available = Total - Allocated = (3, 3, 2)

  SAFETY CHECK:  Work = (3,3,2)

    Need[P1] = (1,2,2) <= (3,3,2)   YES -> Work += Alloc[P1] = (5,3,2)
    Need[P3] = (0,1,1) <= (5,3,2)   YES -> Work += Alloc[P3] = (7,4,3)
    Need[P4] = (4,3,1) <= (7,4,3)   YES -> Work += Alloc[P4] = (7,4,5)
    Need[P0] = (7,4,3) <= (7,4,5)   YES -> Work += Alloc[P0] = (7,5,5)
    Need[P2] = (6,0,0) <= (7,5,5)   YES -> Work += Alloc[P2] = (10,5,7)

  all finished -> SAFE, with safe sequence <P1, P3, P4, P0, P2>
```

```text
Now a request, and the roll-back:

  P1 requests (1, 0, 2)

  1. Request <= Need[P1]?   (1,0,2) <= (1,2,2)   yes
  2. Request <= Available?  (1,0,2) <= (3,3,2)   yes
  3. PRETEND to grant:
        Available    = (3,3,2) - (1,0,2) = (2,3,0)
        Allocation[P1] = (2,0,0) + (1,0,2) = (3,0,2)
        Need[P1]       = (1,2,2) - (1,0,2) = (0,2,0)

     run the safety check on this hypothetical state...
     safe sequence <P1, P3, P4, P0, P2> still exists -> SAFE
     -> the allocation STANDS

  had it come out UNSAFE, all three lines would be ROLLED BACK and
  P1 would wait, EVEN IF THE RESOURCES WERE SITTING THERE FREE.
```

```text
Safe vs unsafe vs deadlocked, which is the heart of the topic:

   +-------------------------------------------+
   |              ALL STATES                   |
   |   +-----------------------------------+   |
   |   |            UNSAFE                 |   |
   |   |   deadlock is POSSIBLE from here  |   |
   |   |   +-------------------------+     |   |
   |   |   |      DEADLOCKED         |     |   |
   |   |   |   it has happened       |     |   |
   |   |   +-------------------------+     |   |
   |   +-----------------------------------+   |
   |                                           |
   |            SAFE                           |
   |   deadlock is IMPOSSIBLE from here,       |
   |   whatever the processes do next          |
   +-------------------------------------------+

  every deadlocked state is unsafe.
  NOT every unsafe state is deadlocked, or ever will be.

  the algorithm refuses to ENTER the unsafe region at all, which is
  why it is conservative: it denies requests that would in fact have
  been survivable, because a process MIGHT draw its full declared max.
```

```text
Why Linux does not do this:

  1. MAXIMUM DEMAND IS UNKNOWABLE            <- decisive on its own
        a process cannot state at startup the most memory, file
        descriptors, sockets or locks it will EVER need: it depends
        on its input, the user, and files not yet opened.
        The algorithm's one essential input DOES NOT EXIST.
        Force a declaration and everyone declares a huge number,
        so every state looks unsafe and nothing is granted.

  2. n IS NOT FIXED
        processes are created and destroyed continuously; the
        matrices would be rebuilt constantly

  3. RESOURCES ARE NOT A SMALL COUNTABLE SET
        memory is virtual, overcommitted and swappable, not a pool
        of units; devices come and go; a kernel has thousands of
        distinct lock types

  4. COST ON THE HOT PATH
        O(n^2 x m) on EVERY allocation, for an operation that must
        take nanoseconds

  5. TOO CONSERVATIVE
        refusing all unsafe states refuses many that would never
        have deadlocked -> needless blocking, lower utilisation

  6. THE ALTERNATIVE IS CHEAPER
        deadlocks are rare; avoidance costs more than the occasional
        failure -> the OSTRICH ALGORITHM, and the admin kills a
        process. It sounds unserious and it is the right trade.

  where deadlock DOES matter, in the kernel's own locking, Linux uses
  PREVENTION: a documented global lock ordering, plus LOCKDEP, which
  records acquisition orders at runtime and warns on a POTENTIAL cycle
  even when no deadlock occurred. The bug is caught in testing instead
  of paid for in production.
```

---

### What they ask next

**"Is an unsafe state a deadlock?"**
No, and this is the most important distinction in the topic. Unsafe means deadlock is **possible**; it may never occur, because processes often do not claim their full declared maximum. Every deadlocked state is unsafe, but the converse is false, and that gap is exactly why the algorithm is conservative.

**"What is a safe sequence?"**
An ordering of all processes in which each one's remaining need can be satisfied by what is available plus what every earlier process in the sequence releases on completion. Its existence proves every process can finish, so deadlock is impossible from that state.

**"Why must the maximum be declared up front?"**
Because the safety check asks whether every process could still be run to completion, which requires knowing what each might still demand. Without `Need`, there is nothing to compare against `Work`, and the algorithm cannot run at all.

**"What is the complexity?"**
`O(n^2 x m)` for one safety check, and a check runs on every resource request. With thousands of processes and many resource types that is far too expensive for an allocation path measured in nanoseconds.

**"What does Linux do instead?"**
For most resources, nothing: the ostrich algorithm, on the basis that deadlocks are rare and avoidance costs more than the occasional failure. For kernel locking, where it genuinely matters, it uses prevention through a documented lock ordering plus lockdep, which flags a potential cycle during testing even when no deadlock actually occurred.

**"Where would the Banker's Algorithm actually be appropriate?"**
Where maximum demand is genuinely declarable and the workload is static: some real-time and embedded systems, and resource managers where a client announces its full resource set in advance, such as a transaction acquiring a known set of locks.

**"Could you adapt it by estimating the maximum?"**
Not usefully. Under-estimating breaks the guarantee entirely, since the algorithm's correctness depends on the declaration being an upper bound. Over-estimating makes almost every state look unsafe, so requests are refused and the system grinds. There is no useful middle, which is why the approach does not survive contact with real workloads.

**The common wrong answer** is reciting the matrices and the safety loop without addressing the last part of the question. The mechanics are the easy half. The interesting answer is that **avoidance requires information that does not exist in a general-purpose system**, that an unsafe state is not a deadlock, and that ignoring the problem is a defensible and widely chosen engineering decision.

---

### Say this in the interview

*"The Banker's Algorithm is a deadlock avoidance algorithm from Dijkstra. I would place it against the alternatives first: prevention structurally removes one of the Coffman conditions, for instance by a global lock ordering; avoidance permits the conditions but examines each request before granting it and refuses any that could lead to deadlock, which is the Banker's Algorithm; detection allows deadlock and finds it afterwards with a wait-for graph; and ignoring it, the ostrich algorithm, does nothing. The defining requirement of avoidance is that every process declares its maximum resource need in advance, and everything else follows from that.*

*It models the system with four structures for n processes and m resource types: Available, the free units of each type; Max, each process's declared maximum; Allocation, what each currently holds; and Need, which is Max minus Allocation.*

*A state is safe if there exists a safe sequence, an ordering of all processes where each one's remaining Need can be met by what is Available plus everything held by all processes earlier in the sequence. So there is some order in which every process could run to completion, each releasing its holdings to fund the next. The critical distinction is that safe means deadlock is impossible from here whatever happens next, unsafe means deadlock is possible, and deadlocked means it has happened. Every deadlocked state is unsafe, but not every unsafe state is deadlocked or ever will be, and the algorithm refuses to enter the unsafe region at all, which makes it conservative: it denies requests that would in fact have been survivable, because a process might draw its full declared maximum.*

*The safety algorithm takes Work equal to Available, repeatedly finds an unfinished process whose Need is within Work, adds that process's Allocation back to Work as though it had finished, and marks it done. If every process finishes, the state is safe. The resource-request algorithm then says: if the request exceeds the process's Need it is an error, since it exceeded its declared maximum; if it exceeds Available the process waits; otherwise pretend to grant it by adjusting Available, Allocation and Need, run the safety check on that hypothetical state, and if it is safe the allocation stands while if it is unsafe you roll back all three updates and the process waits, even though the resources were sitting free. Each safety check is order n squared times m, and one runs on every request.*

*As for why Linux does not use it, the decisive reason on its own is that maximum demand is unknowable in advance. A process cannot state at startup the most memory, file descriptors, sockets or locks it will ever need, because that depends on its input, the user and files it has not opened. The algorithm's one essential input does not exist, and forcing a declaration means everyone declares a huge number, so every state looks unsafe and nothing is granted. Beyond that: n is not fixed, since processes are created and destroyed constantly; resources are not a small countable set, since memory is virtual, overcommitted and swappable while a kernel has thousands of lock types; the cost is order n squared times m on an allocation path that must take nanoseconds; it is too conservative, refusing states that would never have deadlocked; and the alternative is simply cheaper, because deadlocks are rare and the ostrich algorithm plus an administrator killing a process costs less than avoiding them.*

*Where deadlock genuinely matters, in the kernel's own locking, Linux uses prevention rather than avoidance: a documented global lock ordering plus lockdep, which records acquisition orders at runtime and warns on a potential cycle even when no deadlock occurred, so the bug is caught in testing instead of paid for in production. Avoidance does still appear in constrained systems with statically known workloads, some real-time and embedded schedulers, and resource managers where a client can genuinely declare its full resource set up front."*
