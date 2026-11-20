---
id: 7-bankers-algorithm-resource-allocation
title: "Banker's Algorithm: Need Matrix, Safety Check and Requests"
description: "Not whether everyone can be paid at once, but whether an order exists in which everyone could be: the induction that makes deadlock impossible, and the reason no kernel runs it"

sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Given 5 processes (P0 to P4) and 3 resource types with total instances A = 10, B = 5, C = 7, with given Allocation and Max matrices: (1) Compute the Need Matrix and Available vector, (2) Determine if the system is in a Safe State and provide the safe sequence, and (3) Evaluate whether an immediate request from P1 for (1, 0, 2) can be granted."

---

### Picture it

A bank with limited cash and several borrowers, each of whom has declared the maximum they might ever draw.

The naive test is the one everybody reaches for first: **can I cover everyone's remaining claim right now?** On these figures the bank has three units of cash and the five borrowers' outstanding claims total eighteen, so the answer is no, and the naive test would declare the bank insolvent. It is not insolvent. It is perfectly safe, and seeing why is the whole algorithm.

The real question is different, and it is one word different: **does an order exist in which everyone could be paid?**

Watch the difference. The bank has three units. One borrower needs only one more unit to reach their declared maximum. Fund that borrower, and here is the move that makes it work: **a borrower who reaches their maximum finishes and repays everything.** So the bank hands over one unit and gets back three. It is now richer than it started. With that larger pile it can fund the next borrower, who also finishes and repays, and the pile grows again.

So the bank does not need enough for everybody. **It needs enough for somebody, and then the proceeds of that one fund the next.** It is an induction, and the base case is "at least one borrower's remaining claim fits in the current cash". If you can run the induction all the way to the end of the list, no sequence of events can wedge the bank, because there is always at least one borrower who can be carried to completion.

That is why the answer to "is this state safe" is a **sequence** and not a yes. The sequence is the proof.

Now the two things people get wrong about it.

**It is conservative on purpose, and that is not a flaw.** The algorithm assumes every borrower will eventually draw their entire declared maximum. Most will not. So there are states the algorithm calls unsafe in which nothing bad would actually have happened. **Unsafe does not mean deadlocked; it means the bank can no longer prove it is fine.** The algorithm refuses to be in a position where it is relying on luck, and it pays for that with requests denied that would have been harmless.

**And the declared maximum is where the whole thing comes apart in practice.** A bank can insist on a credit limit before lending. An operating system cannot ask a process how many file handles it will ever open, because the process does not know, because it depends on what the user does next. The algorithm is correct, teachable and almost entirely unused, and understanding why is a better answer than reciting the steps.

---

### The proper terms

#### The four structures

With `n` processes and `m` resource types:

**Total**, sometimes called Resource, is a vector of length `m` giving how many instances of each type exist in the system. Here `[10, 5, 7]`.

**Allocation** is an `n` by `m` matrix of what each process currently holds.

**Max**, sometimes called Claim, is an `n` by `m` matrix of the most each process may ever hold simultaneously. **This is the input that does not exist in the real world**, and every practical objection to the algorithm traces back to it.

**Need** is derived, not given:

$$\text{Need}[i][j] = \text{Max}[i][j] - \text{Allocation}[i][j]$$

It is the most process `i` can still ask for. Computing it is step one of every Banker's problem.

**Available**, sometimes called Work during the safety check, is also derived:

$$\text{Available}[j] = \text{Total}[j] - \sum_{i} \text{Allocation}[i][j]$$

#### Safe state

A state is **safe** if there exists an ordering of all `n` processes, called a **safe sequence**, such that each process in turn can have its entire remaining Need met from the resources free at that point, counting the holdings released by all the processes before it in the sequence.

Three things about that definition are worth being precise about, because each is a follow-up question.

**The sequence need not be unique.** There are sixteen safe sequences in this problem. The algorithm only has to find one, because one is a sufficient proof.

**Safe does not mean "everyone can run now".** It means a schedule exists that cannot deadlock. The processes may interleave however they like; safety guarantees that whatever they do, the system can always drive at least one of them to completion and recover its resources.

**Unsafe does not mean deadlocked.** An unsafe state is one from which deadlock is possible, not certain, because it depends on whether processes actually claim up to their Max. A deadlocked state is unsafe, but the reverse does not hold. This is the single most tested distinction on the topic.

