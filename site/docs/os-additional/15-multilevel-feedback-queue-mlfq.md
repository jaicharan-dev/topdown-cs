---
id: 15-multilevel-feedback-queue-mlfq
title: "Multilevel Feedback Queue (MLFQ) Scheduling"
description: "Guessing which jobs are short by watching what they do, and the two rules that stop it being gamed"

sidebar_position: 15
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is Multilevel Feedback Queue (MLFQ) scheduling? How does it approximate Shortest Job First (SJF) without prior knowledge of burst times, how does it prevent starvation, and how does it prevent rogue processes from gaming the scheduler?"

---

### Picture it

A help desk with one clerk and a queue of people, some with a ten-second question and some with an hour of paperwork.

**Serving short questions first would be ideal.** Ten people with quick questions could all be done in the time one long job takes, and everyone goes home happier. The problem is obvious: **nobody announces how long they will take**, and asking does not help, because people genuinely do not know.

**So the clerk guesses, and then checks the guess.**

Everyone who walks in is **assumed to be quick** and goes to the front. The clerk gives them **thirty seconds**. Most quick questions are finished inside that and leave, which is exactly what was wanted: short jobs get served almost immediately, without anyone ever having been asked how long they would take.

Anyone **still talking when the thirty seconds are up has just proved something**. They did not say they were long; they **demonstrated** it. So they are moved to a slower queue, served less often but given a longer turn when they are, because being interrupted repeatedly wastes everybody's time.

So the clerk is not predicting. **The clerk is observing, and demoting on evidence.**

**Two things then go wrong, and the fixes are the interesting part.**

If quick questions keep arriving all day, the person with an hour of paperwork **never gets served at all**. So periodically, say every few minutes, the clerk **sends everybody back to the front of the queue** and starts again. The long job gets its turn, and anyone whose situation has changed is reassessed.

And somebody will work out the trick. If you are demoted for **still talking** at thirty seconds, then at twenty-nine seconds you **stop, cough, and start again**. You were never caught mid-sentence, so you never get demoted, and you consume almost a full turn every single time while staying at the very front. The fix is to stop asking "were you still talking at the end" and instead keep **a running total of how long you have had**, which no amount of pausing can reduce.

---

### The proper terms

#### What it is and what it is for

**MLFQ** is a scheduler with **multiple queues at different priority levels**, each run **round-robin**, where a job's priority **changes over time based on its observed behaviour**. That feedback is what the name refers to.

It exists to satisfy two goals that normally conflict:

**Low turnaround time**, which wants **SJF**, shortest job first, running short jobs before long ones.

**Low response time**, which wants **round-robin**, giving every job a slice quickly.

And it must do this **without knowing burst times in advance**, which SJF requires and no real system has.

#### The rules

The standard formulation, from Arpaci-Dusseau:

**Rule 1.** If Priority(A) is greater than Priority(B), A runs.

**Rule 2.** If Priority(A) equals Priority(B), they run **round-robin** against each other.

**Rule 3.** A job entering the system is placed at the **highest priority**.

**Rule 4.** Once a job **uses up its time allotment** at a level, its priority is reduced, moving it down one queue. (This is the revised rule; the naive version is discussed below.)

**Rule 5.** After some time period **S**, **move every job to the topmost queue**.

Queues typically use shorter quanta at higher priority and longer quanta lower down: high-priority jobs are expected to be interactive and need only a brief turn, while low-priority jobs are CPU-bound and benefit from longer, less frequently interrupted runs.

#### How it approximates SJF without knowing burst times

The mechanism, and the sentence worth leading with: **it does not predict, it observes and demotes on evidence.**

**Every job is optimistically assumed to be short**, so Rule 3 starts it at the top.

**A genuinely short job finishes before it is ever demoted.** It sits in the top queue, gets served almost immediately, and leaves. So short jobs are run first **without anyone declaring anything**.

