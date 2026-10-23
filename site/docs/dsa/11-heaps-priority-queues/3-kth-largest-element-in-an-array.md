---
id: 3-kth-largest-element-in-an-array
title: "215. Kth Largest Element in an Array"
description: "Keep only the k biggest, and the smallest of those is the answer"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Min-Heap / Quickselect</span>

> **Problem Statement:** Given an array and a number `k`, return the `k`-th largest value, counting repeats. Do not simply sort the whole array.

```text
Input:  nums = [3, 2, 1, 5, 6, 4], k = 2
Output: 5
```

---

### Picture it

Turn the question into a statement about a collection.

If you kept only the `k` largest values seen so far and threw everything else away, then once every value has been considered, **the smallest value you kept is the `k`-th largest overall**. Everything bigger than it was kept too, and that is exactly `k - 1` values.

So the collection needs to answer one question quickly: which of my entries is the smallest? That is a min-heap, with the smallest on top.

The top of that heap is both the thing you evict when the collection overflows, and the answer when the walk ends. One structure doing both jobs is what makes this short.

---

### How to think about it

Push every value onto a min-heap. Whenever the heap grows past `k`, pop the top, which discards the smallest of the candidates, since it can no longer be in the top `k`.

At the end, the heap holds the `k` largest values and its top is the smallest of them, which is the answer.

Python's heap is a min-heap already, so unlike K Closest Points no negation is needed here. Noticing which direction you need is the part that decides whether the code is three lines or a tangle.

**Quickselect** is the other answer, and the one an interviewer may be fishing for. Pick a pivot, partition the array around it, and look at where the pivot lands: if it is at the position you want, you are done, otherwise recurse into the side that contains the answer. Discarding one side each time gives $O(n)$ on average, better than the heap's $O(n \log k)$. Its worst case is $O(n^2)$ on unlucky pivots, which random pivot choice makes vanishingly unlikely, and it rearranges the input. The heap is the safer default; quickselect is the one to name when asked to do better.

---

### Walking through the example

Take `nums = [3, 2, 1, 5, 6, 4]` with `k = 2`.

1. **Push 3.** The heap holds `3`.
2. **Push 2.** The heap holds `2, 3`, which is exactly `k`, so nothing is evicted.
3. **Push 1.** Now three entries, so pop the smallest, `1`. The heap holds `2, 3`.
4. **Push 5.** Pop the smallest, `2`. The heap holds `3, 5`.
5. **Push 6.** Pop `3`. The heap holds `5, 6`.
6. **Push 4.** Pop `4`, since it is now the smallest of the three. The heap holds `5, 6`.

The heap holds the two largest values, and its top is `5`, the second largest.

---

### The code

```python
import heapq

class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        heap = []

        for value in nums:
            heapq.heappush(heap, value)

            # more than k candidates, so the smallest cannot be the answer
            if len(heap) > k:
                heapq.heappop(heap)

        return heap[0]   # the smallest of the k largest
```

---

### Time and space complexity

#### Time: $O(n \log k)$

Each value is pushed once, and each push or pop costs about $\log k$ since the heap is capped at `k` entries.

Sorting is $O(n \log n)$. Quickselect is $O(n)$ on average, which is better still.

#### Space: $O(k)$

The heap. Sorting a copy would be $O(n)$, and quickselect is $O(1)$ but rearranges the input you were given.

---

### Remember this

Keep the `k` largest values in a min-heap, evicting the top whenever the heap overflows, and the top at the end is the answer, because exactly `k - 1` values are bigger than it. A min-heap is what you want here, so no negation is needed. Name quickselect as the $O(n)$ average alternative. $O(n \log k)$ time, $O(k)$ space.
