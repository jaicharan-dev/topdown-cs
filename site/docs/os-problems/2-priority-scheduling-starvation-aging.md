---
id: 2-priority-scheduling-starvation-aging
title: "Priority Scheduling, Starvation and Aging"
description: "The scheduler that optimises nothing: priority is imported from outside, so preemption here makes the averages worse and the lowest rank can wait forever"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given five processes with arrival times, burst times, and priority ranks, calculate execution schedules, Gantt charts, and average waiting times for both Non-Preemptive and Preemptive Priority Scheduling. Identify the starving process, and demonstrate numerically how Aging prevents indefinite postponement."

---

### Picture it

A hospital triage desk, not a queue at a till.

**At the till, the order comes from the shoppers themselves.** You arrived third, so you are third. Your basket has four items, so a smallest-first rule puts you first. Either way the order is a fact about the people standing there, and it can be computed from them.

**At the triage desk, the order comes from the hospital.** A nurse looks at you and assigns a category. That category is not a measurement of you in the way your basket size is; it is a judgement about what the hospital cares about. Chest pain outranks a sprained wrist, and it outranks it whether the chest pain takes two minutes or two hours to deal with.

This difference is the whole page, and it has two consequences people miss.

**The first is that this scheduler is not trying to be efficient, so do not expect it to be.** Shortest-first lowers the average wait because basket size and waiting are the same currency; serving a small basket first is directly a smaller delay for everyone behind. Triage category is not in that currency at all. A high priority process can have an enormous burst. So when you turn preemption on here, there is no reason for the averages to improve, and on this dataset **they get worse**. Nobody expects that, and it is the most interesting number on the page.

**The second is that a sprained wrist can wait forever, and this is a different failure from waiting a long time.** At the till, however slowly the queue moves, it strictly drains: the person in front of you leaves and is never replaced by someone who was behind you. Your turn is approaching even when it does not feel like it. **A queue drains. A priority order does not.** At the triage desk, every new chest pain that walks through the door goes in front of you, and nothing about having already waited three hours changes that. There is no mechanism by which your turn arrives.

So the fix cannot be "be more patient" or "make the queue faster". It has to be a mechanism that **converts waiting into standing**, so that having waited is itself a claim on the CPU. That is aging, and once you see starvation as the absence of such a mechanism rather than as slowness, the fix is the only thing it could have been.

---

### The proper terms

#### The convention, and why it bites

**Priority** here is an integer where **a lower number means a higher priority**, so 1 outranks 4. This is the usual convention in textbooks and in Linux's internal priority arrays, and it is also the reverse of what the word "higher" suggests in English. State which way round you are reading it before you start, because an interviewer who sees you silently pick the wrong direction cannot tell whether you misread the table or misunderstand the algorithm.

**External priority** is assigned from outside the process's own behaviour: by an administrator, by the user, by the job's importance to the business. The **nice value** on Unix is the user-facing form of this, running from -20 for the most favoured to +19 for the least.

**Internal priority** is derived by the kernel from measurable properties such as recent CPU usage or memory footprint. Pure priority scheduling as posed in this problem uses external priority, which is why it has no efficiency guarantee.

**Static priority** never changes for the lifetime of the process. **Dynamic priority** is recomputed as the process runs, and aging is the special case of making it depend on how long the process has been waiting.

#### The tie-breaking rule

When two runnable processes hold the same priority, this problem breaks the tie by **arrival time**, earlier first. This matters at exactly one point in the non-preemptive trace and it decides the entire answer, so say the rule aloud before you use it. Round Robin within a priority level is the other common convention, and it is what real multilevel queue schedulers do.

#### Preemption, and the thing it does not buy you

**Non-preemptive priority scheduling** chooses at every dispatch point and then lets the chosen process run to completion. **Preemptive priority scheduling** additionally re-decides whenever a process arrives, and takes the CPU away if the arrival strictly outranks the running process.

Note the word **strictly**. An arriving process that merely ties with the running one does not preempt it, because preempting on a tie would thrash the CPU between equals for no gain. P4 arriving at t = 4 while P2 runs is exactly this case.

