---
id: 4-move-zeroes
title: "283. Move Zeroes"
description: "In-place zero-bubble rolling via reader-writer pointer swapping"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Slow & Fast Pointers</span>

> **Problem Statement:** Given an integer array `nums`, move all `0`'s to the end of it while maintaining the relative order of the non-zero elements. You must do this in-place without making a copy of the array.

```text
Input:  nums = [0, 1, 0, 3, 12]
Output: [1, 3, 12, 0, 0]
Explanation: All zeroes are moved to the end while preserving the relative ordering of non-zero elements (1, 3, 12).
```

---

### The Intuitive Mental Model

Imagine pushing a snow shovel down a walkway. As you move forward, the shovel rolls all accumulated snow (the zeroes) ahead of it, leaving a clean cleared path (the non-zero numbers) behind.

#### Brute Force: Auxiliary Array or Two-Pass Overwrite
A simple approach copies all non-zero elements into a new list, pads the remaining positions with zeros, and overwrites `nums`. This requires $O(n)$ auxiliary space, violating the in-place requirement.

Alternatively, a two-pass in-place method writes all non-zero elements to `nums[0..k-1]` in the first pass, and then writes zeroes from index `k` to `len(nums) - 1` in a second pass. While this achieves $O(1)$ space, it requires two complete traversals and redundant writes.

#### Optimal Approach: One-Pass Two-Pointer Swap
We can solve the problem in a single pass using two pointers:
- **Write Pointer `insert_pos` (Slow):** Marks the start of the zero partition where the next non-zero number should land.
- **Read Pointer `i` (Fast):** Scans the entire array from left to right.

When `nums[i] != 0`, we swap `nums[insert_pos]` with `nums[i]` and advance `insert_pos += 1`.
- Before the first zero appears, `insert_pos` equals `i`, so each non-zero element swaps with itself.
- Once a zero is encountered, `insert_pos` pauses at that zero while `i` continues forward.
- The next time `nums[i]` finds a non-zero, swapping it with `nums[insert_pos]` shifts the non-zero forward and kicks the zero backward.

This continually rolls the zero partition toward the end of the array while maintaining the original sequence of non-zero numbers.

#### Execution Walkthrough

Let us trace `nums = [0, 1, 0, 3, 12]`:

| Step | Fast Pointer `i` | Current `nums[i]` | Slow Pointer `insert_pos` | Action Taken | Array State (`nums`) |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **Start** | `-` | `-` | `0` | Initial state | `[0, 1, 0, 3, 12]` |
| **1** | `0` | `0` | `0` | Zero encountered; keep `insert_pos = 0` | `[0, 1, 0, 3, 12]` |
| **2** | `1` | `1` | `0` | Non-zero; swap `nums[0]` and `nums[1]`, `insert_pos -> 1` | `[1, 0, 0, 3, 12]` |
| **3** | `2` | `0` | `1` | Zero encountered; keep `insert_pos = 1` | `[1, 0, 0, 3, 12]` |
| **4** | `3` | `3` | `1` | Non-zero; swap `nums[1]` and `nums[3]`, `insert_pos -> 2` | `[1, 3, 0, 0, 12]` |
| **5** | `4` | `12` | `2` | Non-zero; swap `nums[2]` and `nums[4]`, `insert_pos -> 3` | `[1, 3, 12, 0, 0]` |

---

### Step-by-Step Algorithm

1. **Initialize Slow Pointer:** Set `insert_pos = 0` to track the boundary of the non-zero partition.
2. **Scan Array with Fast Pointer:** Iterate `i` from `0` to `len(nums) - 1`.
3. **Swap on Non-Zero:** If `nums[i] != 0`:
   - Swap `nums[insert_pos]` with `nums[i]`.
   - Increment `insert_pos += 1`.
4. **Advance Fast Pointer:** Continue scanning until `i` reaches the end of the array. All non-zero elements are now clustered at the front, and all zeros reside at the tail.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: One-Pass Swap" default>

```python
class Solution:
    def moveZeroes(self, nums: list[int]) -> None:
        """
        Do not return anything, modify nums in-place instead.
        """
        insert_pos = 0

        # Scan through the array with fast pointer i
        for i in range(len(nums)):
            # Whenever a non-zero element is discovered, swap it into insert_pos
            if nums[i] != 0:
                nums[insert_pos], nums[i] = nums[i], nums[insert_pos]
                insert_pos += 1
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Two-Pass Overwrite">

```python
class Solution:
    def moveZeroes(self, nums: list[int]) -> None:
        """
        Do not return anything, modify nums in-place instead.
        """
        insert_pos = 0

        # Pass 1: Shift all non-zero values forward
        for num in nums:
            if num != 0:
                nums[insert_pos] = num
                insert_pos += 1

        # Pass 2: Fill remaining positions with zeros
        while insert_pos < len(nums):
            nums[insert_pos] = 0
            insert_pos += 1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pass Overwrite** | $O(n)$ | $O(1)$ | Performs two sequential iterations: shifts non-zero values first, then overwrites trailing slots with zeros. |
| **One-Pass Swap** | $O(n)$ | $O(1)$ | Migrates non-zero elements forward and rolls zeros backward in a single pass without redundant writes. |

---

### Common Pitfall: Direct Overwrite Without Trailing Zero Fill

If you overwrite `nums[insert_pos] = nums[i]` without swapping, you duplicate non-zero values forward while leaving the original values in place at the back. For example, `[0, 1, 0, 3, 12]` would become `[1, 3, 12, 3, 12]`. Overwriting requires an explicit second loop to zero out the remainder of the array. The swap approach avoids this entirely by preserving elements and naturally moving zeros to the back in one pass.

---

### Concise Interview Takeaway

For **Move Zeroes**, maintain a slow write pointer `insert_pos` and iterate with a fast pointer `i`. Whenever the fast pointer discovers a non-zero element, swap `nums[insert_pos]` with `nums[i]` and advance `insert_pos`. This pushes zeros toward the end while preserving the relative ordering of non-zero numbers in a single $O(n)$ pass and $O(1)$ space.
