---
id: 20-internal-vs-external-fragmentation
title: "Internal vs. External Fragmentation: Causes & Mitigation"
description: "Define internal vs external fragmentation, mathematical expected waste, Knuth's 50% rule, the Buddy Allocator, and the Slab Allocator."
sidebar_position: 20
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is internal fragmentation versus external fragmentation? Why does paging eliminate external fragmentation while causing internal fragmentation, and how do operating system kernels (Buddy Allocator, Slab Allocator) eliminate sub-page memory waste?"

Memory fragmentation represents wasted physical RAM that cannot be allocated to running processes. The architectural mechanism used to partition memory determines whether a system suffers from **Internal Fragmentation** (waste *inside* fixed blocks) or **External Fragmentation** (waste *between* variable blocks).

---

### The ELI5 Analogy: Egg Cartons vs. Parking Lots

- **Internal Fragmentation (The 12-Pack Egg Carton):**  
  You need 10 eggs to bake a cake, but the grocery store only sells rigid 12-pack cartons (Pages). You are forced to buy the 12-pack. You use 10 eggs, leaving 2 empty slots inside your carton. That space is wasted, but no other customer can use those 2 slots because the carton belongs to you.  
  *Wasted space inside an allocated boundary.*

- **External Fragmentation (The Parallel Parking Lot):**  
  A street has parallel parking for cars of all different lengths (Segments). A compact car leaves, leaving an 8-foot gap; down the street, a minivan leaves, leaving a 12-foot gap. A 16-foot delivery truck arrives. There is 20 feet of total free curb space, but the truck cannot park because the space is broken into small, non-contiguous holes.  
  *Wasted space scattered outside allocated boundaries.*

---

### Technical Comparison Matrix

| Dimension | Internal Fragmentation | External Fragmentation |
| :--- | :--- | :--- |
| **Definition** | Unused memory allocated *inside* a fixed-size partition. | Unallocated memory broken into small, non-contiguous holes *between* partitions. |
| **Primary Cause** | Fixed allocation granularity (e.g., 4KB paging frames). | Dynamic variable-sized allocations and deallocations. |
| **Paging** | **Suffers from it** (in the final page of an allocation). | **Immune** (all frames are identical and interchangeable). |
| **Segmentation** | **Immune** (segments sized exactly to process request). | **Suffers from it** (requires expensive memory compaction). |
| **Mitigation** | Smaller pages, sub-page allocators (Slab/Buddy allocators). | Paging architectures, memory compaction defragmentation. |

---

### Mathematical Foundations

#### 1. Average Internal Fragmentation ($S / 2$)
If physical memory is allocated in fixed chunks of size $S$ (e.g., $4096\text{ bytes}$), and memory allocation sizes are uniformly distributed, the final page of any process is, on average, half full:
$$\mathbb{E}[\text{Internal Fragmentation}] = \frac{S}{2} \text{ per allocation}$$
For a 4KB page, an average of $2\text{ KB}$ is wasted per allocated segment.

#### 2. Knuth's 50% Rule (External Fragmentation)
Donald Knuth proved mathematically that in any variable-sized memory allocation system using first-fit or best-fit strategies:
$$\text{Free Blocks} \approx 0.5 \times \text{Allocated Blocks}$$
As the system reaches equilibrium, approximately **one-third of all available memory is lost to external fragmentation gaps**, proving why pure segmentation was abandoned for general-purpose RAM.

---

### The Staff Differentiator: Kernel Sub-Page Allocators

Paging eliminates external fragmentation for user processes using 4KB pages. But what about the **Operating System Kernel**?

Kernel data structures are tiny: a file descriptor struct is 64 bytes; an `inode` cache is 512 bytes; a process `task_struct` is 2KB. If the Linux kernel allocated a full 4KB page for every 64-byte struct, internal fragmentation would exceed **98%**!

Modern kernels solve this using a two-tier allocator architecture:

```
┌─────────────────────────────────────────────────────────┐
│               HARDWARE PHYSICAL RAM                     │
└───────────────────────────┬─────────────────────────────┘
                            ▼
           [ BUDDY ALLOCATOR (Page-Level) ]
    Allocates contiguous memory in powers-of-two (4KB, 8KB, 16KB, 32KB...)
    Coalesces adjacent "buddies" on free to prevent external fragmentation.
                            │
                            ▼
           [ SLAB / SLUB ALLOCATOR (Object-Level) ]
    Carves 4KB pages into arrays of identical fixed-size object caches:
    • Cache for mm_struct      • Cache for inode_struct
    • Cache for task_struct    • Cache for socket buffers (sk_buff)
```

1. **The Buddy Allocator:** Manages physical memory frames in power-of-two blocks ($2^k \times 4\text{ KB}$). When a block is freed, it checks if its adjacent "buddy" block of equal size is also free; if so, it immediately merges (coalesces) them into a larger block to stop external fragmentation.
2. **The Slab / Slub Allocator (Jeff Bonwick):** Sits directly on top of the buddy allocator. It takes a 4KB page and slices it into uniform, pre-allocated object slots (e.g., a slab of 64-byte descriptors). When the kernel requests an object, it assigns an empty slot in $O(1)$ time with **zero internal fragmentation**!

---

### Summary
"Paging eliminates external fragmentation via uniform 4KB frames, but incurs internal fragmentation on the final page (averaging S/2). Segmentation eliminates internal fragmentation but causes severe external fragmentation (governed by Knuth's 50% rule). Operating system kernels eliminate sub-page internal fragmentation using the Buddy Allocator for power-of-two coalescing and the Slab Allocator for caching fixed-size kernel structs."

---

### Code Demonstration: Buddy Allocator Power-of-Two Split & Coalesce

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