Here is the part worth carrying away. In shortest-remaining-time-first, preemption improves the averages because the thing being compared, remaining time, is the same quantity as the thing being optimised, waiting. Priority is not. **Priority scheduling has no optimality property at all**: it enforces a policy rather than minimising a metric, and preemption makes it enforce that policy more aggressively, not more cheaply. On this dataset that costs 0.2 ms of average waiting.

#### Starvation, and what it is not

**Starvation**, also called **indefinite postponement**, is a runnable process never being dispatched because the scheduler keeps finding a candidate it prefers. The key word is indefinite: the wait has no bound that can be computed from the process itself, because it depends on arrivals that have not happened yet.

Distinguish it from two neighbours that get confused with it in interviews.

**Deadlock** is a set of processes each blocked on a resource another holds, so none of them is runnable. A starving process is perfectly runnable; it is just never chosen. Deadlock needs a cycle, starvation needs no cycle at all.

**Priority inversion** is a high priority process blocked on a lock held by a low priority process that cannot run to release it. The victim there is the high priority process, which is the opposite of starvation, and the fix is priority inheritance rather than aging.

#### Aging

**Aging** raises a waiting process's **effective priority** with elapsed waiting time, so that waiting itself becomes a claim. Where `k` is the milliseconds of waiting that buy one level:

$$\text{Priority}_{\text{eff}}(t) = \max\Big(1,\; \text{Priority}_{\text{init}} - \Big\lfloor \frac{t - t_{\text{ready}}}{k} \Big\rfloor\Big)

$$

Two implementation details carry the idea.

**The effective priority must reset when the process is dispatched.** If an aged process keeps its promoted rank, it has permanently inverted the policy you set out to enforce, and a batch job that waited once now outranks interactive work forever.

**Aging converts an unbounded wait into a bounded one, which is the entire claim.** A process starting at priority `p` reaches the top rank after at most `(p - 1) * k` milliseconds of waiting, after which the tie-break by arrival time guarantees it beats any newer arrival at that rank. Its wait is then bounded by that figure plus the remaining burst of whatever is running. **It is not a speed improvement, it is a liveness guarantee.**

---

### Work it out

#### The dataset

| Process | Arrival Time (AT) | Burst Time (BT) | Priority |
| :---: | :---: | :---: | :---: |
| **P1** | 0 ms | 4 ms | 3 |
| **P2** | 1 ms | 3 ms | 1 (highest) |
| **P3** | 2 ms | 5 ms | 2 |
| **P4** | 4 ms | 2 ms | 1 (highest) |
| **P5** | 5 ms | 6 ms | 4 (lowest) |

Lower number means higher priority. Ties go to the earlier arrival.

Total burst is 4 + 3 + 5 + 2 + 6 = 20 ms, and P1 arrives at t = 0 with work never running out, so **both schedules below occupy the CPU continuously and both end at t = 20**. As with every scheduling problem, the algorithm is choosing a distribution of waiting, not a total.

#### Part 1: non-preemptive

**t = 0:** only P1 has arrived, so P1 runs despite being priority 3, and it runs to completion at t = 4.
**t = 4:** the ready queue holds P2 (priority 1, arrived 1), P3 (priority 2, arrived 2) and P4 (priority 1, arrived 4). P5 has not arrived yet. **P2 and P4 tie at priority 1, and P2 arrived earlier**, so P2 runs 4 to 7.
**t = 7:** ready are P4 (1), P3 (2) and P5 (4). P4 runs 7 to 9.
**t = 9:** ready are P3 (2) and P5 (4). P3 runs 9 to 14.
**t = 14:** only P5 remains. P5 runs 14 to 20.

`P1 (0-4)  P2 (4-7)  P4 (7-9)  P3 (9-14)  P5 (14-20)`

```
      0    5    10   15   20
      |    |    |    |    |
P1    ####
P2        ###
P3             #####
P4           ##
P5                  ######
```

| Process | AT | BT | Prio | CT | TAT = CT - AT | WT = TAT - BT |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 | 4 | 3 | 4 | 4 - 0 = 4 | 4 - 4 = 0 |
| **P2** | 1 | 3 | 1 | 7 | 7 - 1 = 6 | 6 - 3 = 3 |
| **P4** | 4 | 2 | 1 | 9 | 9 - 4 = 5 | 5 - 2 = 3 |
| **P3** | 2 | 5 | 2 | 14 | 14 - 2 = 12 | 12 - 5 = 7 |
| **P5** | 5 | 6 | 4 | 20 | 20 - 5 = 15 | 15 - 6 = 9 |

