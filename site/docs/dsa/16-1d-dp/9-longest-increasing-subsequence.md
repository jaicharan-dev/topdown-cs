---
id: 9-longest-increasing-subsequence
title: "300. Longest Increasing Subsequence"
description: "Keep the smallest possible tail for each length, and binary search where each number belongs"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search / Patience Sorting</span>

> **Problem Statement:** Given an array, return the length of the longest strictly increasing subsequence. The chosen numbers keep their original order but need not be neighbours.

```text
Input:  nums = [10, 9, 2, 5, 3, 7, 101, 18]
Output: 4
```

---

### Picture it

The straightforward solution asks, for each position, how long an increasing run can end here: look back at every earlier smaller number and take the best. That is $O(n^2)$ and it is a perfectly good answer to give first.

The faster method rests on a different idea. Keep a list where entry `k` holds **the smallest value that could end an increasing run of length `k + 1`** seen so far.

Why smallest? Because a run ending in a small number is easier to extend than one ending in a large number, so for each length only the smallest possible tail is worth remembering.

That list is always sorted, which is the property that makes it useful:

```text
tails = [2, 3, 7, 18]
         a run of length 1 can end as low as 2
         a run of length 2 can end as low as 3
         ...
```

Its **length** is the answer, though its contents are not necessarily a real subsequence, which is the thing to be careful about claiming.

---

### How to think about it

Walk the numbers. For each one, find the first tail that is **not smaller** than it, using binary search since the tails are sorted.

- **Found one?** Replace it. A run of that length can now end on a smaller number, which is an improvement for the future.
- **Found none**, meaning the number is bigger than every tail? Append it, extending the longest run by one.

The answer is the length of the tails list at the end.

**Why the contents are not a valid subsequence**: entries get overwritten at different times, so the list can end up holding numbers that never appeared together in order. Only its length is meaningful. If the actual subsequence is wanted, you have to record a parent for each number and walk back, which is worth mentioning as the follow-up.

For the non-strict version, where equal values are allowed, search for the first tail strictly greater instead. That one-character change is a favourite follow-up.

---

### Walking through the example

Take `nums = [10, 9, 2, 5, 3, 7, 101, 18]`.

1. **`10`.** Tails are empty, so append: `[10]`.
2. **`9`.** It replaces `10`, since a run of one can now end at `9`: `[9]`.
3. **`2`.** Replaces `9`: `[2]`.
4. **`5`.** Bigger than everything, so append: `[2, 5]`.
5. **`3`.** The first tail not smaller than `3` is `5`, so replace it: `[2, 3]`. A run of two can now end at `3`, which is better.
6. **`7`.** Append: `[2, 3, 7]`.
7. **`101`.** Append: `[2, 3, 7, 101]`.
8. **`18`.** Replaces `101`: `[2, 3, 7, 18]`.

The length is `4`, which is the answer, from `2, 3, 7, 18` or `2, 3, 7, 101`.

Step 5 is the one worth rereading: replacing `5` with `3` did not change the answer then, but it is what let `7` extend the run afterwards.

---

### The code

```python
from bisect import bisect_left

class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        tails = []   # tails[k] = smallest tail of an increasing run of length k+1

        for value in nums:
            i = bisect_left(tails, value)

            if i == len(tails):
                tails.append(value)    # longer than anything so far
            else:
                tails[i] = value       # the same length, ending lower

        return len(tails)
```

`bisect_left` finds the first entry not smaller than the value, which is exactly the strict-increase rule. Using `bisect_right` instead gives the non-strict version.

---

### Time and space complexity

#### Time: $O(n \log n)$

Each number costs one binary search over a list that never exceeds `n` entries. The look-back solution is $O(n^2)$, which is the one to offer first and then improve.

#### Space: $O(n)$

The tails list.

---

### Remember this

For each length, remember only the **smallest** value that can end a run of it, since a lower tail is always easier to extend. That list stays sorted, so each number is placed by binary search: replace the first tail not smaller than it, or append if it beats them all. The length is the answer; the contents are not a real subsequence. $O(n \log n)$ time.
