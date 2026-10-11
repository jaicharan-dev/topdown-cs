---
id: 4-kth-smallest-element-in-a-sorted-matrix
title: "378. Kth Smallest Element in a Sorted Matrix"
description: "Binary search on value range with staircase counting vs min-heap k-way merge"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search / Min-Heap</span>

> **Problem Statement:** Given an $n \times n$ matrix where each of the rows and columns is sorted in non-decreasing order, return the $k$-th smallest element in the matrix. Note that it is the $k$-th smallest element in overall sorted order, not the $k$-th distinct element.

```text
Input:  matrix = [[1, 5, 9], [10, 11, 13], [12, 13, 15]], k = 8
Output: 13
Explanation: The elements in the matrix are [1, 5, 9, 10, 11, 12, 13, 13, 15], and the 8th smallest number is 13.
```

---

### The Intuitive Mental Model

Because every row and every column is sorted, the absolute smallest element is anchored at `matrix[0][0]` (top-left) and the absolute largest element is at `matrix[n - 1][n - 1]` (bottom-right).

Two primary paradigms solve this problem:

#### Brute Force: Flatten and Sort

The most direct solution extracts all $n^2$ numbers into a flat list, sorts them in ascending order, and indexes element $k - 1$. Flattening and sorting takes $O(n^2 \log n)$ time and $O(n^2)$ memory, ignoring the 2D sorted structure entirely.

#### Optimal Approach: Binary Search on Value Range

Instead of searching on indices, we binary search over the numerical value range $[\text{low}, \text{high}]$, where `low = matrix[0][0]` and `high = matrix[n - 1][n - 1]`.

For any candidate value `mid`, we determine how many matrix elements are $\le \text{mid}$. Because each row and column is sorted, we can count these elements in $O(n)$ linear time via a staircase walk starting at the bottom-left corner `(r = n - 1, c = 0)`:
- If `matrix[r][c] <= mid`: because column `c` is sorted vertically, all items from row `0` down to row `r` in this column must also be $\le \text{mid}$. Add `r + 1` to our count and advance right (`c += 1`).
- If `matrix[r][c] > mid`: the current element is too large, so step up (`r -= 1`).

When `count < k`, `mid` is too small, so search higher. When `count >= k`, the answer is `mid` or smaller.

Alternatively, a Min-Heap can merge the $n$ sorted rows similar to $k$-way merge in $O(k \log n)$ time.

```
Matrix (3 x 3):              Testing mid = 11:
[  1   5   9 ]               Start at (r=2, c=0): matrix[2][0] = 12 > 11 -> r = 1
[ 10  11  13 ]               At (r=1, c=0): matrix[1][0] = 10 <= 11 -> count += (1+1)=2, c = 1
[ 12  13  15 ]               At (r=1, c=1): matrix[1][1] = 11 <= 11 -> count += (1+1)=4, c = 2
                             At (r=1, c=2): matrix[1][2] = 13 > 11  -> r = 0
                             At (r=0, c=2): matrix[0][2] = 9  <= 11 -> count += (0+1)=5, c = 3 (done)
                             Total <= 11: 5 elements
```

#### Execution Walkthrough

Let `matrix = [[1, 5, 9], [10, 11, 13], [12, 13, 15]]` and $k = 8$:

| Iteration | Range `[low, high]` | Candidate `mid` | Elements $\le \text{mid}$ | Condition Check | Next Range |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `[1, 15]` | `8` | 2 | $2 < 8 \implies$ `low = mid + 1` | `[9, 15]` |
| **2** | `[9, 15]` | `12` | 6 | $6 < 8 \implies$ `low = mid + 1` | `[13, 15]` |
| **3** | `[13, 15]` | `14` | 8 | $8 \ge 8 \implies$ `high = mid` | `[13, 14]` |
| **4** | `[13, 14]` | `13` | 8 | $8 \ge 8 \implies$ `high = mid` | `[13, 13]` |
| **Result** | Loop ends | `low == high == 13` | Solution found | Return `low = 13` | **13** |

---

### Step-by-Step Algorithm

1. **Initialize Range Bounds:** Set `low = matrix[0][0]` and `high = matrix[n - 1][n - 1]`.
2. **Define Staircase Counting Helper `count_less_or_equal(mid)`:**
   - Initialize `count = 0`, `row = n - 1`, and `col = 0`.
   - While `row >= 0` and `col < n`:
     - If `matrix[row][col] <= mid`, add `row + 1` to `count` and increment `col += 1`.
     - Else, decrement `row -= 1`.
   - Return `count`.
3. **Run Binary Search:**
   - While `low < high`:
     - Compute `mid = (low + high) // 2`.
     - If `count_less_or_equal(mid) < k`, update `low = mid + 1`.
     - Else, update `high = mid`.
4. **Return Result:** Return `low` once the search range converges.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Binary Search on Value Range" default>

```python
class Solution:
    def kthSmallest(self, matrix: list[list[int]], k: int) -> int:
        n = len(matrix)
        low, high = matrix[0][0], matrix[n - 1][n - 1]

        def count_less_or_equal(mid: int) -> int:
            count = 0
            row, col = n - 1, 0
            # Staircase walk from bottom-left to top-right
            while row >= 0 and col < n:
                if matrix[row][col] <= mid:
                    # All elements from row 0 to 'row' in this column are <= mid
                    count += row + 1
                    col += 1
                else:
                    row -= 1
            return count

        while low < high:
            mid = (low + high) // 2
            if count_less_or_equal(mid) < k:
                low = mid + 1
            else:
                high = mid

        return low
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Min-Heap K-Way Merge">

```python
import heapq


class Solution:
    def kthSmallest(self, matrix: list[list[int]], k: int) -> int:
        n = len(matrix)
        # Store (val, row, col) for the first element of each row
        min_heap: list[tuple[int, int, int]] = []
        for r in range(min(n, k)):
            min_heap.append((matrix[r][0], r, 0))
        heapq.heapify(min_heap)

        val = 0
        for _ in range(k):
            val, r, c = heapq.heappop(min_heap)
            if c + 1 < n:
                heapq.heappush(min_heap, (matrix[r][c + 1], r, c + 1))

        return val
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Flatten & Sort** | $O(n^2 \log n)$ | $O(n^2)$ | Completely ignores the sorted property of rows and columns. High time and space overhead. |
| **Min-Heap K-Way Merge** | $O(k \log n)$ | $O(n)$ | Treats each row as a sorted list. Merges candidates incrementally; advantageous when $k \ll n^2$. |
| **Value Binary Search** | $O(n \log(\text{max} - \text{min}))$ | $O(1)$ | Optimal space complexity. Leverages the 2D sorted structure via staircase counting in strictly constant extra memory. |

---

### Common Pitfall: Binary Searching on Matrix Indices Instead of Values

In an $n \times n$ matrix where only individual rows and columns are sorted, the matrix is not globally sorted in row-major order. The last element of row 0 can easily be greater than the first element of row 1 (for instance, `matrix[0][2] = 9` while `matrix[1][0] = 10` or vice versa). Attempting to index elements via flattened indices $0$ to $n^2 - 1$ leads to incorrect results. Binary search must operate over the continuous numerical range $[\text{matrix}[0][0], \text{matrix}[n - 1][n - 1]]$.

---

### Concise Interview Takeaway

Binary search on the numerical value range between `matrix[0][0]` and `matrix[n - 1][n - 1]`. For each midpoint candidate, count all elements less than or equal to `mid` in $O(n)$ time using a staircase walk from bottom-left to top-right, achieving $O(1)$ auxiliary space.
