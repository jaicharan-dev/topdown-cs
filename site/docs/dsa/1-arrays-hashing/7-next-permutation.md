---
id: 7-next-permutation
title: "31. Next Permutation"
description: "Find pivot, swap with next larger element, reverse the suffix"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Permutations</span>

> **Problem Statement:** A permutation of an array of integers is an arrangement of its numbers into a sequence. The next permutation is the next lexicographically greater permutation. Rearrange the numbers into the next greater permutation in place with $O(1)$ extra memory. If no greater permutation is possible, rearrange it as the lowest possible order (sorted in ascending order).

```text
Input:  nums = [1, 2, 3]
Output: [1, 3, 2]
Explanation: The lexicographically next greater permutation of [1, 2, 3] is [1, 3, 2].
```

---

### The Intuitive Mental Model

Think of the array as the digits of an integer: `[1, 2, 3]` corresponds to $123$. The immediate next larger number constructible with those digits is $132$. If the digits are sorted in descending order like `[3, 2, 1]` ($321$), it is already at its mathematical maximum, so it wraps around to the lowest possible ordering: `[1, 2, 3]` ($123$).

#### Brute Force: Generating All Permutations
Generating every possible permutation lexicographically, storing them in order, and finding the successor permutation takes $O(n \cdot n!)$ time and space. For an array of size $n = 100$, generating all permutations is computationally impossible.

#### Optimal Approach: Three-Step Pivot, Successor Swap, and Suffix Reversal
To achieve the minimal possible increase, we modify digits as far to the right as possible:
1. **Find Pivot ($i$):** Scan from right to left to locate the first position where `nums[i] < nums[i + 1]`. Any suffix to the right of $i$ is strictly non-increasing (at its local maximum).
2. **Find Successor ($j$) and Swap:** If a pivot exists, scan backwards from the end to find the smallest element strictly greater than `nums[i]`, and swap them.
3. **Minimize Suffix:** The suffix after index $i$ remains sorted descending. Reversing it in-place transforms it into ascending order, yielding the smallest possible suffix.

#### Execution Walkthrough

Let us trace `nums = [1, 3, 5, 4, 2]`:

| Step | Action | Details | Array State |
| :---: | :--- | :--- | :--- |
| **1** | Identify pivot | Scan right-to-left: $2 < 4 < 5$, but $3 < 5$. Pivot at index `1` (`nums[1] = 3`). | `[1, 3, 5, 4, 2]` |
| **2** | Find swap successor | Scan right-to-left for first element $> 3$: find `nums[3] = 4`. | `[1, 3, 5, 4, 2]` |
| **3** | Swap pivot and successor | Swap `nums[1]` (`3`) with `nums[3]` (`4`). | `[1, 4, 5, 3, 2]` |
| **4** | Reverse suffix | Reverse elements from index `2` to `4`: `[5, 3, 2]` becomes `[2, 3, 5]`. | `[1, 4, 2, 3, 5]` |

---

### Step-by-Step Algorithm

1. **Locate Pivot Index:** Initialize pointer `i = len(nums) - 2`. Decrement `i` while `i >= 0` and `nums[i] >= nums[i + 1]`.
2. **Swap with Successor (if pivot exists):**
   - If `i >= 0`, initialize pointer `j = len(nums) - 1`.
   - Decrement `j` until `nums[j] > nums[i]`.
   - Swap `nums[i]` and `nums[j]`.
3. **Reverse Suffix In-Place:** Initialize two pointers `left = i + 1` and `right = len(nums) - 1`. Swap elements at `left` and `right` while advancing `left` and decrementing `right` until they meet.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Three-Phase In-Place Scan" default>

```python
class Solution:
    def nextPermutation(self, nums: list[int]) -> None:
        """
        Do not return anything, modify nums in-place instead.
        """
        n = len(nums)
        i = n - 2
        
        # Step 1: Locate the first dip from the right
        while i >= 0 and nums[i] >= nums[i + 1]:
            i -= 1
            
        # Step 2: If pivot found, swap with next larger element from the right
        if i >= 0:
            j = n - 1
            while nums[j] <= nums[i]:
                j -= 1
            nums[i], nums[j] = nums[j], nums[i]
            
        # Step 3: Reverse suffix starting at i + 1 into ascending order
        left, right = i + 1, n - 1
        while left < right:
            nums[left], nums[right] = nums[right], nums[left]
            left += 1
            right -= 1
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Helper Functions">

```python
class Solution:
    def nextPermutation(self, nums: list[int]) -> None:
        n = len(nums)
        
        def reverse(start: int, end: int) -> None:
            while start < end:
                nums[start], nums[end] = nums[end], nums[start]
                start += 1
                end -= 1
                
        i = n - 2
        while i >= 0 and nums[i] >= nums[i + 1]:
            i -= 1
            
        if i < 0:
            reverse(0, n - 1)
            return
            
        j = n - 1
        while nums[j] <= nums[i]:
            j -= 1
            
        nums[i], nums[j] = nums[j], nums[i]
        reverse(i + 1, n - 1)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full Permutation Generation** | $O(n \cdot n!)$ | $O(n!)$ | Generates all permutations in sorted order. Impractical for any $n > 12$. |
| **Three-Phase In-Place Scan** | $O(n)$ | $O(1)$ | Traverses array at most twice and reverses suffix in place. Optimal linear time and constant auxiliary memory. |

---

### Common Pitfall: Non-Strict Inequality When Finding Successor

When scanning for the successor element `j` to swap with pivot `i`, the condition must strictly verify `nums[j] > nums[i]`. If duplicates exist (e.g., `[1, 5, 1]`), swapping duplicate equal values does not strictly advance the permutation. Furthermore, ensure the suffix reversal runs even when `i = -1` (entire array descending) to reset the array to ascending order.

---

### Concise Interview Takeaway

For **Next Permutation**, find the first right-to-left drop `nums[i] < nums[i + 1]`. If found, swap `nums[i]` with the smallest value to its right strictly greater than it (`nums[j]`). Finally, reverse the suffix from `i + 1` to the end to ensure the rearranged suffix is in minimal ascending order. All transformations execute in $O(n)$ time and $O(1)$ in-place auxiliary space.
