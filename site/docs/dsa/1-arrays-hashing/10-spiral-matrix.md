---
id: 10-spiral-matrix
title: "54. Spiral Matrix"
description: "Four shrinking boundaries traversal"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Simulation</span>

> **Problem Statement:** Given an $m \times n$ matrix, return all elements of the matrix in spiral order (clockwise starting from the top-left).

```text
Input:  matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
Output: [1, 2, 3, 6, 9, 8, 7, 4, 5]
Explanation: Traversal order follows right [1, 2, 3], down [6, 9], left [8, 7], up [4], and finally center [5].
```

---

### The Intuitive Mental Model

Imagine traversing a rectangular perimeter: as each row or column boundary is completely visited, that outer edge is eliminated, shrinking the remaining unvisited grid inward.

A clockwise spiral traversal proceeds in four cyclical phases:
1. **Right:** Traverse the active top boundary, then increment `top`.
2. **Down:** Traverse the active right boundary, then decrement `right`.
3. **Left:** Traverse the active bottom boundary, then decrement `bottom`.
4. **Up:** Traverse the active left boundary, then increment `left`.

The process repeats until the boundaries cross (`top > bottom` or `left > right`).

#### Brute Force: Visited Matrix Simulation
Maintaining a 2D boolean `visited` matrix and turning right whenever reaching a visited cell or grid boundary requires $O(m \times n)$ auxiliary memory to track states.

#### Optimal Approach: Four Shrinking Boundary Pointers
By maintaining four explicit integer boundary coordinates (`top`, `bottom`, `left`, `right`), we bound the unvisited rectangle without allocating auxiliary matrices. After traversing an edge, we contract that boundary inward.

#### Execution Walkthrough

Let us trace `matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`:

Initial state: `top = 0, bottom = 2, left = 0, right = 2`.

| Phase | Direction | Segment Traversed | Boundary Update | New Boundaries (`top, bottom, left, right`) |
| :---: | :---: | :--- | :--- | :---: |
| **1** | Right | `[1, 2, 3]` (row `0`) | `top += 1` | `(1, 2, 0, 2)` |
| **2** | Down | `[6, 9]` (col `2`) | `right -= 1` | `(1, 2, 0, 1)` |
| **3** | Left | `[8, 7]` (row `2`) | `bottom -= 1` | `(1, 1, 0, 1)` |
| **4** | Up | `[4]` (col `0`) | `left += 1` | `(1, 1, 1, 1)` |
| **5** | Right | `[5]` (row `1`) | `top += 1` | `(2, 1, 1, 1)` |

Because `top > bottom`, the loop terminates. Result: `[1, 2, 3, 6, 9, 8, 7, 4, 5]`.

---

### Step-by-Step Algorithm

1. **Handle Empty Matrix:** If `matrix` is empty or contains no columns, return `[]`.
2. **Initialize Boundaries:** Set `top = 0`, `bottom = len(matrix) - 1`, `left = 0`, `right = len(matrix[0]) - 1`.
3. **Boundary Contraction Loop:** While `top <= bottom` and `left <= right`:
   - **Move Right:** Traverse `matrix[top][col]` for `col` from `left` to `right`. Increment `top += 1`.
   - **Move Down:** Traverse `matrix[row][right]` for `row` from `top` to `bottom`. Decrement `right -= 1`.
   - **Move Left:** If `top <= bottom`, traverse `matrix[bottom][col]` for `col` from `right` down to `left`. Decrement `bottom -= 1`.
   - **Move Up:** If `left <= right`, traverse `matrix[row][left]` for `row` from `bottom` down to `top`. Increment `left += 1`.
4. **Return Result:** Return the accumulated result array.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Boundary Pointers" default>

```python
class Solution:
    def spiralOrder(self, matrix: list[list[int]]) -> list[int]:
        if not matrix or not matrix[0]:
            return []
            
        res: list[int] = []
        top, bottom = 0, len(matrix) - 1
        left, right = 0, len(matrix[0]) - 1
        
        while top <= bottom and left <= right:
            # 1. Traverse Right across the top boundary
            for col in range(left, right + 1):
                res.append(matrix[top][col])
            top += 1
            
            # 2. Traverse Down along the right boundary
            for row in range(top, bottom + 1):
                res.append(matrix[row][right])
            right -= 1
            
            # 3. Traverse Left across bottom boundary (guard against crossed row)
            if top <= bottom:
                for col in range(right, left - 1, -1):
                    res.append(matrix[bottom][col])
                bottom -= 1
                
            # 4. Traverse Up along left boundary (guard against crossed column)
            if left <= right:
                for row in range(bottom, top - 1, -1):
                    res.append(matrix[row][left])
                left += 1
                
        return res
```

  </TabItem>
  <TabItem value="visited" label="Alternative: Visited Grid Simulation">

```python
class Solution:
    def spiralOrder(self, matrix: list[list[int]]) -> list[int]:
        if not matrix:
            return []
            
        m, n = len(matrix), len(matrix[0])
        visited = [[False] * n for _ in range(m)]
        res: list[int] = []
        
        # Directions: Right, Down, Left, Up
        dr = [0, 1, 0, -1]
        dc = [1, 0, -1, 0]
        r = c = d = 0
        
        for _ in range(m * n):
            res.append(matrix[r][c])
            visited[r][c] = True
            
            nr, nc = r + dr[d], c + dc[d]
            if 0 <= nr < m and 0 <= nc < n and not visited[nr][nc]:
                r, c = nr, nc
            else:
                d = (d + 1) % 4
                r, c = r + dr[d], c + dc[d]
                
        return res
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Visited Grid Simulation** | $O(m \times n)$ | $O(m \times n)$ | Simulates movement with direction vectors and a visited matrix. Incurs additional memory allocations. |
| **Boundary Pointers** | $O(m \times n)$ | $O(1)$ | Contracts four integer boundary markers. Visited cells are tracked implicitly with zero auxiliary memory. |

---

### Common Pitfall: Missing Boundary Cross Checks on Non-Square Matrices

When traversing non-square matrices (such as single-row or single-column matrices like `[[1, 2, 3]]`), after the top boundary moves right and increments `top`, `top` may now exceed `bottom`. Without the conditional guards `if top <= bottom:` before moving left and `if left <= right:` before moving up, the reverse sweeps will execute out of order and re-visit cells.

---

### Concise Interview Takeaway

For **Spiral Matrix**, maintain four contracting perimeter boundaries: `top, bottom, left, right`. Advance cyclically in four directions: Right, Down, Left, Up, contracting the respective boundary after each pass. Always insert guard conditions (`top <= bottom` and `left <= right`) before reverse sweeps to correctly handle asymmetric and single-dimension grids in $O(m \times n)$ time and $O(1)$ auxiliary space.
