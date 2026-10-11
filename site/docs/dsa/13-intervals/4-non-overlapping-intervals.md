---
id: 4-non-overlapping-intervals
title: "435. Non-overlapping Intervals"
description: "Greedy interval scheduling sorting by earliest end time"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy Scheduling</span>

> **Problem Statement:** Given an array of intervals `intervals` where `intervals[i] = [start_i, end_i]`, return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.

```text
Input:  intervals = [[1, 2], [2, 3], [3, 4], [1, 3]]
Output: 1
Explanation: Removing [1, 3] leaves [1, 2], [2, 3], and [3, 4] with no overlaps.
```

---

### The Intuitive Mental Model

In most interval problems, sorting by start time is the default strategy. For this problem, blindly sorting by start time is a trap. An interval like `[1, 100]` starts early, but keeping it blocks all subsequent shorter meetings like `[2, 3]` and `[3, 4]`.

#### Brute Force: Recursive Subset Search
A brute force approach considers every possible subset of intervals and checks if each subset has zero overlaps. With $n$ intervals, there are $2^n$ possible subsets. Checking all combinations requires $O(2^n)$ exponential time, which is completely infeasible for practical input sizes.

#### Optimal Approach: Greedy by Earliest Finish Time
Minimizing the number of intervals removed is mathematically identical to **maximizing the number of compatible intervals kept**.

To fit the maximum number of meetings into a single room, which meeting should you pick first? The meeting that **finishes earliest**.
- A meeting that concludes early frees up the room as quickly as possible.
- A meeting that concludes late blocks the timeline for subsequent candidates.

This is the classic **Greedy Interval Scheduling** algorithm:
1. Sort all intervals by their end time: `intervals.sort(key=lambda x: x[1])`.
2. Greedily keep the first meeting and record its end time as `prev_end`.
3. For each subsequent meeting `[start, end]`:
   - If `start >= prev_end`: it does not conflict. Keep it and update `prev_end = end`.
   - If `start < prev_end`: it conflicts with an already chosen meeting that finishes earlier. Remove this meeting by incrementing `removed_count += 1`.

#### Execution Walkthrough

Let us trace `intervals = [[1, 2], [2, 3], [3, 4], [1, 3]]`. Sorting by end time yields `[[1, 2], [2, 3], [1, 3], [3, 4]]`:

| Step | Current Interval | `prev_end` | Conflict Condition (`start < prev_end`) | Action Taken | Removals Count |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `[1, 2]` | None | Initial interval | Keep interval; set `prev_end = 2` | `0` |
| **2** | `[2, 3]` | `2` | $2 < 2$ (False) | Compatible; update `prev_end = 3` | `0` |
| **3** | `[1, 3]` | `3` | $1 < 3$ (True) | Conflict! Remove interval | `1` |
| **4** | `[3, 4]` | `3` | $3 < 3$ (False) | Compatible; update `prev_end = 4` | `1` |

Total minimum removals required is `1`.

---

### Step-by-Step Algorithm

1. **Handle Base Case:** If `intervals` is empty, return `0`.
2. **Sort by End Time:** Sort all intervals by their finish times: `intervals.sort(key=lambda x: x[1])`.
3. **Initialize Trackers:** Set `prev_end = intervals[0][1]` and `removed_count = 0`.
4. **Greedy Linear Scan:** Iterate through intervals starting from index `1`:
   - If `start < prev_end`: a conflict exists; increment `removed_count += 1`.
   - Else: no conflict exists; update `prev_end = end`.
5. **Return Result:** Return `removed_count`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Greedy by End Time" default>

```python
class Solution:
    def eraseOverlapIntervals(self, intervals: list[list[int]]) -> int:
        if not intervals:
            return 0

        # Step 1: Sort by END TIME (Earliest Deadline First)
        intervals.sort(key=lambda x: x[1])

        # Step 2: Keep the interval that finishes earliest
        prev_end = intervals[0][1]
        removed_count = 0

        # Step 3: Sweep through remaining intervals
        for start, end in intervals[1:]:
            # If current interval starts before previous finishes, it clashes
            if start < prev_end:
                removed_count += 1
            else:
                # No clash: keep this interval and advance finish threshold
                prev_end = end

        return removed_count
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Greedy by Start Time">

```python
class Solution:
    def eraseOverlapIntervals(self, intervals: list[list[int]]) -> int:
        if not intervals:
            return 0

        # Sort by start time
        intervals.sort(key=lambda x: x[0])

        removed_count = 0
        prev_end = intervals[0][1]

        for start, end in intervals[1:]:
            if start < prev_end:
                # Overlap detected: greedily drop the one that ends later
                removed_count += 1
                prev_end = min(prev_end, end)
            else:
                prev_end = end

        return removed_count
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Greedy by Start Time** | $O(n \log n)$ | $O(1)$ | Sorts by start time and tracks minimum end time upon collision. |
| **Greedy by End Time** | $O(n \log n)$ | $O(1)$ | Classic interval scheduling. Sorts by end time and greedily keeps non-overlapping meetings. |

---

### Common Pitfall: Treating Touching Boundaries as Conflicts

The problem definition considers intervals that touch at an endpoint (such as `[1, 2]` and `[2, 3]`) to be non-overlapping. A clash occurs strictly when `start < prev_end`. Using `start <= prev_end` would incorrectly count adjacent intervals as overlapping, producing an inflated removal count.

---

### Concise Interview Takeaway

Minimizing removals is mathematically equivalent to maximizing accepted meetings. Sort intervals by end time (Earliest Deadline First) and greedily retain intervals that finish earliest to leave maximum room for future intervals. This runs in $O(n \log n)$ time with $O(1)$ auxiliary memory.
