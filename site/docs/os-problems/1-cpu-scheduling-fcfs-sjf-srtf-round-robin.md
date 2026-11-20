---
id: 1-cpu-scheduling-fcfs-sjf-srtf-round-robin
title: "CPU Scheduling: FCFS, SJF, SRTF and Round Robin"
description: "Four schedulers, one dataset, and the fact that all four finish at exactly the same instant: scheduling redistributes waiting, it does not create throughput"

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given four processes with varying arrival times and burst times, construct Gantt charts and compute completion time (CT), turnaround time (TAT), and waiting time (WT) for FCFS, Non-Preemptive SJF, Preemptive SRTF, and Round Robin (q = 3 ms). Why does SRTF achieve minimal average waiting time, and why is it rarely used in production kernels?"

---

### Picture it

One till. Four shoppers who turn up at slightly different times with baskets of different sizes.

**The total amount of scanning is fixed.** Eight items plus four plus nine plus five is twenty six items, and the till can do one item at a time. Nothing a scheduler does changes that number. **If the till never stands idle, the last shopper walks out at the twenty sixth minute no matter what order you serve them in.**

That is the thing worth getting straight before any arithmetic, because it is the part people lose. In this problem all four algorithms finish at t = 26 ms. Every one of them. The scheduler is not making the shop faster. **It is deciding who waits, and for how long.**

So what is actually being traded?

**Serve in arrival order** and it is perfectly fair in one narrow sense: nobody jumps the queue. But the shopper with four items who arrived one minute after a shopper with eight stands there watching eight items get scanned. Worse, the shopper with five items who arrived third ends up behind the one with nine. **A small basket stuck behind a big one waits out the whole big one**, and there is nothing it can do.

**Serve the smallest basket first** and the average wait drops, for a reason you can see on your fingers. Scanning a four item basket makes three other people wait four minutes each. Scanning a nine item basket makes three other people wait nine minutes each. **Short jobs first means the unavoidable waiting gets multiplied by a smaller number.** That is the whole of it.

**Re-check every time someone joins the queue** and you do even better, because now a shopper who turns up with a tiny basket while a big one is halfway scanned can cut in. The big basket is parked mid-scan and resumed later. This is the best possible average, and it is also the version that requires you to know how many items are in a basket before you scan it.

**Give everyone three minutes and rotate** and the averages get worse, noticeably worse. But something else happens that the averages do not show: **every shopper gets served within the first few minutes of arriving.** Nobody stands there for eighteen minutes with no idea whether they have been forgotten. The four item shopper finishes later than they would have under smallest-first, but they started sooner.

That last trade is the one real systems care about, and it is why the algorithm with the worst numbers on this page is the one your laptop actually feels like.

---

### The proper terms

#### The five quantities

Everything on this page is derived from two given numbers and one observed one.

**Arrival time** is when the process entered the ready queue. Given.

**Burst time** is how much uninterrupted CPU time the process needs in total. Given, and in a real kernel unknowable in advance, which matters later.

**Completion time** is the instant the process finishes its last unit of work. This is the only thing you read off the schedule; everything else is arithmetic.

**Turnaround time** is how long the process was in the system from arrival to finish:

`TAT = CT - AT`

**Waiting time** is how much of that turnaround was spent not running:

`WT = TAT - BT`

That second identity is worth stating out loud, because it is the one people re-derive badly under pressure. A process is either running or waiting. Its turnaround is all the time it spent in the system. Its burst is all the time it spent running. Subtract and what is left is waiting. **No Gantt chart arithmetic is needed to get waiting time once you have completion time.**

A sixth quantity appears in the follow-ups:

**Response time** is from arrival to the process first getting the CPU, not to it finishing. For an interactive process this is the number the user feels, and it is where Round Robin wins everything.

#### Preemption

**A non-preemptive scheduler** makes a decision only when the running process gives up the CPU, by finishing or by blocking. Once dispatched, a process runs to completion. FCFS and SJF are non-preemptive.

**A preemptive scheduler** can take the CPU away from a running process mid-burst. SRTF and Round Robin are preemptive, but for different reasons: SRTF preempts on an event (a better candidate arrived), Round Robin preempts on a clock (your turn is up).

