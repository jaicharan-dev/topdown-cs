---
id: 5-meeting-rooms-ii
title: "253. Meeting Rooms II"
description: "Separate the starts from the ends and watch how many meetings are live at once"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Intervals</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers Sweep</span>

> **Problem Statement:** Given a list of meetings with start and end times, return the smallest number of rooms needed so that none of them clash.

```text
Input:  intervals = [[0, 30], [5, 10], [15, 20]]
Output: 2
```

---

### Picture it

The answer is not about which meeting goes in which room. It is simply the **largest number of meetings happening at the same moment**, because that many rooms must exist and no more are ever needed.

So forget the pairings and watch the count rise and fall. Every start adds one to the number of live meetings; every end takes one away. The answer is the highest the count ever reaches.

And for that, a meeting's start and end do not need to stay attached to each other. Pull them apart into two sorted lists and replay the day:

```text
starts: 0, 5, 15
ends:  10, 20, 30
```

Step through both in time order, adding a room at each start and releasing one at each end.

---

### How to think about it

Sort the starts and sort the ends into two separate lists. Then walk with a pointer into each.

At each step compare the next start against the next end:

- **The next start comes first**, so a meeting begins. Increase the live count and advance the start pointer.
- **Otherwise a meeting ends first** (or at the same moment), so release a room. Decrease the live count and advance the end pointer.

Record the highest live count seen.

The tie matters. When a meeting ends exactly as another begins, the room is free in time and can be reused, so the end should be handled first. Writing the comparison as "start is strictly before the next end" gives that behaviour automatically.

Only the starts need walking to the end: once they are exhausted no new rooms can be needed, so the loop can stop there.

**The heap version** is the other standard answer. Sort by start, keep a min-heap of the end times of meetings currently in rooms, and at each new meeting pop any end that has already passed before pushing the new one. The heap's size is the live count, and its peak is the answer. Same complexity, more machinery; the two-list sweep is the one that makes *why* it works obvious.

---

### Walking through the example

Starts sorted are `0, 5, 15`. Ends sorted are `10, 20, 30`.

1. **Start `0` against end `10`.** The start is first, so a meeting begins. Live count `1`, which is the new maximum.
2. **Start `5` against end `10`.** The start is first again. Live count `2`, a new maximum.
3. **Start `15` against end `10`.** Now the end is first, so a room is released. Live count `1`.
4. **Start `15` against end `20`.** The start is first. Live count `2`, which ties the maximum.
5. **Starts are exhausted**, so stop.

The peak was `2`, so two rooms are needed.

---

### The code

```python
class Solution:
    def minMeetingRooms(self, intervals: list[list[int]]) -> int:
        starts = sorted(span[0] for span in intervals)
        ends = sorted(span[1] for span in intervals)

        live = 0
        most = 0
        e = 0

        for start in starts:
            # a meeting ending exactly now frees its room in time
            if start < ends[e]:
                live += 1
            else:
                e += 1   # a room came free, so this meeting reuses it

            most = max(most, live)

        return most
```

---

### Time and space complexity

#### Time: $O(n \log n)$

Two sorts, then a single pass over the starts.

#### Space: $O(n)$

The two lists of times. The heap version instead holds one entry per room in use, which is $O(n)$ in the worst case too.

---

### Remember this

The number of rooms is the peak number of meetings live at once, so stop pairing meetings with rooms. Split the starts and ends into two sorted lists and replay them in time order, adding on a start and releasing on an end. Handle an end before a start at the same moment, so a room freed exactly on time gets reused. $O(n \log n)$ time.
