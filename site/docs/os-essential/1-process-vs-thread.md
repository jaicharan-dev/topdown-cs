---
id: 1-process-vs-thread
title: "Process vs. Thread: Architecture, Memory & Tradeoffs"
description: "Separate buildings against desks in one room, and why swapping buildings costs so much more"

sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a process and a thread? Why is a process context switch significantly more expensive than a thread context switch, and when would you use one over the other?"

---

### Picture it

Think of two companies and the people inside them.

**A process is a company with its own building.** It has its own offices, its own filing cabinets, its own front door. Nothing inside is reachable from the company next door, which is exactly the point: one company cannot rummage through another's files, by accident or otherwise.

**A thread is an employee inside that building.** Several employees share the same filing cabinets, the same stock room, the same address. Each has their own desk with their own half-finished work on it, but the shared material is genuinely shared. One employee writing into a file is immediately visible to the others, which makes coordination cheap and mistakes easy.

Now the cost question. **Swapping one employee for another at the same desk** means putting away one person's papers and taking out another's. Quick. **Swapping one company for another in the same building** means emptying the whole building and refilling it: new cabinets, new stock room, new everything, and the staff spend the first hour not knowing where anything is.

That last sentence is the whole answer to why one switch costs more than the other.

---

### The proper terms

#### What each one is

A **process** is a program in execution: an independent unit with its own **address space**. The operating system tracks it with a **Process Control Block**, or PCB,, holding its **process ID**, state, **program counter**, registers, **page table** pointer, and open file table.

A **thread** is a unit of execution **inside** a process, sometimes called a lightweight process. Threads of one process share its **code segment**, **data segment**, **heap** and open files. Each thread has its own **stack**, **registers**, **program counter** and thread control block.

The short form: processes share nothing by default, threads share everything except their stack and registers.

#### Why a process switch costs more

A **context switch** saves the state of what was running and restores the state of what comes next. Both kinds save registers and the program counter, which is cheap. The difference is what else has to change.

A thread switch inside one process keeps the **address space**, so the **page table** stays loaded and memory translation is untouched.

A process switch changes the address space. On x86 that means reloading the page table base register, **CR3**, and this is where the cost appears:

**The TLB is flushed.** The **Translation Lookaside Buffer** caches recent virtual-to-physical translations. Those entries belong to the old address space, so most are invalidated. Afterwards every memory access misses until the TLB refills, each miss costing a **page table walk**.

**Caches go cold.** The new process touches different memory, so the L1 and L2 caches gradually refill with its data while the old contents are evicted. This is **cache pollution**, and it is indirect: the switch itself is quick, and the slowdown shows up over the following thousands of instructions.

Modern CPUs soften the TLB cost with address space identifiers, or **PCIDs** on x86, which tag entries by address space so a switch need not flush everything. It reduces the cost rather than removing it.

#### Choosing between them

Use **threads** when the work shares a lot of data and coordination is frequent: parallel computation over a shared array, a server handling many connections against shared caches. The cost is that a crash takes down the whole process, and shared mutable state brings **race conditions**.

Use **processes** when **isolation** matters more than sharing: a browser giving each tab its own process so one crash does not kill the browser, or a system running untrusted code. The cost is that communication requires explicit **inter-process communication**.

---

### In code

```c
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

int shared = 0;                      // one copy, shared by every thread

void *worker(void *arg) {
    shared++;                        // visible to the other threads at once
    return NULL;
}

int main(void) {
    // Threads: one address space, so 'shared' is genuinely shared
    pthread_t a, b;
    pthread_create(&a, NULL, worker, NULL);
    pthread_create(&b, NULL, worker, NULL);
    pthread_join(a, NULL);
    pthread_join(b, NULL);
    printf("threads saw: %d\n", shared);       // 2

    // Processes: fork gives the child its own address space
    shared = 0;
    if (fork() == 0) {
        shared++;                              // the child's own copy
        _exit(0);
    }
    wait(NULL);
    printf("parent sees: %d\n", shared);       // 0, the child's change is invisible
}
```

The two printed numbers are the distinction in one program. The threads agreed on `shared`; the forked child changed a copy the parent never saw.

---

### What they ask next

**"Is a thread switch always cheaper?"**
Between threads of the **same** process, yes, because the address space is unchanged. Switching between threads of **different** processes is a full process switch, since the address space still changes.

**"What are user-level versus kernel-level threads?"**
Kernel-level threads are scheduled by the OS, so one blocking call does not stall the others and they can run on several cores. User-level threads are managed in a library and are cheaper to switch, but one blocking system call blocks every thread in the process. Most modern runtimes map user threads onto kernel threads.

**"Do threads have separate stacks but a shared heap?"**
Yes, and that is the practical dividing line. Local variables are per thread; anything allocated on the heap is shared and needs synchronisation.

**"Why do browsers use processes per tab when threads are cheaper?"**
Isolation is worth the cost. A crash or an exploit is contained in one process, and the operating system enforces that boundary rather than trusting the code.

**The common wrong answer** is "a process switch is expensive because it saves more registers". The register count is nearly identical. The cost is the address space change: the TLB flush and the cold caches that follow.

---

### Say this in the interview

*"A process is a program in execution with its own address space, tracked by the operating system in a Process Control Block holding its process ID, state, program counter, registers and page table pointer. A thread is a unit of execution inside a process. Threads share the code segment, data segment, heap and open files, and each has its own stack, registers and program counter.*

*A process context switch costs more because it changes the address space. Reloading the page table base register, CR3 on x86, flushes the Translation Lookaside Buffer, so subsequent memory accesses miss and need page table walks, and the caches go cold as the new process touches different memory, which is cache pollution. A thread switch within one process keeps the address space, so translation and caches are undisturbed. Modern CPUs reduce the TLB cost with address space identifiers, or PCIDs on x86, which tag entries so a switch need not flush everything.*

*I would choose threads when the work shares significant data and coordination is frequent, accepting race conditions and the risk that one crash kills the process. I would choose processes when isolation matters more than sharing, as browsers do per tab, accepting that communication then needs explicit inter-process communication."*
