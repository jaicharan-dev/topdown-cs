---
id: 11-page-replacement-algorithms-belady-anomaly
title: "Page Replacement Algorithms: FIFO, LRU, Optimal & Belady's Anomaly"
description: "Choosing what to evict, and the algorithm that gets worse when you give it more memory"

sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the common page replacement algorithms (FIFO, LRU, Optimal)? What is Belady's Anomaly, how does the Clock algorithm approximate LRU in real kernels, and which algorithms are immune to the anomaly?"

---

### Picture it

Your desk holds three books and the library has many more. Every time you need a book that is not on the desk, you fetch it and must put one back.

**By arrival order:** return whichever has been on the desk longest. Simple, and it ignores whether you are still using it. The book you fetched first may be the one you consult constantly.

**By last use:** return whichever you have not opened for the longest time. This works well, because what you used recently you will probably use again. The cost is that you must track every single access, and you consult books constantly.

**By the future:** return whichever you will not need for the longest time. Unbeatable, and impossible, because you do not know what you will need. It is still worth computing afterwards to judge how well the others did.

Then the strange part. You would expect a bigger desk to always mean fewer trips to the library. For the arrival-order rule, that is not guaranteed. There are sequences where a four-book desk causes **more** trips than a three-book desk, which sounds impossible until you see it happen.

---

### The proper terms

#### The three algorithms

**FIFO** evicts the page that has been resident longest, tracked with a simple queue. It is cheap and performs poorly, because age of arrival says nothing about future use.

**LRU**, **Least Recently Used**, evicts the page unused for the longest time. It performs well because it exploits **temporal locality**, the tendency of recently used pages to be used again. True LRU is expensive: it needs a timestamp or a list update on **every memory reference**, which is too costly in hardware.

**Optimal**, also called **OPT** or Bélády's algorithm, evicts the page that will not be used for the longest time in the future. It is provably optimal and **unimplementable**, since it requires knowledge of future references. It is used as a benchmark in simulation.

#### Belady's Anomaly

**Belady's Anomaly** is the phenomenon where increasing the number of frames increases the number of page faults, discovered by László Bélády in 1969.

It is counterintuitive and real. The canonical sequence is **1 2 3 4 1 2 5 1 2 3 4 5** under FIFO: with 3 frames it causes 9 faults, and with 4 frames it causes 10.

The reason is that FIFO's eviction choice is unrelated to usage, so a larger memory can retain a different, worse set of pages. There is no guarantee that what a smaller memory held is a subset of what a larger one holds.

#### Stack algorithms and immunity

An algorithm is a **stack algorithm** if it satisfies the **inclusion property**: the set of pages in memory with **n** frames is always a **subset** of the set with n + 1 frames, for any reference string.

Stack algorithms are **provably immune** to Belady's Anomaly. If the larger memory always contains everything the smaller one has, it can never fault where the smaller one hit.

LRU and OPT are stack algorithms, because both rank pages by a criterion independent of memory size: recency of past use, and distance to next use. The top n of that ranking is always inside the top n + 1.

**FIFO is not**, because its ranking depends on load order, which itself changes with the number of frames.

So the complete answer is: LRU and Optimal are immune, FIFO is not, and the reason is the inclusion property.

#### The Clock algorithm

Real kernels want LRU's behaviour without its cost, so they approximate it. **Clock**, also called **second-chance**, is the standard approximation.

Each page has a **reference bit** that the hardware sets to 1 on any access. The pages are arranged in a **circular list** with a **hand** pointing at a candidate.

To evict: look at the page under the hand. If its reference bit is **0**, evict it. If it is **1**, clear the bit to 0, giving the page a second chance, and advance the hand. Repeat.

The effect is that recently accessed pages survive a pass while untouched ones are evicted, which approximates LRU using one bit per page and no work on each reference. The hardware does the recording for free.

**Enhanced second-chance** also considers the **dirty bit**, preferring to evict clean pages because a dirty one must be written to disk first, making it more expensive. It uses the pair of bits to rank candidates.

