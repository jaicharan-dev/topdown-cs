---
id: 5-search-a-2d-matrix
title: "74. Search a 2D Matrix"
description: "The rows joined end to end are one sorted list, so search that instead"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Matrix Projection</span>

> **Problem Statement:** You are given a matrix where each row is sorted, and the first number of every row is larger than the last number of the row above it. Decide whether a `target` appears in it, in $O(\log(m \cdot n))$ time.

```text
Input:  matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target = 3
Output: true
```

---

### Picture it

Read the second condition carefully, because it is doing all the work.

Each row is sorted, **and** every row starts above where the previous row ended. So if you wrote the rows out one after another on a single line, the result would be sorted from beginning to end:

```text
1, 3, 5, 7, 10, 11, 16, 20, 23, 30, 34, 60
```

That is an ordinary sorted array, and searching one of those is a solved problem. The matrix shape is presentation, not structure.

Nothing has to be flattened for real. A position in that imaginary line can be converted into a row and column whenever you need to read a value.

---

### How to think about it

Run a standard binary search over positions `0` to `m * n - 1`, as though the long line existed.

To read the value at position `i`, convert:

```text
row    = i // number of columns
column = i % number of columns
```

Dividing tells you how many full rows fit before that position, which is the row number. The remainder tells you how far into that row to reach.

Everything else is the plain binary search template: check the middle, move past it in whichever direction, stop when the range empties.

The alternative is two separate searches, one down the first column to pick the row and one across that row. It is also $O(\log(m \cdot n))$ once you work the logarithms out, but it is twice the code and twice the chance of an off-by-one.

Note that this trick depends entirely on the strict relationship between rows. A matrix whose rows and columns are each sorted but where rows can overlap, which is a different common problem, is **not** one sorted line and needs a different method.

---

### Walking through the example

Take the matrix with 3 rows and 4 columns, so positions run from `0` to `11`, and `target = 3`.

1. **The middle is position 5.** Row `5 // 4 = 1`, column `5 % 4 = 1`, which holds `11`. Too big, so everything from there on is ruled out. The range becomes `0` to `4`.
2. **The middle is position 2.** Row `0`, column `2`, which holds `5`. Still too big. The range becomes `0` to `1`.
3. **The middle is position 1.** Row `0`, column `1`, which holds `3`. That is the target, so return `true`.

---

### The code

```python
class Solution:
    def searchMatrix(self, matrix: list[list[int]], target: int) -> bool:
        rows, cols = len(matrix), len(matrix[0])
        low, high = 0, rows * cols - 1

        while low <= high:
            mid = (low + high) // 2

            # read the matrix as though it were one long sorted row
            value = matrix[mid // cols][mid % cols]

            if value == target:
                return True

            if value < target:
                low = mid + 1
            else:
                high = mid - 1

        return False
```

---

### Time and space complexity

#### Time: $O(\log(m \cdot n))$

The search covers `m * n` positions and halves the range each step, so it is the logarithm of the total number of cells. For a thousand by a thousand matrix, a million cells, that is about twenty steps.

#### Space: $O(1)$

Three numbers. The long sorted line is never actually built, which is the point of converting positions on the fly: building it would cost $O(m \cdot n)$ memory for no benefit.

---

### Remember this

Because every row starts above where the last one ended, the rows laid end to end form a single sorted list. Binary search over positions `0` to `m * n - 1` and convert each one with `mid // cols` and `mid % cols`. This works only with that strict between-row guarantee, not for a matrix whose rows merely overlap in sorted order. $O(\log(m \cdot n))$ time, $O(1)$ space.
