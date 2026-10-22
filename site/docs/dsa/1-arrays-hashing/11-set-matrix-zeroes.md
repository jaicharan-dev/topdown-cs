---
id: 11-set-matrix-zeroes
title: "73. Set Matrix Zeroes"
description: "Write the notes in the first row and column, then wipe"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Matrix Manipulation</span>

> **Problem Statement:** You are given a matrix. Wherever a cell holds `0`, set its whole row and its whole column to `0`. Change the matrix you were given, and use only a constant amount of extra memory.

```text
Input:  matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
Output: [[1, 0, 1], [0, 0, 0], [1, 0, 1]]
```

---

### Picture it

The obvious attempt is to walk the matrix and, every time you meet a `0`, wipe its row and column on the spot.

That destroys the matrix. The zeros you just wrote are indistinguishable from the zeros that were there to begin with, so when the walk reaches one of them it wipes another row and column, which creates more zeros, and the damage spreads until almost everything is `0`.

So the job splits into two stages that must not be mixed. First work out which rows and columns are doomed. Only then wipe them.

---

### How to think about it

Keeping a list of doomed rows and a list of doomed columns works perfectly and is easy to explain. It costs memory proportional to the width plus the height of the matrix. The problem asks for constant extra memory, so the lists have to go somewhere else.

The idea is to store the notes inside the matrix, in cells that are already doomed anyway.

Use the first row as the notes about columns, and the first column as the notes about rows. If the cell at row `i`, column `j` is `0`, write a `0` into the first cell of row `i` and the first cell of column `j`. Those marker cells end up zero in the final answer regardless, so nothing is lost by scribbling on them.

There is one cell this cannot handle. The corner cell belongs to the first row and the first column at the same time, so it cannot carry two separate pieces of information. Give the first column its own single boolean variable, and let the corner cell speak only for the first row. One extra variable is still constant memory.

The order of operations then matters:

1. **Scan and mark**, reading each cell and writing markers into the first row and column.
2. **Wipe the inside**, from row `1` and column `1` onward, reading the markers. The inside is wiped first because the markers must stay readable while it happens.
3. **Wipe the first row and the first column last**, once nothing else needs to read them.

---

### Walking through the example

Start with:

```text
1 1 1
1 0 1
1 1 1
```

**Scan and mark.** The only `0` is at row `1`, column `1`. So write `0` into the first cell of row `1`, and into the first cell of column `1`:

```text
1 0 1
0 0 1
1 1 1
```

**Wipe the inside**, looking only at cells from row `1` and column `1` onward. Row `1` is marked, so its remaining cells go to `0`. Column `1` is marked, so its remaining cells go to `0`:

```text
1 0 1
0 0 0
1 0 1
```

**Finish the first row and column.** The corner cell is `1`, so the first row stays. The boolean for the first column was never set, so the first column stays. That is the final answer.

---

### The code

```python
class Solution:
    def setZeroes(self, matrix: list[list[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        first_col_zero = False

        # 1. mark, using row 0 and column 0 as the notes
        for i in range(rows):
            if matrix[i][0] == 0:
                first_col_zero = True
            for j in range(1, cols):
                if matrix[i][j] == 0:
                    matrix[i][0] = 0
                    matrix[0][j] = 0

        # 2. wipe the inside while the notes are still readable
        for i in range(1, rows):
            for j in range(1, cols):
                if matrix[i][0] == 0 or matrix[0][j] == 0:
                    matrix[i][j] = 0

        # 3. the notes themselves, last of all
        if matrix[0][0] == 0:
            for j in range(cols):
                matrix[0][j] = 0

        if first_col_zero:
            for i in range(rows):
                matrix[i][0] = 0
```

Notice that the marking loop starts its inner scan at column `1`. Column `0` is handled by the boolean instead, which is what keeps the corner cell free to speak for the first row.

---

### Time and space complexity

Call the matrix `m` rows by `n` columns.

#### Time: $O(m n)$

Two full passes over the matrix, one to mark and one to wipe, plus two single-line passes at the end. Each cell is read a constant number of times, so the work tracks the number of cells.

#### Space: $O(1)$

One boolean, and that is all. The notes live inside the matrix in cells that were destined to be zero anyway, so no storage grows with the size of the input. Keeping separate lists of doomed rows and columns would have been $O(m + n)$.

---

### Remember this

Mark first, wipe afterwards, or your own zeros get mistaken for the originals. Store the marks in the first row and the first column, keep one boolean for the first column because the corner cell cannot do two jobs, wipe the inside before touching the markers, and do the first row and column last. $O(m n)$ time, $O(1)$ space.
