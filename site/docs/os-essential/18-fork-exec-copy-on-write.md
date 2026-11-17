---
id: 18-fork-exec-copy-on-write
title: "fork(), exec(), and Copy-on-Write"
description: "Duplicating a process without duplicating its memory, and why that pays off most when the copy is discarded"

sidebar_position: 18
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What happens internally when a process calls fork()? How does Copy-on-Write (COW) work, what happens when memory is overcommitted, and why is COW critical for the fork-exec pattern?"

---

### Picture it

An office needs a second team working from the same thousand-page manual.

**The obvious approach is to photocopy the manual.** A thousand pages, slow and expensive, and the moment it is done you discover the second team only needed to read page 12 before being handed a completely different manual. The photocopying was entirely wasted.

**The better approach is to share the original and watch for edits.** Both teams read the same copy. The pages are marked "reference only", so an attempt to write on a page is noticed, and only **that page** is photocopied for the person writing. Teams that only read never trigger a single copy.

This is efficient in the ordinary case and spectacular in the common one. The usual reason to create a second team is to immediately hand them a different manual, at which point the shared pages are dropped unread and nothing was copied at all.

One caveat the office must accept. Promising both teams they may write on any page, while only buying paper when they actually do, means promising more paper than is in the cupboard. Usually fine; occasionally there is a day when everybody writes at once.

---

### The proper terms

#### What fork does

**`fork()`** creates a new process by duplicating the calling one. The new process is the **child** and the original the **parent**.

The kernel creates a new **task_struct** and **PCB**, assigns a fresh **PID**, and copies the parent's **page tables**, not its memory. The child inherits copies of the parent's **file descriptors**, which refer to the **same open file descriptions**, so they share a file offset.

The distinguishing feature is that fork returns twice: **0** in the child, and the **child's PID** in the parent. On failure it returns **-1**, typically with **EAGAIN** when the process or PID limit is reached.

#### Copy-on-write

**Copy-on-write**, or **COW**, is what makes fork cheap.

Instead of copying the parent's memory, the kernel maps the **same physical frames** into both processes and marks every writable page **read-only** in both page tables, while recording its true permissions.

Reads proceed normally from the shared frames. When either process writes, the hardware raises a **protection fault**, which is a **minor page fault**. The kernel recognises it as a COW fault, allocates a new frame, copies only that page, updates the writing process's page table to point at the private copy with write permission restored, and restarts the instruction.

So the copy is **deferred**, **per page**, and happens **only for pages actually written**. The fork itself costs only page table duplication, which is proportional to the number of pages mapped rather than the memory used.

The kernel also maintains a **reference count** per shared frame. When it drops to one, the remaining process's page can be made writable again directly, with no copy needed.

#### Why it matters for fork-exec

The dominant use of fork is the **fork-exec pattern**: a shell or server forks and the child immediately calls **`exec()`**, which **replaces** the entire process image with a new program.

`exec` discards the address space completely. Without COW, the kernel would copy the parent's entire memory and then throw all of it away microseconds later. For a large parent, such as a database or JVM forking to run a small helper, that is an enormous waste.

With COW, essentially nothing is copied, because the child writes almost nothing before calling exec. This is why the pattern is viable at all, and why Unix kept two separate calls instead of a single "spawn".

Note what `exec` preserves: the **PID**, open file descriptors not marked **close-on-exec**, and the working directory. That is precisely how a shell implements redirection, by forking, rearranging file descriptors in the child, and then exec'ing.

**`vfork()`** was the historical optimisation for this case, suspending the parent and sharing its address space outright. COW made it largely unnecessary, and it is error-prone.

#### Overcommit

COW means the kernel promises memory it has not reserved. **Overcommit** is allowing the total promised to exceed physical memory plus swap, on the assumption that most of it is never written.

Linux exposes `vm.overcommit_memory`: **0** is a heuristic default, **1** always allows, and **2** enforces a strict limit based on a configured ratio.

The failure mode is that allocation succeeds but the memory is not there when written. Since there is nothing sensible to return from a page fault, the kernel invokes the **OOM killer**, which selects a victim by an **oom_score** weighted by memory footprint and terminates it with **SIGKILL**.

