---
id: 6-interval-list-intersections
title: "986. Interval List Intersections"
description: "Two-pointer intersection window with earliest-end pointer advancement"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers Sweep</span>

> **Problem Statement:** You are given two lists of closed intervals, `firstList` and `secondList`, where each list is pairwise disjoint and already sorted in ascending order. Return the intersection of these two interval lists. A closed interval `[a, b]` intersects with `[c, d]` if there is a common range of points shared between them.

```text
Input:  firstList = [[0, 2], [5, 10], [13, 23], [24, 25]], secondList = [[1, 5], [8, 12], [15, 24], [25, 26]]
Output: [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]
Explanation: The overlapping segments between the two sorted interval lists form the returned intersections.
```

---

### The Intuitive Mental Model

Finding mutual availability across two schedules is a fundamental interval problem. Because both interval lists are already sorted and internally non-overlapping, we do not need to sort or compare every pair.

#### Brute Force: Pairwise Intersection Check
The simplest approach compares every interval in `firstList` with every interval in `secondList` using nested loops. For each pair, calculate whether $\max(\text{start}_A, \text{start}_B) \le \min(\text{end}_A, \text{end}_B)$. With $m$ intervals in the first list and $n$ in the second, this evaluates $m \times n$ combinations in $O(m \cdot n)$ quadratic time, ignoring the sorted order.

#### Optimal Approach: Two Pointers Sweep
We can advance two pointers, $i$ for `firstList` and $j$ for `secondList`, across the shared timeline.

For any pair $A = [start_A, end_A]$ and $B = [start_B, end_B]$:
- A shared window cannot start until both intervals are active:
  $$\text{start} = \max(start_A, start_B)$$
- A shared window must end as soon as either interval finishes:
  $$\text{end} = \min(end_A, end_B)$$
- A valid intersection exists if and only if $\text{start} \le \text{end}$.

To advance our pointers:
- We advance the pointer of whichever interval finishes first.
- If $end_A < end_B$, interval $A$ has concluded. Because all subsequent intervals in `secondList` start even later, interval $A$ can never intersect with any future interval in `secondList`. Therefore, we safely advance $i += 1$. Otherwise, we advance $j += 1$.

#### Execution Walkthrough

Let us trace `firstList = [[0, 2], [5, 10]]` and `secondList = [[1, 5], [8, 12]]`:

| Step | `firstList[i]` | `secondList[j]` | Candidate Window (`[max(start), min(end)]`) | Valid? (`start <= end`) | Intersection Added | Advanced Pointer |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `[0, 2]` | `[1, 5]` | `[max(0, 1), min(2, 5)]` = `[1, 2]` | **Yes** | `[1, 2]` | `i` (since $2 < 5$) |
| **2** | `[5, 10]` | `[1, 5]` | `[max(5, 1), min(10, 5)]` = `[5, 5]` | **Yes** | `[5, 5]` | `j` (since $5 \le 10$) |
| **3** | `[5, 10]` | `[8, 12]` | `[max(5, 8), min(10, 12)]` = `[8, 10]` | **Yes** | `[8, 10]` | `i` (since $10 < 12$) |

Resulting intersection list is `[[1, 2], [5, 5], [8, 10]]`.

---

### Step-by-Step Algorithm

1. **Initialize Pointers:** Set `i = 0`, `j = 0`, and create an empty list `result = []`.
2. **Sweep Both Lists:** While `i < len(firstList)` and `j < len(secondList)`:
   - Calculate candidate intersection boundaries:
     - `start = max(firstList[i][0], secondList[j][0])`
     - `end = min(firstList[i][1], secondList[j][1])`
   - If `start <= end`, append `[start, end]` to `result`.
   - Advance the interval that finishes earlier:
     - If `firstList[i][1] < secondList[j][1]`, increment `i += 1`.
     - Else, increment `j += 1`.
3. **Return Result:** Return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pointer Sweep" default>

```python
class Solution:
    def intervalIntersection(
        self, firstList: list[list[int]], secondList: list[list[int]]
    ) -> list[list[int]]:
        i = 0
        j = 0
        result: list[list[int]] = []

        while i < len(firstList) and j < len(secondList):
            # Compute candidate overlap boundaries
            start = max(firstList[i][0], secondList[j][0])
            end = min(firstList[i][1], secondList[j][1])

            # If the candidate overlap is valid, record it
            if start <= end:
                result.append([start, end])

            # Advance the pointer of the interval that finishes earlier
            if firstList[i][1] < secondList[j][1]:
                i += 1
            else:
                j += 1

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Pairwise Intersection Search">

```python
class Solution:
    def intervalIntersection(
        self, firstList: list[list[int]], secondList: list[list[int]]
    ) -> list[list[int]]:
        result: list[list[int]] = []

        # Check every pair across both lists
        for a_start, a_end in firstList:
            for b_start, b_end in secondList:
                start = max(a_start, b_start)
                end = min(a_end, b_end)

                if start <= end:
                    result.append([start, end])

                # Optimization: if b begins after a concludes, subsequent b's cannot overlap a
                if b_start > a_end:
                    break

        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Pairwise Search** | $O(m \cdot n)$ | $O(1)$ | Checks pairs across both lists. Quadratic runtime for large lists. |
| **Two-Pointer Sweep** | $O(m + n)$ | $O(1)$ | Sweeps both lists simultaneously by advancing the earlier-finishing interval. |

---

### Common Pitfall: Advancing the Pointer Based on Start Time

A frequent error is deciding which pointer to increment based on start time instead of end time. An interval with an earlier start time may still extend well beyond the other interval. Advancing based on start time would prematurely discard an interval that still overlaps with future elements. Always advance the interval that concludes earlier.

---

### Concise Interview Takeaway

Find intersections with `[max(start_a, start_b), min(end_a, end_b)]` whenever `start <= end`. Advance the pointer of whichever interval ends earlier, as it has exhausted its lifespan and cannot intersect any subsequent intervals. This achieves an optimal $O(m + n)$ time complexity with $O(1)$ auxiliary memory.
