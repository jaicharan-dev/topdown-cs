---
id: 13-thrashing-and-working-set
title: "Thrashing: Causes, Working Set Model & Page Fault Frequency"
description: "The system spending all its time fetching pages, and the feedback loop that makes it worse"

sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is thrashing? What causes it, what is Peter Denning's Working Set Model, and how do operating systems detect and prevent thrashing?"

---

### Picture it

A desk that holds three books, and work that requires five.

You open book one, need something from book four, put one away and fetch four. Then you need book two, which you just put away. Then one again. You spend the whole afternoon walking to the shelf, and almost none of it reading. If the desk held five books you would finish quickly, and with three you barely start.

Now the part that turns a problem into a collapse.

A manager watches and sees you barely working. Concluding you are underused, they assign you a sixth book, which makes the shelf trips even more frequent. Watching again, they see even less work being done, so they assign more. Every corrective step makes it worse, because the measurement was being read backwards: you were not idle, you were overloaded.

That feedback loop is what makes thrashing collapse a system rather than merely slow it.

---

### The proper terms

#### What thrashing is

**Thrashing** is the state where a system spends more time servicing **page faults** than executing instructions. **CPU utilisation** collapses while **disk utilisation** saturates, and throughput falls to almost nothing.

The cause is that the total memory actively being used by the running processes exceeds the available **physical memory**, so each process has too few **frames** to hold the pages it is actively touching. Every reference risks a fault, and each fault evicts a page another process is about to need.

#### The feedback loop

Thrashing was originally made worse by the operating system itself. An early scheduler reasoning that low CPU utilisation meant the CPU was underloaded would increase the degree of multiprogramming, admitting more processes. More processes means fewer frames each, which means more faults, which means lower CPU utilisation, which triggers the same response again.

This positive feedback is why thrashing shows up as a sudden cliff rather than a gradual slowdown. Up to a point, adding processes raises utilisation; past it, utilisation falls off sharply.

#### Locality

The reason a process can run in less than its total size is locality of reference. A **locality** is the set of pages a process is actively using in a given phase, and programs move from one locality to another as they progress, for example from initialisation to a processing loop.

Thrashing happens when a process is allocated **fewer frames than its current locality needs**.

#### The Working Set Model

Peter Denning's **Working Set Model** makes locality measurable.

The **working set window**, written Δ (delta), is a fixed number of recent memory references. The **working set** of a process, WSS, is the set of **distinct pages** referenced within that window, and its size approximates the current locality.

The policy follows directly. Let **D** be the sum of all processes' working set sizes, the total demand, and **m** the number of available frames.

If D > m, thrashing will occur, and the system must **suspend** a process, freeing its frames for the rest.

If D is comfortably below m, another process can safely be admitted.

Choosing Δ matters. Too small and it misses part of the locality; too large and it spans several localities and overestimates. It is approximated in practice with a timer interrupt and **reference bits** rather than exact reference counting, which would be too expensive.

#### Page Fault Frequency

**Page Fault Frequency**, or PFF, is the more direct control, measuring the outcome instead of estimating the cause.

Each process's fault rate is monitored against an **upper** and **lower** bound. Above the upper bound, the process has too few frames, so it is allocated more. Below the lower bound, it has more than it needs, so frames are taken away and given elsewhere. If the fault rate is high and no free frames exist, a process is suspended.

PFF is simpler to implement than the working set model and targets the symptom directly, which is why variants of it are what real systems use.

#### What modern systems do

Whole-process **swapping** is largely historical. Linux reclaims at **page granularity** using LRU-approximating lists, and under genuine exhaustion invokes the **OOM killer**, which terminates a process chosen by a badness score rather than letting the machine thrash indefinitely.

Administrators also limit it with cgroups memory limits, by tuning swappiness, by locking critical pages with `mlock`, or simply by adding RAM, which is usually the real fix.

---

### In code

```text
Why thrashing is a cliff, not a slope:

  CPU
  util
   ▲
   │        ┌──────────╮
   │       ╱            ╲         <- past this point, adding processes
   │      ╱              ╲           reduces utilisation
   │     ╱                ╲
   │    ╱                  ╲____
   └───────────────────────────────► degree of multiprogramming
                        ▲
                   thrashing begins

  The old scheduler, seeing utilisation fall, admitted MORE processes,
  which drove it further down the right-hand slope.
```

```text
Working set model

  window  Δ = 10 references

  reference string ... 2 6 1 5 7 7 7 7 5 1 | 6 2 3 4 1 2 3 4 4 4 ...
                       └──── WS = {1,2,5,6,7} ┘ └── WS = {1,2,3,4,6} ┘
                            WSS = 5                   WSS = 5

  policy:   D = sum of all WSS
            D >  m  ->  suspend a process
            D << m  ->  admit another
```

```text
Page Fault Frequency control

  fault rate
      ▲
      │░░░░░░░░░░░░░░░  above upper bound: give this process more frames
      │
      │               normal operating band
      │
      │░░░░░░░░░░░░░░░  below lower bound: take frames away
      └──────────────────────────────► frames allocated
```

---

### What they ask next

**"How do you tell thrashing from a genuinely busy system?"**
By the pattern: thrashing shows **low CPU utilisation** with **high disk I/O** and a high **major fault** rate. A busy system shows high CPU utilisation. The combination of an idle CPU and a saturated disk is the signature.

**"Why does adding processes ever help?"**
Below the threshold it does. More processes mean more chances that someone is runnable while another waits for I/O, so utilisation rises. The curve only turns over once memory demand exceeds supply.

**"What is the difference between the working set model and PFF?"**
The working set model estimates the **cause**, how much memory a process needs, and allocates accordingly. PFF measures the **effect**, the fault rate, and adjusts frames in response. PFF is simpler and is closer to what real systems do.

**"Does thrashing still happen?"**
Yes, on memory-constrained systems and in containers with tight limits. Modern kernels respond by reclaiming pages and eventually invoking the OOM killer rather than thrashing indefinitely, which converts a hang into a crash of one process.

**"How does the choice of Δ affect the working set?"**
Too small a window underestimates the locality and causes faults; too large spans multiple localities and over-allocates, wasting frames that other processes need.

**The common wrong answer** is "thrashing is when memory is full". Memory being full is normal, since the kernel uses spare memory for cache. Thrashing is when the **active** demand exceeds physical memory, so pages are evicted while still in use.

---

### Say this in the interview

*"Thrashing is when a system spends more time servicing page faults than executing instructions. CPU utilisation collapses while disk utilisation saturates. It happens when the memory actively in use exceeds physical memory, so each process has fewer frames than its current locality needs and every eviction removes a page another process is about to touch.*

*It is made worse by a feedback loop. A scheduler that reads low CPU utilisation as an underloaded CPU increases the degree of multiprogramming, which gives each process fewer frames, which increases faults and lowers utilisation further. That is why thrashing appears as a sudden cliff rather than a gradual slowdown.*

*Denning's Working Set Model makes locality measurable. The working set window, delta, is a number of recent references, and the working set is the distinct pages referenced in that window, with its size approximating the current locality. If the sum of all working set sizes exceeds the available frames, the system suspends a process; if it is comfortably below, another can be admitted. Choosing delta matters, and it is approximated with reference bits and a timer rather than exact counting.*

*Page Fault Frequency is the more practical control: monitor each process's fault rate against upper and lower bounds, allocate more frames above the upper bound, reclaim frames below the lower bound, and suspend a process if the rate is high and nothing is free.*

*Modern systems reclaim at page granularity rather than swapping whole processes, and invoke the OOM killer under genuine exhaustion instead of thrashing indefinitely."*
