---
id: 4-rotting-oranges
title: "994. Rotting Oranges"
description: "Find time for contamination to spread across a grid using multi-source BFS"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Multi-Source BFS</span>

> **Problem Statement:** You are given an `m x n` grid where each cell has one of three values: `0` representing an empty cell, `1` representing a fresh orange, or `2` representing a rotten orange. Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return `-1`.

```text
Input:  grid = [[2,1,1],[1,1,0],[0,1,1]]
Output: 4
Explanation: At minute 0, orange (0, 0) is rotten. By minute 4, all reachable fresh oranges have been contaminated.
```

---

### The Intuitive Mental Model

Contamination does not spread sequentially from one rotten orange down an arbitrary path. Instead, all rotten oranges spread simultaneously outward in synchronized waves across adjacent fresh oranges every minute.

#### Brute Force: Repeated Grid Scans
A naive simulation scans the entire matrix minute by minute:
- In each round, identify all fresh oranges adjacent to any rotten orange and collect them in a list.
- Mark all collected oranges as rotten simultaneously and increment the minute counter.
- Repeat until a full scan results in zero new rotting oranges.
- Finally, scan once more to check if any fresh oranges remain.

Because a matrix of size $m \times n$ can take up to $m \times n$ minutes to fully rot, repeated scans take $O((m \times n)^2)$ time, repeatedly rescanning dormant cells.

#### Optimal Approach: Multi-Source Breadth-First Search (BFS)
Rather than scanning the entire grid repeatedly, Multi-Source BFS models simultaneous wave propagation:
1. **Multi-Source Queue Seeding:** Prime the BFS queue with the coordinates of all oranges already rotten at minute `0`.
2. **Fresh Orange Inventory:** Count all fresh oranges (`grid[r][c] == 1`) in the initial scan. If `fresh_count == 0`, immediately return `0`.
3. **Synchronized Time Steps (Levels):** Each loop iteration represents exactly one elapsed minute. By recording `len(queue)` at the start of each level, we process only the frontier of oranges contaminated in the previous minute.
4. **Immediate Infection:** When a popped rotten orange infects an adjacent fresh orange, mutate `grid[nr][nc] = 2` immediately, decrement `fresh_count -= 1`, and push the new coordinate into the queue.
5. **Termination:** When the queue empties, return `minutes` if `fresh_count == 0`; otherwise, return `-1` because some oranges were unreachable.

#### Execution Walkthrough

Consider `grid = [[2,1,1],[1,1,0],[0,1,1]]` with initial `fresh_count = 6`:

| Minute | Queue at Start of Level | Processed Rotten Cell | Newly Infected Cells | Remaining Fresh Count |
| :---: | :---: | :---: | :--- | :---: |
| **0** | `[(0, 0)]` | Pre-loop state | Initial state | 6 |
| **1** | `[(0, 0)]` | `(0, 0)` | `(0, 1)`, `(1, 0)` | 4 |
| **2** | `[(0, 1), (1, 0)]` | `(0, 1)`, `(1, 0)` | `(0, 2)`, `(1, 1)` | 2 |
| **3** | `[(0, 2), (1, 1)]` | `(0, 2)`, `(1, 1)` | `(2, 1)` | 1 |
| **4** | `[(2, 1)]` | `(2, 1)` | `(2, 2)` | 0 |

All fresh oranges have been contaminated in 4 minutes.

---

### Step-by-Step Algorithm

1. **Initial Scan and Inventory:**
   - Loop over all rows and columns.
   - If `grid[r][c] == 2`, enqueue `(r, c)`.
   - If `grid[r][c] == 1`, increment `fresh_count += 1`.
2. **Check Base Feasibility:** If `fresh_count == 0`, return `0` immediately.
3. **Run Multi-Source BFS:**
   - Initialize `minutes = 0`.
   - While `queue` is non-empty and `fresh_count > 0`:
     - Increment `minutes += 1`.
     - Capture `level_size = len(queue)` and iterate `level_size` times:
       - Pop `(r, c) = queue.popleft()`.
       - For each orthogonal neighbor `(nr, nc)`:
         - If within grid boundaries and `grid[nr][nc] == 1`:
           - Set `grid[nr][nc] = 2`.
           - Decrement `fresh_count -= 1`.
           - Enqueue `(nr, nc)`.
4. **Return Final Status:** If `fresh_count == 0`, return `minutes`; otherwise, return `-1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Multi-Source BFS" default>

```python
from collections import deque

class Solution:
    def orangesRotting(self, grid: list[list[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        queue: deque[tuple[int, int]] = deque()
        fresh_count = 0

        # 1. Enqueue all initially rotten oranges and count fresh oranges
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    queue.append((r, c))
                elif grid[r][c] == 1:
                    fresh_count += 1

        # If no fresh oranges exist, no time elapses
        if fresh_count == 0:
            return 0

        minutes = 0
        directions = ((-1, 0), (1, 0), (0, -1), (0, 1))

        # 2. Multi-source BFS spreading layer by layer
        while queue and fresh_count > 0:
            minutes += 1
            for _ in range(len(queue)):
                r, c = queue.popleft()

                for dr, dc in directions:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        grid[nr][nc] = 2  # Contaminate immediately
                        fresh_count -= 1
                        queue.append((nr, nc))

        return minutes if fresh_count == 0 else -1
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Repeated Matrix Scans">

```python
class Solution:
    def orangesRotting(self, grid: list[list[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        minutes = 0

        while True:
            to_rot: list[tuple[int, int]] = []
            fresh_exists = False

            for r in range(rows):
                for c in range(cols):
                    if grid[r][c] == 1:
                        fresh_exists = True
                        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                            nr, nc = r + dr, c + dc
                            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 2:
                                to_rot.append((r, c))
                                break

            # If no new oranges can be rotted this minute, exit simulation
            if not to_rot:
                return -1 if fresh_exists else minutes

            for r, c in to_rot:
                grid[r][c] = 2

            minutes += 1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Multi-Source BFS** | $O(m \times n)$ | $O(m \times n)$ | Optimal linear time. Each cell enters and leaves the queue at most once. Extra space used for the queue. |
| **Repeated Matrix Scans** | $O((m \times n)^2)$ | $O(m \times n)$ | Scans the full grid every minute until no changes occur. Inefficient for large sparse grids. |

---

### Common Pitfall: Premature Minute Increments

A common bug is incrementing `minutes` after processing the last layer even when no fresh oranges were infected. Conditioning the loop on `while queue and fresh_count > 0:` guarantees that `minutes` is only incremented when there are actually fresh oranges left to infect. If the queue still has elements but `fresh_count` reaches zero, the loop immediately terminates, avoiding an off-by-one error.

---

### Concise Interview Takeaway

Model simultaneous multi-point spreading with Multi-Source BFS. Seed the queue with all initial sources at time zero, track the remaining target items, and advance time per BFS layer using `len(queue)`. Mark newly contaminated items immediately upon enqueuing to prevent redundant work and achieve optimal $O(m \times n)$ runtime.
