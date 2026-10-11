---
id: 3-kth-largest-element-in-an-array
title: "215. Kth Largest Element in an Array"
description: "Min-heap qualification threshold vs Quickselect partition"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Min-Heap / Quickselect</span>

> **Problem Statement:** Given an integer array `nums` and an integer `k`, return the $k$-th largest element in the array. Note that it is the $k$-th largest element in sorted order, not the $k$-th distinct element. Solve it without sorting the entire array.

```text
Input:  nums = [3, 2, 1, 5, 6, 4], k = 2
Output: 5
Explanation: In sorted order, the array is [1, 2, 3, 4, 5, 6], where the 2nd largest element is 5.
```

---

### The Intuitive Mental Model

Imagine maintaining a leaderboard for a gaming tournament that displays only the top $k$ highest scores.

To track the $k$ largest elements, counterintuitively, we use a Min-Heap capped at size $k$. In a Min-Heap, the root element is always the smallest value in the heap. On our leaderboard, that root represents the minimum qualification threshold: the lowest score currently holding a spot inside the top $k$.

As each score arrives:
1. If the leaderboard has fewer than $k$ scores, admit it directly.
2. Once the leaderboard is full (size $k$), compare the newcomer to the root:
   - If the newcomer is smaller than or equal to the qualification threshold, ignore it.
   - If the newcomer is larger, evict the threshold score and admit the newcomer via `heapq.heappushpop`.
3. After inspecting all $n$ scores, the leaderboard holds the $k$ largest scores, and the root is precisely the $k$-th largest element overall.

```
nums = [3, 2, 1, 5, 6, 4],  k = 2
Min-Heap of size 2 (tracks 2 largest numbers):

Step 1: Push 3  -> Heap: [3]
Step 2: Push 2  -> Heap: [2, 3]  (Root = 2, qualification threshold)
Step 3: Check 1 -> 1 < 2         (Ignore)
Step 4: Check 5 -> 5 > 2         (Evict 2, insert 5 -> Heap: [3, 5])
Step 5: Check 6 -> 6 > 3         (Evict 3, insert 6 -> Heap: [5, 6])
Step 6: Check 4 -> 4 < 5         (Ignore)

Answer = heap[0] = 5 (The 2nd largest element)
```

#### Brute Force: Full Array Sorting

The baseline approach sorts the entire array in descending order and returns `nums[k - 1]`. While simple, sorting takes $O(n \log n)$ time. It does extensive wasted work ordering the remaining $n - k$ smaller elements that have no impact on the answer.

#### Optimal Approach: Min-Heap Qualification Threshold

Maintaining a Min-Heap of size $k$ guarantees that each element insertion or eviction takes $O(\log k)$ time. Processing all $n$ numbers yields an overall runtime of $O(n \log k)$ while keeping memory bounded to $O(k)$. When $k \ll n$, this is substantially faster and natively supports streaming inputs where array length $n$ is unknown or infinite.

Alternatively, Quickselect partitions the array in-place around a random pivot, achieving expected $O(n)$ average time and $O(1)$ auxiliary space.

#### Execution Walkthrough

Let `nums = [3, 2, 1, 5, 6, 4]` and $k = 2$:

| Step | Element | Heap Action | Min-Heap State | Root (Threshold / K-th Largest) |
| :---: | :---: | :--- | :--- | :---: |
| **1** | `3` | Heap size < 2: Push `3` | `[3]` | `3` |
| **2** | `2` | Heap size < 2: Push `2` | `[2, 3]` | `2` |
| **3** | `1` | $1 \le 2$: Ignore newcomer | `[2, 3]` | `2` |
| **4** | `5` | $5 > 2$: Evict `2`, insert `5` | `[3, 5]` | `3` |
| **5** | `6` | $6 > 3$: Evict `3`, insert `6` | `[5, 6]` | `5` |
| **6** | `4` | $4 \le 5$: Ignore newcomer | `[5, 6]` | `5` |

---

### Step-by-Step Algorithm

1. **Initialize Min-Heap:** Create an empty list `min_heap = []` to store up to $k$ elements.
2. **Stream Numbers:** Iterate through each `num` in `nums`:
   - If `len(min_heap) < k`: push `num` using `heapq.heappush(min_heap, num)`.
   - Else if `num > min_heap[0]`: invoke `heapq.heappushpop(min_heap, num)` to evict the root and admit `num`.
3. **Extract Result:** Return the root element `min_heap[0]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Min-Heap of Size K" default>

```python
import heapq


class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        # Min-heap of size k to maintain the k largest numbers
        min_heap: list[int] = []

        for num in nums:
            if len(min_heap) < k:
                heapq.heappush(min_heap, num)
            elif num > min_heap[0]:
                heapq.heappushpop(min_heap, num)

        # The root of the min-heap is the k-th largest element
        return min_heap[0]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Quickselect">

```python
import random


class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        target_idx = len(nums) - k  # Index in sorted ascending order

        def quickselect(left: int, right: int) -> int:
            pivot_idx = random.randint(left, right)
            pivot_val = nums[pivot_idx]

            # Move pivot to the end
            nums[pivot_idx], nums[right] = nums[right], nums[pivot_idx]

            store_idx = left
            for i in range(left, right):
                if nums[i] < pivot_val:
                    nums[store_idx], nums[i] = nums[i], nums[store_idx]
                    store_idx += 1

            # Move pivot to its final sorted position
            nums[store_idx], nums[right] = nums[right], nums[store_idx]

            if store_idx == target_idx:
                return nums[store_idx]
            elif store_idx < target_idx:
                return quickselect(store_idx + 1, right)
            else:
                return quickselect(left, store_idx - 1)

        return quickselect(0, len(nums) - 1)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full Sorting** | $O(n \log n)$ | $O(1)$ or $O(n)$ | Trivial to implement, but does redundant sorting work across all $n$ elements. |
| **Min-Heap (Size K)** | $O(n \log k)$ | $O(k)$ | Bounds memory to $O(k)$ and keeps per-element operations at $O(\log k)$. Excellent for streaming datasets. |
| **Quickselect** | $O(n)$ average | $O(1)$ | Discards half the search range per partition step. Achieves linear expected time, though worst-case is $O(n^2)$. |

---

### Common Pitfall: Using a Max-Heap of Size N Instead of Min-Heap of Size K

A frequent mistake is inserting all $n$ elements into a Max-Heap and calling `heappop` $k$ times. Building a heap of size $n$ takes $O(n)$ time and $O(n)$ memory, followed by $k \log n$ operations. By using a Min-Heap capped strictly at size $k$, memory is bounded to $O(k)$ and the heap operation cost depends only on $\log k$, which is much smaller when $k \ll n$.

---

### Concise Interview Takeaway

To find the $k$-th largest element, maintain a Min-Heap capped at size $k$. The root maintains the lowest qualification threshold among the top $k$, so filtering through the array runs in $O(n \log k)$ time and $O(k)$ space.
