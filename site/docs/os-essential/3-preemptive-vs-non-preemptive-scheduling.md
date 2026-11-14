---
id: 3-preemptive-vs-non-preemptive-scheduling
title: "Preemptive vs. Non-Preemptive CPU Scheduling"
description: "Whether the CPU can be taken back, the four moments a decision is made, and the timer that makes it possible"

sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between preemptive and non-preemptive scheduling? Under what four conditions does a CPU scheduler make decisions, and how does hardware enforce preemption?"

---

### Picture it

Think of a meeting room with one microphone.

**Under polite rules, the microphone is only passed on voluntarily.** Whoever is speaking keeps it until they finish or decide to pause. The chair never interrupts. This is simple and nobody is ever cut off mid-sentence, but one long-winded speaker can hold the room indefinitely and everyone else just waits.

**Under chaired rules, the chair has a stopwatch.** When your time is up, the microphone is taken, whatever you were saying. Nobody can monopolise the room, and short contributions get heard promptly. The cost is interruptions, and the risk that someone is cut off halfway through writing on the whiteboard, leaving it in a confusing state for whoever follows.

The second arrangement needs one thing the first does not: a clock that goes off independently of the person speaking. A chair who only notices the time when the speaker pauses cannot enforce anything.

---

### The proper terms

#### The two kinds

**Non-preemptive** scheduling, also called **cooperative** scheduling, gives a process the CPU until it **voluntarily** releases it, either by blocking for I/O or by terminating. The scheduler cannot take it back.

**Preemptive** scheduling allows the operating system to take the CPU from a running process and give it to another, typically when its **time quantum** expires or a higher-priority process becomes ready.

#### The four scheduling decision points

A scheduling decision occurs when a process:

1. Switches from **running to waiting**, for example issuing an I/O request.
2. Switches from **running to ready**, for example being preempted by a timer interrupt.
3. Switches from **waiting to ready**, for example on I/O completion.
4. Terminates.

Cases 1 and 4 are the voluntary ones, where the process gives up the CPU by itself. Both schemes must decide here, because the CPU is idle and something has to be chosen.

Cases 2 and 3 are the involuntary ones, and only a **preemptive** scheduler acts on them. Case 2 is the timer taking the CPU away; case 3 is a newly ready process possibly displacing the current one.

So the crisp statement is: non-preemptive scheduling decides only at 1 and 4, preemptive scheduling decides at all four.

#### How hardware enforces it

Preemption cannot be implemented in software alone. A process that never yields would never be interrupted by code that only runs when it yields.

The mechanism is the **programmable interval timer**, a hardware device set to raise an **interrupt** after a fixed interval. When it fires, the CPU stops the running process, switches to **kernel mode**, and transfers to the **timer interrupt handler** through the interrupt vector table. The handler charges the elapsed time to the process, and if its quantum is exhausted it invokes the scheduler.

Two supporting pieces matter. Setting the timer is a **privileged instruction**, so a user process cannot disable its own preemption. And the quantum is counted in timer ticks, where the tick rate is a kernel configuration choice.

#### Trade-offs

Preemptive scheduling gives better **response time** and prevents **starvation** by a long-running process, which is why every general-purpose and real-time system uses it. The costs are more **context switches**, hence more overhead, and the need for proper synchronisation, since a process can now be interrupted in the middle of updating shared data, creating **race conditions**.

Non-preemptive scheduling has lower overhead and simpler reasoning about shared state, but one long job blocks everything behind it, which is the convoy effect.

Algorithms split along the same line. **FCFS** and plain **SJF** are non-preemptive. **Round Robin**, Shortest Remaining Time First and preemptive **priority scheduling** are preemptive.

---

### In code

```text
The four decision points, and who acts on them:

                                            non-preemptive   preemptive
  1. running -> waiting   (I/O request)          yes             yes
  2. running -> ready     (timer preempt)        no              yes
  3. waiting -> ready     (I/O completion)       no              yes
  4. running -> exit      (terminates)           yes             yes
```

```text
How a timer preemption actually unfolds:

  1. process P is running in user mode
  2. the interval timer reaches zero and raises an interrupt
  3. the CPU switches to kernel mode and consults the interrupt vector table
  4. the timer interrupt handler runs and charges the tick to P
  5. P's quantum is exhausted, so the handler calls the scheduler
  6. the scheduler picks Q, and the dispatcher performs the context switch
  7. Q resumes in user mode
```

---

### What they ask next

**"Is Shortest Job First preemptive?"**
Plain SJF is not. Its preemptive variant is **Shortest Remaining Time First**, which reconsiders whenever a new process arrives with a shorter remaining burst than the running one.

**"Why can't preemption be done purely in software?"**
Because the code performing it would only run when the process yields, and a process that never yields would never be preempted. An external interrupt source is required.

**"What happens if the quantum is very large or very small?"**
A very large quantum degenerates into FCFS, since processes finish before being preempted. A very small one spends an increasing share of time on context switches rather than useful work.

**"Does preemption apply to kernel code?"**
It depends. A **non-preemptive kernel** will not preempt a process executing a system call, which simplifies locking. A **preemptive kernel** will, improving latency at the cost of needing careful synchronisation inside the kernel itself. Linux has been preemptible since 2.6.

**"Which real systems use non-preemptive scheduling?"**
Early Windows and classic Mac OS used cooperative multitasking, and some embedded and batch systems still do where the workload is known and trusted. General-purpose systems do not, because one misbehaving program would freeze the machine.

**The common wrong answer** is "preemptive means the scheduler runs more often". It runs at the same four points; the difference is that a preemptive scheduler is allowed to **act** at points 2 and 3.

---

### Say this in the interview

*"Non-preemptive or cooperative scheduling gives a process the CPU until it voluntarily releases it by blocking or terminating. Preemptive scheduling lets the operating system take the CPU back, typically when the time quantum expires or a higher-priority process becomes ready.*

*Scheduling decisions arise at four points: running to waiting on an I/O request, running to ready on a timer preemption, waiting to ready on I/O completion, and termination. The first and fourth are voluntary, so both schemes act on them. The second and third are involuntary, and only a preemptive scheduler acts there.*

*Preemption is enforced by hardware. A programmable interval timer raises an interrupt, the CPU switches to kernel mode and vectors to the timer interrupt handler, which charges the tick to the running process and invokes the scheduler if the quantum is exhausted. Setting the timer is a privileged instruction, so a user process cannot disable its own preemption.*

*The trade-off is that preemption gives better response time and prevents starvation, at the cost of more context switches and the need for synchronisation, since a process can be interrupted mid-update and create race conditions. FCFS and plain SJF are non-preemptive; Round Robin, Shortest Remaining Time First and preemptive priority scheduling are preemptive."*
