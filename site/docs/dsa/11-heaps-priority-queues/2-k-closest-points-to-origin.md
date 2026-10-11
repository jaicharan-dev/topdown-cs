---
id: 2-k-closest-points-to-origin
title: "973. K Closest Points to Origin"
description: "Max-heap eviction of size k using squared Euclidean distance"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Max-Heap</span>

> **Problem Statement:** Given an array of coordinates `points` where `points[i] = [xi, yi]` represents a point on the X-Y plane and an integer `k`, return the `k` closest points to the origin `(0, 0)` under Euclidean distance. You may return the answer in any order.

```text
Input:  points = [[1, 3], [-2, 2]], k = 1
Output: [[-2, 2]]
Explanation:
The distance between (1, 3) and the origin is sqrt(1^2 + 3^2) = sqrt(10).
The distance between (-2, 2) and the origin is sqrt((-2)^2 + 2^2) = sqrt(8).
Since sqrt(8) < sqrt(10), [-2, 2] is closer to the origin.
```

---

### The Intuitive Mental Model

Imagine maintaining a VIP club that admits only the $k$ closest guests to a DJ booth at `(0, 0)`. To track the $k$ smallest distances dynamically, which data structure should we select? Counterintuitively, we use a Max-Heap of size $k$.

In a Max-Heap, the root element is always the largest value in the collection. For this problem, that root represents the furthest point currently admitted into our top $k$ selection.

Whenever a new point arrives:
1. If the heap contains fewer than $k$ points, admit it directly.
2. Once the heap is full (size $k$), compare the newcomer to the root (the current furthest member).
3. If the newcomer is closer than the furthest admitted member, evict the root and admit the newcomer via `heapq.heappushpop`.

#### The Math Shortcut: Omitting Square Roots

The Euclidean distance from `(x, y)` to `(0, 0)` is $\sqrt{x^2 + y^2}$. Because the square root function is strictly monotonically increasing for non-negative values:

$$\sqrt{a} < \sqrt{b} \iff a < b$$

We never need to compute $\sqrt{x^2 + y^2}$. Comparing squared distances $x^2 + y^2$ preserves identical relative rankings, avoids floating-point precision issues, and eliminates unnecessary square root operations.

#### Brute Force: Full Sorting

The simplest approach calculates the squared distance for all $n$ points and sorts the entire array. While easy to write, sorting takes $O(n \log n)$ time and requires buffering all coordinates in memory. When $k$ is substantially smaller than $n$, sorting the entire list performs extensive unnecessary comparisons.

#### Optimal Approach: Max-Heap of Size K

By maintaining a heap capped strictly at $k$ elements, every insertion or eviction takes $O(\log k)$ time. Processing all $n$ coordinates yields an overall runtime of $O(n \log k)$ and consumes only $O(k)$ auxiliary memory. When $k \ll n$, this provides significant performance improvements.

#### Execution Walkthrough

Let `points = [[1, 3], [-2, 2], [5, 8], [0, 1]]` and $k = 2$:

| Step | Point | Squared Distance ($x^2 + y^2$) | Heap Action | Max-Heap State (`(-dist, point)`) | Furthest Admitted Distance |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `[1, 3]` | $1^2 + 3^2 = 10$ | Push to heap (heap size < 2) | `[(-10, [1, 3])]` | 10 |
| **2** | `[-2, 2]` | $(-2)^2 + 2^2 = 8$ | Push to heap (heap reaches size 2) | `[(-10, [1, 3]), (-8, [-2, 2])]` | 10 |
| **3** | `[5, 8]` | $5^2 + 8^2 = 89$ | $89 \ge 10$: Reject immediately | `[(-10, [1, 3]), (-8, [-2, 2])]` | 10 |
| **4** | `[0, 1]` | $0^2 + 1^2 = 1$ | $1 < 10$: Evict `[1, 3]`, admit `[0, 1]` | `[(-8, [-2, 2]), (-1, [0, 1])]` | 8 |

---

### Step-by-Step Algorithm

1. **Initialize Max-Heap:** Because Python's `heapq` module implements a min-heap by default, simulate a max-heap by storing negated distances: `-dist = -(x * x + y * y)`.
2. **Iterate Through Points:** For each coordinate `[x, y]` in `points`:
   - Calculate squared distance `dist = x * x + y * y`.
   - If `len(max_heap) < k`, push `(-dist, [x, y])` onto `max_heap`.
   - Else if `dist < -max_heap[0][0]`, invoke `heapq.heappushpop(max_heap, (-dist, [x, y]))` to evict the root and insert the new candidate in a single $O(\log k)$ operation.
3. **Extract Points:** Extract and return the original coordinates from the heap: `[point for _, point in max_heap]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Max-Heap of Size K" default>

```python
import heapq


class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        # Max-heap to track the k closest points
        # Python's heapq is a min-heap, so negate distances
        max_heap: list[tuple[int, list[int]]] = []

        for x, y in points:
            dist = x * x + y * y

            if len(max_heap) < k:
                heapq.heappush(max_heap, (-dist, [x, y]))
            else:
                # If current point is closer than the furthest point in the heap
                if dist < -max_heap[0][0]:
                    heapq.heappushpop(max_heap, (-dist, [x, y]))

        # Extract the original coordinates
        return [point for _, point in max_heap]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Full Sorting">

```python
class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        # Sort all points by squared Euclidean distance
        points.sort(key=lambda p: p[0] * p[0] + p[1] * p[1])
        return points[:k]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full Sorting** | $O(n \log n)$ | $O(1)$ or $O(n)$ | Sorts every point by distance. Straightforward to write, but performs redundant sorting on the remaining $n - k$ points. |
| **Max-Heap (Size K)** | $O(n \log k)$ | $O(k)$ | Bounds memory to $O(k)$ and keeps insertion logarithmic in $k$. Excellent for streaming inputs. |
| **Quickselect** | $O(n)$ average | $O(1)$ | Partitions around pivots in-place. Achieves optimal expected linear time, though worst-case is $O(n^2)$. |

---

### Common Pitfall: Incurring Floating-Point Overhead with Square Roots

A frequent inefficiency is computing `math.sqrt(x * x + y * y)` for every point. Floating-point square root operations add unnecessary CPU cycles and can introduce subtle precision discrepancies during comparisons. Because $f(d) = d^2$ is strictly increasing for non-negative values, comparing $x^2 + y^2$ preserves identical relative rankings.

---

### Concise Interview Takeaway

To find the $k$ smallest values in a collection or data stream, use a Max-Heap of size $k$. The root holds the largest admitted value among the top $k$, enabling eviction in $O(\log k)$ time whenever a smaller value is encountered.