#### The named pathologies

**The convoy effect** is what FCFS does to short jobs. One long CPU-bound process at the head of the queue holds up everything behind it, and the damage is proportional to how long it runs, not to how important it is. The name comes from traffic behind a slow lorry.

**Starvation** is a process being indefinitely postponed because the scheduler keeps finding someone it prefers. SJF and SRTF both starve long jobs, because a long job never becomes the shortest one; a steady trickle of short arrivals is enough to postpone it forever.

**The time quantum** is the fixed slice Round Robin hands out, `q = 3 ms` here. It is the one tuning knob, and both extremes collapse: a quantum larger than every burst makes Round Robin identical to FCFS, and a quantum approaching zero makes it an idealised processor sharing scheme that spends all its time switching.

#### The number nobody computes

**The makespan** is when the last process finishes, t = 26 ms here. It equals the sum of the bursts whenever the CPU never idles, and it is identical across all four algorithms in this problem. Interviewers rarely ask for it, which is exactly why mentioning it lands: it is the proof that **a scheduler redistributes waiting rather than reducing total work**.

**Context switch overhead** is the cost the arithmetic on this page pretends is zero. Saving registers, switching the page table, and refilling a cold cache and TLB costs real time, and it is charged per preemption.

---

### Work it out

#### The dataset

| Process | Arrival Time (AT) | Burst Time (BT) |
| :---: | :---: | :---: |
| **P1** | 0 ms | 8 ms |
| **P2** | 1 ms | 4 ms |
| **P3** | 2 ms | 9 ms |
| **P4** | 3 ms | 5 ms |

Total burst is 8 + 4 + 9 + 5 = 26 ms. P1 arrives at t = 0 and work never runs out, so **the CPU is busy for all 26 ms under every algorithm**, and every schedule below ends at t = 26.

#### Part 1: First-Come, First-Served

Dispatch in arrival order, run each to completion.

`P1 (0-8)  P2 (8-12)  P3 (12-21)  P4 (21-26)`

```
      0    5    10   15   20   25
      |    |    |    |    |    |
P1    ########
P2            ####
P3                #########
P4                         #####
```

| Process | AT | BT | CT | TAT = CT - AT | WT = TAT - BT |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 | 8 | 8 | 8 - 0 = 8 | 8 - 8 = 0 |
| **P2** | 1 | 4 | 12 | 12 - 1 = 11 | 11 - 4 = 7 |
| **P3** | 2 | 9 | 21 | 21 - 2 = 19 | 19 - 9 = 10 |
| **P4** | 3 | 5 | 26 | 26 - 3 = 23 | 23 - 5 = 18 |

Average turnaround: (8 + 11 + 19 + 23) / 4 = 61 / 4 = **15.25 ms**
Average waiting: (0 + 7 + 10 + 18) / 4 = 35 / 4 = **8.75 ms**

**The convoy effect, in one number.** P4 needs 5 ms of CPU and waits 18 ms, more than three times its own burst, because it arrived behind the 9 ms P3. Nothing about P4 caused that.

#### Part 2: Shortest Job First, non-preemptive

At each dispatch point, pick the shortest burst among the processes that have arrived. Once running, a process cannot be interrupted.

**t = 0:** only P1 has arrived, so P1 runs regardless. P1 occupies 0 to 8.
**t = 8:** P2 (4), P3 (9) and P4 (5) are all waiting. Shortest is P2. P2 occupies 8 to 12.
**t = 12:** P3 (9) and P4 (5) remain. Shortest is P4. P4 occupies 12 to 17.
**t = 17:** only P3 remains. P3 occupies 17 to 26.

`P1 (0-8)  P2 (8-12)  P4 (12-17)  P3 (17-26)`

```
      0    5    10   15   20   25
      |    |    |    |    |    |
P1    ########
P2            ####
P3                     #########
P4                #####
```

