---
id: 10-n-queens
title: "51. N-Queens"
description: "Row-by-row queen placement with column and diagonal attack sets"
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Constraint Satisfaction</span>

> **Problem Statement:** The $n$-queens puzzle is the challenge of placing $n$ queens on an $n \times n$ chessboard such that no two queens attack each other. Given an integer `n`, return all distinct solutions to the $n$-queens puzzle in any order. Each solution is represented as a distinct board configuration where `'Q'` denotes a queen and `'.'` denotes an empty space.

```text
Input:  n = 4
Output: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]
Explanation: There exist two distinct configurations of 4 non-attacking queens on a 4x4 board.
```

---

### The Intuitive Mental Model

In chess, a Queen can attack any square located in the same row, column, or diagonal.

Trying to place queens randomly across all $n^2$ cells produces an astronomical search space $\binom{n^2}{n}$. We eliminate this explosion by enforcing a structural invariant:
> Because no two queens can share the same row, every single row must contain exactly one queen.

We proceed row by row from top to bottom ($r = 0, 1, \dots, n - 1$):
- Placing one queen per row guarantees zero row conflicts automatically.
- We only need to ensure the candidate square `(r, c)` is not attacked by any previously placed queen in its column or either diagonal.

#### $O(1)$ Diagonal Detection Math
How do we check if `(r, c)` shares a diagonal with an existing queen in $O(1)$ time without scanning the board?
1. **Positive Diagonal ($\nearrow$):** Moving up-right increments $r$ while decrementing $c$, meaning the sum $r + c$ remains constant along the entire diagonal.
2. **Negative Diagonal ($\searrow$):** Moving down-right increments both $r$ and $c$, meaning the difference $r - c$ remains constant along the entire diagonal.

By maintaining three hash sets (`cols`, `pos_diag` tracking $r + c$, and `neg_diag` tracking $r - c$), we detect attacks in instant $O(1)$ time.

#### Brute Force: Board-Scanning Queen Validation
At each candidate square `(r, c)`, scan upward through all previous rows and both upper diagonals to verify safety. While correct, scanning the board takes $O(n)$ time per placement attempt, adding extra overhead to every node in the recursion tree.

#### Optimal Approach: Hash Set Diagonal Tracking
Maintain three sets: `cols`, `pos_diag` ($r + c$), and `neg_diag` ($r - c$). A square `(r, c)` is safe if and only if `c not in cols`, `(r + c) not in pos_diag`, and `(r - c) not in neg_diag`. Adding, checking, and removing values take $O(1)$ time.

#### Execution Walkthrough

Let us trace `n = 4` exploring the first valid branch:

