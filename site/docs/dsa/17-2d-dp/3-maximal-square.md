---
id: 3-maximal-square
title: "221. Maximal Square"
description: "Find area of largest square of 1s in binary matrix using 3-way min expansion DP"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Geometry Matrix DP</span>

> **Problem Statement:** Given an `m x n` binary matrix filled with `'0'`s and `'1'`s, find the largest square containing only `'1'`s and return its area.

```text
Input:  matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
Output: 4
Explanation: The maximal square of all '1's has side length 2, resulting in an area of 2 * 2 = 4.
```

---

### The Intuitive Mental Model

Instead of identifying where a square starts and scanning outwards, reverse the perspective: determine the largest valid square whose bottom-right corner is anchored at cell `(r, c)`.

#### Brute Force: Testing Every Subgrid
For every cell containing `'1'`, search outward to verify whether it can serve as the top-left corner of a square of side $k = 1, 2, \dots, \min(m, n)$. Verifying each candidate square takes $O(k^2)$ checks. Across all grid locations and possible side lengths, this brute force approach runs in $O((m \times n)^2)$ time, which becomes prohibitively slow on matrices with hundreds of rows and columns.

#### Optimal Approach: Bottom-Right Anchor and Three-Way Minimum
Let `dp[r][c]` denote the maximum side length of a square whose bottom-right corner rests at `(r, c)`:
- If `matrix[r][c] == '0'`, no square of `'1'`s can terminate here: `dp[r][c] = 0`.
- If `matrix[r][c] == '1'`, for this cell to extend into a square of side length $k$, its three adjacent predecessors must each support a square of side length at least $k - 1$:
  1. The neighbor directly above: `(r - 1, c)`
  2. The neighbor directly to the left: `(r, c - 1)`
  3. The diagonal neighbor to the top-left: `(r - 1, c - 1)`

The new square's side length is bounded by the weakest among these three supports:
$$\text{dp}[r][c] = 1 + \min(\text{dp}[r - 1][c], \, \text{dp}[r][c - 1], \, \text{dp}[r - 1][c - 1])$$

If a cell lies on the top border ($r = 0$) or left border ($c = 0$), it lacks the full trio of neighbors and can only support a square of side length 1 if its value is `'1'`.

#### Execution Walkthrough

Consider a $3 \times 3$ grid `matrix = [["1","1","1"], ["1","1","1"], ["0","1","1"]]`:

| Cell `(r, c)` | Value | Above `dp[r - 1][c]` | Left `dp[r][c - 1]` | Diagonal `dp[r - 1][c - 1]` | Computed `dp[r][c]` | Max Side Length |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `(0, 0)` to `(0, 2)` | `'1'` | Border | Border | Border | 1 | 1 |
| `(1, 0)` | `'1'` | 1 | Border | Border | 1 | 1 |
| `(1, 1)` | `'1'` | 1 | 1 | 1 | $1 + \min(1, 1, 1) = 2$ | 2 |
| `(1, 2)` | `'1'` | 1 | 2 | 1 | $1 + \min(1, 2, 1) = 2$ | 2 |
| `(2, 0)` | `'0'` | 1 | Border | Border | 0 | 2 |
| `(2, 1)` | `'1'` | 2 | 0 | 1 | $1 + \min(2, 0, 1) = 1$ | 2 |
| `(2, 2)` | `'1'` | 2 | 1 | 2 | $1 + \min(2, 1, 2) = 2$ | 2 |

The maximum side length encountered is 2, producing an area of $2 \times 2 = 4$.

---

### Step-by-Step Algorithm

1. **Check Boundary Conditions:** Return 0 immediately if the matrix is empty or has zero columns.
2. **Allocate State Buffer:** Maintain either an $m \times n$ table or a 1D row array of size $n + 1$ initialized to 0, along with a variable `max_side = 0`.
3. **Scan Grid Row by Row:** For each cell `(r, c)`:
   - If `matrix[r][c] == "1"`:
     - Compute side length as `1 + min(top, left, diagonal)`.
     - Update `max_side = max(max_side, side)`.
   - If `matrix[r][c] == "0"`, the side length terminates at 0.
4. **Calculate Result:** Return `max_side * max_side`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized 1D DP" default>

```python
class Solution:
    def maximalSquare(self, matrix: list[list[str]]) -> int:
        if not matrix or not matrix[0]:
            return 0

        m, n = len(matrix), len(matrix[0])
        dp = [0] * (n + 1)
        max_side = 0
        prev_diag = 0

        for r in range(m):
            for c in range(1, n + 1):
                temp = dp[c]
                if matrix[r][c - 1] == "1":
                    # dp[c] is top neighbor, dp[c - 1] is left neighbor, prev_diag is top-left
                    dp[c] = 1 + min(dp[c], dp[c - 1], prev_diag)
                    max_side = max(max_side, dp[c])
                else:
                    dp[c] = 0
                prev_diag = temp

        return max_side * max_side
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Full 2D DP Table">

```python
class Solution:
    def maximalSquare(self, matrix: list[list[str]]) -> int:
        if not matrix or not matrix[0]:
            return 0

        m, n = len(matrix), len(matrix[0])
        dp = [[0] * n for _ in range(m)]
        max_side = 0

        for r in range(m):
            for c in range(n):
                if matrix[r][c] == "1":
                    if r == 0 or c == 0:
                        dp[r][c] = 1
                    else:
                        dp[r][c] = 1 + min(
                            dp[r - 1][c],
                            dp[r][c - 1],
                            dp[r - 1][c - 1]
                        )
                    max_side = max(max_side, dp[r][c])

        return max_side * max_side
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full 2D DP Table** | $O(m \times n)$ | $O(m \times n)$ | Directly indexes neighbors with clear spatial geometry, allocating memory for every cell in the matrix. |
| **Space-Optimized 1D DP** | $O(m \times n)$ | $O(n)$ | Compresses the grid to a single row buffer by tracking the top-left diagonal in a scalar variable. |

---

### Common Pitfall: Returning Side Length Instead of Area

The dynamic programming recurrence computes the maximum *side length* of a square, but the problem statement explicitly asks for the *area*. Forgetting to square the final value (returning `max_side` instead of `max_side * max_side`) is one of the most common oversights on this question. Additionally, remember that inputs are strings (`"1"` and `"0"`), not raw integers.

---

### Concise Interview Takeaway

Anchor each square at its bottom-right corner: to form an all-ones square of size $k$, its top, left, and diagonal neighbors must each be valid squares of size at least $k - 1$. Taking $1 + \min(\text{top}, \text{left}, \text{diagonal})$ solves the problem in $O(m \times n)$ time, and compressing state reduces memory usage to $O(n)$.
