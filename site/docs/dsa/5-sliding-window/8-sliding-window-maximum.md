---
id: 8-sliding-window-maximum
title: "239. Sliding Window Maximum"
description: "Monotonic decreasing deque tracking window maximums in O(n)"
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Queue</span>

> **Problem Statement:** You are given an array of integers `nums`, and a sliding window of size `k` moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position, return the max sliding window.

```text
Input:  nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3
Output: [3, 3, 5, 5, 6, 7]
Explanation:
Window position                Max
---------------               -----
[1  3  -1] -3  5  3  6  7       3
 1 [3  -1  -3] 5  3  6  7       3
 1  3 [-1  -3  5] 3  6  7       5
 1  3  -1 [-3  5  3] 6  7       5
 1  3  -1  -3 [5  3  6] 7       6
 1  3  -1  -3  5 [3  6  7]      7
```

---

### The Intuitive Mental Model

As a window of length $k$ moves across `nums`, rescanning all $k$ elements on every shift requires $O(k)$ operations per step, leading to $O(n \cdot k)$ runtime. For inputs where $n = 100,000$ and $k = 50,000$, this approach exceeds typical time limits.

#### Brute Force: Linear Window Rescan
The brute force method slides through every starting position $i$ from $0$ to $n - k$ and scans all $k$ items in $nums[i \dots i + k - 1]$ to identify the maximum. Across all $n - k + 1$ windows, this requires $O(n \cdot k)$ time. Using a balanced binary search tree or max-heap reduces lookup time to $O(\log k)$, but involves heap maintenance or lazy deletion overhead.

#### Optimal Approach: Monotonic Decreasing Deque
Consider this observation: if a newly arrived element is both younger (arrives later) and stronger (greater or equal value) than existing elements in the window, those older and smaller elements will never become the maximum of any future window. They can be eliminated immediately.

We maintain a double-ended queue (deque) storing **indices** in strictly decreasing order of their corresponding values:
- **The Leader (`q[0]`):** The front of the deque always holds the index of the absolute maximum value in the active window.
- **Evict smaller elements from the back:** When a new element `nums[i]` enters, pop all indices from the back whose values are $\le nums[i]$.
- **Evict expired elements from the front:** If the leader index `q[0]` falls outside the window boundary ($q[0] \le i - k$), pop it from the left.
- Each index enters the deque once and is removed at most once, yielding strict $O(n)$ amortized runtime.

#### Execution Walkthrough

Let us trace `nums = [1, 3, -1, -3, 5, 3, 6, 7]` with $k = 3$:

| Step (`i`) | Element `nums[i]` | Expired Check (`q[0] <= i - 3`) | Popped from Back | Deque Indices `q` | Values in Deque | Window Ready (`i >= 2`) | Recorded Max (`nums[q[0]]`) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | `1` | None | None | `[0]` | `[1]` | No | None |
| **1** | `3` | None | `0` (val 1 $\le$ 3) | `[1]` | `[3]` | No | None |
| **2** | `-1` | None | None | `[1, 2]` | `[3, -1]` | **Yes** | 3 |
| **3** | `-3` | None ($1 > 0$) | None | `[1, 2, 3]` | `[3, -1, -3]` | **Yes** | 3 |
| **4** | `5` | Pop `1` ($1 \le 1$) | `3, 2` (vals $-3, -1 \le 5$) | `[4]` | `[5]` | **Yes** | 5 |
| **5** | `3` | None ($4 > 2$) | None | `[4, 5]` | `[5, 3]` | **Yes** | 5 |
| **6** | `6` | None ($4 > 3$) | `5, 4` (vals $3, 5 \le 6$) | `[6]` | `[6]` | **Yes** | 6 |
| **7** | `7` | None ($6 > 4$) | `6` (val $6 \le 7$) | `[7]` | `[7]` | **Yes** | 7 |

The resulting list of sliding window maximums is `[3, 3, 5, 5, 6, 7]`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create an empty double-ended queue `q = deque()` to store indices and an empty output list `res = []`.
2. **Iterate with Index and Value:** Traverse `nums` using `enumerate(nums)` with pointer `i` and element `num`.
3. **Evict Expired Index:** If `q` is non-empty and `q[0] <= i - k`, pop the left element via `q.popleft()`.
4. **Maintain Monotonicity:** While `q` is non-empty and `nums[q[-1]] <= num`, remove the back index via `q.pop()`.
5. **Append Current Index:** Add the incoming index `i` to the back of `q`.
6. **Record Window Maximum:** Once `i >= k - 1`, append `nums[q[0]]` to `res`.
7. **Return Result:** Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Monotonic Decreasing Deque" default>

```python
from collections import deque

class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        q: deque[int] = deque()  # Stores indices in monotonically decreasing value order
        res: list[int] = []

        for i, num in enumerate(nums):
            # Step 1: Evict index that has expired past the left window boundary
            if q and q[0] <= i - k:
                q.popleft()

            # Step 2: Evict all smaller values from the back
            while q and nums[q[-1]] <= num:
                q.pop()

            # Step 3: Add current index to the back
            q.append(i)

            # Step 4: Record current window maximum once window size reaches k
            if i >= k - 1:
                res.append(nums[q[0]])

        return res
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Max-Heap with Lazy Deletion">

```python
import heapq

class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        # Heap stores (-value, index) tuples to simulate a max-heap
        heap: list[tuple[int, int]] = []
        res: list[int] = []

        for i, num in enumerate(nums):
            heapq.heappush(heap, (-num, i))

            # Once the window reaches size k, record the valid top element
            if i >= k - 1:
                # Lazily remove elements that fall outside the current window
                while heap[0][1] <= i - k:
                    heapq.heappop(heap)
                res.append(-heap[0][0])

        return res
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n \cdot k)$ | $O(1)$ | Scans all $k$ items per window. Exceeds time limit on large inputs. |
| **Max-Heap (Lazy Deletion)** | $O(n \log n)$ | $O(n)$ | Pushes all items into a heap and lazily pops expired leaders. Simple but incurs logarithmic overhead. |
| **Monotonic Deque** | $O(n)$ | $O(k)$ | Discards non-candidate elements in $O(1)$ amortized time. Strictly optimal time and space. |

---

### Common Pitfall: Storing Values Instead of Indices in the Deque

Storing element values instead of their indices makes it impossible to check in $O(1)$ whether the maximum element at the front of the deque has expired past the left boundary of the window. Storing indices allows instant verification of window expiration (`q[0] <= i - k`) while still enabling value lookups via `nums[q[0]]`.

---

### Concise Interview Takeaway

Maintain a monotonic decreasing deque of indices: pop expired indices from the front when $q[0] \le i - k$, and pop smaller elements from the back because a newer, larger value makes them obsolete. The active window maximum is always at `q[0]`, delivering an optimal $O(n)$ time and $O(k)$ auxiliary space solution.
