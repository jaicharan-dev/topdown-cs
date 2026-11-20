---
id: 3-page-replacement-fifo-lru-optimal
title: "Page Replacement: FIFO, LRU and Optimal"
description: "Twenty references, three frames, and three different bets about the future: 15 faults, 12 faults, and the 9 that prove what the other two gave away"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the 20-page reference string `[7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]` and a memory allocation of 3 physical page frames, trace each step and compute total page faults for FIFO, LRU, and Optimal (Bélády's MIN) algorithms. Why is Optimal impossible to implement in practice?"

---

### Picture it

A desk with room for three books, and a reading list of twenty.

Every book you need and do not have on the desk costs a trip to the library. That trip is a **page fault**, and it is roughly a hundred thousand times slower than reading a book already in front of you. So the only question that matters is which book you put back when the desk is full and you need a fourth.

**All three algorithms on this page see the same twenty requests and get the same three slots.** Nothing about the hardware differs. The only difference is the rule for choosing the victim, and each rule is a bet about which book you are least likely to want next.

**The first bet is on age.** Put back whichever book you picked up longest ago. This is appealing because it needs no bookkeeping beyond a queue, and it is wrong for a reason you can see immediately: **a book can be old and constantly in use.** A dictionary sits on your desk all afternoon and you open it twenty times. Age tells you how long it has been there, not whether you are still using it.

That is not a hypothetical here. Page 0 is the hottest page in the whole string, referenced six times out of twenty, nearly a third of all accesses. The age-based rule throws it off the desk **three separate times** and fetches it back each time. It does this not because anything about page 0 is unattractive, but because the rule cannot see usage at all.

**The second bet is on recency.** Put back whichever book you have not opened for the longest time. This is a far better proxy, and the reason it works is a real property of programs rather than a lucky guess: code accesses the same addresses again shortly after accessing them, in loops and in stack frames and in whatever array it is currently walking. Recency is the past used as a mirror of the future, and the mirror is honest because the behaviour is genuinely repetitive.

**The third bet is not a bet.** Put back whichever book you will not need for the longest time, read off the actual reading list. You cannot do this, obviously, because you would need the reading list in advance, which is exactly what a program's future accesses are not. It is on the page anyway, and not as a curiosity: **it is a yardstick.** It tells you the lowest number of library trips that any rule could possibly have achieved, so when the age-based rule costs fifteen and the floor is nine, you know precisely how much the cheap bookkeeping cost you.

The useful way to hold the final numbers is to split them. Six of the faults are unavoidable under every rule, because there are six distinct pages and the desk starts empty, so the first touch of each must miss. Everything above six is the price of being small, and that is the part the algorithm controls: three for the yardstick, six for recency, nine for age.

---

### The proper terms

#### The objects

A **page** is a fixed-size block of a process's virtual address space; a **page frame** is a physical slot in RAM that can hold one. The number of frames is the allocation, 3 here, and it is what makes the problem interesting: with 6 frames every page in this string fits and there is nothing to decide.

A **reference string** is the sequence of page numbers a process touches, with consecutive duplicates collapsed, since a second reference to the page you are already on cannot fault.

A **page hit** is a reference to a page already resident. A **page fault** is a reference to one that is not, which traps to the kernel, which must find a frame, possibly evict whatever is in it, fetch the wanted page, update the page table, and restart the faulting instruction.

The **hit ratio** is hits over total references, and the fault rate is its complement. On a 20-reference string these are coarse numbers, but the ratio is the quantity that actually drives effective access time, because a fault costs microseconds to milliseconds against nanoseconds for a hit.

#### The two kinds of fault, and why you should separate them

This decomposition is the single most useful thing to bring to a problem like this, and almost nobody does.

A **compulsory miss**, also called a **cold miss**, is the first ever reference to a page. Memory starts empty, so this fault is unavoidable by any replacement algorithm whatsoever. The string here touches six distinct pages, which are 7, 0, 1, 2, 3 and 4, so **every algorithm pays exactly six compulsory misses** and no cleverness removes them.

A **capacity miss** is a fault on a page that was resident earlier and got evicted. This is the only kind the algorithm influences, and it is the honest basis for comparison.

Splitting the totals turns three similar-looking numbers into a clear ranking of the thing actually being measured, and it also stops you claiming credit or blame for the six faults nobody can avoid.

#### The three rules

**FIFO** evicts the page that has been resident longest, tracked with a simple queue or a rotating slot pointer. It needs no per-reference bookkeeping at all, which is its only virtue. Its flaw is that **residence time is not a measure of usefulness**, so a frequently used page gets evicted purely for having arrived early. FIFO is also the algorithm that can suffer **Bélády's anomaly**, where adding a frame increases the fault count.

**LRU** evicts the page whose most recent reference is furthest in the past. It exploits **temporal locality**, the empirical fact that a recently referenced address is likely to be referenced again soon, which is why the past serves as a usable estimate of the future. LRU belongs to the family of **stack algorithms**, which means the set of pages it holds with `n` frames is always a subset of what it would hold with `n + 1`, and that property is exactly why LRU cannot exhibit Bélády's anomaly.

**Optimal**, also called **MIN** or **Bélády's algorithm**, evicts the page whose next reference is furthest in the future, with a page never referenced again treated as infinitely far. It is provably optimal and therefore unimplementable, and those two facts are the same fact: the proof of optimality is that it has the future, and having the future is what no running system does.

#### Approximating recency in hardware

True LRU requires updating a timestamp or reordering a list on every single memory reference, hundreds of millions per second, which is why no production system implements it exactly. What hardware actually provides is one bit.

A **reference bit** is set by the MMU whenever a page is accessed, and cleared by the kernel when it chooses. It distinguishes "used since I last looked" from "not used since I last looked", which is a one-bit approximation of recency.

The **clock algorithm**, also called **second chance**, sweeps a pointer around the frames like a clock hand. A frame with its reference bit set gets the bit cleared and is skipped, a frame with the bit clear is evicted. It is FIFO plus a reprieve for anything recently used, which captures most of LRU's benefit for a single bit of state. The **aging** variant keeps a shift register per page, shifting the reference bit in periodically, which approximates recency with more resolution at a modest cost.

#### What the fault rate is really for

**Thrashing** is the state where a process faults so often that it spends more time fetching pages than executing, which happens when its allocation is smaller than its **working set**, the set of pages it is actively using in a given window. Replacement policy determines how gracefully you degrade toward that cliff; it cannot prevent it, because the fix for an undersized allocation is more frames or fewer processes.

---

### Work it out

#### The setup

Reference string, 20 references:

`7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1`

Frames: 3, all initially empty.

Before tracing anything, two facts that the trace must agree with.

**Distinct pages touched:** 7, 0, 1, 2, 3, 4, which is six. So every algorithm below pays at least 6 compulsory misses, and the theoretical best case is 6 faults, achievable only if nothing is ever evicted that gets referenced again.

**Reference counts per page:** page 0 appears 6 times, pages 1 and 2 appear 4 times each, page 3 three times, page 7 twice, page 4 once. **Page 0 is nearly a third of all traffic**, which is the number to keep in mind while watching FIFO.

#### Part 1: FIFO

Victim is whichever resident page arrived first, so the slots fill left to right and then overwrite in rotation.

| # | Ref | F0 | F1 | F2 | Result | Evicted |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| 1 | 7 | **7** | . | . | fault, cold | |
| 2 | 0 | 7 | **0** | . | fault, cold | |
| 3 | 1 | 7 | 0 | **1** | fault, cold | |
| 4 | 2 | **2** | 0 | 1 | fault | 7 |
| 5 | 0 | 2 | 0 | 1 | hit | |
| 6 | 3 | 2 | **3** | 1 | fault | **0** |
| 7 | 0 | 2 | 3 | **0** | fault | 1 |
| 8 | 4 | **4** | 3 | 0 | fault, cold | 2 |
| 9 | 2 | 4 | **2** | 0 | fault | 3 |
| 10 | 3 | 4 | 2 | **3** | fault | **0** |
| 11 | 0 | **0** | 2 | 3 | fault | 4 |
| 12 | 3 | 0 | 2 | 3 | hit | |
| 13 | 2 | 0 | 2 | 3 | hit | |
| 14 | 1 | 0 | **1** | 3 | fault | 2 |
| 15 | 2 | 0 | 1 | **2** | fault | 3 |
| 16 | 0 | 0 | 1 | 2 | hit | |
| 17 | 1 | 0 | 1 | 2 | hit | |
| 18 | 7 | **7** | 1 | 2 | fault | **0** |
| 19 | 0 | 7 | **0** | 2 | fault | 1 |
| 20 | 1 | 7 | 0 | **1** | fault | 2 |

**15 faults, 5 hits. Hit ratio 25%.**

Two things to point at.

**Page 0 is evicted at steps 6, 10 and 18**, and re-fetched at 7, 11 and 19 respectively. The hottest page in the string, a third of all references, thrown out three times. Not because anything suggested it was cold, but because FIFO has no way to notice that it is hot. **Residence time is simply the wrong variable.**

**The last three references, 7, 0 and 1, all fault**, and the final frame state is 7, 0, 1, which is exactly where the trace started. FIFO spent twenty references and ended up back at step 3's configuration, having paid for the privilege.

#### Part 2: LRU

Victim is whichever resident page was referenced longest ago. A hit refreshes that page's recency, which is the part FIFO lacks.

| # | Ref | Frames | Result | Evicted | Why that victim |
| :---: | :---: | :---: | :--- | :---: | :--- |
| 1 | 7 | 7 | fault, cold | | |
| 2 | 0 | 7, 0 | fault, cold | | |
| 3 | 1 | 7, 0, 1 | fault, cold | | |
| 4 | 2 | 2, 0, 1 | fault | 7 | 7 last used at step 1 |
| 5 | 0 | 2, 0, 1 | hit | | 0 refreshed |
| 6 | 3 | 2, 0, 3 | fault | 1 | 1 at step 3, older than 0 at 5 and 2 at 4 |
| 7 | 0 | 2, 0, 3 | hit | | 0 refreshed |
| 8 | 4 | 4, 0, 3 | fault, cold | 2 | 2 at step 4, oldest |
| 9 | 2 | 4, 0, 2 | fault | 3 | 3 at step 6 |
| 10 | 3 | 4, 3, 2 | fault | **0** | 0 at step 7, now the oldest |
| 11 | 0 | 0, 3, 2 | fault | 4 | 4 at step 8 |
| 12 | 3 | 0, 3, 2 | hit | | |
| 13 | 2 | 0, 3, 2 | hit | | |
| 14 | 1 | 1, 3, 2 | fault | **0** | 0 at step 11, oldest |
| 15 | 2 | 1, 3, 2 | hit | | |
| 16 | 0 | 1, 0, 2 | fault | 3 | 3 at step 12 |
| 17 | 1 | 1, 0, 2 | hit | | |
| 18 | 7 | 1, 0, 7 | fault | 2 | 2 at step 15 |
| 19 | 0 | 1, 0, 7 | hit | | |
| 20 | 1 | 1, 0, 7 | hit | | |

**12 faults, 8 hits. Hit ratio 40%.**

LRU still evicts page 0 twice, at steps 10 and 14, which is worth being honest about: recency is a better proxy than age, not a perfect one. At step 10, page 0 genuinely was the least recently used of the three resident pages, and it genuinely was needed again one step later. **LRU is wrong here because the string is not perfectly local, not because the policy misread it.**

The win over FIFO is visible in the last three references. LRU hits on 19 and 20 where FIFO faulted on 18, 19 and 20, because LRU still has pages 1 and 0 resident at that point, having kept them for being recently used, while FIFO had rotated them out on age.

#### Part 3: Optimal

Victim is whichever resident page's next reference is furthest ahead. A page not referenced again is infinitely far and goes first.

| # | Ref | Frames | Result | Next use of each resident page | Evicted |
| :---: | :---: | :---: | :--- | :--- | :---: |
| 1 | 7 | 7 | fault, cold | | |
| 2 | 0 | 7, 0 | fault, cold | | |
| 3 | 1 | 7, 0, 1 | fault, cold | | |
| 4 | 2 | 2, 0, 1 | fault | 7 at 18, 0 at 5, 1 at 14 | **7** |
| 5 | 0 | 2, 0, 1 | hit | | |
| 6 | 3 | 2, 0, 3 | fault | 2 at 9, 0 at 7, 1 at 14 | **1** |
| 7 | 0 | 2, 0, 3 | hit | | |
| 8 | 4 | 2, 4, 3 | fault, cold | 2 at 9, 0 at 11, 3 at 10 | **0** |
| 9 | 2 | 2, 4, 3 | hit | | |
| 10 | 3 | 2, 4, 3 | hit | | |
| 11 | 0 | 2, 0, 3 | fault | 2 at 13, 4 never, 3 at 12 | **4** |
| 12 | 3 | 2, 0, 3 | hit | | |
| 13 | 2 | 2, 0, 3 | hit | | |
| 14 | 1 | 2, 0, 1 | fault | 2 at 15, 0 at 16, 3 never | **3** |
| 15 | 2 | 2, 0, 1 | hit | | |
| 16 | 0 | 2, 0, 1 | hit | | |
| 17 | 1 | 2, 0, 1 | hit | | |
| 18 | 7 | 7, 0, 1 | fault | 2 never, 0 at 19, 1 at 20 | **2** |
| 19 | 0 | 7, 0, 1 | hit | | |
| 20 | 1 | 7, 0, 1 | hit | | |

**9 faults, 11 hits. Hit ratio 55%.**

Watch step 8, which is the step that shows what foresight actually buys. Optimal evicts page 0, the hottest page in the string, and it is right to: pages 2 and 3 are needed at steps 9 and 10, page 0 not until step 11. **Optimal evicts the hot page precisely because hotness is not the criterion; distance to next use is.** Then from step 9 to step 10 it gets two consecutive hits, which is the payoff, and it pays the one fault for page 0 at step 11 on its own terms rather than being forced into it.

Note also that steps 11, 14 and 18 all evict a page that is **never referenced again** (4, 3 and 2 respectively, within the remaining string), which costs nothing at all. That is the cleanest expression of what the other two algorithms cannot do: they have no way to distinguish a page that is finished with from one that is about to be needed.

#### The comparison

| Algorithm | Faults | Hits | Hit ratio | Compulsory | Capacity | Needs |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Optimal (MIN)** | **9** | 11 | **55%** | 6 | **3** | the future |
| **LRU** | 12 | 8 | 40% | 6 | 6 | timestamp per reference |
| **FIFO** | 15 | 5 | 25% | 6 | **9** | a queue |

The compulsory column is identical by construction: six distinct pages, cold start, nobody avoids those. So the real comparison is the capacity column, and there the spread is threefold rather than the 15 against 9 that the totals suggest. **FIFO pays three times as many avoidable faults as the theoretical floor; LRU pays twice.**

LRU closes just over half the gap between FIFO and Optimal, which is a fair summary of what temporal locality is worth on a short, imperfectly local string. On real workloads it does better than that, because real reference patterns are far more local than a twenty-element teaching string.

#### Why Optimal is impossible, and LRU nearly so

**Optimal needs the reference string in advance.** Not an approximation of it, the actual sequence of future page references, and a program's future accesses depend on input it has not read, branches it has not taken and interrupts that have not arrived. This is not a gap waiting for better engineering; the information does not exist at decision time. What Optimal is for is **offline analysis**: run a trace through it afterwards and you have the lower bound against which to judge the policy you actually shipped.

**LRU is implementable in principle and not in practice, for a reason worth being precise about.** Exact LRU must update recency information **on every memory reference**, which is every load and store the CPU issues, hundreds of millions per second. Doing that means either a counter written to memory per access, which multiplies memory traffic, or a list reordered per access, which no hardware does at that rate. The cost is not in choosing the victim, it is in maintaining the ordering.

So real kernels approximate recency with the one bit the hardware does give them, the **reference bit**. The **clock algorithm** sweeps a hand around the frames, clearing the bit on any page that has it set and skipping that page, evicting the first page it finds with the bit already clear. The effect is FIFO with a reprieve for anything touched since the last sweep, which recovers most of LRU's benefit for a single bit per frame and no per-reference work. The **aging** refinement shifts the reference bit into a small per-page register each tick, giving a coarse recency ordering rather than a yes or no.

Linux's page reclaim is a developed version of the same idea, keeping active and inactive lists and promoting pages between them based on reference bits observed during scanning, rather than attempting to order every page by exact last-use time.

#### Verify it

```python
"""
Page replacement: FIFO, LRU and Optimal on one reference string.
Prints the full trace, the fault count, and the compulsory and capacity split.
"""

REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
FRAMES = 3


def fifo(ref, n):
    """Evict the page resident longest. Slots overwrite in rotation."""
    slots, order, trace = [None] * n, [], []
    for i, p in enumerate(ref):
        if p in slots:
            trace.append((i, p, "hit", list(slots), None))
            continue
        victim = None
        if None in slots:
            slots[slots.index(None)] = p
        else:
            victim = order.pop(0)
            slots[slots.index(victim)] = p
        order.append(p)
        trace.append((i, p, "fault", list(slots), victim))
    return trace


def lru(ref, n):
    """Evict the page whose last reference is furthest in the past."""
    slots, recency, trace = [None] * n, [], []
    for i, p in enumerate(ref):
        if p in slots:
            recency.remove(p)
            recency.append(p)
            trace.append((i, p, "hit", list(slots), None))
            continue
        victim = None
        if None in slots:
            slots[slots.index(None)] = p
        else:
            victim = recency.pop(0)
            slots[slots.index(victim)] = p
        recency.append(p)
        trace.append((i, p, "fault", list(slots), victim))
    return trace


def optimal(ref, n):
    """Evict the page whose next reference is furthest ahead."""
    slots, trace = [None] * n, []
    for i, p in enumerate(ref):
        if p in slots:
            trace.append((i, p, "hit", list(slots), None))
            continue
        victim = None
        if None in slots:
            slots[slots.index(None)] = p
        else:
            def next_use(q):
                rest = ref[i + 1:]
                return rest.index(q) if q in rest else float("inf")
            victim = max([s for s in slots], key=next_use)
            slots[slots.index(victim)] = p
        trace.append((i, p, "fault", list(slots), victim))
    return trace


def summarise(name, trace, ref):
    faults = [t for t in trace if t[2] == "fault"]
    seen, compulsory = set(), 0
    for _, p, status, _, _ in trace:
        if status == "fault" and p not in seen:
            compulsory += 1
        seen.add(p)
    print(f"\n== {name}")
    for i, p, status, slots, victim in trace:
        shown = " ".join("." if s is None else str(s) for s in slots)
        ev = f"  evict {victim}" if victim is not None else ""
        print(f"  {i+1:>2}  ref {p}  [{shown}]  {status}{ev}")
    print(f"  faults {len(faults)}   hits {len(ref) - len(faults)}   "
          f"hit ratio {100 * (len(ref) - len(faults)) / len(ref):.0f}%")
    print(f"  compulsory {compulsory}   capacity {len(faults) - compulsory}")


if __name__ == "__main__":
    distinct = sorted(set(REF))
    print(f"references {len(REF)}   frames {FRAMES}")
    print(f"distinct pages {distinct} -> {len(distinct)} compulsory misses "
          f"are unavoidable for every algorithm")
    print("reference counts:",
          {p: REF.count(p) for p in sorted(set(REF), key=REF.count, reverse=True)})

    for name, fn in (("FIFO", fifo), ("LRU", lru), ("Optimal (MIN)", optimal)):
        summarise(name, fn(REF, FRAMES), REF)

    print("\nSanity check: no algorithm can beat Optimal.")
    opt_faults = sum(1 for t in optimal(REF, FRAMES) if t[2] == "fault")
    for name, fn in (("FIFO", fifo), ("LRU", lru)):
        f = sum(1 for t in fn(REF, FRAMES) if t[2] == "fault")
        print(f"  {name:<6} {f} faults, {f - opt_faults} more than Optimal")
```

---

### What they ask next

**"Why is Optimal impossible to implement?"**
Because it needs the future reference string, and a program's future accesses depend on input it has not read, branches it has not taken and interrupts that have not arrived. The information does not exist at the moment the decision has to be made, so this is not an engineering gap. Its purpose is **offline analysis**: feed a recorded trace through it and you get the lower bound your real policy is measured against. Here that bound is 9 faults, which tells you FIFO's 15 gave away 6 avoidable faults and LRU's 12 gave away 3.

**"Why can't a real kernel implement exact LRU either?"**
Because maintaining the ordering, not choosing the victim, is the expensive part. Exact LRU needs recency updated **on every load and store**, hundreds of millions per second, which means either a memory write per access or a list reordered per access, and no hardware does either at that rate. So kernels use the one bit hardware does give them, the **reference bit**, and approximate with the **clock algorithm**, which sweeps a hand round the frames clearing set bits and evicting the first page whose bit is already clear. That is FIFO with a reprieve for anything recently touched, and it recovers most of the benefit for one bit of state.

**"Split the faults into compulsory and capacity."**
Six distinct pages are touched and memory starts empty, so all three algorithms pay exactly **6 compulsory misses** and no policy avoids them. Above that: Optimal 3 capacity misses, LRU 6, FIFO 9. That is a threefold spread on the only part the algorithm controls, which is a much more honest comparison than 15 against 9.

**"Why does FIFO do so badly here specifically?"**
Because page 0 is referenced 6 times out of 20, nearly a third of all traffic, and FIFO evicts it at steps 6, 10 and 18. It does that not because anything indicated page 0 was cold but because **residence time is not a measure of usefulness** and FIFO has no mechanism to notice a page is hot. The tell is the end of the trace: the last three references all fault and leave frames holding 7, 0 and 1, exactly the configuration from step 3.

**"LRU also evicts page 0 twice. Does that not undermine the argument?"**
No, it sharpens it. At step 10, page 0 genuinely was the least recently used resident page, and it genuinely was needed one step later. **LRU was not wrong about recency, the string was not perfectly local.** Recency is a better proxy than age rather than a perfect one, which is why LRU closes just over half the FIFO-to-Optimal gap rather than all of it. On real workloads it does better, because real access patterns are far more local than a teaching string.

**"Does any of these suffer Bélády's anomaly?"**
FIFO can; LRU and Optimal cannot. The reason is the **stack algorithm** property: the set of pages LRU holds with `n` frames is always a subset of what it holds with `n + 1`, so a hit with `n` frames is necessarily a hit with more, and faults can only fall as you add frames. FIFO's resident set is not nested that way, because its victim choice depends on arrival order rather than on access order, so a larger allocation can produce a different and worse eviction sequence.

**"What happens with more frames?"**
At 6 frames every distinct page in this string fits simultaneously, so all three algorithms converge on 6 faults, the compulsory minimum, and the replacement policy stops mattering entirely. That is the useful general point: **a replacement policy only matters while the allocation is smaller than the working set.** Above that it is irrelevant, and far below it you get thrashing regardless of policy.

**"What is the connection to thrashing?"**
**Thrashing** is faulting so often that the process spends more time fetching pages than executing, and it happens when the allocation is smaller than the **working set**, the pages actively in use over a recent window. The replacement policy determines how gracefully you degrade toward that point, not whether you reach it. The fixes are more frames, fewer concurrent processes, or a program with better locality, which is why this problem is usually paired with a working-set or effective-access-time question.

**"Which do you actually use, and why not the one with the best numbers?"**
The clock algorithm or a developed variant of it, as Linux does with active and inactive lists promoted on reference bits observed during scanning. You do not use Optimal because the information does not exist, and you do not use exact LRU because the per-reference bookkeeping costs more than the faults it saves. **The policy that wins in production is the one with the best ratio of faults avoided to overhead paid**, and that is rarely the one with the best fault count on paper.

**The common wrong answer** is quoting LRU as the production algorithm because it has good numbers and does not need the future. It needs a recency update on every memory reference, which is the part that makes it impractical, and the real answer is clock or second-chance. The other frequent errors are counting hits and faults without separating the six compulsory misses, which makes FIFO look only 1.7 times worse than Optimal rather than 3 times worse on the part that matters, and claiming Optimal is merely hard to implement rather than impossible in principle.

---

### Say this in the interview

*"Before tracing, two facts the answer has to agree with. The string touches six distinct pages, 7, 0, 1, 2, 3 and 4, and memory starts empty, so every algorithm pays exactly six compulsory misses, also called cold misses, and no policy avoids them. And page 0 is referenced six times out of twenty, nearly a third of all traffic, which is the number to watch. All three algorithms see the same references and get the same three page frames, so the only difference is the rule for choosing a victim, and each rule is a bet about the future. And the asymmetry that makes the whole thing matter is that a page hit costs nanoseconds while a page fault costs microseconds at best.*

*FIFO evicts whichever page has been resident longest. Tracing it gives fifteen page faults and five hits, a twenty five percent hit ratio. The thing to point at is that page 0, the hottest page in the string, is evicted at steps six, ten and eighteen and fetched back each time. FIFO does that not because anything suggested page 0 was cold but because residence time is not a measure of usefulness, and FIFO has no mechanism to notice that a page is hot. The tell is the end of the trace: the last three references all fault and leave the frames holding 7, 0 and 1, which is exactly the configuration it had at step three. Twenty references to get back where it started.*

*LRU evicts the page whose last reference is furthest in the past, and a hit refreshes recency, which is the machinery FIFO lacks. Twelve faults, eight hits, forty percent. It works because of temporal locality, a real property of programs rather than a lucky guess: loops and stack frames and array walks mean a recently touched address is likely to be touched again soon, so the past is an honest mirror of the future. I would be straight about the fact that LRU still evicts page 0 twice, at steps ten and fourteen. At step ten page 0 genuinely was the least recently used resident page and genuinely was needed one step later, so LRU was not wrong about recency, the string just is not perfectly local.*

*Optimal, also called MIN or Bélády's algorithm, evicts the page whose next reference is furthest ahead, with a page never referenced again treated as infinitely far. Nine faults, eleven hits, fifty five percent. The instructive step is eight, where it evicts page 0, the hottest page, and is right to, because pages 2 and 3 are wanted at steps nine and ten and page 0 not until eleven. Hotness is not the criterion; distance to next use is. And at steps eleven, fourteen and eighteen it evicts pages that are never referenced again, which costs nothing at all, and that is the thing the other two cannot do: they have no way to distinguish a page that is finished with from one that is about to be needed.*

*Now the comparison, and I would not leave it at fifteen, twelve, nine. All three pay the same six compulsory misses, so the honest column is capacity misses: Optimal three, LRU six, FIFO nine. That is a threefold spread on the only part the algorithm controls, rather than the one point seven times the totals suggest, and it says LRU closes just over half the gap to the floor.*

*As to why Optimal is impossible, it is not hard, it is impossible in principle. It needs the actual future reference string, and a program's future accesses depend on input it has not read, branches it has not taken and interrupts that have not arrived, so the information does not exist when the decision has to be made. What it is for is offline analysis: run a recorded trace through it and you have the lower bound to judge the policy you actually shipped against.*

*And I would add that exact LRU is also impractical, which people skip. The expensive part is not choosing the victim, it is maintaining the ordering, because recency has to be updated on every load and store, hundreds of millions per second, which means either a memory write or a list reorder per access and no hardware does that. So kernels approximate with the one bit the hardware gives them, the reference bit, via the clock algorithm, also called second chance: a hand sweeps the frames, clears the bit on any page that has it set and skips it, and evicts the first page whose bit is already clear. That is FIFO with a reprieve for anything recently touched, and it recovers most of LRU's benefit for a single bit per frame with no per-reference work. The aging variant shifts the reference bit into a small register each tick for finer resolution, and Linux's reclaim is a developed version with active and inactive lists.*

*Two closing points if there is room. FIFO is the one of the three that can show Bélády's anomaly, where adding a frame increases faults, and LRU and Optimal cannot, because they are stack algorithms: the pages held with n frames are always a subset of those held with n plus one, so a hit with fewer frames is necessarily a hit with more. And at six frames every page in this string fits at once, all three converge on six faults, and the policy stops mattering, which is the general shape of it: a replacement policy only matters while the allocation is smaller than the working set. Far below that you get thrashing whatever the policy, and the fix there is more frames or fewer processes rather than a cleverer rule."*
