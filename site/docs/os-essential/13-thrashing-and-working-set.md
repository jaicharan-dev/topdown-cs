---
id: 13-thrashing-and-working-set
title: "Thrashing: Causes, Working Set Model & Page Fault Frequency"
description: "What causes memory thrashing, Peter Denning's Working Set model, and how operating systems detect and recover from it."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is thrashing? What causes it, what is Peter Denning's Working Set Model, and how do operating systems detect and prevent thrashing?"

Thrashing is what happens when the OS spends almost all its time swapping pages in and out of RAM, and almost none actually running code. Throughput collapses toward zero even though the CPU looks "busy."

---

### The analogy: a tiny kitchen counter

You're cooking a banquet, but your counter only fits 2 bowls, and the other 8 ingredients are in a pantry down the hall.

You bring out eggs and milk. Now you need flour — counter's full, so you carry the milk back and bring the flour instead. The very next step needs milk again, so you carry the eggs back and fetch milk again. Soon you're spending 98% of your time walking the hallway and 2% of your time actually cooking. That endless hallway sprint is thrashing.

---

### How it spirals out of control

The root cause is a mismatch between the CPU scheduler and the memory manager — they end up working against each other:

<Diagram>
<Row>
<Box label="Too many processes" />
<Arrow />
<Box label="RAM runs out" />
<Arrow />
<Box label="Nonstop page faults" />
<Arrow />
<Box label="CPU sits idle" />
</Row>
</Diagram>

Here's the trap: the scheduler sees low CPU utilization and reads it as "the CPU is underused — load more processes to keep it busy." That decision makes things *worse*, not better — more processes means even less RAM per process, even more faulting, even less real work getting done. It's a feedback loop that feeds on itself until the whole system collapses.

---

### Peter Denning's Working Set Model

Denning's fix is built on **locality of reference** — the fact that programs spend most of their time inside a small, slowly-shifting chunk of their own code and data:

- **Working set window (Δ):** a fixed lookback interval — "the last Δ memory references."
- **Working set `W(t, Δ)`:** the distinct pages a process actually touched during that window. This is its real, current memory demand.
- **Total system demand:** `D = sum of |W_i|` across every running process.

**The condition for thrashing:** if `D > M` (total demand exceeds total physical frames), thrashing is guaranteed.

**The fix:** a medium-term scheduler (the "swapper") keeps an eye on `D`. If it goes over `M`, it picks a victim process and suspends it entirely — flushing all of its resident pages to swap and handing those frames to everyone else. Once demand drops back under `M`, the remaining processes run without constant fault cascades, and the suspended one comes back later when there's room.

---

### A lighter-weight alternative: Page Fault Frequency (PFF)

Computing exact working sets is expensive. In practice, many OSes use a simpler proxy: watch each process's page fault *rate*.

<Diagram>
<Row>
<Box label="Fault rate too high" sub="give it more frames" />
<Box label="Safe zone" sub="leave it alone" />
<Box label="Fault rate too low" sub="reclaim excess frames" />
</Row>
</Diagram>

If a process's fault rate climbs above the upper threshold, it's starving — give it more frames, or suspend it if there's nothing left to give. If its rate drops below the lower threshold, it's holding more memory than it needs — the OS reclaims the excess to help everyone else.

---

### Say this in the interview

*"Thrashing happens when total memory demand exceeds physical RAM, trapping the system in nonstop paging while real CPU work grinds to near zero. Denning's Working Set model says it's guaranteed once total demand D exceeds the available frames M. Operating systems prevent it by suspending a victim process when that happens, or more cheaply, by watching each process's page fault rate and adjusting its frame allocation up or down."*

---

### Code: observing the effect of locality on access patterns

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
