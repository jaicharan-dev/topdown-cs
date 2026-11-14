---
id: 4-convoy-effect-fcfs-round-robin
title: "The Convoy Effect: FCFS Bottlenecks & Round Robin Solutions"
description: "One long job holding up a queue of short ones, and the quantum that breaks it up"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the convoy effect, why does FCFS cause it, and how does Round Robin solve it? Walk me through a mathematical Gantt chart comparison, and explain how to tune the time quantum."

---

### Picture it

Think of a single-lane road with a slow lorry at the front.

Behind it, a queue of cars builds up. None of them can overtake, so they all travel at the lorry's speed. The lorry is not doing anything wrong, and the road is not congested in any meaningful sense: there is plenty of capacity, it is just unreachable. Everyone arrives far later than they should, and the cars suffer far more than the lorry gains.

Worse, the lorry eventually turns off and the cars speed up, only to bunch behind the next slow vehicle. The pattern repeats.

Now suppose the road has frequent passing places and a rule: every vehicle may hold the lead for one minute, then must pull in and rejoin the queue. The lorry still makes progress, but the cars get past it in turn. Everybody's journey becomes more predictable, and the short journeys finish dramatically sooner. The cost is all that pulling in and out, which is wasted motion.

---

### The proper terms

#### The convoy effect

The **convoy effect** is the situation where several short processes are stuck waiting behind one long process, inflating their waiting time out of all proportion to their own length.

The damage is measured by **average waiting time**, the mean time a process spends in the ready queue, and **average turnaround time**, the mean time from arrival to completion.

It is worst when a **CPU-bound** process holds the CPU while many **I/O-bound** processes wait. Those short processes would each use the CPU briefly and then block on I/O, letting the devices work in parallel. Instead the devices sit idle, so both the CPU and the I/O subsystem are used poorly.

#### Why FCFS causes it

**First Come First Served** runs processes in arrival order and is **non-preemptive**, so a process keeps the CPU until it blocks or finishes. If a long job arrives first, every later arrival waits for all of it. FCFS has no mechanism to do otherwise, since it never reconsiders.

Note that FCFS is not unfair in the ordinary sense: nobody jumps the queue. The problem is that treating a 24-unit job and a 3-unit job identically is terrible for the average.

#### How Round Robin fixes it

**Round Robin** is FCFS plus **preemption**. Each process gets a **time quantum**, and when it expires the process is moved to the back of the ready queue and the next one runs. The queue is circular, hence the name.

No process can hold the CPU for more than one quantum, so a short job waits at most one quantum per process ahead of it rather than their full bursts. Round Robin gives good **response time**, which is the time from arrival until a process first runs, and that is what matters for interactive work.

The trade is that **average turnaround time** can be slightly worse than FCFS for a batch of similar jobs, because everything is interleaved and finishes near the end. Round Robin optimises responsiveness, not completion.

#### Tuning the quantum

The quantum sets a dial between the two schemes.

**Too large** and Round Robin degenerates into FCFS, since processes finish within their quantum and are never preempted, bringing the convoy effect back.

**Too small** and the **context switch overhead** dominates. If the switch costs 10 microseconds and the quantum is 100 microseconds, roughly 9 percent of the CPU is spent switching rather than working.

The usual rule of thumb is that the quantum should be large enough that about **80 percent of CPU bursts** finish within it, so most processes complete their burst without preemption while long ones are still cut short. Typical values are 10 to 100 milliseconds, with switch costs in the microseconds.

---

### In code

```text
Four processes, all arriving at time 0:

  P1 burst 24      P2 burst 3      P3 burst 3      P4 burst 3

FCFS, in arrival order:

  | P1              | P2  | P3  | P4  |
  0                24    27    30    33

  waiting times:  P1 = 0,  P2 = 24,  P3 = 27,  P4 = 30
  average waiting time    = (0 + 24 + 27 + 30) / 4 = 20.25
  average turnaround time = (24 + 27 + 30 + 33) / 4 = 28.50

Round Robin, quantum = 4:

  | P1 | P2 | P3 | P4 | P1 | P1 | P1 | P1 | P1 |
  0    4    7   10   13   17   21   25   29   33

  P1 finishes at 33, P2 at 7, P3 at 10, P4 at 13
  waiting times:  P1 = 33 - 24 = 9,  P2 = 4,  P3 = 7,  P4 = 10
  average waiting time    = (9 + 4 + 7 + 10) / 4 = 7.50
  average turnaround time = (33 + 7 + 10 + 13) / 4 = 15.75
```

The short jobs are the story. Under FCFS, P2 waits 24 units to do 3 units of work. Under Round Robin it waits 4 and is finished by time 7. Average waiting time falls from 20.25 to 7.50, and P1, the long job, finishes at 33 either way.

```text
Quantum sensitivity for the same workload:

  quantum = 1    maximum fairness, maximum switching overhead
  quantum = 4    the balance above
  quantum = 24   every process finishes within its quantum: this is FCFS again
```

---

### What they ask next

**"Does Round Robin always beat FCFS?"**
No. For jobs of similar length it can give worse average turnaround, because interleaving makes everything finish near the end. It reliably improves response time and the waiting time of short jobs.

**"What is the best scheduling algorithm for average waiting time?"**
**Shortest Job First** is provably optimal for average waiting time. It is not usable directly because burst lengths are not known in advance, so systems estimate them with an **exponential average** of previous bursts, and it can starve long jobs.

**"How do real schedulers avoid the convoy effect?"**
With **multilevel feedback queues**, where a process that uses its whole quantum drops to a lower-priority queue with a longer quantum, while one that blocks early stays high. This separates I/O-bound from CPU-bound work automatically. Linux's **CFS** achieves a similar outcome by tracking virtual runtime and always running the process that has had the least.

**"Where does response time differ from turnaround time?"**
Response time is arrival until the first run; turnaround is arrival until completion. Round Robin improves the first, often at the expense of the second.

**"Does the convoy effect apply beyond the CPU?"**
Yes. The same pattern appears at any non-preemptive shared resource: a lock held for a long time, a disk queue behind one large request, or a single-threaded connection pool.

**The common wrong answer** is "FCFS is unfair". It is perfectly fair by arrival order. The problem is that fairness by arrival produces a bad average when burst lengths vary widely.

---

### Say this in the interview

*"The convoy effect is when several short processes queue behind one long process, inflating their average waiting time and average turnaround time. It is worst when a CPU-bound process holds the CPU while I/O-bound processes wait, because the devices sit idle and both the CPU and the I/O subsystem are used poorly.*

*First Come First Served causes it because it is non-preemptive and runs in arrival order, so a long job arriving first makes every later arrival wait for all of it. With bursts of 24, 3, 3 and 3 arriving together, the average waiting time is 20.25. Under Round Robin with a quantum of 4 it falls to 7.50, and the first short job finishes at time 7 instead of 27, while the long job still finishes at 33.*

*Round Robin is FCFS plus preemption on a time quantum, so no process holds the CPU for more than one quantum and short jobs are no longer trapped. It optimises response time rather than turnaround, which can be slightly worse for similar-length jobs.*

*Tuning the quantum is a balance. Too large and it degenerates into FCFS. Too small and context switch overhead dominates. The rule of thumb is to size it so roughly 80 percent of CPU bursts complete within it, typically 10 to 100 milliseconds."*