#### Where it sits among the strategies

The four **Coffman conditions** must all hold for deadlock: mutual exclusion, hold and wait, no preemption, and circular wait. Three families of response follow.

**Deadlock prevention** structurally negates one of the four, for example by requiring all resources to be acquired at once, which kills hold and wait, or by imposing a global lock ordering, which kills circular wait.

**Deadlock avoidance** negates none of them. It allows the dangerous structure and uses advance knowledge to steer around the states where it could bite. The Banker's Algorithm is avoidance, and it is the canonical example. Classifying it as prevention is a common error.

**Deadlock detection and recovery** allows deadlock to occur, finds it by searching the resource allocation graph for a cycle, and breaks it by killing a victim or rolling back.

#### The safety algorithm itself

Given Allocation and Need, with `Work` initialised to Available and all processes unfinished:

1. Find any unfinished process `i` with `Need[i] <= Work`, componentwise.
2. If none exists, stop. If every process is finished, the state is **safe**; otherwise it is **unsafe**.
3. Otherwise set `Work = Work + Allocation[i]`, mark `i` finished, and go to step 1.

Step 3 is the induction: **marking a process finished means assuming it completes and returns everything it holds**, which is legitimate precisely because its entire remaining Need was satisfiable at that moment.

The cost is `O(n^2 * m)` in the worst case, since each of up to `n` rounds may scan up to `n` processes comparing `m` components. With five processes and three resource types that is nothing; with ten thousand threads and a lock per object, run on every single allocation request, it is not.

---

### Work it out

#### The given state

Total resources: `A = 10, B = 5, C = 7`, so `Total = [10, 5, 7]`.

| Process | Allocation (A, B, C) | Max (A, B, C) |
| :---: | :---: | :---: |
| **P0** | (0, 1, 0) | (7, 5, 3) |
| **P1** | (2, 0, 0) | (3, 2, 2) |
| **P2** | (3, 0, 2) | (9, 0, 2) |
| **P3** | (2, 1, 1) | (2, 2, 2) |
| **P4** | (0, 0, 2) | (4, 3, 3) |

#### Part 1: Available and Need

**Available** is Total minus the column sums of Allocation.

| | A | B | C |
| :--- | :---: | :---: | :---: |
| P0 | 0 | 1 | 0 |
| P1 | 2 | 0 | 0 |
| P2 | 3 | 0 | 2 |
| P3 | 2 | 1 | 1 |
| P4 | 0 | 0 | 2 |
| **Allocated** | **7** | **2** | **5** |
| Total | 10 | 5 | 7 |
| **Available** | **3** | **3** | **2** |

`Available = [10 - 7, 5 - 2, 7 - 5] = ` **[3, 3, 2]**

**Need** is Max minus Allocation, row by row.

| Process | Allocation | Max | **Need = Max - Alloc** |
| :---: | :---: | :---: | :---: |
| **P0** | (0, 1, 0) | (7, 5, 3) | **(7, 4, 3)** |
| **P1** | (2, 0, 0) | (3, 2, 2) | **(1, 2, 2)** |
| **P2** | (3, 0, 2) | (9, 0, 2) | **(6, 0, 0)** |
| **P3** | (2, 1, 1) | (2, 2, 2) | **(0, 1, 1)** |
| **P4** | (0, 0, 2) | (4, 3, 3) | **(4, 3, 1)** |

Before running anything, two observations that make the next part quick.

**The total outstanding Need is (18, 10, 7) against an Available of (3, 3, 2).** The system cannot satisfy everybody at once and is not remotely close to it. If safety meant "can cover all claims now", this state would be unsafe. It is safe, which is the clearest demonstration that safety is about ordering rather than sufficiency.

**Only P1 and P3 have a Need that fits in Available.** `Need[P1] = (1,2,2) <= (3,3,2)` and `Need[P3] = (0,1,1) <= (3,3,2)`; the other three all exceed it on at least one component. So **any safe sequence must begin with P1 or P3**, and if neither had fitted, the state would have been unsafe immediately with no search required. That is the cheapest sanity check available on this kind of problem.

#### Part 2: the safety algorithm

`Work = Available = [3, 3, 2]`, nobody finished.

**Round 1.** Scan for a process whose Need fits in Work.

