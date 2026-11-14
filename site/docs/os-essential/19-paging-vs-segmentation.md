---
id: 19-paging-vs-segmentation
title: "Paging vs. Segmentation"
description: "Equal-sized slots the programmer never sees against variable-sized regions that match the program's structure"

sidebar_position: 19
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between paging and segmentation? How does hardware translate addresses under each model, why do modern OSs standardize on paging, and why did x86-64 deprecate segmentation?"

---

### Picture it

Two ways to store a company's belongings in a warehouse.

**Identical lockers.** Every locker is the same size, and anything that does not fit goes into as many lockers as it needs. A locker is always available if any are free, because any item fits any locker. The warehouse never has to hunt for a space of the right shape. The waste is that the last locker of each set is usually part empty, and nothing about a locker tells you whether it holds invoices or furniture.

**Rooms sized to their contents.** The filing room is as big as the filing needs; the furniture room as big as the furniture. The arrangement matches how the company actually thinks, and you can lock the filing room and leave the furniture room open. The problem is that as rooms come and go, the free space ends up as awkward gaps: plenty of total space, none of it a single room big enough for what you need next.

The first is paging. The second is segmentation. Modern systems chose the lockers and recovered the useful part of rooms some other way.

---

### The proper terms

#### Paging

**Paging** divides the virtual address space into fixed-size **pages** and physical memory into equally sized **frames**, typically **4 KB**. Any page can go in any frame.

An address is split by the hardware into a **page number** and an **offset**. The page number indexes the **page table** to find a frame number, and the frame number is combined with the same offset to produce the physical address. Because page sizes are powers of two, this is bit slicing rather than arithmetic.

Paging is **invisible to the programmer**. It is a memory management technique, not a way of expressing program structure.

Its defining property is that it eliminates **external fragmentation**, since any free frame serves any page, while introducing **internal fragmentation**, because the final page of an allocation is usually partly unused, averaging half a page per region.

#### Segmentation

**Segmentation** divides the address space into variable-sized **segments** that correspond to logical units: code, data, stack, heap.

An address is a pair, **segment number** and **offset**. The segment number indexes the **segment table**, which holds a **base** and a **limit** for that segment. The hardware checks the offset against the limit, raising a **segmentation fault** if it exceeds it, then **adds** the base to the offset.

Note the mechanical difference: paging **concatenates** a frame number with an offset, while segmentation **adds** a base to an offset and must perform a bounds check.

Segmentation is **visible to the programmer** and matches program structure, which gives it two genuine advantages: **protection** can be set per logical unit, and **sharing** a code segment between processes is natural.

Its defining problem is **external fragmentation**. Variable-sized segments come and go, leaving gaps that are individually too small to be useful, which eventually requires **compaction**, an expensive relocation of everything.

#### Why paging won

**No external fragmentation**, so no compaction is ever needed. This is the decisive advantage.

**Simpler allocation.** Any free frame will do, so allocation is taking a frame off a free list rather than searching for a run of the right size with first-fit or best-fit.

**Swapping works naturally.** Fixed-size pages can be written to and read from disk individually. Swapping a variable-sized segment means moving the whole thing.

**Internal fragmentation is bounded and small**, averaging half a page per region, which is predictable in a way external fragmentation is not.

Modern systems keep segmentation's benefits without its mechanism. Protection and sharing per logical region are provided by **protection bits in page table entries** and by kernel structures describing regions, such as Linux's **VMAs**. You get per-region read, write and execute permissions without variable-sized physical allocation.

#### Why x86-64 deprecated segmentation

x86-32 supported **segmentation with paging**, where segmentation produced a linear address that paging then translated. Operating systems made this a formality by using the **flat memory model**: all segments set to base 0 and the maximum limit, so segmentation became an identity transformation and only paging did real work.

**x86-64 made that official.** In **long mode**, the **CS**, **DS**, **ES** and **SS** segment bases are **forced to zero** and their limits ignored, so segmentation is effectively disabled. The hardware stopped supporting a feature nobody used.

Two registers survive because they were useful for something else: **FS** and **GS** retain functioning bases, used for **thread-local storage** in user space and for per-CPU data in the kernel.

