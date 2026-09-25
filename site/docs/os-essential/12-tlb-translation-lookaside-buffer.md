---
id: 12-tlb-translation-lookaside-buffer
title: "Translation Lookaside Buffer (TLB) & Address Caching"
description: "Discover why the TLB is essential for avoiding double memory accesses, EMAT mathematical formulas, and TLB miss vs. page fault mechanics."
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the TLB? Why does it exist, what is the formula for Effective Memory Access Time (EMAT), and what happens on a TLB miss versus a page fault?"

Because page tables reside in physical RAM, translating every virtual memory reference would theoretically require accessing RAM twice: once to read the page table, and once to read the actual data. The **Translation Lookaside Buffer (TLB)** is a specialized, ultra-fast hardware associative cache in the CPU's **Memory Management Unit (MMU)** that eliminates this severe performance penalty.

---

### The ELI5 Analogy: The Librarian's Pocket Notepad

Imagine visiting a library with 10 million books:
- To find a book's shelf location, you must walk to the front desk and consult a massive, heavy Master Index catalog (**The Page Table in RAM**).
- **The Problem:** Every time you want a book, you make two full trips: one trip to the catalog to read the shelf number, and a second trip to the shelf to grab the book. This cuts your reading speed in half.
- **The Solution:** The librarian carries a small index card in their pocket (**The TLB**). When a book is looked up, the librarian jots down its shelf number on the card. The card only holds 50 books.
- **TLB Hit:** If the book's shelf number is on the card, you skip the catalog entirely and walk straight to the shelf.
- **TLB Miss:** The card doesn't have it. You walk to the Master Catalog, look up the shelf, write it on the card, and proceed.

---

### The Mathematical Proof: Effective Memory Access Time (EMAT)

Interviewers frequently test systems candidates with **Effective Memory Access Time (EMAT)** calculations:

Let:
- $\alpha =$ TLB Hit Ratio (typically $0.95 - 0.99$)
- $t_{\text{TLB}} =$ TLB lookup time ($\approx 1\text{ ns}$)
- $t_{\text{RAM}} =$ Main memory access time ($\approx 100\text{ ns}$)

#### Single-Level Page Table EMAT:
$$\text{EMAT} = \alpha \cdot (t_{\text{TLB}} + t_{\text{RAM}}) + (1 - \alpha) \cdot (t_{\text{TLB}} + 2 \cdot t_{\text{RAM}})$$

#### Multi-Level Page Tables (Modern 64-bit Architecture):
Modern x86-64 systems use **4-level or 5-level paging**. On a TLB miss, the MMU must traverse 4 separate page tables before reaching the physical frame:
$$\text{EMAT}_{\text{4-level}} = \alpha \cdot (t_{\text{TLB}} + t_{\text{RAM}}) + (1 - \alpha) \cdot (t_{\text{TLB}} + 5 \cdot t_{\text{RAM}})$$

#### Concrete Numerical Example:
If $\alpha = 0.98$, $t_{\text{TLB}} = 1\text{ ns}$, and $t_{\text{RAM}} = 100\text{ ns}$:
- **On a Hit:** $1\text{ ns} + 100\text{ ns} = 101\text{ ns}$
- **On a Miss (4-level walk):** $1\text{ ns} + (5 \times 100\text{ ns}) = 501\text{ ns}$
- $\text{EMAT} = 0.98(101) + 0.02(501) = 98.98 + 10.02 = \mathbf{109.0\text{ ns}}$

*Insight:* A high TLB hit ratio keeps overall memory access speed within **9%** of raw hardware RAM speed!

---

### The Staff Differentiator: Preventing TLB Flushes via ASID / PCID

Historically, whenever the OS executed a process context switch, it had to **flush the entire TLB** (e.g., by writing to the `CR3` register on x86) because virtual addresses in Process A map to completely different physical frames than in Process B.

Modern processors eliminate this overhead using **Address Space Identifiers (ASID)** or **Process Context Identifiers (PCID)**:
- Each TLB entry is tagged with a hardware process ID bitmask.
- The MMU only matches TLB entries where `tag == current_process_ASID`.
- On a context switch, the OS simply updates the CPU's active ASID register. **The TLB is not flushed**, keeping cached address translations warm across context switches!

---

### TLB Miss vs. Page Fault

| Dimension | TLB Miss | Page Fault |
| :--- | :--- | :--- |
| **Definition** | Address translation is not cached in the TLB. | Target page is not resident in physical RAM. |
| **Location of Data** | Page table exists in **Physical RAM**. | Page data resides on **Secondary Storage (Disk / Swap)**. |
| **Handling Mechanism** | **Hardware MMU page walk** (x86/ARM) or lightweight trap. | **OS Kernel Interrupt Service Routine** (heavy software trap). |
| **Latency Penalty** | Nanoseconds ($\approx 10 - 100\text{ ns}$). | Milliseconds ($\approx 1 - 10\text{ ms}$, **100,000× slower**). |
| **Resolution** | Loads translation into TLB; retries memory read. | Allocates RAM frame, loads page from disk, updates page table, restarts instruction. |

---

### Summary
"The TLB is an associative hardware cache in the MMU that stores recent virtual-to-physical address translations to eliminate the double memory access penalty. EMAT calculates weighted latency based on hit ratio and page table levels. A TLB miss is handled in hardware nanoseconds via a page table walk, whereas a page fault requires an OS kernel interrupt and millisecond disk I/O."

---

### Code Demonstration: Observing TLB & Cache Locality in C

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