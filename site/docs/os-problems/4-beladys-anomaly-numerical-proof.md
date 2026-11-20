---
id: 4-beladys-anomaly-numerical-proof
title: "Bélády's Anomaly: Three Frames Beat Four"
description: "More memory, more faults: the trace that breaks FIFO, and the one property that explains why LRU and Optimal are immune to it"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Prove Bélády's Anomaly using the reference string `(1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5)` comparing 3 frames against 4 frames under FIFO. Why do LRU and Optimal algorithms never exhibit this anomaly? Formulate your answer around Mattson's Stack Algorithm Inclusion Property."

---

### Picture it

A desk with three books, and the same desk with four. The same reading list. The bigger desk does worse.

That should be impossible, and the instinct that it is impossible is worth taking seriously rather than suppressing, because it is almost right. **If the bigger desk always kept a superset of what the smaller desk kept, it would be impossible.** Anything you found on the small desk you would also find on the large one, so you could never lose a hit by adding a slot. The anomaly exists only because that superset relationship can fail, and the whole question is which rules guarantee it and which do not.

So what could make the bigger desk hold something the smaller one does not?

Here is the mechanism, and it is sharper than "FIFO is dumb". **FIFO decides a book's fate by when you put it on the desk, not by when you last opened it.** Now think about what a miss actually does. When the small desk is forced to fetch a book back from the library, it puts that book down **fresh**, at the back of the queue, which protects it for a long while. The large desk, which had room to keep the book all along, never re-fetched it, so the book is still sitting there with its original timestamp, at the front of the queue, first in line to be thrown out.

**The small desk's extra suffering bought it a reset. The large desk's comfort left it holding stale bookkeeping.** That is Bélády's anomaly in one sentence, and on the trace below you can watch it happen: the three-frame run faults twice in the middle, and those two faults are precisely what save it three steps later, while the four-frame run gets two free hits in the middle and pays four times over for them afterwards.

Then the deeper point, which is what the question is actually asking for. Ask why FIFO can do this and LRU cannot, and the answer is not that LRU is cleverer. It is that **LRU's ordering is a property of the reading list, and FIFO's is not.** If you ask "which book did I last open longest ago?", the answer depends only on the sequence of requests, so it is the same answer regardless of how many slots the desk has. If you ask "which book did I put down longest ago?", the answer depends on the history of evictions, and the history of evictions depends on how many slots the desk has. **FIFO's ordering is contaminated by the very quantity we are varying.**

Once that is clear, the immunity result is not a separate fact to memorise. An algorithm whose ordering comes from the reference string alone keeps the top `m` of one fixed list, so the three-slot desk necessarily holds a subset of the four-slot desk, so a hit at three slots is a hit at four, so faults can only fall as you add slots. **The anomaly is not about memory sizes at all. It is about whether your priority order is allowed to depend on your memory size.**

---

### The proper terms

#### The anomaly

**Bélády's anomaly** is an increase in page faults caused by an increase in the number of page frames, with the reference string and the replacement algorithm held fixed. It was described by László Bélády, Nelson and Shedler in 1969, alongside the optimal algorithm that bears the same name, which is a pleasing detail: the man who found the best possible policy also found the counterexample that broke the obvious one.

The thing to be careful about is the quantifier. The anomaly does not say FIFO gets worse as memory grows in general; FIFO's fault count usually falls. It says that no guarantee exists, so there are strings on which it rises, and this is one of them.

#### The property that explains it

A replacement policy is a **stack algorithm** if, at every point in every reference string, the set of pages it holds with `m` frames is a subset of the set it would hold with `m + 1` frames.

Writing the resident set after the `t`-th reference with `m` frames as `S(m, t)`, the **inclusion property** is:

$$S(m, t) \subseteq S(m + 1, t) \quad \text{for all } m, t$$

The useful equivalent formulation, and the one that makes the proofs trivial, is this. A policy is a stack algorithm exactly when it can be described as maintaining **a single total ordering of all pages that does not depend on `m`**, and holding the top `m` of that ordering. The ordering is sometimes called the priority list or the stack.