- `P0: (7,4,3) <= (3,3,2)?` No, 7 exceeds 3.
- `P1: (1,2,2) <= (3,3,2)?` **Yes.**

Grant P1 its remaining Need, assume it completes, reclaim everything it holds.

`Work = [3,3,2] + Allocation[P1] = [3,3,2] + [2,0,0] = ` **[5, 3, 2]**

**Round 2.** `Work = [5,3,2]`, finished: P1.

- `P0: (7,4,3) <= (5,3,2)?` No.
- `P2: (6,0,0) <= (5,3,2)?` No, 6 exceeds 5.
- `P3: (0,1,1) <= (5,3,2)?` **Yes.**

`Work = [5,3,2] + [2,1,1] = ` **[7, 4, 3]**

**Round 3.** `Work = [7,4,3]`, finished: P1, P3.

- `P0: (7,4,3) <= (7,4,3)?` **Yes**, exactly, with nothing to spare.

Take P0 here. (P4 also fits at this point, which is where the alternative sequences come from.)

`Work = [7,4,3] + [0,1,0] = ` **[7, 5, 3]**

**Round 4.** `Work = [7,5,3]`, finished: P1, P3, P0.

- `P2: (6,0,0) <= (7,5,3)?` **Yes.**

`Work = [7,5,3] + [3,0,2] = ` **[10, 5, 5]**

**Round 5.** `Work = [10,5,5]`, finished: P1, P3, P0, P2.

- `P4: (4,3,1) <= (10,5,5)?` **Yes.**

`Work = [10,5,5] + [0,0,2] = ` **[10, 5, 7]**

All five processes are finished and Work has returned to Total, which is the arithmetic check that nothing was lost or invented.

| Round | Work before | Process | Need | Allocation released | Work after |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | (3, 3, 2) | **P1** | (1, 2, 2) | (2, 0, 0) | (5, 3, 2) |
| 2 | (5, 3, 2) | **P3** | (0, 1, 1) | (2, 1, 1) | (7, 4, 3) |
| 3 | (7, 4, 3) | **P0** | (7, 4, 3) | (0, 1, 0) | (7, 5, 3) |
| 4 | (7, 5, 3) | **P2** | (6, 0, 0) | (3, 0, 2) | (10, 5, 5) |
| 5 | (10, 5, 5) | **P4** | (4, 3, 1) | (0, 0, 2) | (10, 5, 7) |

**The system is in a safe state, with safe sequence P1, P3, P0, P2, P4.**

**On uniqueness.** That is one safe sequence, obtained by scanning in index order. `P1, P3, P4, P0, P2` is also safe and is the ordering most textbooks print. Of the 120 possible orderings of five processes, **16 are safe**, and all of them start with P1 or P3 for the reason given above. An interviewer asking for "the" safe sequence is asking for a witness, so producing one and noting that others exist is the complete answer.

Round 3 is the interesting row. P0's Need of (7,4,3) is met by a Work of exactly (7,4,3), with zero slack on all three resources. The state is safe, but it is safe by nothing at all, which is a good illustration of why the algorithm's verdict is binary rather than a margin.

#### Part 3: P1 requests (1, 0, 2)

The resource request algorithm is three checks in a fixed order, and the order matters.

**Check 1: is the request within the declared Need?**

`Request = (1,0,2)`, `Need[P1] = (1,2,2)`

`(1,0,2) <= (1,2,2)` componentwise. **Passes.**

If this failed, the process has asked for more than the maximum it declared, which is not a resource shortage but a programming error, and the correct response is to raise an error rather than to make it wait.

**Check 2: are the resources actually free?**

`Available = (3,3,2)`

`(1,0,2) <= (3,3,2)` componentwise. **Passes.**

If this failed, P1 simply blocks until resources are released. No safety question arises.

**Check 3: would the resulting state be safe?**

Tentatively apply the request and recompute:

| | Before | Change | After |
| :--- | :---: | :---: | :---: |
| `Available` | (3, 3, 2) | minus (1,0,2) | **(2, 3, 0)** |
| `Allocation[P1]` | (2, 0, 0) | plus (1,0,2) | **(3, 0, 2)** |
| `Need[P1]` | (1, 2, 2) | minus (1,0,2) | **(0, 2, 0)** |

Now run the safety algorithm on that hypothetical state, `Work = [2, 3, 0]`.

