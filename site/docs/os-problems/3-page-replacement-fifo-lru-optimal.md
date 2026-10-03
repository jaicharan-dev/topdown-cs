---
id: 3-page-replacement-fifo-lru-optimal
title: "Page Replacement Problem: FIFO, LRU, and Optimal Fault-Counting"
description: "Trace a 20-page reference string across 3 physical frames to count page hits and page faults for FIFO, LRU, and Optimal replacement algorithms."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the 20-page reference string `[7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]` and a memory allocation of 3 physical page frames, trace each step and compute total page faults for FIFO, LRU, and Optimal (Bélády's MIN) algorithms. Why is Optimal impossible to implement in practice?"

---

### Problem Specification

- **Reference String (20 accesses):**
  $$\sigma = \langle 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1 \rangle$$
- **Physical Memory Capacity:** 3 Frames (initially empty).
- **Page Fault:** Occurs when a referenced page is not currently present in any physical frame, requiring an I/O transfer from secondary storage into RAM.
- **Page Hit:** Occurs when the referenced page already resides in one of the physical frames (0 I/O latency).

---

### Part 1: FIFO (First-In, First-Out)

FIFO maintains a strict queue of memory residency. The page that has been in RAM the longest, regardless of how frequently or recently it was accessed, is selected for eviction.

#### Step-by-Step Trace Table (FIFO)

| Step | Page Req | Frame 1 | Frame 2 | Frame 3 | Result | Evicted Victim |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **7** | **7** | - | - | ❌ **Fault** | - |
| **2** | **0** | 7 | **0** | - | ❌ **Fault** | - |
| **3** | **1** | 7 | 0 | **1** | ❌ **Fault** | - |
| **4** | **2** | **2** | 0 | 1 | ❌ **Fault** | 7 (Oldest) |
| **5** | **0** | 2 | 0 | 1 | ✅ **Hit** | - |
| **6** | **3** | 2 | **3** | 1 | ❌ **Fault** | 0 (Oldest) |
| **7** | **0** | 2 | 3 | **0** | ❌ **Fault** | 1 (Oldest) |
| **8** | **4** | **4** | 3 | 0 | ❌ **Fault** | 2 (Oldest) |
| **9** | **2** | 4 | **2** | 0 | ❌ **Fault** | 3 (Oldest) |
| **10** | **3** | 4 | 2 | **3** | ❌ **Fault** | 0 (Oldest) |
| **11** | **0** | **0** | 2 | 3 | ❌ **Fault** | 4 (Oldest) |
| **12** | **3** | 0 | 2 | 3 | ✅ **Hit** | - |
| **13** | **2** | 0 | 2 | 3 | ✅ **Hit** | - |
| **14** | **1** | 0 | **1** | 3 | ❌ **Fault** | 2 (Oldest) |
| **15** | **2** | 0 | 1 | **2** | ❌ **Fault** | 3 (Oldest) |
| **16** | **0** | 0 | 1 | 2 | ✅ **Hit** | - |
| **17** | **1** | 0 | 1 | 2 | ✅ **Hit** | - |
| **18** | **7** | **7** | 1 | 2 | ❌ **Fault** | 0 (Oldest) |
| **19** | **0** | 7 | **0** | 2 | ❌ **Fault** | 1 (Oldest) |
| **20** | **1** | 7 | 0 | **1** | ❌ **Fault** | 2 (Oldest) |

- **Total FIFO Page Faults:** **15**
- **Total FIFO Page Hits:** **5**
- **Fault Rate:** 15 / 20 = **75.0%**

---

### Part 2: LRU (Least Recently Used)

LRU leverages the principle of **temporal locality**: pages accessed recently are likely to be accessed again soon. The page that has not been referenced for the longest duration of time in the past is evicted.

#### Step-by-Step Trace Table (LRU)

| Step | Page Req | Frame 1 | Frame 2 | Frame 3 | Result | Evicted Victim (Least Recently Used) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **7** | **7** | - | - | ❌ **Fault** | - |
| **2** | **0** | 7 | **0** | - | ❌ **Fault** | - |
| **3** | **1** | 7 | 0 | **1** | ❌ **Fault** | - |
| **4** | **2** | **2** | 0 | 1 | ❌ **Fault** | 7 (Last used at step 1) |
| **5** | **0** | 2 | 0 | 1 | ✅ **Hit** | - |
| **6** | **3** | 2 | 0 | **3** | ❌ **Fault** | 1 (Last used at step 3) |
| **7** | **0** | 2 | 0 | 3 | ✅ **Hit** | - |
| **8** | **4** | **4** | 0 | 3 | ❌ **Fault** | 2 (Last used at step 4) |
| **9** | **2** | 4 | 0 | **2** | ❌ **Fault** | 3 (Last used at step 6) |
| **10** | **3** | 4 | **3** | 2 | ❌ **Fault** | 0 (Last used at step 7) |
| **11** | **0** | **0** | 3 | 2 | ❌ **Fault** | 4 (Last used at step 8) |
| **12** | **3** | 0 | 3 | 2 | ✅ **Hit** | - |
| **13** | **2** | 0 | 3 | 2 | ✅ **Hit** | - |
| **14** | **1** | **1** | 3 | 2 | ❌ **Fault** | 0 (Last used at step 11) |
| **15** | **2** | 1 | 3 | 2 | ✅ **Hit** | - |
| **16** | **0** | 1 | **0** | 2 | ❌ **Fault** | 3 (Last used at step 12) |
| **17** | **1** | 1 | 0 | 2 | ✅ **Hit** | - |
| **18** | **7** | 1 | 0 | **7** | ❌ **Fault** | 2 (Last used at step 15) |
| **19** | **0** | 1 | 0 | 7 | ✅ **Hit** | - |
| **20** | **1** | 1 | 0 | 7 | ✅ **Hit** | - |

- **Total LRU Page Faults:** **12**
- **Total LRU Page Hits:** **8**
- **Fault Rate:** 12 / 20 = **60.0%**

---

### Part 3: Optimal (Bélády's MIN Algorithm)

Optimal page replacement evicts the page that **will not be referenced for the longest duration of time in the future**. It is mathematically proven to generate the absolute minimum number of page faults for any given reference string.

#### Step-by-Step Trace Table (Optimal)

| Step | Page Req | Frame 1 | Frame 2 | Frame 3 | Result | Evicted Victim (Furthest Future Use) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **7** | **7** | - | - | ❌ **Fault** | - |
| **2** | **0** | 7 | **0** | - | ❌ **Fault** | - |
| **3** | **1** | 7 | 0 | **1** | ❌ **Fault** | - |
| **4** | **2** | **2** | 0 | 1 | ❌ **Fault** | 7 (Next used at step 18; 0 used at step 5, 1 at step 14) |
| **5** | **0** | 2 | 0 | 1 | ✅ **Hit** | - |
| **6** | **3** | 2 | 0 | **3** | ❌ **Fault** | 1 (Next used at step 14; 0 used at step 7, 2 at step 9) |
| **7** | **0** | 2 | 0 | 3 | ✅ **Hit** | - |
| **8** | **4** | 2 | **4** | 3 | ❌ **Fault** | 0 (Next used at step 11; 2 used at step 9, 3 at step 10) |
| **9** | **2** | 2 | 4 | 3 | ✅ **Hit** | - |
| **10** | **3** | 2 | 4 | 3 | ✅ **Hit** | - |
| **11** | **0** | 2 | **0** | 3 | ❌ **Fault** | 4 (Never used again in reference string!) |
| **12** | **3** | 2 | 0 | 3 | ✅ **Hit** | - |
| **13** | **2** | 2 | 0 | 3 | ✅ **Hit** | - |
| **14** | **1** | 2 | 0 | **1** | ❌ **Fault** | 3 (Never used again in reference string!) |
| **15** | **2** | 2 | 0 | 1 | ✅ **Hit** | - |
| **16** | **0** | 2 | 0 | 1 | ✅ **Hit** | - |
| **17** | **1** | 2 | 0 | 1 | ✅ **Hit** | - |
| **18** | **7** | **7** | 0 | 1 | ❌ **Fault** | 2 (Never used again in reference string!) |
| **19** | **0** | 7 | 0 | 1 | ✅ **Hit** | - |
| **20** | **1** | 7 | 0 | 1 | ✅ **Hit** | - |

- **Total Optimal Page Faults:** **9**
- **Total Optimal Page Hits:** **11**
- **Fault Rate:** 9 / 20 = **45.0%**

---

### Comparative Evaluation Scorecard

| Algorithm | Total Faults | Total Hits | Fault Rate | Implementable in OS? |
| :--- | :---: | :---: | :---: | :--- |
| **Optimal (MIN)** | 9 | 11 | 45.0% | **NO (Theoretical Bound).** Requires predicting future memory references. |
| **LRU** | 12 | 8 | 60.0% | **Approximated.** True LRU requires expensive hardware counters / stack updates per memory cycle. |
| **FIFO** | 15 | 5 | 75.0% | **YES.** Simple queue, but suffers from high fault rates and **Bélády's Anomaly**. |

---

### Why True LRU and Optimal are Challenging in Hardware

1. **Why Optimal is Impossible:** General-purpose OS kernels cannot predict which memory addresses an application will dereference in the future. It serves strictly as a theoretical gold standard to measure the efficiency of heuristic algorithms.
2. **Why True LRU is Too Heavy:** To maintain perfect LRU ordering, the CPU hardware MMU would have to update a 64-bit timestamp or shuffle a doubly linked list node on **every single memory dereference** (billions of times per second).
3. **The OS Kernel Compromise (Clock / Second-Chance Algorithm):**
   - Operating systems (like Linux and Windows) approximate LRU using the **Clock Algorithm**:
   - Each page table entry contains a single **Reference Bit (R)** set by CPU hardware when the page is read/written.
   - A circular clock hand scans pages: if R = 1, the kernel clears R = 0 (giving a second chance) and advances; if R = 0, the page is selected for eviction. This achieves approximately 95% of LRU efficiency with O(1) amortized overhead.

---

### Summary

For the given 20-page reference string with 3 frames, Optimal produces 9 page faults, LRU produces 12 page faults, and FIFO produces 15 page faults. Optimal represents the theoretical lower bound by evicting pages with the furthest future reference, but is unrealizable due to the clairvoyance requirement. While FIFO is simple, it ignores frequency and recency. True LRU incurs prohibitive per-access hardware tracking costs, leading production kernels to approximate LRU via the Second-Chance Clock algorithm.

---

### Python Verification: Page Replacement Multi-Algorithm Simulator

The following executable Python script implements FIFO, LRU, and Optimal page replacement algorithms, verifying the exact fault counts and hit rates across reference strings:

```python
"""
Page Replacement Algorithms Simulator (FIFO, LRU, Optimal)
Verifies:
  - Exact fault counts across 3 frames
  - Hit/Fault classifications per reference step
"""

from typing import List, Tuple

def simulate_fifo(ref_str: List[int], num_frames: int = 3) -> Tuple[int, int]:
    frames: List[int] = []
    faults = 0
    hits = 0

    for page in ref_str:
        if page in frames:
            hits += 1
        else:
            faults += 1
            if len(frames) < num_frames:
                frames.append(page)
            else:
                frames.pop(0)  # Evict oldest
                frames.append(page)
    return faults, hits


def simulate_lru(ref_str: List[int], num_frames: int = 3) -> Tuple[int, int]:
    frames: List[int] = []  # Index 0 is LRU, last index is Most Recently Used
    faults = 0
    hits = 0

    for page in ref_str:
        if page in frames:
            hits += 1
            frames.remove(page)
            frames.append(page)  # Move to MRU position
        else:
            faults += 1
            if len(frames) < num_frames:
                frames.append(page)
            else:
                frames.pop(0)    # Evict least recently used
                frames.append(page)
    return faults, hits


def simulate_optimal(ref_str: List[int], num_frames: int = 3) -> Tuple[int, int]:
    frames: List[int] = []
    faults = 0
    hits = 0

    for idx, page in enumerate(ref_str):
        if page in frames:
            hits += 1
        else:
            faults += 1
            if len(frames) < num_frames:
                frames.append(page)
            else:
                # Find page that will not be used for longest time in future
                future_sub = ref_str[idx + 1:]
                victim = None
                furthest_use = -1

                for f in frames:
                    if f not in future_sub:
                        victim = f
                        break
                    else:
                        next_use = future_sub.index(f)
                        if next_use > furthest_use:
                            furthest_use = next_use
                            victim = f

                frames.remove(victim)
                frames.append(page)
    return faults, hits


def main():
    print("=== Page Replacement Numerical Problem Verification ===\n")
    reference_string = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
    num_frames = 3

    print(f"Reference String: {reference_string}")
    print(f"Total References: {len(reference_string)} | Total Physical Frames: {num_frames}\n")

    f_fifo, h_fifo = simulate_fifo(reference_string, num_frames)
    print(f"FIFO:    {f_fifo} Faults | {h_fifo} Hits | Fault Rate: {(f_fifo / len(reference_string))*100:.1f}%")

    f_lru, h_lru = simulate_lru(reference_string, num_frames)
    print(f"LRU:     {f_lru} Faults | {h_lru} Hits | Fault Rate: {(f_lru / len(reference_string))*100:.1f}%")

    f_opt, h_opt = simulate_optimal(reference_string, num_frames)
    print(f"Optimal: {f_opt} Faults | {h_opt} Hits | Fault Rate: {(f_opt / len(reference_string))*100:.1f}% [Theoretical Bound]")

if __name__ == "__main__":
    main()
```