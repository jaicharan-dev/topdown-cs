---
id: 9-deadlock-prevention-avoidance-detection
title: "Handling Deadlocks: Prevention, Avoidance, Detection & Recovery"
description: "Make it structurally impossible, refuse risky grants, clean up afterwards, or simply ignore it"

sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between deadlock prevention, deadlock avoidance, and deadlock detection & recovery? What is the Banker's Algorithm, what are Safe vs. Unsafe states, and why do modern OSs use the Ostrich Algorithm?"

---

### Picture it

Back to the one-lane bridge. There are four attitudes a council can take to the jam.

**Rebuild the road so a jam cannot form.** Make it two lanes, or make it one-way. The jam is now structurally impossible, and you never think about it again. It is also expensive and the road is less flexible than it was.

**Put a gatekeeper at each end.** Before letting a car on, the gatekeeper asks where everyone currently on the bridge intends to go, and lets the car on only if there is still a guaranteed way to drain the bridge afterwards. Nothing is rebuilt, but every car waits for an assessment, and the gatekeeper must be told each driver's full intentions in advance.

**Do nothing until it happens, then send a tow truck.** Cars jam occasionally, somebody notices, and a vehicle is reversed off the bridge. That driver loses their progress, but traffic flows again.

**Decide it happens so rarely that it is not worth a policy.** If a jam forms, the drivers will sort it out or somebody will reboot the junction. This sounds negligent and is, in fact, what almost every general-purpose system does.

---

### The proper terms

#### Prevention

**Deadlock prevention** structurally negates **one of the four Coffman conditions**, so deadlock can never arise.

**Mutual exclusion** generally cannot be negated, since many resources are inherently non-shareable.

**Hold and wait** is negated by requiring a process to request **all** its resources at once, before it starts. This causes poor utilisation, since resources are held long before use, and risks starvation for processes needing a popular set.

**No preemption** is negated by taking resources back: if a process requests something unavailable, it releases everything it holds and restarts later. This only works for resources whose state can be saved and restored, such as CPU registers or memory, not a printer mid-page.

**Circular wait** is negated by imposing a **total ordering** on resource types and requiring acquisition in increasing order. This is the practical one, used constantly in real code as **lock ordering**, because it costs nothing at runtime.

#### Avoidance

**Deadlock avoidance** allows the conditions to hold but examines each request before granting it, refusing any that could lead to deadlock. It needs a priori information: each process's **maximum demand** for every resource type, declared in advance.

A **safe state** is one in which there exists a **safe sequence**, an ordering of all processes such that each can obtain its maximum remaining need from the currently available resources plus those held by processes earlier in the sequence. In a safe state, deadlock cannot occur.

An **unsafe state** is one with no such sequence. Crucially, unsafe does not mean deadlocked: it means deadlock has become possible, since the system can no longer guarantee a way out. Avoidance simply refuses to enter unsafe states, which makes it conservative.

#### The Banker's Algorithm

Dijkstra's **Banker's Algorithm** is the classic avoidance algorithm, named after a banker who will only grant a loan if the remaining cash can still satisfy every customer's credit line in some order.

It maintains four structures: **Available**, the free instances of each resource type; **Max**, each process's declared maximum demand; **Allocation**, what each currently holds; and **Need**, which is Max minus Allocation.

On each request it pretends to grant it, then runs the safety algorithm: repeatedly look for a process whose Need can be met from Available, assume it finishes and releases everything, and add that to Available. If every process can be retired this way, a safe sequence exists and the request is granted. Otherwise the request is denied and the process waits.

Its drawbacks are why it is not used in practice. Maximum demand is rarely knowable in advance, the process count is not fixed, and the safety check costs O(n² × m) for n processes and m resource types, on **every** request.

#### Detection and recovery

**Deadlock detection** permits deadlock, then runs an algorithm periodically to find it, typically by searching a **wait-for graph** for cycles, which is the resource allocation graph with resources collapsed out. With multiple instances it uses a variant of the Banker's safety algorithm.

**Recovery** then needs a victim. Process termination aborts either all deadlocked processes or one at a time until the cycle breaks, choosing a **victim** by priority, runtime or resources held. Resource preemption takes a resource and rolls back that process to a safe **checkpoint**. Both must guard against repeatedly choosing the same victim, which is starvation.

Databases use exactly this. They detect cycles in their lock wait-for graph and abort one transaction, which the client retries, because transactions have rollback built in.

#### The Ostrich Algorithm

The **Ostrich Algorithm** is ignoring the problem, named for the bird's supposed habit of burying its head in the sand. Linux, Windows and macOS all do this for general process deadlocks.