**A long job demonstrates its own length.** Exhausting the allotment at a level is **evidence** of being CPU-bound, and Rule 4 demotes it. After a few demotions it settles at the bottom, exactly where SJF would have put it.

**Interactive jobs stay high automatically.** A job that blocks on I/O quickly never exhausts its allotment, so it never descends. Which is precisely right, because an interactive job needs **responsiveness**, not throughput.

So MLFQ **learns the job's class from its history** instead of being told it. It approximates SJF for long jobs and round-robin for short ones, from the same mechanism, using **past behaviour as a predictor of future behaviour** as its only assumption.

#### Preventing starvation

The naive scheme starves long jobs outright. If enough interactive jobs exist, the top queues are never empty, and Rule 1 means the bottom queue never runs at all. On an interactive system this is not a corner case but the normal condition.

**Rule 5, the periodic priority boost, is the fix.** Every **S** milliseconds, every job is moved to the top queue.

It solves two problems at once, and naming both is what shows understanding:

**No starvation.** A long job waits at most **S** before being lifted to the top and receiving CPU, so the wait is **bounded**.

**Behaviour changes are detected.** A job that was CPU-bound and has become interactive, such as a compute phase finishing and a program starting to accept input, would otherwise be stuck at the bottom for ever. The boost re-evaluates every job periodically, so the scheduler's picture cannot go permanently stale.

Choosing **S** is the usual trade: too small and long jobs get too much CPU and interactivity suffers; too large and starvation is merely slow instead of permanent.

#### Preventing gaming

This is the sharpest part of the question, and it concerns a real attack.

**The naive Rule 4** demotes a job only if it **uses the whole time slice**, and says that a job **giving up the CPU before the slice ends keeps its level**. The intent is kind: a job that blocks for I/O is interactive and should stay high.

**The exploit** is to relinquish the CPU just before the slice expires. Issue a trivial I/O operation at 99 percent of the quantum, and you are never caught having used a whole slice, so you are **never demoted**. You remain at the top priority permanently while consuming **almost a full slice every time**, monopolising the CPU while appearing interactive.

**The fix is better accounting.** Replace "did it use the whole slice" with a **time allotment per level**: track the total CPU time a job has consumed at its current priority, **accumulated across every scheduling event**, and demote when the allotment is exhausted regardless of **how many times it yielded**.

The insight is that the exploit depends on the **counter being reset by yielding**. Once the measure is **cumulative**, voluntarily giving up the CPU no longer erases history, and the only way to avoid demotion is to **genuinely use little CPU**, which is exactly the behaviour the policy intended to reward.

#### Parameters, and what real systems do

MLFQ is a **parameterised policy**, not a fixed algorithm: the **number of queues**, the quantum at each level, the **allotment at each level** and the boost period S must all be chosen. Ousterhout called these **voodoo constants**, because they are tuned empirically rather than derived, and the right values depend on the workload. **Solaris** makes them explicit in a configurable **dispatch table**.

In practice:

**Solaris** uses an MLFQ for its time-sharing class, driven by that table.

**Windows** uses 32 priority levels with dynamic boosts: a boost on I/O completion, a boost for the foreground window, and anti-starvation boosts for threads that have been ready too long.

**FreeBSD's ULE** and macOS use related designs.

**Linux is the interesting exception.** It used an MLFQ-like scheduler before 2.6, then the O(1) scheduler, and then moved **away** from feedback queues entirely to **CFS**, a **fair-share** design that tracks each task's accumulated **`vruntime`** and always runs the one with the least, with **EEVDF** replacing it more recently. That is a different idea: rather than inferring a class and assigning a priority, it guarantees each task a **proportional share**, which makes starvation structurally impossible and removes the voodoo constants. It is worth mentioning, because knowing that the dominant general-purpose kernel chose a different approach shows you understand MLFQ's limitations rather than only its rules.

---

### In code