Average turnaround: (4 + 6 + 5 + 12 + 15) / 5 = 42 / 5 = **8.40 ms**
Average waiting: (0 + 3 + 3 + 7 + 9) / 5 = 22 / 5 = **4.40 ms**

The trap is t = 0 again, and it is worse here than in the shortest-job problem. P1 is priority 3, the third rank of four, and two processes that outrank it arrive within two milliseconds. It still runs first, and it still runs for its full four milliseconds, because **at t = 0 it is the only candidate and non-preemptive means non-preemptive.** An answer that starts with P2 has let the scheduler see the future.

#### Part 2: preemptive

**t = 0:** P1 begins, priority 3.
**t = 1:** P2 arrives at priority 1. One is strictly less than three, so **P2 preempts P1**, leaving P1 with 3 ms remaining.
**t = 2:** P3 arrives at priority 2. Two is not less than one, so P2 continues.
**t = 4:** P4 arrives at priority 1, which **ties** P2 rather than beating it, so there is no preemption. P2 completes at t = 4 in any case.
**t = 4:** ready are P4 (1), P3 (2) and P1 (3, with 3 ms remaining). P4 runs 4 to 6.
**t = 5:** P5 arrives at priority 4 and does not preempt.
**t = 6:** ready are P3 (2), P1 (3, 3 ms remaining) and P5 (4). P3 runs 6 to 11.
**t = 11:** ready are P1 (3, 3 ms remaining) and P5 (4). P1 resumes and runs 11 to 14.
**t = 14:** only P5 remains. P5 runs 14 to 20.

`P1 (0-1)  P2 (1-4)  P4 (4-6)  P3 (6-11)  P1 (11-14)  P5 (14-20)`

```
      0    5    10   15   20
      |    |    |    |    |
P1    #              ###
P2     ###
P3          #####
P4        ##
P5                  ######
```

| Process | AT | BT | Prio | CT | TAT = CT - AT | WT = TAT - BT |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 | 4 | 3 | 14 | 14 - 0 = 14 | 14 - 4 = 10 |
| **P2** | 1 | 3 | 1 | 4 | 4 - 1 = 3 | 3 - 3 = 0 |
| **P4** | 4 | 2 | 1 | 6 | 6 - 4 = 2 | 2 - 2 = 0 |
| **P3** | 2 | 5 | 2 | 11 | 11 - 2 = 9 | 9 - 5 = 4 |
| **P5** | 5 | 6 | 4 | 20 | 20 - 5 = 15 | 15 - 6 = 9 |

Average turnaround: (14 + 3 + 2 + 9 + 15) / 5 = 43 / 5 = **8.60 ms**
Average waiting: (10 + 0 + 0 + 4 + 9) / 5 = 23 / 5 = **4.60 ms**

#### Preemption made it worse, and that is the point

| Mode | Avg TAT | Avg WT | Avg response | Makespan |
| :--- | :---: | :---: | :---: | :---: |
| **Non-preemptive priority** | **8.40 ms** | **4.40 ms** | 4.40 ms | 20 ms |
| **Preemptive priority** | 8.60 ms | 4.60 ms | **2.60 ms** | 20 ms |

Most candidates assert that preemption improves the averages, because that is what happens when you go from shortest-job-first to shortest-remaining-time-first. Here it does the opposite, and the ledger shows exactly why.

| Process | WT non-preemptive | WT preemptive | Change |
| :---: | :---: | :---: | :---: |
| **P1** | 0 | 10 | **+10** |
| **P2** | 3 | 0 | -3 |
| **P3** | 7 | 4 | -3 |
| **P4** | 3 | 0 | -3 |
| **P5** | 9 | 9 | 0 |
| **Total** | 22 | 23 | **+1** |

Three processes each saved 3 ms, and P1 alone paid 10. The reason is that **the criterion and the objective are unrelated**. In shortest-remaining-time-first, preempting a long job for a short one is guaranteed to pay, because the quantity being compared is the quantity being minimised. Here the scheduler preempted P1 for P2 on grounds of rank, and rank says nothing about burst, so the cost of the swap was never bounded by anything.

