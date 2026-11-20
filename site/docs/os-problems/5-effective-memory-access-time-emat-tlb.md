---
id: 5-effective-memory-access-time-emat-tlb
title: "Effective Memory Access Time: TLB Hit Ratios and Page Table Depth"
description: "Why a 99% TLB hit ratio makes four-level paging possible and an 80% one makes it painful, and why a 0.1% fault rate dwarfs both"

sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A system uses virtual memory with paging and a Translation Lookaside Buffer (TLB). TLB access latency is 20 ns and main memory access latency is 100 ns. Calculate the Effective Memory Access Time (EMAT) for an 80% TLB hit ratio, a 95% TLB hit ratio, and for a 2-level page table system at an 80% hit ratio. How does page fault probability change this equation?"

---

### Picture it

A warehouse where nothing is stored at the address written on the request slip.

You get a slip asking for the contents of box 4,721. Box 4,721 is not a physical location; it is a label. To find where that box actually sits you must consult the index, and **the index is itself stored in the warehouse**. So the obvious way to serve a slip is two trips: one to fetch the index entry, one to fetch the box. Two hundred nanoseconds where the box alone would have cost a hundred.

That is not a tax you can engineer away, because the indirection is the point. It is what lets every process believe it owns box 4,721, lets the warehouse move boxes without telling anyone, and lets a box be absent entirely without the requester knowing.

**The TLB is a sticky note on the counter with the last sixty-four lookups on it.** When the slip asks for a box you have looked up recently, you read the note and make one trip. When it does not, you make the index trip and then the box trip, and you write the result on the note. That is the whole mechanism, and the first thing worth noticing is what it means: **the TLB does not make memory faster. It removes a lookup.**

Now the part that makes this problem interesting rather than arithmetic.

**The index is not one book. It is a chain of books.** A modern address space is enormous and mostly empty, so a single flat index would waste gigabytes describing boxes nobody owns. The fix is to split it: a slim directory that tells you which sub-index to read, which tells you where the box is. Four such levels on x86-64, five on the newest parts.

Watch what that does to the two outcomes. **A hit still costs one trip, no matter how deep the chain.** A miss costs one trip per level plus the box, so **the penalty for missing grows with depth while the reward for hitting stays flat.** At four levels a miss costs five trips. The consequence is the sentence that this whole page exists to support: as page tables got deeper, the TLB stopped being an optimisation and became a precondition. At a 99% hit ratio it barely matters whether your index is one book or five, because the figures land within four nanoseconds of each other. At 80% they spread from 140 to 220. **Deep paging is not viable on its own merits; it is viable because the sticky note almost always works.**

And then there is the case where the box is not in the warehouse at all, which is where the arithmetic stops being about nanoseconds. Someone has to drive to the off-site depot. Whatever you did to the index lookups is now a rounding error, and the only number that matters is how often that happens.

---

### The proper terms

#### The components

A **page table** maps virtual page numbers to physical frame numbers, and it lives in main memory, which is the source of the whole problem: translating an address requires reading memory, and reading memory is what you were trying to do.

A **page table walk** is the sequence of memory reads needed to resolve one virtual address through the page table hierarchy. With `k` levels it is `k` reads, after which one more read fetches the data, so **a walk costs `k + 1` memory accesses in total.**

The **translation lookaside buffer**, or **TLB**, is a small fully or highly associative cache of recent translations, typically tens to a couple of thousand entries, sitting in the MMU. On a hit it supplies the frame number directly and the walk is skipped entirely.

The **TLB hit ratio**, written `h`, is the fraction of translations served from the TLB. Its complement `1 - h` is the miss ratio, and because the miss path is several times more expensive than the hit path, the whole result is far more sensitive to `h` than it looks.

**Effective memory access time**, or **EMAT**, is the probability-weighted mean cost of one memory access: the hit cost times the hit probability plus the miss cost times the miss probability. It is an average, not a latency any individual access experiences.

#### The model, which you must state before computing

