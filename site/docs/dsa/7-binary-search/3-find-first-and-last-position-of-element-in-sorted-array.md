---
id: 3-find-first-and-last-position-of-element-in-sorted-array
title: "34. Find First and Last Position of Element in Sorted Array"
description: "Twin binary searches with directional bias for range queries"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Directional Bisect</span>

> **Problem Statement:** Given an array of integers `nums` sorted in non-decreasing order and a target value `target`, return the starting and ending indices of `target`. If `target` is not present, return `[-1, -1]`. The solution must run in $O(\log n)$ time.

```text
Input:  nums = [5, 7, 7, 8, 8, 10], target = 8
Output: [3, 4]
Explanation: The target 8 first appears at index 3 and last appears at index 4.
```

---

### The Intuitive Mental Model

Standard binary search stops immediately upon finding `nums[mid] == target`. However, when duplicates exist, the matched element could sit directly in the center of an extended run of identical values.

#### Brute Force: Linear Scan or Window Expansion
One intuitive approach is finding any match using binary search and then expanding outward to the left and right with pointers. However, if the array contains identical numbers such as `[8, 8, 8, 8, 8]`, expanding outward touches all $n$ elements, degrading the time complexity to $O(n)$ and violating the strict $O(\log n)$ requirement.

#### Optimal Approach: Twin Directional Binary Searches
Instead of terminating upon finding a match, record the match and continue searching:
- **Left Boundary Search:** Record `mid` as a candidate answer, then assume an earlier occurrence may exist to the left. Force the search leftward by setting `high = mid - 1`.
- **Right Boundary Search:** Record `mid` as a candidate answer, then assume a later occurrence may exist to the right. Force the search rightward by setting `low = mid + 1`.

By executing two independent binary searches with directional bias, both boundary indices are resolved in pure logarithmic time.

#### Execution Walkthrough

Let us trace `nums = [5, 7, 7, 8, 8, 10]` with `target = 8`:

| Pass | Step | `low` | `high` | `mid` | `nums[mid]` | Candidate `bound` | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Pass 1 (Find First)** | 1 | `0` | `5` | `2` | `7` | `-1` | `7 < 8`: move right (`low = 3`) |
| **Pass 1 (Find First)** | 2 | `3` | `5` | `4` | `8` | `4` | Match: record `bound = 4`, bias left (`high = 3`) |
| **Pass 1 (Find First)** | 3 | `3` | `3` | `3` | `8` | `3` | Match: record `bound = 3`, bias left (`high = 2`) |
| **Pass 2 (Find Last)** | 1 | `0` | `5` | `2` | `7` | `-1` | `7 < 8`: move right (`low = 3`) |
| **Pass 2 (Find Last)** | 2 | `3` | `5` | `4` | `8` | `4` | Match: record `bound = 4`, bias right (`low = 5`) |
| **Pass 2 (Find Last)** | 3 | `5` | `5` | `5` | `10` | `4` | `10 > 8`: move left (`high = 4`) |

Pass 1 terminates with `first = 3`, and Pass 2 terminates with `last = 4`. Combining both outputs produces `[3, 4]`.

---

### Step-by-Step Algorithm

1. **Define Directional Helper:** Construct a helper function `find_bound(find_first: bool) -> int`.
2. **Execute Boundary Search Loop:**
   - Initialize `low = 0`, `high = len(nums) - 1`, and `bound = -1`.
   - While `low <= high`:
     - Compute midpoint: `mid = low + (high - low) // 2`.
     - If `nums[mid] == target`, update `bound = mid`. If `find_first` is `True`, set `high = mid - 1` to search left; otherwise set `low = mid + 1` to search right.
     - If `nums[mid] < target`, set `low = mid + 1`.
     - If `nums[mid] > target`, set `high = mid - 1`.
   - Return `bound`.
3. **Execute and Combine:**
   - Call `first = find_bound(True)`.
   - If `first == -1`, return `[-1, -1]` immediately.
   - Call `last = find_bound(False)` and return `[first, last]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Twin Directional Binary Searches" default>

```python
class Solution:
    def searchRange(self, nums: list[int], target: int) -> list[int]:
        def find_bound(find_first: bool) -> int:
            low, high = 0, len(nums) - 1
            bound = -1

            while low <= high:
                mid = low + (high - low) // 2

                if nums[mid] == target:
                    bound = mid
                    # Bias direction: keep searching outward to find the outer edge
                    if find_first:
                        high = mid - 1  # Seek earlier occurrence to the left
                    else:
                        low = mid + 1   # Seek later occurrence to the right
                elif nums[mid] < target:
                    low = mid + 1
                else:
                    high = mid - 1

            return bound

        first = find_bound(True)
        # Early exit: if target is absent, right bound search is unnecessary
        if first == -1:
            return [-1, -1]

        last = find_bound(False)
        return [first, last]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Binary Search with Linear Expansion">

```python
class Solution:
    def searchRange(self, nums: list[int], target: int) -> list[int]:
        low, high = 0, len(nums) - 1
        found_idx = -1

        while low <= high:
            mid = low + (high - low) // 2
            if nums[mid] == target:
                found_idx = mid
                break
            elif nums[mid] < target:
                low = mid + 1
            else:
                high = mid - 1

        if found_idx == -1:
            return [-1, -1]

        left, right = found_idx, found_idx
        while left > 0 and nums[left - 1] == target:
            left -= 1
        while right < len(nums) - 1 and nums[right + 1] == target:
            right += 1

        return [left, right]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Expansion** | $O(n)$ | $O(1)$ | Finds one instance via binary search, then expands linearly. Degrades to $O(n)$ when duplicates dominate the array. |
| **Twin Directional Binary Searches** | $O(\log n)$ | $O(1)$ | Runs two logarithmic sweeps with left and right biases. Guarantees $O(\log n)$ performance regardless of duplicate density. |

---

### Common Pitfall: Linear Expansion Degradation

A common trap is locating an arbitrary match with binary search and expanding outward using while loops. If an array consists of millions of identical numbers equal to the target, the initial binary search completes in 20 steps, but the linear expansion takes millions of operations, degrading the solution to $O(n)$ and timing out on interview benchmarks.

---

### Concise Interview Takeaway

When duplicates exist in a sorted array, never stop upon finding `nums[mid] == target`. Record `mid` as a candidate and continue halving: bias left with `high = mid - 1` for the first occurrence, and bias right with `low = mid + 1` for the last. This guarantees strict $O(\log n)$ runtime in all cases.