The column where preemption does win is response time, from arrival to first dispatch: 2.60 ms against 4.40 ms, because high priority work starts almost immediately instead of waiting out whatever happened to be dispatched. **Preemptive priority is bought for responsiveness of the favoured class, and paid for by everyone else.** That is a reasonable trade for a real-time system and a poor one for a batch system, which is the actual answer to which is better.

For both non-preemptive rows, average response equals average waiting, since a process dispatched once runs to the end and all of its waiting precedes it.

#### Part 3: the starving process

**P5 is the victim**, at priority 4, the lowest rank in the system.

On this dataset P5 does eventually run, at t = 14, because the arrival list is finite and the system drains. That is an artefact of the problem, not a property of the algorithm, and claiming P5 starves *here* is wrong. **The correct statement is conditional:** P5's wait is bounded by nothing except the absence of further arrivals, so under any sustained load of higher-ranked work it never runs at all.

Make it concrete. Suppose that from t = 5 onward a priority 1 process arrives every 2 ms with a 2 ms burst. The CPU is then saturated with priority 1 work forever, and:

- P5 at priority 4 is never the highest-ranked ready process at any dispatch point.
- P5 has waited 3 ms, 300 ms, 3,000,000 ms. **None of that is an input to the decision.**
- P5 is runnable the entire time. It is not blocked, not deadlocked, not waiting on I/O. It is simply never chosen.

That last line is the definition worth saying out loud, because it separates starvation from deadlock cleanly: **a deadlocked process cannot run, a starving process is never asked to.**

#### Part 4: aging, with the bound computed

Let the kernel subtract one priority level for every `k = 3 ms` a process spends ready and not running, clamped at the top rank of 1. P5 becomes ready at t = 5 at priority 4.

| Elapsed waiting | Wall clock | floor(wait / 3) | Effective priority |
| :---: | :---: | :---: | :---: |
| 0 ms | t = 5 | 0 | 4 |
| 3 ms | t = 8 | 1 | 3 |
| 6 ms | t = 11 | 2 | 2 |
| 9 ms | t = 14 | 3 | **1** |
| 12 ms | t = 17 | 4 | 1 (clamped) |

At t = 14, P5 holds effective priority 1, and it **wins the tie** against every priority 1 arrival in the saturated scenario, because the tie-break is arrival time and P5 arrived at t = 5, earlier than anything that turned up afterwards. So P5 is dispatched at the first dispatch point at or after t = 14.

The general bound, which is the thing the interviewer is listening for:

`worst-case wait  =  (Priority_init - 1) * k  +  remaining burst of the process running at that moment`

For P5 that is (4 - 1) × 3 = 9 ms of ageing plus at most one burst. **Unbounded has become bounded, and that is the whole of what aging buys.** It did not make P5 faster and it did not make the system more efficient; the average waiting time under aging is generally worse, because you are deliberately dispatching low-ranked work ahead of high-ranked work in order to keep a promise about liveness.

Two things to get right if asked to implement it:

**Reset the effective priority on dispatch.** Otherwise P5 keeps rank 1 forever and you have permanently inverted the policy, which is a worse bug than the starvation you set out to fix.

**Choose `k` against the load, not against the arithmetic.** Too large and the bound is useless; too small and every process reaches the top rank before any real high priority work can run, which is just FCFS with extra bookkeeping.

#### Verify it

