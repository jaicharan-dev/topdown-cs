---
id: 2-search-insert-position
title: "35. Search Insert Position"
description: "Hunt for the first element that is not too small, and that position is the answer either way"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Lower Bound</span>

> **Problem Statement:** You are given a sorted array of distinct numbers and a `target`. Return the position of the target if it is present, or the position it would have to be inserted at to keep the array sorted. It has to run in $O(\log n)$ time.

```text
Input:  nums = [1, 3, 5, 6], target = 2
Output: 1
```

---

### Picture it

The two cases in the question look different but have the same answer.

Ask instead: **how many elements are strictly smaller than the target?** Call that count `c`.

If the target is present, everything smaller sits before it, so it is at position `c`. If the target is absent, it would have to be inserted right after all the smaller elements, which is also position `c`.

So one question answers both halves of the problem, and there is no need to treat "found" and "not found" separately at all.

---

### How to think about it

Finding that count is a binary search for the **first element that is not too small**, meaning the first one greater than or equal to the target. Its position is exactly the number of elements below it.

This variant is written slightly differently from the plain search, and the differences matter:

**The range runs to `len(nums)`, not `len(nums) - 1`.** The answer can legitimately be "past the end", when the target is larger than everything. Position `len(nums)` has to be reachable.

**The loop is `low < high`.** The range is being narrowed to a single surviving position rather than hunting for a value, so it ends when the two markers meet.

**`high = mid`, not `mid - 1`.** When the middle element is big enough, it is itself a candidate for the answer, so it must stay in the range. Only `low` gets the `+ 1`, because an element that is too small is definitively ruled out.

When the markers meet, that position is the answer, and nothing needs to be compared afterwards.

---

### Walking through the example

Take `nums = [1, 3, 5, 6]` with `target = 2`. The range runs from `0` to `4`.

1. **The middle is position 2, holding `5`.** It is not too small, so it stays a candidate and everything to its right is ruled out. The range becomes `0` to `2`.
2. **The middle is position 1, holding `3`.** Also not too small, so the range becomes `0` to `1`.
3. **The middle is position 0, holding `1`.** That is smaller than `2`, so it is ruled out and `low` moves to `1`.

The markers meet at `1`, which is the answer: inserting `2` there gives `[1, 2, 3, 5, 6]`.

---

### The code

```python
class Solution:
    def searchInsert(self, nums: list[int], target: int) -> int:
        low, high = 0, len(nums)   # len(nums) is a valid answer

        while low < high:
            mid = (low + high) // 2

            if nums[mid] < target:
                low = mid + 1   # too small, so it cannot be the answer
            else:
                high = mid      # big enough, so it might be the answer

        return low
```

---

### Time and space complexity

#### Time: $O(\log n)$

The range halves every step, exactly as in a plain binary search. Ending at a meeting point rather than on a match does not change that.

#### Space: $O(1)$

Two markers and a midpoint.

---

### Remember this

Both halves of the question are the same number: how many elements are strictly smaller than the target. Search for the first element that is not too small. Let the range reach `len(nums)` so "past the end" is expressible, loop while `low < high`, and keep the middle in play with `high = mid` when it qualifies. $O(\log n)$ time, $O(1)$ space.