This is the single most important thing to say out loud on this problem, because two models are in circulation and they give different answers.

**The serial model**, which this question's numbers imply, charges the TLB lookup on every access, hit or miss:

- hit cost = `t_TLB + t_mem`
- miss cost = `t_TLB + (k + 1) * t_mem`

**The overlapped model** assumes the TLB lookup happens in parallel with the start of the memory access, so on a hit the TLB time is hidden and the cost is just `t_mem`.

The question gives an explicit TLB access latency of 20 ns, which signals that it wants that 20 ns charged, so the serial model is intended. **Real CPUs use the overlapped model**, probing the TLB concurrently with the L1 cache index, which is why a TLB hit on real hardware costs effectively nothing. Stating which model you are using and why takes ten seconds and is the difference between an answer that looks arbitrary and one that looks deliberate.

#### The quantities that control the hit ratio

**Locality** is why the TLB works at all. A 4 KB page covers 4,096 bytes, so sequential access touches one translation per thousand or so accesses, and tight loops touch the same handful of pages repeatedly.

**TLB reach** is the amount of memory the TLB can cover at once: entries multiplied by page size. Sixty-four entries at 4 KB reaches 256 KB, which a modern working set exceeds trivially, and this is the real reason hit ratios fall.

**Huge pages** are the lever that follows directly from that. Switching to 2 MB pages multiplies reach by 512 with the same number of entries, taking 64 entries from 256 KB of coverage to 128 MB. For a database buffer pool or a large heap this is often the single most effective change available, which is why it appears in production tuning guides and not just in textbooks.

#### The second kind of miss

A **page fault** is different in kind from a TLB miss, and conflating them is the commonest confusion on this topic. A TLB miss means **the translation is not cached**, and the page table walk resolves it in nanoseconds. A page fault means **the page is not in physical memory at all**, the walk found an invalid entry, and the kernel must obtain the page from somewhere.

A **minor page fault** is resolved without storage I/O: the page is already in the page cache, or it is a copy-on-write fault, or a fresh anonymous page that just needs zeroing. Cost is microseconds, dominated by the trap and the kernel bookkeeping.

A **major page fault** requires reading from storage. This is the expensive one, and the number you assume for it decides the entire character of the answer.

**Page fault service time**, `t_fault`, is the full cost of a major fault: trap, kernel entry, possibly evicting a victim page and writing it back, issuing the I/O, blocking the process, the device latency, the interrupt, and restarting the faulting instruction.

---

### Work it out

#### Given

- TLB access time, `t_TLB` = 20 ns
- Main memory access time, `t_mem` = 100 ns
- Serial model, as the stated TLB latency implies

The baseline to hold onto: **with no TLB and a single-level page table, every access costs 200 ns**, one read for the page table entry and one for the data. Anything the TLB achieves is measured against that, not against 100 ns.

#### Part 1: single-level page table, h = 0.80

**Hit path.** Check the TLB, get the frame, fetch the data.

`cost_hit = 20 + 100 = 120 ns`

**Miss path.** Check the TLB and fail, read the page table entry from memory, fetch the data.

`cost_miss = 20 + 100 + 100 = 220 ns`

**Weighted mean.**

$$\text{EMAT} = h \cdot \text{cost}_{\text{hit}} + (1-h) \cdot \text{cost}_{\text{miss}}$$

`EMAT = 0.80 * 120 + 0.20 * 220 = 96 + 44 = ` **140 ns**

Against the 200 ns no-TLB baseline that is a 30% saving, and against the 100 ns raw memory latency it is a 40% overhead. Both comparisons are worth having ready, because interviewers ask for the saving and candidates often quote it against the wrong baseline.

#### Part 2: single-level page table, h = 0.95

The costs do not change, only the weights.

`EMAT = 0.95 * 120 + 0.05 * 220 = 114 + 11 = ` **125 ns**

