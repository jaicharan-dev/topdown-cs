---
id: 1-unique-paths
title: "62. Unique Paths"
description: "Routes into a cell are routes from above plus routes from the left"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DP</span>

> **Problem Statement:** A robot starts at the top-left corner of a grid and can only move right or down. Count the distinct routes to the bottom-right corner.

```text
Input:  m = 3, n = 7
Output: 28
```

---

### Picture it

Stand on any cell and look back. The robot only moves right or down, so it arrived from exactly one of two places: the cell **above**, or the cell to the **left**.

Those two groups of routes are different from each other, since they differ in the final move, and together they are all the routes. So:

```text
routes(cell) = routes(above) + routes(left)
```

This is Climbing Stairs with a second dimension. There, a step was reached from one of two earlier steps; here, a cell is reached from one of two neighbours. The formula is the same addition, laid out on a grid instead of a line.

The top row and the left column are the base cases: there is exactly one way along each of them, since the robot has no choice but to keep going straight.

---

### How to think about it

Fill a grid of counts, working left to right and top to bottom so that both the cell above and the cell to the left are always already known.

Set the whole top row and left column to `1`, then every inner cell is one addition.

**The memory reduction** is the same observation as in the 1D problems. The formula reaches back one row and one column, so the whole grid is unnecessary: a single row suffices. Walking it left to right, the value already in a slot is the row above and the value just computed is the cell to the left, so `row[c] += row[c - 1]` does the whole update in place.

That collapse from a grid to a row is the standard move in this block, and it is worth doing once by hand to see why the stale value is exactly the one you want.

**The arithmetic shortcut** is worth naming: every route makes `m - 1` downward moves and `n - 1` rightward ones in some order, so the answer is the number of ways to choose which moves are downward, a binomial coefficient. That is $O(m + n)$ with no table at all, though it risks overflow in fixed-width languages.

---

### Walking through the example

Take a small case, `m = 3` and `n = 3`, so the grid of counts fills in as:

```text
1  1  1
1  2  3
1  3  6
```

The top row and left column are all `1`. The cell at row 1, column 1 is `1 + 1 = 2`. The one to its right is `1 + 2 = 3`. The bottom-right is `3 + 3 = 6`.

For the stated input of `m = 3` and `n = 7`, the same filling carries on across seven columns and ends at `28`.

---

### The code

```python
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        # one row is enough: the stale value is the row above
        row = [1] * n

        for _ in range(1, m):
            for c in range(1, n):
                row[c] += row[c - 1]   # from above, plus from the left

        return row[n - 1]
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

One addition per cell.

#### Space: $O(n)$

A single row. The full grid is $O(m \cdot n)$ and is the clearer first draft; collapse it once the formula's reach is clear. The binomial shortcut needs no table at all.

---

### Remember this

A cell is reached from above or from the left, so the counts add, which makes this Climbing Stairs on a grid. The top row and left column are all `1`, since there is no choice along them. Because the formula reaches back only one row, a single row replaces the grid, with `row[c] += row[c - 1]` reading the row above and the cell to the left at once. $O(m \cdot n)$ time, $O(n)$ space.
