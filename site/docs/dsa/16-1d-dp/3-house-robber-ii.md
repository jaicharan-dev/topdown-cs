---
id: 3-house-robber-ii
title: "213. House Robber II"
description: "Maximize loot from houses arranged in a circle by decomposing into two linear runs"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Circular Array Decomposition</span>

> **Problem Statement:** You are a professional robber planning to rob houses along a street, but this time all houses are arranged in a circle. That means the first house is the neighbor of the last house. Adjacent houses have a connected security system that triggers an alarm if two adjacent houses are robbed on the same night. Given an integer array `nums` representing the amount of money at each house, return the maximum amount of money you can rob tonight without alerting the police.

```text
Input:  nums = [2, 3, 2]
Output: 3
Explanation: You cannot rob house 1 (money = 2) and then rob house 3 (money = 2), because they are adjacent houses.
The maximum amount you can rob is 3 (by robbing house 2).
```

---

### The Intuitive Mental Model

In the linear House Robber problem, the ends of the street are independent. In a circular layout, the first house (`nums[0]`) and the last house (`nums[n - 1]`) are adjacent neighbors. Robbing both is illegal.

#### Brute Force: Recursive Exploration of Circular Constraints
A brute force approach would explore every valid subset of non-adjacent houses while enforcing that indices `0` and `n - 1` are never simultaneously selected. Because this branches exponentially without memoization, it incurs $O(2^n)$ time complexity.

#### Optimal Approach: Decomposing the Circle into Two Linear Passes
Instead of formulating complicated circular modulo recurrences, we can exploit a clean mutual exclusion:
1. **Case 1 (Exclude the last house):** Rob houses from index `0` to `n - 2`. Here, house `n - 1` is completely ignored, so house `0` can be chosen freely without violating adjacency.
2. **Case 2 (Exclude the first house):** Rob houses from index `1` to `n - 1`. Here, house `0` is ignored, so house `n - 1` can be chosen freely.

Both cases are identical to the standard linear House Robber problem. Running our linear solver on both subsets and taking the maximum guarantees the global optimum:

$$\text{ans} = \max(\text{nums}[0], \, \text{rob\_linear}(\text{nums}[:-1]), \, \text{rob\_linear}(\text{nums}[1:]))$$

#### Execution Walkthrough

Let us trace `nums = [2, 3, 2]` across both linear runs:

**Run 1: Exclude last house (`nums[0:2] = [2, 3]`)**

| House ($i$) | Money (`num`) | Rob (`num + rob1`) | Skip (`rob2`) | Decision (`new_rob`) | `rob1` | `rob2` |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | 2 | $2 + 0 = 2$ | 0 | $\max(2, 0) = 2$ | 0 | 2 |
| **1** | 3 | $3 + 0 = 3$ | 2 | $\max(3, 2) = 3$ | 2 | 3 |

*Result for Run 1:* 3

**Run 2: Exclude first house (`nums[1:3] = [3, 2]`)**

| House ($i$) | Money (`num`) | Rob (`num + rob1`) | Skip (`rob2`) | Decision (`new_rob`) | `rob1` | `rob2` |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 3 | $3 + 0 = 3$ | 0 | $\max(3, 0) = 3$ | 0 | 3 |
| **2** | 2 | $2 + 0 = 2$ | 3 | $\max(2, 3) = 3$ | 3 | 3 |

*Result for Run 2:* 3

Overall maximum: $\max(3, 3) = 3$.

---

### Step-by-Step Algorithm

1. **Handle Single House Base Case:** If `len(nums) == 1`, return `nums[0]` directly.
2. **Define Linear Solver Helper:** Construct a helper function that takes a range of houses and tracks `rob1 = 0` and `rob2 = 0`. For each house value, it updates `new_rob = max(num + rob1, rob2)`, then shifts `rob1 = rob2` and `rob2 = new_rob`.
3. **Execute Two Linear Passes:**
   - Run the helper over the prefix slice `nums[:-1]`.
   - Run the helper over the suffix slice `nums[1:]`.
4. **Return the Maximum:** Return `max(run1, run2)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two Linear Passes" default>

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        if len(nums) == 1:
            return nums[0]

        def rob_linear(houses: list[int]) -> int:
            rob1, rob2 = 0, 0
            for num in houses:
                new_rob = max(num + rob1, rob2)
                rob1 = rob2
                rob2 = new_rob
            return rob2

        return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))
```

  </TabItem>
  <TabItem value="pointers" label="Alternative: Index Pointers (O(1) Space)">

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        if len(nums) == 1:
            return nums[0]

        def rob_range(start: int, end: int) -> int:
            rob1, rob2 = 0, 0
            for i in range(start, end):
                new_rob = max(nums[i] + rob1, rob2)
                rob1 = rob2
                rob2 = new_rob
            return rob2

        n = len(nums)
        return max(rob_range(0, n - 1), rob_range(1, n))
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Explores valid non-adjacent circular subsets with exponential overhead. |
| **Two Sliced Passes** | $O(n)$ | $O(n)$ | Runs two linear sweeps using array slices `nums[:-1]` and `nums[1:]`. |
| **Index-Bounded DP** | $O(n)$ | $O(1)$ | Passes index boundaries into a helper to achieve pure constant auxiliary space. |

---

### Common Pitfall: Forgetting the Single House Base Case

If the input array contains only one house (such as `nums = [7]`), slicing `nums[:-1]` and `nums[1:]` produces two empty lists `[]`. Both linear runs return 0 instead of 7. Always include an early guard `if len(nums) == 1: return nums[0]` before running the split passes.

---

### Concise Interview Takeaway

A circular adjacency condition simply means you cannot select both the first and the last element together. Decomposing the cycle into two linear subproblems (one omitting the first house, one omitting the last house) allows you to reuse the standard House Robber solution, maintaining $O(n)$ time and $O(1)$ space.