**The sensitivity is the point here.** Raising `h` from 0.80 to 0.95 is a 15 percentage point improvement and it buys 15 ns, a 10.7% reduction. That ratio is not a coincidence, and the simplified formula below shows exactly why: with one level, each percentage point of hit ratio is worth precisely 1 ns, because it moves one percent of accesses off a path that costs 100 ns more.

#### Part 3: two-level page table, h = 0.80

The hit path is unchanged, which is the structural fact that matters: **a TLB hit skips the entire walk regardless of its depth.**

`cost_hit = 20 + 100 = 120 ns`

The miss path now needs the outer directory, the inner table, and then the data: three memory accesses.

`cost_miss = 20 + 3 * 100 = 320 ns`

`EMAT = 0.80 * 120 + 0.20 * 320 = 96 + 64 = ` **160 ns**

So the same hit ratio costs 20 ns more per access purely because the table got one level deeper. Note also that the no-TLB baseline has moved to 300 ns, so the TLB is now saving 47% rather than 30%: **the deeper the table, the more the TLB is worth, and the more it hurts when it misses.**

#### Part 4: the general formula, and the result worth remembering

For `k` levels under the serial model:

$$\text{EMAT} = h \cdot (t_{\text{TLB}} + t_{\text{mem}}) + (1-h) \cdot \big[ t_{\text{TLB}} + (k+1) \cdot t_{\text{mem}} \big]$$

Expand and collect. The `t_TLB` term is charged on both paths, so it survives with weight 1. The data access is charged on both paths too. What is left is the walk, charged only on a miss:

$$\text{EMAT} = t_{\text{TLB}} + t_{\text{mem}} + (1-h) \cdot k \cdot t_{\text{mem}}$$

This is the form to carry into an interview, because it reads as a sentence: **you always pay for the TLB lookup and the data, and you additionally pay for the walk in proportion to how often you miss.** It also makes the sensitivity obvious: the derivative with respect to `h` is `-k * t_mem`, so each percentage point of hit ratio is worth `k` nanoseconds here. One level, 1 ns per point. Four levels, 4 ns per point.

| Configuration | `k` | cost_hit | cost_miss | h = 0.80 | h = 0.95 | h = 0.99 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Single-level | 1 | 120 ns | 220 ns | 140 ns | 125 ns | 121 ns |
| Two-level, as in x86-32 | 2 | 120 ns | 320 ns | 160 ns | 130 ns | 122 ns |
| Four-level, x86-64 | 4 | 120 ns | 520 ns | 200 ns | 140 ns | 124 ns |
| Five-level, x86-64 LA57 | 5 | 120 ns | 620 ns | 220 ns | 145 ns | 125 ns |

**Read that table down the columns, not across the rows.** At a 99% hit ratio the four configurations span 121 to 125 ns, a spread of 4 ns, and the depth of your page table is close to irrelevant. At an 80% hit ratio they span 140 to 220 ns, a spread of 80 ns, and depth dominates everything.

That is the real answer to why the question bothers with multi-level tables. Hierarchical paging exists because a flat table for a 64-bit address space is impossible, and it is **affordable only in the presence of a high TLB hit ratio.** On a four-level machine an uncached walk costs 520 ns, so hit rates in the high nineties are not a nice-to-have; they are what makes the architecture work. Hardware answers accordingly, with page-walk caches that hold upper-level entries, with the ordinary data caches absorbing page table reads so that `(k+1) * t_mem` is a worst case rather than a typical one, and with huge pages to stretch TLB reach.

#### Part 5: what happens when the page is not in memory

Everything above assumes the walk ends in a valid entry. If it does not, the hardware raises a fault and the kernel has to fetch the page. Let `p` be the probability that an access faults, and `t_fault` the service time:

$$\text{EMAT}_{\text{total}} = (1-p) \cdot \text{EMAT}_{\text{RAM}} + p \cdot t_{\text{fault}}$$

Take the single-level 80% case, `EMAT_RAM = 140 ns`, and a classic spinning-disk service time of 8 ms, which is 8,000,000 ns, at a fault rate of 0.1%:

