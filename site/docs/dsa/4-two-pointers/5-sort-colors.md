---
id: 5-sort-colors
title: "75. Sort Colors"
description: "Dijkstra's Dutch National Flag single-pass three-way partition"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dutch National Flag</span>

> **Problem Statement:** Given an array `nums` with $n$ objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue (`0`, `1`, and `2`). Solve this in a single pass without using library sorting functions.

```text
Input:  nums = [2, 0, 2, 1, 1, 0]
Output: [0, 0, 1, 1, 2, 2]
Explanation: The objects with colors 0 (red), 1 (white), and 2 (blue) are partitioned in-place into sorted order.
```

---

### The Intuitive Mental Model

We are sorting an array containing only three distinct keys (`0`, `1`, and `2`). 

#### Brute Force: Two-Pass Counting Sort
The most obvious approach counts frequencies:
- Pass 1: Count how many `0`s, `1`s, and `2`s are in `nums`.
- Pass 2: Overwrite `nums` with the counted number of `0`s, followed by `1`s, followed by `2`s.

This takes $O(n)$ time and $O(1)$ space, but requires two complete passes over the array. The challenge is to complete the sort in a single traversal.

#### Optimal Approach: Dijkstra's Dutch National Flag Algorithm
We partition the array into four regions using three pointers:
- **`[0 .. low-1]`:** Red zone (all `0`s)
- **`[low .. mid-1]`:** White zone (all `1`s)
- **`[mid .. high]`:** Unexplored territory (uninspected elements)
- **`[high+1 .. n-1]`:** Blue zone (all `2`s)

Pointer `mid` acts as our active inspector:
1. If `nums[mid] == 0`: Swap `nums[low]` and `nums[mid]`. Because the element at `low` was already inspected and guaranteed to be a `1`, we can safely advance both `low += 1` and `mid += 1`.
2. If `nums[mid] == 1`: The element belongs in the middle. Advance `mid += 1`.
3. If `nums[mid] == 2`: Swap `nums[mid]` and `nums[high]`, and decrement `high -= 1`. However, do not advance `mid`: the value brought in from `high` came from unexplored territory and must be evaluated on the next step.

When `mid > high`, all elements have been categorized.

#### Execution Walkthrough

Let us trace `nums = [2, 0, 2, 1, 1, 0]`:

| Step | `low` | `mid` | `high` | Current `nums[mid]` | Action Taken | Array State (`nums`) |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Start** | `0` | `0` | `5` | - | Initial pointer setup | `[2, 0, 2, 1, 1, 0]` |
| **1** | `0` | `0` | `5` | `2` | Swap `nums[0]` & `nums[5]`, `high -> 4` (keep `mid = 0`) | `[0, 0, 2, 1, 1, 2]` |
| **2** | `0` | `0` | `4` | `0` | Swap `nums[0]` & `nums[0]`, `low -> 1`, `mid -> 1` | `[0, 0, 2, 1, 1, 2]` |
| **3** | `1` | `1` | `4` | `0` | Swap `nums[1]` & `nums[1]`, `low -> 2`, `mid -> 2` | `[0, 0, 2, 1, 1, 2]` |
| **4** | `2` | `2` | `4` | `2` | Swap `nums[2]` & `nums[4]`, `high -> 3` (keep `mid = 2`) | `[0, 0, 1, 1, 2, 2]` |
| **5** | `2` | `2` | `3` | `1` | Middle element (`1`); advance `mid -> 3` | `[0, 0, 1, 1, 2, 2]` |
| **6** | `2` | `3` | `3` | `1` | Middle element (`1`); advance `mid -> 4` | `[0, 0, 1, 1, 2, 2]` |
| **End** | `2` | `4` | `3` | - | Loop terminates (`mid > high`) | `[0, 0, 1, 1, 2, 2]` |

---

### Step-by-Step Algorithm

1. **Initialize Three Pointers:** Set `low = 0`, `mid = 0`, and `high = len(nums) - 1`.
2. **Loop While `mid <= high`:**
   - **Case 0 (`nums[mid] == 0`):** Swap `nums[low]` and `nums[mid]`. Advance `low += 1` and `mid += 1`.
   - **Case 1 (`nums[mid] == 1`):** Keep element in place and advance `mid += 1`.
   - **Case 2 (`nums[mid] == 2`):** Swap `nums[mid]` and `nums[high]`. Decrement `high -= 1` (do not increment `mid`).
3. **Termination:** When `mid > high`, the array is sorted in-place in a single pass.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Dutch National Flag Partition" default>

```python
class Solution:
    def sortColors(self, nums: list[int]) -> None:
        """
        Do not return anything, modify nums in-place instead.
        """
        low = 0
        mid = 0
        high = len(nums) - 1

        while mid <= high:
            if nums[mid] == 0:
                # Swap into low boundary; previous element at low is known to be 1
                nums[low], nums[mid] = nums[mid], nums[low]
                low += 1
                mid += 1
            elif nums[mid] == 1:
                # 1 stays in middle region
                mid += 1
            else:
                # Swap into high boundary; element from high is uninspected
                nums[mid], nums[high] = nums[high], nums[mid]
                high -= 1
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Two-Pass Counting Sort">

```python
class Solution:
    def sortColors(self, nums: list[int]) -> None:
        """
        Do not return anything, modify nums in-place instead.
        """
        counts = [0, 0, 0]
        for num in nums:
            counts[num] += 1

        # Overwrite array with counts
        index = 0
        for color in range(3):
            for _ in range(counts[color]):
                nums[index] = color
                index += 1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pass Counting Sort** | $O(n)$ | $O(1)$ | Tallies counts and overwrites elements in a second pass. Easy to implement, but requires two full passes. |
| **Dutch National Flag** | $O(n)$ | $O(1)$ | Partitions the array into three zones simultaneously in a single pass in-place using three pointers. |

---

### Common Pitfall: Incrementing Mid After Swapping With High

A frequent mistake is executing `mid += 1` after swapping `nums[mid]` with `nums[high]`. When swapping with `low`, the incoming element is known to be `1` because `mid` had already inspected it earlier. In contrast, the element swapped in from `high` came from uninspected territory and could be `0`, `1`, or `2`. If you increment `mid`, that uninspected element is never evaluated, leaving the array incorrectly partitioned.

---

### Concise Interview Takeaway

For **Sort Colors**, apply Dijkstra's Dutch National Flag three-way partition. Use `low` for `0`s, `high` for `2`s, and `mid` to inspect. Advance `mid` after swapping with `low` (since the swapped item is guaranteed to be `1`), but keep `mid` stationary after swapping with `high` to evaluate the newly placed item. This completes the sort in a single $O(n)$ pass with $O(1)$ space.
