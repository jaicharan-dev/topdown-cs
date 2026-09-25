---
id: 19-paging-vs-segmentation
title: "Paging vs. Segmentation: Fixed vs. Variable Memory Partitioning"
description: "Compare paging (fixed-size blocks) with segmentation (logical variable-size modules), address translation math, and why x86-64 deprecated segmentation."
sidebar_position: 19
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between paging and segmentation? How does hardware translate addresses under each model, why do modern OSs standardize on paging, and why did x86-64 deprecate segmentation?"

Operating systems partition memory through two primary paradigms: **Paging** (dividing memory into fixed-size physical blocks) and **Segmentation** (dividing memory into variable-sized logical units like Code, Heap, and Stack).

---

### The ELI5 Analogy: Storing the Ancient Scroll

Imagine storing a 100-page ancient manuscript in standard storage lockers:
- **Paging (The Guillotine Approach):** You take a ruler and cut the manuscript every 10 inches without reading a single word. Sentences and paragraphs get sliced in half. However, every slice is uniform, fitting into identical storage lockers with zero wasted shelf gaps.
- **Segmentation (The Chapter Approach):** You cut the manuscript along chapter boundaries: Introduction (2 pages), Main Body (40 pages), Conclusion (5 pages). You preserve logical meaning, but now you need custom-sized lockers for every chapter, leaving awkward, unusable gaps on the shelves.

---

### Address Translation Architecture: Paging vs. Segmentation

```
PAGING HARDWARE TRANSLATION
Virtual Address: [ Page Number p | Offset d ]
                        │
                        ▼
                 [ Page Table ] ──► Frame Number f
                        │
                        ▼
Physical Address: [ Frame Number f | Offset d ]  (No limit check needed)


SEGMENTATION HARDWARE TRANSLATION
Virtual Address: [ Segment s | Offset d ]
                       │
                       ▼
               [ Segment Table ] ──► Base Address & Limit
                       │
             ┌─────────┴─────────┐
      Is d < Limit?         Is d >= Limit?
             │                   │
             ▼                   ▼
     Physical Address:    TRAP: Segmentation Fault (#GP)
     [ Base + d ]
```

#### 1. Paging Translation
- Virtual address: `(p, d)` where $p$ is the page number and $d$ is the offset.
- Physical address: $f \times \text{Page\_Size} + d$.
- Because page size is a power of 2 (e.g., $2^{12} = 4096$ bytes), offset bitmasking guarantees that an offset cannot spill over into another page.

#### 2. Segmentation Translation
- Virtual address: `(s, d)` where $s$ is the segment index and $d$ is the offset.
- The **Segment Table** contains a `(Base, Limit)` tuple.
- **Hardware Limit Check:** The hardware MMU verifies: $\text{Offset } d < \text{Limit}$.
  - If $d \ge \text{Limit}$: CPU immediately raises a **Hardware Fault (Segmentation Violation / `SIGSEGV`)**.
  - If valid: Physical Address = $\text{Base} + d$.

---

### Comparison Matrix

| Feature | Paging | Segmentation |
| :--- | :--- | :--- |
| **Block Size** | **Fixed-size** (typically 4KB frames). | **Variable-size** (matches logical code blocks). |
| **Perspective** | Hardware & OS-centric (transparent to programmer). | Programmer & Compiler-centric (Code, Data, Stack). |
| **Fragmentation** | Suffers from **Internal Fragmentation**; eliminates External. | Suffers from **External Fragmentation**; eliminates Internal. |
| **Hardware Overhead** | Multi-level Page Tables + TLB. | Segment descriptor tables + hardware limit comparators. |
| **Modern Adoption** | **Universal** standard in modern OSs. | Largely deprecated in hardware; replaced by page permissions. |

---

### Why Modern Operating Systems Standardize on Paging

1. **Elimination of External Fragmentation:** Variable-sized segments create scattered memory holes that require expensive **Memory Compaction** (suspending execution to copy gigabytes of RAM to consolidate free holes).
2. **Deterministic $O(1)$ Allocation:** Fixed 4KB frames make memory allocation trivial: the OS maintains a free list of frames and pops a frame in constant time.
3. **Seamless Virtual Memory (Swapping):** Moving a uniform 4KB block between disk and RAM is simple and optimal for storage controllers.

---

### The Staff Differentiator: Why x86-64 Deprecated Segmentation

In 32-bit x86 architectures, segmentation was heavily integrated into hardware (using segment registers: `CS`, `DS`, `SS`, `ES`, `FS`, `GS`).

When AMD and Intel designed **64-bit Long Mode (x86-64)**, they deliberately **deprecated hardware segmentation**:
- The base addresses for `CS`, `DS`, `ES`, and `SS` are forced to **0** by hardware.
- Hardware segment limit checks are completely disabled.
- The address space is treated as a single, contiguous **Flat Memory Model**.
- **The Modern Synthesis:** Operating systems achieve the logical protection benefits of segmentation by applying permissions (`Read`, `Write`, `No-Execute / NX bit`) to groupings of pages directly within the **Multi-Level Page Table**!

---

### Summary
"Paging divides memory into fixed-size physical frames, eliminating external fragmentation, whereas segmentation divides memory into variable-size logical units, causing external fragmentation. Paging translates addresses via frame offsets without limit checks, while segmentation enforces hardware limit comparisons. Modern 64-bit architectures deprecated segmentation in hardware, enforcing logical segment protections through page table permissions."

---

### Code Demonstration: Paging vs. Segmentation Simulator in Python

```python
class PagingMMU:
    def __init__(self, page_size=4096):
        self.page_size = page_size
        self.page_table = {0: 5, 1: 12, 2: 8} # virtual page -> physical frame

    def translate(self, virtual_address):
        page_num = virtual_address // self.page_size
        offset = virtual_address % self.page_size
        if page_num not in self.page_table:
            raise RuntimeError(f"Page Fault! Virtual page {page_num} not in RAM.")
        frame_num = self.page_table[page_num]
        physical_address = (frame_num * self.page_size) + offset
        return physical_address

class SegmentationMMU:
    def __init__(self):
        # segment_id: (base_address, limit_size)
        self.segment_table = {
            0: (10000, 2000), # Code Segment: Base 10000, Limit 2000 bytes
            1: (20000, 5000), # Heap Segment: Base 20000, Limit 5000 bytes
        }

    def translate(self, segment_id, offset):
        if segment_id not in self.segment_table:
            raise RuntimeError(f"Invalid Segment ID {segment_id}")
        base, limit = self.segment_table[segment_id]
        
        # Hardware Limit Check:
        if offset >= limit:
            raise ValueError(f"SIGSEGV! Offset {offset} exceeds segment limit {limit}.")
            
        return base + offset

if __name__ == "__main__":
    paging = PagingMMU()
    print(f"Paging Translation (VA 4200): PA = {paging.translate(4200)}")

    seg = SegmentationMMU()
    print(f"Segmentation Translation (Seg 0, Offset 500): PA = {seg.translate(0, 500)}")
    
    try:
        # Triggering a segmentation violation:
        seg.translate(0, 2500) # Limit is 2000!
    except ValueError as e:
        print(f"Hardware Exception Caught: {e}")
```