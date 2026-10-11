---
id: 3-max-consecutive-ones-iii
title: "1004. Max Consecutive Ones III"
description: "Sliding window with zero-token budget allocation"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** Given a binary array `nums` and an integer `k`, return the maximum number of consecutive `1`'s in the array if you are allowed to flip at most `k` `0`'s to `1`'s.

```text
Input:  nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k = 2
Output: 6
Explanation: Flipping two zeros at indices 5 and 10 forms a consecutive sequence of six 1s: [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1].
```

---

### The Intuitive Mental Model

Although the problem is framed as flipping at most $k$ zeros, you never need to mutate any elements. Reframe the question from first principles:

**"What is the longest contiguous subarray that contains at most $k$ zeros?"**

Think of $k$ as your **zero-token budget**:
- Expanding `right` pulls in new elements.
- Encountering a `1` is free and costs nothing.
- Encountering a `0` costs 1 token from your budget.
- When `zero_count > k`, your budget is depleted. You must advance `left` to evict elements until an older zero is discarded, refunding a token back to your balance.

#### Brute Force: Testing Every Subarray
The naive approach generates all possible subarrays `nums[i...j]`. For each subarray, we count how many zeros it contains. If the count is at most $k$, the subarray is valid and its length $j - i + 1$ is considered. Checking all $O(n^2)$ subarrays requires $O(n^2)$ time. For an array of size $10^5$, $10^{10}$ operations will exceed time limits.

#### Optimal Approach: Sliding Window with Zero Budget Allocation
Instead of re-evaluating subarrays, we slide a dynamic window across `nums`:
- Expand `right` element by element.
- If `nums[right] == 0`, increment `zero_count`.
- While `zero_count > k`, evict elements from `left`. If `nums[left] == 0`, decrement `zero_count` and increment `left`.
- At all times when the loop condition holds, the window between `left` and `right` contains at most $k$ zeros. Its length `right - left + 1` is a valid candidate for the answer.

#### Execution Walkthrough

Let us trace `nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0]` with $k = 2$:

| Step | Pointer `right` | `nums[right]` | `zero_count` Before Shrink | Condition (`zero_count > 2`) | Action Taken | Pointer `left` | Window Length | `max_len` | Active Window |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | `0` | `1` | 0 | False | Expand | `0` | 1 | 1 | `[1]` |
| **2** | `1` | `1` | 0 | False | Expand | `0` | 2 | 2 | `[1, 1]` |
| **3** | `2` | `1` | 0 | False | Expand | `0` | 3 | 3 | `[1, 1, 1]` |
| **4** | `3` | `0` | 1 | False | Expand (cost 1) | `0` | 4 | 4 | `[1, 1, 1, 0]` |
| **5** | `4` | `0` | 2 | False | Expand (cost 1) | `0` | 5 | 5 | `[1, 1, 1, 0, 0]` |
| **6** | `5` | `0` | 3 | True | Shrink until zero evicted | `4` | 2 | 5 | `[0, 0]` |
| **7** | `6` | `1` | 2 | False | Expand | `4` | 3 | 5 | `[0, 0, 1]` |
| **8** | `7` | `1` | 2 | False | Expand | `4` | 4 | 5 | `[0, 0, 1, 1]` |
| **9** | `8` | `1` | 2 | False | Expand | `4` | 5 | 5 | `[0, 0, 1, 1, 1]` |
| **10** | `9` | `1` | 2 | False | Expand | `4` | 6 | 6 | `[0, 0, 1, 1, 1, 1]` |
| **11** | `10` | `0` | 3 | True | Evict zero at index 4 | `5` | 6 | 6 | `[0, 1, 1, 1, 1, 0]` |

The maximum consecutive sequence of ones achievable is 6.

---

### Step-by-Step Algorithm

1. **Initialize State:** Set pointers `left = 0`, `zero_count = 0`, and `max_len = 0`.
2. **Expand Right Boundary:** Iterate pointer `right` through `range(len(nums))`.
3. **Account for Zeros:** If `nums[right] == 0`, increment `zero_count += 1`.
4. **Contract Left Boundary:** While `zero_count > k`, check if `nums[left] == 0`. If so, decrement `zero_count -= 1`. Increment `left += 1`.
5. **Update Maximum Window:** Calculate `right - left + 1` and update `max_len = max(max_len, right - left + 1)`.
6. **Return Result:** Return `max_len`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Dynamic Shrinking Window" default>

```python
class Solution:
    def longestOnes(self, nums: list[int], k: int) -> int:
        left = 0
        zero_count = 0
        max_len = 0

        for right in range(len(nums)):
            # Consume 1 budget token if a zero enters the window
            if nums[right] == 0:
                zero_count += 1

            # Evict from left until zero count is within budget
            while zero_count > k:
                if nums[left] == 0:
                    zero_count -= 1
                left += 1

            # Window is guaranteed to contain at most k zeros
            max_len = max(max_len, right - left + 1)

        return max_len
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Non-Shrinking Window">

```python
class Solution:
    def longestOnes(self, nums: list[int], k: int) -> int:
        left = 0
        zero_count = 0

        for right in range(len(nums)):
            if nums[right] == 0:
                zero_count += 1

            # Never shrink window below its historical maximum size
            if zero_count > k:
                if nums[left] == 0:
                    zero_count -= 1
                left += 1

        return len(nums) - left
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n^2)$ | $O(1)$ | Tests every subarray and counts zeros. Quadratic runtime times out on large arrays. |
| **Dynamic Shrinking Window** | $O(n)$ | $O(1)$ | Each pointer traverses each element at most once. Highly intuitive standard sliding window. |
| **Non-Shrinking Window** | $O(n)$ | $O(1)$ | Shifts `left` by at most 1 per step, maintaining the maximum window size without a nested while loop. |

---

### Common Pitfall: Physically Flipping Bits

A common mistake is attempting to mutate values in `nums` or using backtracking to simulate flipping zeros. Bit flipping is only a metaphor in the problem description. Mutating the input complicates the algorithm and leads to $O(n^2)$ or exponential branching. The problem is purely equivalent to finding the longest subarray containing at most $k$ zeros.

---

### Concise Interview Takeaway

Never flip bits. Reframe the problem as identifying the longest subarray containing at most $k$ zeros. Treat $k$ as a quota: expand with `right`, consume tokens on zeros, and increment `left` to refund tokens whenever the count exceeds $k$. This achieves an optimal $O(n)$ time and $O(1)$ space solution.
