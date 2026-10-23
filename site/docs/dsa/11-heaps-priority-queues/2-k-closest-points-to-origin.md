---
id: 2-k-closest-points-to-origin
title: "973. K Closest Points to Origin"
description: "Hold the k best so far and evict the worst, with no square roots involved"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Max-Heap</span>

> **Problem Statement:** Given a list of points on a plane and a number `k`, return the `k` points nearest the origin, in any order.

```text
Input:  points = [[1, 3], [-2, 2]], k = 1
Output: [[-2, 2]]
```

---

### Picture it

Imagine keeping a shortlist of the `k` closest points found so far. Each new point gets compared against the **worst** entry on that shortlist. If the newcomer is closer, it takes that entry's place; if not, it is discarded.

For that to be quick, the shortlist has to answer one question instantly: which of my entries is furthest away? That is a heap, arranged so the largest distance sits on top.

The shortlist never grows beyond `k`, which is the whole point. Sorting all the points would arrange millions of them to answer a question about ten.

---

### How to think about it

Walk the points, pushing each onto the heap along with its distance. Whenever the heap holds more than `k`, pop the top, which is the furthest, discarding it. At the end the heap holds exactly the `k` closest.

Two practical points.

**Do not compute square roots.** Distance from the origin is the square root of `x² + y²`, but the square root is a strictly increasing function, so comparing `x² + y²` directly orders the points identically. Skipping it avoids floating-point work and any rounding worries, and it is a good thing to say out loud.

**Python's heap is a min-heap**, which puts the *smallest* on top, the opposite of what is needed here. Push the **negated** distance so the furthest point sits on top and gets evicted. This negation trick is the standard way to get a max-heap in Python.

A sorted order is not required by the problem, so the heap's contents can be returned as they are.

**The alternative** is quickselect, which partitions the points around a pivot until the `k` closest are at the front. That is $O(n)$ on average rather than $O(n \log k)$, and it is the better answer when `k` is close to `n`. It is also longer to write and has a bad worst case, so the heap is the sensible default.

---

### Walking through the example

Take `points = [[1, 3], [-2, 2]]` with `k = 1`.

1. **Point `[1, 3]`.** Its squared distance is `1 + 9 = 10`. Push it. The heap holds one entry, which is not more than `k`, so nothing is evicted.
2. **Point `[-2, 2]`.** Its squared distance is `4 + 4 = 8`. Push it, so the heap now holds two entries, which is more than `k`.
3. **Evict the furthest.** The top of the max-heap is `[1, 3]` at distance `10`, so it goes.

The heap holds `[-2, 2]`, which is the answer. Note that no square root was ever taken: comparing `8` against `10` settles it.

---

### The code

```python
import heapq

class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        heap = []

        for x, y in points:
            # no square root: squaring preserves the ordering
            distance = x * x + y * y

            # negated, because Python's heap keeps the smallest on top
            heapq.heappush(heap, (-distance, x, y))

            if len(heap) > k:
                heapq.heappop(heap)   # drop the furthest

        return [[x, y] for _, x, y in heap]
```

---

### Time and space complexity

#### Time: $O(n \log k)$

Every point is pushed once, and each push or pop costs about $\log k$ because the heap never holds more than `k` entries.

Sorting everything would be $O(n \log n)$. With a million points and `k` of ten, the difference is roughly three operations per point instead of twenty.

#### Space: $O(k)$

The heap. This matters as much as the speed when the points arrive as a stream too large to hold.

---

### Remember this

Keep a shortlist of size `k` and evict its worst entry whenever it overflows, which needs the furthest point on top, so negate the distance to turn Python's min-heap into a max-heap. Compare squared distances and never take a square root, since squaring preserves the order. $O(n \log k)$ time, $O(k)$ space.
