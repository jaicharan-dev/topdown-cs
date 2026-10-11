---
id: 5-meeting-rooms-ii
title: "253. Meeting Rooms II"
description: "Two-pointer chronological sweep and min-heap tracking of concurrent rooms"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers Sweep</span>

> **Problem Statement:** Given an array of meeting time intervals where `intervals[i] = [start_i, end_i]`, return the minimum number of conference rooms required to host all meetings without conflicts.

```text
Input:  intervals = [[0, 30], [5, 10], [15, 20]]
Output: 2
Explanation: Room 1 hosts [0, 30]. Room 2 can host [5, 10] and then [15, 20], requiring 2 rooms in total.
```

---

### The Intuitive Mental Model

The identity of which meeting takes place in which specific room is irrelevant. We only need to determine the maximum number of meetings occurring simultaneously at any single moment in time.

#### Brute Force: Timeline Frequency Array
One direct approach records active meeting counts on a minute-by-minute timeline array. For each meeting `[start, end]`, increment every unit in `[start, end)`. The maximum count reached across the timeline is the required number of rooms. However, when meeting timestamps are large (such as $10^6$), this takes $O(n \cdot \text{range})$ time and excessive memory.

#### Optimal Approach: Chronological Two-Pointer Sweep
Meetings only alter room demand at discrete points in time: when a meeting begins (requiring $+1$ room) or when a meeting concludes (freeing $-1$ room).

Instead of keeping start and end pairs bound together, separate them into two independent sorted lists:
1. `starts`: chronologically ordered start times.
2. `ends`: chronologically ordered end times.

We traverse the timeline with two pointers:
- If `starts[s] < ends[e]`: a new meeting begins before the earliest ongoing meeting concludes. We must allocate a new room (`rooms_needed += 1`) and advance `s += 1`.
- If `starts[s] >= ends[e]`: an existing meeting has concluded. That room is vacated and can be immediately reused. We advance `e += 1` to inspect the next earliest conclusion without incrementing the room count.

#### Execution Walkthrough

Let us trace `intervals = [[0, 30], [5, 10], [15, 20]]`. Separating and sorting gives `starts = [0, 5, 15]` and `ends = [10, 20, 30]`:

| Step | Current `start` | Current `end` (`ends[e]`) | Condition (`start < end`) | Action Taken | Pointers (`s, e`) | Rooms Needed |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: |
| **1** | `0` | `10` | $0 < 10$ (True) | Allocate new room | `s=1, e=0` | `1` |
| **2** | `5` | `10` | $5 < 10$ (True) | Allocate new room | `s=2, e=0` | `2` |
| **3** | `15` | `10` | $15 < 10$ (False) | Room freed! Reuse room | `s=3, e=1` | `2` |

Maximum concurrent rooms required across the schedule is `2`.

---

### Step-by-Step Algorithm

1. **Handle Base Case:** If `intervals` is empty, return `0`.
2. **Extract and Sort Times:**
   - `starts = sorted([i[0] for i in intervals])`
   - `ends = sorted([i[1] for i in intervals])`
3. **Initialize Trackers:** Set `rooms_needed = 0` and pointer `end_ptr = 0`.
4. **Sweep Starts:** Iterate through each `start` in `starts`:
   - If `start < ends[end_ptr]`: room is occupied; increment `rooms_needed += 1`.
   - Else: an existing room was vacated; increment `end_ptr += 1`.
5. **Return Result:** Return `rooms_needed`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Chronological Two-Pointer Sweep" default>

```python
class Solution:
    def minMeetingRooms(self, intervals: list[list[int]]) -> int:
        if not intervals:
            return 0

        # Separate start and end times into independently sorted timelines
        starts = sorted([i[0] for i in intervals])
        ends = sorted([i[1] for i in intervals])

        rooms_needed = 0
        end_ptr = 0

        # Sweep chronologically through meeting start requests
        for start in starts:
            # If the current meeting begins before the earliest meeting finishes
            if start < ends[end_ptr]:
                rooms_needed += 1
            else:
                # An existing room is vacated; reuse it by advancing end_ptr
                end_ptr += 1

        return rooms_needed
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Min-Heap for Active Rooms">

```python
import heapq

class Solution:
    def minMeetingRooms(self, intervals: list[list[int]]) -> int:
        if not intervals:
            return 0

        # Sort intervals chronologically by start time
        intervals.sort(key=lambda x: x[0])

        # Min-heap to store the end times of active rooms
        rooms_heap: list[int] = []

        for start, end in intervals:
            # If the room with earliest end time has freed up, reuse it
            if rooms_heap and rooms_heap[0] <= start:
                heapq.heappop(rooms_heap)

            # Assign room (new or reused) with the current meeting end time
            heapq.heappush(rooms_heap, end)

        return len(rooms_heap)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Min-Heap** | $O(n \log n)$ | $O(n)$ | Sorts intervals and uses a min-heap to reuse rooms with the earliest end time. |
| **Two-Pointer Sweep** | $O(n \log n)$ | $O(n)$ | Separates start and end times into sorted arrays, sweeping linearly without heap overhead. |

---

### Common Pitfall: Failing to Handle Equal Start and End Times

If meeting A ends at time 10 and meeting B begins at time 10, meeting B can immediately reuse the room vacated by meeting A. If the condition used is `start <= ends[end_ptr]`, a new room would be incorrectly allocated at time 10. The condition must be strictly `start < ends[end_ptr]` so that vacated rooms are reused right away.

---

### Concise Interview Takeaway

The minimum number of rooms needed equals the maximum concurrent overlaps. Separate start and end times into two sorted arrays and sweep chronologically with two pointers: allocate a room if `start < ends[end_ptr]`, and reuse an existing room by advancing `end_ptr` otherwise. This runs in $O(n \log n)$ time with $O(n)$ auxiliary memory.