| Process | AT | BT | CT | TAT = CT - AT | WT = TAT - BT |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 | 8 | 8 | 8 - 0 = 8 | 8 - 8 = 0 |
| **P2** | 1 | 4 | 12 | 12 - 1 = 11 | 11 - 4 = 7 |
| **P4** | 3 | 5 | 17 | 17 - 3 = 14 | 14 - 5 = 9 |
| **P3** | 2 | 9 | 26 | 26 - 2 = 24 | 24 - 9 = 15 |

Average turnaround: (8 + 11 + 14 + 24) / 4 = 57 / 4 = **14.25 ms**
Average waiting: (0 + 7 + 9 + 15) / 4 = 31 / 4 = **7.75 ms**

Note what did and did not change against FCFS. P1 and P2 are untouched. **The entire gain comes from swapping P3 and P4**, which moved 9 ms of waiting off P4 and put 5 ms onto P3. The net is 4 ms saved across four processes, which is the 1 ms per process the averages show.

The trap here is **t = 0**. P1 has the longest burst of the four, and an answer that starts the schedule with P2 has quietly let the scheduler see processes that do not exist yet. At t = 0, P1 is the only candidate.

#### Part 3: Shortest Remaining Time First, preemptive

Re-evaluate on every arrival. If an arriving process has a burst strictly shorter than the running process's **remaining** time, preempt.

**t = 0:** P1 starts, 8 ms remaining.
**t = 1:** P2 arrives with 4 ms. P1 has 7 ms left. 4 is less than 7, so **P2 preempts P1**.
**t = 2:** P3 arrives with 9 ms. P2 has 3 ms left. 9 is not less than 3, so P2 continues.
**t = 3:** P4 arrives with 5 ms. P2 has 2 ms left. No preemption.
**t = 5:** P2 finishes. Candidates are P4 (5), P1 (7 remaining) and P3 (9). P4 is shortest, so P4 occupies 5 to 10.
**t = 10:** candidates are P1 (7 remaining) and P3 (9). P1 occupies 10 to 17.
**t = 17:** only P3 remains. P3 occupies 17 to 26.

`P1 (0-1)  P2 (1-5)  P4 (5-10)  P1 (10-17)  P3 (17-26)`

```
      0    5    10   15   20   25
      |    |    |    |    |    |
P1    #         #######
P2     ####
P3                     #########
P4         #####
```

| Process | AT | BT | CT | TAT = CT - AT | WT = TAT - BT |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 | 8 | 17 | 17 - 0 = 17 | 17 - 8 = 9 |
| **P2** | 1 | 4 | 5 | 5 - 1 = 4 | 4 - 4 = 0 |
| **P4** | 3 | 5 | 10 | 10 - 3 = 7 | 7 - 5 = 2 |
| **P3** | 2 | 9 | 26 | 26 - 2 = 24 | 24 - 9 = 15 |

Average turnaround: (17 + 4 + 7 + 24) / 4 = 52 / 4 = **13.00 ms**
Average waiting: (9 + 0 + 2 + 15) / 4 = 26 / 4 = **6.50 ms**

This is the best of the four, and **it is provably the best any scheduler can do** for a fixed set of arrivals and bursts. The single preemption at t = 1 is what buys it: P2 goes from waiting 7 ms to waiting 0, at a cost of 9 ms of waiting added to P1. That looks like a loss until you notice P2 then clears the queue early, which lets P4 go earlier too.

Note that P1's waiting time is 9 ms, which is **greater than its 8 ms burst**, and that the 1 ms it ran at the start counts as running, not waiting. The `WT = TAT - BT` identity handles this without you having to sum the gaps by hand, which is the main reason to use it.

#### Part 4: Round Robin, q = 3 ms

Circular FIFO. A process runs for at most 3 ms, then goes to the tail of the queue. The ordering rule that decides this problem: **when a process is preempted at the same instant another arrives, the arriving process is enqueued first.**

