---
id: 2-search-insert-position
title: "35. Search Insert Position"
description: "Binary search lower-bound pointer invariant for array insertion"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Lower Bound</span>

> **Problem Statement:** Given a sorted array of distinct integers `nums` and a target value `target`, return the index if `target` is found. If not, return the index where it would be placed if it were inserted in sorted order. You must write an algorithm with $O(\log n)$ runtime complexity.

```text
Input:  nums = [1, 3, 5, 6], target = 2
Output: 1
Explanation: 2 is not found in nums, but inserting it at index 1 maintains sorted order: [1, 2, 3, 5, 6].
```

---

### The Intuitive Mental Model

This problem is standard binary search with an essential property: what happens when the target is not in the array?

Imagine slotting a new book into an alphabetically organized bookshelf. Throughout binary search, you maintain a candidate window `[low, high]`. When the loop finishes without finding an exact match, the pointers cross, and the left pointer lands precisely where the element should be inserted.

#### Brute Force: Linear Scan
Iterate through the array from left to right until finding the first element greater than or equal to `target`. If no such element exists, the target belongs at the very end (`len(nums)`). While intuitive, this approach takes $O(n)$ time in the worst case.

#### Optimal Approach: Lower Bound Binary Search
Maintain two pointers `low` and `high`. At each step, test the midpoint `mid`:
- If `nums[mid] == target`, return `mid` immediately.
- If `nums[mid] < target`, the target must be placed to the right: set `low = mid + 1`. This guarantees every element to the left of `low` is strictly smaller than `target`.
- If `nums[mid] > target`, the target must be placed to the left: set `high = mid - 1`. This guarantees every element to the right of `high` is strictly greater than `target`.

When `low > high`, the search window has closed. The pointers have crossed, and `low` points to the first element strictly greater than `target` (or `len(nums)` if `target` exceeds all elements). Inserting at index `low` preserves sorted order.

#### Execution Walkthrough

Let us trace `nums = [1, 3, 5, 6]` with `target = 2`:

| Step | `low` | `high` | `mid` | `nums[mid]` | Comparison | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `3` | `1` | `3` | `3 > 2` | Target is to the left: `high = mid - 1` | `[0, 0]` |
| **2** | `0` | `0` | `0` | `1` | `1 < 2` | Target is to the right: `low = mid + 1` | Terminate (`low > high`) |

At termination, `low = 1` and `high = 0`. The algorithm returns `low = 1`, the exact insertion index.

---

### Step-by-Step Algorithm

1. **Initialize Search Bounds:** Set `low = 0` and `high = len(nums) - 1`.
2. **Execute Binary Search:** While `low <= high`:
   - Compute midpoint: `mid = low + (high - low) // 2`.
   - If `nums[mid] == target`, the value already exists: return `mid`.
   - If `nums[mid] < target`, shift right: `low = mid + 1`.
   - If `nums[mid] > target`, shift left: `high = mid - 1`.
3. **Return Lower Bound Index:** When `low > high`, return `low`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Lower Bound Binary Search" default>

```python
class Solution:
    def searchInsert(self, nums: list[int], target: int) -> int:
        low, high = 0, len(nums) - 1

        while low <= high:
            mid = low + (high - low) // 2

            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                low = mid + 1
            else:
                high = mid - 1

        # Invariant: when low > high, low points precisely to the lower bound
        # (the first element >= target, or len(nums) if target is the largest).
        return low
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Linear Scan">

```python
class Solution:
    def searchInsert(self, nums: list[int], target: int) -> int:
        for i, val in enumerate(nums):
            if val >= target:
                return i
        return len(nums)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Scan** | $O(n)$ | $O(1)$ | Scans sequentially until finding an element $\ge \text{target}$. Avoids binary search logic, but takes linear time. |
| **Lower Bound Binary Search** | $O(\log n)$ | $O(1)$ | Halves candidate range each step. Relies on the pointer crossover invariant to return the insertion index in logarithmic time. |

---

### Common Pitfall: Returning high Instead of low

A frequent mistake is returning `high` instead of `low` upon loop termination. When `low <= high` terminates, `high` has decremented past `low`, pointing to the last element strictly smaller than `target`. Returning `high` produces an off-by-one index (or `-1` if the target is smaller than every element). The correct insertion index is always `low`.

---

### Concise Interview Takeaway

When binary search terminates without an exact match, the pointers cross such that `low > high`. At that exact moment, `low` points to the first element strictly greater than `target` (or the length of the array), making `low` the natural insertion position.
