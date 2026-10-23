---
id: 2-subsets-ii
title: "90. Subsets II"
description: "Sort so equal values sit together, then let only the first of them start a branch"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Duplicate Pruning</span>

> **Problem Statement:** Given an array that may contain repeated values, return every distinct subset. The answer must not list the same subset twice.

```text
Input:  nums = [1, 2, 2]
Output: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
```

---

### Picture it

Run the previous problem on `[1, 2, 2]` and it produces eight subsets, but two pairs are identical. Picking the first `2` alone and picking the second `2` alone both give `[2]`, and they are the same subset even though they came from different positions.

So the generated subsets are fine; the trouble is that **different choices produce the same result**.

The fix is to stop those choices being made rather than to filter the output afterwards. Sorting puts equal values next to each other, and then one rule does it: among equal values being considered at the same point, only the **first** may start a branch.

---

### How to think about it

Switch to the index-and-loop shape of the recursion, because it makes "the same point" meaningful. At each call, record the current partial subset, then loop over the candidates from the current index onward, choosing each in turn.

Inside that loop, skip a candidate when it equals the one before it **and** it is not the first of the loop. The second condition matters enormously: the first candidate at this level is the branch you want to keep, and only its repeats need pruning.

The effect is that equal values can still both appear in a subset, as long as they are taken **consecutively**. Taking `2` and then the next `2` builds `[2, 2]`, which is a genuine subset. What the rule prevents is skipping the first `2` and then taking the second one alone, since that reproduces a subset the first `2` already made.

Comparing against the previous candidate only works because the array is sorted. Without sorting, equal values can sit anywhere and the test means nothing.

---

### Walking through the example

Sorting gives `[1, 2, 2]`.

1. **Record the empty subset.**
2. **Take `1`.** Record `[1]`.
   - **Take the first `2`.** Record `[1, 2]`.
     - **Take the second `2`.** Record `[1, 2, 2]`. The two `2`s are consecutive, so this is allowed.
   - **Back up. Consider the second `2` on its own**, as a sibling branch. It equals the previous candidate and is not first in the loop, so it is skipped. That is what stops a second `[1, 2]`.
3. **Back up. Take the first `2`** at the top level. Record `[2]`, then `[2, 2]`.
4. **Consider the second `2`** at the top level. Skipped for the same reason, which is what stops a second `[2]`.

Six distinct subsets, exactly the expected answer.

---

### The code

```python
class Solution:
    def subsetsWithDup(self, nums: list[int]) -> list[list[int]]:
        nums.sort()   # equal values must sit together for the check to work
        out = []
        partial = []

        def build(start: int) -> None:
            out.append(partial[:])

            for i in range(start, len(nums)):
                # only the first of a run may start a branch at this level
                if i > start and nums[i] == nums[i - 1]:
                    continue

                partial.append(nums[i])
                build(i + 1)
                partial.pop()

        build(0)
        return out
```

---

### Time and space complexity

#### Time: $O(n \cdot 2^n)$

The worst case is an array with no repeats at all, which produces the full `2^n` subsets. Repeats only prune work, so this bound is never exceeded. Sorting adds $O(n \log n)$, which is swallowed.

#### Space: $O(n)$ beyond the answer

The recursion depth and the partial subset.

---

### Remember this

Duplicate subsets come from different choices producing the same result, so block the choice rather than filtering afterwards. Sort to group equal values, then at each level skip a candidate that equals the previous one unless it is the first of the loop. Equal values still appear together, because taking them consecutively is a different branch from restarting on a later copy. $O(n \cdot 2^n)$ time.