- **LRU's** ordering is pages sorted by time of last reference. That is computed from the reference string alone.
- **Optimal's** ordering is pages sorted by distance to next reference. Also computed from the reference string alone.
- **FIFO has no such ordering.** Its criterion is time of loading, and when a page was loaded depends on when it was previously evicted, which depends on how many frames there are. The ordering is a function of `m`, so no single `m`-independent list exists.

That is the whole explanation, and it is worth stating in exactly that form, because it converts "LRU is immune" from a fact to be recalled into a consequence.

#### Why inclusion forbids the anomaly

If `S(m, t)` is a subset of `S(m + 1, t)` at every step, then any reference that hits with `m` frames also hits with `m + 1` frames, because the page was in the smaller set and therefore in the larger one. So the set of hits with `m + 1` frames contains the set of hits with `m` frames, hits are monotonically non-decreasing in `m`, and faults are **monotonically non-increasing** in `m`. The anomaly is excluded by construction.

Note the direction of the implication. Inclusion is sufficient for immunity, and it is the standard route to proving it. FIFO violating inclusion does not by itself prove FIFO must sometimes be anomalous, which is why the question asks for a numerical counterexample as well as the property. **The trace supplies the existence proof; the property supplies the explanation.**

#### The distinction people blur

**Monotonicity is not superiority.** Being a stack algorithm guarantees that more memory never hurts. It does not guarantee a lower fault count than a non-stack algorithm at any given size. On the very string in this problem, LRU with 3 frames takes 10 faults where FIFO takes 9, so FIFO is better here at that size and still worse-behaved. The guarantee LRU buys is **predictability under resizing**, which matters enormously when you are tuning an allocation and need to know that adding memory cannot backfire.

#### The floor

A **compulsory miss** is the first reference to a page, unavoidable with a cold memory. This string touches 5 distinct pages, so **every run below pays at least 5 faults**, and at 5 frames or more every algorithm hits exactly 5. That is the ceiling of the experiment: the anomaly can only live in the range where the allocation is smaller than the number of distinct pages.

---

### Work it out

#### The setup

Reference string, 12 references:

`1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5`

Distinct pages: 1, 2, 3, 4, 5, which is five, so 5 compulsory misses are unavoidable and 5 frames is the point where the problem disappears.

We run **FIFO with 3 frames and FIFO with 4 frames** and compare. The queue column below is the eviction order, oldest first, and it is the state that matters: FIFO appends on load and never touches it on a hit.

#### Part 1: FIFO with 3 frames

| # | Ref | Frames | Result | Evicted | Queue after (oldest first) |
| :---: | :---: | :---: | :--- | :---: | :--- |
| 1 | 1 | 1 | fault, cold | | 1 |
| 2 | 2 | 1, 2 | fault, cold | | 1, 2 |
| 3 | 3 | 1, 2, 3 | fault, cold | | 1, 2, 3 |
| 4 | 4 | 4, 2, 3 | fault, cold | 1 | 2, 3, 4 |
| 5 | 1 | 4, 1, 3 | fault | 2 | 3, 4, **1** |
| 6 | 2 | 4, 1, 2 | fault | 3 | 4, 1, **2** |
| 7 | 5 | 5, 1, 2 | fault, cold | 4 | 1, 2, 5 |
| 8 | 1 | 5, 1, 2 | **hit** | | 1, 2, 5 |
| 9 | 2 | 5, 1, 2 | **hit** | | 1, 2, 5 |
| 10 | 3 | 5, 3, 2 | fault | 1 | 2, 5, 3 |
| 11 | 4 | 5, 3, 4 | fault | 2 | 5, 3, 4 |
| 12 | 5 | 5, 3, 4 | **hit** | | 5, 3, 4 |

**9 faults, 3 hits.**

Mark steps 5 and 6. Pages 1 and 2 are **re-loaded** there, which pushes them to the back of the queue. That is the reset, and it is what makes steps 8 and 9 hits.

