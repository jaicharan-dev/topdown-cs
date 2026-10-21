---
id: 18-fork-exec-copy-on-write
title: "fork(), exec(), and Copy-on-Write"
description: "Understand how fork() creates processes instantly using Copy-on-Write, why that matters for exec(), and what happens when memory gets overcommitted."
sidebar_position: 18
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What happens internally when a process calls fork()? How does Copy-on-Write (COW) work, what happens when memory is overcommitted, and why is COW critical for the fork-exec pattern?"

`fork()` creates a new process by cloning the current one. The old, naive way to do that was to physically copy all of the parent's memory — which is slow and, as you'll see below, usually pointless. Modern OSs use a trick called **Copy-on-Write** to make `fork()` almost instant.

Think of it like two people sharing a textbook instead of photocopying it. You and a colleague both need to read the same 1,000-page physics book. Instead of spending three hours at the copier, you just put one book on the desk between you — you both read the same physical pages. Only if one of you picks up a pen and starts writing notes on page 42 does anyone bother making a copy — and even then, only that one page gets copied. The other 999 stay shared.

---

### Shared until someone writes

<Diagram>
<Row>
<Box label="Parent" sub="page table" />
<Arrow />
<Box label="Frame 842" sub="read-only, shared" />
<Arrow />
<Box label="Child" sub="page table" />
</Row>
</Diagram>

Here's what actually happens, step by step:

1. **`fork()` copies only the page table**, not the memory itself. Both parent and child's page table entries point at the exact same physical frames. Zero bytes of RAM are duplicated.
2. **Those shared pages get marked read-only** in both processes' page tables — even pages that were originally writable.
3. **Either process tries to write** to one of those pages — say, `counter = 42`.
4. **The CPU's memory management unit catches it.** Writing to a read-only page triggers a hardware page fault.
5. **The kernel steps in.** It recognizes this as a COW fault (not a real error), allocates one new physical frame, copies the 4KB of data into it, points the faulting process's page table at the new frame, marks both the original and new frame read-write again, and replays the write instruction — all transparently. The app never knows this happened.

So the parent and child only diverge in memory exactly where one of them actually writes. Everything else stays shared for free.

---

### Why this matters: `fork()` is almost always followed by `exec()`

In Unix, running any program — even just `ls` in your shell — means the shell calls `fork()` to clone itself, then immediately calls `execve()` in the child to replace that clone's entire memory with a new program.

If `fork()` had actually copied, say, 4GB of RAM, all of that work would be thrown away a few microseconds later when `execve()` wipes the child's address space clean. Copy-on-write means `fork()` is a cheap, constant-time pointer copy — no wasted work, no matter how much memory the parent is using.

---

### The dark side: memory overcommit and the OOM killer

Because COW delays the actual memory allocation until someone writes, Linux lets you **overcommit** memory — a machine with 16GB of RAM can happily fork processes that together claim 32GB of virtual memory, betting that they won't all write to everything at once.

Usually that bet pays off. But if parent and child both start writing to all their shared pages at the same time, and physical RAM actually runs out with no swap space left, the kernel has a problem: a COW page fault it literally cannot satisfy. Its last resort is the **OOM killer** — it scores every process (roughly, by how much memory it's using) and force-kills the worst offender with `SIGKILL` to free up RAM before the whole system locks up.

---

### Say this in the interview

*"`fork()` doesn't copy memory — it copies the page table and marks the shared physical pages read-only in both processes. The first write to any shared page triggers a hardware page fault, and the kernel copies just that one 4KB page before letting the write through. This makes `fork()` essentially free, which matters because it's almost always immediately followed by `exec()`, which throws the copied memory away anyway. The tradeoff is memory overcommit — if too many COW pages get dirtied at once and RAM runs out, the OOM killer starts force-killing processes."*

---

### Code: watching Copy-on-Write happen

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int global_val = 100;

int main() {
    printf("[Initial] global_val address: %p | value: %d\n", (void*)&global_val, global_val);

    pid_t pid = fork();

    if (pid == 0) {
        // Child Process
        printf("[Child Before Write] Virtual Address: %p | value: %d\n", 
               (void*)&global_val, global_val);
        
        // This write triggers a hardware protection page fault and COW frame copy!
        global_val = 999;
        
        // Virtual address remains IDENTICAL in child, but now maps to a different physical frame!
        printf("[Child After Write]  Virtual Address: %p | value: %d\n", 
               (void*)&global_val, global_val);
        exit(0);
    } else {
        // Parent Process
        wait(NULL);
        printf("[Parent After Child] Virtual Address: %p | value: %d\n", 
               (void*)&global_val, global_val);
    }
    return 0;
}
```
