---
id: 10-split-array-largest-sum
title: "410. Split Array Largest Sum"
description: "Binary search on minimax subarray sum with greedy partition check"
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Minimax Partition</span>

> **Problem Statement:** Given an integer array `nums` and an integer `k`, split `nums` into `k` non-empty contiguous subarrays such that the largest sum of any subarray is minimized. Return this minimized largest sum.

```text
Input:  nums = [7, 2, 5, 10, 8], k = 2
Output: 18
Explanation: The best split is [7, 2, 5] and [10, 8], where the largest subarray sum is max(14, 18) = 18.
```

---

### The Intuitive Mental Model

Directly determining where to place partition cuts leads to an expensive $O(n^2 \cdot k)$ dynamic programming formulation. Instead of searching over partition indices, invert the problem by binary searching the answer itself: the minimized maximum subarray sum.

#### Brute Force: Dynamic Programming
Define `dp[i][j]` as the minimum largest sum obtained by partitioning the first $i$ elements into $j$ subarrays. Testing every transition requires $O(n^2 \cdot k)$ time and $O(n \cdot k)$ memory, which becomes prohibitive on larger constraints.

#### Optimal Approach: Binary Search on Minimax Answer Space
Notice the monotonic structure of the answer space:
- If a target maximum sum `mid` allows partitioning `nums` into $k$ or fewer subarrays, any larger maximum sum will also work.
- If a target maximum sum `mid` requires more than $k$ subarrays, any smaller sum is impossible.

We bound the search space tightly:
- **Lower bound (`low = max(nums)`):** The largest subarray sum cannot be smaller than the largest individual element in `nums`.
- **Upper bound (`high = sum(nums)`):** If $k = 1$, the entire array forms one single subarray with sum $\sum \text{nums}$.

For each candidate `mid`, greedily accumulate numbers. When adding the next number exceeds `mid`, start a new subarray. If the total subarrays required is $\le k$, search for a smaller maximum sum (`high = mid - 1`); otherwise increase the allowance (`low = mid + 1`).

#### Execution Walkthrough

Let us trace `nums = [7, 2, 5, 10, 8]` with `k = 2` (`low = 10`, `high = 32`):

| Step | `low` | `high` | `mid` (Max Sum) | Subarray Partitions | Subarrays Needed | Feasible? ($\le 2$) | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `10` | `32` | `21` | `[7, 2, 5]`, `[10, 8]` | 2 | Yes | Try smaller: `high = mid - 1` | `[10, 20]` |
| **2** | `10` | `20` | `15` | `[7, 2, 5]`, `[10]`, `[8]` | 3 | No | Allow larger: `low = mid + 1` | `[16, 20]` |
| **3** | `16` | `20` | `18` | `[7, 2, 5]`, `[10, 8]` | 2 | Yes | Try smaller: `high = mid - 1` | `[16, 17]` |
| **4** | `16` | `17` | `16` | `[7, 2, 5]`, `[10]`, `[8]` | 3 | No | Allow larger: `low = mid + 1` | `[17, 17]` |
| **5** | `17` | `17` | `17` | `[7, 2, 5]`, `[10]`, `[8]` | 3 | No | Allow larger: `low = mid + 1` | `[18, 17]` |

Loop terminates with `low = 18`. The optimal minimized maximum sum is 18.

---

### Step-by-Step Algorithm

1. **Establish Search Boundaries:** Set `low = max(nums)` and `high = sum(nums)`.
2. **Execute Binary Search:** While `low <= high`:
   - Compute midpoint: `mid = low + (high - low) // 2`.
   - Greedily test partition count:
     - Set `subarrays_needed = 1` and `current_sum = 0`.
     - For each `num` in `nums`:
       - If `current_sum + num <= mid`, update `current_sum += num`.
       - Else, start new subarray: `subarrays_needed += 1`, reset `current_sum = num`.
   - If `subarrays_needed <= k`:
     - Valid partition: try smaller maximum with `high = mid - 1`.
   - Else:
     - Exceeded $k$ subarrays: increase threshold with `low = mid + 1`.
3. **Return Answer:** When the search concludes, return `low`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Binary Search on Minimax Answer" default>

```python
class Solution:
    def splitArray(self, nums: list[int], k: int) -> int:
        # Minimum possible answer is the largest single element
        low = max(nums)
        # Maximum possible answer is the sum of all elements (k = 1)
        high = sum(nums)

        def can_split(max_sum_allowed: int) -> bool:
            subarrays_needed = 1
            current_sum = 0

            for num in nums:
                if current_sum + num <= max_sum_allowed:
                    current_sum += num
                else:
                    # Current subarray full; start a new one
                    subarrays_needed += 1
                    current_sum = num

            return subarrays_needed <= k

        while low <= high:
            mid = low + (high - low) // 2

            if can_split(mid):
                # Valid partition; try to find a smaller maximum sum
                high = mid - 1
            else:
                # Exceeded k subarrays; must allow a larger sum
                low = mid + 1

        return low
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Dynamic Programming">

```python
class Solution:
    def splitArray(self, nums: list[int], k: int) -> int:
        n = len(nums)
        prefix = [0] * (n + 1)
        for i in range(n):
            prefix[i + 1] = prefix[i] + nums[i]

        # dp[i][j] = min largest sum splitting first i elements into j subarrays
        dp = [[float("inf")] * (k + 1) for _ in range(n + 1)]
        dp[0][0] = 0

        for j in range(1, k + 1):
            for i in range(1, n + 1):
                for p in range(i):
                    largest = max(dp[p][j - 1], prefix[i] - prefix[p])
                    if largest < dp[i][j]:
                        dp[i][j] = largest

        return int(dp[n][k])
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Dynamic Programming** | $O(n^2 \cdot k)$ | $O(n \cdot k)$ | Tests split locations recursively. High computational overhead and quadratic table storage. |
| **Binary Search on Answer** | $O(n \log(\sum \text{nums}))$ | $O(1)$ | Tests maximum sum bounds logarithmically with an $O(n)$ greedy check. Achieves optimal speed and constant memory. |

---

### Common Pitfall: Underestimating the Initial Subarray Count

When simulating greedy partitions, initializing `subarrays_needed = 0` causes an off-by-one bug because the first subarray is already actively accumulating values. The counter must begin at 1. Additionally, setting `low` below `max(nums)` allows the midpoint to be smaller than an individual number, breaking the greedy invariant.

---

### Concise Interview Takeaway

Minimize the maximum subarray sum by binary searching the answer space $[\max(\text{nums}), \sum \text{nums}]$. At each candidate sum, greedily pack elements into subarrays in $O(n)$ time. This delivers an $O(n \log(\sum \text{nums}))$ solution with $O(1)$ space, vastly outperforming $O(n^2 k)$ dynamic programming.