#### Part 2: FIFO with 4 frames

| # | Ref | Frames | Result | Evicted | Queue after (oldest first) |
| :---: | :---: | :---: | :--- | :---: | :--- |
| 1 | 1 | 1 | fault, cold | | 1 |
| 2 | 2 | 1, 2 | fault, cold | | 1, 2 |
| 3 | 3 | 1, 2, 3 | fault, cold | | 1, 2, 3 |
| 4 | 4 | 1, 2, 3, 4 | fault, cold | | 1, 2, 3, 4 |
| 5 | 1 | 1, 2, 3, 4 | **hit** | | 1, 2, 3, 4 |
| 6 | 2 | 1, 2, 3, 4 | **hit** | | 1, 2, 3, 4 |
| 7 | 5 | 5, 2, 3, 4 | fault, cold | **1** | 2, 3, 4, 5 |
| 8 | 1 | 5, 1, 3, 4 | fault | 2 | 3, 4, 5, 1 |
| 9 | 2 | 5, 1, 2, 4 | fault | 3 | 4, 5, 1, 2 |
| 10 | 3 | 5, 1, 2, 3 | fault | 4 | 5, 1, 2, 3 |
| 11 | 4 | 4, 1, 2, 3 | fault | 5 | 1, 2, 3, 4 |
| 12 | 5 | 4, 5, 2, 3 | fault | 1 | 2, 3, 4, 5 |

**10 faults, 2 hits.**

**Ten faults with four frames against nine with three.** The anomaly is demonstrated, and because it is a single concrete counterexample it is a complete existence proof: FIFO offers no monotonicity guarantee.

#### Part 3: where the two runs diverge, step by step

| # | Ref | 3 frames | 4 frames | |
| :---: | :---: | :--- | :--- | :--- |
| 1 to 4 | 1,2,3,4 | 4 cold faults | 4 cold faults | identical |
| 5 | 1 | **fault**, reloads 1 | **hit** | 4 frames ahead by 1 |
| 6 | 2 | **fault**, reloads 2 | **hit** | 4 frames ahead by 2 |
| 7 | 5 | fault, evicts 4 | fault, **evicts 1** | the divergence |
| 8 | 1 | **hit** | **fault** | 4 frames ahead by 1 |
| 9 | 2 | **hit** | **fault** | level |
| 10 | 3 | fault, evicts 1 | fault, evicts 4 | level |
| 11 | 4 | fault, evicts 2 | fault, evicts 5 | level |
| 12 | 5 | **hit** | **fault** | **3 frames ahead by 1** |

The four-frame run is two hits up after step 6 and loses that lead entirely. Trace the cause precisely.

**At step 7, both runs must evict something to make room for page 5.** With 3 frames the queue entering that step is `4, 1, 2`, because pages 1 and 2 were re-loaded at steps 5 and 6 and so sit behind page 4, and the victim is therefore **page 4**. With 4 frames the queue entering that step is still `1, 2, 3, 4`, untouched since step 4, and the victim is **page 1**, because page 1 has never been re-loaded since step 1 and is the oldest thing on the desk.

**Page 1 is referenced at step 8.** The three-frame run has it, because its extra faults refreshed it. The four-frame run has just thrown it away.

So state the mechanism exactly: **a hit under FIFO does not refresh a page's queue position, so the four-frame run's two free hits at steps 5 and 6 left pages 1 and 2 stale at the head of the queue, and they became the first two victims.** The three-frame run paid two faults to get those same pages into memory, and the payment included a reset of their queue position, which protected them for the next three references.

This is also exactly where you can see what a hit under LRU would have done differently. LRU's ordering is last-reference time, so the hits at steps 5 and 6 would have moved pages 1 and 2 to the back of the ordering in the four-frame run too, and the victim at step 7 would have been page 3, not page 1. **The information FIFO throws away on a hit is the information LRU keeps, and that is the whole difference.**

