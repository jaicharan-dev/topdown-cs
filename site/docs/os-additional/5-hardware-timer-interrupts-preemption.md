---
id: 5-hardware-timer-interrupts-preemption
title: "Hardware Timer Interrupts & Preemption"
description: "The operating system is not running while your program is, so the thing that takes the CPU back cannot be software"

sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a Hardware Timer Interrupt? How does the operating system regain control of the CPU from a running user application or an infinite loop without hardware assistance?"

---

### Picture it

Start with the fact that makes this question interesting, because everything follows from it.

**While your program is running, the operating system is not.** There is one CPU core and it is executing your instructions. The kernel is not watching from somewhere; it has no code running at all. It is a pile of instructions sitting in memory, doing nothing.

So ask the obvious question. Your program contains `while (1) { }`. It never calls anything, never asks for anything, never finishes. **How does the operating system ever run again?**

And notice that every software answer fails immediately, for the same reason. "The kernel checks periodically": with what? It is not running. "The scheduler steps in": the scheduler is kernel code, which is not running. "There is a watchdog thread": a thread needs the CPU, and your loop has it. Every proposal assumes the thing that needs to happen has already happened.

**The solution cannot come from inside the instruction stream at all.** It has to come from outside, from something that keeps time **independently of what the CPU is doing** and can **forcibly interrupt** it.

So the machine contains a small device that counts down and, when it reaches zero, **yanks a wire**. The CPU is built to respond to that wire by stopping whatever it is doing, mid-program, and jumping to **an address the operating system chose in advance**, in **privileged mode**.

Your program is not consulted. It cannot decline. It does not find out.

**And the final piece, which is what makes it actually secure.** There is an instruction that switches the wire off. If a user program could execute it, the loop would simply disable the wire and the machine would be lost again. So that instruction is **privileged**: attempting it from a user program is not ignored, it is a **fault**, and the program is killed for trying.

That is the whole design. Not clever software, but a cheap piece of hardware plus a rule about who is allowed to switch it off.

---

### The proper terms

#### The problem

Once the CPU is executing user code, **the kernel has no thread of execution**. It cannot poll, check, or supervise anything, because supervision is code and code needs a CPU.

This rules out every software-only solution, and the reason is always the same: **the mechanism would require the kernel to already be running**, which is exactly what is missing.

The historical demonstration is **cooperative multitasking**, used by Windows 3.x and classic Mac OS. Programs were expected to **yield voluntarily**, typically by calling into the event loop. One program that failed to yield, through a bug or a tight loop, **froze the entire machine**, and the only recovery was the power switch. Everyone has experienced the result; the cause was precisely this.

#### The hardware timer

A **hardware timer** is a programmable device, independent of the CPU's instruction stream, that counts and raises an **interrupt** when it expires.

The implementations, which are worth naming:

**The PIT**, programmable interval timer, the original 8253/8254.

**The Local APIC timer**, which is **per-core** and the one Linux normally uses, so each core can be interrupted independently.

**The HPET**, high precision event timer, used for higher-resolution timekeeping.

**The ARM generic timer**, the equivalent on ARM.

Its crucial property is **independence**. It is not a loop the CPU runs; it counts in its own circuitry, so it fires whether the CPU is executing user code, kernel code, or a tight infinite loop.

#### What happens when it fires

**1. The device asserts an interrupt line**, delivered through the interrupt controller.

**2. The CPU finishes the current instruction**, then, if interrupts are enabled, **saves `RIP`, `CS` and `RFLAGS`**, switches to **kernel mode**, switches to the **kernel stack** via the **TSS**, and jumps to the handler.

**3. The handler address comes from the IDT**, the Interrupt Descriptor Table, at the timer's vector. This is the architectural heart of the answer: **the destination was chosen by the kernel at boot**, and the running program has no influence over it whatsoever. It cannot redirect the jump, delay it or observe it.

**4. The handler runs.** It updates the kernel's notion of time, **jiffies**, runs expired timer callbacks, **charges elapsed time to the running task**, and decrements its remaining **time slice**.

**5. The scheduler decides.** If the slice is exhausted or a higher-priority task has become runnable, the kernel sets a flag on the current task: **`TIF_NEED_RESCHED`**.

**6. The switch happens on the way out.** Before returning to user mode the kernel checks that flag and, if set, calls **`schedule()`**, which performs the context switch. The interrupted program resumes later, from exactly where it was, with no knowledge that anything happened.

