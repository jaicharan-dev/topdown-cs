---
id: 20-internal-vs-external-fragmentation
title: "Internal vs. External Fragmentation"
description: "Waste inside what you were given against waste between what everyone else was given"

sidebar_position: 20
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is internal fragmentation versus external fragmentation? Why does paging eliminate external fragmentation while causing internal fragmentation, and how do operating system kernels (Buddy Allocator, Slab Allocator) eliminate sub-page memory waste?"

---

### Picture it

Two ways to waste space in a car park.

**Marked bays sized for a van.** Park a motorcycle in one and most of the bay is wasted, but that waste is **inside your own bay** and nobody else could have used it anyway. Any bay fits any vehicle, so you never circle looking for one that is the right shape.

**No markings, park anywhere.** Each vehicle takes exactly the space it needs, so nothing is wasted inside. But as cars come and go you get gaps everywhere: a three-metre gap here, a two-metre gap there, four metres over there. The car park has nine metres free and no room for a five-metre van. The waste is **between** vehicles, and the total can be large while every individual gap is useless.

The first wastes a predictable amount in a place nobody else wanted. The second wastes an unpredictable amount in a way that blocks real requests. Given the choice, systems take the bays.

---

### The proper terms

#### The two kinds

**Internal fragmentation** is memory wasted **inside** an allocated block, because the block is larger than the request. It belongs to the requester, who simply does not use all of it.

**External fragmentation** is memory wasted **between** allocated blocks. Enough total memory is free to satisfy a request, but it is not **contiguous**, so the request fails anyway.

The crisp distinction: internal is unused space **you were given**, external is free space **you cannot use**.

#### Why paging causes one and removes the other

**External fragmentation is eliminated** because allocation is in fixed-size **frames** and any free frame serves any **page**. There is no such thing as a free region of the wrong shape, so the free list never needs searching for a fit, and **compaction** is never required.

**Internal fragmentation is introduced** because allocations are rounded up to whole pages. A process needing 9 KB with a 4 KB page size receives three pages, 12 KB, wasting 3 KB in the last one. On average the waste is **half a page per region**, which with 4 KB pages is about 2 KB.

The trade is deliberate and favourable. Internal fragmentation is **bounded and predictable**, and it never causes an allocation to fail. External fragmentation is **unbounded and unpredictable**, and it causes failures while memory is apparently available.

Larger pages make this worse. **Huge pages** of 2 MB cut TLB misses but waste up to 2 MB per partly used region, which is why they are applied selectively.

#### Sub-page waste inside the kernel

Paging solves allocation **at page granularity**. The kernel also allocates many objects far smaller than a page: a `task_struct`, an inode, a network buffer. Giving each a whole 4 KB page would waste enormously, so kernels add allocators beneath paging.

#### The Buddy Allocator

The **buddy allocator** manages **physical pages** in blocks that are **powers of two**, from one page up to 1024 pages, indexed by **order**.

To satisfy a request it finds the smallest sufficient block, and if that block is too large it **splits** it in half repeatedly, each half being the **buddy** of the other, until the right size is reached. On free, it checks whether the block's buddy is also free and **coalesces** the two back into a larger block, recursively.

The buddy's address is computed by flipping one bit, so finding it is a single XOR, which is why the power-of-two restriction exists.

Its strength is that coalescing actively **fights external fragmentation** at the page level. Its weakness is **internal fragmentation**: a request for 5 pages receives 8, wasting 3.

#### The Slab Allocator

The **slab allocator** sits on top of the buddy allocator and handles **small, same-sized kernel objects**.

A **cache** is created per object type. It obtains **slabs**, which are one or more contiguous pages from the buddy allocator, and divides each slab into equal-sized slots for that object type. Allocation is taking a free slot from the slab; freeing returns it.

Three benefits follow:

**Almost no internal fragmentation**, because the slot is exactly the object's size rather than a rounded-up page.

**Speed**, because allocation is a list operation on a pre-divided slab with no searching.

**Object reuse**, because a freed object can be kept **pre-initialised**, so the next allocation skips constructor work. This was the original motivation in Bonwick's 1994 design.