`EMAT_total = 0.999 * 140 + 0.001 * 8,000,000 = 139.86 + 8,000 = ` **8,139.86 ns**

**A fault rate of one in a thousand makes memory 58 times slower.** Every nanosecond of TLB tuning on this page is now invisible: the 20 ns difference between a one-level and a two-level table is 0.25% of the total. That is the proportion lesson, and it is why the honest ranking of memory performance work puts fault rate first and translation second.

How small does `p` have to be before faults stop dominating? Solve for a 10% degradation, `EMAT_total <= 154 ns`:

```
(1 - p) * 140 + p * 8,000,000  <=  154
140 + p * 7,999,860            <=  154
p                              <=  14 / 7,999,860  =  1.75e-6
```

**About one access in 571,000 may fault**, or 0.000175%. Stated that way the constraint is startling, and it is the right way to state it, because "keep the fault rate low" sounds like advice while "fewer than one in half a million" sounds like a design requirement.

#### Part 6: the 58x figure is a 1990s number, and you should say so

The 8 ms service time above is a disk seek. Recompute the same 0.1% fault rate against real storage:

| Backing store | `t_fault` | EMAT_total at p = 0.001 | Slowdown |
| :--- | :---: | :---: | :---: |
| Spinning disk, 8 ms seek | 8,000,000 ns | 8,139.86 ns | **58.1x** |
| NVMe SSD, about 100 us | 100,000 ns | 239.86 ns | **1.7x** |
| Minor fault, page cache or zeroing, about 2 us | 2,000 ns | 141.86 ns | 1.01x |

The lesson does not reverse, but its magnitude changes by a factor of thirty, and a candidate who notices this is visibly thinking about the machine rather than reciting the textbook. **The page fault penalty is a property of the backing store, not of paging.**

The other correction worth making: a **minor** fault does not touch storage at all. It is served from the page cache, or by zeroing a fresh anonymous page, or by copying a page on write, and it costs microseconds. Pairing the phrase "minor fault" with an 8 ms service time, as many worked solutions do, is a category error. If a question gives you a 0.1% fault rate and a millisecond service time, it is describing **major** faults, and saying so demonstrates you know there are two kinds.

#### Verify it

