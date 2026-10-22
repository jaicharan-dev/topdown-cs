---
id: 9-rotate-image
title: "48. Rotate Image"
description: "Flip the matrix along its diagonal, then mirror each row"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Matrix Manipulation</span>

> **Problem Statement:** You are given a square matrix representing an image. Turn it 90 degrees clockwise, changing the matrix you were given rather than building a new one.

```text
Input:  matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
Output: [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
```

---

### Picture it

Rotating by hand, you can see where things have to end up. The first column, read from the bottom up, becomes the first row. The old bottom-left corner becomes the new top-left corner.

You could work out the destination of every single cell and move it there directly, but those moves chain into cycles of four cells that all have to shuffle at once, and the index arithmetic is easy to get wrong under pressure.

There is a much easier route. The rotation can be built out of two moves that are each trivial on their own.

---

### How to think about it

**Move one: flip along the main diagonal.** Swap the cell at row `i`, column `j` with the cell at row `j`, column `i`. The diagonal running from the top-left to the bottom-right stays where it is, and everything else reflects across it. Rows become columns.

**Move two: reverse each row.** Mirror every row left to right.

After the flip, row `i` holds what used to be column `i`, but read from the top down. A clockwise rotation needs that column read from the bottom up. Reversing the row is exactly that correction.

The reason to do it this way is that each move is one obvious loop, both happen in place, and neither needs you to reason about four-cell cycles.

One detail in the flip: the inner loop must start at `j = i + 1`, not at `j = 0`. Swapping the whole square would swap every pair twice and leave the matrix exactly as it started. Only the half above the diagonal should be visited.

---

### Walking through the example

Start with:

```text
1 2 3
4 5 6
7 8 9
```

**Flip along the diagonal.** `2` and `4` trade places, `3` and `7` trade places, `6` and `8` trade places. The diagonal `1`, `5`, `9` does not move.

```text
1 4 7
2 5 8
3 6 9
```

**Reverse each row.**

```text
7 4 1
8 5 2
9 6 3
```

That is the input turned 90 degrees clockwise.

---

### The code

```python
class Solution:
    def rotate(self, matrix: list[list[int]]) -> None:
        n = len(matrix)

        # flip across the main diagonal, visiting only the upper half
        for i in range(n):
            for j in range(i + 1, n):
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

        # mirror every row left to right
        for row in matrix:
            row.reverse()
```

For an anticlockwise rotation the same two moves work, in the other order: reverse each row first, then flip along the diagonal.

---

### Time and space complexity

#### Time: $O(n^2)$

A square matrix of side `n` holds `n` squared cells, and any honest rotation has to touch all of them. The flip visits each cell above the diagonal once, which is about half of them, and the reversing pass touches every cell once more. Constant multiples do not change the shape, so this is $O(n^2)$, and you cannot do better.

#### Space: $O(1)$

Every move is a swap between two cells of the matrix itself. No second matrix, no temporary row, just a handful of loop variables. That is what the problem means by in place.

---

### Remember this

A clockwise rotation is a flip along the main diagonal followed by reversing each row. Only visit the half above the diagonal when flipping, or every swap happens twice and nothing changes. $O(n^2)$ time, because every cell has to move, and $O(1)$ space.