| Time | Running | Remaining after | Queue after |
| :---: | :---: | :---: | :--- |
| 0 to 3 | P1 | 5 | P2, P3, P4, P1 |
| 3 to 6 | P2 | 1 | P3, P4, P1, P2 |
| 6 to 9 | P3 | 6 | P4, P1, P2, P3 |
| 9 to 12 | P4 | 2 | P1, P2, P3, P4 |
| 12 to 15 | P1 | 2 | P2, P3, P4, P1 |
| 15 to 16 | P2 | **done at 16** | P3, P4, P1 |
| 16 to 19 | P3 | 3 | P4, P1, P3 |
| 19 to 21 | P4 | **done at 21** | P1, P3 |
| 21 to 23 | P1 | **done at 23** | P3 |
| 23 to 26 | P3 | **done at 26** | empty |

At t = 3, P1 is preempted and P4 arrives in the same instant, so the queue is P2, P3, P4, P1 rather than P2, P3, P1, P4. That single choice changes every completion time below it, and it is the most common source of a wrong Round Robin answer.

`P1(0-3) P2(3-6) P3(6-9) P4(9-12) P1(12-15) P2(15-16) P3(16-19) P4(19-21) P1(21-23) P3(23-26)`

```
      0    5    10   15   20   25
      |    |    |    |    |    |
P1    ###         ###      ##
P2       ###         #
P3          ###         ###   ###
P4             ###         ##
```

| Process | AT | BT | CT | TAT = CT - AT | WT = TAT - BT |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 0 | 8 | 23 | 23 - 0 = 23 | 23 - 8 = 15 |
| **P2** | 1 | 4 | 16 | 16 - 1 = 15 | 15 - 4 = 11 |
| **P3** | 2 | 9 | 26 | 26 - 2 = 24 | 24 - 9 = 15 |
| **P4** | 3 | 5 | 21 | 21 - 3 = 18 | 18 - 5 = 13 |

Average turnaround: (23 + 15 + 24 + 18) / 4 = 80 / 4 = **20.00 ms**
Average waiting: (15 + 11 + 15 + 13) / 4 = 54 / 4 = **13.50 ms**

Worst of the four on both averages, by a wide margin. Now look at the other column.

| Process | AT | First dispatched | Response time |
| :---: | :---: | :---: | :---: |
| **P1** | 0 | 0 | 0 ms |
| **P2** | 1 | 3 | 2 ms |
| **P3** | 2 | 6 | 4 ms |
| **P4** | 3 | 9 | 6 ms |

Average response time is **3.0 ms**. Under FCFS the same column reads 0, 7, 10 and 18 for an average of 8.75 ms, and P4 sits for 18 ms before anything happens at all. **Round Robin's worst response time is 6 ms; FCFS's is 18 ms and SRTF's is 15 ms** for P3. That is the trade, and it is why your window manager is not running SRTF.

#### The scorecard

| Algorithm | Preemptive | Avg TAT | Avg WT | Avg response | Makespan |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SRTF** | Yes, on arrival | **13.00 ms** | **6.50 ms** | 4.25 ms | 26 ms |
| **SJF** | No | 14.25 ms | 7.75 ms | 7.75 ms | 26 ms |
| **FCFS** | No | 15.25 ms | 8.75 ms | 8.75 ms | 26 ms |
| **Round Robin, q = 3** | Yes, on clock | 20.00 ms | 13.50 ms | **3.00 ms** | 26 ms |

For a non-preemptive scheduler, average response time equals average waiting time, because a process that is dispatched once runs to the end; all of its waiting happens before it starts. That is why the SJF and FCFS columns repeat.

#### Why production kernels do not run SRTF

SRTF has the optimal average waiting time, and it is proven optimal, and neither Linux nor Windows uses it. Three reasons, and the first is fatal.

**It needs the burst time in advance.** SRTF's whole decision is a comparison against remaining time, and a kernel cannot know that a process will run 2 ms before blocking on a socket read rather than 2 seconds. This is not an engineering gap to be closed; it is the halting problem wearing a hat. What real schedulers do instead is **predict** it, with an exponentially weighted average of the process's recent bursts, and treat a process that has historically been short as probably short again.

**It starves long jobs.** A long-running job never becomes the shortest candidate, so a steady arrival of short interactive tasks postpones it indefinitely. The averages on this page look good precisely because the problem has four processes and no new arrivals.

