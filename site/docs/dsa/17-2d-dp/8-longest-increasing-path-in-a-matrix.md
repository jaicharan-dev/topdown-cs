---
id: 8-longest-increasing-path-in-a-matrix
title: "329. Longest Increasing Path in a Matrix"
description: "Strictly increasing means no cycles, so a plain search plus a cache is enough"
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Memoized DFS / DAG</span>

> **Problem Statement:** Given a matrix of numbers, find the longest path whose values strictly increase, moving up, down, left or right.

```text
Input:  matrix = [[9, 9, 4], [6, 6, 8], [2, 1, 1]]
Output: 4
```

---

### Picture it

Grid searches normally need a visited marker, because a walk can loop back on itself. Here it cannot, and understanding why is what makes the solution simple.

Every step must go to a **strictly larger** value. So a path can never return to where it has been, since that would mean arriving back at a value both larger and smaller than itself. The grid, read as a graph of allowed moves, has no cycles at all.

That means two things. No visited set is needed. And the answer at a cell, the longest increasing path starting there, depends only on its neighbours' answers and never on how you arrived.

So compute it for every cell and keep the largest. The same cell gets asked about many times, from each of its smaller neighbours, so **cache** the answer the first time it is worked out.

---

### How to think about it

Write a search that returns the length of the longest increasing path starting at a cell:

1. **If the answer is cached**, return it.
2. **Otherwise** try all four neighbours, and for each one that is strictly larger, take the path length from there.
3. **The answer is `1 +` the best of those**, or `1` if no neighbour is larger, since the cell alone is a path of length one.
4. **Cache it** before returning.

Then sweep every cell as a starting point and take the largest result.

The cache is what turns this from exponential into linear. Without it the same sub-paths get recomputed from every route that reaches them. With it, each cell is computed exactly once and read thereafter.

That is memoisation, and this problem is the clean example of where it beats a table: the dependencies run in whatever direction the values happen to increase, so there is no row-by-row order to fill in. The alternative is to sort all the cells by value and process them in order, which is a genuine table-filling solution and also $O(m n \log(m n))$ because of the sort, so the cache is both simpler and faster.

---

### Walking through the example

The matrix is:

```text
9  9  4
6  6  8
2  1  1
```

Start from the `1` at the bottom middle. Its larger neighbours are `2` to the left and `6` above.

- **From `2`:** its only larger neighbour is `6` above. From `6`, the larger neighbour is `9` above. From `9`, nothing is larger, so that chain gives `9`, then `6`, then `2`, a length of `3`. So starting at `1` through `2` gives `4`.
- **From `6`:** the chain `6 -> 9` gives `2`, so starting at `1` that way gives `3`.

The best from this cell is `4`, the path `1 -> 2 -> 6 -> 9`.

When the sweep later starts at `2`, its answer is already cached as `3` and is returned immediately rather than recomputed. That saving, multiplied across the grid, is the whole point.

---

### The code

```python
from functools import lru_cache

class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])

        @lru_cache(maxsize=None)
        def longest_from(r: int, c: int) -> int:
            best = 1   # the cell on its own is already a path

            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc

                # strictly larger, which is also why no visited set is needed
                if (0 <= nr < rows and 0 <= nc < cols
                        and matrix[nr][nc] > matrix[r][c]):
                    best = max(best, 1 + longest_from(nr, nc))

            return best

        return max(longest_from(r, c)
                   for r in range(rows)
                   for c in range(cols))
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

Each cell's answer is computed once and cached, and computing it looks at four neighbours. Everything afterwards is a cache read.

Without the cache it would be exponential, since every path would be explored separately.

#### Space: $O(m \cdot n)$

The cache, plus recursion depth that can reach the number of cells on a grid whose values increase along a single snaking path.

---

### Remember this

Strictly increasing moves cannot cycle, so no visited marker is needed and a cell's answer is independent of how you reached it. Compute the longest path starting at each cell, recursing into strictly larger neighbours, and cache each answer the first time. The cache is what makes it linear instead of exponential, and memoisation beats a table here because the dependencies follow the values rather than the grid. $O(m \cdot n)$ time.
