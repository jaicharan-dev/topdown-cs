---
id: 16-system-call-lifecycle
title: "System Calls: The Full Lifecycle"
description: "The only legitimate door into the kernel, and what happens each time you knock"

sidebar_position: 16
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a system call, and what exact sequence of hardware and software steps occurs when an application executes one? How do modern SYSCALL instructions differ from legacy INT 0x80 traps?"

---

### Picture it

Back to the hotel. A guest wants something only staff can do, so they ring reception.

Notice how the call actually works. The guest does not walk behind the desk. They **state a request number** from the services card, hand over the **details**, and wait. A member of staff checks the request is permitted, does the work, and hands back a **result**, or an explanation of why not.

Two details matter, and both are about safety.

**The guest cannot choose where staff start working.** They cannot say "begin executing at this point in the staff manual". The phone rings at reception and nowhere else, because the hotel decided in advance where that line terminates.

**Staff never trust the details they are handed.** If a guest says "deliver this to room 412", staff check that 412 exists and that the guest is entitled to send there, because a guest could name any room at all.

The older version of this system had a whole switchboard with hundreds of labelled sockets, and the operator had to look up which socket corresponded to which service. The modern version is a dedicated direct line that connects instantly.

---

### The proper terms

#### What a system call is

A **system call** is the programmatic interface through which a user-mode process requests a service from the **kernel**. It is the only legitimate way to cross from **user mode** into **kernel mode**, which is what makes it the kernel's security boundary.

Applications rarely issue one directly. They call a **wrapper function** in the **C standard library**, such as `read()` in **glibc**, which handles the calling convention and error reporting. The **system call interface** is the kernel's side of that boundary.

Each call is identified by a **system call number**, and the kernel maps the number to a handler through the **system call table**, sometimes called the dispatch table.

#### The lifecycle, step by step

1. The application calls a library wrapper, for example `read(fd, buf, n)`.
2. The wrapper places the **system call number** in a designated register, `RAX` on x86-64, and the **arguments** in others, `RDI`, `RSI`, `RDX` and so on.
3. The wrapper executes the **SYSCALL** instruction.
4. The CPU switches to **kernel mode**, saves the return address in `RCX` and the flags in `R11`, and jumps to the kernel entry point held in the **LSTAR** model-specific register. This is a **mode switch**, not a context switch.
5. The kernel entry code switches to the **kernel stack** for this process and saves the user registers.
6. The kernel **validates** the call number against the table bounds, then **validates the arguments**, in particular checking that any user pointer lies within the caller's address space, using `copy_from_user` rather than dereferencing it directly.
7. The dispatcher indexes the **system call table** and invokes the handler.
8. The handler performs the work. If it must wait, for example on disk, the process is put in the **waiting** state and a **context switch** occurs so the CPU is not idle. This is the only point where a context switch may happen.
9. The return value is placed in `RAX`, with errors returned as **small negative values**.
10. The kernel restores the user registers and executes **SYSRET**, returning to user mode.
11. The wrapper checks the return value, and on error sets **errno** and returns `-1`.

Step 6 is the part worth emphasising. Every pointer from user space is untrusted, and failing to validate it is the classic kernel vulnerability.

#### SYSCALL versus INT 0x80

The old mechanism was a **software interrupt**. `INT 0x80` raised interrupt vector 0x80, and the CPU consulted the **Interrupt Descriptor Table**, performed privilege checks on the gate descriptor, and switched stacks through the **Task State Segment**. That is a lot of memory access and checking for an operation performed millions of times a second.

**SYSCALL**, with **SYSENTER** as the Intel equivalent, is a **fast system call** instruction added precisely because this cost mattered. It does not consult the IDT at all. The kernel entry point is pre-loaded into the **LSTAR** register, so the CPU jumps straight there, saving the return address in a register instead of pushing to a stack. The result is roughly **two to three times faster**.

There is a third piece. The **vDSO**, or virtual dynamic shared object, is a small kernel-provided library mapped into every process. Calls such as `gettimeofday` and `clock_gettime` are served entirely in **user mode** by reading a kernel-updated page, so they involve **no mode switch at all**. That is the fastest category: not a faster system call, but no system call.

