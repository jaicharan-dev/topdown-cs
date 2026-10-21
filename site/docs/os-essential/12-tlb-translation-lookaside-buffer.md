---
id: 12-tlb-translation-lookaside-buffer
title: "Translation Lookaside Buffer (TLB) & Address Caching"
description: "Why the TLB exists, the EMAT formula for weighing hit vs. miss cost, and TLB miss vs. page fault."
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the TLB? Why does it exist, what is the formula for Effective Memory Access Time (EMAT), and what happens on a TLB miss versus a page fault?"

The page table lives in RAM. Without a shortcut, every memory access would need two trips to RAM: one to look up the translation, one to actually fetch the data. The **Translation Lookaside Buffer (TLB)** is a small, extremely fast cache inside the CPU that skips the first trip most of the time.

---

### The analogy: a librarian's pocket notepad

A library has 10 million books. Finding one normally means walking to the front desk, flipping through a massive master catalog to find the shelf number (**the page table, in RAM**), then walking to the shelf. That's two trips every single time — it cuts your speed in half.

The librarian's fix: keep a small pocket notepad (**the TLB**) with the shelf numbers of the last 50 books looked up.

- **TLB hit:** the shelf number is already on the notepad — skip the catalog, walk straight to the shelf.
- **TLB miss:** not on the notepad — walk to the catalog, look it up, write it down, then go to the shelf.

<Diagram>
<Row>
<Box label="TLB hit" sub="~1-2 ns" />
<Box label="TLB miss" sub="100s of ns" />
</Row>
</Diagram>

---

### Doing the math: Effective Memory Access Time (EMAT)

Interviewers like to turn this into a quick calculation. Let:
- $\alpha =$ TLB hit ratio (typically $0.95$–$0.99$)
- $t_{\text{TLB}} =$ TLB lookup time ($\approx 1\text{ ns}$)
- $t_{\text{RAM}} =$ main memory access time ($\approx 100\text{ ns}$)

**Single-level page table:**
$$\text{EMAT} = \alpha \cdot (t_{\text{TLB}} + t_{\text{RAM}}) + (1 - \alpha) \cdot (t_{\text{TLB}} + 2 \cdot t_{\text{RAM}})$$

**Multi-level page tables** (what modern 64-bit CPUs actually use — 4 or 5 levels): on a miss, the MMU has to walk through all of them before it reaches the physical frame:
$$\text{EMAT}_{\text{4-level}} = \alpha \cdot (t_{\text{TLB}} + t_{\text{RAM}}) + (1 - \alpha) \cdot (t_{\text{TLB}} + 5 \cdot t_{\text{RAM}})$$

**Worked example** — $\alpha = 0.98$, $t_{\text{TLB}} = 1\text{ ns}$, $t_{\text{RAM}} = 100\text{ ns}$:
- On a hit: $1 + 100 = 101\text{ ns}$
- On a miss (4-level walk): $1 + (5 \times 100) = 501\text{ ns}$
- $\text{EMAT} = 0.98(101) + 0.02(501) = 98.98 + 10.02 = \mathbf{109.0\text{ ns}}$

A 98% hit ratio keeps average access within about 9% of raw RAM speed — that's how much the TLB is carrying.

---

### Keeping the TLB warm across context switches: ASID/PCID

Historically, every context switch flushed the whole TLB — switching to a new process meant its virtual addresses pointed at completely different physical frames, so the old entries were useless and had to go (on x86, this happened whenever `CR3` was reloaded).

Modern CPUs avoid this with **Address Space / Process Context Identifiers (ASID/PCID)**: every TLB entry is tagged with the ID of the process it belongs to, and the MMU only matches entries tagged with the *currently active* ID. A context switch just updates that one active-ID register — the TLB itself is left alone, so its entries for other processes stay warm for next time.

---

### TLB miss vs. page fault

| Dimension | TLB Miss | Page Fault |
| :--- | :--- | :--- |
| **What's missing** | The translation isn't cached in the TLB. | The page itself isn't in RAM at all. |
| **Where's the data** | The page table is in physical RAM — just not in the TLB cache. | The data is on disk/swap. |
| **How it's handled** | Hardware MMU walks the page table (or a lightweight trap). | A full OS kernel interrupt — much heavier. |
| **Latency** | Nanoseconds (~10–100 ns). | Milliseconds (~1–10 ms) — about 100,000× slower. |
| **Resolution** | Load the translation into the TLB, retry the access. | Allocate a frame, read the page from disk, update the page table, restart the instruction. |

---

### Say this in the interview

*"The TLB is a hardware cache in the MMU that stores recent virtual-to-physical translations so most memory accesses don't need to walk the page table. EMAT weighs hit cost against miss cost by hit ratio. A TLB miss is cheap — a nanosecond-scale hardware page walk. A page fault is expensive — a millisecond-scale kernel interrupt and disk read, because the data itself isn't in RAM at all."*

---

### Code: observing TLB & cache locality in C

```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define ROWS 4096
#define COLS 4096

// 4096 * 4096 * 4 bytes = 64 MB matrix (exceeds CPU L3 cache & TLB coverage)
int matrix[ROWS][COLS];

int main() {
    clock_t start, end;

    // 1. Row-Major Traversal (Spatial Locality: TLB & Cache Friendly)
    // Adjacent memory accesses fall on the exact same 4KB virtual page!
    start = clock();
    long long sum1 = 0;
    for (int i = 0; i < ROWS; i++) {
        for (int j = 0; j < COLS; j++) {
            sum1 += matrix[i][j];
        }
    }
    end = clock();
    printf("Row-Major (TLB Friendly) Time:     %f sec\n", (double)(end - start) / CLOCKS_PER_SEC);

    // 2. Column-Major Traversal (TLB & Cache Hostile)
    // Every single iteration jumps by 4096 ints (16 KB), jumping to a new page and thrashing the TLB!
    start = clock();
    long long sum2 = 0;
    for (int j = 0; j < COLS; j++) {
        for (int i = 0; i < ROWS; i++) {
            sum2 += matrix[i][j];
        }
    }
    end = clock();
    printf("Column-Major (TLB Thrashing) Time: %f sec\n", (double)(end - start) / CLOCKS_PER_SEC);

    return 0;
}
```