#### Part 4: the inclusion property, checked against the trace

The resident sets, written as sorted sets so they can be compared:

| # | `S(3, t)` | `S(4, t)` | `S(3,t)` subset of `S(4,t)`? |
| :---: | :--- | :--- | :---: |
| 1 | 1 | 1 | yes |
| 2 | 1, 2 | 1, 2 | yes |
| 3 | 1, 2, 3 | 1, 2, 3 | yes |
| 4 | 2, 3, 4 | 1, 2, 3, 4 | yes |
| 5 | 1, 3, 4 | 1, 2, 3, 4 | yes |
| 6 | 1, 2, 4 | 1, 2, 3, 4 | yes |
| 7 | 1, 2, 5 | 2, 3, 4, 5 | **no**, 1 is missing |
| 8 | 1, 2, 5 | 1, 3, 4, 5 | **no**, 2 is missing |
| 9 | 1, 2, 5 | 1, 2, 4, 5 | yes |
| 10 | 2, 3, 5 | 1, 2, 3, 5 | yes |
| 11 | 3, 4, 5 | 1, 2, 3, 4 | **no**, 5 is missing |
| 12 | 3, 4, 5 | 2, 3, 4, 5 | yes |

**Inclusion first fails at step 7**, the exact step at which the four-frame run evicted page 1. And the consequence is immediate and visible: at step 8 the three-frame run holds a page the four-frame run does not, so it hits where the larger memory faults. **That single row is the anomaly's cause and effect in one place.**

Now the same table for LRU, 3 against 4 frames:

| # | `S(3, t)` LRU | `S(4, t)` LRU | subset? |
| :---: | :--- | :--- | :---: |
| 1 | 1 | 1 | yes |
| 2 | 1, 2 | 1, 2 | yes |
| 3 | 1, 2, 3 | 1, 2, 3 | yes |
| 4 | 2, 3, 4 | 1, 2, 3, 4 | yes |
| 5 | 1, 3, 4 | 1, 2, 3, 4 | yes |
| 6 | 1, 2, 4 | 1, 2, 3, 4 | yes |
| 7 | 1, 2, 5 | 1, 2, 4, 5 | yes |
| 8 | 1, 2, 5 | 1, 2, 4, 5 | yes |
| 9 | 1, 2, 5 | 1, 2, 4, 5 | yes |
| 10 | 1, 2, 3 | 1, 2, 3, 5 | yes |
| 11 | 2, 3, 4 | 1, 2, 3, 4 | yes |
| 12 | 3, 4, 5 | 2, 3, 4, 5 | yes |

**Inclusion holds at every step**, which is what being a stack algorithm means. It is not a coincidence of this string: LRU's resident set with `m` frames is by definition the `m` most recently referenced distinct pages, and **the `m` most recent are always among the `m + 1` most recent**, for any string whatsoever. The proof is that short.

Optimal's version is the same argument with a different list: its resident set is the `m` pages with the nearest next reference, and the nearest `m` are among the nearest `m + 1`.

#### Part 5: the fault counts across every allocation

| Frames | FIFO | LRU | Optimal |
| :---: | :---: | :---: | :---: |
| 3 | **9** | 10 | 7 |
| 4 | **10** | 8 | 6 |
| 5 | 5 | 5 | 5 |

Three things in that table are worth saying out loud.

**FIFO goes 9, then 10.** That is the anomaly, and it is the only non-monotonic row.

**LRU at 3 frames is worse than FIFO at 3 frames**, 10 against 9. The string was constructed to embarrass FIFO at four frames, and at three frames FIFO happens to win. This is the distinction between monotonicity and superiority, and it is the nuance that separates a memorised answer from an understood one: **being a stack algorithm is a guarantee about how the policy responds to resizing, not a promise of fewer faults at any given size.**

**At 5 frames everything converges on 5.** Five distinct pages fit, nothing is ever evicted, and all that remains is the compulsory misses. The anomaly can only exist below that line, which is a reminder that replacement policy is only interesting while the allocation is smaller than the set of pages in use.

