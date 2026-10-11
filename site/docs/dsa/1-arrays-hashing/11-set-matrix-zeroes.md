---
id: 11-set-matrix-zeroes
title: "73. Set Matrix Zeroes"
description: "First row/column as marker flags for O(1) space"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Matrix Manipulation</span>

> **Problem Statement:** Given an $m \times n$ integer matrix, if an element is `0`, set its entire row and column to `0`s in-place. You must do this using $O(1)$ constant extra space.

```text
Input:  matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
Output: [[1, 0, 1], [0, 0, 0], [1, 0, 1]]
Explanation: The cell at (1, 1) is 0, so row 1 and column 1 are both set to 0.
```

---

### The Intuitive Mental Model

In an $m \times n$ matrix, whenever an entry is `0`, its entire row and column must be overwritten with zeros. Overwriting rows and columns immediately upon finding a zero produces artificial zeros that trigger cascading wipes across the entire board. Therefore, cells containing zeros must be recorded before performing any updates.

#### Brute Force: Auxiliary Row and Column Arrays
Maintaining two separate arrays `row_zero = [False] * m` and `col_zero = [False] * n` requires $O(m + n)$ auxiliary memory. While this cleanly isolates flags from board mutations, the problem asks for $O(1)$ constant extra space.

#### Optimal Approach: Boundary Markers with Disjoint Column Flag
Instead of allocating separate memory, we embed the marker flags directly into the first row and first column of the matrix:
- When cell `(r, c)` contains zero, set `matrix[r][0] = 0` (marking row `r`) and `matrix[0][c] = 0` (marking column `c`).
- Because cell `(0, 0)` overlaps row 0 and column 0, letting it track both causes ambiguity. We dedicate `matrix[0][0]` to mark row 0, and use a separate boolean variable `first_col_zero` to track column 0.
- We update the inner matrix first (`r >= 1` and `c >= 1`) based on the markers, then zero out row 0 and column 0 last.

#### Execution Walkthrough

Let us trace `matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]`:

| Step | Operation | Cell / Scope | Marker State | Grid State |
| :---: | :--- | :---: | :--- | :--- |
| **1** | Boundary flag check | Column 0 | `first_col_zero = False` | No change |
| **2** | Scan inner cells | `(1, 1) == 0` | `matrix[1][0] = 0`, `matrix[0][1] = 0` | Row 1 marked, Col 1 marked |
| **3** | Update inner cells | `(1, 1) .. (2, 2)` | Inner cells with marked row or col set to 0 | Row 1 becomes `[0, 0, 0]`, Cell `(2, 1)` becomes `0` |
| **4** | Update row 0 | `matrix[0][0] == 1` | Row 0 remains unchanged | `matrix[0] = [1, 0, 1]` |
| **5** | Update col 0 | `first_col_zero == False` | Col 0 remains unchanged | Final matrix matches target |

---

### Step-by-Step Algorithm

1. **Determine Boundary State & Flag Interior:**
   - Initialize `first_col_zero = False`.
   - Loop `r` from `0` to `m - 1`:
     - If `matrix[r][0] == 0`, set `first_col_zero = True`.
     - For `c` from `1` to `n - 1`: if `matrix[r][c] == 0`, set `matrix[r][0] = 0` and `matrix[0][c] = 0`.
2. **Zero Out Inner Subgrid:**
   - For `r` from `1` to `m - 1` and `c` from `1` to `n - 1`:
     - If `matrix[r][0] == 0` or `matrix[0][c] == 0`, set `matrix[r][c] = 0`.
3. **Zero Out Row 0:**
   - If `matrix[0][0] == 0`, set all cells in row 0 (`matrix[0][c]`) to `0`.
4. **Zero Out Column 0:**
   - If `first_col_zero` is `True`, set all cells in column 0 (`matrix[r][0]`) to `0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place Boundary Markers" default>

```python
class Solution:
    def setZeroes(self, matrix: list[list[int]]) -> None:
        """
        Modify matrix in-place with O(1) extra space.
        """
        m, n = len(matrix), len(matrix[0])
        first_col_zero = False
        
        # Step 1: Record flags in first row and column
        for r in range(m):
            if matrix[r][0] == 0:
                first_col_zero = True
            for c in range(1, n):
                if matrix[r][c] == 0:
                    matrix[r][0] = 0
                    matrix[0][c] = 0
                    
        # Step 2: Zero out inner subgrid cells using markers
        for r in range(1, m):
            for c in range(1, n):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0
                    
        # Step 3: Zero out the first row if flagged
        if matrix[0][0] == 0:
            for c in range(n):
                matrix[0][c] = 0
                
        # Step 4: Zero out the first column if flagged
        if first_col_zero:
            for r in range(m):
                matrix[r][0] = 0
```

  </TabItem>
  <TabItem value="auxiliary" label="Alternative: Separate Marker Sets">

```python
class Solution:
    def setZeroes(self, matrix: list[list[int]]) -> None:
        m, n = len(matrix), len(matrix[0])
        rows_to_zero: set[int] = set()
        cols_to_zero: set[int] = set()
        
        for r in range(m):
            for c in range(n):
                if matrix[r][c] == 0:
                    rows_to_zero.add(r)
                    cols_to_zero.add(c)
                    
        for r in range(m):
            for c in range(n):
                if r in rows_to_zero or c in cols_to_zero:
                    matrix[r][c] = 0
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Separate Marker Sets** | $O(m \times n)$ | $O(m + n)$ | Stores zero indices in auxiliary sets. Straightforward, but uses linear auxiliary space. |
| **In-Place Boundary Markers** | $O(m \times n)$ | $O(1)$ | Embeds marker bits into matrix row 0 and column 0. Achieves optimal constant auxiliary space. |

---

### Common Pitfall: Premature Boundary Overwrite

Updating row 0 or column 0 before updating the interior cells overwrites the marker flags. If cell `matrix[0][0]` is set to 0 during an early pass, subsequent checks for row or column zeros will falsely trigger and clear unaffected elements. Interior cells must always be updated before applying modifications to the first row and first column.

---

### Concise Interview Takeaway

For **Set Matrix Zeroes**, prevent cascading zero contamination by recording zero coordinates prior to updating values. To achieve $O(1)$ auxiliary space, reuse row 0 and column 0 as in-place bitboards, with one extra boolean variable for column 0. Update interior cells first from $1$ to $m - 1$ and $1$ to $n - 1$, and update boundary markers last.
