---
id: 4-context-switch-internals-overhead
title: "Context Switch Internals & Overhead"
description: "What gets saved, the three switches people lump together, and the cost that does not appear in the switch at all"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly gets saved during a context switch? What is the technical difference between a mode switch, a thread switch, and a process switch, and why is context switching considered 'pure overhead'?"

---

### Picture it

You are working at a desk, and you have to hand it over to somebody else.

**The obvious part** is clearing your things: bookmark the page, note where your pen was, write down the figure you were halfway through adding. That is quick, and you can measure it with a stopwatch.

**The part nobody counts** is what you had spread around you that does not get written down. The three reference books open at the right pages. The sticky notes. The layout you had arranged so everything was within reach. The next person sweeps all that away and sets up their own.

Then, when you come back, you have your notes, so you can resume exactly. But the books are shut, the notes are gone, and the desk is arranged wrong. For the next ten minutes you are **fetching things you used to have within reach**, and you are slower than you were, with nothing in your notes to explain why.

**That second cost is larger than the first, and it does not happen during the handover.** It happens afterwards, spread thinly over everything you do next, which is why people measure the stopwatch time and conclude switching is cheap.

**And there are three different handovers, which get confused.**

Stepping away to ask a colleague a question and coming straight back is not a handover at all. Your desk is untouched.

Handing over to a **colleague on the same project** means they want the same books, so most of your layout still serves them.

Handing over to someone from **a different department** means every book, every note and every arrangement is wrong for them, and wrong for you again when you return.

**And the uncomfortable part:** during the handover itself, **no work of any kind is being done**. Not yours, not theirs. The time is spent entirely on the act of swapping.

---

### The proper terms

#### What gets saved

The saved state is the **context**, stored in the **PCB**, which in Linux is the **`task_struct`** and its embedded **`thread_struct`**.

**The general-purpose registers.** On x86-64 the sixteen of them, `RAX` through `R15`.

**The instruction pointer**, **`RIP`**, which is where execution resumes.

**The stack pointer**, **`RSP`**, and the frame pointer.

**The flags register**, **`RFLAGS`**, holding condition codes.

**The segment bases `FS` and `GS`**, which carry thread-local storage and per-CPU data.

**The floating point and vector state.** This is the heavyweight part people forget: x87, SSE, AVX and **AVX-512** registers, saved through **`XSAVE`** and **`XRSTOR`**. AVX-512 state alone is roughly 2.5 KB, which is far larger than the general-purpose registers put together, so modern kernels save only the components actually in use.

**The kernel stack pointer**, since each thread has its own kernel stack.

**For a process switch only: `CR3`**, the page table base register. This is the line that changes everything, because it swaps the address space.

**Scheduler bookkeeping**, which is not CPU state but is part of the cost: run queue updates, accounting such as **`vruntime`** under CFS, and timestamps.

#### Mode switch, thread switch and process switch

These are three different operations and only two of them are context switches.

**A mode switch** is a change of **privilege level** within the **same thread**. It happens on every system call, interrupt and exception. The user registers are pushed onto the kernel stack, the privilege level changes, and the kernel runs **in the same address space**, because the kernel is mapped into every process. Nothing is scheduled and nothing is swapped.

Cost: roughly 100 nanoseconds. A mode switch is **not** a context switch, and conflating them is the most common error in this question.

**A thread switch** moves the CPU between two threads of the **same process**. Registers are saved and restored, kernel stacks are swapped, and the scheduler updates its state. Crucially **`CR3` is unchanged**, because the threads share an address space, so there is **no TLB flush** and the caches still hold data the new thread will want.

Cost: on the order of **one to two microseconds** directly.

**A process switch** does everything a thread switch does **plus reloading `CR3`**, which switches to a different page table.

That one extra step is responsible for most of the expense:

**TLB entries become invalid**, or at best must be distinguished by tag, so address translations start missing.

**The caches hold the previous process's data**, so they are effectively cold for the new one.

Cost: roughly **two to five microseconds** directly, and potentially **tens of microseconds** once the indirect effects are counted.

#### Direct and indirect cost

This distinction is the substance of the question, and the reason context switching is more expensive than measurements suggest.

**Direct cost** is the work the switch itself performs: saving and restoring registers, swapping stacks, updating the scheduler. It is measurable with a stopwatch, it is a few microseconds, and it has been shrinking with every CPU generation.

