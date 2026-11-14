---
id: 12-tlb-translation-lookaside-buffer
title: "Translation Lookaside Buffer (TLB) & Address Caching"
description: "A cache for the page table, because otherwise every memory access would cost two"

sidebar_position: 12
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the TLB? Why does it exist, what is the formula for Effective Memory Access Time (EMAT), and what happens on a TLB miss versus a page fault?"

---

### Picture it

Back to the library with its private catalogues.

Every request now takes two trips. One to the catalogue room to look up where item 47 actually lives, and one to the shelf to collect it. The catalogue lookup is as far away as the shelf, so asking for a book costs **twice** what holding the book costs.

The fix is a small notepad the librarian keeps in their pocket, holding the last few translations they looked up. Readers tend to ask for the same handful of items repeatedly, so most requests are answered from the notepad and only one trip is needed.

Two things can go wrong, and they are not the same.

**The translation is not on the notepad**, so the librarian walks to the catalogue room, reads it, writes it on the pad, and then fetches the book. Slower, but routine.

**The catalogue says the item is in the offsite store.** Now the book is not in the building at all, and somebody has to drive out and fetch it. That is a different order of delay entirely.

---

### The proper terms

#### What the TLB is

The **Translation Lookaside Buffer** is a small, fast, **fully associative** hardware cache inside the **MMU** that holds recent virtual page number to frame number translations.

It exists because paging otherwise doubles every memory access. Without it, reading one byte means reading the page table entry from memory, then reading the data: two accesses for one. The TLB removes the first one in the common case.

It is small, typically 64 to 1024 entries, because it must be searched in parallel within a single cycle. Despite that it achieves **hit rates above 99 percent**, because programs exhibit **locality of reference**: a 4 KB page covers a lot of consecutive accesses, so a handful of entries can cover the working set.

Each entry usually carries an **ASID**, or **PCID** on x86, tagging which address space it belongs to. Without that, every **context switch** would have to **flush** the TLB entirely.

#### Effective Memory Access Time

**EMAT** is the average cost of a memory access given a TLB hit ratio.

With hit ratio **h**, TLB lookup time **t**, and memory access time **m**:

On a **hit**, the cost is `t + m`: consult the TLB, then fetch the data.
On a **miss**, the cost is `t + m + m`: consult the TLB, read the page table from memory, then fetch the data.

```text
EMAT = h(t + m) + (1 - h)(t + 2m)
     = t + m + (1 - h)m
```

The simplified form is worth remembering because of what it shows: the cost is the ideal `t + m` plus a penalty of one extra memory access, paid only on the miss fraction.

With `t = 1 ns`, `m = 100 ns` and `h = 0.99`: `EMAT = 1 + 100 + 0.01 × 100 = 102 ns`, against 200 ns with no TLB. A 99 percent hit rate removes almost all of the doubling.

Note that many textbook versions omit **t** on the assumption that the TLB lookup is free, giving `EMAT = h·m + (1 - h)·2m`. Say which convention you are using.

#### TLB miss versus page fault

These are different events at different scales, and conflating them is the mistake the question is probing.

A **TLB miss** means the translation is not cached. The page may be perfectly resident in RAM. It is resolved by a **page table walk**, either by hardware, as on x86, or by a software handler, as on MIPS, after which the entry is inserted into the TLB and the access proceeds. The cost is **tens to hundreds of nanoseconds**, and it involves **no disk**.

A **page fault** means the page is not in physical memory at all, signalled by the **valid bit** being clear in the page table entry. It traps to the kernel and may require a disk read. The cost is **milliseconds** for a major fault.

The relationship: every page fault begins with a TLB miss, since the entry could not have been cached. The reverse is not true, and almost every TLB miss is resolved from the page table with the page already in memory.

The ordering is therefore: TLB hit, else **TLB miss resolved from the page table**, else **page fault**.

#### Reducing misses

**Huge pages** of 2 MB or 1 GB let one TLB entry cover far more memory, which matters enormously for databases and large heaps.