**Preemption is not free.** Every switch costs register saves, a page table switch, and a cache and TLB that have to warm up again, typically a few microseconds. The arithmetic above assumes zero. SRTF preempts once here, which is cheap, but under load it preempts constantly, and the overhead is charged against the very averages it is optimising.

What runs instead approximates the instinct without the oracle. **Multilevel feedback queues** infer that a process which used its whole quantum is CPU-bound and demote it, while a process that blocked early is interactive and keeps its priority. **The Completely Fair Scheduler** in Linux abandons bursts entirely and tracks accumulated virtual runtime, always dispatching whoever has had least, which gives short and interactive tasks the same effect without predicting anything.

#### Verify it

```python
"""
CPU scheduling: FCFS, SJF, SRTF and Round Robin on one dataset.
Prints completion, turnaround, waiting and response times plus averages.
"""
from collections import deque

# (name, arrival, burst)
PROCS = [("P1", 0, 8), ("P2", 1, 4), ("P3", 2, 9), ("P4", 3, 5)]


def report(name, timeline, procs):
    """timeline is a list of (proc_name, start, end) slices in time order."""
    ct, first = {}, {}
    for p, s, e in timeline:
        ct[p] = e
        first.setdefault(p, s)
    rows = []
    for n, at, bt in procs:
        tat = ct[n] - at
        rows.append((n, at, bt, ct[n], tat, tat - bt, first[n] - at))

    print(f"\n{name}")
    print("  " + "  ".join(f"{p}({s}-{e})" for p, s, e in timeline))
    print(f"  {'P':<4}{'AT':>4}{'BT':>4}{'CT':>5}{'TAT':>6}{'WT':>5}{'RT':>5}")
    for r in rows:
        print(f"  {r[0]:<4}{r[1]:>4}{r[2]:>4}{r[3]:>5}{r[4]:>6}{r[5]:>5}{r[6]:>5}")
    n = len(rows)
    print(f"  avg TAT {sum(r[4] for r in rows)/n:.2f}  "
          f"avg WT {sum(r[5] for r in rows)/n:.2f}  "
          f"avg RT {sum(r[6] for r in rows)/n:.2f}  "
          f"makespan {max(ct.values())}")


def fcfs(procs):
    t, timeline = 0, []
    for n, at, bt in sorted(procs, key=lambda p: p[1]):
        t = max(t, at)
        timeline.append((n, t, t + bt))
        t += bt
    return timeline


def sjf(procs):
    pending, t, timeline = list(procs), 0, []
    while pending:
        ready = [p for p in pending if p[1] <= t]
        if not ready:                      # CPU idle until the next arrival
            t = min(p[1] for p in pending)
            continue
        n, at, bt = min(ready, key=lambda p: (p[2], p[1]))
        timeline.append((n, t, t + bt))
        t += bt
        pending.remove((n, at, bt))
    return timeline


def srtf(procs):
    """Unit-time simulation, then adjacent identical slices are merged."""
    rem = {n: bt for n, _, bt in procs}
    arr = {n: at for n, at, _ in procs}
    t, slices = 0, []
    while any(v > 0 for v in rem.values()):
        ready = [n for n in rem if arr[n] <= t and rem[n] > 0]
        if not ready:
            t += 1
            continue
        pick = min(ready, key=lambda n: (rem[n], arr[n]))
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


def round_robin(procs, q):
    """Arrivals at an instant are enqueued before the process preempted then."""
    by_arrival = sorted(procs, key=lambda p: p[1])
    rem = {n: bt for n, _, bt in procs}
    queue, timeline, t, i = deque(), [], 0, 0

    while i < len(by_arrival) and by_arrival[i][1] <= t:
        queue.append(by_arrival[i][0]); i += 1

    while queue or i < len(by_arrival):
        if not queue:
            t = by_arrival[i][1]
            while i < len(by_arrival) and by_arrival[i][1] <= t:
                queue.append(by_arrival[i][0]); i += 1
            continue
        p = queue.popleft()
        run = min(q, rem[p])
        timeline.append((p, t, t + run))
        t += run
        rem[p] -= run
        while i < len(by_arrival) and by_arrival[i][1] <= t:   # arrivals first
            queue.append(by_arrival[i][0]); i += 1
        if rem[p] > 0:                                         # then the preempted one
            queue.append(p)
    return timeline


if __name__ == "__main__":
    print("total burst =", sum(bt for _, _, bt in PROCS),
          "ms, so every schedule below must end at that instant")
    report("FCFS", fcfs(PROCS), PROCS)
    report("SJF (non-preemptive)", sjf(PROCS), PROCS)
    report("SRTF (preemptive)", srtf(PROCS), PROCS)
    report("Round Robin (q = 3)", round_robin(PROCS, 3), PROCS)
```

