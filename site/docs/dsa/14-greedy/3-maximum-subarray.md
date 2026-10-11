---
id: 3-maximum-subarray
title: "53. Maximum Subarray"
description: "Kadane's algorithm: dynamic reset of negative running prefixes"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Kadane's Algorithm</span>

> **Problem Statement:** Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

```text
Input:  nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
Explanation: The contiguous subarray [4, -1, 2, 1] has the largest sum = 6.
```

---

### The Intuitive Mental Model

Imagine walking along an array carrying a running total of the numbers you have collected.
- A **positive running total** (`curr_sum > 0`) is an asset: it contributes positively to whatever future subarray elements you encounter.
- A **negative running total** (`curr_sum < 0`) is a liability: attaching a negative prefix to any subsequent subarray strictly degrades its sum.

#### Brute Force: Testing Every Subarray

The most direct approach tests every possible contiguous slice $[i \dots j]$:
- Fix start index `i`.
- Expand end index `j` from `i` to the end of the array, maintaining a cumulative sum.
- Track the maximum sum encountered across all pairs $(i, j)$.

Because there are $\frac{n(n + 1)}{2}$ contiguous subarrays, this takes $O(n^2)$ time. On large inputs with up to $10^5$ elements, quadratic time leads directly to a Time Limit Exceeded error.

#### Optimal Approach: Kadane's Dynamic Reset

Kadane's algorithm makes a greedy choice at every single element:
1. **Extend:** Add the current element to the existing running total (`curr_sum + num`).
2. **Restart:** Discard the previous running total and start a fresh subarray directly at `num`.

This choice can be written as the recurrence:

$$\text{curr\_sum} = \max(\text{num}, \text{curr\_sum} + \text{num})$$

Equivalently, if `curr_sum` has dropped below zero prior to processing `num`, we greedily reset `curr_sum = 0` because carrying forward a negative accumulated sum will only decrease any future subarray sum.

#### Execution Walkthrough

Let us trace `nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`:

| Index ($i$) | Number (`num`) | Reset If Negative? | Calculation (`curr_sum`) | `max_sum` | Subarray Tracked |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | -2 | No (initial element) | -2 | -2 | `[-2]` |
| **1** | 1 | Yes ($-2 < 0$, reset to 0) | $0 + 1 = 1$ | 1 | `[1]` |
| **2** | -3 | No ($1 \ge 0$) | $1 + (-3) = -2$ | 1 | `[1, -3]` |
| **3** | 4 | Yes ($-2 < 0$, reset to 0) | $0 + 4 = 4$ | 4 | `[4]` |
| **4** | -1 | No ($4 \ge 0$) | $4 + (-1) = 3$ | 4 | `[4, -1]` |
| **5** | 2 | No ($3 \ge 0$) | $3 + 2 = 5$ | 5 | `[4, -1, 2]` |
| **6** | 1 | No ($5 \ge 0$) | $5 + 1 = 6$ | 6 | `[4, -1, 2, 1]` (Global Best) |
| **7** | -5 | No ($6 \ge 0$) | $6 + (-5) = 1$ | 6 | `[4, -1, 2, 1, -5]` |
| **8** | 4 | No ($1 \ge 0$) | $1 + 4 = 5$ | 6 | `[4, -1, 2, 1, -5, 4]` |

---

### Step-by-Step Algorithm

1. **Initialize State:** Set `max_sum = nums[0]` to safely handle all-negative arrays, and `curr_sum = 0`.
2. **Iterate Through Array:** For each `num` in `nums`:
   - If `curr_sum < 0`, reset `curr_sum = 0`.
   - Add current number: `curr_sum += num`.
   - Update global maximum: `max_sum = max(max_sum, curr_sum)`.
3. **Return Result:** After inspecting every element, return `max_sum`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Kadane's Algorithm" default>

```python
class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        max_sum = nums[0]
        curr_sum = 0

        for num in nums:
            # If the accumulated prefix is negative, discard it
            if curr_sum < 0:
                curr_sum = 0

            curr_sum += num
            max_sum = max(max_sum, curr_sum)

        return max_sum
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Quadratic Scan">

```python
class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        n = len(nums)
        max_sum = nums[0]

        for i in range(n):
            curr_sum = 0
            for j in range(i, n):
                curr_sum += nums[j]
                if curr_sum > max_sum:
                    max_sum = curr_sum

        return max_sum
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Quadratic Scan** | $O(n^2)$ | $O(1)$ | Tests every possible subarray start and end. Redundant prefix calculations exceed time limits on large inputs. |
| **Kadane's Algorithm** | $O(n)$ | $O(1)$ | Discards negative prefixes in a single linear pass. Achieves optimal time and constant auxiliary memory. |

---

### Common Pitfall: Initializing Maximum Sum to Zero

When all numbers in `nums` are negative (such as `nums = [-3, -1, -5]`), initializing `max_sum = 0` causes the function to return `0`. This is incorrect because the problem requires a non-empty subarray, and `0` does not correspond to any valid contiguous slice.

Initializing `max_sum = nums[0]` guarantees that even if every value is negative, `max_sum` correctly captures the single least-negative number (in this case, `-1`).

---

### Concise Interview Takeaway

For Maximum Subarray, use Kadane's algorithm to greedily discard negative prefixes. As you iterate through `nums`, reset the running sum whenever it falls below zero, and update `max_sum = max(max_sum, curr_sum)`. Initializing `max_sum = nums[0]` correctly handles arrays containing exclusively negative values in optimal $O(n)$ time and $O(1)$ auxiliary space.
