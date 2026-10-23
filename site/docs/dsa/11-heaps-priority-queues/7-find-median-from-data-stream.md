---
id: 7-find-median-from-data-stream
title: "295. Find Median from Data Stream"
description: "Split the values into a low half and a high half, and watch where they meet"
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Heaps</span>

> **Problem Statement:** Numbers arrive one at a time. After any number of them, return the median of everything seen so far. For an even count, the median is the average of the two middle values.

```text
addNum(1), addNum(2), findMedian() -> 1.5
addNum(3), findMedian() -> 2.0
```

---

### Picture it

Keeping a sorted list works but inserting into it costs $O(n)$ per number, since everything after the insertion point shifts.

The realisation that cracks this is that you do not need the values in order. You only need the ones **in the middle**.

So split everything into two piles:

```text
low pile        high pile
(smaller half)  (larger half)
      ...  7  |  9  ...
```

If the low pile gives up its largest value and the high pile its smallest, those are the two middle values of the whole collection. A pile that surrenders its largest is a max-heap; a pile that surrenders its smallest is a min-heap.

With the piles kept the same size, or the low one ahead by exactly one, the median is always right there on top.

---

### How to think about it

Maintain two rules after every insertion.

**Ordering:** every value in the low pile is at most every value in the high pile.

**Balance:** the piles are equal in size, or the low pile holds exactly one more.

A neat way to enforce both without a pile of conditionals is to **push through the other heap**. Put the new number into the low pile, then immediately move the low pile's largest into the high pile. That guarantees ordering, because whatever moves across is the biggest of the low half. Then, if the high pile has become the larger of the two, move its smallest back.

Reading the median is then trivial. With unequal sizes the low pile has the extra value, so its top is the median. With equal sizes, average the two tops.

In Python the min-heap is built in, so the low pile is stored with its values **negated** to behave as a max-heap. Negate on the way in and on the way out, and nothing else has to change.

---

### Walking through the example

1. **addNum(1).** It goes into the low pile, then moves to the high pile, which is then the larger, so it moves back. The low pile holds `1` and the high pile is empty.
2. **findMedian.** Sizes are unequal, so the median is the low pile's top: `1.0`.
3. **addNum(2).** It enters the low pile, which momentarily holds `1, 2`. Its largest, `2`, moves to the high pile. Now the sizes are `1` and `1`, so nothing moves back.
4. **findMedian.** Sizes are equal, so average the tops: `(1 + 2) / 2 = 1.5`.
5. **addNum(3).** It enters the low pile, whose largest is now `3`, which moves to the high pile. The high pile holds `2, 3`, making it larger, so its smallest, `2`, moves back. The low pile holds `1, 2`, the high pile holds `3`.
6. **findMedian.** Sizes are unequal, so the median is the low pile's top: `2.0`.

---

### The code

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.low = []    # max-heap, stored negated
        self.high = []   # min-heap

    def addNum(self, num: int) -> None:
        # push through the low pile, so what crosses over is its largest
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))

        # keep the low pile equal or one ahead
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return float(-self.low[0])

        return (-self.low[0] + self.high[0]) / 2
```

---

### Time and space complexity

#### Time: $O(\log n)$ to add, $O(1)$ to read

Adding performs a constant number of heap operations, each about $\log n$. Reading the median only looks at the tops, which costs nothing.

A sorted list would read in $O(1)$ too but insert in $O(n)$, which is the trade this avoids.

#### Space: $O(n)$

Every number is held in one of the two piles. That is unavoidable, since any later number can shift which values are in the middle.

---

### Remember this

You never need the values sorted, only the middle ones, so keep a max-heap of the smaller half and a min-heap of the larger half. Push through the opposite heap to enforce the ordering, then rebalance so the low pile is equal or one ahead, which puts the median on top. Negate the low pile to get a max-heap in Python. $O(\log n)$ to add, $O(1)$ to read.
