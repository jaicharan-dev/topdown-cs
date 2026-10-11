---
id: 1-meeting-rooms
title: "252. Meeting Rooms"
description: "Sort intervals by start time and verify chronological disjointness"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sorting by Start Time</span>

> **Problem Statement:** Given an array of meeting time intervals where `intervals[i] = [start_i, end_i]`, determine if a single person could attend all meetings without any overlapping conflicts.

```text
Input:  intervals = [[0, 30], [5, 10], [15, 20]]
Output: false
Explanation: The meeting [0, 30] overlaps with [5, 10] and [15, 20], making it impossible for one person to attend all meetings.
```

---

### The Intuitive Mental Model

Imagine your desk is covered in an unsorted pile of meeting schedule slips. In an arbitrary order, discovering whether any two meetings clash requires testing every meeting against every other meeting.

#### Brute Force: Pairwise Comparisons
The most direct approach compares every pair of meetings `(i, j)`. Two meetings overlap if $\max(\text{start}_i, \text{start}_j) < \min(\text{end}_i, \text{end}_j)$. For an array of $n$ intervals, checking all pairs requires $O(n^2)$ time. When the schedule contains thousands of entries, quadratic comparisons become unacceptably slow.

#### Optimal Approach: Sort by Start Time
The universal foundation of interval problems is to bring order to chaos by sorting. When you sort all intervals chronologically by their start time:
- Any potential conflict is guaranteed to occur between **immediately adjacent neighbors** in the sorted list.
- If meeting $i$ does not overlap with meeting $i - 1$, no subsequent meeting can overlap with meeting $i - 1$ either, because future meetings start even later.
- A person can attend all meetings if and only if each meeting starts at or after the previous meeting finishes:
  $$\text{intervals}[i][0] \ge \text{intervals}[i - 1][1]$$

#### Execution Walkthrough

Let us trace `intervals = [[5, 8], [9, 15], [1, 4]]`. Sorting chronologically by start time produces `[[1, 4], [5, 8], [9, 15]]`:

| Step | Current Meeting | Previous Meeting End | Condition (`start < prev_end`) | Conflict Detected? | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `[1, 4]` | None | Baseline meeting | No | Establish initial endpoint `4` |
| **2** | `[5, 8]` | `4` | $5 < 4$ is False | No | Valid transition; update endpoint to `8` |
| **3** | `[9, 15]` | `8` | $9 < 8$ is False | No | Valid transition; schedule complete |

Because every adjacent pair satisfies chronological disjointness, the algorithm returns `True`.

---

### Step-by-Step Algorithm

1. **Sort Chronologically:** Sort `intervals` in ascending order by start time using `intervals.sort(key=lambda x: x[0])`.
2. **Scan Adjacent Neighbors:** Iterate through the array starting from index `1` up to `len(intervals) - 1`.
3. **Check for Overlap:** Compare each meeting's start time with the previous meeting's end time. If `intervals[i][0] < intervals[i - 1][1]`, a conflict exists; return `False` immediately.
4. **Confirm Valid Schedule:** If the loop finishes without detecting any conflicts across all adjacent pairs, return `True`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Sort and Adjacent Scan" default>

```python
class Solution:
    def canAttendMeetings(self, intervals: list[list[int]]) -> bool:
        # Step 1: Sort chronologically by start time
        intervals.sort(key=lambda x: x[0])

        # Step 2: Linear verification of adjacent intervals
        for i in range(1, len(intervals)):
            # If current meeting starts before previous meeting concludes
            if intervals[i][0] < intervals[i - 1][1]:
                return False

        return True
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Brute Force Pairwise Check">

```python
class Solution:
    def canAttendMeetings(self, intervals: list[list[int]]) -> bool:
        n = len(intervals)
        
        # Test every distinct pair for temporal overlap
        for i in range(n):
            for j in range(i + 1, n):
                if max(intervals[i][0], intervals[j][0]) < min(intervals[i][1], intervals[j][1]):
                    return False
                    
        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n^2)$ | $O(1)$ | Tests every pair with nested loops. Requires no sorting, but scales quadratically. |
| **Sort and Scan** | $O(n \log n)$ | $O(1)$ | Sorts intervals by start time and verifies adjacent pairs in a single linear pass. |

---

### Common Pitfall: Strict vs Non-Strict Inequalities at Boundaries

A common mistake is confusing overlapping meetings with back-to-back meetings. If meeting A ends at 5:00 PM (`[2, 5]`) and meeting B begins at 5:00 PM (`[5, 8]`), they do not conflict because one starts exactly as the other concludes. The conflict condition is strictly `intervals[i][0] < intervals[i - 1][1]`, not `<=`. Using `<=` would incorrectly flag legitimate consecutive meetings as conflicts.

---

### Concise Interview Takeaway

Sort intervals chronologically by start time. Once ordered, conflicts can only happen between adjacent neighbors. Check if `intervals[i][0] < intervals[i - 1][1]` in a single $O(n)$ linear scan, reducing time complexity from $O(n^2)$ down to $O(n \log n)$ with $O(1)$ auxiliary memory.
