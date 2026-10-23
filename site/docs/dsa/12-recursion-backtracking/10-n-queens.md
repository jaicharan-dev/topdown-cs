---
id: 10-n-queens
title: "51. N-Queens"
description: "One queen per row, with three sets remembering every square already attacked"
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Constraint Satisfaction</span>

> **Problem Statement:** Place `n` queens on an `n` by `n` board so that no two can attack each other, and return every distinct arrangement. Queens attack along rows, columns and both diagonals.

```text
Input:  n = 4
Output: [[".Q..", "...Q", "Q...", "..Q."], ["..Q.", "Q...", "...Q", ".Q.."]]
```

---

### Picture it

Two observations shrink this enormously before any code is written.

**One queen per row.** Two queens sharing a row attack each other, so every solution has exactly one queen in each row. That turns "choose `n` squares from `n²`" into "choose a column for row 0, then row 1, and so on", which is a decision tree of depth `n` with `n` branches per level.

**Rows are therefore free.** With one queen per row the row constraint can never be violated, so only columns and diagonals need checking.

Then the work is: go row by row, try each column, and reject any square already attacked. When all `n` rows have a queen, record the board.

---

### How to think about it

The useful part is making "is this square attacked" instant.

A **column** is attacked if some earlier queen used that column number. Keep a set of used columns.

A **diagonal** needs a name. Every square on the same down-right diagonal has the same value of `row - col`, and every square on the same down-left diagonal has the same value of `row + col`:

```text
row - col  stays constant going down and to the right
row + col  stays constant going down and to the left
```

So two more sets, keyed by those sums and differences, cover both diagonal directions. Three constant-time set lookups then replace any scanning of the board.

The recursion is then the familiar rhythm: for each column in the current row, if none of the three sets claims it, add the queen and record it in all three sets, recurse to the next row, then remove it from all three. That removal is the backtracking, and missing one of the three sets is the usual bug.

Rendering happens only at the leaves, so the board itself can be kept as a list of column positions and turned into strings once a full arrangement is found.

---

### Walking through the example

For `n = 4`, following the branch that succeeds first.

1. **Row 0.** Try column 0. It is free, so place a queen. The sets record column `0`, difference `0`, sum `0`.
2. **Row 1.** Columns 0 and 1 are attacked, by the column set and by the diagonal respectively. Column 2 is free, so place a queen there.
3. **Row 2.** Every column is attacked: 0 by the column set, 1 and 3 by diagonals from the queen in row 1, and 2 by the column set. Dead end, so back up.
4. **Back at row 1**, try column 3 instead. Then row 2 allows column 1, but row 3 then has nothing. Back up all the way.
5. **Row 0, column 1.** This branch leads to columns 3, 0 and 2 in the following rows, which is the first solution.

Continuing finds the mirrored arrangement, giving the two solutions shown.

---

### The code

```python
class Solution:
    def solveNQueens(self, n: int) -> list[list[str]]:
        out = []
        columns = set()
        down_right = set()   # row - col is constant along these
        down_left = set()    # row + col is constant along these
        placement = []       # the column chosen for each row

        def place(row: int) -> None:
            if row == n:
                out.append(["." * c + "Q" + "." * (n - c - 1) for c in placement])
                return

            for col in range(n):
                if col in columns or (row - col) in down_right or (row + col) in down_left:
                    continue

                columns.add(col)
                down_right.add(row - col)
                down_left.add(row + col)
                placement.append(col)

                place(row + 1)

                # undo all three, or later rows see phantom attacks
                placement.pop()
                down_left.remove(row + col)
                down_right.remove(row - col)
                columns.remove(col)

        place(0)
        return out
```

---

### Time and space complexity

#### Time: $O(n!)$ roughly

The first row has `n` choices, the second at most `n - 1` once a column is taken, and so on, which gives a factorial shape. The diagonal checks prune far more than that bound suggests, so real runs finish much sooner, but the growth is still brutal: `n = 8` has 92 solutions and is instant, while `n = 15` takes a serious amount of time.

#### Space: $O(n)$ beyond the answer

Three sets holding at most `n` entries each, the placement list, and `n` levels of recursion.

---

### Remember this

One queen per row removes the row constraint entirely and turns the problem into choosing a column per row. Name the diagonals with `row - col` and `row + col` so three sets make every attack check constant. Add to all three sets when placing and remove from all three when backing out, since forgetting one leaves phantom attacks that silently lose solutions.