---

### What they ask next

**"Why is SRTF optimal for average waiting time?"**
Because of an exchange argument. Take any schedule and find two adjacent pieces of work where a longer one runs before a shorter one. Swap them. The two jobs' finish times exchange, and everything after them is unaffected, but the total waiting falls, because the shorter job's completion moves earlier by more than the longer job's moves later. Any schedule that is not shortest-remaining-first can therefore be improved, so the optimum is shortest-remaining-first. The intuition is simply that **the job you run now delays everybody still queued, so you want it to be the smallest delay available.**

**"Compute waiting time without the Gantt chart."**
You cannot get completion time without the schedule, but once you have it the rest is `TAT = CT - AT` and `WT = TAT - BT`. Do not sum idle gaps by hand for a preempted process, which is where arithmetic slips happen; P1 under SRTF waits 9 ms, and reading that off the chart means adding 1 to 10 minus nothing in your head, where the identity just gives it to you.

**"What happens to Round Robin as the quantum changes?"**
Both limits degenerate. A quantum at or above the largest burst makes it exactly FCFS, because no process is ever preempted. A quantum approaching zero approaches ideal processor sharing, where all n processes appear to run at 1/n speed, and in practice collapses because **context switch overhead** becomes most of the CPU time. Real quanta sit where the switch cost is a small percentage of the slice, a few milliseconds, and Linux's CFS computes the slice dynamically from the number of runnable tasks instead of fixing it.

**"Why does Round Robin have the worst turnaround here but the best response time?"**
Because it spreads the CPU thin. Every process makes progress early, so first dispatch happens quickly and the worst response time is 6 ms against FCFS's 18 ms. But spreading it thin means no process finishes early either; P2 needs only 4 ms of CPU and does not complete until t = 16. **Turnaround rewards finishing jobs, response rewards starting them, and those are opposite instructions.**

**"Which of these starve, and what is the fix?"**
SJF and SRTF starve long jobs, because a long job never becomes the shortest candidate and a trickle of short arrivals postpones it forever. FCFS and Round Robin cannot starve anything; FCFS because the queue strictly drains, Round Robin because every process reaches the head within one cycle. The fix for the first pair is **aging**, raising a waiting process's effective claim with time until it eventually wins regardless of burst.

**"How does a real scheduler get the burst time?"**
It does not; it estimates. The classic method is an exponentially weighted moving average over the process's observed bursts, which costs one multiply and treats recent behaviour as predictive. Modern kernels mostly sidestep the question: **multilevel feedback queues** infer the answer behaviourally by demoting whoever uses a full quantum, and Linux's **Completely Fair Scheduler** tracks accumulated virtual runtime and dispatches whoever has received least, which needs no prediction at all.

**"The dataset changes so the CPU idles. What breaks?"**
The makespan identity. If no process has arrived at some instant, the CPU idles and the schedule stretches past the sum of the bursts, so the makespan is no longer equal across algorithms and is no longer the burst total. Watch for it when the earliest arrival is not zero, or when there is a gap in arrivals that a non-preemptive scheduler cannot fill.

**"Does the Gantt chart for SJF change if a process arrives during P1's burst with a shorter burst?"**
No, and this is the whole distinction. SJF is non-preemptive, so once P1 is dispatched at t = 0 it holds the CPU to t = 8 no matter who turns up with what. Only at t = 8 does the scheduler look again. SRTF on the same input preempts at t = 1.

