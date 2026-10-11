---
id: 7-find-median-from-data-stream
title: "295. Find Median from Data Stream"
description: "Two balanced heaps maintaining upper and lower halves in log-time"
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Heaps</span>

> **Problem Statement:** The median is the middle value in an ordered integer list. If the size of the list is even, the median is the arithmetic mean of the two middle values. Design a data structure supporting:
> - `addNum(num)`: Inserts an integer `num` from the data stream.
> - `findMedian()`: Returns the median of all elements added so far.

```text
Input:
["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]
[[], [1], [2], [], [3], []]

Output:
[null, null, null, 1.5, null, 2.0]

Explanation:
MedianFinder medianFinder = new MedianFinder();
medianFinder.addNum(1);    // arr = [1]
medianFinder.addNum(2);    // arr = [1, 2]
medianFinder.findMedian(); // returns 1.5 (average of 1 and 2)
medianFinder.addNum(3);    // arr = [1, 2, 3]
medianFinder.findMedian(); // returns 2.0
```

---

### The Intuitive Mental Model

If you store incoming numbers in a sorted list using binary search insertion, finding the median is an immediate $O(1)$ lookup, but inserting each number requires shifting elements down contiguous memory in $O(n)$ time. Over a stream of $n$ numbers, this degrades to $O(n^2)$ total work.

Notice what the median actually represents: the exact dividing boundary between the lower 50% and upper 50% of elements. We do not need the entire dataset to remain sorted. We only require constant-time access to two critical pivot values:
1. The largest number in the lower half.
2. The smallest number in the upper half.

This insight gives rise to the Two Heaps pattern:
- `small` (Max-Heap): Holds the lower half of values. Its root (`-small[0]`) is the maximum of the lower half.
- `large` (Min-Heap): Holds the upper half of values. Its root (`large[0]`) is the minimum of the upper half.

```
Lower 50% (Max-Heap: small)   |   Upper 50% (Min-Heap: large)
          [ ... , 3 ]          |            [ 5 , ... ]
                ^              |              ^
          Peak: 3              |          Peak: 5

Even count: Median = (3 + 5) / 2.0 = 4.0
Odd count:  Median = top of whichever heap holds the extra element!
```

#### Brute Force: Sorted Insertion into Dynamic Array

A naive approach inserts each incoming number into a sorted dynamic array using `bisect.insort`. Finding the middle index runs in $O(1)$ time, but maintaining sorted order forces an array memory shift of up to $n$ elements for every single insertion. Total runtime scales quadratically to $O(n^2)$ for $n$ stream updates.

#### Optimal Approach: Two Balanced Heaps

To guarantee instantaneous median extraction, we maintain two invariants:
1. **Value Invariant:** Every element in `small` must be $\le$ every element in `large`.
2. **Size Invariant:** The heaps must remain balanced in size. We adopt the convention that `small` can hold at most one more element than `large`:

$$\text{len}(small) = \text{len}(large) \quad \text{or} \quad \text{len}(small) = \text{len}(large) + 1$$

When a new number arrives, we filter it through `small` and `large` in $O(\log n)$ time, ensuring instant $O(1)$ median calculation.

#### Execution Walkthrough

Let us trace the operations from the example:

| Step | Operation | Value Balancing Action | Size Balancing Action | `small` (Max-Heap) | `large` (Min-Heap) | Result |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **1** | `addNum(1)` | Push `1` to `small`, move `1` to `large` | `len(large) > len(small)`: move `1` back to `small` | `[-1]` | `[]` | `None` |
| **2** | `addNum(2)` | Push `2` to `small`, move `2` to `large` | `len(large) <= len(small)`: sizes balanced (1, 1) | `[-1]` | `[2]` | `None` |
| **3** | `findMedian()` | Both sizes equal to 1 | Median is average of `-small[0]` (1) and `large[0]` (2) | `[-1]` | `[2]` | `1.5` |
| **4** | `addNum(3)` | Push `3` to `small`, move `3` to `large` | `len(large) > len(small)`: move `2` from `large` to `small` | `[-2, -1]` | `[3]` | `None` |
| **5** | `findMedian()` | `len(small) == 2, len(large) == 1` | Odd count: return root of `small`: `-small[0] = 2` | `[-2, -1]` | `[3]` | `2.0` |