```python
"""
Priority scheduling: non-preemptive, preemptive, and preemptive with aging
under a saturating stream of high-priority arrivals.
Lower priority number means higher priority. Ties break on arrival time.
"""

# (name, arrival, burst, priority)
PROCS = [("P1", 0, 4, 3), ("P2", 1, 3, 1), ("P3", 2, 5, 2),
         ("P4", 4, 2, 1), ("P5", 5, 6, 4)]


def report(name, timeline, procs):
    ct, first = {}, {}
    for p, s, e in timeline:
        ct[p] = e
        first.setdefault(p, s)
    print(f"\n{name}")
    print("  " + "  ".join(f"{p}({s}-{e})" for p, s, e in timeline))
    print(f"  {'P':<4}{'AT':>4}{'BT':>4}{'PR':>4}{'CT':>5}{'TAT':>6}{'WT':>5}{'RT':>5}")
    rows = []
    for n, at, bt, pr in procs:
        tat = ct[n] - at
        rows.append((tat, tat - bt, first[n] - at))
        print(f"  {n:<4}{at:>4}{bt:>4}{pr:>4}{ct[n]:>5}{tat:>6}{tat-bt:>5}"
              f"{first[n]-at:>5}")
    k = len(rows)
    print(f"  avg TAT {sum(r[0] for r in rows)/k:.2f}  "
          f"avg WT {sum(r[1] for r in rows)/k:.2f}  "
          f"avg RT {sum(r[2] for r in rows)/k:.2f}  "
          f"makespan {max(ct.values())}")


def non_preemptive(procs):
    pending, t, timeline = list(procs), 0, []
    while pending:
        ready = [p for p in pending if p[1] <= t]
        if not ready:
            t = min(p[1] for p in pending)
            continue
        pick = min(ready, key=lambda p: (p[3], p[1]))     # priority, then arrival
        timeline.append((pick[0], t, t + pick[2]))
        t += pick[2]
        pending.remove(pick)
    return timeline


def preemptive(procs):
    """Unit-time simulation; adjacent identical slices are merged afterwards."""
    rem = {n: bt for n, _, bt, _ in procs}
    at = {n: a for n, a, _, _ in procs}
    pr = {n: p for n, _, _, p in procs}
    t, slices = 0, []
    while any(v > 0 for v in rem.values()):
        ready = [n for n in rem if at[n] <= t and rem[n] > 0]
        if not ready:
            t += 1
            continue
        pick = min(ready, key=lambda n: (pr[n], at[n]))
        slices.append((pick, t, t + 1))
        rem[pick] -= 1
        t += 1
    merged = []
    for p, s, e in slices:
        if merged and merged[-1][0] == p and merged[-1][2] == s:
            merged[-1] = (p, merged[-1][1], e)
        else:
            merged.append((p, s, e))
    return merged


def starvation_demo(k=None, horizon=400):
    """
    P5 is ready at t=5 at priority 4. From t=5 a priority-1 job with a 2ms
    burst arrives every 2ms, so the CPU is saturated with rank-1 work.
    With k=None there is no aging; with k set, one level is earned per k ms.
    Returns the instant P5 is first dispatched, or None.
    """
    jobs = {"P5": {"ready": 5, "rem": 6, "base": 4}}
    nxt = 0
    for t0 in range(5, horizon, 2):                       # the saturating stream
        nxt += 1
        jobs[f"H{nxt}"] = {"ready": t0, "rem": 2, "base": 1}

    def eff(n, t):
        base = jobs[n]["base"]
        if k is None:
            return base
        return max(1, base - (t - jobs[n]["ready"]) // k)

    t = 5
    while t < horizon:
        ready = [n for n, j in jobs.items() if j["ready"] <= t and j["rem"] > 0]
        if not ready:
            t += 1
            continue
        pick = min(ready, key=lambda n: (eff(n, t), jobs[n]["ready"]))
        if pick == "P5":
            return t
        jobs[pick]["rem"] -= 1
        t += 1
    return None


if __name__ == "__main__":
    print("total burst =", sum(bt for _, _, bt, _ in PROCS),
          "ms, so both schedules must end at that instant")
    report("Non-preemptive priority", non_preemptive(PROCS), PROCS)
    report("Preemptive priority", preemptive(PROCS), PROCS)

    print("\nStarvation under a saturating rank-1 stream from t = 5:")
    print("  no aging        -> P5 first dispatched at:", starvation_demo(None))
    for k in (3, 5, 10):
        got = starvation_demo(k)
        bound = (4 - 1) * k + 5          # (prio-1)*k of ageing, from t = 5
        print(f"  aging k = {k:<2}     -> P5 first dispatched at: {got}"
              f"   (predicted no later than {bound} plus one burst)")
```

---

### What they ask next

