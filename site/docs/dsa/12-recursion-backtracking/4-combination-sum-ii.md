---
id: 4-combination-sum-ii
title: "40. Combination Sum II"
description: "Each number used once, and repeated values pruned at the level they repeat on"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Duplicate Pruning</span>

> **Problem Statement:** Given a list of numbers that may contain repeats, and a target, find every distinct combination adding to the target. Each position in the list may be used at most once, and the answer must not contain the same combination twice.

```text
Input:  candidates = [10, 1, 2, 7, 6, 1, 5], target = 8
Output: [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
```

---

### Picture it

This problem is the previous two stitched together, and recognising that is most of the work.

**From Combination Sum:** carry a remaining target, record at zero, abandon below zero.

**From Subsets II:** the input has repeats, so sort it and let only the first of a run start a branch at any level.

The one change from Combination Sum is that each position may now be used **once**, so the recursion moves to `i + 1` rather than staying at `i`.

The subtlety that confuses people is that `[1, 1, 6]` is a valid answer even though duplicates are being pruned. There are two separate `1`s in the input, so using both is legitimate. What is forbidden is using the *same position* twice, and what is pruned is a *second branch* starting from an equal value at the same level, since that would rebuild a combination the first one already produced.

---

### How to think about it

Sort the candidates. Then at each level, loop forward from the start index and for each candidate:

- **Skip it** if it equals the previous candidate and is not the first of this loop. Those are the repeated branches.
- **Break** if it exceeds the remaining target, because sorting means everything after is too big as well.
- Otherwise take it, recurse from `i + 1` with the reduced remainder, and put it back.

Both rules depend on the sort, and they do different jobs: the skip prevents duplicate combinations, the break prunes hopeless ones.

Contrast the two recursion targets across this block, which is the thing worth memorising:

```text
same index  i      reuse allowed       (Combination Sum)
next index  i + 1  each position once  (this problem, Subsets II)
```

---

### Walking through the example

Sorting gives `[1, 1, 2, 5, 6, 7, 10]` and the target is `8`.

1. **Take the first `1`**, remainder `7`, continuing from the next position.
   - **Take the second `1`**, remainder `6`. It is allowed, because the loop here starts at that position so it is the first candidate of its level.
     - **Take `6`**, remainder `0`. Record `[1, 1, 6]`.
   - **Take `2`**, remainder `5`, then **take `5`** for `[1, 2, 5]`.
   - **Take `7`**, remainder `0`. Record `[1, 7]`.
2. **Consider the second `1` at the top level.** It equals the previous candidate and is not the first of this loop, so it is skipped. That is what prevents a second `[1, 7]` and a second `[1, 2, 5]`.
3. **Take `2`** at the top, remainder `6`, then **take `6`** for `[2, 6]`.
4. **`5`, `6`, `7` and `10`** at the top produce nothing that reaches `8` exactly using later candidates.

The answer is the four combinations listed.

---

### The code

```python
class Solution:
    def combinationSum2(self, candidates: list[int], target: int) -> list[list[int]]:
        candidates.sort()
        out = []
        partial = []

        def build(start: int, remaining: int) -> None:
            if remaining == 0:
                out.append(partial[:])
                return

            for i in range(start, len(candidates)):
                # a repeated value may not start a second branch at this level
                if i > start and candidates[i] == candidates[i - 1]:
                    continue

                if candidates[i] > remaining:
                    break   # sorted, so the rest are too big too

                partial.append(candidates[i])

                # next index: each position is used at most once
                build(i + 1, remaining - candidates[i])

                partial.pop()

        build(0, target)
        return out
```

---

### Time and space complexity

#### Time: $O(2^n)$ in the worst case

Each position is either used or not, so the tree is bounded by the subsets of the input. The two prunes cut this heavily in practice: the break abandons branches that cannot reach the target, and the skip removes whole duplicate subtrees.

#### Space: $O(n)$ beyond the answer

Recursion depth and the partial combination.

---

### Remember this

This is Combination Sum with `i + 1` instead of `i`, plus the duplicate skip from Subsets II. Sort once and both rules work: skip a candidate equal to the previous one unless it starts the loop, and break when a candidate exceeds the remainder. Using two equal values from different positions is allowed; starting a second branch from an equal value at the same level is not.
