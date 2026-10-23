---
id: 1-meeting-rooms
title: "252. Meeting Rooms"
description: "Sort by start time, then only neighbours can clash"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sorting by Start Time</span>

> **Problem Statement:** You are given a list of meetings, each with a start and an end time. Say whether one person could attend all of them without a clash.

```text
Input:  intervals = [[0, 30], [5, 10], [15, 20]]
Output: false
```

---

### Picture it

In the given order the meetings look scattered, and checking every pair against every other is `n²` comparisons.

Sorting by start time changes the situation completely. Once the meetings are in chronological order, a clash can only happen between **neighbours**.

The reason is worth stating properly. If meeting `A` comes before meeting `B` in the sorted order and they do not overlap, then everything after `B` starts even later, so it cannot overlap `A` either. Any clash that exists must therefore show up between some meeting and the one right after it.

So one sorted sweep is enough.

---

### How to think about it

Sort by start time, then compare each meeting with its immediate predecessor. If the new one begins **before** the previous one ends, they clash and the answer is `false`.

Everything turns on that comparison being right.

```text
previous ends at 10, next starts at 10   -> no clash, back to back
previous ends at 10, next starts at 9    -> clash
```

A meeting starting at exactly the moment another ends is fine, so the test is "starts strictly before the previous end". Using "at or before" would wrongly reject a perfectly packed schedule, and it is the detail interviewers check.

Sorting by **start** time specifically is what makes neighbour comparison valid. Sorting by end time would also group things, but the one-step argument above would no longer hold in the same way.

---

### Walking through the example

Take `[[0, 30], [5, 10], [15, 20]]`. Sorting by start gives `[[0, 30], [5, 10], [15, 20]]`, which happens to be unchanged.

1. **Compare `[5, 10]` with `[0, 30]`.** It starts at `5`, which is before `30`. They clash, so return `false` immediately.

The third meeting is never examined.

Now take `[[7, 10], [2, 4]]`. Sorted, that is `[[2, 4], [7, 10]]`. The second starts at `7`, which is not before `4`, so there is no clash and the answer is `true`.

---

### The code

```python
class Solution:
    def canAttendMeetings(self, intervals: list[list[int]]) -> bool:
        intervals.sort(key=lambda meeting: meeting[0])

        for i in range(1, len(intervals)):
            # starting exactly when the previous ends is fine
            if intervals[i][0] < intervals[i - 1][1]:
                return False

        return True
```

---

### Time and space complexity

#### Time: $O(n \log n)$

The sort dominates. The sweep afterwards is a single pass with one comparison each, and it can return early at the first clash.

Comparing every pair without sorting would be $O(n^2)$, so the sort pays for itself many times over.

#### Space: $O(1)$ beyond the sort

Only an index is kept. Python's sort itself uses $O(n)$ internally, which is worth mentioning if the question is about memory.

---

### Remember this

Sorting by start time is the move that makes every interval problem tractable, because afterwards only neighbours can clash. Compare each meeting's start against the previous meeting's end, and use a strict comparison so back-to-back meetings are allowed. $O(n \log n)$ time, dominated by the sort.
