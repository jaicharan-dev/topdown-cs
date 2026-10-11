---
id: 2-merge-sorted-array
title: "88. Merge Sorted Array"
description: "Reverse three-pointer merge utilizing the tail buffer"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Reverse Three Pointers</span>

> **Problem Statement:** You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order, and two integers `m` and `n`, representing the number of elements in `nums1` and `nums2` respectively. Merge `nums2` into `nums1` as one sorted array. The final sorted array should not be returned by the function, but instead be stored inside the array `nums1`. To accommodate this, `nums1` has a length of `m + n`, where the first `m` elements denote the elements that should be merged, and the last `n` elements are set to `0` and should be ignored.

```text
Input:  nums1 = [1, 2, 3, 0, 0, 0], m = 3, nums2 = [2, 5, 6], n = 3
Output: [1, 2, 2, 3, 5, 6]
Explanation: The arrays we are merging are [1, 2, 3] and [2, 5, 6]. The result of the merge is [1, 2, 2, 3, 5, 6] with the elements stored directly in nums1.
```

---

### The Intuitive Mental Model

When merging two sorted arrays into one, merging from the front causes collisions: writing a smaller element from `nums2` into `nums1[0]` would overwrite the original value before it can be placed. To prevent data loss, you would need an auxiliary copy of `nums1` ($O(m)$ space) or repeated shifts ($O(m \times n)$ time).

#### Brute Force: Overwrite and Sort
The naive alternative is appending `nums2` into the tail of `nums1` and sorting the combined array:
- Copy the $n$ elements of `nums2` directly into indices $m$ through $m + n - 1$.
- Call `nums1.sort()`.

While minimal code, this requires $O((m + n) \log(m + n))$ time, discarding the crucial fact that both arrays are already sorted.

#### Optimal Approach: Reverse Merge from the Tail
Notice that the end of `nums1` contains $n$ uninitialized buffer slots (filled with zeroes). These tail slots are completely safe to overwrite without losing any valid data.

Instead of smallest-to-largest from index `0`, we merge largest-to-smallest from the back:
- Place pointer `p1` at the last valid element of `nums1` (`m - 1`).
- Place pointer `p2` at the last element of `nums2` (`n - 1`).
- Place write pointer `p` at the very end of `nums1` (`m + n - 1`).
- Compare `nums1[p1]` with `nums2[p2]`. Write the larger element to `nums1[p]`, then decrement that array's pointer and `p`.
- Repeat until all elements of `nums2` are placed.

If `p2 < 0`, every element from `nums2` is already placed. Any remaining elements in `nums1` are already in their correct sorted positions at the front, so we can terminate immediately.

#### Execution Walkthrough

Let us trace `nums1 = [1, 2, 3, 0, 0, 0]`, `m = 3`, `nums2 = [2, 5, 6]`, `n = 3`:

| Step | `p1` (`nums1[p1]`) | `p2` (`nums2[p2]`) | `p` (Write Pos) | Larger Value | Action Taken | `nums1` State |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `2` (`3`) | `2` (`6`) | `5` | `6` (`nums2`) | Write `6` at `nums1[5]`, `p2 -> 1`, `p -> 4` | `[1, 2, 3, 0, 0, 6]` |
| **2** | `2` (`3`) | `1` (`5`) | `4` | `5` (`nums2`) | Write `5` at `nums1[4]`, `p2 -> 0`, `p -> 3` | `[1, 2, 3, 0, 5, 6]` |
| **3** | `2` (`3`) | `0` (`2`) | `3` | `3` (`nums1`) | Write `3` at `nums1[3]`, `p1 -> 1`, `p -> 2` | `[1, 2, 3, 3, 5, 6]` |
| **4** | `1` (`2`) | `0` (`2`) | `2` | `2` (`nums2`) | Write `2` at `nums1[2]`, `p2 -> -1`, `p -> 1` | `[1, 2, 2, 3, 5, 6]` |
| **End** | `1` (`2`) | `-1` (Done) | `1` | None | `p2 < 0`: elements in `nums1` already sorted | `[1, 2, 2, 3, 5, 6]` |

---

### Step-by-Step Algorithm

1. **Initialize Three Pointers:**
   - `p1 = m - 1`: Tracks the rightmost unprocessed element in `nums1`.
   - `p2 = n - 1`: Tracks the rightmost unprocessed element in `nums2`.
   - `p = m + n - 1`: Tracks the next insertion index from the tail of `nums1`.
2. **Loop While Elements Remain in `nums2`:** Continue as long as `p2 >= 0`.
3. **Compare and Insert:**
   - If `p1 >= 0` and `nums1[p1] > nums2[p2]`, assign `nums1[p] = nums1[p1]` and decrement `p1 -= 1`.
   - Otherwise, assign `nums1[p] = nums2[p2]` and decrement `p2 -= 1`.
4. **Advance Write Pointer:** Decrement `p -= 1`.
5. **Early Exit:** Once `nums2` is exhausted (`p2 < 0`), any remaining elements in `nums1` are already sorted at the beginning; the merge is complete.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Reverse Three Pointers" default>

```python
class Solution:
    def merge(self, nums1: list[int], m: int, nums2: list[int], n: int) -> None:
        """
        Do not return anything, modify nums1 in-place instead.
        """
        p1 = m - 1
        p2 = n - 1
        p = m + n - 1

        # We only need to place elements from nums2.
        # Any elements left in nums1 are already in their correct sorted slots.
        while p2 >= 0:
            if p1 >= 0 and nums1[p1] > nums2[p2]:
                nums1[p] = nums1[p1]
                p1 -= 1
            else:
                nums1[p] = nums2[p2]
                p2 -= 1
            p -= 1
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Overwrite and Sort">

```python
class Solution:
    def merge(self, nums1: list[int], m: int, nums2: list[int], n: int) -> None:
        """
        Do not return anything, modify nums1 in-place instead.
        """
        # Overwrite the trailing zeros with elements from nums2
        for i in range(n):
            nums1[m + i] = nums2[i]
            
        # Re-sort the combined array
        nums1.sort()
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Overwrite and Sort** | $O((m + n) \log(m + n))$ | $O(1)$ | Simple to write, but ignores existing sorted order and incurs higher logarithmic runtime. |
| **Reverse Three Pointers** | $O(m + n)$ | $O(1)$ | Merges elements directly into empty tail buffer slots in a single linear pass with zero extra allocations. |

---

### Common Pitfall: Redundant Copying of Remaining nums1 Elements

A common mistake is writing two separate cleanup loops: one for remaining `nums2` elements and another for remaining `nums1` elements. If `nums2` finishes first (`p2 < 0`), any unprocessed items in `nums1` are already in their proper positions at indices `0` through `p1`. Only unprocessed elements from `nums2` need to be copied. Stopping when `p2 < 0` simplifies the code and avoids redundant writes.

---

### Concise Interview Takeaway

For **Merge Sorted Array**, exploit the unused buffer space at the tail of `nums1` by merging backwards from index $m + n - 1$. Comparing elements from greatest to least prevents overwriting unprocessed values in `nums1`, giving an optimal $O(m + n)$ time and $O(1)$ auxiliary space solution.