#### Verify it

```python
"""
Belady's anomaly: FIFO on a fixed reference string at 3 and 4 frames,
plus the Mattson inclusion check for FIFO, LRU and Optimal.
"""

REF = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]


def fifo(ref, n):
    slots, queue, trace = [None] * n, [], []
    for i, p in enumerate(ref):
        if p in slots:
            trace.append((i, p, "hit", list(slots), None, list(queue)))
            continue
        victim = None
        if None in slots:
            slots[slots.index(None)] = p
        else:
            victim = queue.pop(0)
            slots[slots.index(victim)] = p
        queue.append(p)                      # appended on LOAD, never on a hit
        trace.append((i, p, "fault", list(slots), victim, list(queue)))
    return trace


def lru(ref, n):
    slots, recency, trace = [None] * n, [], []
    for i, p in enumerate(ref):
        if p in slots:
            recency.remove(p)
            recency.append(p)                # refreshed on EVERY reference
            trace.append((i, p, "hit", list(slots), None, list(recency)))
            continue
        victim = None
        if None in slots:
            slots[slots.index(None)] = p
        else:
            victim = recency.pop(0)
            slots[slots.index(victim)] = p
        recency.append(p)
        trace.append((i, p, "fault", list(slots), victim, list(recency)))
    return trace


def optimal(ref, n):
    slots, trace = [None] * n, []
    for i, p in enumerate(ref):
        if p in slots:
            trace.append((i, p, "hit", list(slots), None, []))
            continue
        victim = None
        if None in slots:
            slots[slots.index(None)] = p
        else:
            def next_use(q):
                rest = ref[i + 1:]
                return rest.index(q) if q in rest else float("inf")
            victim = max(slots, key=next_use)
            slots[slots.index(victim)] = p
        trace.append((i, p, "fault", list(slots), victim, []))
    return trace


def faults(trace):
    return sum(1 for t in trace if t[2] == "fault")


def resident(trace):
    return [frozenset(x for x in t[3] if x is not None) for t in trace]


def show(name, ref, n):
    trace = fifo(ref, n)
    print(f"\n== FIFO, {n} frames   ({faults(trace)} faults)")
    for i, p, status, slots, victim, queue in trace:
        shown = " ".join("." if s is None else str(s) for s in slots)
        ev = f"  evict {victim}" if victim is not None else ""
        print(f"  {i+1:>2}  ref {p}  [{shown}]  {status:<5}{ev:<10}"
              f"queue {queue}")


def inclusion(name, fn, ref, m):
    """Check S(m, t) subset of S(m+1, t) at every step."""
    small, large = resident(fn(ref, m)), resident(fn(ref, m + 1))
    print(f"\n{name}: inclusion S({m},t) in S({m+1},t)")
    bad = 0
    for t, (a, b) in enumerate(zip(small, large), start=1):
        ok = a <= b
        bad += not ok
        flag = "" if ok else "   <-- VIOLATION, missing " + str(sorted(a - b))
        print(f"  t={t:>2}  {sorted(a)}  vs  {sorted(b)}  "
              f"{'ok' if ok else 'NO'}{flag}")
    print(f"  violations: {bad}")


if __name__ == "__main__":
    distinct = sorted(set(REF))
    print(f"string {REF}")
    print(f"distinct pages {distinct} -> {len(distinct)} compulsory misses, "
          f"and the problem disappears at {len(distinct)} frames")

    show("FIFO", REF, 3)
    show("FIFO", REF, 4)

    print("\n== fault counts")
    print(f"  {'frames':<8}{'FIFO':>6}{'LRU':>6}{'OPT':>6}")
    for n in (3, 4, 5):
        print(f"  {n:<8}{faults(fifo(REF, n)):>6}{faults(lru(REF, n)):>6}"
              f"{faults(optimal(REF, n)):>6}")

    f3, f4 = faults(fifo(REF, 3)), faults(fifo(REF, 4))
    assert f4 > f3, "no anomaly found"
    print(f"\n  ANOMALY: FIFO 3 frames = {f3} faults, 4 frames = {f4} faults")

    inclusion("FIFO", fifo, REF, 3)
    inclusion("LRU", lru, REF, 3)
    inclusion("Optimal", optimal, REF, 3)
```

