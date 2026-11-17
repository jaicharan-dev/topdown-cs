---
id: 15-user-mode-vs-kernel-mode
title: "User Mode vs. Kernel Mode"
description: "One bit in the CPU deciding what an instruction is allowed to do"

sidebar_position: 15
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between user mode and kernel mode? Which specific CPU instructions are privileged, and what is the difference between a mode switch and a context switch?"

---

### Picture it

Think of a hotel where guests hold room keys and staff hold master keys.

**A guest can do a great deal.** Move around their room, use the facilities, ring reception to ask for things. What they cannot do is open the electrical cupboard, reprogram the door locks, or walk into another guest's room. Those abilities are not withheld because guests are untrusted individuals; they are withheld because one mistake would affect everybody.

**When a guest needs something only staff can do**, they ring reception. A member of staff performs the action, checking first that the request is reasonable, and then hands back the result. The guest never holds the master key, not even for a moment.

Two things are worth separating here. **Reception answering your call** is a change in who is acting, and you are still the guest being served. **A different guest being served instead** is a change in whose request is in progress. The first happens constantly and is cheap. The second is much rarer and more disruptive.

---

### The proper terms

#### The two modes

Modern CPUs have a **mode bit**, or more generally a **privilege level**, in a status register that determines which instructions may execute.

**User mode** is restricted. Application code runs here and cannot execute **privileged instructions** or access memory outside its own **address space**.

**Kernel mode**, also called supervisor mode, is unrestricted. The operating system kernel runs here with full access to every instruction and all of physical memory.

On x86 the mechanism is **rings**, numbered 0 to 3. **Ring 0** is kernel mode and **Ring 3** is user mode; rings 1 and 2 were intended for drivers and are essentially unused. Virtualisation added **Ring -1**, or VMX root mode, for the hypervisor.

The purpose is **protection**. Without it, any program could halt the machine, read another process's memory, or reprogram the page tables, so neither isolation nor stability would be possible.

#### Which instructions are privileged

The rule is that an instruction is privileged if executing it could compromise isolation or the kernel's control of the machine. Concretely:

**I/O instructions**, such as `IN` and `OUT`, because direct device access bypasses the file permissions and device drivers the kernel enforces.

**Halt**, `HLT`, because a user program could otherwise stop the processor.

**Loading the page table base register**, `CR3` on x86, because changing the address space map would let a process see any memory it liked.

**Interrupt control**, `CLI` and `STI`, because disabling interrupts would prevent the timer from ever preempting the process, defeating the scheduler.

**Loading the descriptor tables**, `LGDT` and `LIDT`, because they control the interrupt vectors and segment definitions.

**Setting the timer**, for the same reason as interrupt control.

**Mode switching itself**, since a program that could set the mode bit directly would simply grant itself kernel mode.

Attempting a privileged instruction in user mode raises a **general protection fault**, which the kernel usually turns into **SIGSEGV** or **SIGILL**.

#### Mode switch versus context switch

This distinction is the heart of the question.

A **mode switch** changes only the **privilege level**. The same process continues; it is merely executing kernel code on its behalf. The address space does **not** change, and the kernel is mapped into every process's address space precisely so that this is cheap. It costs tens to a couple of hundred nanoseconds and happens on every **system call**, **interrupt** and **exception**.

A **context switch** changes which **process** is running. It saves the full register set into the old process's **PCB**, loads the new one's, and changes the **address space** by reloading the page table base register, which flushes or invalidates **TLB** entries and leaves the caches cold. It costs on the order of a microsecond plus the indirect cache effects.

The relationship: **every context switch includes a mode switch, but most mode switches are not context switches**. A system call enters the kernel, does its work, and returns to the **same** process. That is the sentence to have ready.

---

### In code

```text
Privilege levels on x86:

   Ring -1   hypervisor (VMX root)        added for virtualisation
   Ring  0   kernel mode                  all instructions, all memory
   Ring  1   (unused)
   Ring  2   (unused)
   Ring  3   user mode                    restricted instruction set
```

```text
Mode switch vs context switch:

                          mode switch            context switch
  what changes            privilege level        the running process
  address space           unchanged              changed (CR3 reload)
  registers saved         a few                  the full set, into the PCB
  TLB                     untouched              flushed or tagged
  caches                  warm                   go cold
  cost                    ~100 ns                ~1 us plus cache effects
  triggered by            syscall, interrupt,    scheduler decision
                          exception

  Every context switch contains a mode switch.
  Most mode switches contain no context switch.
```

```c
// A single read() involves two mode switches and usually no context switch
ssize_t n = read(fd, buf, len);
//  user mode  -> SYSCALL -> kernel mode   (mode switch in)
//  kernel validates fd and buf, copies data
//  kernel mode -> SYSRET -> user mode     (mode switch out)
//
// If the data is not ready, the kernel blocks the process, and only
// THEN does a context switch occur, to run something else meanwhile.
```

---

### What they ask next

**"Is a system call a context switch?"**
No, it is a mode switch. The same process continues executing, just in kernel mode. A context switch only follows if the call blocks and the scheduler picks another process.

**"Why is the kernel mapped into every process's address space?"**
So entering the kernel does not require changing the address space, which would mean a TLB flush on every system call. The kernel pages are marked supervisor-only, so user code cannot read them.

**"What changed with Meltdown and KPTI?"**
**Kernel Page Table Isolation** was introduced to mitigate Meltdown by unmapping most kernel pages from the user address space. That reintroduced an address space change on every system call, which is why KPTI carried a measurable performance cost.

**"How does the CPU know a system call is legitimate?"**
The transition instruction switches mode and simultaneously jumps to a kernel entry point whose address the kernel configured in advance. User code picks which service to request through a number in a register, but it cannot choose where the kernel begins executing.

**"Can user code ever perform I/O directly?"**
Normally no. The kernel can grant access to specific ports through an I/O permission bitmap, and modern high-performance I/O frameworks map device queues into user space after the kernel has validated the setup, but the policy decision stays with the kernel.

**The common wrong answer** is treating any entry into the kernel as a context switch. That conflates a cheap, constant event with an expensive, comparatively rare one.

---

### Say this in the interview

*"CPUs have a mode bit, or privilege level, deciding which instructions may run. User mode is restricted and runs application code; kernel mode, or supervisor mode, is unrestricted and runs the operating system. On x86 these are rings, with Ring 0 as kernel and Ring 3 as user, and Ring -1 added for hypervisors. The purpose is protection: without it any program could halt the machine or read another process's memory.*

*Privileged instructions are those that could compromise isolation. I/O instructions like IN and OUT, HLT, loading the page table base register CR3, interrupt control with CLI and STI, loading the descriptor tables with LGDT and LIDT, setting the timer, and changing the mode bit itself. Attempting one in user mode raises a general protection fault, which the kernel turns into a signal, typically SIGSEGV or SIGILL.*

*A mode switch changes only the privilege level. The same process continues, the address space is unchanged because the kernel is mapped into every process, and it costs on the order of a hundred nanoseconds. It happens on every system call, interrupt and exception.*

*A context switch changes which process runs. It saves the full register set to the process control block, the PCB, loads another, and changes the address space, which flushes or invalidates the TLB and leaves the caches cold, costing about a microsecond plus indirect effects.*

*So every context switch includes a mode switch, but most mode switches are not context switches: a system call returns to the same process."*