Linux uses a refinement of this, maintaining active and inactive LRU lists rather than one clock.

---

### In code

```text
Belady's Anomaly: reference string 1 2 3 4 1 2 5 1 2 3 4 5 under FIFO

Three frames:
  ref:   1   2   3   4   1   2   5   1   2   3   4   5
         F   F   F   F   F   F   F   .   .   F   F   .
  frames after each step (oldest first):
         1 | 12 | 123 | 234 | 341 | 412 | 125 | 125 | 125 | 251 | 513 | 513
  faults: 9

Four frames:
  ref:   1   2   3   4   1   2   5   1   2   3   4   5
         F   F   F   F   .   .   F   F   F   F   F   F
  faults: 10        <-- more memory, MORE faults
```

```text
Same string under LRU, which is a stack algorithm:

  three frames -> 10 faults
  four  frames ->  8 faults     never worse with more memory
```

```text
Clock algorithm, one revolution:

        [A,1]                      hand at A: ref=1, clear to 0, advance
       /     \                     hand at B: ref=0, EVICT B
   [D,0]     [B,0]                 load the new page at B with ref=1
       \     /
        [C,1]

  Cost per reference: nothing. Hardware sets the reference bit.
  Cost per eviction: at most one full revolution.
```

---

### What they ask next

**"Why not implement true LRU in hardware?"**
It would require updating a timestamp or reordering a list on every memory access, which is far too expensive at memory speed. A counter per page would also need to be scanned at eviction time. The reference bit gives most of the benefit for one bit of state.

**"Which algorithms are immune to Belady's Anomaly, and why?"**
LRU and Optimal, because both are stack algorithms satisfying the inclusion property: the pages held with n frames are always a subset of those held with n + 1. FIFO is not, because its ordering depends on load order, which changes with frame count.

**"Is Belady's Anomaly a practical concern?"**
Not really, because almost nothing uses pure FIFO. It matters as proof that intuitions about caching can be wrong, and because it motivates the inclusion property.

**"What is the dirty bit used for in replacement?"**
A dirty page must be written back before its frame is reused, so evicting it costs a disk write. Enhanced second-chance prefers clean victims, and kernels also write dirty pages out in the background to keep clean candidates available.

**"How does Linux actually do it?"**
It keeps active and inactive lists per memory zone, promoting pages that are referenced twice and reclaiming from the inactive list, which approximates LRU while avoiding per-access bookkeeping. It also separates file-backed from anonymous pages.

**The common wrong answer** is "more memory always means fewer faults". That is only guaranteed for stack algorithms, and the FIFO counterexample above is the reason the question is asked.

---

### Say this in the interview

*"FIFO evicts the longest-resident page, which is cheap but ignores usage. LRU, Least Recently Used, evicts the page unused for longest and performs well because it exploits temporal locality, but true LRU needs bookkeeping on every memory reference, which is too expensive. Optimal evicts the page not needed for the longest time in future; it is provably best and unimplementable, so it is used as a benchmark.*

*Belady's Anomaly is that adding frames can increase the number of page faults. With the string 1 2 3 4 1 2 5 1 2 3 4 5, FIFO takes 9 faults with three frames and 10 with four. It happens because FIFO's eviction order is unrelated to usage, so a larger memory can retain a worse set.*

*An algorithm is a stack algorithm if it satisfies the inclusion property: the pages resident with n frames are always a subset of those with n plus one. Stack algorithms are provably immune to the anomaly, and LRU and Optimal are stack algorithms because they rank pages by a criterion independent of memory size. FIFO is not.*

*Kernels approximate LRU with the Clock or second-chance algorithm. Each page has a reference bit set by hardware on access. A hand sweeps a circular list: if the bit is 0 the page is evicted, and if it is 1 the bit is cleared and the hand moves on, giving that page a second chance. That approximates LRU with one bit per page and no cost per reference. Enhanced second-chance also weighs the dirty bit, preferring clean victims because dirty ones must be written out first."*