---

### What they ask next

**"Why exactly does FIFO violate inclusion?"**
Because its ordering is not a function of the reference string. FIFO ranks pages by **when they were loaded**, and when a page was loaded depends on when it was previously evicted, which depends on how many frames there are. So the ordering is contaminated by the very quantity you are varying, and no single frame-count-independent priority list exists. LRU ranks by last reference time and Optimal by next reference distance, and both are computed from the string alone, which is why one fixed list serves every allocation.

**"Give the formal statement of the inclusion property."**
A policy is a stack algorithm if `S(m, t)` is a subset of `S(m + 1, t)` for every allocation `m` and every step `t`, where `S(m, t)` is the resident set after the `t`-th reference with `m` frames. Equivalently, the policy maintains one total ordering of pages independent of `m` and holds the top `m` of it. **If inclusion holds then every hit with `m` frames is a hit with `m + 1`**, so faults are monotonically non-increasing in `m` and the anomaly is impossible.

**"Prove LRU is a stack algorithm in one line."**
LRU's resident set with `m` frames is exactly the `m` most recently referenced distinct pages, and the `m` most recent are always among the `m + 1` most recent. That holds for every reference string with no case analysis. Optimal's version is the same sentence with "nearest next reference" substituted for "most recent".

**"Point at the step where the two FIFO runs diverge and say why."**
Step 7, where both must evict to admit page 5. With 3 frames, pages 1 and 2 had been **re-loaded** at steps 5 and 6, so they sit behind page 4 in the queue and page 4 is the victim. With 4 frames those same references were **hits**, and a hit under FIFO does not refresh queue position, so pages 1 and 2 are still sitting at the head with their original load times and page 1 is the victim. Page 1 is referenced at step 8. **The three-frame run's extra faults bought it a queue reset that protected it; the four-frame run's free hits left it holding stale bookkeeping.**

**"Does the counterexample prove FIFO is worse than LRU?"**
No, and this is the trap. It proves FIFO has **no monotonicity guarantee**, which is a statement about how it responds to resizing. On this very string LRU takes 10 faults at 3 frames where FIFO takes 9, so FIFO is better here at that size and still the badly behaved one. **Monotonicity is not superiority.** What the guarantee buys you is the ability to tune an allocation without worrying that adding memory could backfire, which matters a great deal operationally and says nothing about any single measurement.

**"Why does the anomaly disappear at 5 frames?"**
Because the string touches 5 distinct pages, so at 5 frames nothing is ever evicted and every algorithm pays exactly the 5 compulsory misses. The anomaly can only live strictly below the number of distinct pages, which is the general shape of replacement problems: **the policy only matters while the allocation is smaller than the set of pages actually in use.**

**"Is the anomaly a practical concern or a curiosity?"**
Mostly the latter now, but the reason is worth knowing. Pure FIFO is not used for page replacement in any serious kernel, and the clock or second-chance algorithm that replaced it gives each page a reprieve based on its **reference bit**, which reintroduces exactly the information FIFO discards on a hit. The practical legacy of the anomaly is the operational rule it teaches: **if your eviction policy is not a stack algorithm, you cannot infer anything about a larger cache from measurements on a smaller one**, which also bites cache sizing studies and any attempt to extrapolate a hit-rate curve.

**"Which other algorithms are vulnerable?"**
Anything whose ordering depends on load time or on arrival order rather than on access order. FIFO and second-chance in its plain form can both be anomalous, and so can random replacement in the sense that no monotonicity is guaranteed. LRU, Optimal, LFU and MRU are stack algorithms because each ranks by something computed from the reference string alone. The question to ask of any new policy is simply: **is my priority order a function of the references only, or does it also depend on the cache size?**

