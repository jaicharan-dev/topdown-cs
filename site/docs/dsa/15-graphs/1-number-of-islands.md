---
id: 1-number-of-islands
title: "200. Number of Islands"
description: "Find one piece of land, sink the whole island it belongs to, count once"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DFS / BFS</span>

> **Problem Statement:** You are given a grid of land and water cells. An island is a group of land cells joined up, down, left or right. Count the islands.

```text
Input:  grid = [["1","1","0"], ["1","0","0"], ["0","0","1"]]
Output: 2
```

---

### Picture it

A grid is a graph wearing a disguise. Each cell is a node, and each cell is joined to its four neighbours. Counting islands is counting **connected groups** in that graph.

So sweep the grid, and the first time you meet a piece of land that has not been seen before, you have found a new island. Add one to the count, then walk the whole island from there, marking every cell you reach so it is never counted again.

Sweeping onward, every other cell of that island is already marked, so it is skipped. The next unmarked piece of land must belong to a different island.

That marking is the entire trick: **one count per island, because the walk consumes the rest of it.**

---

### How to think about it

Loop over every cell. When you find unvisited land, increase the count and start a search from it.

The search goes to each of the four neighbours and, if that neighbour is land, continues from there. Before exploring, mark the current cell so the search cannot come back to it and loop forever.

Marking can be done in the grid itself by overwriting the land with water, which is the simplest option and avoids a separate visited structure. If the input must not be modified, use a set of visited positions instead, which costs $O(m \cdot n)$ memory.

Note that nothing is restored afterwards, which is the opposite of the backtracking problems. There, a cell had to be freed for other paths; here, a visited cell should stay visited forever, because it belongs to an island already counted. Backtracking explores every path, this explores every cell once.

Depth-first and breadth-first both work. Depth-first is shorter, and a long snaking island can push the recursion depth up to the number of cells, which is worth mentioning when the grid is large.

---

### Walking through the example

The grid is:

```text
1 1 0
1 0 0
0 0 1
```

1. **Cell (0, 0) is land**, unvisited. Count becomes `1`, and a search starts. It reaches (0, 1) to the right and (1, 0) below, marking all three as water. Nothing else is adjacent.
2. **Cells (0, 1) and (1, 0)** are now water when the sweep reaches them, so they are skipped. This is the marking doing its job.
3. **Cell (2, 2) is land**, unvisited. Count becomes `2`, and the search marks it. It has no land neighbours.

The answer is `2`.

---

### The code

```python
class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0

        def sink(r: int, c: int) -> None:
            if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != "1":
                return

            grid[r][c] = "0"   # marked, and never restored

            sink(r + 1, c)
            sink(r - 1, c)
            sink(r, c + 1)
            sink(r, c - 1)

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    count += 1   # a new island, counted once
                    sink(r, c)

        return count
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

Every cell is examined by the sweep once, and visited by a search at most once, because the search only enters unmarked land and marks it immediately.

#### Space: $O(m \cdot n)$ in the worst case

The recursion depth. A grid that is entirely land gives a search that goes as deep as there are cells. A breadth-first version has the same bound in its queue. Marking happens in the grid, so no separate visited structure is needed.

---

### Remember this

A grid is a graph where each cell joins its four neighbours, and counting islands is counting connected groups. Sweep, and on each unvisited piece of land add one to the count and walk the whole island, marking as you go so the rest of it is never counted again. Unlike backtracking, marks are never undone, since every cell belongs to exactly one island. $O(m \cdot n)$ time.
