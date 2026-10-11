---
id: 1-number-of-islands
title: "200. Number of Islands"
description: "Count connected components in a 2D binary grid using DFS/BFS in-place sinking"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DFS / BFS</span>

> **Problem Statement:** Given an `m x n` 2D binary grid `grid` representing a map of `'1'`s (land) and `'0'`s (water), return the total number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four outer borders of the grid are completely surrounded by water.

```text
Input:  grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3
Explanation: The grid contains three separate connected components of '1's.
```

---

### The Intuitive Mental Model

A 2D matrix can be modeled as an implicit undirected graph where each coordinate `(r, c)` is a vertex, and orthogonal neighbors (Up, Down, Left, Right) share edges. An island is simply a connected component of land cells (`'1'`). Counting islands is therefore equivalent to finding the total number of connected components in the graph.

#### Brute Force: Auxiliary Visited Tracking
A standard graph traversal maintains an explicit hash set `visited` containing coordinate tuples `(r, c)`. As we iterate through every cell in the grid:
- If `grid[r][c] == '1'` and `(r, c)` is not in `visited`, increment the island counter.
- Run a traversal (DFS or BFS) starting at `(r, c)` that inserts all connected land coordinates into `visited`.

While this achieves $O(m \times n)$ time, the hash set requires $O(m \times n)$ auxiliary heap memory to store up to $m \times n$ coordinate tuples, adding object allocation overhead.

#### Optimal Approach: In-Place DFS Sinking
Instead of allocating external memory for a visited set, we can mutate the input grid directly (if permitted by the caller). The moment an unvisited land cell `'1'` is encountered:
1. Increment the total island count by `1`.
2. Launch a Depth-First Search flood fill from that cell.
3. Submerge every visited land cell by immediately overwriting `grid[r][c] = '0'`.
4. Recursively sink all 4 orthogonal neighbors.

Once the traversal completes, the entire landmass has been turned into water (`'0'`). When the outer scanning loops continue visiting subsequent coordinates, cells from already-counted islands are water and will never trigger duplicate counts.

#### Execution Walkthrough

Consider a $4 \times 5$ grid:

```text
1  1  0  0  0
1  1  0  0  0
0  0  1  0  0
0  0  0  1  1
```

| Step | Current Cell | Cell Value | Action Taken | Submerged Coordinates | Island Count |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `(0, 0)` | `'1'` | New island detected! Increment count and launch DFS | `(0, 0)`, `(0, 1)`, `(1, 0)`, `(1, 1)` | `1` |
| **2** | `(0, 1)` to `(2, 1)` | `'0'` | Already water (or sunk). Skip. | None | `1` |
| **3** | `(2, 2)` | `'1'` | New island detected! Increment count and launch DFS | `(2, 2)` | `2` |
| **4** | `(2, 3)` to `(3, 2)` | `'0'` | Water. Skip. | None | `2` |
| **5** | `(3, 3)` | `'1'` | New island detected! Increment count and launch DFS | `(3, 3)`, `(3, 4)` | `3` |
| **6** | `(3, 4)` | `'0'` | Sunk in Step 5. Skip. Scan finishes. | None | `3` |

---

### Step-by-Step Algorithm

1. **Guard Against Empty Input:** Check if `grid` is empty or has zero columns; if so, return `0`.
2. **Initialize Dimensions:** Store `rows = len(grid)` and `cols = len(grid[0])`. Initialize `islands = 0`.
3. **Define In-Place Traversal (`dfs`):**
   - Check boundary and water conditions: if `r < 0` or `r >= rows` or `c < 0` or `c >= cols` or `grid[r][c] != '1'`, return immediately.
   - Sink current cell by setting `grid[r][c] = '0'`.
   - Recursively call `dfs` on the four orthogonal neighbors: `(r + 1, c)`, `(r - 1, c)`, `(r, c + 1)`, and `(r, c - 1)`.
4. **Scan Every Coordinate:**
   - Iterate through row indices `r` from `0` to `rows - 1` and column indices `c` from `0` to `cols - 1`.
   - Whenever `grid[r][c] == '1'`, increment `islands += 1` and invoke `dfs(r, c)` to submerge the component.
5. **Return Total:** Once the full grid scan terminates, return `islands`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place DFS Flood Fill" default>

```python
class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        if not grid or not grid[0]:
            return 0

        rows, cols = len(grid), len(grid[0])
        islands = 0

        def dfs(r: int, c: int) -> None:
            # Boundary checks and water check
            if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":
                return

            # Sink the current land cell
            grid[r][c] = "0"

            # Flood fill adjacent neighbors
            dfs(r + 1, c)
            dfs(r - 1, c)
            dfs(r, c + 1)
            dfs(r, c - 1)

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    islands += 1
                    dfs(r, c)

        return islands
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Breadth-First Search (BFS)">

```python
from collections import deque

class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        if not grid or not grid[0]:
            return 0

        rows, cols = len(grid), len(grid[0])
        islands = 0

        def bfs(start_r: int, start_c: int) -> None:
            queue: deque[tuple[int, int]] = deque([(start_r, start_c)])
            grid[start_r][start_c] = "0"

            while queue:
                r, c = queue.popleft()
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
                        grid[nr][nc] = "0"  # Mark visited before pushing to queue
                        queue.append((nr, nc))

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    islands += 1
                    bfs(r, c)

        return islands
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **In-Place DFS Flood Fill** | $O(m \times n)$ | $O(m \times n)$ | Visited cells are overwritten directly in the grid. Call stack can reach $O(m \times n)$ in the worst case with serpentine or full-land grids. |
| **In-Place BFS Traversal** | $O(m \times n)$ | $O(\min(m, n))$ | Uses an explicit queue instead of call recursion. Maximum queue size bounded by the diagonal or perimeter of the largest connected region. |

---

### Common Pitfall: Marking Visited Too Late in BFS

When implementing the BFS alternative, always mark cells as visited (`grid[nr][nc] = '0'`) immediately when enqueuing them, rather than waiting until they are popped from the queue. If you wait until pop time to mark a cell, adjacent neighboring nodes will repeatedly push identical coordinates into the queue, causing explosive exponential memory bloat and Time Limit Exceeded errors.

---

### Concise Interview Takeaway

Model the grid as an implicit graph where orthogonal neighbors form edges. Iterate through all coordinates, incrementing the island counter whenever an unvisited land cell is found, and immediately flood fill using DFS or BFS to sink the entire connected component to `'0'`. This ensures every cell is inspected at most a constant number of times for optimal $O(m \times n)$ runtime.