**Indirect cost** is the degraded performance **afterwards**, and it dominates:

**TLB misses**, because translations for the new process are not cached, and each miss costs a **page table walk**.

**Cache misses** at every level, since L1, L2 and often L3 hold the old process's working set. Repopulating a large working set can take **tens of thousands of cycles**.

**Branch predictor and prefetcher state is wrong**, having been trained on different code.

The crucial property: **none of this appears in the switch itself.** It is spread thinly across the next few milliseconds of the new process's execution, which is why measured switch latency understates the true cost by an order of magnitude for processes with large working sets.

#### Why it is called pure overhead

Because during the switch the CPU is **executing kernel code that advances no application's work**. The outgoing process makes no progress; the incoming one has not started. The time is spent entirely on **the act of swapping**.

The contrast that makes this precise: a **page fault** is also expensive and also kernel work, but it **accomplishes something the program needed**, namely bringing in a page it is about to use. A context switch produces **no result at all**. It only changes **which work happens next**.

The nuance worth adding, because it shows judgement rather than recitation: **overhead is not the same as waste.** Context switching buys multiplexing, responsiveness and isolation, which is precisely what an operating system exists to provide. A machine that never context switched would run one program at a time. So the engineering goal is to **reduce its frequency**, not to eliminate it, and the measure of a good design is how much useful work happens per switch.

#### Reducing it

**Longer time slices** reduce switch frequency, at the cost of interactive latency. That is the whole throughput-against-responsiveness trade.

**CPU affinity and pinning** keep a thread on one core, so its cache and TLB state survives. This is one of the largest practical wins.

**PCID on x86 and ASID on ARM** tag TLB entries with an address space identifier, so a `CR3` reload no longer flushes the whole TLB. This directly attacks the dominant indirect cost.

**Threads rather than processes** for related work, since a thread switch skips the address space change entirely.

**Async I/O and event loops** handle thousands of connections on one thread, so a connection becoming ready costs a function call instead of a switch.

**User-space scheduling**, such as goroutines, green threads or coroutines, switches in **tens of nanoseconds** with no kernel involvement, because only a small register set and a stack pointer change.

**Measuring it**: `vmstat 1` for system-wide rates, `/proc/PID/status` for a task's `voluntary_ctxt_switches` and `nonvoluntary_ctxt_switches`, and `perf stat -e context-switches,cache-misses` to see both costs together. The voluntary-against-involuntary split is diagnostic: voluntary switches mean blocking on I/O or locks, while involuntary ones mean the time slice is being exhausted.

---

### In code

```text
What gets saved, and what it costs to save it:

  general-purpose registers   RAX..R15          16 x 8 bytes
  instruction pointer         RIP               where to resume
  stack pointer               RSP               plus the frame pointer
  flags                       RFLAGS            condition codes
  segment bases               FS, GS            TLS, per-CPU data
  FPU / vector state          x87, SSE, AVX,    ~2.5 KB for AVX-512
                              AVX-512 via       <- far larger than all
                              XSAVE / XRSTOR       the GPRs together,
                                                   so only components
                                                   in use are saved
  kernel stack pointer        each thread has its own kernel stack

  PROCESS SWITCH ONLY:
  CR3                         the page table base register
                              <- this one line changes everything

  plus scheduler bookkeeping: run queue updates, vruntime, timestamps

  all held in the PCB: task_struct and thread_struct in Linux.
```

```text
The three switches, and only two are context switches:

  MODE SWITCH          user <-> kernel, SAME thread
      cause            syscall, interrupt, exception
      saves            user registers onto the kernel stack
      address space    UNCHANGED (the kernel is mapped into every
                       process)
      scheduling       none
      cost             ~100 ns
      -> NOT a context switch. Conflating them is the usual error.

  THREAD SWITCH        two threads of the SAME process
      saves            registers, kernel stack, scheduler state
      CR3              UNCHANGED  -> no TLB flush
      caches           still hold data the new thread wants
      cost             ~1-2 us direct

  PROCESS SWITCH       two different processes
      everything a thread switch does, PLUS:
      CR3              RELOADED -> different page table
      TLB              entries invalid (or must be tagged)
      caches           hold the OLD process's data -> cold
      cost             ~2-5 us direct, TENS of us with indirect effects
```