```text
The structure:

  Q3  highest priority, quantum 10 ms   [ new jobs arrive HERE ]
  Q2                    quantum 20 ms
  Q1                    quantum 40 ms
  Q0  lowest priority,  quantum 80 ms   [ CPU-bound jobs settle HERE ]

  shorter quanta at the top: high-priority jobs are expected to be
  interactive and need only a brief turn.
  longer quanta at the bottom: CPU-bound jobs benefit from longer,
  less frequently interrupted runs.

  THE RULES
    1. Priority(A) > Priority(B)  ->  A runs
    2. Priority(A) = Priority(B)  ->  round-robin between them
    3. a new job starts at the HIGHEST priority
    4. once a job uses up its ALLOTMENT at a level, it is DEMOTED
    5. after period S, move EVERY job to the topmost queue
```

```text
How it approximates SJF with no burst times: observe, don't predict

  a SHORT job (10 ms of work, 10 ms quantum at Q3)
     Q3: runs, finishes, leaves
     -> served almost immediately, never demoted
     -> it got SJF treatment without declaring anything

  a LONG job (500 ms of CPU)
     Q3: uses the whole 10 ms allotment  -> DEMOTED to Q2
     Q2: uses the whole 20 ms allotment  -> DEMOTED to Q1
     Q1: uses the whole 40 ms allotment  -> DEMOTED to Q0
     Q0: runs whenever nothing above it is runnable
     -> it DEMONSTRATED its length. Nobody asked.

  an INTERACTIVE job (2 ms of work, then blocks on input)
     Q3: runs 2 ms, blocks -> allotment barely touched
     -> stays at Q3 for ever, served immediately every time
     -> exactly right: it needs RESPONSIVENESS, not throughput

  the whole idea in one line:
     IT DOES NOT PREDICT. IT OBSERVES AND DEMOTES ON EVIDENCE,
     using past behaviour as a predictor of future behaviour.
```

```text
Why the naive scheme starves long jobs, and why Rule 5 fixes it:

  WITHOUT the boost:
     Q3  [I1][I2][I3][I1][I2][I3][I1][I2][I3] ...   never empty
     Q2  ...
     Q1  ...
     Q0  [LONG JOB] ................................ NEVER RUNS

     Rule 1 says the highest non-empty queue wins, and on an
     interactive system the top queue is never empty.
     This is the NORMAL condition, not a corner case.

  WITH Rule 5, every S milliseconds:
     ALL jobs -> Q3

     1. NO STARVATION: a long job waits at most S before reaching
        the top and getting CPU. The wait is BOUNDED.
     2. BEHAVIOUR CHANGES ARE DETECTED: a job that was CPU-bound
        and has become interactive (a compute phase ends and it
        starts taking input) would otherwise be stuck at the bottom
        for ever. The boost RE-EVALUATES everything periodically,
        so the scheduler's picture cannot go permanently stale.

     choosing S: too small and long jobs get too much CPU and
     interactivity suffers; too large and starvation is merely slow
     instead of permanent.
```

```text
GAMING THE SCHEDULER, which is a real attack:

  NAIVE RULE 4:
     demote ONLY if the job uses the WHOLE time slice
     a job that yields before the slice ends KEEPS its level
     (the intent is kind: blocking for I/O means interactive)

  THE EXPLOIT:
     quantum = 10 ms
     the rogue process runs for 9.9 ms, then issues a TRIVIAL I/O

     t=0.0   runs
     t=9.9   issues a 1-byte read it does not need   -> YIELDS
             "voluntarily gave up the CPU, must be interactive!"
             -> NOT DEMOTED, counter RESET
     t=10.0  runs again at TOP PRIORITY
     t=19.9  yields again
     ...

     -> stays at the highest priority PERMANENTLY
     -> consumes ~99% of a full slice EVERY TIME
     -> monopolises the CPU while appearing interactive

  THE FIX, Rule 4 revised:
     stop asking "did it use the whole slice"
     track the TOTAL CPU TIME consumed at this level, ACCUMULATED
     ACROSS EVERY SCHEDULING EVENT, and demote when that ALLOTMENT
     is exhausted, regardless of how many times it yielded

     t=0.0   runs 9.9 ms   -> used 9.9 of a 10 ms allotment
     t=10.0  runs 0.1 ms   -> ALLOTMENT EXHAUSTED -> DEMOTED

  the insight: the exploit depends on the COUNTER BEING RESET BY
  YIELDING. Make the measure CUMULATIVE and yielding no longer
  erases history, so the only way to avoid demotion is to GENUINELY
  USE LITTLE CPU, which is exactly what the policy meant to reward.
```