**"Why did preemption make the averages worse? That is not what happens with SRTF."**
Because in shortest-remaining-time-first the quantity compared is the quantity minimised, so a preemption is guaranteed to pay. Priority is imported from outside and says nothing about burst length, so **priority scheduling has no optimality property**; it enforces a policy. Here it preempted P1 for P2 on rank, three processes saved 3 ms each, and P1 alone paid 10 ms. The column that does improve is response time, 2.60 ms against 4.40 ms, which is what preemptive priority is actually bought for.

**"Why does P1 run first when two higher-priority processes arrive almost immediately?"**
Because at t = 0 it is the only process that has arrived, and a scheduler cannot dispatch a process that does not exist. Under the non-preemptive rule it then holds the CPU for its full 4 ms even though P2 and P3 are both waiting by t = 2. This single point decides both schedules, and starting the Gantt chart with P2 is the commonest error on this problem.

**"P4 arrives while P2 is running and they are both priority 1. Why no preemption?"**
Because the rule is that an arrival preempts only if it is **strictly** higher priority. Preempting on a tie would bounce the CPU between equal-ranked processes and pay a context switch for nothing. In a real multilevel queue the processes within one level are typically round-robined instead, which is preemption on a clock rather than on arrival.

**"Is P5 actually starving in this problem?"**
No, and saying so is a trap. P5 runs at t = 14 because the arrival list is finite and the system drains. P5 is the **candidate** for starvation as the lowest-ranked process, and the correct claim is conditional: its wait is bounded by nothing except the absence of further arrivals, so under sustained higher-ranked load it never runs. Starvation is about the absence of a bound, not about a long wait that you can point to.

**"How is starvation different from deadlock?"**
A deadlocked process is blocked, holding a resource and waiting on one another process holds, so there is a cycle and none of them is runnable. **A starving process is perfectly runnable and simply never chosen.** No cycle, no resource involved, no blocking. Deadlock is detected by finding the cycle; starvation cannot be detected that way at all, because nothing is wrong with any individual process's state.

**"And how is it different from priority inversion?"**
The victim is the other way round. In **priority inversion** a high priority process is blocked on a lock held by a low priority process that cannot get the CPU to release it, so the high priority process is effectively demoted to the low one's rank. The fix is priority inheritance, temporarily lending the holder the waiter's priority. Aging does not help there, and inheritance does not help starvation.

**"Give me the aging bound."**
A process starting at priority `p` with `k` milliseconds per level reaches the top rank after at most `(p - 1) * k` milliseconds of waiting, and then wins ties against newer arrivals on arrival time. So the worst case wait is `(p - 1) * k` plus the remaining burst of whatever is running at that instant. For P5 that is 9 ms plus one burst. **It is a liveness guarantee, not a performance improvement**, and the average waiting time under aging is usually slightly worse, which is the price of the guarantee.

**"What breaks if you implement aging naively?"**
Forgetting to reset the effective priority when the process is dispatched. The aged process keeps its promoted rank for the rest of its life, so a batch job that waited once now outranks interactive work permanently and you have inverted the policy you were enforcing. The other failure is choosing `k` badly: too large and the bound is worthless, too small and everything reaches the top rank immediately, which is FCFS with extra bookkeeping.

**"Where does this appear in a real kernel?"**
As **nice values** on Unix, which are external priority exposed to users from -20 to +19, and as the priority arrays in **multilevel feedback queues**, where the kernel derives an internal dynamic priority from observed behaviour instead of trusting a static label. Linux's Completely Fair Scheduler sidesteps priority ordering altogether by tracking accumulated virtual runtime, which gives a liveness property for free: a process that has not run accumulates no runtime and therefore becomes the most deserving candidate, so **aging is built into the metric rather than bolted on**.

**The common wrong answer** is starting either Gantt chart with P2 because it is priority 1, when at t = 0 only P1 has arrived. Close behind is asserting that preemptive priority has better averages, which on this dataset is false and for this algorithm is not guaranteed in general. The third is calling P5 starved outright rather than stating the conditional, and the fourth is describing aging as a way to make low priority processes faster, when it is a bound on waiting that costs average performance to obtain.

---

### Say this in the interview

*"First the convention, because it decides everything: a lower number is a higher priority here, so 1 outranks 4, and ties go to the earlier arrival. And the same framing as any scheduling problem: the bursts total twenty milliseconds, P1 arrives at zero and work never runs out, so the CPU is busy continuously and both schedules end at t = 20. The makespan is fixed; I am choosing a distribution of waiting.*

