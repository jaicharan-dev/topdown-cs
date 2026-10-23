---
id: 3-maximal-square
title: "221. Maximal Square"
description: "A square ending here is limited by the smallest of the three squares behind it"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Geometry Matrix DP</span>

> **Problem Statement:** Given a matrix of `0`s and `1`s, find the largest square made entirely of `1`s and return its area.

```text
Input:  matrix = [["1","0","1","0","0"],["1","0","1","1","1"],
                  ["1","1","1","1","1"],["1","0","0","1","0"]]
Output: 4
```

---

### Picture it

Ask a focused question at each cell: **how big is the largest square whose bottom-right corner is here?**

If the cell is `0`, the answer is zero. If it is `1`, the square extends back up and to the left, and it can only be as large as all three of its neighbours allow:

```text
above        above-left
left         HERE
```

For a square of side `3` to end here, there must be squares of side at least `2` ending at the cell above, the cell to the left, **and** the cell diagonally up-left. Any one of them falling short caps the whole thing.

So the rule is the **smallest** of those three, plus one:

```text
side(cell) = 1 + min(above, left, above-left)
```

Three neighbours rather than two, and `min` rather than `max`, because every one of them is a limit.

---

### How to think about it

Fill a grid of side lengths, left to right and top to bottom.

**A cell holding `0`** gets `0`: no square can end on empty ground.

**A cell in the top row or left column** holding `1` gets `1`. There is no room behind it for anything larger.

**Any other cell holding `1`** takes one more than the smallest of its three neighbours.

Track the largest side seen anywhere, and remember the question asks for the **area**, so square it at the end. Returning the side length is the easiest way to get this wrong.

Why the diagonal neighbour is needed is worth being able to explain. The cell above guarantees a tall block, and the cell to the left guarantees a wide one, but neither says anything about the corner where they meet. The diagonal value is what certifies that the interior is filled.

Using `min` of the three is the heart of it: a square is only as good as its weakest supporting direction.

---

### Walking through the example

Fill in the side lengths:

```text
1  0  1  0  0
1  0  1  1  1
1  1  1  2  2
1  0  0  1  0
```

- **Rows 0 and 1** are mostly `1`s and `0`s copied straight across, since the top row has no room behind it and row 1 has no two-by-two block of `1`s.
- **Cell (2,3)** holds `1`. Above is `1`, left is `1`, above-left is `1`, so the smallest is `1` and the side becomes `2`. That is the two-by-two square covering rows 1 and 2, columns 2 and 3.
- **Cell (2,4)** likewise becomes `2`.
- **Cell (3,3)** holds `1`, but its left neighbour is `0`, so the smallest is `0` and the side stays `1`.

The largest side is `2`, so the area is `4`.

---

### The code

```python
class Solution:
    def maximalSquare(self, matrix: list[list[str]]) -> int:
        rows, cols = len(matrix), len(matrix[0])
        side = [[0] * cols for _ in range(rows)]
        best = 0

        for r in range(rows):
            for c in range(cols):
                if matrix[r][c] != "1":
                    continue

                if r == 0 or c == 0:
                    side[r][c] = 1   # no room behind it for anything bigger
                else:
                    # every direction is a limit, so take the smallest
                    side[r][c] = 1 + min(side[r - 1][c],
                                         side[r][c - 1],
                                         side[r - 1][c - 1])

                best = max(best, side[r][c])

        return best * best   # the question asks for the area
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

One comparison of three values per cell.

#### Space: $O(m \cdot n)$

The grid of side lengths. It can be reduced to two rows, or one row plus a saved diagonal value, since the formula only reaches back one row.

---

### Remember this

Ask at each cell how large a square can **end** there. A `1` extends the squares above, left and diagonally up-left, so the answer is one more than the **smallest** of the three, because each is a limit. The diagonal is what certifies the corner between the tall and wide blocks. Square the best side at the end, since the answer is an area. $O(m \cdot n)$ time.
