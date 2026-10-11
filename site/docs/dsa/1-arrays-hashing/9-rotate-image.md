---
id: 9-rotate-image
title: "48. Rotate Image"
description: "Transpose, then reverse each row in place"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Matrix Manipulation</span>

> **Problem Statement:** You are given an $n \times n$ 2D matrix representing an image. Rotate the image by 90 degrees clockwise in-place. You must modify the input 2D matrix directly without allocating another 2D matrix.

```text
Input:  matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
Output: [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
Explanation: The matrix is rotated 90 degrees clockwise in-place.
```

---

### The Intuitive Mental Model

Rotating an $n \times n$ grid 90 degrees clockwise directly by moving each cell `(r, c)` to `(c, n - 1 - r)` requires either allocating an auxiliary grid or managing four-way cyclic pointer rotations. We can simplify this into two successive geometric reflections:
1. **Transpose across the main diagonal:** Swap `matrix[i][j]` with `matrix[j][i]` so rows become columns.
2. **Reflect horizontally (reverse each row):** Reverse the elements of every row from left to right.

Combining a matrix transposition with a horizontal reflection produces a clockwise 90-degree rotation.

#### Brute Force: Auxiliary Matrix Copy
Allocating a new $n \times n$ matrix allows writing `new_matrix[c][n - 1 - r] = matrix[r][c]`. This achieves $O(n^2)$ time but consumes $O(n^2)$ additional space, directly violating the problem requirement to rotate in place.

#### Optimal Approach: Transpose and Reverse Rows
In-place transformation avoids auxiliary matrix allocations:
- **Transpose:** For each pair where $j > i$, swap `matrix[i][j]` and `matrix[j][i]`. The main diagonal remains unchanged.
- **Row Reversal:** For each row $i$, reverse its elements from index $0$ to $n - 1$.

#### Execution Walkthrough

Let us trace `matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`:

| Phase | Operation | Transformed Rows | Intermediate Matrix State |
| :---: | :--- | :--- | :--- |
| **Initial** | Starting grid | Row 0: `[1, 2, 3]`<br/>Row 1: `[4, 5, 6]`<br/>Row 2: `[7, 8, 9]` | `[[1, 2, 3], [4, 5, 6], [7, 8, 9]]` |
| **Transpose** | Swap `(0,1)` $\leftrightarrow$ `(1,0)`: $2 \leftrightarrow 4$<br/>Swap `(0,2)` $\leftrightarrow$ `(2,0)`: $3 \leftrightarrow 7$<br/>Swap `(1,2)` $\leftrightarrow$ `(2,1)`: $6 \leftrightarrow 8$ | Row 0: `[1, 4, 7]`<br/>Row 1: `[2, 5, 8]`<br/>Row 2: `[3, 6, 9]` | `[[1, 4, 7], [2, 5, 8], [3, 6, 9]]` |
| **Row Reversal** | Reverse row 0: `[1, 4, 7]` $\to$ `[7, 4, 1]`<br/>Reverse row 1: `[2, 5, 8]` $\to$ `[8, 5, 2]`<br/>Reverse row 2: `[3, 6, 9]` $\to$ `[9, 6, 3]` | Row 0: `[7, 4, 1]`<br/>Row 1: `[8, 5, 2]`<br/>Row 2: `[9, 6, 3]` | `[[7, 4, 1], [8, 5, 2], [9, 6, 3]]` |

---

### Step-by-Step Algorithm

1. **Transpose Across Diagonal:**
   - Iterate row index `i` from `0` to `n - 1`.
   - Iterate column index `j` from `i + 1` to `n - 1`.
   - Swap `matrix[i][j]` with `matrix[j][i]`.
2. **Reverse Each Row:**
   - Iterate through each `row` in `matrix`.
   - Reverse the row in place (`row.reverse()` or two-pointer swap).
3. **Completion:** The matrix is now modified in place with $O(1)$ extra space.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Transpose and Reverse" default>

```python
class Solution:
    def rotate(self, matrix: list[list[int]]) -> None:
        """
        Do not return anything, modify matrix in-place instead.
        """
        n = len(matrix)
        
        # Step 1: Transpose (swap elements across the main diagonal)
        for i in range(n):
            for j in range(i + 1, n):
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
                
        # Step 2: Reverse each row horizontally
        for row in matrix:
            row.reverse()
```

  </TabItem>
  <TabItem value="four_way" label="Alternative: Four-Way Ring Rotation">

```python
class Solution:
    def rotate(self, matrix: list[list[int]]) -> None:
        n = len(matrix)
        
        for i in range(n // 2):
            for j in range(i, n - 1 - i):
                # Save top-left
                temp = matrix[i][j]
                # bottom-left -> top-left
                matrix[i][j] = matrix[n - 1 - j][i]
                # bottom-right -> bottom-left
                matrix[n - 1 - j][i] = matrix[n - 1 - i][n - 1 - j]
                # top-right -> bottom-right
                matrix[n - 1 - i][n - 1 - j] = matrix[j][n - 1 - i]
                # top-left -> top-right
                matrix[j][n - 1 - i] = temp
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Auxiliary Matrix Copy** | $O(n^2)$ | $O(n^2)$ | Copies rotated values directly into a new grid. Violates the in-place constraint. |
| **Four-Way Ring Rotation** | $O(n^2)$ | $O(1)$ | Rotates elements four at a time in concentric rings. High index-arithmetic complexity. |
| **Transpose and Reverse** | $O(n^2)$ | $O(1)$ | Decomposes rotation into diagonal transposition followed by row reversal. Clean, robust, and idiomatic. |

---

### Common Pitfall: The Double-Swap Transposition Trap

When transposing, the inner loop index `j` must start at `i + 1`, not `0`. If `j` starts at `0`, the algorithm swaps `matrix[i][j]` with `matrix[j][i]`, and later encounters the symmetric pair `matrix[j][i]` and swaps it back, leaving the matrix unchanged. Restricting `j` strictly to `i + 1` to `n - 1` ensures each off-diagonal pair is swapped exactly once.

---

### Concise Interview Takeaway

For **Rotate Image**, decompose clockwise 90-degree rotation into two clean linear-algebra steps: transpose the matrix across the primary diagonal (swapping `matrix[i][j]` and `matrix[j][i]` for $j > i$), then reverse each row horizontally. This transforms the grid in $O(n^2)$ time with $O(1)$ auxiliary space while avoiding complex four-way index calculations.