---

### Step-by-Step Algorithm

1. **Initialize Data Structures:** In `__init__`, construct two heaps: `self.small` (simulated Max-Heap storing negated values) and `self.large` (standard Min-Heap).
2. **Implement `addNum(num)`:**
   - Push `-num` into `self.small`.
   - Pop the maximum from `self.small` and push it to `self.large` (maintaining the Value Invariant).
   - If `len(self.large) > len(self.small)`: pop the minimum from `self.large` and push its negated value to `self.small` (maintaining the Size Invariant).
3. **Implement `findMedian()`:**
   - If `len(self.small) > len(self.large)`: return `float(-self.small[0])`.
   - If sizes are equal: return `(-self.small[0] + self.large[0]) / 2.0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two Balanced Heaps" default>

```python
import heapq


class MedianFinder:
    def __init__(self):
        # Max-heap for lower half (stores negated values)
        self.small: list[int] = []
        # Min-heap for upper half
        self.large: list[int] = []

    def addNum(self, num: int) -> None:
        # Step 1: Push to small, then move top of small to large
        # Guarantees all elements in small <= all elements in large
        heapq.heappush(self.small, -num)
        highest_of_small = -heapq.heappop(self.small)
        heapq.heappush(self.large, highest_of_small)

        # Step 2: Balance sizes so small can have at most 1 more element than large
        if len(self.large) > len(self.small):
            lowest_of_large = heapq.heappop(self.large)
            heapq.heappush(self.small, -lowest_of_large)

    def findMedian(self) -> float:
        # Odd number of total elements: top of small is the median
        if len(self.small) > len(self.large):
            return float(-self.small[0])

        # Even number of elements: average the tops of both heaps
        return (-self.small[0] + self.large[0]) / 2.0
```

  </TabItem>
  <TabItem value="alternative" label="Alternative / Brute Force: Sorted List Insertion">

```python
import bisect


class MedianFinder:
    def __init__(self):
        self.arr: list[int] = []

    def addNum(self, num: int) -> None:
        # Binary search insertion into a dynamic array (O(n) shift)
        bisect.insort(self.arr, num)

    def findMedian(self) -> float:
        n = len(self.arr)
        mid = n // 2
        if n % 2 == 1:
            return float(self.arr[mid])
        return (self.arr[mid - 1] + self.arr[mid]) / 2.0
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Sorted List Insertion** | Add: $O(n)$, Median: $O(1)$ | $O(n)$ | Fast median lookup, but inserting each number forces contiguous memory array shifts, taking quadratic time overall. |
| **Two Balanced Heaps** | Add: $O(\log n)$, Median: $O(1)$ | $O(n)$ | Balances the lower half in a Max-Heap and the upper half in a Min-Heap. Logarithmic stream insertion with instant median retrieval. |

---

### Common Pitfall: Pushing into Arbitrary Heaps and Violating Invariants

A frequent bug is attempting complex `if-elif-else` checks comparing `num` to heap roots before deciding where to push. This often violates the value boundary invariant when values are equal or when heaps are empty. Siphoning every new element through `small` into `large` first, and then restoring size balance, automatically ensures that all elements in `small` are less than or equal to elements in `large` with zero edge-case branching.

---

### Concise Interview Takeaway

Partition the data stream into two balanced heaps: a Max-Heap for the lower half and a Min-Heap for the upper half. Siphoning elements through the heaps maintains value ordering and size equality, enabling `addNum` in $O(\log n)$ time and `findMedian` in $O(1)$ time.
