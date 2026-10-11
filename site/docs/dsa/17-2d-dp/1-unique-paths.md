---
id: 1-unique-paths
title: "62. Unique Paths"
description: "Count grid traversal paths from top-left to bottom-right using 2D/1D dynamic programming"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DP</span>

> **Problem Statement:** There is a robot on an `m x n` grid. The robot is initially located at the top-left corner (`grid[0][0]`) and tries to move to the bottom-right corner (`grid[m - 1][n - 1]`). The robot can only move either down or right at any point in time. Given the two integers `m` and `n`, return the total number of possible unique paths that the robot can take to reach the destination.

```text
Input:  m = 3, n = 7
Output: 28
Explanation: From the top-left corner (0, 0), there are 28 unique valid paths that move solely right and down to reach (2, 6).
```

---

### The Intuitive Mental Model

Imagine navigating an $m \times n$ city grid where every street is strictly one-way: you may only travel south (down) or east (right).

#### Brute Force: Recursive Exploration
The most straightforward mental model is exploring every branching route from start to destination recursively. From cell `(r, c)`, the robot chooses between `(r + 1, c)` and `(r, c + 1)`. The recursion terminates when reaching `(m - 1, n - 1)` (which counts as 1 valid path) or crossing out of bounds (which counts as 0).

However, many paths converge at identical interior coordinates. Without memoization, this explores an exponential decision tree of size $O(2^{m + n})$, recalculating identical subproblems repeatedly and timing out on typical constraints.

#### Optimal Approach: 2D Grid DP and Space Compression
Notice that arriving at any interior cell `(r, c)` can only occur via two mutually exclusive moves:
1. Moving down from the neighbor directly above: `(r - 1, c)`.
2. Moving right from the neighbor directly to the left: `(r, c - 1)`.

By the addition rule of combinatorics, the number of ways to reach `(r, c)` is:
$$\text{dp}[r][c] = \text{dp}[r - 1][c] + \text{dp}[r][c - 1]$$

Every cell in the first row has exactly 1 way to be reached (moving right continuously). Similarly, every cell in the first column has exactly 1 way (moving down continuously).

Furthermore, computing row $r$ requires only the values from row $r - 1$ and the current row's previous column. We can compress the entire 2D matrix into a single 1D array of width $n$:
$$\text{row}[c] = \text{row}[c] + \text{row}[c - 1]$$
Here, `row[c]` on the right-hand side represents the value from the row above, while `row[c - 1]` represents the updated value from the cell directly to the left.

#### Execution Walkthrough

Let us trace `m = 3, n = 4` using a compressed 1D row:

| Row Index | `c = 0` | `c = 1` | `c = 2` | `c = 3` | Transition Details |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Row 0** | 1 | 1 | 1 | 1 | Base row: only one direct path moving right |
| **Row 1** | 1 | $1 + 1 = 2$ | $1 + 2 = 3$ | $1 + 3 = 4$ | `row[c] = row[c] + row[c - 1]` |
| **Row 2** | 1 | $1 + 2 = 3$ | $3 + 3 = 6$ | $4 + 6 = 10$ | Destination cell `row[3]` evaluates to 10 |

The robot has 10 unique paths to reach the bottom-right corner.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create a 1D list `row = [1] * n` representing the top row where each cell has exactly 1 incoming path.
2. **Iterate Grid Rows:** Loop `r` from index 1 to $m - 1$.
3. **Accumulate Path Counts:** For each column index `c` from 1 to $n - 1$, update `row[c] += row[c - 1]`. The unchanged `row[0]` remains 1 because only downward steps reach the first column.
4. **Return Destination Result:** Return `row[n - 1]`, which holds the total number of unique paths to the bottom-right corner.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized 1D DP" default>

```python
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        # Space-optimized 1D array representing the current row's path counts
        row = [1] * n

        # Process each row starting from row index 1
        for _ in range(1, m):
            for c in range(1, n):
                # row[c] is the cell above; row[c - 1] is the cell to the left
                row[c] += row[c - 1]

        return row[n - 1]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Full 2D DP Table">

```python
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        # dp[r][c] stores the number of unique paths to reach cell (r, c)
        dp = [[1] * n for _ in range(m)]

        for r in range(1, m):
            for c in range(1, n):
                dp[r][c] = dp[r - 1][c] + dp[r][c - 1]

        return dp[m - 1][n - 1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full 2D DP Table** | $O(m \times n)$ | $O(m \times n)$ | Computes every subproblem iteratively with clear 2D indexing, but allocates a full $m \times n$ matrix. |
| **Space-Optimized 1D DP** | $O(m \times n)$ | $O(n)$ | Reuses a single row array of size $n$, cutting auxiliary memory from quadratic grid size down to linear width. |

---

### Common Pitfall: Off-by-One in Combinatorial Alternatives

While this problem can mathematically be solved using combinations $\binom{m + n - 2}{m - 1}$, using floating-point division or naive factorials often introduces precision issues or integer overflow in other languages. In dynamic programming, the primary pitfall is improperly indexing base rows or resetting `row[0]` during rolling-row updates. Because the robot can only reach the leftmost column by moving down, `row[0]` must always remain 1.

---

### Concise Interview Takeaway

Each cell in a grid DP represents the sum of its incoming valid transitions: `dp[r][c] = dp[r - 1][c] + dp[r][c - 1]`. Because updates only depend on the current row and the row directly above, compressing the matrix into a single 1D array of size $O(n)$ preserves linear-grid runtime while keeping auxiliary space minimal.