It also improves **cache locality**, since objects of one type are packed together.

Linux has used several implementations: **SLAB**, the original; **SLUB**, the current default, simpler and better on many cores; and **SLOB**, for very small systems.

So the layering is: **buddy allocator for pages, slab allocator for objects within pages**.

---

### In code

```text
The two kinds, side by side:

  internal          [ allocated 4 KB |####  wasted 3 KB  ####]
                    the waste is inside the block you were given

  external          [ used ][ free 3 ][ used ][ free 2 ][ used ][ free 4 ]
                    9 units free in total, but a request for 5 fails
```

```text
Buddy allocator: splitting and coalescing

  request 1 page, only a 8-page block free:

     [        8 pages        ]
     [   4    ][     4      ]        split
     [ 2 ][ 2 ][     4      ]        split
     [1][1][ 2][     4      ]        split, allocate the first

  on free, if the buddy is also free, coalesce back upward.
  The buddy's address is this block's address XOR its size,
  which is why block sizes are powers of two.
```

```text
Slab allocator on top of it:

  buddy gives the slab allocator a contiguous run of pages:

     [ one slab = 4 KB page                                   ]
     [ obj ][ obj ][ obj ][ obj ][ obj ][ obj ][ obj ][ free  ]
       ^ each slot is exactly sizeof(task_struct)

  allocate = take a free slot          no rounding to a page
  free     = return the slot           object may stay pre-initialised
```

---

### What they ask next

**"Which is worse?"**
External, because it is unbounded and can cause an allocation to fail while memory is free. Internal is bounded, predictable, and never causes a failure.

**"Does external fragmentation exist with virtual memory?"**
Not in physical memory, thanks to paging. It can still occur in the **virtual address space** itself, particularly on 32-bit systems where a large contiguous mapping can fail despite free address space, and in **user-space heaps**, where `malloc` manages a contiguous region and suffers the classic form.

**"How do you fix external fragmentation when it occurs?"**
By **compaction**, relocating allocations to consolidate free space, which is expensive and requires that everything be relocatable. Paging avoids needing it; garbage-collected runtimes do it during a compacting collection.

**"Why must buddy blocks be powers of two?"**
So the buddy of a block is found by flipping a single bit in its address, making both splitting and coalescing constant-time operations.

**"Why not use the slab allocator for everything?"**
It is designed for many same-sized objects. Large or highly variable allocations do not fit its model, and the buddy allocator underneath remains the right tool for page-granularity requests.

**The common wrong answer** is "fragmentation means running out of memory". Fragmentation means the free memory is in the wrong **place** or the wrong **shape**. With external fragmentation, the total may be ample and still unusable.

---

### Say this in the interview

*"Internal fragmentation is memory wasted inside an allocated block because the block is bigger than the request. External fragmentation is memory wasted between blocks: enough is free in total but it is not contiguous, so the request fails anyway.*

*Paging eliminates external fragmentation because allocation is in fixed-size frames and any free frame serves any page, so no compaction is ever needed. It introduces internal fragmentation because allocations round up to whole pages, averaging about half a page per region, so a 9 KB request with 4 KB pages takes three pages and wastes 3 KB. That trade is favourable: internal fragmentation is bounded and never causes a failure, while external fragmentation is unbounded and does.*

*Paging only solves allocation at page granularity, and kernels allocate many objects much smaller than a page, so two allocators sit underneath.*

*The buddy allocator manages physical pages in power-of-two blocks. It splits a block in half repeatedly until it reaches the required size, and on free it checks whether the block's buddy is also free and coalesces them back. The buddy's address is a single XOR away, which is why sizes are powers of two. It fights external fragmentation at the page level but has internal fragmentation, since a 5-page request gets 8.*

*The slab allocator sits on top for small same-sized kernel objects. A cache per object type takes slabs of contiguous pages from the buddy allocator and divides them into exact-sized slots, so there is almost no internal fragmentation, allocation is a fast list operation, and freed objects can stay pre-initialised for reuse. Linux has used SLAB, SLUB, which is the current default, and SLOB."*