```python
"""
Effective memory access time across TLB hit ratios, page table depths,
and page fault rates, under the serial TLB model.
"""

T_TLB = 20.0     # ns
T_MEM = 100.0    # ns


def emat_ram(h, levels=1, t_tlb=T_TLB, t_mem=T_MEM):
    """Serial model: the TLB lookup is charged on both the hit and miss paths."""
    cost_hit = t_tlb + t_mem
    cost_miss = t_tlb + (levels + 1) * t_mem
    return h * cost_hit + (1 - h) * cost_miss


def emat_ram_simplified(h, levels=1, t_tlb=T_TLB, t_mem=T_MEM):
    """Algebraically identical: always pay lookup and data, pay the walk on a miss."""
    return t_tlb + t_mem + (1 - h) * levels * t_mem


def emat_total(h, levels=1, p=0.0, t_fault=8_000_000.0):
    return (1 - p) * emat_ram(h, levels) + p * t_fault


if __name__ == "__main__":
    print("no TLB, 1-level table: every access costs",
          T_TLB * 0 + 2 * T_MEM, "ns")

    print("\n-- the three figures the question asks for")
    print(f"  1 level, h = 0.80 : {emat_ram(0.80, 1):.2f} ns")
    print(f"  1 level, h = 0.95 : {emat_ram(0.95, 1):.2f} ns")
    print(f"  2 levels, h = 0.80: {emat_ram(0.80, 2):.2f} ns")

    print("\n-- the two formulas agree everywhere")
    for k in (1, 2, 4, 5):
        for h in (0.80, 0.95, 0.99):
            a, b = emat_ram(h, k), emat_ram_simplified(h, k)
            assert abs(a - b) < 1e-9, (k, h, a, b)
    print("  checked k in 1,2,4,5 and h in 0.80,0.95,0.99")

    print("\n-- depth against hit ratio (read DOWN the columns)")
    print(f"  {'k':<4}{'miss cost':>11}{'h=0.80':>9}{'h=0.95':>9}{'h=0.99':>9}")
    for k in (1, 2, 4, 5):
        miss = T_TLB + (k + 1) * T_MEM
        print(f"  {k:<4}{miss:>9.0f} ns{emat_ram(0.80,k):>8.0f} ns"
              f"{emat_ram(0.95,k):>8.0f} ns{emat_ram(0.99,k):>8.0f} ns")
    span80 = emat_ram(0.80, 5) - emat_ram(0.80, 1)
    span99 = emat_ram(0.99, 5) - emat_ram(0.99, 1)
    print(f"  spread across depths: {span80:.0f} ns at h=0.80, "
          f"{span99:.0f} ns at h=0.99")

    print("\n-- each percentage point of hit ratio is worth k nanoseconds")
    for k in (1, 2, 4):
        d = emat_ram(0.80, k) - emat_ram(0.81, k)
        print(f"  k = {k}: {d:.2f} ns per point")

    print("\n-- page faults dominate everything above")
    base = emat_ram(0.80, 1)
    for label, t_fault in (("spinning disk 8 ms", 8_000_000.0),
                           ("NVMe SSD 100 us", 100_000.0),
                           ("minor fault 2 us", 2_000.0)):
        tot = emat_total(0.80, 1, p=0.001, t_fault=t_fault)
        print(f"  p = 0.1%, {label:<20} -> {tot:>10.2f} ns "
              f"({tot/base:.2f}x slower)")

    print("\n-- fault rate budget for a 10% degradation, 8 ms service time")
    target = base * 1.10
    p_max = (target - base) / (8_000_000.0 - base)
    print(f"  EMAT_RAM {base:.0f} ns, budget {target:.0f} ns")
    print(f"  p <= {p_max:.3e}  = {p_max*100:.6f}%  "
          f"= about 1 in {1/p_max:,.0f} accesses")
    assert abs(emat_total(0.80, 1, p=p_max) - target) < 1e-6
```

---

### What they ask next

**"Which model are you using, and why?"**
The **serial model**, because the question states a TLB access latency of 20 ns, which it clearly intends to be charged. So a hit costs `t_TLB + t_mem` and a miss costs `t_TLB + (k+1) * t_mem`. The alternative **overlapped model** assumes the TLB probe runs in parallel with the start of the memory access, so a hit costs just `t_mem`, and that is what real CPUs do, probing the TLB concurrently with the L1 cache index. Saying which model you chose is the point; the two give different numbers and neither is wrong.

**"Give the simplified formula."**
`EMAT = t_TLB + t_mem + (1 - h) * k * t_mem`. It reads as a sentence: you always pay for the lookup and for the data, and you additionally pay for the page table walk in proportion to how often you miss. Its derivative with respect to `h` is `-k * t_mem`, so each percentage point of hit ratio is worth `k` nanoseconds at these figures, which is why the 15-point improvement in part 2 bought exactly 15 ns.

**"Why does page table depth matter so much less at a high hit ratio?"**
Because depth only appears on the miss path. A **TLB hit** skips the entire **page table walk** regardless of its length, so `cost_hit` is 120 ns whether there is one level or five. At `h = 0.99` the four configurations land between 121 and 125 ns, a 4 ns spread; at `h = 0.80` they span 140 to 220 ns. **Hierarchical paging is affordable only because the hit ratio is high**, which is the real reason a 64-bit machine with a four-level table is usable at all.

**"How would you actually raise the hit ratio?"**
By increasing **TLB reach**, which is entries times page size. Sixty-four entries at 4 KB covers only 256 KB, which any real working set exceeds, and that is the usual cause of a poor ratio rather than bad code. **Huge pages** at 2 MB multiply reach by 512 for the same entry count, taking those 64 entries from 256 KB to 128 MB of coverage, which is why they are standard advice for database buffer pools and large heaps. After that: improve **locality** so the working set of translations is smaller, avoid pointer chasing across many pages, and avoid gratuitous TLB flushes.