```text
The parameters, and what real systems chose:

  MLFQ is a PARAMETERISED POLICY, not a fixed algorithm:
     how many queues?
     what quantum at each level?
     what allotment at each level?
     what boost period S?

  Ousterhout called these VOODOO CONSTANTS: tuned empirically rather
  than derived, and the right values depend on the workload.
  Solaris makes them explicit in a configurable DISPATCH TABLE.

  SOLARIS    MLFQ for its time-sharing class, via that table
  WINDOWS    32 priority levels with dynamic boosts: on I/O
             completion, for the foreground window, and
             anti-starvation boosts for long-ready threads
  FreeBSD    ULE, a related design; macOS similar

  LINUX      the interesting exception. MLFQ-like before 2.6, then
             the O(1) scheduler, then it moved AWAY from feedback
             queues entirely to CFS: a FAIR-SHARE design tracking
             each task's accumulated vruntime and always running the
             one with the least, now replaced by EEVDF.

             a different idea: rather than INFERRING A CLASS and
             assigning a priority, it guarantees each task a
             PROPORTIONAL SHARE, which makes starvation structurally
             impossible and removes the voodoo constants.
```

---

### What they ask next

**"How does it approximate SJF without knowing job lengths?"**
By assuming every job is short, putting it at the top, and demoting it when it demonstrates otherwise by exhausting its allotment. Short jobs finish before they are ever demoted, so they are effectively run first. It observes rather than predicts.

**"Why do higher-priority queues have shorter quanta?"**
Because high-priority jobs are assumed interactive and need only a brief turn to respond, while low-priority jobs are CPU-bound and benefit from longer runs with fewer context switches. It matches the quantum to the expected behaviour at each level.

**"What exactly does the priority boost fix?"**
Two things. Starvation, since a long job waits at most S before reaching the top, which makes the wait bounded. And stale classification, since a job whose behaviour has changed from CPU-bound to interactive would otherwise be stranded at the bottom permanently.

**"How is the scheduler gamed, and what stops it?"**
Under the naive rule a job is demoted only if it uses a whole slice, so it yields at 99 percent of the quantum with a trivial I/O and is never demoted while consuming nearly a full slice each time. The fix is cumulative accounting: track total CPU used at a level across all scheduling events and demote when the allotment is exhausted, so yielding no longer resets the counter.

**"Does I/O-bound mean interactive?"**
It is the proxy MLFQ uses, and it is imperfect. A job doing continuous disk I/O is I/O-bound without being interactive, and it gains priority it does not need. Windows refines this by boosting differently depending on the kind of I/O that completed.

**"What are the voodoo constants?"**
Ousterhout's term for parameters tuned empirically rather than derived: the number of queues, the quantum and allotment at each level, and the boost period. Their right values depend on the workload, which is a real weakness of the approach and is why Solaris exposes them as a table.

**"Why did Linux move away from MLFQ?"**
Because fair-share scheduling solves the same problems more directly. CFS tracks each task's accumulated runtime and always runs whoever has had least, which gives bounded waiting structurally rather than through a periodic boost, requires no class inference, and has no voodoo constants to tune. EEVDF refines the same idea with explicit latency guarantees.

**"How does MLFQ handle a job that changes behaviour mid-life?"**
Only through the periodic boost. Between boosts a job that has become interactive stays at whatever level its past behaviour earned, which is a genuine weakness and why S cannot be too large.