| Step | Row `r` | Col `c` | Conflict Check | Action Taken | Active Sets (`cols`, `pos_diag`, `neg_diag`) |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` | `1` | None | Place Queen at `(0, 1)` | `cols={1}`, `pos={1}`, `neg={-1}` |
| **2** | `1` | `0` | `pos_diag (1+0=1)` conflict | Skip `c = 0` | Unchanged |
| **3** | `1` | `1` | `cols (1)` conflict | Skip `c = 1` | Unchanged |
| **4** | `1` | `2` | `neg_diag (1-2=-1)` conflict | Skip `c = 2` | Unchanged |
| **5** | `1` | `3` | None | Place Queen at `(1, 3)` | `cols={1, 3}`, `pos={1, 4}`, `neg={-1, -2}` |
| **6** | `2` | `0` | None | Place Queen at `(2, 0)` | `cols={0, 1, 3}`, `pos={1, 2, 4}`, `neg={-1, -2, 2}` |
| **7** | `3` | `2` | None | Place Queen at `(3, 2)` | All 4 queens placed! |
| **8** | `4` | - | Base case reached | Record valid solution | `[".Q..", "...Q", "Q...", "..Q."]` |

---

### Step-by-Step Algorithm

1. **Initialize State:**
   - Create sets: `cols = set()`, `pos_diag = set()`, and `neg_diag = set()`.
   - Create chessboard: `board = [["."] * n for _ in range(n)]`.
   - Create `result = []`.
2. **Define Recursive DFS:** Define helper `dfs(r)` where `r` is the current row.
3. **Base Case Check:** If `r == n`, all $n$ queens have been safely placed. Convert `board` into a list of strings (`["".join(row) for row in board]`), append to `result`, and return.
4. **Iterate Columns:** Loop `c` from `0` to `n - 1`:
   - If `c in cols` or `(r + c) in pos_diag` or `(r - c) in neg_diag`, `continue`.
   - **Place Queen:**
     - Add `c` to `cols`, `(r + c)` to `pos_diag`, and `(r - c)` to `neg_diag`.
     - Set `board[r][c] = "Q"`.
   - **Explore Next Row:** Recurse with `dfs(r + 1)`.
   - **Backtrack:**
     - Remove `c` from `cols`, `(r + c)` from `pos_diag`, and `(r - c)` from `neg_diag`.
     - Reset `board[r][c] = "."`.
5. **Trigger and Return:** Call `dfs(0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Hash Set Diagonal Tracking" default>

```python
class Solution:
    def solveNQueens(self, n: int) -> list[list[str]]:
        result: list[list[str]] = []
        board: list[list[str]] = [["."] * n for _ in range(n)]

        cols: set[int] = set()
        pos_diag: set[int] = set()  # (r + c)
        neg_diag: set[int] = set()  # (r - c)

        def dfs(r: int) -> None:
            # All n queens safely positioned across all rows
            if r == n:
                formatted_board = ["".join(row) for row in board]
                result.append(formatted_board)
                return

            for c in range(n):
                # Check column and diagonal attack paths in O(1)
                if c in cols or (r + c) in pos_diag or (r - c) in neg_diag:
                    continue

                # Place queen and register attack lines
                cols.add(c)
                pos_diag.add(r + c)
                neg_diag.add(r - c)
                board[r][c] = "Q"

                # Advance to next row
                dfs(r + 1)

                # Backtrack
                cols.remove(c)
                pos_diag.remove(r + c)
                neg_diag.remove(r - c)
                board[r][c] = "."

        dfs(0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Board-Scanning Validation">

```python
class Solution:
    def solveNQueens(self, n: int) -> list[list[str]]:
        result: list[list[str]] = []
        board: list[list[str]] = [["."] * n for _ in range(n)]

        def is_safe(r: int, c: int) -> bool:
            # Check column above
            for i in range(r):
                if board[i][c] == "Q":
                    return False

            # Check upper-left diagonal
            i, j = r - 1, c - 1
            while i >= 0 and j >= 0:
                if board[i][j] == "Q":
                    return False
                i -= 1
                j -= 1

            # Check upper-right diagonal
            i, j = r - 1, c + 1
            while i >= 0 and j < n:
                if board[i][j] == "Q":
                    return False
                i -= 1
                j += 1

            return True

        def dfs(r: int) -> None:
            if r == n:
                result.append(["".join(row) for row in board])
                return

            for c in range(n):
                if is_safe(r, c):
                    board[r][c] = "Q"
                    dfs(r + 1)
                    board[r][c] = "."

        dfs(0)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Board-Scanning Validation** | $O(n!)$ | $O(n^2)$ | Scans the board upward across diagonals in $O(n)$ time at each candidate square. |
| **Hash Set Diagonal Tracking** | $O(n!)$ | $O(n^2)$ | Detects column and diagonal conflicts in $O(1)$ time using three sets (`cols`, `r + c`, and `r - c`). |

*(There are $n$ choices on row 0, at most $n - 2$ choices on row 1, at most $n - 4$ on row 2, bounding total operations to $O(n!)$. Auxiliary memory is dominated by the $n \times n$ board and $O(n)$ recursion call stack.)*

---

### Common Pitfall: Trying to Place Queens Cell-by-Cell Instead of Row-by-Row

Attempting to evaluate all $n \times n$ chessboard cells individually creates an unmanageable search space of size $\binom{n^2}{n}$. By placing exactly one queen per row ($r = 0, 1, \dots, n - 1$), row conflicts are eliminated by design. The problem reduces to finding valid column choices for each row, bounding the branching factor strictly to $O(n!)$.

---

### Concise Interview Takeaway

For **N-Queens**, place queens row by row to eliminate row conflicts automatically. Use three hash sets (`cols`, `r + c`, and `r - c`) to detect column and diagonal attacks in $O(1)$ time. Reset sets and restore the board during backtracking to safely discover all valid board configurations.
