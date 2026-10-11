---
id: 1-climbing-stairs
title: "70. Climbing Stairs"
description: "Count distinct ways to climb stairs via Fibonacci recurrence in O(1) space"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Space Optimization</span>

> **Problem Statement:** You are climbing a staircase. It takes `n` steps to reach the top. Each time you can climb either 1 or 2 steps. In how many distinct ways can you climb to the top?

```text
Input:  n = 3
Output: 3
Explanation: There are three ways to climb to the top:
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step
```

---

### The Intuitive Mental Model

Imagine standing at the bottom of a staircase. To reach step `n`, consider the final move you could have made. Because you can only advance by 1 step or 2 steps at any point, your final jump must originate from either step $n - 1$ or step $n - 2$.

#### Brute Force: Recursive Decision Tree
A direct recursive model explores both branches from every step: take 1 step or take 2 steps. This forms a binary tree of decisions. Because the branches repeatedly solve identical subproblems (for example, computing step 3 from both step 4 and step 5 branches), the work explodes exponentially into $O(2^n)$ time, quickly timing out for modest values of $n$.

#### Optimal Approach: Bottom-Up State Compression
Since reaching step $n$ depends solely on reaching step $n - 1$ and step $n - 2$, the total distinct paths satisfy the recurrence:

$$\text{ways}(n) = \text{ways}(n - 1) + \text{ways}(n - 2)$$

This is identical to the Fibonacci sequence with shifted base conditions:
- Step 1: 1 way (`[1]`)
- Step 2: 2 ways (`[1, 1]`, `[2]`)
- Step 3: $1 + 2 = 3$ ways
- Step 4: $2 + 3 = 5$ ways
- Step 5: $3 + 5 = 8$ ways

Because computing step $n$ only requires the immediate two preceding results, we do not need to preserve a full $O(n)$ array. Storing two scalar pointers (`prev2` and `prev1`) collapses our space requirement to $O(1)$.

#### Execution Walkthrough

Let us trace the computation for $n = 5$:

| Step ($i$) | Ways from $i - 2$ (`prev2`) | Ways from $i - 1$ (`prev1`) | Computation (`current = prev1 + prev2`) | New `prev2` | New `prev1` |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial** | 1 (step 1) | 2 (step 2) | - | 1 | 2 |
| **3** | 1 | 2 | $1 + 2 = 3$ | 2 | 3 |
| **4** | 2 | 3 | $2 + 3 = 5$ | 3 | 5 |
| **5** | 3 | 5 | $3 + 5 = 8$ | 5 | 8 |

At the end of the loop, `prev1` holds 8, which is the total number of ways to reach step 5.

---

### Step-by-Step Algorithm

1. **Handle Small Base Cases:** If $n \le 2$, return $n$ immediately because 1 step has 1 path and 2 steps has 2 paths.
2. **Initialize Two Pointers:** Assign `prev2 = 1` for step 1 and `prev1 = 2` for step 2.
3. **Iterate Towards Goal:** Loop variable `_` from step 3 through $n$. At each step, compute `current = prev1 + prev2`, advance `prev2` to `prev1`, and advance `prev1` to `current`.
4. **Return Final Answer:** After exiting the loop, `prev1` holds the number of valid paths to step $n$.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized DP" default>

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n

        # prev2 represents ways(1), prev1 represents ways(2)
        prev2, prev1 = 1, 2

        for _ in range(3, n + 1):
            prev2, prev1 = prev1, prev2 + prev1

        return prev1
```

  </TabItem>
  <TabItem value="tabulation" label="Alternative: 1D Tabulation">

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n

        dp = [0] * (n + 1)
        dp[1] = 1
        dp[2] = 2

        for i in range(3, n + 1):
            dp[i] = dp[i - 1] + dp[i - 2]

        return dp[n]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Explores redundant binary branches without caching, leading to exponential runtime. |
| **1D Tabulation** | $O(n)$ | $O(n)$ | Caches every subproblem in an array of size $n + 1$ to guarantee linear runtime. |
| **Space-Optimized DP** | $O(n)$ | $O(1)$ | Tracks only the two most recent states, eliminating array allocation overhead entirely. |

---

### Common Pitfall: Off-by-One State Alignment

A frequent bug occurs when defining the boundary states. Some developers initialize with `dp[0] = 1` and `dp[1] = 1`, which correctly yields `dp[2] = 2`. However, shifting indices can introduce off-by-one errors in loop boundaries when working with 1-based indexing. Explicitly handling $n \le 2$ as an early guard clause removes ambiguity and guarantees that all variables correspond directly to actual steps.

---

### Concise Interview Takeaway

Reaching step $n$ requires jumping from either step $n - 1$ or step $n - 2$. Recognizing this Fibonacci recurrence lets you transition from an exponential $O(2^n)$ tree down to $O(n)$ time. Because computing the next state requires only the immediate two predecessors, two variables suffice, achieving optimal $O(1)$ space.