**The common wrong answer** is listing the five rules without the two questions the rules exist to answer. The valuable content is that MLFQ **infers job length from observed behaviour instead of predicting it**, and that the two obvious attacks on that idea, **starvation of long jobs** and **gaming by yielding early**, are fixed by the **periodic boost** and by **cumulative allotment accounting**.

---

### Say this in the interview

*"MLFQ is a scheduler with multiple queues at different priority levels, each run round-robin, where a job's priority changes over time based on its observed behaviour, and that feedback is what the name refers to. It exists to satisfy two goals that normally conflict: low turnaround time, which wants shortest job first, and low response time, which wants round-robin. And it must do that without knowing burst times in advance, which SJF requires and no real system has.*

*The rules are: if A has higher priority than B, A runs; if they are equal they run round-robin; a new job starts at the highest priority; once a job uses up its time allotment at a level it is demoted; and after some period S every job is moved to the topmost queue. Queues use shorter quanta at the top, because high-priority jobs are assumed interactive and need only a brief turn, and longer quanta at the bottom, because CPU-bound jobs benefit from longer, less frequently interrupted runs.*

*It approximates SJF because it does not predict, it observes and demotes on evidence. Every job is optimistically assumed short and starts at the top. A genuinely short job finishes before it is ever demoted, so short jobs are run first without anyone declaring anything. A long job demonstrates its own length by exhausting its allotment, and after a few demotions it settles at the bottom, exactly where SJF would have put it. And an interactive job that blocks on I/O quickly never exhausts its allotment, so it stays high, which is right because it needs responsiveness rather than throughput. So MLFQ learns a job's class from its history, with past behaviour as a predictor of future behaviour as its only assumption.*

*Without the boost it starves long jobs outright: if enough interactive jobs exist the top queues are never empty, so the bottom queue never runs, and on an interactive system that is the normal condition rather than a corner case. Rule 5, the periodic priority boost, fixes two things at once. It removes starvation, since a long job waits at most S before being lifted to the top, which makes the wait bounded. And it detects behaviour changes, since a job that was CPU-bound and has become interactive would otherwise be stranded at the bottom for ever, so the boost re-evaluates everything periodically and the scheduler's picture cannot go permanently stale. Choosing S is the usual trade: too small and long jobs get too much CPU, too large and starvation is merely slow rather than permanent.*

*On gaming: the naive rule demotes a job only if it uses the whole time slice, and lets a job that yields early keep its level, with the kind intent that blocking for I/O means interactive. The exploit is to relinquish the CPU just before the slice expires, issuing a trivial I/O at ninety-nine percent of the quantum, so the job is never caught having used a whole slice and is never demoted, while consuming almost a full slice every time and monopolising the CPU while appearing interactive. The fix is better accounting: replace did it use the whole slice with a time allotment per level, tracking total CPU consumed at the current priority accumulated across every scheduling event, and demote when the allotment is exhausted regardless of how many times it yielded. The insight is that the exploit depends on the counter being reset by yielding, so making the measure cumulative means yielding no longer erases history and the only way to avoid demotion is to genuinely use little CPU, which is exactly what the policy meant to reward.*

*One last point. MLFQ is a parameterised policy rather than a fixed algorithm: the number of queues, the quantum and allotment at each level and the boost period all have to be chosen, and Ousterhout called them voodoo constants because they are tuned empirically rather than derived. Solaris exposes them as a dispatch table, Windows uses 32 levels with boosts on I/O completion, for the foreground window and against starvation, and FreeBSD's ULE is related. Linux is the interesting exception: it was MLFQ-like before 2.6, then the O(1) scheduler, and then moved away from feedback queues entirely to CFS, a fair-share design tracking each task's accumulated vruntime and always running the one with the least, now EEVDF. That is a different idea, guaranteeing a proportional share rather than inferring a class, which makes starvation structurally impossible and removes the voodoo constants."*
