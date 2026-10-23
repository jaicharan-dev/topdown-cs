---
id: 3-combination-sum
title: "39. Combination Sum"
description: "Reuse is allowed, so recurse on the same index instead of the next one"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Backtracking</span>

> **Problem Statement:** Given distinct numbers and a target, find every combination that adds up to the target. Each number may be used as many times as you like. Two combinations are the same if they use the same numbers the same number of times, whatever the order.

```text
Input:  candidates = [2, 3, 6, 7], target = 7
Output: [[2, 2, 3], [7]]
```

---

### Picture it

This is Subsets with the budget idea from Path Sum folded in. Walk a decision tree, carrying how much of the target is still unpaid, and record a combination whenever the remainder hits exactly zero.

Two details shape the whole solution.

**Numbers can repeat.** After taking a `2`, you are still allowed another `2`. So the recursion continues from the **same** index rather than moving past it.

**Order must not matter.** `[2, 2, 3]` and `[3, 2, 2]` are the same combination and only one may appear. The way to guarantee that is to never look backwards: once you move past a candidate, it is gone for the rest of that branch. Combinations are then always built in non-decreasing order, so each one can only be produced one way.

Those two rules sound contradictory, and the resolution is exactly the index: recursing on `i` allows reuse, and looping from `i` onward prevents going back.

---

### How to think about it

The recursion carries a starting index and the remaining target.

- **Remainder is zero.** Record a copy of the partial combination.
- **Remainder is negative.** This branch overshot, so abandon it.
- **Otherwise**, loop over the candidates from the start index, and for each one: take it, recurse **with the same index** and a reduced remainder, then put it back.

Sorting the candidates first enables a sharper cut. Once a candidate exceeds the remainder, every later candidate does too, so the whole loop can stop instead of testing each one and failing. That turns a wasted branch into no branch at all.

Nothing else is needed to avoid duplicate combinations. The problem states the candidates are distinct, so there is no equal-value pruning to do, which is what separates this from the next question.

---

### Walking through the example

Take `candidates = [2, 3, 6, 7]` with `target = 7`.

1. **Take `2`**, remainder `5`. Candidates still start at `2`.
   - **Take `2`**, remainder `3`.
     - **Take `2`**, remainder `1`. Nothing fits, so back out.
     - **Take `3`**, remainder `0`. Record `[2, 2, 3]`.
     - **`6` and `7`** both exceed `1`, so with sorted candidates the loop stops.
   - **Take `3`**, remainder `2`. The loop now starts at `3`, so `2` cannot be taken, and `3` itself overshoots. Dead end, and this is what stops `[2, 3, 2]` appearing.
2. **Take `3`** at the top, remainder `4`. Only `3` and up are available, and nothing reaches `4` exactly.
3. **Take `6`**, remainder `1`. Dead end.
4. **Take `7`**, remainder `0`. Record `[7]`.

The answer is `[[2, 2, 3], [7]]`.

---

### The code

```python
class Solution:
    def combinationSum(self, candidates: list[int], target: int) -> list[list[int]]:
        candidates.sort()   # lets the loop stop early once a candidate is too big
        out = []
        partial = []

        def build(start: int, remaining: int) -> None:
            if remaining == 0:
                out.append(partial[:])
                return

            for i in range(start, len(candidates)):
                if candidates[i] > remaining:
                    break   # sorted, so everything after is too big as well

                partial.append(candidates[i])

                # same index: this candidate may be used again
                build(i, remaining - candidates[i])

                partial.pop()

        build(0, target)
        return out
```

---

### Time and space complexity

#### Time: $O(n^{T/m})$ in the worst case

Where `T` is the target and `m` the smallest candidate, so `T/m` is the deepest a combination can go. The tree branches up to `n` ways at each of those levels. The bound is loose, and the sorted early exit prunes most of it in practice.

#### Space: $O(T/m)$ beyond the answer

The recursion depth, which is bounded by how many copies of the smallest candidate fit in the target.

---

### Remember this

Recurse on the **same** index to allow reuse, and loop forward only so combinations are always built in non-decreasing order, which is what stops reorderings of the same answer. Record when the remainder hits zero, abandon when it goes negative, and sort so the loop can break the moment a candidate is too big.
