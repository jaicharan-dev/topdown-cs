---
id: 10-virtual-memory-and-page-faults
title: "Virtual Memory & Page Fault Mechanics"
description: "Understand virtual memory abstractions, the exact step-by-step hardware/OS page fault lifecycle, and Minor (Soft) vs. Major (Hard) page faults."
sidebar_position: 10
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is virtual memory, what problems does it solve, and what is the exact step-by-step lifecycle of a page fault? What is the difference between a major and a minor page fault?"

**Virtual Memory** is one of the greatest abstractions in computer systems. It completely decouples a program's logical view of memory from physical hardware reality, presenting every process with a massive, contiguous, and isolated address space while physical RAM holds only the pages actively in use.

---

### The ELI5 Analogy: The Desk and the Filing Cabinet

Imagine an office:
- **CPU:** The worker.
- **Physical RAM:** Your desktop. It is blazingly fast to grab papers from, but small (can fit only 100 pages).
- **Hard Drive (Secondary Storage):** A massive filing cabinet in the basement. It holds 100,000 pages, but walking down to fetch a page takes ages.

Now, imagine working on a massive 10,000-page project:
- **Virtual Memory:** The illusion the OS gives you that your desk is infinite. The OS tells you: *"Ask for any page from 1 to 10,000; I will handle the logistics."* The OS keeps the 100 pages you are actively reading on your desk, and leaves the remaining 9,900 in the basement.
- **The Page Fault:** What happens if you request Page 500, but it is currently in the basement? You must pause work. The OS walks to the basement, grabs Page 500, brings it to your desk, and resumes your work. If your desk is full, the OS moves an old, unread page from your desk back to the basement.

---

### Technical Breakdown: Core Abstractions

```
VIRTUAL ADDRESS SPACE (Process View: Contiguous 0x0000 to 0xFFFF)
[ Page 0 ] [ Page 1 ] [ Page 2 ] [ Page 3 ] [ Page 4 ]
    |          |          |          |          |
    └──────────┼──────────┼──────────┼──────────┘
               ▼          ▼          ▼
         PAGE TABLE (MMU Hardware Translation)
               │          │          │
    ┌──────────┘          │          └──────────┐
    ▼                     ▼                     ▼
[ Frame 12 ]         [ Frame 4 ]           [ Frame 87 ]
PHYSICAL RAM (Hardware Reality: Scattered 4KB Frames)
```

1. **Virtual Pages:** Fixed-size logical blocks of memory (typically $4\text{ KB}$ on x86/ARM).
2. **Physical Frames:** Fixed-size slots in hardware RAM matching the page size.
3. **Page Table:** A per-process kernel data structure mapping virtual page numbers to physical frame numbers via **Page Table Entries (PTEs)**.
4. **PTE Status Flags:**
   - **Valid / Present Bit:** `1` if page resides in physical RAM; `0` if on disk/swap.
   - **Dirty / Modified Bit:** `1` if the page was written to in RAM (must be flushed to disk before eviction).
   - **Referenced / Access Bit:** `1` if the page was recently read/written (used by LRU/Clock algorithms).

---

### The 12-Step Hardware/OS Page Fault Lifecycle

When a process references an unmapped or swapped-out virtual page, a **Page Fault** occurs. Here is the exact low-level execution sequence:

1. **CPU Memory Reference:** An instruction tries to read or write a virtual address.
2. **MMU Lookup:** The hardware **Memory Management Unit (MMU)** checks the Page Table.
3. **Trap Triggered:** The MMU detects that the **Valid/Present bit is 0**. The MMU halts execution and triggers a **Hardware Trap (Page Fault Exception #14)** to the OS kernel.
4. **Context Save:** The CPU switches to **Kernel Mode** and saves the process's registers and program counter onto the kernel stack.
5. **Address Validity Check:** The OS verifies if the address is legally mapped in the process's Virtual Memory Area (VMA).
   - *If invalid:* The access is illegal (e.g., dereferencing `NULL`); the OS dispatches a **`SIGSEGV` (Segmentation Fault)** and kills the process.
6. **Frame Allocation:** If valid, the OS looks for a free physical memory frame.
7. **Page Eviction (Replacement):** If RAM is 100% full, the OS selects a **Victim Frame** using a replacement algorithm (e.g., LRU or Clock).
8. **Dirty Page Flush:** If the victim frame's **Dirty bit is 1**, the OS writes its contents out to the swap disk. The victim's PTE is set to `Valid = 0`.
9. **Disk I/O Dispatch:** The OS schedules a disk read to load the requested page into the newly freed physical frame.
10. **Process Suspended:** Because disk I/O is slow (milliseconds), the OS marks the faulting process as **Blocked/Waiting** and schedules another ready process on the CPU.
11. **I/O Completion Interrupt:** When the disk controller finishes reading the page, it fires a hardware **I/O Interrupt**.
12. **State Restoration & Instruction Restart:** The OS interrupt handler sets the page's PTE to the new frame number, sets **`Valid = 1`**, clears the dirty bit, and moves the process back to the **Ready Queue**. When rescheduled, the CPU **restarts the exact instruction that previously faulted**!

---

### Minor (Soft) vs. Major (Hard) Page Faults

Interviewers frequently distinguish between two types of page faults:

| Feature | Minor (Soft) Page Fault | Major (Hard) Page Fault |
| :--- | :--- | :--- |
| **Data Location** | The page **already resides in physical RAM**, but lacks an active mapping in this process's page table. | The page is **not in RAM** and must be fetched from disk or swap partition. |
| **Disk I/O Required?** | **Zero disk I/O.** Resolved completely in memory. | **Yes.** Requires physical disk/SSD read. |
| **Latency Penalty** | Microseconds ($\approx 1-5\ \mu\text{s}$). | Milliseconds ($\approx 1-10\text{ ms}$), up to **10,000x slower**! |
| **Common Scenarios** | 1. Memory allocated via `malloc()` / `mmap()` (Demand Paging: allocated on first write).<br/>2. Attaching to a shared library (`libc.so`) already loaded by another process.<br/>3. Reclaiming a page sitting in the OS page cache. | 1. Reading cold code/data from binary file.<br/>2. Re-fetching a page that was swapped out under memory pressure. |

---

### Summary
"Virtual memory gives processes the illusion of a large, isolated, contiguous address space by mapping virtual pages to scattered physical frames via page tables. A page fault is a hardware interrupt triggered when a page's Valid bit is 0. The OS loads the page from disk, updates the page table, and transparently restarts the faulting instruction. Minor page faults resolve in RAM without disk I/O, while major page faults incur severe disk latency."

---

### Code Demonstration: Observing Page Faults via `getrusage`

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