The reasoning is a cost argument, not negligence. Deadlocks are **rare** in practice. Prevention constrains the whole system permanently. Avoidance needs information nobody has and costs time on every request. Detection costs continuous monitoring, and recovery means killing user processes, which a general-purpose OS is reluctant to do. Against that, the cost of a rare hang that a user resolves by killing the application is low.

Where deadlock is genuinely unacceptable, in databases and some real-time systems, detection or prevention is used and the cost is accepted.

---

### In code

```text
Banker's Algorithm, 5 processes and 3 resource types (A, B, C):

              Allocation      Max         Need = Max - Allocation
                A B C        A B C             A B C
      P0        0 1 0        7 5 3             7 4 3
      P1        2 0 0        3 2 2             1 2 2
      P2        3 0 2        9 0 2             6 0 0
      P3        2 1 1        2 2 2             0 1 1
      P4        0 0 2        4 3 3             4 3 1

      Available = 3 3 2

Safety check:
  Available 3 3 2  -> P1 needs 1 2 2, fits.  P1 finishes, frees 2 0 0
  Available 5 3 2  -> P3 needs 0 1 1, fits.  P3 finishes, frees 2 1 1
  Available 7 4 3  -> P4 needs 4 3 1, fits.  P4 finishes, frees 0 0 2
  Available 7 4 5  -> P0 needs 7 4 3, fits.  P0 finishes, frees 0 1 0
  Available 7 5 5  -> P2 needs 6 0 0, fits.  P2 finishes.

  Safe sequence: P1, P3, P4, P0, P2   ->  the state is SAFE
```

```c
// Prevention in everyday code: a total ordering on locks.
// Both threads take them in the same order, so no cycle can form.
void transfer(Account *from, Account *to, int amount) {
    Account *first  = from->id < to->id ? from : to;    // always lowest id first
    Account *second = from->id < to->id ? to   : from;

    pthread_mutex_lock(&first->lock);
    pthread_mutex_lock(&second->lock);
    /* move the money */
    pthread_mutex_unlock(&second->lock);
    pthread_mutex_unlock(&first->lock);
}
```

---

### What they ask next

**"Is an unsafe state deadlocked?"**
No. Unsafe means deadlock is now **possible** because no guaranteed completion order exists. The system may still finish normally if processes do not request their full maximum. Avoidance refuses unsafe states because it cannot tell the difference in advance.

**"Why isn't the Banker's Algorithm used in real operating systems?"**
Maximum demand must be declared up front and almost never is, processes come and go so the set is not fixed, and the safety check runs on every request at O(n² × m). The overhead outweighs the rarity of deadlock.

**"How do databases handle it?"**
Detection and recovery. They build a wait-for graph of transactions, detect cycles, and abort a victim, relying on transaction rollback. Some use a timeout as a cheaper approximation.

**"Which prevention technique is actually used?"**
Breaking circular wait through consistent lock ordering. It is a convention rather than a mechanism, it costs nothing at runtime, and it is the standard advice for multi-lock code.

**"What is the difference between prevention and avoidance?"**
Prevention makes a condition structurally impossible regardless of what processes do. Avoidance leaves the conditions intact and decides request by request, using declared maximum demands, which needs more information but constrains the system less.

**The common wrong answer** is using prevention and avoidance interchangeably. Prevention is static and structural; avoidance is dynamic and per-request.

---

### Say this in the interview

*"There are four approaches. Deadlock prevention structurally negates one of the four Coffman conditions: hold and wait by requiring all resources up front, no preemption by taking resources back, and circular wait by imposing a total ordering on resource types, which is the practical one and is just consistent lock ordering. Mutual exclusion generally cannot be negated.*

*Deadlock avoidance leaves the conditions intact and inspects each request, granting it only if the result is a safe state. A safe state is one where a safe sequence exists, an order in which every process can obtain its maximum remaining need from available resources plus those released by earlier processes. An unsafe state is not deadlocked; it means deadlock has become possible because no such guarantee exists.*

*The Banker's Algorithm is the classic avoidance algorithm. It tracks Available, Max, Allocation and Need, pretends to grant each request, then runs a safety check looking for a safe sequence. It is not used in practice because maximum demand must be declared in advance, the process set is not fixed, and the check costs O(n squared times m) on every request.*

*Deadlock detection and recovery allows deadlock, finds it by looking for cycles in a wait-for graph, and recovers by terminating a victim process or preempting a resource and rolling back to a checkpoint, guarding against always choosing the same victim. Databases work this way, since they already have rollback.*

*The Ostrich Algorithm is deliberately ignoring the problem, which Linux, Windows and macOS do. It is a cost argument: deadlocks are rare, every other approach constrains or costs the whole system continuously, and the occasional hang is cheaper than paying that cost all the time."*
