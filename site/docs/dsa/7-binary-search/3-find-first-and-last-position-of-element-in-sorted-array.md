---
id: 3-find-first-and-last-position-of-element-in-sorted-array
title: "34. Find First and Last Position of Element in Sorted Array"
description: "Find where the target starts, and where the next value starts"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Directional Bisect</span>

> **Problem Statement:** You are given a sorted array that may contain repeats, and a `target`. Return the first and last positions where the target appears, or `[-1, -1]` if it is absent. It has to run in $O(\log n)$ time.

```text
Input:  nums = [5, 7, 7, 8, 8, 10], target = 8
Output: [3, 4]
```

---

### Picture it

A plain binary search lands on *some* occurrence of the target, and with repeats there is no telling which one. Walking outward from there to find the edges would be $O(n)$ in an array that is entirely one value, which breaks the requirement.

So search for the **edges directly**, with two searches instead of one.

The first edge is the position where the target starts. The second is more cunning: instead of hunting for the last target, find where the **next value up** would start, and step back one. Those are the same place.

```text
[5, 7, 7, 8, 8, 10]
          |     |
          |     where 9 would start, so the 8s end just before it
          where the 8s start
```

---

### How to think about it

Both searches are the same lower-bound routine from Search Insert Position: find the first position holding a value that is at least `x`. Write it once and call it twice.

**The first position of the target** is `first_at_least(target)`.

**The last position** is `first_at_least(target + 1) - 1`. Asking where `target + 1` would begin finds the boundary just past the final target, however many repeats there are, and stepping back one lands on the last of them.

Then check whether the target is there at all. The lower-bound search always returns a position, even when the value is missing, so you have to confirm. Two things can be wrong: the position may be past the end of the array, or it may hold some different value. Test for running off the end first, or the array lookup itself will fail.

The `target + 1` trick works here because the values are integers. For floating-point data you would write a second search that biases the other way instead.

---

### Walking through the example

Take `nums = [5, 7, 7, 8, 8, 10]` with `target = 8`.

**First search, for the first value at least `8`:** the middle holds `8` at position 2? No, position 2 holds `7`, which is too small, so the range moves right. The search settles on position `3`, the first `8`.

**Check:** position `3` is inside the array and holds `8`, so the target is present.

**Second search, for the first value at least `9`:** the `8`s are too small and `10` at position 5 is the first value big enough, so it settles on `5`. Stepping back one gives `4`, the last `8`.

The answer is `[3, 4]`.

If the target had been `6`, the first search would have returned position `1`, which holds `7`, not `6`. The mismatch means the target is absent, so the answer would be `[-1, -1]`.

---

### The code

```python
class Solution:
    def searchRange(self, nums: list[int], target: int) -> list[int]:
        def first_at_least(x: int) -> int:
            low, high = 0, len(nums)
            while low < high:
                mid = (low + high) // 2
                if nums[mid] < x:
                    low = mid + 1
                else:
                    high = mid
            return low

        start = first_at_least(target)

        # check the end of the array first, or the lookup itself fails
        if start == len(nums) or nums[start] != target:
            return [-1, -1]

        # where target + 1 begins is one past where target ends
        return [start, first_at_least(target + 1) - 1]
```

---

### Time and space complexity

#### Time: $O(\log n)$

Two binary searches, each halving the range every step. Two logarithms is still a logarithm, since the constant in front does not change the shape.

The approach this replaces, one search plus walking outward to the edges, is $O(n)$ on an array like `[8, 8, 8, 8, 8]`, which is exactly the case the problem is testing for.

#### Space: $O(1)$

A few markers. The helper is a closure over `nums` rather than a copy of it.

---

### Remember this

Search for the edges rather than for the value. The first position is a lower-bound search for the target; the last is a lower-bound search for `target + 1`, minus one. Because a lower-bound search returns a position even when the value is absent, confirm the result, checking for the end of the array before reading it. $O(\log n)$ time, $O(1)$ space.
