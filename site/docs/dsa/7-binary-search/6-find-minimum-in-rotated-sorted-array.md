---
id: 6-find-minimum-in-rotated-sorted-array
title: "153. Find Minimum in Rotated Sorted Array"
description: "Binary search comparing mid to high to find the inflection point"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Rotated Array</span>

> **Problem Statement:** An array of unique integers sorted in ascending order is rotated between $1$ and $n$ times. Given this rotated sorted array `nums`, return the minimum element of the array. The algorithm must run in $O(\log n)$ time.

```text
Input:  nums = [4, 5, 6, 7, 0, 1, 2]
Output: 0
Explanation: The original sorted array was [0, 1, 2, 4, 5, 6, 7] rotated 4 times, with 0 as the minimum element.
```

---

### The Intuitive Mental Model

A rotated sorted array consists of two monotonically increasing sequences separated by a single sharp drop-off, known as the inflection point. The minimum element is positioned exactly at the bottom of this drop-off.

#### Brute Force: Linear Scan
Iterate across the array to find the smallest element. While simple, scanning every element ignores the sorted nature of both segments and incurs an $O(n)$ runtime.

#### Optimal Approach: Inflection Binary Search
To identify which half holds the drop-off, compare the midpoint `nums[mid]` with the rightmost boundary `nums[high]`:
- **`nums[mid] > nums[high]`:** The midpoint is part of the elevated left segment. Because it exceeds the right boundary, the drop-off must lie strictly to the right: `low = mid + 1`.
- **`nums[mid] <= nums[high]`:** The sequence from `mid` to `high` is increasing without interruption. Therefore, no drop-off exists to the right of `mid`. The minimum must be `mid` itself or lie to its left: `high = mid`.

By comparing against `nums[high]`, we preserve the minimum within `[low, high]` on every step until `low == high`.

#### Execution Walkthrough

Let us trace `nums = [4, 5, 6, 7, 0, 1, 2]`:

| Step | `low` | `high` | `mid` | `nums[mid]` | `nums[high]` | Comparison | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `6` | `3` | `7` | `2` | `7 > 2` | Drop is to the right: `low = mid + 1` | `[4, 6]` |
| **2** | `4` | `6` | `5` | `1` | `2` | `1 <= 2` | Min at mid or left: `high = mid` | `[4, 5]` |
| **3** | `4` | `5` | `4` | `0` | `1` | `0 <= 1` | Min at mid or left: `high = mid` | `[4, 4]` |

Both pointers converge at index `4`, correctly returning `nums[4] = 0`.

---

### Step-by-Step Algorithm

1. **Initialize Boundary Pointers:** Set `low = 0` and `high = len(nums) - 1`.
2. **Execute Inflection Search:** While `low < high`:
   - Compute midpoint: `mid = low + (high - low) // 2`.
   - If `nums[mid] > nums[high]`:
     - Midpoint is on the upper ramp; inflection is to the right: `low = mid + 1`.
   - Else (`nums[mid] <= nums[high]`):
     - Right segment is sorted; midpoint could be the minimum: `high = mid`.
3. **Return Minimum Element:** When `low == high`, the pointers point to the minimum. Return `nums[low]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Inflection Binary Search" default>

```python
class Solution:
    def findMin(self, nums: list[int]) -> int:
        low, high = 0, len(nums) - 1

        # Shrink until search window converges on a single element (low == high)
        while low < high:
            mid = low + (high - low) // 2

            if nums[mid] > nums[high]:
                # Mid is part of the higher plateau; min must be strictly to the right
                low = mid + 1
            else:
                # Right half is sorted; mid could be the minimum itself
                high = mid

        return nums[low]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Linear Scan">

```python
class Solution:
    def findMin(self, nums: list[int]) -> int:
        min_val = nums[0]
        for num in nums:
            if num < min_val:
                min_val = num
        return min_val
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Scan** | $O(n)$ | $O(1)$ | Checks every element sequentially. Straightforward, but fails to exploit the rotated sorted structure. |
| **Inflection Binary Search** | $O(\log n)$ | $O(1)$ | Compares midpoint against `high` to isolate the cliff. Converges to the global minimum in logarithmic time. |

---

### Common Pitfall: Comparing Against low Instead of high

Comparing `nums[mid]` against `nums[low]` is ambiguous when the array is already sorted (e.g. `[1, 2, 3, 4]`). In that case, `nums[mid] > nums[low]` holds, yet the minimum is at the very beginning, not the right half. Comparing against `nums[high]` provides a reliable invariant regardless of rotation magnitude.

---

### Concise Interview Takeaway

Compare `nums[mid]` to `nums[high]`: if `nums[mid] > nums[high]`, the cliff drop lies to the right (`low = mid + 1`); otherwise the right side is ordered, meaning the minimum is at `mid` or to its left (`high = mid`). This converges on the minimum in $O(\log n)$ time and $O(1)$ space.
