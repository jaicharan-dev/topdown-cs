---
id: 3-insert-interval
title: "57. Insert Interval"
description: "Three phases: everything before, everything touching, everything after"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Three-Phase Linear Sweep</span>

> **Problem Statement:** You are given a sorted list of non-overlapping intervals and one new interval. Insert it, merging where necessary, and return the list still sorted and non-overlapping.

```text
Input:  intervals = [[1, 3], [6, 9]], newInterval = [2, 5]
Output: [[1, 5], [6, 9]]
```

---

### Picture it

The input is **already** sorted and already clean, which is the gift here. Adding the new interval to the list and re-running Merge Intervals would work, and it would throw that gift away by sorting again.

Since everything is in order, the existing intervals fall into three runs:

```text
[ entirely before ][ touching the newcomer ][ entirely after ]
```

The first run passes through untouched. The middle run collapses with the newcomer into a single interval. The third run passes through untouched as well.

So one sweep in three phases, no sorting.

---

### How to think about it

Walk the list once with an index.

**Phase one, entirely before.** While an interval ends before the newcomer starts, it cannot touch it, so copy it straight to the answer.

**Phase two, the overlap.** While an interval starts at or before the newcomer's end, it touches the newcomer. Absorb it by widening the newcomer: its start becomes the smaller of the two starts, its end the larger of the two ends. Keep going until the intervals stop touching, then append the widened newcomer once.

**Phase three, entirely after.** Copy whatever is left.

Widening with `min` and `max` is what makes phase two correct in every case. The newcomer might start before an existing interval, end after one, or be swallowed by one, and taking the extremes handles all of them without separate branches.

The comparisons are both inclusive, because touching intervals merge here just as in Merge Intervals: `[1, 3]` and `[3, 5]` cover one continuous stretch.

---

### Walking through the example

Take `intervals = [[1, 3], [6, 9]]` and `newInterval = [2, 5]`.

1. **Phase one.** The first interval `[1, 3]` ends at `3`, which is not before the newcomer's start of `2`. So phase one copies nothing.
2. **Phase two.** `[1, 3]` starts at `1`, which is at or before the newcomer's end of `5`, so they touch. Widen the newcomer to `[min(2, 1), max(5, 3)]`, which is `[1, 5]`. Then `[6, 9]` starts at `6`, after `5`, so the overlap run ends. Append `[1, 5]`.
3. **Phase three.** Copy `[6, 9]`.

The result is `[[1, 5], [6, 9]]`.

Notice phase one did nothing here, and in an input like `intervals = [[1, 2]]` with a newcomer of `[5, 6]`, phase two would do nothing instead. Each phase can be empty, which is fine.

---

### The code

```python
class Solution:
    def insert(self, intervals: list[list[int]], newInterval: list[int]) -> list[list[int]]:
        out = []
        i, n = 0, len(intervals)
        start, end = newInterval

        # 1. everything that finishes before the newcomer begins
        while i < n and intervals[i][1] < start:
            out.append(intervals[i])
            i += 1

        # 2. everything that touches it, widened into one interval
        while i < n and intervals[i][0] <= end:
            start = min(start, intervals[i][0])
            end = max(end, intervals[i][1])
            i += 1

        out.append([start, end])

        # 3. everything that begins after it ends
        while i < n:
            out.append(intervals[i])
            i += 1

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

One pass. Each interval is examined by exactly one of the three phases, because the index never resets.

This is the gain over appending and re-merging, which would cost $O(n \log n)$ for a sort the input had already paid for.

#### Space: $O(n)$

The output list. Nothing else grows.

---

### Remember this

The input is already sorted, so do not sort again. Sweep once in three phases: copy everything ending before the newcomer, widen the newcomer with `min` and `max` across everything that touches it, then copy the rest. Both comparisons are inclusive, so touching intervals merge. $O(n)$ time.
