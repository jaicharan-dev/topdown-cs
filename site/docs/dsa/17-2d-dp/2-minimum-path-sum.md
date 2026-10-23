---
id: 2-minimum-path-sum
title: "64. Minimum Path Sum"
description: "Same grid walk as counting routes, with the cheaper neighbour instead of the sum of both"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Grid DP</span>

> **Problem Statement:** Given a grid of non-negative numbers, walk from the top-left to the bottom-right moving only right or down, and return the smallest total of the numbers along the way.

```text
Input:  grid = [[1, 3, 1], [1, 5, 1], [4, 2, 1]]
Output: 7
```

---

### Picture it

Unique Paths asked how many ways there were into a cell and added the two counts. This asks what the cheapest way in costs, so it takes the **better** of the two instead:

```text
cheapest(cell) = value of the cell + the smaller of cheapest(above), cheapest(left)
```

The structure is identical, and only the combining operation changes. That is the pattern across this whole block: the grid walk stays, and the problem decides whether you add, take a maximum, or take a minimum.

The top row and left column are again forced. Along the top row the only way in is from the left, so each cell is its own value plus everything before it, and the left column works the same way downward.

---

### How to think about it

Fill the grid left to right and top to bottom, so both neighbours are known when needed.

**The first cell** is simply its own value. **The top row** adds the cell to the left. **The left column** adds the cell above. **Everything else** adds the smaller of the two.

Doing it in the input grid itself is the tidiest version and uses no extra memory, provided mutating the input is acceptable. Say so out loud rather than assuming, since some interviewers care.

Note that greed does not work here. Choosing the cheaper neighbour at each step while walking forwards can walk into an expensive region later. Filling the whole grid considers every route, which is the point of the method.

A detail worth holding on to: because all the values are non-negative, there is never a reason to move up or left, which is what keeps this a simple grid fill rather than a shortest-path search. With negative values allowed, Dijkstra or Bellman-Ford would be needed instead.

---

### Walking through the example

The grid is:

```text
1  3  1
1  5  1
4  2  1
```

Filling in the cheapest cost to reach each cell:

```text
1  4  5
2  7  6
6  8  7
```

- **Top row:** `1`, then `1 + 3 = 4`, then `4 + 1 = 5`.
- **Left column:** `1`, then `1 + 1 = 2`, then `2 + 4 = 6`.
- **Cell (1,1):** value `5` plus the smaller of `4` above and `2` left, so `5 + 2 = 7`.
- **Cell (1,2):** value `1` plus the smaller of `5` above and `7` left, so `1 + 5 = 6`.
- **Cell (2,1):** value `2` plus the smaller of `7` above and `6` left, so `2 + 6 = 8`.
- **Cell (2,2):** value `1` plus the smaller of `6` above and `8` left, so `1 + 6 = 7`.

The answer is `7`, along the route `1 -> 3 -> 1 -> 1 -> 1`.

---

### The code

```python
class Solution:
    def minPathSum(self, grid: list[list[int]]) -> int:
        rows, cols = len(grid), len(grid[0])

        for r in range(rows):
            for c in range(cols):
                if r == 0 and c == 0:
                    continue                      # the start costs its own value
                elif r == 0:
                    grid[r][c] += grid[r][c - 1]  # top row: only from the left
                elif c == 0:
                    grid[r][c] += grid[r - 1][c]  # left column: only from above
                else:
                    grid[r][c] += min(grid[r - 1][c], grid[r][c - 1])

        return grid[rows - 1][cols - 1]
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

One comparison and one addition per cell.

#### Space: $O(1)$

The costs are written into the input grid. Using a separate grid is $O(m \cdot n)$, and a single row is $O(n)$, which is the version to use when the input must not be modified.

---

### Remember this

Identical grid walk to Unique Paths, with `min` of the two neighbours instead of their sum, plus the cell's own value. The top row and left column have only one way in, so they accumulate straight along. Greed fails, which is why the whole grid is filled. Non-negative values are what keep this a grid fill rather than a shortest-path search. $O(m \cdot n)$ time.
