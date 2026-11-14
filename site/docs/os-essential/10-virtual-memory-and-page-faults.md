---
id: 10-virtual-memory-and-page-faults
title: "Virtual Memory & Page Fault Mechanics"
description: "Every process believing it owns the machine, and what happens when the page is not there"

sidebar_position: 10
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is virtual memory, what problems does it solve, and what is the exact step-by-step lifecycle of a page fault? What is the difference between a major and a minor page fault?"

---

### Picture it

Think of a library where every reader is given their own private catalogue.

Each reader's catalogue is numbered from one upwards, and every reader's catalogue starts at one. When a reader asks for "item 47", a librarian quietly translates that into a real shelf location, which might be anywhere, and which is different for each reader even though they all said 47.

Three things fall out of this arrangement.

**Readers cannot reach each other's books**, because a reader can only name entries in their own catalogue, and the translation never points outside their allocation.

**Books need not sit together.** A reader's items 47, 48 and 49 can be on three different shelves in three different rooms, and the reader never knows.

**The library can hold more than the building.** Rarely used items are moved to an offsite store. The catalogue entry is marked "not on site". When a reader asks for one, there is a pause while it is fetched, and then they get it as if it had been there all along.

That pause is a page fault. It is not an error, it is the mechanism working.

---

### The proper terms

#### What virtual memory is

**Virtual memory** gives each process its own **virtual address space**, which the hardware translates to **physical addresses** in RAM. The process only ever sees virtual addresses.

Memory is divided into fixed-size **pages** on the virtual side and equally sized **frames** on the physical side, typically **4 KB**. The **page table**, one per process, maps page numbers to frame numbers, and the translation is performed by the **Memory Management Unit**, or MMU, in hardware.

#### What it solves

**Isolation and protection.** A process cannot name an address outside its own space, so it cannot read or corrupt another's memory. Protection bits in each page table entry also enforce read-only and no-execute.

**No external fragmentation.** Any free frame can hold any page, so physical memory never needs contiguous runs.

**More memory than RAM.** Pages not in use can live on disk in the swap space or page file, so the total can exceed physical memory.

**Simple relocation and sharing.** Programs are compiled for a fixed virtual layout and loaded anywhere, and two processes can map the same frame to share a library or memory region.

**Lazy loading.** With **demand paging**, a page is only brought in when touched, so a program starts without loading all of it.

#### The page fault lifecycle

A **page fault** is a **trap** raised by the MMU when a translation cannot be completed. Step by step:

1. The process issues a virtual address, and the MMU consults the TLB, then the **page table**.
2. The entry's **valid bit** is clear, so the MMU raises a page fault, which is a trap into the kernel.
3. The hardware saves the state of the faulting instruction so it can be **restarted** later, and switches to kernel mode.
4. The kernel checks whether the address is **legal** for this process. If not, it delivers **SIGSEGV** and the process usually dies. This is the segmentation fault.
5. It is legal, so the kernel finds a **free frame**. If none is free, the **page replacement algorithm** selects a victim, and if that victim is **dirty** it is written out first.
6. The kernel schedules a **disk read** to load the page into the frame. The process is moved to the waiting state and the CPU is given to someone else.
7. The disk completes and raises an **interrupt**.
8. The kernel updates the page table: frame number written, valid bit set.
9. The process is moved back to **ready**, and when scheduled, the faulting instruction is **restarted** and now succeeds.

The two points interviewers listen for are step 6, that the process blocks and the CPU is not idle, and step 9, that the instruction is restarted rather than resumed mid-way.

#### Major versus minor faults

A **minor fault**, or soft fault, is resolved **without disk I/O**. The page is already in physical memory and only the mapping is missing: it is in the **page cache**, or shared by another process, or satisfied by **copy-on-write**, or a newly allocated page that just needs a zeroed frame. These cost microseconds.

A **major fault**, or hard fault, requires reading from **disk**, because the page is in swap or not yet loaded from the file. These cost milliseconds, which is roughly a hundred thousand times longer, so the major fault rate is what actually matters for performance.

On Linux both are visible per process in `/proc`, and tools such as `ps -o min_flt,maj_flt` report them.

---

### In code

```text
Address translation, and where a fault comes from:

  virtual address = | page number | offset |
                          │           │
                          │           └──────────────────► same offset
                          ▼
                    page table entry
                    | valid | dirty | referenced | protection | frame no |
                          │                                        │
                 valid = 0 ──► PAGE FAULT (trap to kernel)          ▼
                 valid = 1 ──────────────────────────────► physical frame

  physical address = | frame number | offset |
```

```text
Minor vs major, by what the kernel has to do:

  minor   page already in RAM, only the mapping is absent
          - page cache already holds the file's page
          - another process already mapped it
          - copy-on-write: a write to a shared read-only page
          - a fresh anonymous page: just hand over a zeroed frame
          cost: microseconds

  major   the page must be read from disk
          - it was swapped out
          - it has never been read from the executable or file
          cost: milliseconds
```

---

### What they ask next

**"Is a page fault an error?"**
No. It is the normal mechanism of demand paging, and most faults are minor. The error case is an **invalid** access, which the kernel rejects at step 4 with a segmentation fault.

**"What is the difference between a page fault and a segmentation fault?"**
A page fault is the trap itself. A segmentation fault is what happens when the kernel determines the faulting address was not legal for that process. Every segmentation fault starts as a page fault; almost no page fault ends as one.

**"Why must the instruction be restarted rather than resumed?"**
Because it never completed. The fault can occur partway through an instruction that touches several addresses, so the architecture defines faults as restartable and the saved state allows re-execution from the beginning.

**"What are the bits in a page table entry?"**
Valid or present, which triggers the fault; dirty or modified, deciding whether a victim must be written out; referenced or accessed, used by replacement algorithms; and protection bits for read, write and execute.

**"How big is a page and why?"**
Typically 4 KB. Smaller pages waste less to internal fragmentation but need larger page tables and more TLB entries. **Huge pages** of 2 MB or 1 GB exist to cut TLB misses for large workloads.

**The common wrong answer** is "a page fault means you ran out of memory". It means the page is not currently mapped, which is usually routine and usually resolved without touching the disk at all.

---

### Say this in the interview

*"Virtual memory gives each process its own virtual address space that hardware translates into physical addresses. Memory is split into fixed-size pages and equally sized frames, typically 4 KB, with a per-process page table mapping one to the other, and the Memory Management Unit performing translation.*

*It solves several problems: isolation, since a process cannot name memory outside its space; no external fragmentation, since any free frame holds any page; the ability to use more memory than RAM by keeping unused pages in swap; simple relocation and sharing; and lazy loading through demand paging.*

*A page fault is a trap raised when the valid bit in the page table entry is clear. The kernel saves state so the instruction can be restarted, checks whether the address is legal and sends SIGSEGV if not, finds a free frame or selects a victim with the page replacement algorithm, writing it out first if dirty, schedules the disk read and blocks the process so the CPU goes elsewhere, handles the completion interrupt, updates the page table and sets the valid bit, moves the process back to ready, and restarts the faulting instruction.*

*A minor fault is resolved without disk I/O, because the page is already in memory and only the mapping is missing, as with the page cache, a shared page, copy-on-write, or a fresh zeroed page. A major fault requires reading from disk. Minor faults cost microseconds and major ones milliseconds, so the major fault rate is what matters for performance."*
