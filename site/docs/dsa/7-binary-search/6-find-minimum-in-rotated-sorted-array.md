---
id: 6-find-minimum-in-rotated-sorted-array
title: "153. Find Minimum in Rotated Sorted Array"
description: "Compare the middle with the last element to learn which side the wrap is on"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Rotated Array</span>

> **Problem Statement:** A sorted array of distinct numbers has been rotated some number of times, so it now climbs, drops once, then climbs again. Find its smallest value in $O(\log n)$ time.

```text
Input:  nums = [4, 5, 6, 7, 0, 1, 2]
Output: 0
```

---

### Picture it

A rotated sorted array has exactly one place where it stops climbing:

```text
4, 5, 6, 7, 0, 1, 2
            ^
            the one drop, and the smallest value sits just after it
```

Find the drop and you have found the minimum. The array is not sorted overall, but it is made of two sorted runs, and the minimum is the first element of the second run.

So each step has to answer one question: is the drop to the left of the middle, or to the right?

---

### How to think about it

Compare the middle element with the **last** element of the current range.

- **The middle is bigger than the last.** The middle is still up on the first, higher run, and the drop has to be somewhere after it. The minimum lies strictly to the right, so `low` moves past the middle.
- **The middle is not bigger than the last.** The middle is already down on the second, lower run. The minimum is at the middle or before it, so `high` becomes the middle and the middle stays in play.

When the markers meet, they are on the minimum.

**Why compare against the last element and not the first?** Because comparing against the first is ambiguous. In an array that was never effectively rotated, like `[1, 2, 3, 4, 5]`, the middle is bigger than the first element, which looks exactly like the rotated case even though the minimum is at the very start. Comparing against the last element has no such blind spot: in a sorted run the middle is always smaller than the last, which correctly sends the search leftward.

That makes a fully sorted array fall out as an ordinary case rather than needing special handling.

---

### Walking through the example

Take `nums = [4, 5, 6, 7, 0, 1, 2]`, with the range covering positions `0` to `6`.

1. **The middle is position 3, holding `7`.** The last element in range is `2`. Seven is bigger, so the middle is on the high run and the drop is to the right. The range becomes `4` to `6`.
2. **The middle is position 5, holding `1`.** The last is `2`. One is not bigger, so the middle is on the low run. Keep it: the range becomes `4` to `5`.
3. **The middle is position 4, holding `0`.** The last in range is `1`. Not bigger, so the range becomes `4` to `4`.

The markers meet at position `4`, which holds `0`.

---

### The code

```python
class Solution:
    def findMin(self, nums: list[int]) -> int:
        low, high = 0, len(nums) - 1

        while low < high:
            mid = (low + high) // 2

            # bigger than the last value means the drop is still ahead
            if nums[mid] > nums[high]:
                low = mid + 1
            else:
                high = mid

        return nums[low]
```

---

### Time and space complexity

#### Time: $O(\log n)$

One comparison discards half the range every step.

#### Space: $O(1)$

Two markers and a midpoint.

---

### Remember this

A rotated sorted array drops exactly once, and the minimum sits right after the drop. Compare the middle against the **last** element of the range: bigger means the drop is to the right, otherwise the minimum is at the middle or left of it. Comparing against the first element instead cannot tell a rotated array from an unrotated one. $O(\log n)$ time, $O(1)$ space.
