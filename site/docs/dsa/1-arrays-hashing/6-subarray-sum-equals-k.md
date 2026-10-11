---
id: 6-subarray-sum-equals-k
title: "560. Subarray Sum Equals K"
description: "Prefix sums with a hash map of previously seen sums"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Sums</span>

> **Problem Statement:** Given an array of integers `nums` and an integer `k`, return the total number of subarrays whose sum equals to `k`. A subarray is a contiguous non-empty sequence of elements within an array.

```text
Input:  nums = [1, 1, 1], k = 2
Output: 2
Explanation: The subarrays [nums[0], nums[1]] and [nums[1], nums[2]] both sum to 2.
```

---

### The Intuitive Mental Model

A subarray is a contiguous non-empty sequence of elements within an array. For example, in `nums = [1, 1, 1]` with `k = 2`, the subarrays `nums[0..1]` and `nums[1..2]` each sum to 2, producing a total count of 2.

#### Brute Force: Cumulative Subarray Summation
Testing all pairs $(i, j)$ requires calculating the sum of elements from $i$ to $j$. Computing this across all subarrays naively takes $O(n^3)$ time, or $O(n^2)$ time with a running sum. When $n = 20,000$, quadratic time fails. Furthermore, a two-pointer sliding window cannot be used because negative values invalidate the monotonicity property: expanding a window might decrease its sum, while shrinking might increase it.

#### Optimal Approach: Prefix Sum Hash Map
Imagine tracking your cumulative running elevation as you hike along a trail:

$$\text{curr\_sum} = \sum_{m=0}^{i} \text{nums}[m]$$

If the current cumulative sum is $\text{curr\_sum}$, any preceding prefix at index $j < i$ with cumulative sum:

$$\text{target\_prefix} = \text{curr\_sum} - k$$

identifies a valid contiguous subarray between index $j + 1$ and $i$ whose elements sum exactly to $k$:

$$\text{curr\_sum} - (\text{curr\_sum} - k) = k$$

By keeping a hash map `prefix_counts` recording the frequency of each observed prefix sum, we query how many times $\text{curr\_sum} - k$ has appeared in $O(1)$ time and accumulate those frequencies. We initialize `prefix_counts = {0: 1}` to account for subarrays starting directly at index 0.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 1, 2, 1]` with `k = 3`:

| Step | Element | `curr_sum` | Target (`curr_sum - k`) | Count Found | `total` | `prefix_counts` State |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `1` | `1` | $1 - 3 = -2$ | `0` | `0` | `{0: 1, 1: 1}` |
| **2** | `2` | `3` | $3 - 3 = 0$ | `1` (base `0`) | `1` | `{0: 1, 1: 1, 3: 1}` |
| **3** | `1` | `4` | $4 - 3 = 1$ | `1` (prefix `1`) | `2` | `{0: 1, 1: 1, 3: 1, 4: 1}` |
| **4** | `2` | `6` | $6 - 3 = 3$ | `1` (prefix `3`) | `3` | `{0: 1, 1: 1, 3: 1, 4: 1, 6: 1}` |
| **5** | `1` | `7` | $7 - 3 = 4$ | `1` (prefix `4`) | `4` | `{0: 1, 1: 1, 3: 1, 4: 1, 6: 1, 7: 1}` |

---

### Step-by-Step Algorithm

1. **Initialize State:** Set `total_subarrays = 0`, `curr_sum = 0`, and instantiate `prefix_counts = {0: 1}` representing one occurrence of an empty prefix sum of 0.
2. **Iterate Through Array:** For each `num` in `nums`:
   - Add `num` to `curr_sum`.
   - Check if `(curr_sum - k)` exists in `prefix_counts`. If present, add its count to `total_subarrays`.
   - Record the current prefix sum: increment `prefix_counts[curr_sum]` by 1.
3. **Return Total:** Return `total_subarrays`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Prefix Sum Hash Map" default>

```python
from collections import defaultdict

class Solution:
    def subarraySum(self, nums: list[int], k: int) -> int:
        total_subarrays = 0
        curr_sum = 0
        
        # Maps prefix_sum -> frequency of occurrence
        prefix_counts: dict[int, int] = defaultdict(int)
        prefix_counts[0] = 1  # Base case for subarrays starting at index 0
        
        for num in nums:
            curr_sum += num
            
            # If (curr_sum - k) exists, add its occurrences to total
            if (curr_sum - k) in prefix_counts:
                total_subarrays += prefix_counts[curr_sum - k]
                
            # Record the current prefix sum
            prefix_counts[curr_sum] += 1
            
        return total_subarrays
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Cumulative Brute Force">

```python
class Solution:
    def subarraySum(self, nums: list[int], k: int) -> int:
        count = 0
        n = len(nums)
        
        for start in range(n):
            curr_sum = 0
            for end in range(start, n):
                curr_sum += nums[end]
                if curr_sum == k:
                    count += 1
                    
        return count
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Cumulative Brute Force** | $O(n^2)$ | $O(1)$ | Tests every contiguous subarray starting point. Avoids extra storage, but quadratic runtime causes time limit exceeded on large inputs. |
| **Prefix Sum Hash Map** | $O(n)$ | $O(n)$ | Computes prefix totals and queries complementary differences in $O(1)$ average time. Optimal linear runtime. |

---

### Common Pitfall: Missing the Base Case `{0: 1}`

Forgetting to initialize `prefix_counts[0] = 1` causes the algorithm to miss any valid subarray that begins at index 0. For example, in `nums = [3]` with `k = 3`, `curr_sum` becomes 3, and `curr_sum - k = 0`. Without `{0: 1}` already in the map, the initial valid prefix would be overlooked, returning 0 instead of 1.

---

### Concise Interview Takeaway

For **Subarray Sum Equals K**, use a prefix sum hash map. Two pointers and sliding windows fail because negative numbers break monotonicity. Maintain a running sum and query the count of `curr_sum - k` at each index in $O(1)$ average time. Pre-populate `{0: 1}` to capture valid subarrays that originate at index 0.
