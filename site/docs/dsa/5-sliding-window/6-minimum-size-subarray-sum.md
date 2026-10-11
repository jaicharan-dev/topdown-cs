---
id: 6-minimum-size-subarray-sum
title: "209. Minimum Size Subarray Sum"
description: "Inverted accordion sliding window contracting to find minimum length"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** Given an array of positive integers `nums` and a positive integer `target`, return the minimal length of a contiguous subarray whose sum is greater than or equal to `target`. If there is no such subarray, return `0` instead.

```text
Input:  target = 7, nums = [2, 3, 1, 2, 4, 3]
Output: 2
Explanation: The subarray [4, 3] has the minimal length of 2 with sum >= 7.
```

---

### The Intuitive Mental Model

Most sliding window problems search for the longest valid subarray. Here, the objective is inverted: we seek the **shortest valid subarray** whose sum reaches or exceeds `target`.

Think of the window as an accordion:
- **Expand the Head (`right`):** Stretch forward by adding elements into `curr_sum` until the sum meets or exceeds `target`.
- **Squeeze the Tail (`left`):** The moment `curr_sum >= target`, a valid subarray is found. Now greedily contract the tail: update the candidate minimum length, subtract `nums[left]` from `curr_sum`, and increment `left`. Keep shrinking until `curr_sum` falls below `target`.
- Resume stretching `right` to find subsequent candidates.

#### Brute Force: Testing Every Subarray
The naive approach considers every starting index $i$ and sums subsequent elements until reaching or exceeding `target`, taking $O(n^2)$ time across all pairs $(i, j)$. On inputs where $n = 10^5$, an $O(n^2)$ algorithm performs roughly $10^{10}$ operations and times out.

#### Optimal Approach: Dynamic Contracting Sliding Window
Because all numbers in `nums` are positive, the running sum is strictly monotonic with respect to window boundaries: expanding `right` always increases the sum, and advancing `left` always decreases it.

Although the algorithm nests a `while` loop inside a `for` loop, neither pointer ever moves backward:
- Pointer `right` advances at most $n$ times.
- Pointer `left` advances at most $n$ times.
The total number of pointer moves across the entire execution is at most $2n$, proving strictly linear $O(n)$ amortized time.

#### Execution Walkthrough

Let us trace `target = 7` with `nums = [2, 3, 1, 2, 4, 3]`:

| Step | Pointer `right` | `nums[right]` | `curr_sum` | Condition (`sum >= 7`) | Action Taken | Pointer `left` | Window Length | `min_len` | Active Window |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | `0` | `2` | 2 | False | Expand | `0` | 1 | $\infty$ | `[2]` |
| **2** | `1` | `3` | 5 | False | Expand | `0` | 2 | $\infty$ | `[2, 3]` |
| **3** | `2` | `1` | 6 | False | Expand | `0` | 3 | $\infty$ | `[2, 3, 1]` |
| **4** | `3` | `2` | 8 | True | Evict 2, advance `left` | `1` | 4 | 4 | `[3, 1, 2]` |
| **5** | `4` | `4` | 10 | True | Evict 3, then 1 | `3` | 3 | 3 | `[2, 4]` |
| **6** | `5` | `3` | 9 | True | Evict 2, then 4 | `5` | 2 | 2 | `[3]` |

The shortest valid subarray found has length 2 (`[4, 3]`).

---

### Step-by-Step Algorithm

1. **Initialize State:** Set `left = 0`, `curr_sum = 0`, and `min_len = float('inf')`.
2. **Expand Right Boundary:** Iterate pointer `right` through `range(len(nums))`.
3. **Accumulate Element:** Add `nums[right]` to `curr_sum`.
4. **Contract Left Boundary:** While `curr_sum >= target`:
   - Update best length: `min_len = min(min_len, right - left + 1)`.
   - Evict the leftmost element: `curr_sum -= nums[left]`.
   - Increment `left += 1`.
5. **Handle Edge Case:** If `min_len` remains `float('inf')`, return `0`; otherwise return `int(min_len)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Dynamic Sliding Window" default>

```python
class Solution:
    def minSubArrayLen(self, target: int, nums: list[int]) -> int:
        left = 0
        curr_sum = 0
        min_len = float('inf')

        for right in range(len(nums)):
            curr_sum += nums[right]

            # Contract from left while the window sum satisfies target
            while curr_sum >= target:
                min_len = min(min_len, right - left + 1)
                curr_sum -= nums[left]
                left += 1

        return 0 if min_len == float('inf') else int(min_len)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Prefix Sums with Binary Search">

```python
import bisect

class Solution:
    def minSubArrayLen(self, target: int, nums: list[int]) -> int:
        n = len(nums)
        # prefix[i] stores the sum of nums[0 ... i - 1]
        prefix = [0] * (n + 1)
        for i in range(n):
            prefix[i + 1] = prefix[i] + nums[i]

        min_len = float('inf')

        # For each start index, binary search for the first valid end index
        for i in range(n):
            needed = prefix[i] + target
            idx = bisect.bisect_left(prefix, needed)
            if idx <= n:
                min_len = min(min_len, idx - i)

        return 0 if min_len == float('inf') else int(min_len)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n^2)$ | $O(1)$ | Checks all subarrays with nested loops. Inefficient on large arrays. |
| **Prefix Sums + Binary Search** | $O(n \log n)$ | $O(n)$ | Precomputes monotonic prefix sums and applies binary search per start index. |
| **Dynamic Sliding Window** | $O(n)$ | $O(1)$ | Amortized linear scan using two pointers. Optimal speed and constant extra memory. |

---

### Common Pitfall: Assuming Applicability with Negative Numbers

This sliding window algorithm relies strictly on all array elements being positive ($nums[i] > 0$). If negative values were present, adding an element could decrease the sum and removing an element could increase it, breaking monotonicity. Problems with negative integers require prefix sums combined with monotonic double-ended queues or hash maps.

---

### Concise Interview Takeaway

For shortest valid window problems, invert the expansion logic: expand `right` until `curr_sum >= target`, then contract `left` within a `while` loop to record the tightest window possible. Because each element enters and leaves the window at most once, the algorithm executes in optimal $O(n)$ amortized time with $O(1)$ auxiliary space.
