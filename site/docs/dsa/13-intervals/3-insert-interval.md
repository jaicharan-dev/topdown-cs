---
id: 3-insert-interval
title: "57. Insert Interval"
description: "Three-phase single pass: non-overlapping before, overlapping merge, non-overlapping after"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Three-Phase Linear Sweep</span>

> **Problem Statement:** You are given an array of non-overlapping intervals `intervals` where `intervals[i] = [start_i, end_i]` sorted in ascending order by `start_i`. You are also given an interval `newInterval = [start, end]`. Insert `newInterval` into `intervals` such that the list remains sorted and non-overlapping, merging overlapping intervals if necessary.

```text
Input:  intervals = [[1, 3], [6, 9]], newInterval = [2, 5]
Output: [[1, 5], [6, 9]]
Explanation: Because the new interval [2, 5] overlaps with [1, 3], they merge into [1, 5].
```

---

### The Intuitive Mental Model

Unlike general interval problems where intervals arrive unsorted, the input list here is guaranteed to be sorted and non-overlapping. We can exploit this existing structure to solve the problem without sorting.

#### Brute Force: Append and Re-Sort
The most straightforward approach appends `newInterval` to the end of `intervals`, re-sorts the entire list in $O(n \log n)$ time, and runs the standard Merge Intervals algorithm. While functional, this completely discards the fact that the original array was already sorted and disjoint.

#### Optimal Approach: Three-Phase Linear Sweep
Because the original list is sorted, every interval falls into one of three sequential phases relative to `newInterval`:

1. **Phase 1: The "Before" Zone (Completely Preceding):**
   - Intervals that finish before `newInterval` begins: `intervals[i][1] < newInterval[0]`.
   - These cannot possibly collide. Append them directly to the result.

2. **Phase 2: The "Overlap" Zone (Absorption and Expansion):**
   - Intervals that clash with `newInterval`. An interval overlaps as long as it begins before `newInterval` finishes: `intervals[i][0] <= newInterval[1]`.
   - Absorb each overlapping interval into `newInterval` by stretching boundaries:
     $$\text{newInterval}[0] = \min(\text{newInterval}[0], \text{intervals}[i][0])$$
     $$\text{newInterval}[1] = \max(\text{newInterval}[1], \text{intervals}[i][1])$$
   - Once all overlapping intervals are absorbed, append the unified `newInterval` to the result.

3. **Phase 3: The "After" Zone (Completely Succeeding):**
   - All remaining intervals start strictly after `newInterval` has concluded.
   - Append them directly to the result.

#### Execution Walkthrough

Let us trace `intervals = [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]]` with `newInterval = [4, 8]`:

| Step | Current Interval | Phase | Condition Evaluated | Action Taken | Result State |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `[1, 2]` | Phase 1 (Before) | `end (2) < new_start (4)` | Append `[1, 2]` | `[[1, 2]]` |
| **2** | `[3, 5]` | Phase 2 (Overlap) | `start (3) <= new_end (8)` | Merge: `[min(4, 3), max(8, 5)]` = `[3, 8]` | `[[1, 2]]` |
| **3** | `[6, 7]` | Phase 2 (Overlap) | `start (6) <= new_end (8)` | Merge: `[min(3, 6), max(8, 7)]` = `[3, 8]` | `[[1, 2]]` |
| **4** | `[8, 10]` | Phase 2 (Overlap) | `start (8) <= new_end (8)` | Merge: `[min(3, 8), max(8, 10)]` = `[3, 10]` | `[[1, 2]]` |
| **-** | - | Phase 2 Complete | No further overlaps | Append merged `[3, 10]` | `[[1, 2], [3, 10]]` |
| **5** | `[12, 16]` | Phase 3 (After) | Remaining interval | Append `[12, 16]` | `[[1, 2], [3, 10], [12, 16]]` |

Final output is `[[1, 2], [3, 10], [12, 16]]`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create an empty list `result = []`, set pointer `i = 0`, and record `n = len(intervals)`.
2. **Phase 1 (Add Preceding Intervals):**
   - While `i < n` and `intervals[i][1] < newInterval[0]`:
     - Append `intervals[i]` to `result`.
     - Increment `i += 1`.
3. **Phase 2 (Merge Overlapping Intervals):**
   - While `i < n` and `intervals[i][0] <= newInterval[1]`:
     - Update `newInterval[0] = min(newInterval[0], intervals[i][0])`.
     - Update `newInterval[1] = max(newInterval[1], intervals[i][1])`.
     - Increment `i += 1`.
   - Append the updated `newInterval` to `result`.
4. **Phase 3 (Add Remaining Intervals):**
   - While `i < n`:
     - Append `intervals[i]` to `result`.
     - Increment `i += 1`.
5. **Return Result:** Return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Three-Phase Linear Pass" default>

```python
class Solution:
    def insert(self, intervals: list[list[int]], newInterval: list[int]) -> list[list[int]]:
        result: list[list[int]] = []
        i = 0
        n = len(intervals)

        # Phase 1: Add all intervals that finish before newInterval begins
        while i < n and intervals[i][1] < newInterval[0]:
            result.append(intervals[i])
            i += 1

        # Phase 2: Merge all overlapping intervals into newInterval
        while i < n and intervals[i][0] <= newInterval[1]:
            newInterval[0] = min(newInterval[0], intervals[i][0])
            newInterval[1] = max(newInterval[1], intervals[i][1])
            i += 1
        result.append(newInterval)

        # Phase 3: Add all remaining intervals that start after newInterval ends
        while i < n:
            result.append(intervals[i])
            i += 1

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Append and Re-Sort">

```python
class Solution:
    def insert(self, intervals: list[list[int]], newInterval: list[int]) -> list[list[int]]:
        # Append newInterval and sort the whole list
        intervals.append(newInterval)
        intervals.sort(key=lambda x: x[0])

        merged: list[list[int]] = [intervals[0]]
        for curr in intervals[1:]:
            if curr[0] <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], curr[1])
            else:
                merged.append(curr)

        return merged
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Append and Re-Sort** | $O(n \log n)$ | $O(n)$ | Re-sorts the entire array. Discards the pre-sorted structure of the original input. |
| **Three-Phase Linear Pass** | $O(n)$ | $O(n)$ | Leverages the sorted input to process each interval once in linear time. |

---

### Common Pitfall: Premature Appending of the Merged Interval

A common bug is appending `newInterval` inside the Phase 2 while loop. If `newInterval` spans across multiple intervals, appending prematurely inserts incomplete intermediate versions into `result`. The expanded `newInterval` must only be appended once Phase 2 has absorbed every overlapping range.

---

### Concise Interview Takeaway

Because the input is pre-sorted, solve in a single $O(n)$ linear sweep across three phases: append intervals ending before `newInterval`, merge all intervals overlapping `newInterval`, append the merged interval, and then append all remaining intervals. This avoids unnecessary $O(n \log n)$ sorting.
