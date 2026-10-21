---
id: 10-virtual-memory-and-page-faults
title: "Virtual Memory & Page Fault Mechanics"
description: "How virtual memory decouples a program's address space from physical RAM, the step-by-step page fault lifecycle, and minor vs. major page faults."
sidebar_position: 10
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is virtual memory, what problems does it solve, and what is the exact step-by-step lifecycle of a page fault? What is the difference between a major and a minor page fault?"

Virtual memory is the illusion the OS gives every program: a huge, private, contiguous address space — even though real RAM is small and shared, and the data is actually scattered wherever it happens to fit.

---

### The analogy: a desk and a filing cabinet

- **CPU** = the worker.
- **Physical RAM** = your desk. Blazing fast to grab a page from, but small — it only fits 100 pages.
- **Hard drive** = a filing cabinet in the basement. Holds 100,000 pages, but walking down there takes a while.

Say you're working on a 10,000-page project. **Virtual memory** is the OS telling you: "Ask for any page from 1 to 10,000, I'll handle where it actually lives." It keeps the 100 pages you're actively using on your desk, and leaves the other 9,900 in the basement.

A **page fault** is what happens when you ask for a page that's currently in the basement. You pause. The OS walks down, grabs it, brings it up, and you resume. If your desk is already full, it first carries an old unused page back down to make room.

---

### What's actually going on underneath

<Diagram>
<Row>
<Box label="Page 0" />
<Box label="Page 1" />
<Box label="Page 2" />
<Arrow label="page table" />
<Box label="Frame 12" />
<Box label="Frame 4" />
<Box label="Frame 87" />
</Row>
</Diagram>

- **Virtual pages:** fixed-size logical chunks (usually 4 KB on x86/ARM) — this is what the program sees.
- **Physical frames:** fixed-size slots in actual RAM, same size as a page.
- **Page table:** a per-process lookup table the kernel keeps, mapping each virtual page number to a physical frame number. Each entry is called a **PTE**.
- **PTE status flags** worth knowing:
  - **Valid/Present bit:** `1` if the page is currently in RAM, `0` if it's out on disk.
  - **Dirty bit:** `1` if the page was written to since it was loaded — it has to be saved to disk before it can be evicted.
  - **Referenced bit:** `1` if the page was recently touched — this is what LRU/Clock-style algorithms use to pick what to evict.

---

### What happens, step by step, when a page fault fires

A page fault happens when a process touches a virtual address that isn't currently mapped to RAM. Here's the exact sequence:

1. **CPU memory reference:** an instruction tries to read or write a virtual address.
2. **MMU lookup:** the hardware Memory Management Unit checks the page table for that address.
3. **Trap:** the Valid/Present bit is `0`. The MMU halts and raises a hardware trap into the kernel.
4. **Context save:** the CPU switches to kernel mode and saves the process's registers and program counter.
5. **Validity check:** the OS checks whether this address is actually legal for this process (inside a mapped region). If it isn't — say, a null pointer dereference — the OS sends `SIGSEGV` and kills the process.
6. **Frame allocation:** if the address is legal, the OS looks for a free physical frame.
7. **Eviction, if needed:** if RAM is completely full, the OS picks a victim frame using a replacement algorithm (LRU, Clock, etc).
8. **Dirty page flush:** if that victim's dirty bit is set, its contents get written to disk first, and its PTE is marked invalid.
9. **Disk read:** the OS schedules a disk read to bring the requested page into the now-free frame.
10. **Process blocked:** disk I/O takes milliseconds, so the OS marks this process as blocked and runs something else in the meantime.
11. **I/O completes:** the disk controller fires an interrupt once the read finishes.
12. **Resume:** the OS updates the PTE with the new frame number, sets Valid = 1, clears the dirty bit, and puts the process back on the ready queue. When it runs again, the CPU **re-executes the exact instruction that faulted** — as if nothing happened.

---

### Minor (soft) vs. major (hard) page faults

| Feature | Minor (Soft) Page Fault | Major (Hard) Page Fault |
| :--- | :--- | :--- |
| **Where's the data** | Already sitting in RAM, just not mapped into this process yet. | Not in RAM at all — has to be read from disk/swap. |
| **Disk I/O?** | None. Resolved entirely in memory. | Yes — a real disk/SSD read. |
| **Latency** | Microseconds (~1-5 μs). | Milliseconds (~1-10 ms) — up to 10,000× slower. |
| **Common causes** | Freshly `malloc()`'d/`mmap()`'d memory on first touch; attaching to a shared library already loaded by another process; reclaiming a page still sitting in the OS page cache. | Reading cold code or data from a binary for the first time; re-fetching a page that got swapped out under memory pressure. |

---

### Say this in the interview

*"Virtual memory gives each process the illusion of a large, contiguous, isolated address space, while the page table maps its virtual pages onto scattered physical frames. A page fault fires when the Valid bit on a PTE is 0 — the OS loads the page from disk, updates the page table, and transparently re-runs the faulting instruction. A minor fault resolves entirely in RAM with no disk I/O; a major fault has to go to disk and is orders of magnitude slower."*

---

### Code: observing page faults with `getrusage`

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>
#include <sys/resource.h>
#include <sys/mman.h>
#include <unistd.h>

void print_fault_counts() {
    struct rusage usage;
    getrusage(RUSAGE_SELF, &usage);
    printf("Minor Page Faults: %ld | Major Page Faults: %ld\n", 
           usage.ru_minflt, usage.ru_majflt);
}

int main() {
    printf("--- INITIAL FAULT STATS ---\n");
    print_fault_counts();

    // Allocate 100 MB of virtual address space
    // Notice: mmap only reserves virtual address space; NO physical RAM is allocated yet!
    size_t size = 100 * 1024 * 1024;
    char* memory = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

    printf("\n--- AFTER MMAP (Demand Paging: Not yet touched) ---\n");
    print_fault_counts();

    // Touch memory page-by-page (step by 4096 bytes)
    // Every first write to a new page triggers a MINOR page fault to allocate a physical frame:
    for (size_t i = 0; i < size; i += 4096) {
        memory[i] = 'A';
    }

    printf("\n--- AFTER TOUCHING 100 MB (Triggered ~25,600 Minor Faults) ---\n");
    print_fault_counts();

    munmap(memory, size);
    return 0;
}
```
