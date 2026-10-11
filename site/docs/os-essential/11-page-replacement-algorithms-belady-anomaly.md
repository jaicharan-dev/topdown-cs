---
id: 11-page-replacement-algorithms-belady-anomaly
title: "Page Replacement Algorithms: FIFO, LRU, Optimal & Belady's Anomaly"
description: "Compare FIFO, LRU, Optimal, and Clock page replacement, and the counterintuitive Belady's Anomaly where adding RAM makes things worse."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the common page replacement algorithms (FIFO, LRU, Optimal)? What is Belady's Anomaly, how does the Clock algorithm approximate LRU in real kernels, and which algorithms are immune to the anomaly?"

When RAM is full and a page fault happens, the OS has to pick a page to kick out to disk. Pick badly, and you evict something that's about to be needed again — causing a wave of extra disk I/O right after.

---

### The analogy: a pastry display case with 3 slots

- **FIFO:** throw out whatever's been in the case the longest, no matter how popular it is. If croissants sell every 30 seconds but happen to be the oldest item in the case, FIFO tosses them anyway.
- **LRU:** track when each pastry was last ordered, and evict whichever one hasn't been touched in the longest time.
- **Belady's Anomaly:** you upgrade the case from 3 slots to 4, expecting fewer baking trips. But because FIFO's blind ordering shifts around, you end up throwing out popular items right before someone asks for them — and somehow make *more* baking trips with the bigger case.

---

### Comparing the core algorithms

| Algorithm | Eviction rule | Overhead | Stack algorithm? | Suffers Belady's Anomaly? |
| :--- | :--- | :--- | :---: | :---: |
| **FIFO** | Evicts whatever's been in memory the longest. | Minimal — a simple queue. | No | **Yes** |
| **Optimal (OPT/MIN)** | Evicts whatever won't be used again for the longest time. | Impossible in practice — needs future knowledge. Used as a theoretical best case. | Yes | No |
| **LRU** | Evicts whatever hasn't been used in the longest time. | Very high — needs timestamps or list updates on every access. | Yes | No |
| **Clock (Second-Chance)** | Approximates LRU with one hardware bit per page. | Very low — what real OSes (Linux) actually use. | No | Rare in practice |

---

### Why real kernels don't use pure LRU

True LRU needs either a timestamp update on *every single memory access*, or moving a node to the head of a linked list each time. Either way, that saturates memory bandwidth and thrashes the CPU cache — way too expensive to do for real.

**The Clock algorithm** gets close to LRU's behavior for almost nothing, using one bit per page:

1. Physical frames sit in a circular buffer with a sweeping "hand," like a clock face.
2. Whenever a page is read or written, hardware sets its **Referenced bit** to `1`.
3. When the OS needs to evict something, it looks at the page under the hand:
   - **Bit is 1:** give it a second chance — clear it to `0` and move the hand forward.
   - **Bit is 0:** it hasn't been touched since the last sweep. Evict it now.

---

### Belady's Anomaly: when more RAM makes things worse

Under FIFO specifically, giving a process *more* physical frames can somehow cause *more* page faults — not fewer. That's Belady's Anomaly.

**Why it only hits FIFO:** algorithms that satisfy the stack property — the pages cached with N frames are always a subset of the pages cached with N+1 frames — are immune to this. LRU and Optimal both have that property. FIFO doesn't: adding a frame reshuffles its whole eviction order, so pages that were safe before now get evicted right before they're needed.

**Proof, with reference string `3, 2, 1, 0, 3, 2, 4, 3, 2, 1, 0, 4`:**

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

One extra frame, and faults go *up* from 9 to 10.

---

### Say this in the interview

*"Belady's Anomaly is when adding physical frames increases page faults under FIFO. Stack algorithms like LRU and Optimal are immune — the set of pages cached with N frames is always a subset of what's cached with N+1 frames, so adding memory can only help. FIFO doesn't have that property, which is why real kernels use the Clock algorithm — it approximates LRU behavior using a single hardware-maintained reference bit, at almost no overhead."*

---

### Code: simulating Belady's Anomaly in Python

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
