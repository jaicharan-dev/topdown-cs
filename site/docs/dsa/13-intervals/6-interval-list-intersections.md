---
id: 6-interval-list-intersections
title: "986. Interval List Intersections"
description: "The overlap is the later start to the earlier end, and the earlier end moves on"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers Sweep</span>

> **Problem Statement:** You are given two lists of intervals, each sorted and internally non-overlapping. Return every stretch of time that appears in both.

```text
firstList  = [[0, 2], [5, 10], [13, 23], [24, 25]]
secondList = [[1, 5], [8, 12], [15, 24], [25, 26]]
Output: [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]
```

---

### Picture it

Put one finger on the first interval of each list. The two intervals in front of you either overlap or they do not, and the overlap, if any, is the stretch they share:

```text
overlap start = the later of the two starts
overlap end   = the earlier of the two ends
```

If that start is at or before that end, the stretch is real, so record it. If not, the two intervals miss each other entirely and there is nothing to record.

Then advance. The interval that **ends earlier** is finished: everything remaining in the other list starts at or after where you are, so that interval can never overlap anything else. Move that finger forward and leave the other where it is.

---

### How to think about it

Both lists are sorted, which is what makes two fingers enough instead of comparing every pair.

Each step:

1. Compute the candidate overlap with `max` of the starts and `min` of the ends.
2. If the start is at or before the end, record it.
3. Advance the finger whose interval has the smaller end.

The comparison is inclusive, because the intervals are closed. Two intervals touching at a single point do share that point, which is why the expected output contains stretches like `[5, 5]` and `[24, 24]`. Those single-point answers are the detail this problem is really testing, and a strict comparison silently drops them.

Advancing the smaller end is the part to be able to justify. The interval ending earlier cannot reach any later interval in the other list, since those all begin at or after the current position. The one ending later might still overlap the **next** interval in the other list, so it stays.

When either list runs out, nothing more can intersect, so the sweep ends.

---

### Walking through the example

1. **`[0, 2]` and `[1, 5]`.** The overlap is `max(0, 1)` to `min(2, 5)`, which is `[1, 2]`. Record it. The first ends earlier, so advance the first list.
2. **`[5, 10]` and `[1, 5]`.** The overlap is `[5, 5]`, a single point, so record it. The second ends earlier, so advance the second list.
3. **`[5, 10]` and `[8, 12]`.** The overlap is `[8, 10]`. Record it, then advance the first list.
4. **`[13, 23]` and `[8, 12]`.** The overlap would be `13` to `12`, where the start is after the end, so there is nothing. Advance the second list.
5. **`[13, 23]` and `[15, 24]`.** The overlap is `[15, 23]`. Record it, then advance the first list.
6. **`[24, 25]` and `[15, 24]`.** The overlap is `[24, 24]`. Record it, then advance the second list.
7. **`[24, 25]` and `[25, 26]`.** The overlap is `[25, 25]`. Record it, then advance the first list, which is now exhausted.

Six stretches, three of them single points.

---

### The code

```python
class Solution:
    def intervalIntersection(self, firstList: list[list[int]],
                             secondList: list[list[int]]) -> list[list[int]]:
        out = []
        i = j = 0

        while i < len(firstList) and j < len(secondList):
            start = max(firstList[i][0], secondList[j][0])
            end = min(firstList[i][1], secondList[j][1])

            # closed intervals, so a single shared point counts
            if start <= end:
                out.append([start, end])

            # the one ending sooner cannot reach anything later
            if firstList[i][1] < secondList[j][1]:
                i += 1
            else:
                j += 1

        return out
```

---

### Time and space complexity

#### Time: $O(m + n)$

Each step advances exactly one finger and neither goes back, so the total number of steps is bounded by the combined length of the two lists. No sorting is needed, since both arrive sorted.

#### Space: $O(1)$ beyond the answer

Two indices.

---

### Remember this

The shared stretch of two intervals is the later start to the earlier end, and it is real when that start is at or before that end. Use an inclusive comparison, because closed intervals touching at one point do intersect, and those single-point answers are what this problem checks. Advance the finger whose interval ends sooner, since it can never reach anything further along. $O(m + n)$ time.
