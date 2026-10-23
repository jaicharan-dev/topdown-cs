---
id: 2-max-area-of-island
title: "695. Max Area of Island"
description: "Same sweep as counting islands, except each search reports how big it was"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DFS / BFS</span>

> **Problem Statement:** You are given a grid of land and water cells, where an island is a group of land cells joined up, down, left or right. Return the number of cells in the largest island, or `0` if there is none.

```text
Input:  grid = [[0,0,1,0], [0,1,1,0], [0,0,0,1]]
Output: 3
```

---

### Picture it

This is Number of Islands with the counting moved.

There, each search sank an island and the sweep added one. Here each search **measures** the island it sinks and reports the number of cells it covered, and the sweep keeps the largest report.

So the only change is what the search returns: instead of nothing, it returns a size.

```text
Number of Islands:  found land -> count += 1
Max Area:           found land -> best = max(best, size of this island)
```

---

### How to think about it

The search becomes an arithmetic one. For a cell:

- **Off the grid, or water**, contributes `0`.
- **Land**, contributes `1` for itself plus whatever the four neighbours report.

Mark the cell as water **before** recursing into the neighbours. Doing it after, or not at all, lets the search walk back into cells it has already counted, which both inflates the total and loops forever.

That `1 +` and the sum of four recursive calls is the whole body. It is the same "a node's answer is built from its children's answers" shape as the tree problems, except a grid has four directions instead of two and can revisit, which is why marking is needed where trees needed nothing.

Start the best area at `0`, which is also the answer for a grid with no land at all.

---

### Walking through the example

The grid is:

```text
0 0 1 0
0 1 1 0
0 0 0 1
```

1. **The sweep finds land at (0, 2).** The search marks it, then explores: below is (1, 2), which is land and marks itself, and from there left is (1, 1), also land. Nothing else is adjacent. The reports add up to `1 + 1 + 1 = 3`. Best becomes `3`.
2. **Cells (1, 1) and (1, 2)** are water by the time the sweep reaches them, so they are skipped.
3. **The sweep finds land at (2, 3).** It has no land neighbours, so the search reports `1`, which does not beat `3`.

The answer is `3`.

---

### The code

```python
class Solution:
    def maxAreaOfIsland(self, grid: list[list[int]]) -> int:
        rows, cols = len(grid), len(grid[0])

        def measure(r: int, c: int) -> int:
            if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] == 0:
                return 0

            grid[r][c] = 0   # mark before recursing, or cells are counted twice

            return (1
                    + measure(r + 1, c)
                    + measure(r - 1, c)
                    + measure(r, c + 1)
                    + measure(r, c - 1))

        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 1:
                    best = max(best, measure(r, c))

        return best
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

Each cell is examined by the sweep once and entered by a search at most once, since the search only enters land and immediately marks it.

#### Space: $O(m \cdot n)$ in the worst case

The recursion depth, which on an all-land grid reaches the number of cells.

---

### Remember this

Identical sweep to Number of Islands, with the search returning a size instead of nothing: `0` for water, and `1` plus the four neighbours' reports for land. Mark the cell before recursing, or cells get counted more than once and the search can loop. Keep the largest report rather than a running count. $O(m \cdot n)$ time.