`INT 0x80` still works on x86-64 for compatibility with 32-bit binaries.

---

### In code

```text
The journey of one read(), by privilege level:

  USER MODE
    application:  read(fd, buf, n)
    glibc:        mov rax, 0        ; __NR_read
                  mov rdi, fd
                  mov rsi, buf
                  mov rdx, n
                  syscall           ; <-- the boundary
  ------------------------------------------------- mode switch in
  KERNEL MODE
    entry:        switch to kernel stack, save user registers
    validate:     is rax a valid call number?
                  is buf inside this process's address space?
    dispatch:     sys_call_table[0] -> sys_read
    work:         if data is not ready, block and context-switch away
    return:       result (or negative error) in rax
                  sysret
  ------------------------------------------------- mode switch out
  USER MODE
    glibc:        if rax < 0 { errno = -rax; return -1; }
                  return rax
```

```text
Why SYSCALL replaced INT 0x80:

  INT 0x80    look up vector 0x80 in the Interrupt Descriptor Table
              check the gate descriptor's privilege level
              switch stacks via the Task State Segment
              push return address and flags to the stack
              -> several memory accesses before any work begins

  SYSCALL     read the entry point from the LSTAR register
              save return address in RCX, flags in R11
              jump
              -> no table lookup, roughly 2 to 3 times faster

  vDSO        no kernel entry at all for a few calls such as
              clock_gettime: read a kernel-maintained page in user mode
```

---

### What they ask next

**"Is a system call a context switch?"**
No, it is a mode switch into the same process. A context switch only occurs if the call blocks, at step 8, and the scheduler runs something else.

**"Why must the kernel copy arguments rather than dereference user pointers?"**
Because the pointer is attacker-controlled. It might point into kernel memory, or into an unmapped page that would fault in an unsafe context. `copy_from_user` validates the range and handles faults safely.

**"Why are errors returned as small negative numbers?"**
It lets one register carry both success and failure without a second channel. The kernel returns `-EBADF` and similar, and the library wrapper converts that into `-1` with `errno` set.

**"What is the vDSO for?"**
To serve a handful of very frequent, read-only calls without entering the kernel at all. The kernel keeps a page updated with the time, mapped read-only into every process, so `clock_gettime` is an ordinary memory read.

**"How does `strace` work?"**
Through `ptrace`, which asks the kernel to stop the traced process on entry to and exit from each system call so the tracer can inspect registers. That is also why tracing slows a program dramatically.

**The common wrong answer** is describing a system call as "calling a kernel function". It is a controlled transition to a kernel-chosen entry point, and the user side picks a service **number**, never an address.

---

### Say this in the interview

*"A system call is how a user-mode process requests a service from the kernel, and it is the only legitimate way to enter kernel mode. Applications normally call a C library wrapper such as glibc's read rather than issuing one directly.*

*The sequence is: the wrapper puts the system call number in RAX and arguments in RDI, RSI, RDX and so on, then executes SYSCALL. The CPU switches to kernel mode, saves the return address in RCX and flags in R11, and jumps to the entry point in the LSTAR register, which is a mode switch rather than a context switch. The kernel switches to the kernel stack, saves user registers, validates the call number and then the arguments, checking any user pointer lies in the caller's address space using copy_from_user. It indexes the system call table, runs the handler, and if the handler must wait it blocks the process and a context switch happens there. The result goes in RAX, with errors as small negative values, then SYSRET returns to user mode and the wrapper sets errno and returns -1 on error.*

*INT 0x80 was a software interrupt requiring an Interrupt Descriptor Table lookup, privilege checks on the gate descriptor and a stack switch through the Task State Segment. SYSCALL, and SYSENTER on Intel, skip the IDT entirely by reading a pre-registered entry point from LSTAR, which is roughly two to three times faster. The vDSO goes further: a kernel-maintained page mapped into every process serves calls like clock_gettime entirely in user mode, with no mode switch at all."*
