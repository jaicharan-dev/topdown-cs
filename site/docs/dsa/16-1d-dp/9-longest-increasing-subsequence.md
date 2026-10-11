---
id: 9-longest-increasing-subsequence
title: "300. Longest Increasing Subsequence"
description: "Find longest strictly increasing subsequence using patience sorting with binary search in O(n log n)"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search / Patience Sorting</span>

> **Problem Statement:** Given an integer array `nums`, return the length of the longest strictly increasing subsequence. A subsequence is derived from an array by deleting some or no elements without changing the order of the remaining elements.

```text
Input:  nums = [10, 9, 2, 5, 3, 7, 101, 18]
Output: 4
Explanation: The longest increasing subsequence is [2, 3, 7, 101] (or [2, 3, 7, 18]), therefore the length is 4.
```

---

### The Intuitive Mental Model

An increasing subsequence selects elements in ascending order while preserving their relative ordering in the original array. Subsequences do not need to be contiguous.

#### Brute Force: Recursive Power Set
A brute force approach considers all $2^n$ subsequences, checking each one for the strictly increasing property and recording the maximum length. Because the decision tree branches twice for each element (include or exclude), this takes $O(2^n)$ time.

#### Optimal Approach: Patience Sorting with Binary Search
Instead of comparing against every prior element in $O(n^2)$ time, we can maintain an auxiliary array `tails`:
- `tails[i]` stores the smallest tail value among all valid strictly increasing subsequences of length $i + 1$ found so far.
- For each number `num` in `nums`:
  1. Use binary search (`bisect_left`) to locate the first entry in `tails` that is $\ge \text{num}$.
  2. If `num` is strictly greater than all elements in `tails`, append it. This means we have unlocked a strictly longer subsequence.
  3. Otherwise, overwrite `tails[idx] = num`. Lowering a tail value never shortens any achieved subsequence length, but it expands future opportunities for subsequent numbers to attach and extend the sequence.

At the conclusion of the loop, `len(tails)` equals the exact length of the longest increasing subsequence.

#### Execution Walkthrough

Let us trace `nums = [10, 9, 2, 5, 3, 7, 101, 18]`:

| Step | Element (`num`) | Insertion Index (`bisect_left`) | Action Taken | State of `tails` |
| :---: | :---: | :---: | :---: | :--- |
| **1** | 10 | 0 | Append 10 | `[10]` |
| **2** | 9 | 0 | Overwrite index 0 | `[9]` |
| **3** | 2 | 0 | Overwrite index 0 | `[2]` |
| **4** | 5 | 1 | Append 5 | `[2, 5]` |
| **5** | 3 | 1 | Overwrite index 1 | `[2, 3]` |
| **6** | 7 | 2 | Append 7 | `[2, 3, 7]` |
| **7** | 101 | 3 | Append 101 | `[2, 3, 7, 101]` |
| **8** | 18 | 3 | Overwrite index 3 | `[2, 3, 7, 18]` |

The length of `tails` is 4, matching the optimal subsequence length.

---

### Step-by-Step Algorithm

1. **Initialize Tails Tracker:** Create an empty list `tails = []`.
2. **Iterate Across Numbers:** For each number `num` in `nums`:
   - Find the insertion point using `idx = bisect_left(tails, num)`.
   - If `idx == len(tails)`, append `num` to `tails`.
   - Otherwise, replace `tails[idx] = num` with the smaller tail value.
3. **Return Answer:** Return `len(tails)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Patience Sorting (O(n log n))" default>

```python
from bisect import bisect_left

class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        tails: list[int] = []

        for num in nums:
            idx = bisect_left(tails, num)

            # If num is strictly greater than all tails, extend the length
            if idx == len(tails):
                tails.append(num)
            else:
                # Greedily replace the larger tail to optimize future extensions
                tails[idx] = num

        return len(tails)
```

  </TabItem>
  <TabItem value="dp" label="Alternative: 1D Dynamic Programming (O(n^2))">

```python
class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        if not nums:
            return 0

        n = len(nums)
        dp = [1] * n

        for i in range(1, n):
            for j in range(i):
                if nums[j] < nums[i]:
                    dp[i] = max(dp[i], 1 + dp[j])

        return max(dp)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Explores all $2^n$ subsequences to find the longest increasing one. |
| **1D Dynamic Programming** | $O(n^2)$ | $O(n)$ | Compares each element with all preceding elements using nested loops. |
| **Patience Sorting (Binary Search)** | $O(n \log n)$ | $O(n)$ | Maintains minimum tails for each length, updating in $O(\log n)$ via binary search. |

---

### Common Pitfall: Mistaking tails as the Actual Subsequence

A very common misunderstanding is assuming that the `tails` array contains the actual elements of the longest increasing subsequence. In reality, `tails` stores the smallest possible ending element for each subsequence length discovered so far. While its length accurately mirrors the length of the longest increasing subsequence, the elements inside `tails` might not form a valid subsequence in the original order. If the actual subsequence elements are needed, you must maintain backpointers.

---

### Concise Interview Takeaway

While an $O(n^2)$ dynamic programming approach checks all prior elements, patience sorting achieves an optimal $O(n \log n)$ runtime. By maintaining an array `tails` where each entry holds the minimal tail for that length, using binary search (`bisect_left`) tells you immediately whether to append a new maximum length or greedily lower an existing tail.
