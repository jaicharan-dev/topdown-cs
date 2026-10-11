---
id: 11-perfect-squares
title: "279. Perfect Squares"
description: "Find least number of perfect squares summing to N using unbounded knapsack DP"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Knapsack</span>

> **Problem Statement:** Given an integer `n`, return the least number of perfect square numbers that sum to `n`. A perfect square is an integer that is the square of an integer (e.g., 1, 4, 9, 16, ...).

```text
Input:  n = 12
Output: 3
Explanation: 12 = 4 + 4 + 4.
```

---

### The Intuitive Mental Model

This problem is structurally identical to Coin Change, where the available coin denominations are all perfect square values less than or equal to $n$:

$$\text{squares} = [1, 4, 9, 16, \dots, \lfloor\sqrt{n}\rfloor^2]$$

Because greedy subtraction of the largest square can yield suboptimal results, we evaluate all possible square choices using Dynamic Programming.

#### Brute Force: Recursive Decomposition
A brute force recursive solver branches on every square $s \le n$, subtracting it from the current target and taking the minimum across all choices. Because subproblems overlap exponentially without caching, the runtime scales exponentially as $O((\sqrt{n})^n)$.

#### Optimal Approach: Bottom-Up Unbounded Knapsack Tabulation
Let `dp[i]` represent the minimum number of square numbers required to sum to integer $i$:
- Base Case: `dp[0] = 0` because zero squares are needed to form the value 0.
- For each integer $i$ from 1 to $n$, test every candidate square $s \le i$:

$$\text{dp}[i] = 1 + \min_{s \le i} (\text{dp}[i - s])$$

Precomputing the squares up to $\sqrt{n}$ guarantees that each subproblem only performs at most $\sqrt{n}$ lookups.

#### Execution Walkthrough

Let us trace key values up to $n = 12$ using candidate squares `[1, 4, 9]`:

| Value ($i$) | Squares Evaluated ($s \le i$) | Subproblem Lookups ($1 + \text{dp}[i - s]$) | Optimal $\text{dp}[i]$ | Component Squares |
| :---: | :---: | :---: | :---: | :---: |
| **0** | None | Base case | 0 | None |
| **1** | 1 | $1 + \text{dp}[0] = 1$ | 1 | 1 |
| **4** | 1, 4 | $\min(1+\text{dp}[3], 1+\text{dp}[0]) = 1$ | 1 | 4 |
| **8** | 1, 4 | $\min(1+\text{dp}[7], 1+\text{dp}[4]) = 1 + 1 = 2$ | 2 | 4 + 4 |
| **9** | 1, 4, 9 | $\min(1+\text{dp}[8], 1+\text{dp}[5], 1+\text{dp}[0]) = 1$ | 1 | 9 |
| **12** | 1, 4, 9 | $\min(1+\text{dp}[11], 1+\text{dp}[8], 1+\text{dp}[3]) = \min(4, 3, 4) = 3$ | 3 | 4 + 4 + 4 |

The minimum count for 12 is 3.

---

### Step-by-Step Algorithm

1. **Initialize DP Table:** Create an array `dp` of size $n + 1$ filled with float infinity. Set base case `dp[0] = 0`.
2. **Precompute Candidate Squares:** Generate all square numbers up to $n$: `squares = [i * i for i in range(1, int(n**0.5) + 1)]`.
3. **Iterate Across Numbers:** Loop $i$ from 1 to $n$:
   - For each `sq` in `squares`:
     - If `sq > i`, break out early since squares are in ascending order.
     - Update `dp[i] = min(dp[i], 1 + dp[i - sq])`.
4. **Return Result:** Return `int(dp[n])`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bottom-Up DP" default>

```python
class Solution:
    def numSquares(self, n: int) -> int:
        dp = [float("inf")] * (n + 1)
        dp[0] = 0

        squares = [i * i for i in range(1, int(n**0.5) + 1)]

        for i in range(1, n + 1):
            for sq in squares:
                if sq > i:
                    break
                dp[i] = min(dp[i], 1 + dp[i - sq])

        return int(dp[n])
```

  </TabItem>
  <TabItem value="bfs" label="Alternative: BFS Level-Order Search">

```python
from collections import deque

class Solution:
    def numSquares(self, n: int) -> int:
        squares = [i * i for i in range(1, int(n**0.5) + 1)]
        queue: deque[tuple[int, int]] = deque([(n, 0)])
        visited: set[int] = {n}

        while queue:
            remainder, level = queue.popleft()
            if remainder == 0:
                return level

            for sq in squares:
                next_rem = remainder - sq
                if next_rem < 0:
                    break
                if next_rem not in visited:
                    visited.add(next_rem)
                    queue.append((next_rem, level + 1))

        return -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O((\sqrt{n})^n)$ | $O(n)$ | Tries all square combinations recursively with exponential branching. |
| **BFS Shortest Path** | $O(n \sqrt{n})$ | $O(n)$ | Finds the shortest layer to reach 0 via queue exploration, fast on early terminations. |
| **Bottom-Up DP** | $O(n \sqrt{n})$ | $O(n)$ | Computes minimum squares iteratively for all values up to $n$ in simple array. |

---

### Common Pitfall: Greedy Subtraction of the Largest Square

A greedy strategy that repeatedly subtracts the largest possible square does not produce the optimal answer. For example, for $n = 12$, the largest square is 9. Subtracting 9 leaves 3, which requires three 1s ($9 + 1 + 1 + 1 = 4$ squares). However, choosing three 4s gives $4 + 4 + 4 = 12$, requiring only 3 squares. Dynamic programming correctly evaluates all combinations.

---

### Concise Interview Takeaway

Perfect Squares is structurally identical to the Coin Change problem, where candidate square values $1, 4, 9, \dots \le n$ act as coins. Evaluating subproblems bottom-up using $\text{dp}[i] = 1 + \min(\text{dp}[i - s])$ yields an $O(n\sqrt{n})$ time and $O(n)$ space solution.
