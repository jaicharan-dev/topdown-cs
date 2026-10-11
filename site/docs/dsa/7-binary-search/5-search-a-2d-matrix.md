---
id: 5-search-a-2d-matrix
title: "74. Search a 2D Matrix"
description: "Virtual 1D flattening with row = mid // cols, col = mid % cols"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Matrix Projection</span>

> **Problem Statement:** You are given an $m \times n$ integer matrix `matrix` where each row is sorted in non-decreasing order and the first integer of each row is strictly greater than the last integer of the previous row. Given an integer `target`, return `true` if `target` exists in the matrix or `false` otherwise. The solution must run in $O(\log(m \cdot n))$ time.

```text
Input:  matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target = 3
Output: true
Explanation: The target 3 is found at matrix[0][1].
```

---

### The Intuitive Mental Model

Because every row is internally sorted and the first element of each row strictly exceeds the last element of the preceding row, the entire 2D matrix behaves as a single continuous sorted sequence.

#### Brute Force: Row-by-Row Scan
Scanning through every element sequentially or inspecting row boundaries one by one takes $O(m \cdot n)$ or $O(m + n)$ time. This ignores the total ordering that spans across all cells.

#### Optimal Approach: Virtual 1D Coordinate Projection
Rather than physically flattening the matrix into a new array (which costs $O(m \cdot n)$ auxiliary memory), treat the grid as an imaginary 1D array of indices from $0$ to $(m \cdot n) - 1$.

For any virtual index `mid`, map it directly to 2D matrix coordinates in $O(1)$ time:
- `row = mid // n` (how many full rows precede `mid`)
- `col = mid % n` (the column offset within that row)

This enables standard binary search to operate seamlessly on the 2D grid in $O(\log(m \cdot n))$ time with zero auxiliary memory.

#### Execution Walkthrough

Let us trace `matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]` with `target = 3` ($m = 3, n = 4$):

| Step | `low` | `high` | `mid` | `(row, col)` | `matrix[row][col]` | Comparison | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `11` | `5` | `(1, 1)` | `11` | `11 > 3` | Target is to the left: `high = mid - 1` | `[0, 4]` |
| **2** | `0` | `4` | `2` | `(0, 2)` | `5` | `5 > 3` | Target is to the left: `high = mid - 1` | `[0, 1]` |
| **3** | `0` | `1` | `0` | `(0, 0)` | `1` | `1 < 3` | Target is to the right: `low = mid + 1` | `[1, 1]` |
| **4** | `1` | `1` | `1` | `(0, 1)` | `3` | `3 == 3` | Match found! Return `true` | `[1, 1]` |

---

### Step-by-Step Algorithm

1. **Check Dimensions:** Guard against empty inputs. Set `m = len(matrix)` and `n = len(matrix[0])`.
2. **Define Virtual Index Bounds:** Set `low = 0` and `high = (m * n) - 1`.
3. **Execute Projected Binary Search:** While `low <= high`:
   - Compute midpoint: `mid = low + (high - low) // 2`.
   - Map midpoint to matrix indices: `row = mid // n`, `col = mid % n`.
   - Access element: `val = matrix[row][col]`.
   - If `val == target`, return `True`.
   - If `val < target`, discard left half: `low = mid + 1`.
   - If `val > target`, discard right half: `high = mid - 1`.
4. **Return Fallback:** If `low > high`, the target does not exist in the matrix. Return `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Virtual 1D Binary Search" default>

```python
class Solution:
    def searchMatrix(self, matrix: list[list[int]], target: int) -> bool:
        if not matrix or not matrix[0]:
            return False

        m, n = len(matrix), len(matrix[0])
        # Treat the m x n grid as a single 1D virtual array of size m * n
        low, high = 0, (m * n) - 1

        while low <= high:
            mid = low + (high - low) // 2
            # Project virtual 1D index into 2D row and column coordinates
            row = mid // n
            col = mid % n
            val = matrix[row][col]

            if val == target:
                return True
            elif val < target:
                low = mid + 1
            else:
                high = mid - 1

        return False
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Double Binary Search (Row then Column)">

```python
class Solution:
    def searchMatrix(self, matrix: list[list[int]], target: int) -> bool:
        if not matrix or not matrix[0]:
            return False

        m, n = len(matrix), len(matrix[0])

        # Step 1: Binary search to find the potential row
        top, bottom = 0, m - 1
        target_row = -1
        while top <= bottom:
            mid = top + (bottom - top) // 2
            if matrix[mid][0] <= target <= matrix[mid][-1]:
                target_row = mid
                break
            elif matrix[mid][0] > target:
                bottom = mid - 1
            else:
                top = mid + 1

        if target_row == -1:
            return False

        # Step 2: Binary search within the identified row
        left, right = 0, n - 1
        row_vals = matrix[target_row]
        while left <= right:
            mid = left + (right - left) // 2
            if row_vals[mid] == target:
                return True
            elif row_vals[mid] < target:
                left = mid + 1
            else:
                right = mid - 1

        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Double Binary Search** | $O(\log m + \log n)$ | $O(1)$ | Performs two sequential binary searches. Requires managing two separate search loops. |
| **Virtual 1D Binary Search** | $O(\log(m \cdot n))$ | $O(1)$ | Flattens index calculations conceptually. Achieves identical logarithmic speed in a single clean loop. |

---

### Common Pitfall: Dividing by Row Count Instead of Column Count

A frequent error during 2D coordinate conversion is writing `row = mid // m` and `col = mid % m`. The conversion must divide and modulo by the column width `n`, because each completed row contains exactly `n` elements. Using `m` causes index out-of-range exceptions whenever $m \ne n$.

---

### Concise Interview Takeaway

Because the matrix elements increase monotonically across rows and columns, treat the entire grid as a virtual 1D array of length $m \cdot n$. Map the midpoint back to 2D via `row = mid // n` and `col = mid % n` to achieve $O(\log(m \cdot n))$ runtime with $O(1)$ space.