#### Why the program cannot defeat it

Two protections, and both are necessary.

**The handler address is in the IDT**, set up by the kernel, so the program cannot point the interrupt at its own code.

**Disabling interrupts is a privileged instruction.** On x86, **`CLI`** clears the interrupt flag and stops maskable interrupts. Executing it in **ring 3** does not quietly fail: it raises a **general protection fault**, which traps into the kernel, which typically kills the process with SIGSEGV.

So the one instruction that could switch off the mechanism is **unavailable to the code that would want to**. That is why preemption is enforced rather than merely requested, and it is the complete answer to "what if the program just disables the timer".

#### Tick rate, and the trade

The timer frequency is **`CONFIG_HZ`**, commonly **100, 250 or 1000** on Linux, giving a tick every 10, 4 or 1 millisecond.

The trade is direct:

**A higher rate** gives finer scheduling granularity and lower interactive latency, at the cost of **more interrupts**, more CPU spent in the handler, worse cache behaviour and higher power consumption.

**A lower rate** reduces overhead but coarsens scheduling, so a task can overrun its fair share longer.

Modern kernels largely escape the trade with **dynamic ticks**:

**`NO_HZ_IDLE`**, now standard, stops the tick on **idle cores** entirely, which matters enormously for power on laptops and for density on virtualised hosts, where a thousand idle guests ticking at 1000 Hz is pure waste.

**`NO_HZ_FULL`** stops the tick on cores running **exactly one runnable task**, since there is nothing to preempt to. This is used for high-performance computing and low-latency workloads where even a 1 microsecond interruption matters.

**High-resolution timers**, `hrtimers`, put the APIC timer in **one-shot mode** and program it for the **next event actually needed**, rather than a fixed periodic tick. The timer becomes event-driven instead of a metronome.

#### What else the timer provides

Preemption is the headline, but the same interrupt underpins several things, which is worth a sentence:

**Timekeeping**, the kernel's clock and `jiffies`.

**CPU accounting**, charging elapsed time to processes, which is where `top` gets its numbers.

**Timeouts**, for `sleep`, socket timeouts, watchdogs and timer callbacks.

**Scheduler decisions generally**, since fair-share schedulers need a sense of elapsed time to compare tasks at all.

So the timer interrupt is not merely a preemption mechanism; it is **the kernel's heartbeat**, and the thing that makes it a genuine supervisor rather than a library the program calls when it feels like it.

---

### In code

```text
Why no software answer can work:

  user program:  while (1) { }

  "the kernel checks periodically"   with WHAT? it is not running
  "the scheduler steps in"           the scheduler IS kernel code
  "a watchdog thread notices"        a thread needs the CPU, which
                                     the loop holds

  every proposal assumes the thing that needs to happen
  HAS ALREADY HAPPENED.

  while your program runs, the kernel has NO THREAD OF EXECUTION.
  It is instructions sitting in memory, doing nothing.

  so the mechanism must come from OUTSIDE the instruction stream.
```

```text
Cooperative multitasking, which is what the absence of this looks like:

  Windows 3.x, classic Mac OS
      programs were expected to YIELD voluntarily, by calling into
      the event loop

      one program that did not yield, through a bug or a tight loop,
      FROZE THE ENTIRE MACHINE

      recovery: the power switch

  everyone has experienced the result. This is the cause.
```

```text
The timer interrupt, step by step:

  the device counts in its OWN circuitry, independently of the CPU
      PIT              the original 8253/8254
      Local APIC timer PER CORE, what Linux normally uses
      HPET             higher-resolution timekeeping
      ARM generic timer the ARM equivalent

  1. the device asserts an interrupt line, via the interrupt controller

  2. the CPU finishes the CURRENT INSTRUCTION, then:
        saves RIP, CS, RFLAGS
        switches to KERNEL MODE (ring 0)
        switches to the KERNEL STACK via the TSS

  3. jumps to the handler address from the IDT, at the timer's vector
        ^ THE ARCHITECTURAL HEART OF THE ANSWER:
          the destination was chosen BY THE KERNEL AT BOOT.
          the running program cannot redirect it, delay it or even
          observe it.

  4. the handler runs:
        update jiffies (the kernel's notion of time)
        run expired timer callbacks
        charge elapsed time to the running task
        decrement its remaining TIME SLICE

  5. the scheduler decides:
        slice exhausted, or a higher-priority task is runnable?
        -> set TIF_NEED_RESCHED on the current task

  6. on the way back to user mode:
        check TIF_NEED_RESCHED -> call schedule() -> context switch

  the interrupted program resumes LATER, exactly where it was,
  with no knowledge that any of this happened.
```

