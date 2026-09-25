---
id: 13-thrashing-and-working-set
title: "Thrashing: Causes, Working Set Model & Page Fault Frequency"
description: "Examine memory thrashing when the OS spends more time paging than executing code, Denning's working set theory, and recovery mechanisms."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is thrashing? What causes it, what is Peter Denning's Working Set Model, and how do operating systems detect and prevent thrashing?"

**Thrashing** occurs when a virtual memory subsystem enters a catastrophic state of continuous paging. The operating system spends significantly more CPU cycles swapping pages between RAM and secondary storage (disk/swap) than executing user instructions, causing system throughput to collapse toward zero.

---

### The ELI5 Analogy: The Tiny Kitchen Counter

Imagine cooking a banquet in a kitchen with a counter that fits only 2 bowls (Physical RAM):
- The recipe requires 10 ingredients stored in a pantry down the hall (Hard Disk).
- You bring out the eggs and milk. Now you need flour.
- Because the counter is full, you walk the milk back to the pantry and bring the flour.
- Immediately, the next step requires milk again. You return the eggs and fetch the milk.
- You spend 98% of your time running down the hallway carrying bowls and only 2% of your time cooking. That endless hallway sprint is **Thrashing**.

---

### The Vicious Cycle of Multiprogramming

Thrashing typically stems from a structural miscommunication between the **CPU Scheduler** and the **Virtual Memory Manager**:

```
High Degree of Multiprogramming
             │
             ▼
Physical RAM exhausts free frames
             │
             ▼
Processes suffer continuous Page Faults
             │
             ▼
Processes block in Wait Queue awaiting Disk I/O
             │
             ▼
CPU Utilization drops toward zero!
             │
             ▼
[FATAL TRAP]: Scheduler thinks CPU is underutilized -> Loads MORE processes into RAM!
             │
             ▼
Total System Collapse (Thrashing)
```

```
CPU Utilization %
    100 |          ▲ Peak
        |        /   \
        |       /     \
        |      /       \  <-- Thrashing begins!
      0 └─────┴─────────▼──────
          Degree of Multiprogramming
```

---

### Peter Denning's Working Set Model

To prevent thrashing, Peter Denning formulated the **Working Set Model** based on the principle of **Locality of Reference** (programs spend 90% of their execution in 10% of their code space):

1. **Working Set Window ($\Delta$):** A fixed time interval (e.g., the last $\Delta$ memory references).
2. **Working Set ($W(t, \Delta)$):** The distinct set of pages referenced by a process in the time window $(t - \Delta, t)$. This represents the process's current memory demand.
3. **Total System Demand ($D$):**
   $$D = \sum_{i=1}^{n} |W_i|$$
   where $|W_i|$ is the size of the working set of process $i$.

#### The Mathematical Condition for Thrashing:
$$\text{If } D > M \quad \text{(where } M \text{ is total physical frames in RAM), Thrashing is Guaranteed!}$$

#### The OS Defense:
The **Medium-Term Scheduler (Swapper)** continuously monitors $D$. If $D > M$:
- The OS selects a victim process $P_k$ and **suspends it completely**.
- All of $P_k$'s resident pages are flushed to swap storage, releasing its frames to remaining active processes.
- Once total demand drops ($D \le M$), remaining processes execute without page fault cascades. $P_k$ is brought back when memory pressure subsides.

---

### Alternative Strategy: Page Fault Frequency (PFF)

While calculating working sets directly can be computationally heavy, modern operating systems often employ **Page Fault Frequency (PFF)** as an adaptive runtime heuristic:

```
Page Fault Rate
       ▲
 Upper ├─────────────────────── Allocate MORE frames (or Suspend a process)
 Threshold
       │      Safe Zone
 Lower ├─────────────────────── REMOVE excess frames from process
 Threshold
       └──────────────────────► Time
```
- If a process's page fault rate exceeds the **Upper Threshold**, it is starving for memory; the OS allocates additional physical frames. If no frames remain, the process is suspended.
- If the rate falls below the **Lower Threshold**, the process is holding unneeded frames; the OS reclaims them to optimize global memory.

---

### Summary
"Thrashing occurs when memory demand exceeds physical RAM, trapping the CPU in a continuous loop of disk page swaps. Denning's Working Set model proves that thrashing is guaranteed if total process demand $D > M$. Operating systems prevent thrashing via local page replacement, Page Fault Frequency monitoring, and medium-term process suspension."

---

### Code Demonstration: Observing Memory Thrashing Behavior

```python
import time
import random

# Simulating memory access patterns
PAGE_SIZE = 4096
TOTAL_PAGES = 10000

# 1. Sequential Access (High Spatial Locality -> ZERO Thrashing)
def simulate_sequential():
    start = time.time()
    for page in range(TOTAL_PAGES):
        # Accesses predictable, contiguous memory
        _ = page * PAGE_SIZE
    return time.time() - start

# 2. Random Stride Access (Zero Locality -> Simulates Severe Thrashing)
def simulate_random_thrash():
    start = time.time()
    for _ in range(TOTAL_PAGES):
        # Jumps randomly across memory space, blowing past cache & working set
        page = random.randint(0, TOTAL_PAGES - 1)
        _ = page * PAGE_SIZE
    return time.time() - start

if __name__ == "__main__":
    t_seq = simulate_sequential()
    t_thrash = simulate_random_thrash()
    
    print(f"Sequential (Locality Intact) Time: {t_seq:.4f} sec")
    print(f"Random Stride (Thrashing Pattern):  {t_thrash:.4f} sec")
    print(f"Random stride incurred a {t_thrash / t_seq:.1f}x latency penalty due to loss of memory locality.")
```