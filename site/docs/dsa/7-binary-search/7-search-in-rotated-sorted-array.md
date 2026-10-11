---
id: 7-search-in-rotated-sorted-array
title: "33. Search in Rotated Sorted Array"
description: "Single-pass binary search identifying the sorted half"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Rotated Array</span>

> **Problem Statement:** Given an integer array `nums` sorted in ascending order with distinct values, which has possibly been rotated at an unknown pivot index, and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not. The algorithm must run in $O(\log n)$ time.

```text
Input:  nums = [4, 5, 6, 7, 0, 1, 2], target = 0
Output: 4
Explanation: 0 is located at index 4 in the rotated array.
```

---

### The Intuitive Mental Model

In a rotated array, the global ordering is disrupted by a pivot cliff. However, a rotated sorted array possesses a key structural property: wherever you choose `mid`, at least one of the two resulting halves is guaranteed to be sorted in standard ascending order.

#### Brute Force: Two-Pass Pivot Search
First run a binary search to find the minimum pivot element, dividing the array into two sorted intervals. Then run a second binary search on the interval where the target belongs. While this achieves $O(\log n)$ runtime, it requires managing two separate binary searches, multiple boundary conditions, and redundant code.

#### Optimal Approach: Single-Pass Half-Identification
Instead of finding the pivot first, evaluate which half is normally sorted directly at each step:
- **Case 1: Left half is sorted (`nums[low] <= nums[mid]`):**
  Check if `target` falls inside the left half range: `nums[low] <= target < nums[mid]`.
  - If yes, the target is trapped inside the left segment: search left (`high = mid - 1`).
  - If no, the target can only exist in the right segment: search right (`low = mid + 1`).
- **Case 2: Right half is sorted (`nums[low] > nums[mid]`):**
  Check if `target` falls inside the right half range: `nums[mid] < target <= nums[high]`.
  - If yes, search right (`low = mid + 1`).
  - If no, search left (`high = mid - 1`).

This eliminates half of the search space on each iteration in a single unified loop.

#### Execution Walkthrough

Let us trace `nums = [4, 5, 6, 7, 0, 1, 2]` with `target = 0`:

| Step | `low` | `high` | `mid` | `nums[mid]` | Sorted Half | In Range? | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `6` | `3` | `7` | Left `[4..7]` | $0 \notin [4, 7)$ | Target in right half: `low = mid + 1` | `[4, 6]` |
| **2** | `4` | `6` | `5` | `1` | Left `[0..1]` | $0 \in [0, 1)$ | Target in left half: `high = mid - 1` | `[4, 4]` |
| **3** | `4` | `4` | `4` | `0` | - | $0 == 0$ | Match found! Return index `4` | `[4, 4]` |

---

### Step-by-Step Algorithm

1. **Initialize Search Bounds:** Set `low = 0` and `high = len(nums) - 1`.
2. **Execute Single-Pass Search:** While `low <= high`:
   - Compute midpoint: `mid = low + (high - low) // 2`.
   - If `nums[mid] == target`, return `mid`.
   - **Determine sorted half:**
     - If `nums[low] <= nums[mid]` (left half is sorted):
       - If `nums[low] <= target < nums[mid]`, target lies in the left half: `high = mid - 1`.
       - Else, target lies in the right half: `low = mid + 1`.
     - Else (right half is sorted):
       - If `nums[mid] < target <= nums[high]`, target lies in the right half: `low = mid + 1`.
       - Else, target lies in the left half: `high = mid - 1`.
3. **Return Fallback:** If `low > high`, return `-1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Single-Pass Binary Search" default>

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        low, high = 0, len(nums) - 1

        while low <= high:
            mid = low + (high - low) // 2

            if nums[mid] == target:
                return mid

            # Check if the left half is normally sorted
            if nums[low] <= nums[mid]:
                # Target lies within the sorted left half
                if nums[low] <= target < nums[mid]:
                    high = mid - 1
                else:
                    low = mid + 1
            # Otherwise, the right half must be normally sorted
            else:
                # Target lies within the sorted right half
                if nums[mid] < target <= nums[high]:
                    low = mid + 1
                else:
                    high = mid - 1

        return -1
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Two-Pass Pivot Search">

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Step 1: Find index of the minimum element (pivot)
        low, high = 0, len(nums) - 1
        while low < high:
            mid = low + (high - low) // 2
            if nums[mid] > nums[high]:
                low = mid + 1
            else:
                high = mid
        pivot = low

        # Step 2: Determine which sorted segment contains target
        if target >= nums[pivot] and target <= nums[-1]:
            low, high = pivot, len(nums) - 1
        else:
            low, high = 0, pivot - 1

        # Step 3: Standard binary search on that segment
        while low <= high:
            mid = low + (high - low) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                low = mid + 1
            else:
                high = mid - 1

        return -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pass Pivot Search** | $O(\log n)$ | $O(1)$ | Finds pivot first, then searches the appropriate segment. Clean conceptually, but requires two loops and more code. |
| **Single-Pass Binary Search** | $O(\log n)$ | $O(1)$ | Tests sorted half containment directly each iteration. Halves the search range in a single concise loop. |

---

### Common Pitfall: Non-Strict Inequality on Boundaries

When checking if `target` lies within the sorted half, forgetting the inclusive boundary is a frequent bug. For the left sorted half, the condition must be `nums[low] <= target < nums[mid]`. Because `nums[mid] == target` is already checked, the upper bound is strict (`<`). But the lower bound must be inclusive (`<=`), otherwise targets located exactly at `nums[low]` are skipped.

---

### Concise Interview Takeaway

At least one half of a rotated sorted array is always sorted. Determine which half is sorted using `nums[low] <= nums[mid]`, then check whether `target` falls between that half's endpoints. If so, search within it; otherwise, search the opposite half. This resolves searches in a single $O(\log n)$ pass with $O(1)$ space.