```text
Direct vs indirect: where the cost actually lives

  DIRECT (what a benchmark measures)
      save registers, swap stacks, update the scheduler
      a few microseconds
      shrinking with every CPU generation

  INDIRECT (what dominates, and what no benchmark of the switch shows)
      TLB misses        translations not cached -> a page table walk
                        on each miss
      cache misses      L1, L2 and often L3 hold the OLD working set
                        repopulating a large one: TENS OF THOUSANDS
                        of cycles
      branch predictor  trained on different code, now wrong
      prefetcher        streams were tracking different addresses

  the key property: NONE OF THIS HAPPENS DURING THE SWITCH.
  it is spread thinly over the next few milliseconds of the new
  process's execution, which is exactly why measured switch latency
  understates the real cost by an order of magnitude.

  timeline:
     |--switch--|---------- degraded execution ----------|--normal--|
         5 us              tens of microseconds
         ^ measured         ^ not measured, and larger
```

```text
Why "pure overhead", and the contrast that makes it precise:

  PAGE FAULT            expensive, kernel work, BUT it accomplishes
                        something the program needed: the page it is
                        about to use is now present

  CONTEXT SWITCH        expensive, kernel work, and it produces
                        NO RESULT AT ALL
                        the outgoing process made no progress
                        the incoming one has not started
                        the time went entirely on the act of swapping

  but overhead is not WASTE: it buys multiplexing, responsiveness and
  isolation, which is what an operating system is for. A machine that
  never switched would run one program at a time.

  so the goal is to reduce its FREQUENCY, not to eliminate it, and
  the measure of a good design is useful work done PER SWITCH.
```

```bash
# Measuring both costs
vmstat 1
# the "cs" column: system-wide context switches per second

cat /proc/$PID/status | grep ctxt
# voluntary_ctxt_switches:     1823     <- blocked on I/O or a lock
# nonvoluntary_ctxt_switches:    47     <- time slice exhausted
# the split is diagnostic: high voluntary means blocking,
# high involuntary means CPU contention

perf stat -e context-switches,cache-misses,dTLB-load-misses ./app
# this shows the DIRECT count and the INDIRECT damage together,
# which is the only way to see the real cost
```

```text
Reducing it, in rough order of effect:

  CPU AFFINITY / PINNING      keep a thread on one core so its cache
                              and TLB state survives
                              -> one of the largest practical wins

  PCID (x86) / ASID (ARM)     tag TLB entries with an address space id,
                              so a CR3 reload no longer flushes the TLB
                              -> attacks the DOMINANT indirect cost

  THREADS, NOT PROCESSES      a thread switch skips the address space
                              change entirely

  ASYNC I/O / EVENT LOOPS     thousands of connections on one thread;
                              a ready connection is a function call,
                              not a switch

  USER-SPACE SCHEDULING       goroutines, green threads, coroutines:
                              TENS OF NANOSECONDS, no kernel involved,
                              since only a few registers and a stack
                              pointer change

  LONGER TIME SLICES          fewer switches, worse interactive
                              latency: the throughput-vs-responsiveness
                              trade in its purest form
```

---

### What they ask next

**"Is a system call a context switch?"**
No. It is a **mode switch**: the same thread continues, in the same address space, at a higher privilege level. A context switch only occurs if the call blocks and the scheduler picks something else. Getting this right is most of the question.

**"Why is a thread switch cheaper than a process switch?"**
Because `CR3` is not reloaded. Threads share an address space, so the TLB stays valid and the caches still hold useful data. The expensive part of a process switch is the address space change and everything it invalidates, not the registers.

**"What is the most expensive thing saved?"**
The vector state. AVX-512 registers are roughly 2.5 KB, dwarfing the general-purpose registers, which is why kernels use `XSAVE` with a component mask and save only what is actually in use.

**"How does PCID help?"**
It tags TLB entries with an address space identifier, so entries for different processes coexist and a `CR3` reload does not flush them. Returning to a process can then find its translations still cached, which removes a large part of the indirect cost.

**"Why are goroutine switches so much cheaper?"**
Because they happen entirely in user space: a few callee-saved registers and a stack pointer, with no privilege change, no `CR3` reload and no kernel scheduler. Tens of nanoseconds against microseconds, which is why a server can hold hundreds of thousands of goroutines and not hundreds of thousands of threads.

