---
id: 2-max-area-of-island
title: "695. Max Area of Island"
description: "Find the largest connected component size in a binary grid via DFS accumulation"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DFS / BFS</span>

> **Problem Statement:** You are given an `m x n` binary matrix `grid`. An island is a group of `1`s (representing land) connected 4-directionally (horizontal or vertical). You may assume all four edges of the grid are surrounded by water. The area of an island is the number of cells with a value `1` in the island. Return the maximum area of an island in `grid`. If there is no island, return 0.

```text
Input:  grid = [
  [0,0,1,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,0,0,0],
  [0,1,1,0,1,0,0,0,0,0,0,0,0],
  [0,1,0,0,1,1,0,0,1,0,1,0,0],
  [0,1,0,0,1,1,0,0,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0]
]
Output: 6
Explanation: The largest island is highlighted in the center-right region, containing 6 connected cells.
```

---

### The Intuitive Mental Model

This problem shares the exact graph topology as Number of Islands, but modifies the aggregation goal. Instead of counting how many disjoint components exist, we calculate the number of vertices (area) in each connected component and maintain the running maximum.

#### Brute Force: External Set Tracking
We can scan through each coordinate `(r, c)`. When a `1` is discovered that is not present in an external `visited` set, we trigger a traversal that computes the area by counting vertices while inserting coordinates into `visited`. While correct in $O(m \times n)$ time, allocating dynamic tuples `(r, c)` in a hash set introduces unnecessary memory allocation overhead.

#### Optimal Approach: In-Place DFS Area Accumulation
Instead of a separate set, we can submerge land cells directly by overwriting `grid[r][c] = 0` as soon as they are reached. To accumulate the area cleanly, DFS can be written as a value-returning function rather than a `void` routine:

$$\text{area}(r, c) = 1 + \text{area}(r + 1, c) + \text{area}(r - 1, c) + \text{area}(r, c + 1) + \text{area}(r, c - 1)$$

- **Base Case:** If `(r, c)` is out of bounds or equals `0` (water), return `0`.
- **Recursive Step:** Sink the cell to `0` to prevent revisiting, then return `1` plus the accumulated area of its four orthogonal neighbors.
- **Outer Loop:** Scan all cells in the grid. Whenever `grid[r][c] == 1`, call DFS and update `max_area = max(max_area, dfs(r, c))`.

#### Execution Walkthrough

Consider a smaller $3 \times 4$ grid:

```text
0  1  1  0
0  1  0  0
0  0  1  1
```

| Step | Scanning Coordinate | Cell Value | Action Taken | Submerged Coordinates | Current Area | Max Area So Far |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| **1** | `(0, 0)` | `0` | Water. Skip. | None | 0 | 0 |
| **2** | `(0, 1)` | `1` | Start DFS flood fill | `(0, 1)`, `(0, 2)`, `(1, 1)` | 3 | 3 |
| **3** | `(0, 2)` to `(2, 1)` | `0` | Water (or sunk in Step 2). Skip. | None | 0 | 3 |
| **4** | `(2, 2)` | `1` | Start DFS flood fill | `(2, 2)`, `(2, 3)` | 2 | 3 |
| **5** | `(2, 3)` | `0` | Sunk in Step 4. Skip. Scan complete. | None | 0 | 3 |

---

### Step-by-Step Algorithm

1. **Guard Against Empty Input:** Return `0` if `grid` is empty or has zero columns.
2. **Initialize Dimensions and Tracker:** Store `rows = len(grid)` and `cols = len(grid[0])`. Initialize `max_area = 0`.
3. **Define Recursive DFS:**
   - Base condition: If `r < 0` or `r >= rows` or `c < 0` or `c >= cols` or `grid[r][c] != 1`, return `0`.
   - Mutate `grid[r][c] = 0` to submerge the current cell and avoid duplicate visits.
   - Return `1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1)`.
4. **Scan Every Cell:**
   - Loop over row index `r` and column index `c`.
   - When `grid[r][c] == 1`, update `max_area = max(max_area, dfs(r, c))`.
5. **Return Result:** Once all rows and columns are scanned, return `max_area`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place DFS Accumulation" default>

```python
class Solution:
    def maxAreaOfIsland(self, grid: list[list[int]]) -> int:
        if not grid or not grid[0]:
            return 0

        rows, cols = len(grid), len(grid[0])
        max_area = 0

        def dfs(r: int, c: int) -> int:
            # Boundary check and water check
            if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != 1:
                return 0

            # Sink cell to prevent cycle loops
            grid[r][c] = 0

            # 1 (current cell) + sum of connected neighbor areas
            return (
                1
                + dfs(r + 1, c)
                + dfs(r - 1, c)
                + dfs(r, c + 1)
                + dfs(r, c - 1)
            )

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 1:
                    max_area = max(max_area, dfs(r, c))

        return max_area
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Breadth-First Search (BFS)">

```python
from collections import deque

class Solution:
    def maxAreaOfIsland(self, grid: list[list[int]]) -> int:
        if not grid or not grid[0]:
            return 0

        rows, cols = len(grid), len(grid[0])
        max_area = 0

        def bfs(start_r: int, start_c: int) -> int:
            queue: deque[tuple[int, int]] = deque([(start_r, start_c)])
            grid[start_r][start_c] = 0
            area = 0

            while queue:
                r, c = queue.popleft()
                area += 1

                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        grid[nr][nc] = 0  # Mark visited immediately
                        queue.append((nr, nc))

            return area

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 1:
                    max_area = max(max_area, bfs(r, c))

        return max_area
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **In-Place DFS Accumulation** | $O(m \times n)$ | $O(m \times n)$ | Recursively sums neighbor components directly. Recursion stack can reach $O(m \times n)$ in the worst case with snake-shaped islands. |
| **In-Place BFS Traversal** | $O(m \times n)$ | $O(\min(m, n))$ | Uses an explicit queue and iterative counter. Memory is bounded by the maximum frontier width of any island. |

---

### Common Pitfall: Integer Types and Modifying Inputs

Unlike Number of Islands where coordinates store character strings `'1'` and `'0'`, Max Area of Island uses native integers `1` and `0`. Comparing `grid[r][c] == "1"` instead of `grid[r][c] == 1` causes silent traversal failures. Additionally, if an interviewer specifies that the input grid is immutable, use a separate boolean matrix or `visited` set instead of overwriting cells directly.

---

### Concise Interview Takeaway

Transform flood fill from a simple void sinker into an area accumulator. By returning $1$ plus the recursive sum of all four orthogonal directions while sinking visited land to $0$, each island's total area is computed in a single pass across its cells, running in optimal $O(m \times n)$ time.