| Round | Work before | Process | Need | Allocation released | Work after |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | (2, 3, 0) | **P1** | (0, 2, 0) | (3, 0, 2) | (5, 3, 2) |
| 2 | (5, 3, 2) | **P3** | (0, 1, 1) | (2, 1, 1) | (7, 4, 3) |
| 3 | (7, 4, 3) | **P0** | (7, 4, 3) | (0, 1, 0) | (7, 5, 3) |
| 4 | (7, 5, 3) | **P2** | (6, 0, 0) | (3, 0, 2) | (10, 5, 5) |
| 5 | (10, 5, 5) | **P4** | (4, 3, 1) | (0, 0, 2) | (10, 5, 7) |

Note round 1: with `Work = (2,3,0)`, P0, P2, P3 and P4 all fail, because C has dropped to zero and P3 needs one of it while P0, P2 and P4 need more A than is free. The only process that fits is **P1 itself**, whose remaining Need is now just (0,2,0). That is the structural reason the grant is safe: the request moved P1 close enough to its maximum that P1 becomes the engine of the whole sequence.

**All five complete, the state is safe, so the request is granted.** Safe sequence `P1, P3, P0, P2, P4`.

#### Part 4: a request that gets refused, for contrast

The algorithm is only interesting if it ever says no, so take `P4 requests (3, 3, 0)` from the original state.

**Check 1:** `(3,3,0) <= Need[P4] = (4,3,1)`. Passes.
**Check 2:** `(3,3,0) <= Available = (3,3,2)`. Passes, exactly.

So a naive allocator grants it: the process is within its declared limit and the resources are physically free. Now check 3.

| | Before | After |
| :--- | :---: | :---: |
| `Available` | (3, 3, 2) | **(0, 0, 2)** |
| `Allocation[P4]` | (0, 0, 2) | **(3, 3, 2)** |
| `Need[P4]` | (4, 3, 1) | **(1, 0, 1)** |

Safety algorithm with `Work = (0, 0, 2)`:

| Process | Need | Fits in (0,0,2)? |
| :---: | :---: | :--- |
| P0 | (7, 4, 3) | no |
| P1 | (1, 2, 2) | no |
| P2 | (6, 0, 0) | no |
| P3 | (0, 1, 1) | no, B is exhausted |
| P4 | (1, 0, 1) | no, A is exhausted |

**Not one process can proceed. The state is unsafe and the request is denied**, so P4 waits even though the resources are sitting there unused.

This is the case that shows what the algorithm is for and what it costs. **A simple allocator would have granted it and the system might well have been fine**, because these are maximum claims and processes often do not reach them. But the system would no longer have been able to prove it was fine, and the Banker's Algorithm refuses to be in that position. **Denying a request that would have been harmless is the price of never deadlocking**, and if an interviewer presses on whether that is a good trade, the honest answer is that for a bank it is and for a general-purpose kernel it is not.

#### Verify it