**"What does a high involuntary switch count tell you?"**
That tasks are being preempted because their time slices expire, which means CPU contention: more runnable work than cores. A high **voluntary** count means the opposite, that tasks are blocking on I/O or locks. The two point at completely different problems.

**"Does more context switching always mean worse performance?"**
No. It is how responsiveness is delivered, so an interactive system switches constantly by design. The problem is switching that buys nothing, such as a thread-per-request server thrashing between thousands of threads, where the same work could be done by a handful of threads in an event loop.

**The common wrong answer** is listing the registers and stopping. The registers are the cheap, measurable part. The real content is the **three-way distinction** between mode, thread and process switches, and the fact that the **indirect cost of cold caches and a flushed TLB happens after the switch** and is considerably larger than the switch itself.

---

### Say this in the interview

*"The saved state is the context, held in the PCB, which in Linux is task_struct and its thread_struct. It is the general-purpose registers, RAX through R15 on x86-64; the instruction pointer RIP; the stack pointer RSP and frame pointer; the flags register RFLAGS; the FS and GS segment bases, which carry thread-local storage and per-CPU data; the floating point and vector state through XSAVE and XRSTOR, which is the heavyweight part since AVX-512 state alone is about 2.5 kilobytes, far larger than all the general-purpose registers, so kernels save only the components in use; and the kernel stack pointer, since each thread has its own kernel stack. For a process switch there is one more: CR3, the page table base register, and that single line changes everything. Plus scheduler bookkeeping, run queue updates, vruntime and timestamps.*

*The three operations are different and only two are context switches. A mode switch is a change of privilege level within the same thread, on a syscall, interrupt or exception: the user registers go onto the kernel stack, the privilege level changes, and the kernel runs in the same address space because it is mapped into every process. Nothing is scheduled and nothing is swapped, and it costs about a hundred nanoseconds. It is not a context switch, and conflating them is the usual mistake. A thread switch moves between two threads of the same process: registers, kernel stacks and scheduler state change, but CR3 is unchanged, so there is no TLB flush and the caches still hold useful data, costing one to two microseconds. A process switch does all of that plus reloading CR3, which invalidates TLB entries or at best requires them to be tagged, and leaves the caches holding the previous process's data, so it costs two to five microseconds directly and tens of microseconds once indirect effects are counted.*

*That direct-versus-indirect split is the substance. The direct cost is the work the switch performs, saving and restoring registers, swapping stacks, updating the scheduler, which is measurable and a few microseconds and has been shrinking every CPU generation. The indirect cost is the degraded performance afterwards, and it dominates: TLB misses, each costing a page table walk; cache misses at every level, where repopulating a large working set takes tens of thousands of cycles; and branch predictor and prefetcher state trained on different code. The crucial property is that none of this happens during the switch. It is spread thinly across the next few milliseconds of the new process's execution, which is exactly why a benchmark of switch latency understates the real cost by an order of magnitude.*

*It is called pure overhead because during the switch the CPU executes kernel code that advances no application's work: the outgoing process makes no progress, the incoming one has not started, and the time goes entirely on the act of swapping. The contrast that makes it precise is a page fault, which is equally expensive kernel work but accomplishes something the program needed, bringing in a page it is about to use, whereas a context switch produces no result at all and only changes which work happens next. The nuance I would add is that overhead is not waste: it buys multiplexing, responsiveness and isolation, which is what an operating system exists for, so the goal is to reduce its frequency rather than eliminate it.*

*To reduce it: CPU affinity and pinning keep a thread on one core so its cache and TLB state survives, which is one of the largest practical wins; PCID on x86 and ASID on ARM tag TLB entries with an address space identifier so a CR3 reload no longer flushes the TLB, attacking the dominant indirect cost; use threads rather than processes for related work; use async I/O and event loops so a ready connection is a function call rather than a switch; and use user-space scheduling like goroutines, which switch in tens of nanoseconds because only a few registers and a stack pointer change with no kernel involvement. To measure it, vmstat's cs column for system-wide rates, /proc/PID/status for voluntary and nonvoluntary counts, where a high voluntary count means blocking on I/O or locks and a high involuntary count means CPU contention, and perf stat with context-switches alongside cache-misses to see both costs together."*
