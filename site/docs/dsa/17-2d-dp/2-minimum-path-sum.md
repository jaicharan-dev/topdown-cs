---
id: 2-minimum-path-sum
title: "64. Minimum Path Sum"
description: "Find path minimizing total cell weight using in-place 2D dynamic programming"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DP</span>

> **Problem Statement:** Given an `m x n` grid filled with non-negative numbers, find a path from the top-left corner (`grid[0][0]`) to the bottom-right corner (`grid[m - 1][n - 1]`) which minimizes the sum of all numbers along its path. You can only move either down or right at any point in time.

```text
Input:  grid = [[1, 3, 1], [1, 5, 1], [4, 2, 1]]
Output: 7
Explanation: Because the path 1 -> 3 -> 1 -> 1 -> 1 minimizes the sum, the minimum path sum is 7.
```

---

### The Intuitive Mental Model

In *Unique Paths*, every valid predecessor added to the total combination count. In *Minimum Path Sum*, our goal shifts from counting paths to selecting the single cheapest sequence of movements.

#### Brute Force: Exhaustive Path Recursion
At any coordinate `(r, c)`, the robot can branch either down to `(r + 1, c)` or right to `(r, c + 1)`. An exhaustive recursive search computes the cost to reach the target from both branches and selects the minimum. Because the total number of paths across an $m \times n$ grid is $\binom{m + n - 2}{m - 1}$, evaluating each route without memoization requires exponential $O(2^{m + n})$ operations.

#### Optimal Approach: Dynamic Programming with Local Minimum Transitions
Because the robot can only arrive at cell `(r, c)` from either the cell above `(r - 1, c)` or the cell to the left `(r, c - 1)`, optimal substructure holds. The minimum path sum to enter `(r, c)` is the cell's own value plus the minimum cost among its two predecessors:

$$\text{dp}[r][c] = \text{grid}[r][c] + \min(\text{dp}[r - 1][c], \, \text{dp}[r][c - 1])$$

Base cases arise naturally at the boundaries:
- **Top Row ($r = 0$):** Cells have no neighbor above; each cell can only be reached from its immediate left neighbor.
- **Left Column ($c = 0$):** Cells have no neighbor to the left; each cell can only be reached from the neighbor directly above.

If modifying the original input grid is permitted, we can accumulate costs in place with zero auxiliary space allocation. If the input grid must remain immutable, a 1D array of size $n$ maintains the current row values.

#### Execution Walkthrough

Consider `grid = [[1, 3, 1], [1, 5, 1], [4, 2, 1]]`:

| Cell `(r, c)` | Original Cost | Top Choice `dp[r - 1][c]` | Left Choice `dp[r][c - 1]` | Optimal Decision | Accumulated Cost |
| :---: | :---: | :---: | :---: | :---: | :---: |
| `(0, 0)` | 1 | None | None | Starting cell | 1 |
| `(0, 1)` | 3 | None | 1 | $1 + 3$ | 4 |
| `(0, 2)` | 1 | None | 4 | $4 + 1$ | 5 |
| `(1, 0)` | 1 | 1 | None | $1 + 1$ | 2 |
| `(1, 1)` | 5 | 4 | 2 | $\min(4, 2) + 5 = 2 + 5$ | 7 |
| `(1, 2)` | 1 | 5 | 7 | $\min(5, 7) + 1 = 5 + 1$ | 6 |
| `(2, 0)` | 4 | 2 | None | $2 + 4$ | 6 |
| `(2, 1)` | 2 | 7 | 6 | $\min(7, 6) + 2 = 6 + 2$ | 8 |
| `(2, 2)` | 1 | 6 | 8 | $\min(6, 8) + 1 = 6 + 1$ | 7 |

The final answer accumulated in `grid[2][2]` is 7.

---

### Step-by-Step Algorithm

1. **Extract Grid Dimensions:** Determine row count `m` and column count `n`.
2. **Accumulate Top Row:** Loop `c` from 1 to $n - 1$ setting `grid[0][c] += grid[0][c - 1]`.
3. **Accumulate Left Column:** Loop `r` from 1 to $m - 1$ setting `grid[r][0] += grid[r - 1][0]`.
4. **Iterate Grid Interior:** For each row `r` from 1 to $m - 1$ and column `c` from 1 to $n - 1$:
   - Set `grid[r][c] += min(grid[r - 1][c], grid[r][c - 1])`.
5. **Return Target Value:** Return `grid[m - 1][n - 1]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place 2D DP" default>

```python
class Solution:
    def minPathSum(self, grid: list[list[int]]) -> int:
        m, n = len(grid), len(grid[0])

        # Accumulate top row costs
        for c in range(1, n):
            grid[0][c] += grid[0][c - 1]

        # Accumulate left column costs
        for r in range(1, m):
            grid[r][0] += grid[r - 1][0]

        # Accumulate remaining interior cells
        for r in range(1, m):
            for c in range(1, n):
                grid[r][c] += min(grid[r - 1][c], grid[r][c - 1])

        return grid[m - 1][n - 1]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Immutable 1D Rolling Row">

```python
class Solution:
    def minPathSum(self, grid: list[list[int]]) -> int:
        m, n = len(grid), len(grid[0])
        dp = [float('inf')] * n
        dp[0] = 0

        for r in range(m):
            dp[0] += grid[r][0]
            for c in range(1, n):
                # dp[c] is cost from cell above; dp[c - 1] is cost from cell to left
                dp[c] = grid[r][c] + min(dp[c], dp[c - 1])

        return int(dp[n - 1])
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **In-Place 2D DP** | $O(m \times n)$ | $O(1)$ | Modifies the input grid directly to achieve optimal speed without allocating auxiliary data structures. |
| **Immutable 1D Rolling Row** | $O(m \times n)$ | $O(n)$ | Preserves the caller's input array unmodified at the cost of a single 1D buffer of width $n$. |

---

### Common Pitfall: Modifying Caller Data Without Permission

Overwriting the input matrix achieves an attractive $O(1)$ space metric in coding interviews, but in multithreaded systems or reusable service architectures, mutating parameter arguments creates side effects. Always clarify with an interviewer whether modifying the input array in place is acceptable before implementing the zero-space variant.

---

### Concise Interview Takeaway

Minimum path sum evaluates the localized optimal decision at each step: `dp[r][c] = grid[r][c] + min(dp[r - 1][c], dp[r][c - 1])`. Boundary rows and columns are pre-accumulated because they possess only one incoming direction. When array mutation is permitted, the solution operates in $O(1)$ space; otherwise, a 1D row array delivers $O(n)$ space without corrupting the input.