```text
Why the program cannot switch it off:

  the handler address lives in the IDT, written by the kernel
      -> the program cannot point the interrupt at its own code

  CLI (clear interrupt flag) disables maskable interrupts
      -> it is a PRIVILEGED INSTRUCTION

  executing CLI in ring 3:
      NOT silently ignored
      -> GENERAL PROTECTION FAULT
      -> traps into the kernel
      -> the process is typically killed with SIGSEGV

  so the one instruction that could defeat the mechanism is
  unavailable to the code that would want to use it.
  That is why preemption is ENFORCED, not requested.
```

```c
// What the handler does, in outline
void timer_interrupt_handler(void) {
    jiffies++;                        // the kernel's clock advances
    update_process_times();           // charge time to the current task
    run_expired_timers();             // sleep(), socket timeouts, ...

    current->time_slice--;
    if (current->time_slice <= 0 || higher_priority_task_runnable())
        set_tsk_need_resched(current);   // TIF_NEED_RESCHED
    // note: schedule() is NOT called here. The flag is checked on the
    // way back to user mode, so the switch happens at a safe point.
}
```

```text
Tick rate, and how modern kernels escape the trade:

  CONFIG_HZ = 100   -> a tick every 10 ms   coarse, cheap
              250   -> every 4 ms
             1000   -> every 1 ms           fine, expensive

  higher: finer scheduling, lower interactive latency
          BUT more interrupts, more handler time, worse cache
          behaviour, more power

  lower:  less overhead
          BUT coarser scheduling; a task overruns its share longer

  DYNAMIC TICKS largely remove the trade:

    NO_HZ_IDLE    (standard) no tick at all on IDLE cores
                  -> huge for laptop battery life, and for density
                     on virtualised hosts where a thousand idle
                     guests ticking at 1000 Hz is pure waste

    NO_HZ_FULL    no tick on cores running EXACTLY ONE runnable task
                  -> there is nothing to preempt to
                  -> used for HPC and low-latency work where even a
                     microsecond of interruption matters

    hrtimers      put the APIC timer in ONE-SHOT mode and program it
                  for the NEXT EVENT ACTUALLY NEEDED
                  -> event-driven instead of a metronome
```

```text
What else the same interrupt provides:

  TIMEKEEPING       the kernel's clock, jiffies
  CPU ACCOUNTING    charging elapsed time to processes
                    -> this is where top gets its numbers
  TIMEOUTS          sleep(), socket timeouts, watchdogs, callbacks
  SCHEDULING        fair-share schedulers need a sense of elapsed
                    time to compare tasks at all

  so it is not merely a preemption mechanism. It is the kernel's
  HEARTBEAT, and the thing that makes it a genuine supervisor rather
  than a library the program calls when it feels like it.
```

---

### What they ask next

**"Why can this not be done in software?"**
Because every software mechanism requires the kernel to be executing, and while a user program runs, it is not. Any proposed check, watchdog or scheduler is itself code that needs the CPU the loop is holding. The mechanism must come from outside the instruction stream.

**"What stops a program from disabling the timer?"**
`CLI` is a privileged instruction. Executing it in ring 3 raises a general protection fault rather than being ignored, and the kernel usually kills the process. Privilege levels are what make the protection real rather than advisory.

**"What happens to the interrupted instruction?"**
The CPU completes the current instruction before taking the interrupt, saves `RIP` pointing at the **next** one, and restores it on return. The program resumes exactly where it was and cannot tell it was interrupted, except by observing the clock.

**"Why does the handler set a flag instead of switching immediately?"**
Because the interrupt arrives at an arbitrary point, possibly inside a kernel critical section where switching would be unsafe. Setting `TIF_NEED_RESCHED` defers the decision to a known safe point, the return to user mode or a preemption point in the kernel.

**"What is a tickless kernel?"**
One that does not run a fixed periodic tick when it is unnecessary. `NO_HZ_IDLE` stops the tick on idle cores for power, and `NO_HZ_FULL` stops it on cores running a single runnable task, since there is nothing to preempt to. `hrtimers` then program the timer for the next needed event instead.