The uncomfortable consequence is that the process killed is often **not** the one that overcommitted, but simply the largest. Databases and JVMs are frequent victims, which is why production systems often tune the OOM score for critical services or disable overcommit outright.

---

### In code

```c
// fork returns twice, which is the first surprising thing about it
pid_t pid = fork();

if (pid < 0) {
    perror("fork");                       // -1: failure, often EAGAIN
} else if (pid == 0) {
    printf("child, pid %d\n", getpid());  // 0 in the child
    _exit(0);
} else {
    printf("parent of %d\n", pid);        // child's PID in the parent
    wait(NULL);                           // reap, or it becomes a zombie
}
```

```text
Copy-on-write, step by step:

  before fork        parent ──► [ page A ]  rw

  after fork         parent ──► [ page A ]  r-   (shared, marked read-only)
                     child  ──► [ page A ]  r-    refcount = 2

  child reads A      no fault, reads the shared frame

  child writes A     protection fault -> minor page fault
                     kernel allocates a new frame, copies A into it

                     parent ──► [ page A  ]  rw   refcount = 1
                     child  ──► [ page A' ]  rw   its own private copy

  Only the written page was ever copied.
```

```c
// The fork-exec pattern: COW's best case, since nothing survives the exec
pid_t pid = fork();
if (pid == 0) {
    int fd = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    dup2(fd, STDOUT_FILENO);              // redirection: rearrange fds first
    close(fd);
    execlp("ls", "ls", "-l", NULL);       // the address space is discarded here
    _exit(127);                           // only reached if exec failed
}
wait(NULL);
```

---

### What they ask next

**"How can fork return twice?"**
It returns once in each process. The kernel creates the child with its return register set to 0 and returns the child's PID in the parent, so one call site produces two outcomes in two different processes.

**"Does COW copy on read?"**
No. Reads are served from the shared frame with no fault at all. Only a write triggers the protection fault, and only the written page is copied.

**"What is the difference between a COW fault and a normal page fault?"**
A COW fault is a **minor** fault: the page is already in memory and only the permissions and sharing need resolving, so it costs microseconds. A **major** fault requires disk I/O and costs milliseconds.

**"Why does `exec` not create a new process?"**
Because fork already did. `exec` replaces the image of the current process, keeping its PID, its non-close-on-exec file descriptors and its working directory. Separating the two is what lets the shell redirect output between them.

**"What is the risk of overcommit?"**
Memory is promised that may not exist. When it is written and unavailable, the OOM killer terminates a process chosen by oom_score, which is frequently the largest process rather than the one responsible.

**The common wrong answer** is "fork copies the whole address space". It copies page tables and shares the frames. The copying is deferred per page, and in the fork-exec case almost none of it ever happens.

---

### Say this in the interview

*"fork creates a child process by duplicating the caller. The kernel allocates a new task_struct, which is the PCB, and a PID and copies the page tables rather than the memory, and the child inherits the parent's file descriptors, which still refer to the same open file descriptions. It returns twice: 0 in the child, the child's PID in the parent, and -1 on failure, typically with EAGAIN at the process limit.*

*Copy-on-write, or COW, is what makes that cheap. Both processes map the same physical frames, with writable pages marked read-only in both page tables. Reads are served from the shared frames. On a write, the hardware raises a protection fault, which is a minor page fault, and the kernel allocates a new frame, copies just that page, restores write permission for the writer and restarts the instruction. So copying is deferred, per page, and only for pages actually written, with a reference count tracking sharing.*

*It matters most for the fork-exec pattern. exec replaces the whole address space, so without copy-on-write the kernel would duplicate the parent's memory and discard it microseconds later, which is ruinous when a large process forks a small helper. With copy-on-write almost nothing is copied. exec preserves the PID, the working directory, and file descriptors not marked close-on-exec, which is how a shell implements redirection.*

*Overcommit is the consequence: the kernel promises more memory than exists, assuming most is never written. If that assumption fails there is nothing sensible to return from a page fault, so the OOM killer selects a victim by oom_score and sends SIGKILL, often killing the largest process rather than the one responsible. Linux exposes the policy as vm.overcommit_memory, where 2 enforces a strict limit instead of overcommitting."*