**The common wrong answer** is "LRU is immune because it is smarter", which is not a mechanism and does not survive the follow-up. The explanation has to be the inclusion property, and the reason FIFO fails it has to be that its ordering depends on load time, which itself depends on the frame count. The second common error is concluding from the 9 against 10 result that LRU beats FIFO, when on this string LRU at 3 frames is worse than FIFO at 3 frames. The third is asserting the anomaly without a trace, since a single concrete counterexample is the whole of the existence proof and an interviewer asking for a numerical proof is asking to see it.

---

### Say this in the interview

*"The string touches five distinct pages, so five compulsory misses are unavoidable and the whole question only lives below five frames. With three frames FIFO takes nine faults and with four frames it takes ten, so the anomaly is demonstrated, and because it is a single concrete counterexample that is a complete existence proof: FIFO offers no monotonicity guarantee.*

*The mechanism is at step seven, and I would trace it precisely. The first four references are four cold faults in both runs. Then at steps five and six, references to pages one and two: with four frames those are free hits because there was room to keep them; with three frames they are faults, so pages one and two are re-loaded. Now at step seven both runs need room for page five. With three frames pages one and two were just re-loaded, so they sit at the back of the queue and the victim is page four. With four frames those references were hits, and here is the point: a hit under FIFO does not refresh a page's queue position, because FIFO ranks by when a page was loaded, not by when it was last used. So pages one and two are still sitting at the head of the queue with their original load times from steps one and two, and the victim is page one. Page one is referenced at step eight. The three-frame run has it and hits; the four-frame run just threw it away and faults.*

*So the four-frame run is two hits up after step six and loses the lead entirely. Its comfort left it holding stale bookkeeping, and the three-frame run's extra suffering bought it a queue reset that protected it for the next three references. Under LRU those hits at steps five and six would have moved pages one and two to the back of the ordering, the victim at step seven would have been page three, and nothing would have gone wrong. The information FIFO discards on a hit is exactly the information LRU keeps.*

*For the formal part, the inclusion property says a policy is a stack algorithm if the resident set with m frames is always a subset of the resident set with m plus one frames, at every step of every reference string. If that holds, every hit with m frames is necessarily a hit with m plus one, because the page was in the smaller set and so is in the larger, so hits are monotonically non-decreasing and faults monotonically non-increasing in the number of frames, and the anomaly is excluded by construction. Checking it on this trace, inclusion first fails at step seven, which is exactly the step where the four-frame run evicted page one, and at step eight the three-frame run holds a page the four-frame run does not and hits where the bigger memory faults. That one row is the cause and the effect in the same place.*

*And the reason FIFO fails it is the part I would make sure to say, because it turns the immunity result from something to memorise into a consequence. A policy is a stack algorithm exactly when it maintains one total ordering of pages that does not depend on the frame count, and keeps the top m of it. LRU's ordering is last reference time and Optimal's is distance to next reference, and both are computed from the reference string alone, so the same list serves every allocation. FIFO's criterion is time of loading, and when a page was loaded depends on when it was previously evicted, which depends on how many frames there are. FIFO's ordering is contaminated by the very quantity we are varying, so no frame-count-independent list exists. The one-line proof for LRU is that its resident set with m frames is the m most recently referenced distinct pages, and the m most recent are always among the m plus one most recent, for any string, with no case analysis. Optimal is the same sentence with nearest next reference instead.*

*One nuance I would add, because it is where people overclaim. On this exact string LRU with three frames takes ten faults where FIFO takes nine, so FIFO is better here at that size and still the badly behaved one. Monotonicity is not superiority. What being a stack algorithm buys is predictability under resizing, which matters because it means you can tune an allocation knowing that adding memory cannot backfire, and it is also why non-stack policies break cache sizing studies: if your eviction order is not a function of the references alone, you cannot extrapolate anything about a larger cache from measurements on a smaller one. At five frames everything converges on five faults anyway, since all five pages fit and only the compulsory misses remain."*