So segmentation was not removed on principle. It was removed because paging already did the job, and every operating system had been neutralising segmentation for years.

---

### In code

```text
Address translation, side by side:

  PAGING                              SEGMENTATION

  virtual: | page no | offset |       virtual: | seg no | offset |
                │        │                         │        │
                ▼        │                         ▼        │
          page table     │                   segment table  │
          -> frame no    │                   -> base, limit │
                │        │                         │        │
                │        │                   offset < limit ?
                │        │                     no -> FAULT
                ▼        ▼                         ▼        ▼
  physical: | frame no | offset |      physical:  base  +  offset

  concatenation, no bounds check      addition, with a bounds check
  (the offset cannot overflow         (the offset can exceed the
   a fixed-size page)                  segment, hence the check)
```

```text
Fragmentation, which is the real trade:

  paging         frames: [ P ][ P ][ P ][ P ]   all identical, always usable
                 waste:  part of the last page of each region
                 -> internal fragmentation, bounded at ~half a page

  segmentation   memory: [ seg A ][gap][ seg B ][ gap ][ seg C ]
                 waste:  gaps too small to hold the next segment
                 -> external fragmentation, needs compaction
```

```text
x86-64 long mode:

  CS, DS, ES, SS    base forced to 0, limit ignored   -> segmentation off
  FS, GS            bases still work                  -> thread-local storage,
                                                         per-CPU kernel data
```

---

### What they ask next

**"Can you use both at once?"**
Yes, and x86-32 did: segmentation produced a linear address that paging translated. In practice operating systems used the flat model to neutralise the segmentation stage, which is why x86-64 could drop it.

**"Why does segmentation need a bounds check when paging does not?"**
Because a segment has a variable length, so an offset can exceed it. A page has a fixed power-of-two size, and the offset field is exactly wide enough to address within it, so it cannot overflow by construction.

**"Is a segmentation fault related to segmentation?"**
The name is a historical inheritance. The modern signal is raised by the paging system when a process accesses an address that is not mapped or whose protection bits forbid the access. The name outlived the mechanism.

**"How do modern systems get per-region protection without segments?"**
Through protection bits in each page table entry, read, write and execute, together with kernel structures describing regions, such as Linux's virtual memory areas. Hardware **NX** support made per-region no-execute practical.

**"What are FS and GS used for now?"**
FS typically holds the base of thread-local storage in user space, and GS holds per-CPU data in the kernel, swapped on kernel entry with `SWAPGS`. They survived precisely because they are useful as a fast per-thread or per-CPU pointer.

**The common wrong answer** is that paging eliminates fragmentation. It eliminates **external** fragmentation and **causes** internal fragmentation. Trading an unbounded, unpredictable problem for a small bounded one is the actual argument.

---

### Say this in the interview

*"Paging divides the address space into fixed-size pages and physical memory into equally sized frames, typically 4 KB, and any page fits any frame. The hardware splits an address into a page number and an offset, indexes the page table for a frame number, and concatenates it with the same offset. It is invisible to the programmer.*

*Segmentation divides the address space into variable-sized segments matching logical units like code, data and stack. An address is a segment number and an offset; the segment table gives a base and a limit, the hardware checks the offset against the limit and raises a fault if it exceeds it, then adds the base. So paging concatenates while segmentation adds and bounds-checks, and segmentation is visible to the programmer, which makes per-unit protection and sharing natural.*

*The trade is fragmentation. Paging eliminates external fragmentation, since any free frame serves any page, but introduces internal fragmentation of about half a page per region. Segmentation has no internal fragmentation but suffers external fragmentation, leaving gaps that eventually require expensive compaction.*

*Paging won because no compaction is ever needed, allocation is just taking a frame off a free list, and fixed-size pages swap to disk individually. Modern systems recover segmentation's benefits through protection bits in page table entries and kernel region structures like Linux's VMAs.*

*x86-32 supported both, but operating systems used the flat memory model with all segment bases at zero, so segmentation did nothing. x86-64 made that official: in long mode CS, DS, ES and SS have their bases forced to zero and limits ignored. FS and GS kept working bases because they are useful for thread-local storage and per-CPU kernel data."*
