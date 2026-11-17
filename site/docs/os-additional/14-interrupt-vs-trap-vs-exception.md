---
id: 14-interrupt-vs-trap-vs-exception
title: "Interrupt vs Trap vs Exception"
description: "Who caused it and whether it was wanted, and the saved instruction pointer that tells you whether to try again"

sidebar_position: 14
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between an interrupt, a trap, and an exception? In x86 architecture, how does the saved instruction pointer (`RIP`) behave differently across faults, traps, and aborts?"

---

### Picture it

You are reading a book, and three different things make you stop.

**The doorbell rings.** Nothing in the book caused it. It could have rung at any moment, on any page, and it has no relationship to the sentence you were reading. You finish your sentence, deal with the door, come back.

**You reach a footnote marker and look it up.** You caused this yourself, on purpose. You knew exactly where it was and you chose to go. When you return, you carry on with **the next word**, because the footnote marker has been dealt with and re-reading it would send you to the footnote again, forever.

**You hit a word you cannot read, because the page is folded over.** You caused this too, in the sense that it happened because of what you were doing, but you certainly did not want it. You unfold the page, and then you **go back to that same word and read it properly**. Starting at the next word would skip it.

Those last two look similar and differ in one decisive way: **where you resume.** One continues **after** the thing; the other retries **the thing itself**. And you can work out which from a single question: **was the operation completed, or not?** The footnote was completed. The folded word was not.

And there is a fourth case, rarer and worse. **The book falls in the river.** There is no sensible place to resume because you no longer know reliably where you were. You do not retry, and you do not continue. You stop.

---

### The proper terms

#### The three categories

The distinction has two axes: **who caused it** and was it wanted.

**An interrupt** is **asynchronous** and **external**. It is raised by a **device**, such as the timer, a network card or a disk controller, and it has **no relationship to the instruction currently executing**. It could arrive at any point in any program.

Interrupts are **maskable** through the interrupt flag, with **`CLI`** and **`STI`**, except the NMI, the **non-maskable interrupt**, used for hardware failures and watchdogs. The CPU **completes the current instruction** before taking it.

**A trap** is **synchronous** and **intentional**. The program deliberately caused it, in order to request something. **`SYSCALL`**, the legacy **`INT 0x80`**, **`INT3`** for a debugger breakpoint, **`INTO`** on overflow, and the single-step debug exception are all traps. They are expected, and they are the mechanism by which a program asks the kernel for a service.

**An exception** is **synchronous** and **unintentional**. It is raised by the processor because the **currently executing instruction cannot proceed**: a **page fault**, a **divide error**, an **invalid opcode**, a **general protection fault**. The program caused it, in the sense that its own instruction triggered it, but it did not want it.

So: **asynchronous means a device, synchronous means this instruction; intentional means a request, unintentional means an error.**

On x86 all three are dispatched identically, through the **IDT**, the Interrupt Descriptor Table. **Vectors 0 to 31** are reserved for processor-detected exceptions, and **32 to 255** are available for external and software interrupts, which is why the architecture manuals often call all of them interrupts.

#### How RIP behaves: faults, traps and aborts

Intel classifies exceptions by **what the saved `RIP` points at**, which is really a statement about **whether the instruction completed**. This is the substance of the question.

**A fault.** The condition is detected **before the instruction completes**, with no side effects committed, and it is potentially **correctable**.

**The saved `RIP` points at the faulting instruction itself.** So after the handler fixes the condition, `IRET` re-executes that same instruction, which now succeeds.

Examples: `#PF` page fault, `#GP` general protection fault, `#UD` invalid opcode, `#DE` divide error, `#NM` device not available.

The **page fault is the whole justification for this design**. A program touches a page that is not resident. The handler allocates a frame, reads the page in, updates the page table and returns. The **same instruction runs again** and this time the translation succeeds. **The program never learns that anything happened**, which is exactly how demand paging, copy-on-write and memory-mapped files are built.

**A trap.** The condition is reported **after the instruction completes**.

**The saved `RIP` points at the instruction after it.** Execution resumes with the **next** instruction.

Examples: `#BP` breakpoint from `INT3`, `#OF` overflow from `INTO`, and `#DB` debug exception for single-stepping.

The reason is obvious once stated: a breakpoint that resumed at the breakpoint instruction would trap again immediately and loop forever. The instruction did what it was meant to do, so you continue past it.