**"Is `(k+1) * t_mem` realistic for a miss?"**
It is a worst case. Page table entries are ordinary memory and go through the ordinary data caches, so an upper-level entry is very often an L1 or L2 hit rather than a 100 ns DRAM read. Hardware also has **page-walk caches** holding upper-level translations specifically, so a miss frequently resolves with fewer than `k` full memory accesses. The formula is the right model for an interview and a pessimistic one for a real machine.

**"What is the difference between a TLB miss and a page fault?"**
A TLB miss means the translation is not cached, and the walk resolves it in nanoseconds entirely in hardware, with no kernel involvement. A page fault means **the page is not in physical memory**, the walk found an invalid entry, and the hardware traps to the kernel. Those are four orders of magnitude apart and conflating them is the commonest error on this topic. Every page fault involves a TLB miss; almost no TLB miss involves a page fault.

**"Distinguish minor and major faults."**
A **minor page fault** is resolved without storage I/O, from the page cache, by zeroing a fresh anonymous page, or by copy-on-write, and costs microseconds. A **major page fault** reads from storage and is the expensive one. This matters for the arithmetic: a worked solution that says "a minor fault rate of 0.1%" and then multiplies by an 8 ms **page fault service time** has made a category error, because a minor fault never goes near a disk. A question giving 0.1% and milliseconds is describing major faults.

**"Why does the 0.1% fault rate matter so much more than the TLB?"**
Because of the ratio of the penalties. A TLB miss costs an extra 100 to 500 ns; a major fault on a spinning disk costs 8,000,000 ns. At `p = 0.001` with a 140 ns `EMAT_RAM`, the total is 8,139.86 ns, **58 times slower**, and the 20 ns difference between a one-level and a two-level table is a quarter of one percent of that. The ordering for any memory performance investigation follows directly: fault rate first, translation cost second.

**"How low does the fault rate have to be?"**
Solving `(1-p) * 140 + p * 8,000,000 <= 154` for a 10% degradation budget gives `p <= 1.75e-6`, which is **about one access in 571,000**, or 0.000175%. Expressing it as a ratio rather than a percentage is what makes it land as a design requirement rather than as advice.

**"Is the 58x figure still right?"**
Not for modern storage, and noticing that is worth saying. The 8 ms is a disk seek. At the same 0.1% fault rate, an NVMe SSD at roughly 100 us gives 239.86 ns, a **1.7x** slowdown, and a minor fault at a couple of microseconds gives 141.86 ns, essentially free. The conclusion that faults dominate translation survives, but the magnitude moves by a factor of thirty, because **the fault penalty is a property of the backing store rather than of paging.**

**The common wrong answer** is computing a hit cost of 100 ns by forgetting that the serial model charges the TLB lookup on the hit path too, or computing a miss cost of 120 ns by forgetting that the walk is in addition to the data fetch rather than instead of it. Close behind is quoting the TLB saving against the wrong baseline: with one level and no TLB every access costs 200 ns, not 100 ns, so 140 ns is a 30% saving rather than a 40% loss. The deepest error is treating the page fault term as a refinement of the TLB arithmetic, when at any realistic fault rate it is three orders of magnitude larger and makes everything above it a rounding error.

---

### Say this in the interview

*"First the model, because two are in circulation and they give different answers. The question states an access time of 20 ns for the translation lookaside buffer, so it wants that charged on every access, which is the serial model: a hit costs t_TLB plus t_mem, a miss costs t_TLB plus k plus one times t_mem. Real CPUs use the overlapped model, probing the TLB in parallel with the L1 cache index so a hit costs effectively nothing, but I will use the serial one here since that is what the given numbers imply.*

*And the baseline I will measure against: with no TLB and a single-level page table, every access costs 200 ns, one memory read for the page table entry and one for the data. The page table lives in memory, which is the whole problem, because translating an address requires the thing you were trying to do.*

