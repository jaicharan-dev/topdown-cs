---
id: 10-spiral-matrix
title: "54. Spiral Matrix"
description: "Four boundaries that close in, one walk at a time"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Simulation</span>

> **Problem Statement:** You are given a matrix. Read its values in a spiral, starting at the top-left corner and going clockwise, and return them in a list.

```text
Input:  matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
Output: [1, 2, 3, 6, 9, 8, 7, 4, 5]
```

---

### Picture it

Peel the matrix like an onion.

Walk the top row from left to right, and that row is now finished, so forget it exists. Walk down the right-hand column, and forget that too. Walk the bottom row backwards, forget it. Walk up the left-hand column, forget it.

What is left is a smaller matrix, and the same four walks apply to it. Keep peeling until nothing is left.

---

### How to think about it

Rather than tracking a direction and turning corners, keep four lines that mark how much is still unread: `top`, `bottom`, `left` and `right`.

Each walk moves along one of those edges and then retires it by moving the line inward:

1. Walk the `top` row, left to right, then move `top` down by one.
2. Walk the `right` column, top to bottom, then move `right` left by one.
3. Walk the `bottom` row, right to left, then move `bottom` up by one.
4. Walk the `left` column, bottom to top, then move `left` right by one.

Repeat while `top` is still at or above `bottom` and `left` is still at or left of `right`. When the lines cross, the whole matrix has been read.

**The part that bites.** Steps three and four each need a check before they run. Picture a single row left at the end: step one reads it and moves `top` past `bottom`. Without a check, step three would read that same row again, backwards. The same thing happens with a single remaining column and step four. So guard step three with "is there still a row between the lines" and step four with "is there still a column".

This is why non-square matrices are the interesting test. A square matrix can hide the bug.

---

### Walking through the example

Start with `top = 0`, `bottom = 2`, `left = 0`, `right = 2`.

1. **Top row:** `1, 2, 3`. Now `top = 1`.
2. **Right column**, rows `1` to `2`: `6, 9`. Now `right = 1`.
3. **Bottom row**, backwards from column `1`: `8, 7`. Now `bottom = 1`.
4. **Left column**, from row `1` up to row `1`: `4`. Now `left = 1`.

The lines are now `top = 1`, `bottom = 1`, `left = 1`, `right = 1`, so one cell is left.

5. **Top row** again, which is just `5`. Now `top = 2`, which is past `bottom`, so the loop ends.

The result is `[1, 2, 3, 6, 9, 8, 7, 4, 5]`.

---

### The code

```python
class Solution:
    def spiralOrder(self, matrix: list[list[int]]) -> list[int]:
        top, bottom = 0, len(matrix) - 1
        left, right = 0, len(matrix[0]) - 1
        out = []

        while top <= bottom and left <= right:
            for col in range(left, right + 1):
                out.append(matrix[top][col])
            top += 1

            for row in range(top, bottom + 1):
                out.append(matrix[row][right])
            right -= 1

            # only if a row is genuinely left to walk back along
            if top <= bottom:
                for col in range(right, left - 1, -1):
                    out.append(matrix[bottom][col])
                bottom -= 1

            # only if a column is genuinely left to climb
            if left <= right:
                for row in range(bottom, top - 1, -1):
                    out.append(matrix[row][left])
                left += 1

        return out
```

---

### Time and space complexity

Call the matrix `m` rows by `n` columns.

#### Time: $O(m n)$

Every cell is appended exactly once and never revisited, because each walk retires the edge it just read. So the work is one step per cell, and there are `m` times `n` of them.

#### Space: $O(1)$

Four boundary numbers and a couple of loop variables. The returned list is not counted as working memory, since producing it is the point of the problem.

---

### Remember this

Hold four lines, `top`, `bottom`, `left` and `right`, walk the edge each one marks, then move that line inward. Check that a row still remains before the backwards walk, and that a column still remains before the upward walk, or a lone row or column gets read twice. $O(m n)$ time, $O(1)$ space.