**"How does this relate to cooperative multitasking?"**
Cooperative systems had no such mechanism and relied on programs yielding voluntarily, so a single non-yielding program froze the machine. Preemptive multitasking is precisely the hardware timer plus the privilege rule, which is why it is a property of the **hardware and the kernel together** rather than of the scheduler alone.

**"Does a higher tick rate always improve responsiveness?"**
Up to a point. Beyond it the handler's own cost, cache pollution and power draw outweigh the finer granularity, which is why the default settled at 250 or 1000 rather than climbing, and why dynamic ticks were a better answer than simply raising the number.

**The common wrong answer** is "the scheduler preempts the process". That describes the outcome and skips the question, which is how the scheduler gets to run at all when it has no CPU. The answer is a hardware device that is independent of the instruction stream, an interrupt vector the kernel controls, and a privileged instruction the program is not allowed to execute.

---

### Say this in the interview

*"The fact that makes this question interesting is that while a user program is running, the operating system is not. There is one core and it is executing the program's instructions; the kernel has no thread of execution at all. So if the program contains an infinite loop, every software answer fails for the same reason: the kernel checking periodically, a scheduler stepping in, a watchdog thread, all of them are code that needs the CPU the loop is holding. Each proposal assumes the thing that needs to happen has already happened.*

*The historical demonstration is cooperative multitasking in Windows 3.x and classic Mac OS, where programs were expected to yield voluntarily by calling into the event loop, and one program that failed to yield froze the entire machine, with the power switch as the only recovery.*

*So the mechanism has to come from outside the instruction stream. A hardware timer is a programmable device that counts independently of the CPU and raises an interrupt when it expires. The implementations are the original PIT, the Local APIC timer, which is per-core and what Linux normally uses, the HPET for higher-resolution timekeeping, and the ARM generic timer. The crucial property is independence: it counts in its own circuitry, so it fires whether the CPU is running user code, kernel code or a tight loop.*

*When it fires, the device asserts an interrupt line through the interrupt controller. The CPU finishes the current instruction, saves RIP, CS and RFLAGS, switches to kernel mode, switches to the kernel stack via the TSS, and jumps to the handler address from the IDT at the timer's vector. That is the architectural heart of it: the destination was chosen by the kernel at boot and the running program has no influence over it, cannot redirect it, delay it or observe it. The handler updates jiffies, runs expired timer callbacks, charges elapsed time to the running task and decrements its time slice. If the slice is exhausted or a higher-priority task has become runnable, the kernel sets TIF_NEED_RESCHED on the current task. Then on the way back to user mode it checks that flag and calls schedule, which performs the context switch. The flag exists because the interrupt can arrive inside a kernel critical section where switching would be unsafe, so the decision is deferred to a known safe point.*

*Two things stop the program defeating this. The handler address lives in the IDT, written by the kernel, so the program cannot point the interrupt at its own code. And disabling interrupts is a privileged instruction: executing CLI in ring 3 is not silently ignored, it raises a general protection fault that traps into the kernel, which usually kills the process. So the one instruction that could switch the mechanism off is unavailable to the code that would want to, which is why preemption is enforced rather than requested.*

*The tick rate is CONFIG_HZ, commonly 100, 250 or 1000, and the trade is direct: higher gives finer scheduling and lower interactive latency but more interrupts, more handler time, worse cache behaviour and more power, while lower reduces overhead and coarsens scheduling. Modern kernels largely escape it with dynamic ticks. NO_HZ_IDLE, now standard, stops the tick entirely on idle cores, which matters hugely for laptop battery life and for virtualised density where a thousand idle guests ticking at 1000 hertz is pure waste. NO_HZ_FULL stops it on cores running exactly one runnable task, since there is nothing to preempt to, which suits HPC and low-latency work. And hrtimers put the APIC timer in one-shot mode programmed for the next event actually needed, so it is event-driven rather than a metronome.*

*Finally, preemption is the headline but the same interrupt also drives timekeeping, CPU accounting, which is where top's numbers come from, timeouts for sleep and sockets and watchdogs, and scheduling generally, since a fair-share scheduler needs a sense of elapsed time to compare tasks. So it is really the kernel's heartbeat, and the thing that makes it a supervisor rather than a library the program calls when it feels like it."*