**An abort.** A **severe error** where the **saved state may be imprecise or unreliable**.

**`RIP` may not point anywhere useful**, and the faulting program generally cannot be resumed at all.

Examples: `#DF` double fault, raised when a fault occurs while handling a fault, and `#MC` machine check, signalling a hardware error such as uncorrectable memory corruption.

The three-line summary to give:

**Fault: re-execute the instruction.**

**Trap: continue after the instruction.**

**Abort: do not resume.**

And the rule for deriving it rather than memorising it: **ask whether the instruction completed.** Not completed means retry it, so `RIP` points at it. Completed means move on, so `RIP` points past it.

#### Some careful cases

**`#DE`, divide error, is a fault, not a trap**, which surprises people. The division did not complete, so `RIP` points at the `DIV` instruction. That makes it a fault architecturally, but not a usefully **restartable** one: re-executing divides by zero again, so the handler must change the operands or terminate the process, which is why Linux delivers **`SIGFPE`**.

**`INT3` is a trap**, which is what makes debuggers work: the debugger patches a byte with `0xCC`, the trap fires with `RIP` **after** it, and the debugger restores the original byte, rewinds `RIP` by one, and single-steps.

**A page fault inside a kernel handler** is normal and expected, as when `copy_to_user` touches a not-yet-present user page. The kernel has exception tables precisely so such faults can be fixed up rather than being fatal.

**A double fault is not "two faults"**, it is a fault raised while delivering another fault, typically because the kernel stack is unusable. Hence the **IST**, interrupt stack table, which gives the double fault handler a known-good stack so the machine can at least report the failure rather than triple-faulting, which resets the processor.

#### The delivery mechanism

For all three, the CPU:

**Pushes `SS`, `RSP`, `RFLAGS`, `CS` and `RIP`** onto the stack, plus an **error code** for some exceptions such as `#PF` and `#GP`.

**Switches stacks if needed**, through the **TSS** on a privilege change, or the **IST** for designated vectors.

**Jumps to the handler** named by the **IDT gate**.

**`IRET`** pops the saved state back and resumes.

One more distinction worth knowing, because it concerns interrupt latency: an **interrupt gate clears the interrupt flag** on entry, so further maskable interrupts are blocked inside the handler, while a **trap gate leaves it set**, allowing nesting. Hardware interrupt handlers normally use interrupt gates; system call entry does not need to block interrupts and historically used a trap gate.

Additionally, the page fault handler needs the faulting **address**, which is not in the error code: it is in **`CR2`**, and the error code instead describes **why** it faulted, as present or not, read or write, user or supervisor, instruction fetch.

---

### In code

```text
The three categories, on two axes:

                  ASYNCHRONOUS            SYNCHRONOUS
                  (a device caused it)    (this instruction caused it)

  INTENTIONAL        --                   TRAP
  (requested)                             SYSCALL, INT 0x80, INT3,
                                          INTO, single-step

  UNINTENTIONAL   INTERRUPT               EXCEPTION
  (unwanted)      timer, NIC, disk,       page fault, divide error,
                  keyboard, NMI           invalid opcode, GP fault

  interrupts are MASKABLE via CLI/STI, except the NMI.
  the CPU COMPLETES THE CURRENT INSTRUCTION before taking one.

  on x86 all three are dispatched identically through the IDT:
     vectors   0-31   processor-detected exceptions
     vectors  32-255  external and software interrupts
  which is why the manuals often call all of them interrupts.
```

```text
How RIP behaves, which is really "did the instruction complete?":

  FAULT          detected BEFORE the instruction completes,
                 no side effects committed, potentially correctable

                 saved RIP -> THE FAULTING INSTRUCTION ITSELF
                 IRET RE-EXECUTES it, and this time it succeeds

                 #PF page fault, #GP general protection,
                 #UD invalid opcode, #DE divide error,
                 #NM device not available

  TRAP           reported AFTER the instruction completes

                 saved RIP -> THE INSTRUCTION AFTER IT
                 execution resumes with the NEXT instruction

                 #BP breakpoint (INT3), #OF overflow (INTO),
                 #DB debug / single-step

  ABORT          severe error, saved state may be IMPRECISE

                 RIP may point nowhere useful
                 the program CANNOT BE RESUMED

                 #DF double fault, #MC machine check

  the rule, so you can derive it rather than memorise it:
     DID THE INSTRUCTION COMPLETE?
        no  -> retry it   -> RIP points AT it      (fault)
        yes -> move on    -> RIP points PAST it    (trap)
```

