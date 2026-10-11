---
id: 2-house-robber
title: "198. House Robber"
description: "Maximize loot from non-adjacent houses using 1D dynamic programming in O(1) space"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Space Optimization</span>

> **Problem Statement:** You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, represented by an integer array `nums`. Adjacent houses have security systems connected, and it will automatically contact the police if two adjacent houses are broken into on the same night. Return the maximum amount of money you can rob tonight without alerting the police.

```text
Input:  nums = [2, 7, 9, 3, 1]
Output: 12
Explanation: Rob house 1 (money = 2), rob house 3 (money = 9), and rob house 5 (money = 1).
Total amount you can rob = 2 + 9 + 1 = 12.
```

---

### The Intuitive Mental Model

Imagine walking down the street house by house. When you arrive at house $i$, you face a clear binary choice:

1. **Rob house $i$:** You collect the cash at house $i$, but the security alarm forbids you from robbing house $i - 1$. Therefore, your total loot is $\text{nums}[i]$ plus the maximum loot accumulated up through house $i - 2$.
2. **Skip house $i$:** You leave house $i$ untouched. In this case, your total loot remains equal to the best total you could have gathered up through house $i - 1$.

#### Brute Force: Recursive Decision Tree
Exploring both branches (rob or skip) at every house generates a binary tree of depth $n$. Without memoization, many prefixes are recomputed repeatedly, causing the runtime to scale exponentially as $O(2^n)$.

#### Optimal Approach: Bottom-Up Dynamic Programming
By computing the maximum loot sequentially from the first house to the last, we formulate the recurrence:

$$\text{dp}[i] = \max(\text{nums}[i] + \text{dp}[i - 2], \, \text{dp}[i - 1])$$

Notice that calculating $\text{dp}[i]$ only requires the results of the immediate two preceding houses. Rather than allocating an array of size $n$, we can maintain two running scalar values:
- `rob1`: Maximum loot accumulated up to house $i - 2$.
- `rob2`: Maximum loot accumulated up to house $i - 1$.

At each house, we compute the new maximum, shift `rob1` forward to `rob2`, and assign the new maximum to `rob2`.

#### Execution Walkthrough

Let us trace `nums = [2, 7, 9, 3, 1]`:

| House ($i$) | Money (`num`) | Rob Current (`num + rob1`) | Skip Current (`rob2`) | Decision (`new_rob`) | New `rob1` | New `rob2` |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial** | - | - | - | - | 0 | 0 |
| **0** | 2 | $2 + 0 = 2$ | 0 | $\max(2, 0) = 2$ | 0 | 2 |
| **1** | 7 | $7 + 0 = 7$ | 2 | $\max(7, 2) = 7$ | 2 | 7 |
| **2** | 9 | $9 + 2 = 11$ | 7 | $\max(11, 7) = 11$ | 7 | 11 |
| **3** | 3 | $3 + 7 = 10$ | 11 | $\max(10, 11) = 11$ | 11 | 11 |
| **4** | 1 | $1 + 11 = 12$ | 11 | $\max(12, 11) = 12$ | 11 | 12 |

After scanning all houses, `rob2` holds the optimal loot of 12.

---

### Step-by-Step Algorithm

1. **Initialize State Trackers:** Create two scalar variables, `rob1 = 0` and `rob2 = 0`, representing optimal loot up to two houses prior and one house prior, respectively.
2. **Iterate Across Houses:** Loop through each value `num` in `nums`:
   - Compute `new_rob = max(num + rob1, rob2)`.
   - Update `rob1 = rob2`.
   - Update `rob2 = new_rob`.
3. **Return Maximum Loot:** When the iteration terminates, return `rob2`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized DP" default>

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        rob1, rob2 = 0, 0

        # rob1: max money robbing up to house i - 2
        # rob2: max money robbing up to house i - 1
        for num in nums:
            new_rob = max(num + rob1, rob2)
            rob1 = rob2
            rob2 = new_rob

        return rob2
```

  </TabItem>
  <TabItem value="tabulation" label="Alternative: 1D Tabulation Array">

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        if not nums:
            return 0
        if len(nums) == 1:
            return nums[0]

        n = len(nums)
        dp = [0] * n
        dp[0] = nums[0]
        dp[1] = max(nums[0], nums[1])

        for i in range(2, n):
            dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])

        return dp[-1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Evaluates all rob/skip subsets recursively without caching overlapping subproblems. |
| **1D Tabulation** | $O(n)$ | $O(n)$ | Stores max loot for each prefix of houses in a DP array of length $n$. |
| **Space-Optimized DP** | $O(n)$ | $O(1)$ | Tracks only the preceding two maximums (`rob1` and `rob2`) in constant memory. |

---

### Common Pitfall: Greedy Selection by Local Maximum

A greedy strategy that selects the highest available number or alternates strictly between even and odd indices often fails. For example, in `[2, 1, 1, 2]`, picking even indices yields $2 + 1 = 3$, and picking odd indices yields $1 + 2 = 3$. The optimal choice skips both middle houses to rob the ends for $2 + 2 = 4$. Dynamic programming is necessary because local decisions cannot evaluate global trade-offs.

---

### Concise Interview Takeaway

At each house, the choice boils down to robbing the house alongside the best loot from two steps back, or skipping it to keep the best loot up to the adjacent house. Because each decision depends strictly on the two preceding results, tracking two scalar variables yields an optimal $O(n)$ time and $O(1)$ space solution.
