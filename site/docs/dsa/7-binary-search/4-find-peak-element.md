---
id: 4-find-peak-element
title: "162. Find Peak Element"
description: "Binary search on local slope direction to find a peak"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Slope Invariant</span>

> **Problem Statement:** A peak element is an element that is strictly greater than its adjacent neighbors. Given a 0-indexed integer array `nums`, find any peak element and return its index. You may imagine that `nums[-1] = nums[n] = -∞`. You must write an algorithm with $O(\log n)$ runtime complexity.

```text
Input:  nums = [1, 2, 1, 3, 5, 6, 4]
Output: 5
Explanation: Index 5 (value 6) is a peak element because nums[4] = 5 < 6 and nums[6] = 4 < 6. Index 1 (value 2) is also a valid peak.
```

---

### The Intuitive Mental Model

Binary search does not strictly require an entirely sorted array. It only requires a monotonic decision rule that guarantees a valid solution exists in one half.

#### Brute Force: Linear Scan
Iterate index by index from left to right and return the first element where `nums[i] > nums[i + 1]`. Because the boundary beyond the array drops to $-\infty$, the first element that stops climbing is guaranteed to be a peak. However, this sequential scan takes $O(n)$ time in the worst case.

#### Optimal Approach: Gradient-Driven Binary Search
Imagine hiking in dense mountain fog where you can only inspect your current position `mid` and the adjacent step to your right `mid + 1`:
- **Uphill Slope (`nums[mid] < nums[mid + 1]`):** You are climbing upward to the right. Because the boundary at index $n$ drops to $-\infty$, elevation cannot increase indefinitely without cresting, which guarantees at least one peak exists in the right half. Discard the left half: `low = mid + 1`.
- **Downhill Slope (`nums[mid] > nums[mid + 1]`):** The elevation drops to your right. That means your current position `mid` is already higher than `mid + 1`. Either `mid` itself is the peak, or a higher peak exists to the left. Discard elements strictly to the right while keeping `mid`: `high = mid`.

By repeatedly following the upward slope, you converge on a local maximum in logarithmic steps.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 1, 3, 5, 6, 4]`:

| Step | `low` | `high` | `mid` | `nums[mid]` | `nums[mid + 1]` | Slope Direction | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `6` | `3` | `3` | `5` | Ascending (`3 < 5`) | Move right: `low = mid + 1` | `[4, 6]` |
| **2** | `4` | `6` | `5` | `6` | `4` | Descending (`6 > 4`) | Move left: `high = mid` | `[4, 5]` |
| **3** | `4` | `5` | `4` | `5` | `6` | Ascending (`5 < 6`) | Move right: `low = mid + 1` | `[5, 5]` |

When `low == high == 5`, the loop terminates and index `5` is returned as a peak.

---

### Step-by-Step Algorithm

1. **Initialize Convergence Bounds:** Set `low = 0` and `high = len(nums) - 1`.
2. **Execute Gradient Binary Search:** While `low < high`:
   - Compute midpoint: `mid = low + (high - low) // 2`.
   - Compare `nums[mid]` with `nums[mid + 1]`:
     - If `nums[mid] < nums[mid + 1]`, slope ascends rightward: advance `low = mid + 1`.
     - Else (`nums[mid] > nums[mid + 1]`), slope descends rightward: set `high = mid` to preserve `mid` as a candidate peak.
3. **Return Converged Index:** When `low == high`, both pointers have converged on a peak. Return `low`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Gradient Binary Search" default>

```python
class Solution:
    def findPeakElement(self, nums: list[int]) -> int:
        low, high = 0, len(nums) - 1

        # Terminate when the window shrinks to a single element (low == high)
        while low < high:
            mid = low + (high - low) // 2

            if nums[mid] < nums[mid + 1]:
                # Climbing uphill to the right; peak must exist in the right half
                low = mid + 1
            else:
                # Downhill to the right; mid could be the peak or peak is to the left
                high = mid

        return low
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Linear Scan">

```python
class Solution:
    def findPeakElement(self, nums: list[int]) -> int:
        for i in range(len(nums) - 1):
            if nums[i] > nums[i + 1]:
                return i
        return len(nums) - 1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Scan** | $O(n)$ | $O(1)$ | Scans sequentially for the first downward slope. Avoids midpoint logic, but inspects up to $n$ elements. |
| **Gradient Binary Search** | $O(\log n)$ | $O(1)$ | Follows upward slope to eliminate half the array each step. Reaches a local peak in logarithmic time. |

---

### Common Pitfall: Discarding the Midpoint on Downhill Slopes

Setting `high = mid - 1` instead of `high = mid` when `nums[mid] > nums[mid + 1]` is a classic bug. If `nums[mid]` happens to be the peak itself, subtracting 1 completely discards the answer. Using `high = mid` preserves the candidate summit, while using the condition `while low < high` prevents infinite loops when `low` and `high` converge.

---

### Concise Interview Takeaway

Binary search does not require a sorted array, only a deterministic direction. Compare `nums[mid]` to `nums[mid + 1]`: if ascending, climb right (`low = mid + 1`); if descending, search left while preserving `mid` (`high = mid`). This converges on a local maximum in $O(\log n)$ time and $O(1)$ space.