```text
Why the page fault design is the whole point of "fault":

  mov rax, [rbx]        ; rbx points at a page that is NOT RESIDENT

  1. the CPU attempts the translation, finds the PTE not present
  2. #PF is raised. SAVED RIP POINTS AT THIS MOV.
     the faulting ADDRESS is in CR2; the ERROR CODE says WHY
     (present/not, read/write, user/supervisor, instruction fetch)
  3. the handler allocates a frame, reads the page in, updates the
     page table
  4. IRET
  5. THE SAME MOV RUNS AGAIN, and this time it succeeds

  the program NEVER LEARNS that any of this happened.

  this is exactly how demand paging, copy-on-write and memory-mapped
  files are built. All of them depend on RIP pointing AT the
  instruction so it can be retried transparently.
```

```text
Why a breakpoint must be a trap:

  a debugger sets a breakpoint by PATCHING a byte with 0xCC (INT3)

  if #BP were a FAULT:
     RIP points AT the INT3
     IRET re-executes the INT3
     -> traps again, immediately, FOR EVER

  because #BP is a TRAP:
     RIP points AFTER the INT3
     the debugger restores the original byte, REWINDS RIP by one,
     and single-steps the real instruction
     -> which is exactly how every debugger works
```

```text
Careful cases worth knowing:

  #DE divide error is a FAULT, not a trap
     the division did not complete, so RIP points at the DIV.
     architecturally a fault, but NOT usefully RESTARTABLE:
     re-executing divides by zero again, so the handler must change
     the operands or kill the process. Linux delivers SIGFPE.

  a page fault INSIDE a kernel handler is normal
     copy_to_user touching a not-yet-present user page does this
     routinely. The kernel keeps EXCEPTION TABLES so such faults are
     fixed up rather than fatal.

  a DOUBLE FAULT is not "two faults"
     it is a fault raised WHILE DELIVERING another fault, typically
     because the kernel stack is unusable.
     Hence the IST (interrupt stack table), giving the #DF handler a
     known-good stack, so the machine can REPORT the failure instead
     of TRIPLE FAULTING, which resets the processor.
```

```text
Delivery, identical for all three:

  the CPU pushes:   SS, RSP, RFLAGS, CS, RIP
                    plus an ERROR CODE for some exceptions
                    (#PF, #GP, #DF, ...)

  switches stacks:  via the TSS on a privilege change,
                    or the IST for designated vectors

  jumps to:         the handler named by the IDT GATE

  IRET:             pops the saved state back and resumes

  and one distinction that concerns interrupt latency:
     INTERRUPT GATE  CLEARS the interrupt flag on entry
                     -> further maskable interrupts are blocked
                        inside the handler
                     -> used for hardware interrupt handlers
     TRAP GATE       LEAVES it set -> nesting is allowed
                     -> syscall entry does not need interrupts off
```

---

### What they ask next

**"Is a system call an interrupt?"**
Architecturally it is dispatched the same way, through the IDT on the legacy `INT 0x80` path, but categorically it is a **trap**: synchronous and deliberate. Modern x86-64 uses `SYSCALL`, which bypasses the IDT entirely and jumps to the address in `LSTAR`, so it is a trap that is no longer an interrupt in any mechanical sense.

**"Why does a fault point at the faulting instruction?"**
Because the instruction did not complete, so the correct resumption is to **retry it** once the condition is fixed. This is what makes demand paging transparent: the handler loads the page and the same instruction runs again successfully, with the program none the wiser.

**"Why does a trap point past the instruction?"**
Because the instruction **did** complete, so re-executing it would repeat the trap forever. A breakpoint resuming at the `INT3` would trap immediately and loop.

**"Can you resume after an abort?"**
Generally no. The saved state may be imprecise, so there is nothing reliable to return to. A double fault usually means the kernel is in an unrecoverable state, and a machine check signals a hardware failure, so the realistic responses are a panic or a reset.

**"Where does the faulting address come from on a page fault?"**
From **`CR2`**, not the error code. The error code describes **why** the fault occurred: whether the page was present, whether the access was a read or a write, whether it came from user or supervisor mode, and whether it was an instruction fetch.

**"What is a triple fault?"**
A fault while delivering a double fault. The processor gives up and **resets**. The interrupt stack table exists specifically to make the double fault handler reliable enough that this does not happen, since a triple fault on real hardware is just a reboot with no diagnostics.

