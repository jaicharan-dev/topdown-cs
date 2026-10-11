---
id: 8-longest-increasing-path-in-a-matrix
title: "329. Longest Increasing Path in a Matrix"
description: "Find longest strictly increasing path using memoized depth-first search on DAG"
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Memoized DFS / DAG</span>

> **Problem Statement:** Given an `m x n` integers matrix, return the length of the longest strictly increasing path in the matrix. From each cell, you can move in four orthogonal directions: up, down, left, or right. You may not move diagonally or step outside the matrix boundaries.

```text
Input:  matrix = [[9, 9, 4], [6, 6, 8], [2, 1, 1]]
Output: 4
Explanation: The longest increasing path is [1, 2, 6, 9].
```

---

### The Intuitive Mental Model

In standard grid traversals, tracking a `visited` set is required to avoid infinite looping cycles. However, in this problem, every step must move to an adjacent cell with a strictly greater numeric value ($\text{matrix}[nr][nc] > \text{matrix}[r][c]$).

Because an increasing sequence ($1 < 2 < 6 < 9$) can never cycle back to a smaller or identical number, the grid forms an implicit **Directed Acyclic Graph (DAG)**.

#### Brute Force: Unmemoized Exhaustive DFS
Starting a standard depth-first search from every cell without caching recalculates the longest increasing path for identical coordinates repeatedly. In the worst case, this leads to exponential $O(4^{m \times n})$ time complexity, timing out on even modest grid sizes.

#### Optimal Approach: Memoized DFS on an Implicit DAG
Because the grid contains zero directed cycles, optimal substructure holds across every cell:
$$\text{LIP}(r, c) = 1 + \max_{(nr, nc)} (\text{LIP}(nr, nc))$$
for all in-bounds orthogonal neighbors where $\text{matrix}[nr][nc] > \text{matrix}[r][c]$. If a cell has no strictly larger neighbors, its longest path is simply 1.

By memoizing the result of `dfs(r, c)` in a 2D matrix or dictionary `memo`, each cell is computed exactly once. Subsequent lookups return immediately in $O(1)$ time.

#### Execution Walkthrough

Tracing `matrix = [[9, 9, 4], [6, 6, 8], [2, 1, 1]]`:

| Cell Coordinate `(r, c)` | Value | Greater Orthogonal Neighbors | Subproblem Transition | Cached Path Length |
| :---: | :---: | :--- | :--- | :---: |
| `(0, 0)` | 9 | None | Base peak cell | 1 |
| `(0, 1)` | 9 | None | Base peak cell | 1 |
| `(1, 2)` | 8 | None (all neighbors $\le 8$) | Base peak cell | 1 |
| `(0, 2)` | 4 | `(1, 2): 8` | $1 + \text{dfs}(1, 2) = 1 + 1$ | 2 |
| `(1, 0)` | 6 | `(0, 0): 9`, `(0, 1): 9` | $1 + \max(1, 1)$ | 2 |
| `(2, 0)` | 2 | `(1, 0): 6` | $1 + \text{dfs}(1, 0) = 1 + 2$ | 3 |
| `(2, 1)` | 1 | `(2, 0): 2`, `(1, 1): 6` | $1 + \max(\text{dfs}(2, 0), \text{dfs}(1, 1)) = 1 + 3$ | 4 |

Iterating through all starting positions confirms that the maximum global path length is 4.

---

### Step-by-Step Algorithm

1. **Guard Against Empty Input:** Return 0 if the matrix is empty or has zero columns.
2. **Initialize Memoization Buffer:** Create a 2D array `memo` of size $m \times n$ initialized to 0.
3. **Define Memoized DFS (`dfs(r, c)`):**
   - If `memo[r][c] != 0`, return the cached value `memo[r][c]`.
   - Initialize `max_len = 1`.
   - For each direction `(dr, dc)` in `[(-1, 0), (1, 0), (0, -1), (0, 1)]`:
     - Calculate neighbor coordinates `nr = r + dr`, `nc = c + dc`.
     - If `(nr, nc)` is within bounds and `matrix[nr][nc] > matrix[r][c]`:
       - Update `max_len = max(max_len, 1 + dfs(nr, nc))`.
   - Store `memo[r][c] = max_len` and return it.
4. **Find Global Maximum:** Evaluate `dfs(r, c)` across all coordinates $0 \le r < m$ and $0 \le c < n$, returning the overall maximum.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Memoized DFS (Top-Down DP)" default>

```python
class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        if not matrix or not matrix[0]:
            return 0

        rows, cols = len(matrix), len(matrix[0])
        memo = [[0] * cols for _ in range(rows)]
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

        def dfs(r: int, c: int) -> int:
            if memo[r][c] != 0:
                return memo[r][c]

            max_len = 1
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    max_len = max(max_len, 1 + dfs(nr, nc))

            memo[r][c] = max_len
            return max_len

        return max(dfs(r, c) for r in range(rows) for c in range(cols))
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Sorted Coordinate DP (Bottom-Up)">

```python
class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        if not matrix or not matrix[0]:
            return 0

        rows, cols = len(matrix), len(matrix[0])
        dp = [[1] * cols for _ in range(rows)]

        # Sorting cells in descending order guarantees DAG topological ordering
        cells = sorted(
            ((r, c) for r in range(rows) for c in range(cols)),
            key=lambda cell: matrix[cell[0]][cell[1]],
            reverse=True
        )

        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        global_max = 1

        for r, c in cells:
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    dp[r][c] = max(dp[r][c], 1 + dp[nr][nc])
            global_max = max(global_max, dp[r][c])

        return global_max
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Memoized DFS (Top-Down DP)** | $O(m \times n)$ | $O(m \times n)$ | Visits each cell and directed edge at most once, using recursion stack and a memo grid. |
| **Sorted Coordinate DP (Bottom-Up)** | $O(m \times n \log(m \times n))$ | $O(m \times n)$ | Sorts all cells to establish topological ordering, avoiding recursion at the expense of logarithmic sort overhead. |

---

### Common Pitfall: Unnecessary Visited Sets Causing Path Blocking

Because standard DFS on grids usually involves unweighted graphs with potential cycles, many candidates mistakenly include a global `visited` set. If you mark a cell as visited without backtracking, you prevent other valid increasing paths from using that same cell. Since the strictly increasing constraint mathematically precludes cycles, no `visited` set is required, only memoization.

---

### Concise Interview Takeaway

Because strictly increasing paths can never revisit smaller or equal values, the matrix behaves as a cycle-free Directed Acyclic Graph. Finding the longest path translates directly to computing the longest path in a DAG using DFS with memoization, achieving optimal $O(m \times n)$ runtime.
