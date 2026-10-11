---
id: 19-paging-vs-segmentation
title: "Paging vs. Segmentation"
description: "Compare paging (fixed-size blocks) with segmentation (variable-size logical units), how address translation works for each, and why x86-64 dropped segmentation."
sidebar_position: 19
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between paging and segmentation? How does hardware translate addresses under each model, why do modern OSs standardize on paging, and why did x86-64 deprecate segmentation?"

Both paging and segmentation answer the same question: how do you cut up memory into pieces you can hand out to processes? They just disagree on how to cut it.

Picture a 100-page manuscript you need to store in lockers:
- **Paging** is the guillotine approach — you cut it every 10 inches with a ruler, without reading a word. Sentences get sliced in half, but every chunk is the same size, so it fits any locker with zero wasted shelf space.
- **Segmentation** is the chapter approach — you cut along the natural boundaries: Introduction, Main Body, Conclusion. The meaning stays intact, but now your chunks are all different sizes, and lockers that fit one chapter leave awkward gaps for the next.

That tradeoff — uniform-but-arbitrary vs. meaningful-but-irregular — is the whole story.

---

<Diagram>
<Row>
<Box title="Paging" accent="#60a5fa">
<Field icon="🧩" code="fixed-size frames (4KB)" hint="no external fragmentation" variant="neutral" />
</Box>
<Box title="Segmentation" accent="#f59e0b">
<Field icon="📦" code="variable-size units" hint="matches code / heap / stack" variant="neutral" />
</Box>
</Row>
</Diagram>

### How each one translates an address

**Paging:** a virtual address splits into a page number and an offset. The page table maps the page number to a physical frame number; the offset just comes along unchanged. Since page sizes are always a power of two (4096 bytes, say), the offset can never accidentally spill into the next page — there's no limit check needed.

**Segmentation:** a virtual address splits into a segment index and an offset. The segment table stores a `(base, limit)` pair for each segment. Hardware checks: is the offset less than the limit? If yes, the physical address is just `base + offset`. If no, the CPU raises a fault — a real segmentation violation.

---

### Side by side

| | Paging | Segmentation |
| :--- | :--- | :--- |
| **Block size** | Fixed (typically 4KB) | Variable — matches logical chunks like code, heap, stack |
| **Who it's for** | Hardware/OS — invisible to the programmer | Programmer/compiler — maps to real program structure |
| **Fragmentation** | Internal (wastes space inside a block) | External (wastes space between blocks) |
| **Hardware needed** | Multi-level page tables + TLB | Segment tables + limit-check hardware |
| **Where it stands today** | The universal standard | Mostly dropped from modern hardware |

---

### Why paging won

1. **No external fragmentation.** Variable-size segments leave scattered holes that need expensive compaction (pausing execution to shuffle gigabytes of RAM around). Uniform pages never do this.
2. **Constant-time allocation.** The OS just keeps a free list of identical 4KB frames and pops one off — no searching for a big-enough gap.
3. **Swapping is simple.** Moving a uniform 4KB block to and from disk is a clean, predictable operation.

---

### Why x86-64 dropped segmentation in hardware

32-bit x86 had segmentation baked deep into the hardware, with dedicated segment registers (`CS`, `DS`, `SS`, `ES`, `FS`, `GS`). When Intel and AMD designed 64-bit mode, they deliberately killed it: segment base addresses are forced to 0, limit checks are disabled, and the whole address space becomes one flat space.

So how do you get segmentation's benefits — protecting code from being written, marking some pages non-executable — without hardware segments? You apply those same permissions (`read`, `write`, `no-execute`) directly to pages in the page table instead. You get the protection, minus the fragmentation problem.

---

### Say this in the interview

*"Paging splits memory into fixed-size physical frames — simple, fast, but wastes space inside the last frame of an allocation (internal fragmentation). Segmentation splits memory into variable-size logical units that match program structure, but leaves scattered gaps between them (external fragmentation), which needs expensive compaction. Modern OSs standardized on paging because fragmentation is easier to live with than memory compaction, and x86-64 dropped hardware segmentation entirely — any protection it used to offer now comes from permission bits on pages instead."*

---

### Code: a paging MMU and a segmentation MMU, side by side

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