**The common wrong answer** is starting the SJF schedule with P2 because it has the shortest burst. At t = 0, P2 has not arrived; only P1 is a candidate, so P1 runs. The second commonest is Round Robin's queue order at t = 3, where P1 is preempted at exactly the instant P4 arrives: **the arrival is enqueued before the preempted process**, and getting that backwards changes every completion time after it. The third is quoting SRTF as the production answer, when its requirement to know the burst in advance is the reason no kernel implements it.

---

### Say this in the interview

*"Before the arithmetic, one observation that frames all four. The bursts total twenty six milliseconds, P1 arrives at zero, and work never runs out, so the CPU is busy continuously and every one of these schedules ends at t = 26. The makespan is identical. The scheduler is not making the machine faster; it is deciding who waits and for how long, so what I am really comparing is the distribution of waiting, not the amount of work.*

*I will use two identities throughout. Turnaround time is completion time minus arrival time, and waiting time is turnaround minus burst time, because a process is either running or waiting. That means once I have completion time off the chart, I never have to sum idle gaps by hand, which is where preempted processes trip people up.*

*FCFS runs them in arrival order: P1 nought to eight, P2 to twelve, P3 to twenty one, P4 to twenty six. Average turnaround fifteen point two five, average waiting eight point seven five. The thing to point at is P4: it needs five milliseconds and waits eighteen, because it arrived behind the nine millisecond P3. That is the convoy effect, and the damage is proportional to the length of the job in front, not to anything about P4.*

*Non-preemptive SJF picks the shortest burst among those that have arrived. At t = 0 only P1 has arrived, so P1 runs even though it is the longest job of the four, and that is the trap in this problem. At t = 8 I choose P2 at four, then at t = 12 P4 at five, then P3. Fourteen point two five and seven point seven five. All the gain over FCFS comes from swapping P3 and P4, which moves nine milliseconds of waiting off P4 and puts five onto P3.*

*SRTF is the preemptive version and re-decides on every arrival. P1 starts; at t = 1 P2 arrives with four against P1's seven remaining, so P2 preempts. P3 at nine and P4 at five both arrive while P2 has less than that left, so neither preempts. P2 finishes at five, then P4 five to ten, then P1 resumes ten to seventeen, then P3 to twenty six. Thirteen and six point five, the best of the four, and provably optimal. The reason is an exchange argument: if a longer job ever runs before a shorter one you can swap them, the shorter job's finish moves earlier by more than the longer one's moves later, and total waiting falls. So the job you run now delays everyone queued behind it, and you want that delay to be the smallest available.*

*Round Robin with a three millisecond time quantum is worst on both averages, twenty and thirteen point five. The ordering detail that decides it is t = 3, where P1 is preempted at the same instant P4 arrives: the arrival is enqueued first, so the queue is P2, P3, P4, P1, and getting that backwards changes every completion time afterwards. But I would not leave it on the averages, because the column that matters is response time, from arrival to first dispatch. Round Robin's is nought, two, four and six, averaging three, where FCFS's P4 waits eighteen milliseconds before anything happens at all. Turnaround rewards finishing jobs and response rewards starting them, and those are opposite instructions, which is why the algorithm with the worst numbers on the page is the one an interactive system actually wants.*

*As for why no production kernel runs SRTF despite its optimality, three reasons. It needs the burst time before it runs the process, and a kernel cannot know whether something will run two milliseconds before blocking on a socket or two seconds. It starves long jobs, because a long job never becomes the shortest candidate and a trickle of short arrivals postpones it forever, where FCFS and Round Robin cannot starve anything. And preemption is not free: every switch costs register saves, a page table switch and a cold cache, and my arithmetic assumed context switch overhead was zero. What runs instead approximates the instinct without the oracle. Multilevel feedback queues demote whoever uses a full quantum, inferring CPU-bound behaviour rather than predicting it, and Linux's Completely Fair Scheduler drops bursts entirely and dispatches whoever has accumulated the least virtual runtime, which gets short and interactive tasks served early without predicting anything at all. If I had to add one line to SJF or SRTF to make them shippable, it would be aging, raising a waiting process's claim over time so a long job eventually wins regardless of its burst."*