```python
"""
Banker's Algorithm: Need and Available, the safety check, and request
evaluation, plus an exhaustive count of the safe sequences.
"""
from itertools import permutations

TOTAL = [10, 5, 7]
ALLOC = {"P0": [0, 1, 0], "P1": [2, 0, 0], "P2": [3, 0, 2],
         "P3": [2, 1, 1], "P4": [0, 0, 2]}
MAX = {"P0": [7, 5, 3], "P1": [3, 2, 2], "P2": [9, 0, 2],
       "P3": [2, 2, 2], "P4": [4, 3, 3]}
M = len(TOTAL)


def le(a, b):
    """Componentwise less-than-or-equal, which is what every check uses."""
    return all(x <= y for x, y in zip(a, b))


def available(alloc):
    return [TOTAL[j] - sum(a[j] for a in alloc.values()) for j in range(M)]


def need(alloc):
    return {p: [MAX[p][j] - alloc[p][j] for j in range(M)] for p in alloc}


def safety(alloc):
    """Returns (is_safe, sequence, rounds, final_work)."""
    work, nd = available(alloc), need(alloc)
    done, seq, rounds = set(), [], []
    while len(done) < len(alloc):
        for p in sorted(alloc):                  # index order, for determinism
            if p not in done and le(nd[p], work):
                before = list(work)
                work = [work[j] + alloc[p][j] for j in range(M)]
                rounds.append((p, nd[p], before, list(alloc[p]), list(work)))
                done.add(p)
                seq.append(p)
                break
        else:
            return False, seq, rounds, work      # nobody can proceed
    return True, seq, rounds, work


def show_rounds(rounds, indent="  "):
    for p, nd_p, before, released, after in rounds:
        print(f"{indent}{p}: Need {nd_p} <= Work {before}, "
              f"releases {released} -> Work {after}")


def evaluate(alloc, p, req):
    nd, avail = need(alloc), available(alloc)
    print(f"\n-- {p} requests {req}    Need[{p}] = {nd[p]}, Available = {avail}")

    if not le(req, nd[p]):
        print("   check 1 FAILS: request exceeds the declared Max")
        print("   -> error, not a wait: the process broke its own claim")
        return
    print("   check 1 passes: request <= Need")

    if not le(req, avail):
        print("   check 2 FAILS: resources are not free")
        print("   -> block until released, no safety question arises")
        return
    print("   check 2 passes: request <= Available")

    trial = {k: list(v) for k, v in alloc.items()}
    trial[p] = [trial[p][j] + req[j] for j in range(M)]
    print(f"   tentative state: Alloc[{p}] = {trial[p]}, "
          f"Need[{p}] = {need(trial)[p]}, Available = {available(trial)}")

    ok, seq, rounds, work = safety(trial)
    show_rounds(rounds, indent="     ")
    if ok:
        print(f"   check 3 passes -> GRANT.  safe sequence "
              f"{' -> '.join(seq)}")
    else:
        print(f"   check 3 FAILS -> DENY.  completed {seq or 'nothing'}, "
              f"Work stuck at {work}")
        for q in sorted(trial):
            if q not in seq:
                print(f"     {q} blocked: Need {need(trial)[q]} > {work}")


if __name__ == "__main__":
    nd, avail = need(ALLOC), available(ALLOC)

    print("Total     =", TOTAL)
    print("Allocated =", [sum(a[j] for a in ALLOC.values()) for j in range(M)])
    print("Available =", avail)
    print("\n  P    Alloc        Max          Need")
    for p in sorted(ALLOC):
        print(f"  {p}   {ALLOC[p]}    {MAX[p]}    {nd[p]}")

    total_need = [sum(nd[p][j] for p in nd) for j in range(M)]
    print(f"\ntotal outstanding Need {total_need} against Available {avail}:")
    print("  the system cannot satisfy everyone at once, which is not the test")

    starters = [p for p in sorted(ALLOC) if le(nd[p], avail)]
    print(f"processes whose Need already fits in Available: {starters}")
    print("  any safe sequence must begin with one of these")

    ok, seq, rounds, work = safety(ALLOC)
    print(f"\n-- safety of the initial state: "
          f"{'SAFE' if ok else 'UNSAFE'}")
    show_rounds(rounds)
    print(f"  sequence {' -> '.join(seq)}, final Work {work}")
    assert work == TOTAL, "resources leaked or appeared"

    evaluate(ALLOC, "P1", [1, 0, 2])      # granted
    evaluate(ALLOC, "P4", [3, 3, 0])      # denied, and nothing can proceed

    # The safe sequence is not unique: count them all by brute force.
    safe = []
    for perm in permutations(sorted(ALLOC)):
        work = list(avail)
        if all(le(nd[p], work) and
               [work.__setitem__(j, work[j] + ALLOC[p][j]) for j in range(M)]
               for p in perm):
            safe.append(perm)
    print(f"\n-- {len(safe)} of 120 orderings are safe, so the sequence is "
          f"not unique")
    print(f"   possible first processes: "
          f"{sorted({s[0] for s in safe})}")
    for s in safe[:4]:
        print("     " + " -> ".join(s))
```

---

### What they ask next

**"The outstanding Need totals (18, 10, 7) and Available is (3, 3, 2). How can this be safe?"**
Because safety is not "can I satisfy everyone at once", it is "does an ordering exist in which everyone could be satisfied in turn". The lever is that **a process whose entire remaining Need is met completes and releases everything it holds**, so funding one process makes the pool bigger rather than smaller. P1 needs (1,2,2), gets it from (3,3,2), and returns (2,0,0), leaving (5,3,2). The induction then continues. **The system never needs enough for everybody, only enough for somebody.**

