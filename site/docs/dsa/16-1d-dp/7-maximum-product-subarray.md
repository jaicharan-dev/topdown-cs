---
id: 7-maximum-product-subarray
title: "152. Maximum Product Subarray"
description: "Track running maximum and minimum products to handle negative sign flips in O(1) space"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dual-State Tracking</span>

> **Problem Statement:** Given an integer array `nums`, find a contiguous non-empty subarray that has the largest product, and return that product. The test cases are generated so that the answer will fit in a 32-bit integer.

```text
Input:  nums = [2, 3, -2, 4]
Output: 6
Explanation: [2, 3] has the largest product 6.
```

---

### The Intuitive Mental Model

In Kadane's algorithm for maximum subarray sum, adding a negative number always hurts the total. With multiplication, however, negative numbers cause sign flips:
- A negative number times a positive number yields a negative result.
- Multiplying two negative numbers turns the product positive. A very large negative product, when multiplied by another negative value, suddenly becomes a large positive product.

Because of this property, tracking only the maximum product ending at the current index is insufficient. We must track both:
- `curr_max`: The maximum contiguous product ending at the current index.
- `curr_min`: The minimum contiguous product ending at the current index (retaining the largest negative magnitude).

#### Brute Force: Evaluating Every Subarray
A brute force approach inspects every possible contiguous subarray $(i, j)$ and computes its product. Across an array of length $n$, testing all $O(n^2)$ pairs requires $O(n^2)$ time.

#### Optimal Approach: Dual-State Dynamic Tracking
At each element $n$, three candidates compete to become the new maximum and minimum:
1. $n$ alone (starting a fresh subarray, essential after a zero).
2. $n \times \text{curr\_max}$ (extending a positive streak, or forming a negative min when $n < 0$).
3. $n \times \text{curr\_min}$ (turning a negative min into a positive max when $n < 0$).

$$\text{new\_max} = \max(n, \, n \times \text{curr\_max}, \, n \times \text{curr\_min})$$
$$\text{new\_min} = \min(n, \, n \times \text{curr\_max}, \, n \times \text{curr\_min})$$

#### Execution Walkthrough

Let us trace `nums = [2, 3, -2, 4, -1]`:

| Element ($n$) | Candidate 1 ($n$) | Candidate 2 ($n \times \text{curr\_max}$) | Candidate 3 ($n \times \text{curr\_min}$) | New `curr_max` | New `curr_min` | Running `res` |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial** | - | - | - | 1 | 1 | 4 |
| **2** | 2 | $2 \times 1 = 2$ | $2 \times 1 = 2$ | 2 | 2 | 4 |
| **3** | 3 | $3 \times 2 = 6$ | $3 \times 2 = 6$ | 6 | 3 | 6 |
| **-2** | -2 | $-2 \times 6 = -12$ | $-2 \times 3 = -6$ | -2 | -12 | 6 |
| **4** | 4 | $4 \times (-2) = -8$ | $4 \times (-12) = -48$ | 4 | -48 | 6 |
| **-1** | -1 | $-1 \times 4 = -4$ | $-1 \times (-48) = 48$ | 48 | -4 | 48 |

The maximum product subarray is 48, formed by `[3, -2, 4, -1]`.

---

### Step-by-Step Algorithm

1. **Initialize Global and Running Trackers:**
   - Set `res = max(nums)` to handle negative single-element arrays like `[-2]`.
   - Set `curr_max = 1` and `curr_min = 1`.
2. **Scan Across Elements:** For each number $n$ in `nums`:
   - If $n == 0$: reset `curr_max = 1` and `curr_min = 1`, then continue.
   - Compute `temp_max = max(n, n * curr_max, n * curr_min)`.
   - Compute `curr_min = min(n, n * curr_max, n * curr_min)`.
   - Update `curr_max = temp_max`.
   - Update `res = max(res, curr_max)`.
3. **Return Maximum Product:** Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Running Min/Max Trackers" default>

```python
class Solution:
    def maxProduct(self, nums: list[int]) -> int:
        res = max(nums)
        curr_min = 1
        curr_max = 1

        for n in nums:
            if n == 0:
                curr_min = 1
                curr_max = 1
                continue

            temp_max = max(n, n * curr_max, n * curr_min)
            curr_min = min(n, n * curr_max, n * curr_min)
            curr_max = temp_max

            res = max(res, curr_max)

        return res
```

  </TabItem>
  <TabItem value="prefix-suffix" label="Alternative: Prefix and Suffix Scan">

```python
class Solution:
    def maxProduct(self, nums: list[int]) -> int:
        n = len(nums)
        res = max(nums)
        prefix = 0
        suffix = 0

        for i in range(n):
            prefix = (prefix or 1) * nums[i]
            suffix = (suffix or 1) * nums[n - 1 - i]
            res = max(res, prefix, suffix)

        return res
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n^2)$ | $O(1)$ | Computes products of all contiguous subarrays using nested loops. |
| **Prefix and Suffix Scan** | $O(n)$ | $O(1)$ | Accumulates prefix and suffix products, resetting to 1 upon meeting zero. |
| **Running Min/Max DP** | $O(n)$ | $O(1)$ | Tracks current maximum and minimum products in a single pass with immediate state transitions. |

---

### Common Pitfall: Overwriting State Before Computing Minimum

When calculating `curr_max` and `curr_min`, if you update `curr_max` in place before calculating `curr_min`, the minimum calculation inadvertently uses the newly updated maximum rather than the previous state. Always store the new maximum in a temporary variable (`temp_max`) or update both concurrently using tuple assignment. In addition, encountering a zero breaks subarray continuity, so `curr_max` and `curr_min` must be reset to 1.

---

### Concise Interview Takeaway

Because multiplying two negative numbers yields a positive number, a minimum product with large magnitude can instantly become the maximum product upon encountering another negative value. Maintaining both the current maximum and current minimum at each step ensures that sign flips are captured in $O(n)$ time and $O(1)$ space.
