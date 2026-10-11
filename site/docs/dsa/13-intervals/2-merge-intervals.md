---
id: 2-merge-intervals
title: "56. Merge Intervals"
description: "Sort by start time and iteratively stretch overlapping end boundaries"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sorting by Start Time</span>

> **Problem Statement:** Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

```text
Input:  intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]
Output: [[1, 6], [8, 10], [15, 18]]
Explanation: Intervals [1, 3] and [2, 6] overlap, so they are merged into [1, 6].
```

---

### The Intuitive Mental Model

Consolidating fragmented calendar appointments into continuous blocks of busy time is a classic interval challenge. When intervals arrive in an unsorted order, an interval anywhere in the array could potentially merge with any other interval.

#### Brute Force: Connected Components Graph Search
Without sorting, finding which intervals merge requires modeling intervals as nodes in a graph where edges connect overlapping ranges. Finding connected components via breadth-first search or depth-first search requires $O(n^2)$ pairwise overlap checks to build the graph, plus extra memory to store adjacency lists and visited sets.

#### Optimal Approach: Sort and Linear Merge Sweep
Sorting intervals chronologically by start time immediately transforms the problem:
- Intervals that can merge are guaranteed to be adjacent neighbors.
- If interval $B$ does not overlap with the running block $A$, no later interval $C, D, \dots$ can ever merge with $A$ either, because their start times are even later.

We seed our result list with the first sorted interval. As we inspect each subsequent interval `curr`:
- **Case 1 (Overlap):** If `curr[0] <= merged[-1][1]`, they collide. We stretch the end boundary of the last interval in `merged`:
  $$\text{merged}[-1][1] = \max(\text{merged}[-1][1], \text{curr}[1])$$
- **Case 2 (Disjoint):** If `curr[0] > merged[-1][1]`, a temporal gap exists. We append `curr` as a new standalone block in `merged`.

#### Execution Walkthrough

Let us trace `intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]` (already sorted by start time):

| Step | Current Interval | Last Merged Block (`merged[-1]`) | Overlap Check (`curr[0] <= last[1]`) | Action Taken | Result State (`merged`) |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `[1, 3]` | None | Baseline element | Initialize output | `[[1, 3]]` |
| **2** | `[2, 6]` | `[1, 3]` | $2 \le 3$ (True) | Overlap: stretch end to $\max(3, 6) = 6$ | `[[1, 6]]` |
| **3** | `[8, 10]` | `[1, 6]` | $8 \le 6$ (False) | Disjoint: append new block | `[[1, 6], [8, 10]]` |
| **4** | `[15, 18]` | `[8, 10]` | $15 \le 10$ (False) | Disjoint: append new block | `[[1, 6], [8, 10], [15, 18]]` |

Final output is `[[1, 6], [8, 10], [15, 18]]`.

---

### Step-by-Step Algorithm

1. **Handle Base Case:** If `intervals` is empty, return an empty list `[]`.
2. **Sort by Start Time:** Sort all intervals chronologically using `intervals.sort(key=lambda x: x[0])`.
3. **Initialize Result:** Seed the `merged` list with the first interval (`merged = [intervals[0]]`).
4. **Linear Merge Sweep:** Iterate through the remaining intervals starting from index `1`:
   - If `curr[0] <= merged[-1][1]`: extend the boundary by setting `merged[-1][1] = max(merged[-1][1], curr[1])`.
   - Else: append `curr` directly to `merged`.
5. **Return Result:** Return `merged`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Sort and Linear Merge" default>

```python
class Solution:
    def merge(self, intervals: list[list[int]]) -> list[list[int]]:
        if not intervals:
            return []

        # Step 1: Sort chronologically by start time
        intervals.sort(key=lambda x: x[0])

        merged: list[list[int]] = [intervals[0]]

        # Step 2: Iterate and merge in a single linear pass
        for curr in intervals[1:]:
            last_merged = merged[-1]

            # If current interval overlaps with the previous merged block
            if curr[0] <= last_merged[1]:
                last_merged[1] = max(last_merged[1], curr[1])
            else:
                merged.append(curr)

        return merged
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Graph Connected Components">

```python
class Solution:
    def merge(self, intervals: list[list[int]]) -> list[list[int]]:
        if not intervals:
            return []

        n = len(intervals)
        # Build adjacency graph of overlapping interval indices
        adj: dict[int, list[int]] = {i: [] for i in range(n)}
        for i in range(n):
            for j in range(i + 1, n):
                if max(intervals[i][0], intervals[j][0]) <= min(intervals[i][1], intervals[j][1]):
                    adj[i].append(j)
                    adj[j].append(i)

        visited: set[int] = set()
        merged: list[list[int]] = []

        # Find connected components using depth-first search
        for i in range(n):
            if i not in visited:
                component: list[int] = []
                stack = [i]
                visited.add(i)
                while stack:
                    node = stack.pop()
                    component.append(node)
                    for neighbor in adj[node]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            stack.append(neighbor)

                min_start = min(intervals[idx][0] for idx in component)
                max_end = max(intervals[idx][1] for idx in component)
                merged.append([min_start, max_end])

        merged.sort(key=lambda x: x[0])
        return merged
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Graph Components** | $O(n^2)$ | $O(n^2)$ | Builds an overlap graph and runs DFS. Quadratic runtime and high memory usage. |
| **Sort and Linear Merge** | $O(n \log n)$ | $O(n)$ | Sorts by start time, enabling a single linear pass to merge adjacent intervals. |

---

### Common Pitfall: Forgetting to Take the Maximum End Time

When merging overlapping intervals, it is tempting to assume the second interval always has a later end time and write `merged[-1][1] = curr[1]`. However, an earlier interval may completely encompass the subsequent interval (for example, `[1, 6]` followed by `[2, 4]`). Overwriting with `curr[1]` would shrink the interval boundary from `6` down to `4`. Always use `max(merged[-1][1], curr[1])` to maintain complete coverage.

---

### Concise Interview Takeaway

Sort intervals by start time. In a single linear pass, compare each interval with `merged[-1]`. If it overlaps (`curr[0] <= merged[-1][1]`), stretch the end boundary with `max(merged[-1][1], curr[1])`; otherwise, append it as a new block. This achieves an optimal $O(n \log n)$ time complexity.