*Single level at eighty percent. Hit path is 20 plus 100, so 120. Miss path is 20 plus 100 for the page table entry plus 100 for the data, so 220. Weighted, that is point eight times 120 plus point two times 220, which is 96 plus 44, so 140 ns. Against the 200 ns no-TLB baseline that is a thirty percent saving.*

*At ninety five percent the costs do not change, only the weights: point nine five times 120 plus point oh five times 220, which is 114 plus 11, so 125 ns. Fifteen percentage points of hit ratio bought fifteen nanoseconds, and that is not a coincidence, which I will come back to.*

*Two levels at eighty percent. The hit path is unchanged at 120, and that is the structural fact worth pointing at: a TLB hit skips the entire page table walk regardless of how deep it is. The miss path is now 20 plus three memory accesses, the outer directory, the inner table and the data, so 320. That gives 96 plus 64, which is 160 ns. So the same hit ratio costs twenty nanoseconds more purely because the table got a level deeper.*

*The general form is EMAT equals t_TLB plus t_mem plus one minus h, times k, times t_mem. It reads as a sentence: you always pay for the lookup and the data, and you additionally pay for the walk in proportion to how often you miss. Its derivative in h is minus k times t_mem, so each percentage point of hit ratio is worth k nanoseconds, which is why fifteen points bought exactly fifteen nanoseconds at one level.*

*Now the thing I would actually want to say about this problem. Tabulate it across depths: at eighty percent, one, two, four and five levels give 140, 160, 200 and 220 nanoseconds, a spread of eighty. At ninety nine percent they give 121, 122, 124 and 125, a spread of four. Depth only appears on the miss path, so at a high TLB hit ratio it is nearly irrelevant and at a low one it dominates. That is the real answer to why multi-level paging exists and works: a flat table for a 64-bit address space is impossible, and a four-level one is affordable only because the TLB almost always hits. On x86-64 an uncached walk costs about 520 ns, so hit rates in the high nineties are not an optimisation, they are what makes the architecture viable. Hardware agrees: there are page-walk caches for upper-level entries, page table reads go through the ordinary data caches, so k plus one times t_mem is a worst case rather than a typical one, and huge pages exist to stretch TLB reach, which is entries times page size. Sixty-four entries at 4 KB covers only 256 KB, which is why real hit ratios fall; at 2 MB pages the same sixty-four entries cover 128 MB.*

*Then page faults, which are a different thing in kind and the place where proportion matters. A TLB miss means the translation is not cached and the walk fixes it in nanoseconds with no kernel involvement. A page fault means the page is not in physical memory, the walk found an invalid entry, and the kernel has to fetch it. Total effective time is one minus p times the RAM figure, plus p times the page fault service time. With the 140 ns case, a fault rate of one in a thousand and a classic eight millisecond disk service time, that is 139.86 plus 8,000, which is 8,139.86 nanoseconds, fifty eight times slower. At that point the twenty nanosecond difference between a one-level and a two-level table is a quarter of one percent of the total, so the ordering for any memory investigation is fault rate first, translation second. And if I solve for a ten percent degradation budget, p has to be at most one point seven five times ten to the minus six, which is about one access in five hundred and seventy one thousand. Phrasing it as a ratio makes it a design requirement rather than advice.*

*Two corrections I would add, because they show I am thinking about the machine. The eight millisecond figure is a disk seek, so the fifty eight times is a nineteen nineties number: at the same fault rate an NVMe SSD at about a hundred microseconds gives 239.86 ns, only one point seven times slower. The conclusion that faults dominate survives; the magnitude moves by a factor of thirty, because the fault penalty is a property of the backing store rather than of paging. And a minor page fault does not touch storage at all, being served from the page cache or by zeroing a fresh anonymous page, costing microseconds, where a major page fault is the one that reads from disk. Many worked solutions say minor fault and then multiply by eight milliseconds, which is a category error. A question that gives me a tenth of a percent and milliseconds is describing major faults."*
