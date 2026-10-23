---
id: 4-non-overlapping-intervals
title: "435. Non-overlapping Intervals"
description: "Sort by end time, because finishing early leaves the most room for everything else"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy Scheduling</span>

> **Problem Statement:** Given a list of intervals, return the smallest number you must remove so that none of the remaining ones overlap.

```text
Input:  intervals = [[1, 2], [2, 3], [3, 4], [1, 3]]
Output: 1
```

---

### Picture it

Turn the question upside down. Removing as few as possible is the same as **keeping as many as possible**, and keeping the most non-overlapping intervals is a classic scheduling question: how many meetings can one room host?

Now the key decision. Faced with a choice of which meeting to keep, keep the one that **finishes earliest**. It occupies the room for the shortest time going forward, so it leaves the most room for everything after it. A meeting that starts early but runs late is worse, however early it begins.

That is why this problem sorts by **end** time while the previous ones sorted by start.

---

### How to think about it

Sort by end time. Then sweep, holding the end time of the last interval you decided to keep:

- **If the next interval starts at or after that**, it fits, so keep it and update the held end time.
- **Otherwise it clashes**, so count it as removed and leave the held end time alone, because the interval you kept finishes earlier and is the better one to keep.

The answer is the number counted as removed.

**Why keeping the earlier finisher is always right** is worth being able to argue. Suppose an optimal solution keeps some interval `X` where this method would keep `Y`, which finishes no later. Swapping `Y` in for `X` cannot cause a clash, because `Y` ends at or before `X` does, so the swapped solution is just as large. Repeating that argument turns any optimal solution into this one, so this one is optimal too. That exchange argument is the standard way to justify a greedy choice.

Starting the held end time at negative infinity lets the first interval be kept without a special case.

The comparison is inclusive: an interval starting exactly when another ends does not clash, which matches Meeting Rooms rather than Merge Intervals.

---

### Walking through the example

Take `[[1, 2], [2, 3], [3, 4], [1, 3]]`. Sorting by end time gives `[[1, 2], [2, 3], [1, 3], [3, 4]]`.

1. **`[1, 2]`.** Nothing kept yet, so keep it. The held end is `2`.
2. **`[2, 3]`** starts at `2`, which is at or after `2`, so it fits. Keep it. The held end is `3`.
3. **`[1, 3]`** starts at `1`, before `3`, so it clashes. Remove it, and the count becomes `1`. The held end stays at `3`.
4. **`[3, 4]`** starts at `3`, so it fits. Keep it. The held end is `4`.

One removal, which matches the expected answer.

Sorting by start instead would have considered `[1, 3]` before `[2, 3]` and kept the longer interval, forcing a second removal later.

---

### The code

```python
class Solution:
    def eraseOverlapIntervals(self, intervals: list[list[int]]) -> int:
        # by end time: finishing early leaves the most room for what follows
        intervals.sort(key=lambda span: span[1])

        removed = 0
        last_end = float("-inf")

        for start, end in intervals:
            if start >= last_end:
                last_end = end   # fits, so keep it
            else:
                removed += 1     # clashes, and the kept one ends sooner

        return removed
```

---

### Time and space complexity

#### Time: $O(n \log n)$

The sort dominates; the sweep is one pass with a comparison each.

#### Space: $O(1)$ beyond the sort

A counter and the held end time.

---

### Remember this

Removing the fewest is keeping the most, which is interval scheduling. Sort by **end** time, not start, because the interval that finishes earliest leaves the most room for the rest, and the exchange argument shows that choice is always safe. Keep an interval when it starts at or after the last kept end; otherwise count it as removed and hold on to the earlier finisher. $O(n \log n)$ time, $O(1)$ space.
