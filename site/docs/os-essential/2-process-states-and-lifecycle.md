---
id: 2-process-states-and-lifecycle
title: "Process Lifecycle: The 5-State & 7-State Models"
description: "Where a process can be at any moment, and the two extra states that exist because memory runs out"

sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the different states a process transitions through? How does the 7-state model handle memory swapping, and what are the roles of the long-term, medium-term, and short-term schedulers?"

---

### Picture it

Think of a doctor's surgery with one consulting room.

**Arriving** is a patient walking in and being registered. **Waiting** is sitting in the waiting room, ready to be seen the moment the room is free. **Being seen** is in the room with the doctor, and only one patient can be there at a time. **Sent for an X-ray** is different from waiting: the patient cannot be seen even if the room empties, because they are elsewhere and not ready. When the X-ray is done they return to the waiting room, not straight into the consulting room. **Leaving** is going home once treatment is finished.

That is five states, and the distinction that matters is between waiting your turn and waiting for something else. Only the first group is eligible to be called next.

Now add a crowded surgery. If the waiting room is overflowing, some patients are asked to step out to a café down the road. They are still patients, still in the system, but not in the building. Fetching them back takes time. That is swapping, and it is why two more states exist.

---

### The proper terms

#### The five-state model

**New** is a process being created, with its Process Control Block allocated but not yet admitted.

**Ready** means it has everything it needs except the CPU, and sits in the **ready queue**.

**Running** means it is executing on a CPU. The number of processes in this state is limited by the number of cores.

**Waiting**, also called **blocked**, means it cannot proceed until some event completes, typically **I/O**. A blocked process is not eligible for the CPU no matter how idle the machine is.

**Terminated** means execution has finished and its resources are being reclaimed.

The transitions worth naming: **admit** moves new to ready; **dispatch** moves ready to running; **preempt** or a **timer interrupt** moves running back to ready; an **I/O request** moves running to waiting; **I/O completion** moves waiting to **ready**, not to running.

That last point is the common slip. A process finishing its I/O does not resume immediately. It rejoins the queue and waits to be scheduled.

#### The seven-state model

The extra two states exist because physical memory is finite. **Swapping** moves a process's pages out to disk, freeing memory for others.

**Suspended ready**, or ready-suspended, is a process that was ready but has been swapped out. It would be eligible for the CPU except that it is not in memory.

**Suspended blocked**, or blocked-suspended, is a process that was blocked and has been swapped out. If its event completes while it is swapped out, it becomes suspended ready.

The useful observation is that suspension is an orthogonal axis. A process is either ready or blocked, and separately either in memory or swapped out, which gives the four combinations.

#### The three schedulers

They differ by how often they run and what decision they make.

The **long-term scheduler**, also called the **job scheduler**, decides which new processes are **admitted** into memory. It controls the **degree of multiprogramming**, meaning how many processes are resident at once. It runs rarely, and interactive systems often have none, admitting everything immediately.

The **medium-term scheduler** handles **swapping**: choosing which processes to move out to disk when memory is tight, and when to bring them back. It is the one that drives the two suspended states.

The **short-term scheduler**, or **CPU scheduler**, picks which ready process runs next. It runs extremely often, on every timer interrupt and every blocking call, so it must be fast. The component performing the actual switch is the **dispatcher**, and the time it takes is the **dispatch latency**.

---

### In code

```text
                admit                dispatch
   New  ──────────────►  Ready  ──────────────►  Running
                          ▲  ▲                     │  │
        I/O completion    │  └─── preempt ─────────┘  │
                          │        (timer)            │ I/O request
                          │                           ▼
                       Waiting ◄───────────────────────
                                                       exit
                                              Running ──────► Terminated

   Swapped out by the medium-term scheduler:

   Ready    ◄──────────►  Suspended ready
   Waiting  ◄──────────►  Suspended blocked

   and  Suspended blocked ──► Suspended ready   (its event completed
                                                 while swapped out)
```

```text
Which scheduler runs when:

  long-term    rarely     decides what is admitted    sets multiprogramming level
  medium-term  sometimes  decides what is swapped     frees physical memory
  short-term   constantly decides what runs next      must be very fast
```

---

### What they ask next

**"Why does I/O completion move a process to ready rather than running?"**
Because the CPU is busy with something else, and choosing what runs next is the scheduler's decision, not a side effect of an interrupt. Jumping straight to running would preempt an unrelated process arbitrarily.

**"Can a process go from blocked straight to running?"**
No. It must pass through ready, where the short-term scheduler selects it.

**"What is the difference between suspended blocked and suspended ready?"**
Both are swapped out. One is still waiting for an event; the other's event has completed, so it is eligible to run once it is swapped back in.

**"Does Linux implement all seven states?"**
Not literally. Linux uses states such as running, interruptible sleep, uninterruptible sleep, stopped and zombie, and handles swapping at page granularity rather than by suspending whole processes. The seven-state model is a teaching abstraction, and whole-process swapping is largely historical.

**"What is the degree of multiprogramming?"**
The number of processes resident in memory at once. Too low wastes the CPU while everything waits on I/O; too high causes thrashing.

**The common wrong answer** is treating ready and waiting as the same kind of waiting. Ready means waiting for the CPU and eligible to run; waiting means blocked on an event and not eligible at all.

---

### Say this in the interview

*"The five-state model is new, ready, running, waiting or blocked, and terminated. New is a process being created, ready means it needs only the CPU and sits in the ready queue, running means it is on a CPU, waiting means it is blocked on an event such as I/O and is not eligible for the CPU, and terminated means it has finished. The transitions are admit, dispatch, preempt on a timer interrupt, an I/O request moving running to waiting, and I/O completion moving waiting back to ready rather than directly to running.*

*The seven-state model adds suspended ready and suspended blocked for processes swapped out to disk when memory is tight. Suspension is an orthogonal axis: a process is ready or blocked, and separately resident or swapped out. A suspended blocked process whose event completes becomes suspended ready.*

*The long-term scheduler, also called the job scheduler, decides which processes are admitted and controls the degree of multiprogramming. The medium-term scheduler performs swapping and so drives the suspended states. The short-term scheduler, or CPU scheduler, chooses which ready process runs next, runs very frequently, and relies on the dispatcher to perform the switch, with the cost called dispatch latency."*
