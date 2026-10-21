---
id: 20-internal-vs-external-fragmentation
title: "Internal vs. External Fragmentation"
description: "Understand internal vs external memory fragmentation, the math behind how much gets wasted, and how the Buddy and Slab allocators fix it inside the kernel."
sidebar_position: 20
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is internal fragmentation versus external fragmentation? Why does paging eliminate external fragmentation while causing internal fragmentation, and how do operating system kernels (Buddy Allocator, Slab Allocator) eliminate sub-page memory waste?"

Fragmentation is memory that's technically free, but unusable. There are two different ways that happens, and they come straight from the two memory models you'd expect: paging and segmentation.

- **Internal fragmentation — the egg carton.** You need 10 eggs, but the store only sells rigid 12-packs. You buy one, use 10, and 2 slots sit empty — wasted, but nobody else can use them either, because the whole carton is yours. That's waste *inside* a block you were given.
- **External fragmentation — the parking lot.** Cars park along a street. A compact car leaves an 8-foot gap; a minivan leaves a 12-foot gap further down. A delivery truck needing 16 feet can't park, even though 20 feet of free curb exists — it's just split into pieces too small to use. That's waste *between* blocks, scattered around.

---

<Diagram>
<Row>
<Box label="Internal Fragmentation" sub="waste inside a block" />
<Box label="External Fragmentation" sub="waste between blocks" />
</Row>
</Diagram>

| | Internal Fragmentation | External Fragmentation |
| :--- | :--- | :--- |
| **What it is** | Unused space inside a fixed-size block | Free space broken into small, scattered holes between blocks |
| **Caused by** | Fixed allocation size (e.g. 4KB pages) | Variable-size allocations and frees |
| **Paging** | Suffers from this (last page is rarely full) | Immune — every frame is identical |
| **Segmentation** | Immune — segments are sized exactly to fit | Suffers from this — needs compaction |
| **Fixed by** | Smaller pages, sub-page allocators (slab/buddy) | Switching to paging, or compaction |

So this is really the mirror image of paging vs. segmentation: paging trades external fragmentation for a little internal fragmentation. Segmentation does the opposite.

---

### How much actually gets wasted?

If memory is handed out in fixed chunks of size $S$ (say 4096 bytes), the last chunk of any allocation is, on average, half-empty:

$$\mathbb{E}[\text{Internal Fragmentation}] = \frac{S}{2} \text{ per allocation}$$

For 4KB pages, that's roughly 2KB wasted per allocation, on average.

For variable-size allocation (segmentation), Donald Knuth showed something similar happens to free space: once a system settles into a steady state using first-fit or best-fit allocation, free blocks end up roughly half the count of allocated ones — which works out to around a third of all memory being lost to unusable gaps. This is a big part of why segmentation never became the general-purpose standard.

---

### What about the kernel's own tiny allocations?

Paging solves fragmentation for whole processes using 4KB pages. But the kernel itself allocates much smaller things — a file descriptor struct might be 64 bytes, an inode cache entry 512 bytes. If the kernel handed out a full 4KB page for every 64-byte struct, you'd be wasting over 98% of it — internal fragmentation gone wild.

Linux solves this with two allocators stacked on top of each other:

<Diagram>
<Row>
<Box label="Buddy Allocator" sub="page-level, powers of 2" />
<Box label="Slab Allocator" sub="object-level, fixed slots" />
</Row>
</Diagram>

1. **Buddy allocator** — manages physical memory in power-of-two blocks (4KB, 8KB, 16KB...). When a block is freed, it checks whether its "buddy" (the adjacent block of the same size) is also free, and if so, merges them back into one bigger block. This keeps external fragmentation from building up at the page level.
2. **Slab allocator** — sits on top of the buddy allocator. It takes one 4KB page and slices it into a bunch of identical, pre-sized slots — a cache just for `task_struct`s, another just for `inode`s, and so on. Handing out an object is then just grabbing an empty slot — O(1), with no internal fragmentation, since every slot is sized exactly for what goes in it.

---

### Say this in the interview

*"Internal fragmentation is wasted space inside a fixed-size block you were given — paging causes this because the last page of an allocation is rarely full. External fragmentation is wasted space scattered between variable-size blocks — segmentation causes this, and it needs expensive compaction to fix. The kernel avoids wasting space on its own tiny allocations by stacking a slab allocator — fixed-size object caches — on top of a buddy allocator, which manages page-level memory in power-of-two blocks it can merge back together on free."*

---

### Code: a buddy allocator splitting and tracking free blocks

```python
class BuddyAllocator:
    def __init__(self, total_size):
        # Total size must be power of 2 (e.g., 64 KB)
        self.total_size = total_size
        self.free_blocks = {total_size: [0]} # size -> list of base addresses

    def allocate(self, request_size):
        # Find smallest power of two that fits the request
        target_size = 1
        while target_size < request_size:
            target_size *= 2

        # Find available block of target_size or larger
        current_size = target_size
        while current_size <= self.total_size:
            if self.free_blocks.get(current_size):
                break
            current_size *= 2

        if current_size > self.total_size:
            raise MemoryError("Out of memory!")

        # Remove the block to be split
        base = self.free_blocks[current_size].pop(0)

        # Split down until we reach the target size
        while current_size > target_size:
            current_size //= 2
            buddy = base + current_size
            if current_size not in self.free_blocks:
                self.free_blocks[current_size] = []
            self.free_blocks[current_size].append(buddy)
            print(f"Split {current_size * 2}KB block into buddies at {base}KB and {buddy}KB")

        print(f"Successfully allocated {target_size}KB block at address {base}KB (Requested: {request_size}KB)")
        return base, target_size

if __name__ == "__main__":
    allocator = BuddyAllocator(64) # 64 KB total pool
    print("--- BUDDY ALLOCATION DEMO ---")
    b1, s1 = allocator.allocate(12) # Requests 12KB -> rounds up to 16KB
    b2, s2 = allocator.allocate(7)  # Requests 7KB  -> rounds up to 8KB
```
