---
id: 4-find-peak-element
title: "162. Find Peak Element"
description: "Walk uphill: the slope under your feet says which side must hold a peak"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Slope Invariant</span>

> **Problem Statement:** A peak is an element bigger than both of its neighbours, with the area outside the array counting as negative infinity. Given an array, return the position of any peak. It has to run in $O(\log n)$ time.

```text
Input:  nums = [1, 2, 1, 3, 5, 6, 4]
Output: 5
```

---

### Picture it

The array is unsorted, so the usual reason binary search works does not apply. Something else does.

Stand at any position and look at the ground just to your right. The slope is either going up or going down.

**If it is going up**, start walking right. Either the climb continues until you reach the end of the array, where the drop to negative infinity makes the last element a peak, or it stops climbing somewhere along the way, and wherever it stops is a peak. Either way, a peak exists to your right.

**If it is going down**, the same argument runs leftward from where you stand, so a peak exists at your position or to its left.

Either answer discards half the array, which is all binary search needs. You never need a sorted array, only a guarantee about which half is worth keeping.

---

### How to think about it

Compare the middle element with its right-hand neighbour.

- **The neighbour is bigger**, so the slope rises. A peak lies strictly to the right, and `low` moves to just past the middle.
- **The neighbour is smaller**, so the slope falls. The middle itself might be the peak, so keep it: `high` becomes the middle.

Narrow until the markers meet, and that position is a peak.

This is the "hunting for a position" shape, so it uses `low < high` and `high = mid`, with no equality check at the end.

Reading `nums[mid + 1]` is safe because the loop runs only while `low` is strictly less than `high`, which guarantees the middle is never the last element.

The problem says to return *any* peak, which is what makes this legal. The array may hold several, and which one you land on depends on where the halving takes you. In the example, both position `1` and position `5` are peaks, and this walk finds `5`.

---

### Walking through the example

Take `nums = [1, 2, 1, 3, 5, 6, 4]`, with the range covering positions `0` to `6`.

1. **The middle is position 3, holding `3`.** Its right neighbour is `5`, which is bigger, so the slope rises and a peak lies to the right. The range becomes `4` to `6`.
2. **The middle is position 5, holding `6`.** Its right neighbour is `4`, which is smaller, so the slope falls. Position 5 stays a candidate and the range becomes `4` to `5`.
3. **The middle is position 4, holding `5`.** Its right neighbour is `6`, bigger, so the slope rises and `low` moves to `5`.

The markers meet at `5`, which holds `6`, with `5` on its left and `4` on its right. A genuine peak.

---

### The code

```python
class Solution:
    def findPeakElement(self, nums: list[int]) -> int:
        low, high = 0, len(nums) - 1

        while low < high:
            mid = (low + high) // 2

            # the ground rises to the right, so a peak must be over there
            if nums[mid] < nums[mid + 1]:
                low = mid + 1
            else:
                high = mid

        return low
```

---

### Time and space complexity

#### Time: $O(\log n)$

Half the range is discarded every step, on the strength of one comparison, so the number of steps is the logarithm of the array length.

#### Space: $O(1)$

Three numbers.

---

### Remember this

Binary search does not need a sorted array, only a reliable way to rule out half of it. Here the slope does that: rising ground guarantees a peak to the right, falling ground guarantees one at or before where you stand. Keep the middle when the slope falls, discard it when it rises, and the markers meet on a peak. $O(\log n)$ time, $O(1)$ space.