**"Is the safe sequence unique?"**
No. Sixteen of the 120 orderings are safe here, and `P1, P3, P0, P2, P4` and `P1, P3, P4, P0, P2` are both valid. The algorithm needs only one because one is a sufficient proof of safety. All sixteen begin with P1 or P3, because those are the only processes whose Need already fits in Available, which is also the cheapest possible first check: **if no process's Need fits in Available, the state is unsafe immediately.**

**"What is the difference between an unsafe state and a deadlocked state?"**
An **unsafe state** is one from which deadlock is possible; a deadlocked state is one in which it has already happened. Every deadlocked state is unsafe, but most unsafe states are not deadlocked and may never become so, because the algorithm assumes every process will claim its full **Max** and most do not. So the refusal of P4's request for (3,3,0) does not mean granting it would have deadlocked; it means the system could no longer have proved it would not. **The algorithm refuses to rely on luck, and pays for that in denied requests that would have been harmless.**

**"Why does the request algorithm have three checks in that order?"**
Because the three failures mean different things and demand different responses. Failing `Request <= Need` means the process has exceeded the maximum it itself declared, which is a **programming error** and should raise rather than block. Failing `Request <= Available` is an ordinary shortage, and the process simply waits with no safety question involved. Only the third check, the hypothetical safety run, is the Banker's contribution, and running it first would be both wrong and wasteful.

**"Is this prevention, avoidance, or detection?"**
**Avoidance**, and the distinction is the point. **Deadlock prevention** structurally negates one of the four **Coffman conditions**, for instance by requiring all resources up front, which kills hold and wait, or by imposing a global lock order, which kills circular wait. The Banker's Algorithm negates none of them; it permits the dangerous structure and uses advance knowledge of Max to steer around states where it could bite. **Detection** allows deadlock and then finds the cycle and kills a victim. Calling the Banker's Algorithm prevention is a common and visible error.

**"What does it cost to run?"**
`O(n^2 * m)` for one safety check, since up to `n` rounds each scan up to `n` processes comparing `m` components. The problem here is 5 by 3 and trivial, but the check runs on every allocation request, so with thousands of threads and a mutex per object you are running a quadratic scan on every lock acquisition. That is the performance objection, and it is secondary to the real one.

**"So why does no real kernel use it?"**
Because of **Max**. The algorithm requires each process to declare, in advance, the maximum of every resource type it will ever hold simultaneously, and a process genuinely does not know: how many file descriptors it opens depends on what the user does next. Three further mismatches follow. The set of processes is **dynamic**, with processes forking and exiting constantly, where the algorithm assumes a fixed `n`. The set of resources is dynamic too, with devices appearing and disappearing. And **a process may never finish**, where the induction assumes that a process given its Max completes and releases, so a process that blocks forever on the network invalidates the proof.

**"What is used instead?"**
Mostly prevention by convention plus detection as a backstop. Kernels impose a documented **lock ordering** so cycles cannot form, which is prevention by killing circular wait and costs nothing at runtime; Linux's lockdep validates it dynamically in debug builds. Databases, which do know their resource graph, use **detection**: they build a wait-for graph, find cycles, and abort the cheapest transaction as a deadlock victim, which is viable because a transaction can be rolled back and a process generally cannot. And some resources are simply made preemptible, as memory is by paging, which removes the no-preemption condition.

**"Round 3 of the safety check has zero slack. Does that matter?"**
Not to the verdict. P0's Need of (7,4,3) is met by a Work of exactly (7,4,3) on all three resources, so the state is safe by nothing at all, and safety is binary rather than a margin. It is worth noticing because it shows how tight these states can be and why granting a request that looks harmless can flip the verdict: P4's request for (3,3,0) removes exactly the slack that the sequence depended on.

**The common wrong answer** is declaring the state unsafe because the outstanding Need exceeds Available, which mistakes "can everyone be paid now" for "does an order exist in which everyone could be". Next is granting P4's (3,3,0) because it passes both of the easy checks, which is precisely the trap the third check exists for. Third is calling the algorithm deadlock prevention rather than avoidance. And fourth is presenting a safe sequence as unique, when sixteen exist here and the algorithm only ever needed one.

---

### Say this in the interview

*"First the two derived structures. Available is Total minus the column sums of Allocation: allocated is seven, two, five, so Available is three, three, two. Need is Max minus Allocation row by row: P0 is seven, four, three; P1 is one, two, two; P2 is six, zero, zero; P3 is zero, one, one; P4 is four, three, one.*

