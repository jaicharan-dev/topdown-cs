---
id: 11-page-replacement-algorithms-belady-anomaly
title: "Page Replacement Algorithms: FIFO, LRU, Optimal & Belady's Anomaly"
description: "Evaluate FIFO, LRU, Optimal, and Clock page replacement algorithms, cache eviction heuristics, and the counterintuitive Belady's Anomaly."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the common page replacement algorithms (FIFO, LRU, Optimal)? What is Belady's Anomaly, how does the Clock algorithm approximate LRU in real kernels, and which algorithms are immune to the anomaly?"

When a page fault occurs and physical RAM is full, the operating system must select a resident page to evict to disk. The choice of eviction policy dictates system throughput: a poor algorithm evicts pages about to be read, causing an avalanche of disk I/O.

---

### The ELI5 Analogy: The Pastry Display Case

Imagine a coffee shop display case that holds 3 types of pastries:
- **FIFO (First In, First Out):** You bake new pastries and discard the oldest pastry based strictly on when it was baked. If customers buy croissants every 30 seconds, but croissants have been in the case the longest, FIFO throws croissants in the trash anyway.
- **LRU (Least Recently Used):** You track how recently a customer ordered each pastry. You evict whichever pastry hasn't been ordered for the longest time.
- **Belady's Anomaly:** You upgrade your display case from 3 slots to 4 slots thinking it will reduce baking trips. But because your blind FIFO rule alters the order of eviction, you end up throwing away popular items right before customers ask for them, resulting in **more baking trips with a bigger case**!

---

### Comparison of Core Page Replacement Algorithms

| Algorithm | Eviction Heuristic | Hardware Overhead | Stack Algorithm? | Suffers from Belady's Anomaly? |
| :--- | :--- | :--- | :---: | :---: |
| **FIFO** | Evicts the oldest loaded page in memory. | Minimal (simple circular queue). | ❌ No | **Yes** |
| **Optimal (OPT / MIN)** | Evicts the page that will not be accessed for the longest time in the future. | Impossible (requires future knowledge). Used as a theoretical ceiling. | ✅ Yes | **No** |
| **LRU** | Evicts the page unaccessed for the longest duration. | Very High (requires timestamps or pointer manipulation on every read). | ✅ Yes | **No** |
| **Clock (Second-Chance)** | Approximates LRU using a circular buffer and a single hardware access bit. | **Very Low** (standard in production OSs like Linux). | ❌ No | Rare in practice |

---

### The Production Reality: The Clock (Second-Chance) Algorithm

Interviewers often ask: *"Why don't production operating systems like Linux use pure LRU?"*

#### The Problem with Pure LRU:
Implementing true LRU requires either:
1. Updating a 64-bit timestamp in memory on **every single CPU memory access**, or
2. Moving a node to the head of a doubly-linked list on every access.
Both options saturate CPU memory buses and thrash hardware caches.

#### The Solution: The Clock Algorithm
Modern kernels approximate LRU using a hardware **Referenced / Access bit** in the Page Table Entry:
1. Physical frames are arranged in a logical circular buffer with a sweeping hand (like a clock).
2. When a page is read/written, the CPU hardware sets its **Referenced bit = 1**.
3. When eviction is required, the OS inspects the page at the clock hand:
   - **If Referenced bit == 1:** Clear the bit to `0` (giving it a "second chance") and advance the hand to the next frame.
   - **If Referenced bit == 0:** This page was not accessed since the last sweep. **Evict this page immediately!**

---

### Belady's Anomaly: Why Adding RAM Increases Page Faults

**Belady's Anomaly** is the counterintuitive phenomenon where allocating more physical frames to a process results in **more** page faults under the FIFO algorithm.

#### The Mathematical Foundation: Stack Algorithms
Algorithms that satisfy the **Stack Property** are mathematically immune to Belady's Anomaly:
$$\text{Stack Property: } S(N, t) \subseteq S(N + 1, t)$$
The set of pages cached in an $N$-frame memory at time $t$ is guaranteed to be a strict subset of the pages cached in an $(N+1)$-frame memory. Both **LRU** and **Optimal** are stack algorithms.

**FIFO does not satisfy the stack property**: adding a frame alters the entire historical eviction rhythm, causing actively referenced pages to be evicted right before use.

#### The Concrete Stepping Proof:
Reference String: `3, 2, 1, 0, 3, 2, 4, 3, 2, 1, 0, 4`

```
--- With 3 Frames (FIFO) ---
Ref:   3  2  1  0  3  2  4  3  2  1  0  4
F1:    3  3  3  0  0  0  4  4  4  4  0  0
F2:       2  2  2  3  3  3  3  3  1  1  1
F3:          1  1  1  2  2  2  2  2  2  4
Fault: *  *  *  *  *  *  *        *  *  *  -> TOTAL: 9 Page Faults

--- With 4 Frames (FIFO) ---
Ref:   3  2  1  0  3  2  4  3  2  1  0  4
F1:    3  3  3  3  3  3  4  4  4  4  0  0
F2:       2  2  2  2  2  2  3  3  3  3  4
F3:          1  1  1  1  1  1  2  2  2  2
F4:             0  0  0  0  0  0  1  1  1
Fault: *  *  *  *        *  *  *  *  *  *  -> TOTAL: 10 Page Faults!
```
Adding an extra physical frame increased page faults from **9 to 10**!

---

### Summary
"Belady's Anomaly occurs when increasing physical frames increases page faults under FIFO. Stack algorithms like LRU and Optimal are mathematically immune because the pages in N frames are always a subset of N+1 frames. Real operating systems approximate LRU using the low-overhead Clock (Second-Chance) algorithm via hardware referenced bits."

---

### Code Demonstration: Simulating Belady's Anomaly in Python

```python
def simulate_fifo(pages, capacity):
    memory = []
    faults = 0
    for page in pages:
        if page not in memory:
            faults += 1
            if len(memory) == capacity:
                memory.pop(0) # FIFO: evict oldest
            memory.append(page)
    return faults

def simulate_lru(pages, capacity):
    memory = []
    faults = 0
    for page in pages:
        if page not in memory:
            faults += 1
            if len(memory) == capacity:
                memory.pop(0) # Evict least recently used
            memory.append(page)
        else:
            # Move accessed page to the end (most recently used)
            memory.remove(page)
            memory.append(page)
    return faults

if __name__ == "__main__":
    belady_reference_string = [3, 2, 1, 0, 3, 2, 4, 3, 2, 1, 0, 4]

    fifo_3 = simulate_fifo(belady_reference_string, 3)
    fifo_4 = simulate_fifo(belady_reference_string, 4)

    lru_3 = simulate_lru(belady_reference_string, 3)
    lru_4 = simulate_lru(belady_reference_string, 4)

    print("--- BELADY'S ANOMALY DEMONSTRATION ---")
    print(f"FIFO (3 frames): {fifo_3} faults | FIFO (4 frames): {fifo_4} faults  <-- Anomaly observed!")
    print(f"LRU  (3 frames): {lru_3} faults | LRU  (4 frames): {lru_4} faults  <-- Stack algorithm behaves correctly.")
```