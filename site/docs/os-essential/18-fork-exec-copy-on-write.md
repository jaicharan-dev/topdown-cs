---
id: 18-fork-exec-copy-on-write
title: "Process Creation: fork(), exec(), and Copy-on-Write (COW)"
description: "Trace Unix process creation via fork() and exec(), Copy-on-Write (COW) memory optimization, memory overcommit, and the OOM killer."
sidebar_position: 18
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What happens internally when a process calls fork()? How does Copy-on-Write (COW) work, what happens when memory is overcommitted, and why is COW critical for the fork-exec pattern?"

In Unix-like systems, new processes are created through the `fork()` and `exec()` system calls. Historically, `fork()` physically duplicated the parent's entire physical address space. Modern operating systems make process creation nearly instantaneous using **Copy-on-Write (COW)**.

---

### The ELI5 Analogy: The Shared Textbook

Imagine you and a colleague need to study a 1,000-page physics textbook:
- The old way: Stand at a photocopier for 3 hours, duplicating all 1,000 pages before your colleague can begin reading.
- **Copy-on-Write (COW):** Place the single book on a desk between you. You both read the exact same physical pages simultaneously.
- If your colleague picks up a pen and writes notes on **Page 42**, the supervisor (the OS) halts them, photocopies *only* Page 42, hands the copy to your colleague, and lets them write on it.
- You still share 999 pages in common, with zero wasted paper.

---

### Step-by-Step Technical Execution of Copy-on-Write

```
INITIAL STATE AFTER fork()
Parent Virtual Page 10 ──┐
                         ├─► [ Physical Frame 842 ] (Marked READ-ONLY)
Child Virtual Page 10  ──┘

AFTER CHILD WRITES TO PAGE 10 (Page Fault Triggers Copy)
Parent Virtual Page 10 ───► [ Physical Frame 842 ] (Restored READ-WRITE)
Child Virtual Page 10  ───► [ Physical Frame 999 ] (Newly Allocated Copy, READ-WRITE)
```

1. **Page Table Duplication (Zero RAM Copy):** When `fork()` is called, the OS duplicates only the parent's **Page Table**. The physical memory frames are not copied. Both parent and child PTEs point to the exact same physical frames.
2. **Read-Only Protection Trap:** The OS sets the permissions on all shared physical pages to **Read-Only** in both parent and child page tables.
3. **The Write Attempt:** Either process attempts to write to a variable (e.g., `counter = 42`).
4. **Hardware Page Fault (Protection Fault):** The CPU Memory Management Unit (MMU) catches a write attempt on a read-only page and triggers a **Page Fault Exception**.
5. **Kernel Intervention & Page Duplication:**
   - The OS kernel intercepts the fault and recognizes it as a COW trigger.
   - It allocates a single brand-new physical frame in RAM.
   - It copies the 4KB data from the shared frame into the new frame.
   - It updates the faulting process's page table to point to the new frame.
   - It marks both the original and new frame as **Read-Write**.
   - It restarts the faulting write instruction transparently.

---

### Why COW Is Essential: The `fork()` + `exec()` Paradigm

In Unix, launching any program (such as running `ls` in Bash) requires the shell to `fork()` a child clone, which immediately calls `execve()`:
- `execve()` completely discards the child's address space and loads the new binary from disk.
- If `fork()` copied 4GB of physical RAM, that 4GB would be completely destroyed and deallocated a millisecond later when `execve()` is called!
- Copy-on-Write makes `fork()` an $O(1)$ lightweight pointer-copy operation.

---

### The Staff Differentiator: Memory Overcommit & The OOM Killer

Because COW delays physical RAM allocation, the Linux kernel permits **Memory Overcommit** (controlled by `/proc/sys/vm/overcommit_memory`). A server with 16GB of RAM can successfully fork processes that together demand 32GB of virtual memory.

#### The Critical Risk:
What happens if both parent and child simultaneously write to all their shared pages, but physical RAM is completely exhausted?
1. The kernel attempts to satisfy the COW page fault, but finds zero free frames in RAM and zero swap space.
2. The kernel invokes the **Out-Of-Memory (OOM) Killer (`mm/oom_kill.c`)**.
3. The OOM Killer calculates an `oom_score` for all processes (weighing RSS memory footprint and process priority) and forcefully terminates the highest-scoring rogue process with `SIGKILL` to prevent a full system freeze.

---

### Summary
"fork() creates a process clone by copying page table entries without duplicating physical RAM, setting shared pages to Read-Only. Writing to a page triggers a hardware protection fault, prompting the OS to allocate and copy only that specific 4KB page (Copy-on-Write). This optimizes the fork-exec pattern. If dirtied COW pages exceed physical memory, the Linux OOM Killer terminates processes."

---

### Code Demonstration: Observing Copy-on-Write Behavior in C

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