**"What is the difference between an interrupt gate and a trap gate?"**
An interrupt gate clears the interrupt flag on entry, blocking further maskable interrupts inside the handler, while a trap gate leaves it set so nesting is allowed. Hardware interrupt handlers use interrupt gates to keep themselves short and non-reentrant.

**"Is `#DE` a fault or a trap?"**
A fault, since the division never completed. The subtlety is that it is architecturally restartable but not usefully so, because re-executing divides by zero again. The handler must alter the state or terminate the process, which is why Linux sends `SIGFPE`.

**The common wrong answer** is "an interrupt is from hardware and an exception is from software". That gets the first axis and misses the second, and it completely misses the `RIP` question, which is really about **whether the instruction completed**. Fault means not completed, so retry it; trap means completed, so continue past it; abort means the state is unreliable, so do not resume at all.

---

### Say this in the interview

*"The distinction has two axes: who caused it, and whether it was wanted. An interrupt is asynchronous and external, raised by a device such as the timer, a network card or a disk, with no relationship to the instruction currently executing, so it could arrive at any point in any program. Interrupts are maskable through the interrupt flag with CLI and STI, except the non-maskable interrupt used for hardware failures and watchdogs, and the CPU completes the current instruction before taking one. A trap is synchronous and intentional: the program deliberately caused it to request something, so SYSCALL, the legacy INT 0x80, INT3 for a breakpoint, INTO and single-stepping are all traps. An exception is synchronous and unintentional, raised because the currently executing instruction cannot proceed: a page fault, a divide error, an invalid opcode, a general protection fault. So asynchronous means a device, synchronous means this instruction; intentional means a request, unintentional means an error. On x86 all three are dispatched identically through the IDT, with vectors 0 to 31 reserved for processor-detected exceptions and 32 to 255 for external and software interrupts, which is why the manuals often call all of them interrupts.*

*Intel classifies exceptions by what the saved RIP points at, which is really a statement about whether the instruction completed. A fault is detected before the instruction completes, with no side effects committed, and is potentially correctable, so the saved RIP points at the faulting instruction itself and IRET re-executes it. That covers page fault, general protection fault, invalid opcode, divide error and device not available. A trap is reported after the instruction completes, so the saved RIP points at the next instruction and execution resumes past it: breakpoint from INT3, overflow from INTO, and the debug exception for single-stepping. An abort is a severe error where the saved state may be imprecise, so RIP may point nowhere useful and the program generally cannot be resumed: double fault and machine check. So fault means re-execute, trap means continue after, abort means do not resume. And the rule for deriving it rather than memorising it is to ask whether the instruction completed: not completed means retry, so RIP points at it; completed means move on, so RIP points past it.*

*The page fault is the whole justification for the fault design. A program touches a page that is not resident, RIP points at that instruction, the faulting address is in CR2 and the error code says why, the handler allocates a frame, reads the page in and updates the page table, and after IRET the same instruction runs again and succeeds. The program never learns that anything happened, which is exactly how demand paging, copy-on-write and memory-mapped files work. And a breakpoint must be a trap for the opposite reason: if RIP pointed at the INT3, IRET would re-execute it and trap forever, so it points past it and the debugger restores the original byte, rewinds RIP by one and single-steps.*

*A few careful cases. Divide error is a fault rather than a trap, since the division did not complete, but it is not usefully restartable because re-executing divides by zero again, so the handler must change the state or kill the process, which is why Linux sends SIGFPE. A page fault inside a kernel handler is normal, as when copy_to_user touches a page that is not yet present, and the kernel keeps exception tables so those are fixed up rather than fatal. And a double fault is not two faults, it is a fault raised while delivering another, usually because the kernel stack is unusable, which is why the interrupt stack table exists: to give the handler a known-good stack so the machine can report the failure instead of triple faulting, which resets the processor.*

*Mechanically, for all three the CPU pushes SS, RSP, RFLAGS, CS and RIP, plus an error code for some exceptions, switches stacks through the TSS on a privilege change or the IST for designated vectors, and jumps to the handler named by the IDT gate, with IRET popping the state back. One last distinction that concerns interrupt latency: an interrupt gate clears the interrupt flag on entry so further maskable interrupts are blocked inside the handler, while a trap gate leaves it set and allows nesting."*
