---
id: 12-first-missing-positive
title: "41. First Missing Positive"
description: "In-place cyclic placement in O(n) time, O(1) space"
sidebar_position: 12
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">In-Place Array Hashing</span>

> **Problem Statement:** Given an unsorted integer array `nums`, return the smallest missing positive integer. You must implement an algorithm that runs in $O(n)$ time and uses $O(1)$ auxiliary space.

```text
Input:  nums = [3, 4, -1, 1]
Output: 2
Explanation: The positive numbers present are 1, 3, and 4. The smallest missing positive integer is 2.
```

---

### The Intuitive Mental Model

We seek the smallest missing positive integer ($1, 2, 3, \dots$).

For an array of size $n$, the theoretical maximum answer occurs when all values from $1$ to $n$ are present, yielding $n + 1$. Therefore, the answer is strictly bounded within the range $[1, n + 1]$. Any negative numbers, zeros, or values greater than $n$ cannot fill positions $[1, n]$ and can be disregarded.

#### Brute Force: Hash Set Lookups
Inserting all elements into a hash set allows checking whether $1, 2, 3, \dots$ exist in $O(1)$ time per query. While this achieves $O(n)$ time, it requires $O(n)$ auxiliary space, violating the strict $O(1)$ auxiliary memory requirement.

#### Optimal Approach: In-Place Cyclic Placement (Array as Hash Map)
Because the candidate numbers of interest are strictly between $1$ and $n$, the input array itself can act as a hash map where index `i` maps to value `i + 1`:
- Number `x` belongs at index `x - 1`.
- Iterate through `nums`: whenever `1 <= nums[i] <= n` and `nums[i] != nums[nums[i] - 1]`, swap `nums[i]` into its target index `nums[i] - 1`.
- Repeat swaps at the current index until the value is either correctly positioned, out of range, or a duplicate.
- In a second pass, locate the first index `i` where `nums[i] != i + 1`. If all indices $0 \dots n - 1$ are satisfied, return $n + 1$.

#### Execution Walkthrough

Let us trace `nums = [3, 4, -1, 1]` ($n = 4$):

| Step | Index `i` | Current `nums[i]` | Target Index (`nums[i] - 1`) | Action Taken | Array State |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` | `3` | `2` | Swap `nums[0]` with `nums[2]` | `[-1, 4, 3, 1]` |
| **2** | `0` | `-1` | None | Out of range, advance to `i = 1` | `[-1, 4, 3, 1]` |
| **3** | `1` | `4` | `3` | Swap `nums[1]` with `nums[3]` | `[-1, 1, 3, 4]` |
| **4** | `1` | `1` | `0` | Swap `nums[1]` with `nums[0]` | `[1, -1, 3, 4]` |
| **5** | `1` | `-1` | None | Out of range, advance to `i = 2` | `[1, -1, 3, 4]` |
| **6** | `2` | `3` | `2` | Already in correct position, advance | `[1, -1, 3, 4]` |
| **7** | `3` | `4` | `3` | Already in correct position, finish | `[1, -1, 3, 4]` |

Verification Pass:
- Index 0: `nums[0] = 1 == 0 + 1` (valid).
- Index 1: `nums[1] = -1 != 1 + 1 = 2` (missing positive found). Return `2`.

---

### Step-by-Step Algorithm

1. **Phase 1: In-Place Cyclic Placement:**
   - Iterate index `i` from `0` to `n - 1`.
   - While `1 <= nums[i] <= n` and `nums[nums[i] - 1] != nums[i]`:
     - Let `correct_idx = nums[i] - 1`.
     - Swap `nums[i]` with `nums[correct_idx]`.
2. **Phase 2: Linear Verification:**
   - Iterate index `i` from `0` to `n - 1`:
     - If `nums[i] != i + 1`, return `i + 1`.
3. **Phase 3: Fallback:**
   - If all indices contain their assigned values `1` through `n`, return `n + 1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place Cyclic Placement" default>

```python
class Solution:
    def firstMissingPositive(self, nums: list[int]) -> int:
        n = len(nums)
        
        # Phase 1: Place each valid number x at index x - 1
        for i in range(n):
            while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
                correct_idx = nums[i] - 1
                nums[i], nums[correct_idx] = nums[correct_idx], nums[i]
                
        # Phase 2: Find the first missing positive integer
        for i in range(n):
            if nums[i] != i + 1:
                return i + 1
                
        # Phase 3: All numbers from 1 to n are present
        return n + 1
```

  </TabItem>
  <TabItem value="hashset" label="Alternative: Hash Set Lookup">

```python
class Solution:
    def firstMissingPositive(self, nums: list[int]) -> int:
        num_set: set[int] = set(nums)
        n = len(nums)
        
        for i in range(1, n + 2):
            if i not in num_set:
                return i
                
        return 1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Hash Set Lookup** | $O(n)$ | $O(n)$ | Allocates a hash set of elements and checks $1 \dots n + 1$. Violates the $O(1)$ space constraint. |
| **In-Place Cyclic Placement** | $O(n)$ | $O(1)$ | Swaps elements into target indices $x - 1$. Each swap permanently places an element, achieving $O(n)$ time in $O(1)$ space. |

---

### Common Pitfall: Infinite Loops on Duplicate Elements

The cyclic sort condition must check `nums[nums[i] - 1] != nums[i]`, not `nums[i] != i + 1`. If an array contains duplicates of a valid number (e.g., `nums = [1, 1]`), checking only whether the current element is at its index causes the loop to perpetually swap identical values with each other, leading to an infinite loop. Checking if the destination already contains the correct value resolves duplicates safely.

---

### Concise Interview Takeaway

For **First Missing Positive**, observe that an array of size $n$ must contain the answer in the range $[1, n + 1]$. Use **Cyclic Sort** to swap each number $x \in [1, n]$ to index $x - 1$. Because each successful swap permanently positions at least one element, Phase 1 completes in $O(n)$ time. A second pass then checks for the first index where `nums[i] != i + 1` in $O(1)$ auxiliary space.