*Non-preemptive first. At t = 0 only P1 has arrived, so P1 runs even though it is priority 3 and two processes that outrank it arrive within two milliseconds, and non-preemptive means it holds the CPU for its full four. That is the trap in this problem. At t = 4 the ready queue has P2 at priority 1 arriving at one, P4 at priority 1 arriving at four, and P3 at priority 2, so P2 and P4 tie and P2 wins on arrival time, running four to seven. Then P4 seven to nine, P3 nine to fourteen, P5 fourteen to twenty. Average turnaround eight point four, average waiting four point four.*

*Preemptive priority scheduling re-decides on every arrival. P1 starts; at t = 1 P2 arrives at priority 1 against P1's 3, and one is strictly less than three, so P2 preempts and P1 keeps three milliseconds. P3 at priority 2 does not preempt, and P4 at t = 4 merely ties P2 at priority 1, so it does not preempt either, which is worth pointing out because the rule is strictly higher: preempting on a tie would bounce the CPU between equals and pay a context switch for nothing. P2 finishes at four, then P4 four to six, P3 six to eleven, P1 resumes eleven to fourteen, P5 fourteen to twenty. Average turnaround eight point six, average waiting four point six.*

*So preemption made the averages worse, and I would stop on that because it is the interesting result. In shortest-remaining-time-first, preemption always pays, because the quantity being compared is the quantity being minimised. Priority is an external priority imported from outside the process and it says nothing about burst length, so priority scheduling has no optimality property at all. It enforces a policy rather than minimising a metric. The ledger is that P2, P3 and P4 each saved three milliseconds and P1 alone paid ten, because preempting P1 on rank had no bound on its cost. Where preemption does win is response time, from arrival to first dispatch, two point six against four point four, and that is what preemptive priority is actually bought for: responsiveness for the favoured class, paid for by everybody else. Good trade in a real-time system, poor one in a batch system.*

*The starvation candidate is P5 at priority 4, the lowest rank. I would be careful here, because on this dataset P5 does run, at t = 14, since the arrival list is finite and the system drains. The correct statement is conditional: P5's wait is bounded by nothing except the absence of further arrivals. If from t = 5 a priority 1 job with a two millisecond burst arrives every two milliseconds, P5 is never the highest-ranked ready process at any dispatch point, and the fact that it has waited three milliseconds or three million is not an input to the decision. That is indefinite postponement, and the thing to say is that P5 is runnable the whole time. A deadlocked process cannot run; a starving process is never asked to. There is no cycle and no resource involved, which is also how it differs from priority inversion, where the victim is the high priority process blocked on a lock held by a low priority one, and the fix there is priority inheritance rather than aging.*

*Aging fixes it by making waiting itself a claim. Say the kernel subtracts one level for every three milliseconds spent ready and not running, clamped at the top. P5 is ready at t = 5 at priority 4, so it reaches 3 at t = 8, 2 at t = 11 and effective priority 1 at t = 14, and at that point it beats every rank-1 arrival on the arrival-time tie-break because it arrived at five, earlier than anything since. The general bound is priority minus one, times k, plus the remaining burst of whatever is running, so nine milliseconds plus one burst for P5. That is the whole claim: unbounded has become bounded. It is a liveness guarantee, not a performance improvement, and average waiting under aging is usually slightly worse because you are deliberately running low-ranked work ahead of high-ranked work to keep the promise.*

*Two implementation notes if they push. The effective priority has to reset on dispatch, or the aged process keeps its promoted rank for life and you have permanently inverted the policy, which is a worse bug than the starvation. And k has to be chosen against the load: too large and the bound is useless, too small and everything reaches the top rank before real high priority work can run, which is FCFS with extra bookkeeping. In practice this shows up as nice values on Unix and as the priority arrays in multilevel feedback queues, where the kernel derives an internal dynamic priority from observed behaviour rather than trusting a static priority label. Linux's Completely Fair Scheduler avoids the whole problem by tracking accumulated virtual runtime: a process that has not run accumulates none and therefore becomes the most deserving candidate, so aging is built into the metric instead of bolted on."*
