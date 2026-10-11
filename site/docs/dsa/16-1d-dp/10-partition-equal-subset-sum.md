---
id: 10-partition-equal-subset-sum
title: "416. Partition Equal Subset Sum"
description: "Partition array into equal subsets using 0/1 knapsack dynamic programming"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">0/1 Knapsack</span>

> **Problem Statement:** Given an integer array `nums`, return `True` if you can partition the array into two subsets such that the sum of the elements in both subsets is equal, or `False` otherwise.

```text
Input:  nums = [1, 5, 11, 5]
Output: true
Explanation: The array can be partitioned as [1, 5, 5] and [11].
```

---

### The Intuitive Mental Model

To divide an array into two subsets of equal sum, the sum of each subset must equal exactly half of the total array sum:

$$\text{target} = \frac{\sum \text{nums}}{2}$$

From this definition, two key observations emerge:
1. **Odd Total Sum:** If the sum of all elements is odd, dividing it into two equal integer halves is mathematically impossible. Return `False` immediately.
2. **0/1 Knapsack Equivalence:** If the sum is even, the question becomes: can we select a subset of numbers that sums to exactly `target`? Each number may be chosen at most once.

#### Brute Force: Subset Sum Recursion
A brute force recursive search evaluates both choices (include or exclude) for every element in `nums`. Without memoization, this explores a binary decision tree of depth $n$, requiring exponential $O(2^n)$ time.

#### Optimal Approach: 0/1 Knapsack with Reverse Tabulation
We can define a boolean array `dp` of size $\text{target} + 1$, where `dp[s]` indicates whether a subset sum of $s$ is achievable.
- Base case: `dp[0] = True` because an empty subset trivially achieves a sum of 0.
- For each number `num` in `nums`, update achievable sums backwards from `target` down to `num`:

$$\text{dp}[s] = \text{dp}[s] \lor \text{dp}[s - \text{num}]$$

Iterating backwards is critical: it guarantees that `num` is only factored in once per outer loop, strictly preserving the 0/1 knapsack constraint without needing a 2D matrix.

#### Execution Walkthrough

Let us trace `nums = [1, 5, 11, 5]` with total = 22 and target = 11:

| Step | Processed Element (`num`) | Achievable Sums Updated ($s$) | Achievable Set State | Target Achieved? |
| :---: | :---: | :---: | :---: | :---: |
| **Initial** | - | Base case `dp[0] = True` | `{0}` | No |
| **1** | 1 | $s = 1$ ($1 - 1 = 0$) | `{0, 1}` | No |
| **2** | 5 | $s = 6, 5$ | `{0, 1, 5, 6}` | No |
| **3** | 11 | $s = 11$ ($11 - 11 = 0$) | `{0, 1, 5, 6, 11}` | **Yes** (`dp[11] == True`) |

The algorithm detects that `dp[11] == True` and returns `True` immediately.

---

### Step-by-Step Algorithm

1. **Calculate Sum and Check Parity:** Compute `total = sum(nums)`. If `total % 2 != 0`, return `False` immediately.
2. **Define Target:** Set `target = total // 2`.
3. **Initialize DP Table:** Create a boolean list `dp` of length `target + 1` filled with `False`. Set `dp[0] = True`.
4. **Iterate Across Numbers:** For each `num` in `nums`:
   - Traverse `s` in reverse order from `target` down to `num`:
     - Update `dp[s] = dp[s] or dp[s - num]`.
   - If `dp[target]` becomes `True`, return `True` early.
5. **Return Final Result:** Return `dp[target]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: 1D Space-Optimized DP" default>

```python
class Solution:
    def canPartition(self, nums: list[int]) -> bool:
        total = sum(nums)

        # An odd total cannot be partitioned into equal integer halves
        if total % 2 != 0:
            return False

        target = total // 2
        dp = [False] * (target + 1)
        dp[0] = True

        for num in nums:
            # Reverse traversal prevents using the same number multiple times
            for s in range(target, num - 1, -1):
                dp[s] = dp[s] or dp[s - num]

            if dp[target]:
                return True

        return dp[target]
```

  </TabItem>
  <TabItem value="set" label="Alternative: Reachable Sums Set">

```python
class Solution:
    def canPartition(self, nums: list[int]) -> bool:
        total = sum(nums)
        if total % 2 != 0:
            return False

        target = total // 2
        reachable: set[int] = {0}

        for num in nums:
            next_reachable = set(reachable)
            for s in reachable:
                if s + num == target:
                    return True
                if s + num < target:
                    next_reachable.add(s + num)
            reachable = next_reachable

        return target in reachable
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Explores all $2^n$ subsets without caching. |
| **Reachable Sums Set** | $O(n \times \text{target})$ | $O(\text{target})$ | Accumulates reachable sums in a Python set, fast in practice for sparse sums. |
| **1D Array DP** | $O(n \times \text{target})$ | $O(\text{target})$ | Updates boolean array in reverse order to enforce 0/1 knapsack with optimal cache locality. |

---

### Common Pitfall: Forward Iteration in 1D DP

When optimizing a 2D knapsack DP to a 1D array, iterating `s` forward from `num` up to `target` turns the problem into an unbounded knapsack. This happens because a number processed at index `s - num` could be reused again at index `s` within the same outer iteration. Iterating backwards from `target` down to `num` ensures that each element is factored in at most once.

---

### Concise Interview Takeaway

Partitioning into equal subsets is identical to finding a subset that sums to half the total array sum. An odd total sum immediately rules out an equal split. Reduce space from $O(n \times \text{target})$ to $O(\text{target})$ by iterating backwards across target sums, strictly enforcing that each number is selected at most once.