Multi-level page tables keep the table itself small, though they make a miss more expensive, since a walk may touch four levels on x86-64.

**ASIDs** and **PCIDs** avoid flushing on context switches, and global pages mark kernel entries as surviving a flush.

---

### In code

```text
The three outcomes of one memory access:

  CPU issues virtual address
            │
            ▼
      ┌─ TLB lookup ─┐
      │              │
    HIT            MISS
      │              │
      │              ▼
      │       walk the page table in memory
      │              │
      │        ┌─────┴──────┐
      │   valid = 1     valid = 0
      │        │            │
      │   insert into TLB   ▼
      │        │        PAGE FAULT: trap to kernel,
      ▼        ▼        read from disk, update table,
    access the frame    restart the instruction
      ~100 ns   ~200 ns          ~milliseconds
```

```text
EMAT worked example

  t = 1 ns   (TLB lookup)
  m = 100 ns (memory access)

  h = 0.99   EMAT = 1 + 100 + 0.01 x 100 = 102 ns
  h = 0.90   EMAT = 1 + 100 + 0.10 x 100 = 111 ns
  h = 0.50   EMAT = 1 + 100 + 0.50 x 100 = 151 ns
  no TLB                                 = 200 ns

  Note how little a 90 percent hit rate costs, and how much
  the first few percent of hit rate buys.
```

---

### What they ask next

**"Why is the TLB so small?"**
Because it is fully associative and must be searched in one cycle, so every entry is compared in parallel. More entries means more comparators, more power and more latency. Locality means a small TLB already achieves very high hit rates.

**"What happens to the TLB on a context switch?"**
Without tagging it must be flushed, which is a major reason process switches cost more than thread switches. With ASIDs or PCIDs entries are tagged by address space and can survive, so the new process does not start cold.

**"Who handles a TLB miss?"**
It is architecture-dependent. x86 has a hardware page table walker. MIPS and some RISC designs trap to a software handler in the kernel, which is more flexible and slower.

**"How do huge pages help?"**
One entry maps 2 MB instead of 4 KB, so the same number of entries covers 512 times more memory. For large working sets this turns a constant stream of misses into almost none, at the cost of coarser granularity and more internal fragmentation.

**"Is the TLB the same as the CPU cache?"**
No. The TLB caches **translations**, page number to frame number. The L1 and L2 caches cache **data and instructions**. Both are consulted on an access, and a TLB hit can still be followed by a cache miss.

**The common wrong answer** is treating a TLB miss as a page fault. A miss is a cache miss resolved from memory in nanoseconds; a fault means the page is not in memory at all and may cost milliseconds.

---

### Say this in the interview

*"The Translation Lookaside Buffer is a small, fast, fully associative cache in the MMU holding recent virtual page to frame translations. It exists because paging would otherwise double every memory access: one access to read the page table entry and another to read the data. It is small, typically 64 to 1024 entries, because it is searched in parallel in a single cycle, yet it achieves hit rates above 99 percent thanks to locality of reference.*

*EMAT, Effective Memory Access Time, with hit ratio h, TLB time t and memory time m is h times (t plus m), plus (1 minus h) times (t plus 2m), which simplifies to t plus m plus (1 minus h) times m. So the cost is the ideal access plus one extra memory access paid only on misses. With a 1 nanosecond TLB, 100 nanosecond memory and 99 percent hits, that is 102 nanoseconds against 200 without a TLB.*

*A TLB miss and a page fault are different events. A TLB miss means the translation is not cached, but the page may well be resident; it is resolved by a page table walk, in hardware on x86 or in software on MIPS, costing tens to hundreds of nanoseconds with no disk involved. A page fault means the valid bit is clear and the page is not in physical memory, so the kernel traps and may read from disk, costing milliseconds. Every page fault starts as a TLB miss, but almost no TLB miss becomes a page fault.*

*Misses are reduced with huge pages, which let one entry cover 2 MB, and with ASIDs or PCIDs, which avoid flushing on every context switch."*