*Before running anything I would point at two things. The total outstanding Need is eighteen, ten, seven against an Available of three, three, two, so the system cannot satisfy everybody at once and is nowhere near it. If safety meant covering all claims now, this state would be unsafe. It is safe, and that is the clearest way to say what safety actually is: not whether everyone can be paid at once, but whether an order exists in which everyone could be. The lever is that a process whose entire remaining Need is met completes and releases everything it holds, so funding one process makes the pool bigger rather than smaller. The system never needs enough for everybody, only enough for somebody. And the second thing: only P1 and P3 have a Need that fits inside Available, so any safe sequence has to start with one of those, and if neither had fitted the state would have been unsafe immediately with no search at all. That is the cheapest check available.*

*Running the safety algorithm with Work equal to three, three, two. P1 needs one, two, two, which fits, so assume it completes and releases two, zero, zero, giving Work of five, three, two. P3 needs zero, one, one, fits, releases two, one, one, Work becomes seven, four, three. P0 needs exactly seven, four, three, which fits with zero slack on all three resources, releases zero, one, zero, Work seven, five, three. P2 needs six, zero, zero, fits, releases three, zero, two, Work ten, five, five. P4 needs four, three, one, fits, releases zero, zero, two, and Work returns to ten, five, seven, which is Total, so nothing leaked. The system is safe, with safe sequence P1, P3, P0, P2, P4. I would add that the sequence is not unique: sixteen of the hundred and twenty orderings are safe, P1, P3, P4, P0, P2 among them, and the algorithm only needs one because one is a sufficient proof.*

*For P1's request of one, zero, two, the resource request algorithm is three checks in a fixed order and the order matters because the failures mean different things. Check one, is the request within the declared Need: one, zero, two is at most one, two, two, so yes. If that failed it would be a programming error, the process exceeding its own declared Max, and the right response is to raise rather than to block. Check two, are the resources free: one, zero, two is at most three, three, two, so yes. If that failed the process just waits and no safety question arises. Check three is the actual Banker's contribution. Tentatively apply it: Available becomes two, three, zero, P1's Allocation becomes three, zero, two, and P1's Need drops to zero, two, zero. Run safety from Work of two, three, zero, and notice that P0, P2, P3 and P4 all fail, because C has gone to zero and P3 needs one of it while the others need more A than is free. The only process that fits is P1 itself, now needing only zero, two, zero, and that is the structural reason the grant works: the request pushed P1 close enough to its Max that it becomes the engine of the whole sequence. P1 then releases three, zero, two, Work becomes five, three, two, and the rest follows exactly as before. Safe, so grant.*

*If they want the contrast, take P4 requesting three, three, zero. It passes check one, since that is within its Need of four, three, one, and it passes check two exactly, since Available is three, three, two. So a naive allocator grants it. But tentatively applying it leaves Available at zero, zero, two, and then not one process can proceed: P3 needs a B and there are none, P4 itself needs an A and there are none, and the rest need far more. Unsafe, so denied, and P4 waits while resources sit unused. That is worth being honest about: granting it might well have been fine, because these are maximum claims and processes usually do not reach them. The system just could not have proved it any more. Denying a harmless request is the price of never deadlocking.*

*Which brings me to classification and to why nobody runs this. It is deadlock avoidance, not prevention: prevention structurally negates one of the four Coffman conditions, for instance a global lock ordering killing circular wait, whereas the Banker's Algorithm negates none of them and instead uses advance knowledge to steer around the bad states. Detection is the third option, allowing deadlock and then finding the cycle. As for practicality, the fatal input is Max. A process cannot declare in advance the most file descriptors it will ever hold, because that depends on what the user does next. Then the process set is dynamic where the algorithm assumes a fixed n, the resource set is dynamic too, and the induction assumes a process given its Max completes and releases, which a process blocked forever on the network does not. The cost is also quadratic, order n squared times m per safety check, run on every allocation request, which with thousands of threads and a lock per object is prohibitive. So what is actually used is prevention by convention, a documented lock ordering with something like lockdep validating it, plus detection as a backstop in databases, which build a wait-for graph and abort the cheapest transaction, and that works there precisely because a transaction can be rolled back where a process cannot."*
