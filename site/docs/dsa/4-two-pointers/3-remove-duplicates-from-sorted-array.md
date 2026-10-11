---
id: 3-remove-duplicates-from-sorted-array
title: "26. Remove Duplicates from Sorted Array"
description: "Slow-fast read/write pointers for in-place array deduplication"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Slow & Fast Pointers</span>

> **Problem Statement:** Given an integer array `nums` sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in `nums`.

```text
Input:  nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
Output: 5, nums = [0, 1, 2, 3, 4, _, _, _, _, _]
Explanation: Your function should return k = 5, with the first five elements of nums being 0, 1, 2, 3, and 4 respectively. Elements beyond k do not matter.
```

---

### The Intuitive Mental Model

Because the array is already sorted in non-decreasing order, all duplicate instances of any number appear clustered together side-by-side.

#### Brute Force: Auxiliary Array or Set
The straightforward approach collects unique values into a separate collection:
- Iterate through `nums` and insert elements into a new list or hash set.
- Copy those elements back into the beginning of `nums`.

While this identifies unique items in $O(n)$ time, allocating an auxiliary collection uses $O(n)$ memory, violating the strict in-place constraint.

#### Optimal Approach: Slow and Fast Pointers
We can achieve in-place deduplication using two pointers moving in the same direction:
- **Write Pointer `w` (Slow):** Points to the next index where a newly discovered unique element should be written.
- **Read Pointer `r` (Fast):** Scans forward across the array to find transitions where a number changes.

The very first element `nums[0]` is guaranteed to be unique, so we leave it at index `0` and start `w = 1`. As `r` moves from index `1` to the end:
- If `nums[r] != nums[r - 1]`, we have encountered a new unique number.
- We copy `nums[r]` into `nums[w]` and advance `w += 1`.
- If `nums[r] == nums[r - 1]`, it is an adjacent duplicate, so we simply move `r` forward without advancing `w`.

Once `r` reaches the end, the first `w` slots contain all unique numbers in sorted order.

#### Execution Walkthrough

Let us trace `nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]`:

| Step | Read Index `r` | Current `nums[r]` | Previous `nums[r - 1]` | Is New Unique? | Action Taken | Prefix `nums[0:w]` |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Start** | `0` | `0` | None | Yes (Anchor) | Anchor `nums[0] = 0`, initialize `w = 1` | `[0]` |
| **1** | `1` | `0` | `0` | No | Duplicate detected; skip | `[0]` |
| **2** | `2` | `1` | `0` | Yes | Write `nums[1] = 1`, increment `w -> 2` | `[0, 1]` |
| **3** | `3` | `1` | `1` | No | Duplicate detected; skip | `[0, 1]` |
| **4** | `4` | `1` | `1` | No | Duplicate detected; skip | `[0, 1]` |
| **5** | `5` | `2` | `1` | Yes | Write `nums[2] = 2`, increment `w -> 3` | `[0, 1, 2]` |
| **6** | `6` | `2` | `2` | No | Duplicate detected; skip | `[0, 1, 2]` |
| **7** | `7` | `3` | `2` | Yes | Write `nums[3] = 3`, increment `w -> 4` | `[0, 1, 2, 3]` |
| **8** | `8` | `3` | `3` | No | Duplicate detected; skip | `[0, 1, 2, 3]` |
| **9** | `9` | `4` | `3` | Yes | Write `nums[4] = 4`, increment `w -> 5` | `[0, 1, 2, 3, 4]` |

The function returns `w = 5`. The first 5 elements of `nums` are `[0, 1, 2, 3, 4]`.

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `nums` is empty, return `0`.
2. **Initialize Write Pointer:** Set `w = 1`, since `nums[0]` is always the first unique value.
3. **Iterate Read Pointer:** Loop `r` from `1` through `len(nums) - 1`.
4. **Detect Value Change:** If `nums[r] != nums[r - 1]`:
   - Assign `nums[w] = nums[r]`.
   - Increment `w += 1`.
5. **Return Unique Count:** Return `w`, which represents the number of unique elements stored at the front.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Slow and Fast Pointers" default>

```python
class Solution:
    def removeDuplicates(self, nums: list[int]) -> int:
        if not nums:
            return 0

        # w marks the write position for the next unique element
        w = 1

        # r scans ahead to detect new unique values
        for r in range(1, len(nums)):
            if nums[r] != nums[r - 1]:
                nums[w] = nums[r]
                w += 1

        return w
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Auxiliary Array">

```python
class Solution:
    def removeDuplicates(self, nums: list[int]) -> int:
        if not nums:
            return 0

        unique_elements: list[int] = [nums[0]]
        for i in range(1, len(nums)):
            if nums[i] != nums[i - 1]:
                unique_elements.append(nums[i])

        # Write unique elements back into nums
        for i in range(len(unique_elements)):
            nums[i] = unique_elements[i]

        return len(unique_elements)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Auxiliary Array** | $O(n)$ | $O(n)$ | Allocates an extra list to collect unique elements before copying back. |
| **Slow and Fast Pointers** | $O(n)$ | $O(1)$ | Overwrites duplicates in-place during a single pass with zero extra memory allocations. |

---

### Common Pitfall: Comparing Against Unwritten Indices

A common bug occurs when trying to compare `nums[r]` against `nums[w]` instead of `nums[r - 1]` (or `nums[w - 1]`). Because `nums[w]` contains an old value that has not yet been overwritten, checking `nums[w]` leads to comparing against stale data. Comparing `nums[r]` with `nums[r - 1]` cleanly detects transitions between adjacent sorted duplicates.

---

### Concise Interview Takeaway

For **Remove Duplicates from Sorted Array**, use a slow write pointer and a fast read pointer. Since the array is sorted, duplicates are adjacent: whenever the fast pointer detects a new element different from its predecessor, write it to the slow pointer's position and increment. This achieves $O(n)$ time and $O(1)$ auxiliary space.
