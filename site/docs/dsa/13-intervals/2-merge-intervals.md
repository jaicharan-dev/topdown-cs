---
id: 2-merge-intervals
title: "56. Merge Intervals"
description: "Sorted by start, each interval either extends the last one or begins a new one"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sorting by Start Time</span>

> **Problem Statement:** Given a list of intervals, combine every group that overlaps and return the resulting non-overlapping list.

```text
Input:  intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]
Output: [[1, 6], [8, 10], [15, 18]]
```

---

### Picture it

Sort by start time, then walk the intervals in order keeping one **open** interval in hand.

Each new interval is one of two things:

- **It overlaps the open one**, meaning it starts at or before the open one's end. Absorb it by stretching the open interval's end if the newcomer reaches further.
- **It does not overlap**, meaning it starts after the open interval ends. Nothing later can reach back to touch the open one either, so file it away as final and let the newcomer become the open interval.

That is the whole algorithm, and it works because sorting guarantees starts only ever move forward.

---

### How to think about it

The comparison is "does the new interval start at or before the open interval's end".

Note the **at or before**. Unlike Meeting Rooms, touching intervals should merge here: `[1, 3]` and `[3, 5]` cover the continuous stretch from `1` to `5`, so they become `[1, 5]`. The two problems use opposite strictness for the same comparison, which is exactly the kind of thing to pause on.

When absorbing, stretch the end to the **larger** of the two ends. Taking the newcomer's end blindly is wrong, because a short interval can sit entirely inside a long one: merging `[1, 10]` with `[2, 3]` must still end at `10`.

Why filing an interval away is safe: everything still to come starts at or after the current newcomer's start, which is already past the open interval's end. So nothing later can touch it, and it is final.

Building the answer by appending and then modifying its last entry keeps the code to one pass with no separate "open interval" variable to flush at the end.

---

### Walking through the example

Sorting gives `[[1, 3], [2, 6], [8, 10], [15, 18]]`.

1. **`[1, 3]`** is the first, so it becomes the open interval.
2. **`[2, 6]`** starts at `2`, which is before `3`, so they overlap. Stretch the end to the larger of `3` and `6`, giving `[1, 6]`.
3. **`[8, 10]`** starts at `8`, after `6`, so there is no overlap. File `[1, 6]` as final and open `[8, 10]`.
4. **`[15, 18]`** starts after `10`, so file `[8, 10]` and open `[15, 18]`.

At the end `[15, 18]` is already in the answer, because each interval is appended when it opens rather than when it closes.

The result is `[[1, 6], [8, 10], [15, 18]]`.

---

### The code

```python
class Solution:
    def merge(self, intervals: list[list[int]]) -> list[list[int]]:
        intervals.sort(key=lambda span: span[0])
        out = []

        for start, end in intervals:
            # touching counts as overlapping here, so the test is "at or before"
            if out and start <= out[-1][1]:
                # stretch, but never shrink: a short interval may sit inside
                out[-1][1] = max(out[-1][1], end)
            else:
                out.append([start, end])

        return out
```

---

### Time and space complexity

#### Time: $O(n \log n)$

The sort dominates. The merge itself is one pass, doing a comparison and at most one append per interval.

#### Space: $O(n)$

The output list, which in the worst case holds every interval because none of them overlap. Beyond that, nothing grows.

---

### Remember this

Sort by start, then each interval either extends the last one in the answer or starts a new one. Use "at or before" so touching intervals merge, which is the opposite strictness to Meeting Rooms. When extending, take the larger end, or a long interval swallowing a short one comes out truncated. $O(n \log n)$ time.
