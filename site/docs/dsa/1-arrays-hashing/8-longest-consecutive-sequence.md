---
id: 8-longest-consecutive-sequence
title: "128. Longest Consecutive Sequence"
description: "Set lookups, start counting only at sequence starters"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Set</span>

> **Problem Statement:** Given an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in $O(n)$ time.

```text
Input:  nums = [100, 4, 200, 1, 3, 2]
Output: 4
Explanation: The longest consecutive elements sequence is [1, 2, 3, 4]. Its length is 4.
```

---

### The Intuitive Mental Model

Suppose you are given an unsorted array: `nums = [100, 4, 200, 1, 3, 2]`. The longest sequence of consecutive integers is `[1, 2, 3, 4]`, yielding a length of 4.

#### Brute Force: Sorting
Sorting the array yields `[1, 2, 3, 4, 100, 200]`, making consecutive counting simple via a single linear pass over adjacent elements. However, comparison-based sorting takes $O(n \log n)$ time, which violates the strict $O(n)$ time requirement.

#### Optimal Approach: Hash Set Sequence Starters
Instead of sorting, insert all numbers into a hash set for $O(1)$ average-time lookups.

To avoid redundant work and prevent quadratic behavior, we identify the exact **start** of a streak:
- A number `x` is the start of a sequence if and only if `x - 1` does **not** exist in the set.
- If `x - 1` is present, `x` is in the middle or end of an existing streak, so we skip it immediately.
- Once a true sequence starter `x` is found, expand forward (`x + 1`, `x + 2`, ...) until the sequence terminates, updating the maximum streak observed.

#### Execution Walkthrough

Let us trace `nums = [100, 4, 200, 1, 3, 2]` with `num_set` = `{1, 2, 3, 4, 100, 200}`:

| Step | Candidate `x` | Left Neighbor `x - 1` in Set? | Status | Sequence Formed | Streak Length |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `100` | `99 not in num_set` | Sequence starter | `[100]` | `1` |
| **2** | `4` | `3 in num_set` | Skip (interior element) | - | - |
| **3** | `200` | `199 not in num_set` | Sequence starter | `[200]` | `1` |
| **4** | `1` | `0 not in num_set` | Sequence starter | `[1, 2, 3, 4]` | `4` |
| **5** | `3` | `2 in num_set` | Skip (interior element) | - | - |
| **6** | `2` | `1 in num_set` | Skip (interior element) | - | - |

The maximum consecutive sequence length is 4.

---

### Step-by-Step Algorithm

1. **Handle Base Case:** If `nums` is empty, return `0`.
2. **Populate Hash Set:** Convert `nums` into a set `num_set` to achieve $O(1)$ membership checks. Initialize `longest_streak = 0`.
3. **Iterate Through Set:** For each `num` in `num_set`:
   - Check if `(num - 1)` is in `num_set`.
   - If absent, `num` is a streak root. Initialize `curr_num = num` and `curr_streak = 1`.
   - Advance `curr_num` and increment `curr_streak` in a `while` loop as long as `(curr_num + 1)` exists in `num_set`.
   - Update `longest_streak = max(longest_streak, curr_streak)`.
4. **Return Result:** Return `longest_streak`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Hash Set Sequence Starters" default>

```python
class Solution:
    def longestConsecutive(self, nums: list[int]) -> int:
        if not nums:
            return 0
            
        num_set: set[int] = set(nums)
        longest_streak = 0
        
        for num in num_set:
            # Only initiate streak counting from true sequence starters
            if (num - 1) not in num_set:
                curr_num = num
                curr_streak = 1
                
                while (curr_num + 1) in num_set:
                    curr_num += 1
                    curr_streak += 1
                    
                longest_streak = max(longest_streak, curr_streak)
                
        return longest_streak
```

  </TabItem>
  <TabItem value="sorting" label="Alternative: Sorting">

```python
class Solution:
    def longestConsecutive(self, nums: list[int]) -> int:
        if not nums:
            return 0
            
        nums.sort()
        longest_streak = 1
        curr_streak = 1
        
        for i in range(1, len(nums)):
            if nums[i] == nums[i - 1]:
                continue
            if nums[i] == nums[i - 1] + 1:
                curr_streak += 1
            else:
                longest_streak = max(longest_streak, curr_streak)
                curr_streak = 1
                
        return max(longest_streak, curr_streak)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Sorting** | $O(n \log n)$ | $O(1)$ or $O(n)$ | Sorts array and counts contiguous duplicate-free runs. Exceeds the required $O(n)$ time bound. |
| **Hash Set Sequence Starters** | $O(n)$ | $O(n)$ | Checks `num - 1` to only trace from sequence roots. Each number is visited at most twice, ensuring strict linear time. |

---

### Common Pitfall: Nested Loop Complexity Confusion

Although an inner `while` loop sits inside an outer `for` loop, the algorithm runs in $O(n)$ time, not $O(n^2)$. Because the `while` loop executes only when `(num - 1) not in num_set`, interior sequence elements are skipped in $O(1)$ time. Across the entire execution, each element is evaluated once in the outer loop and traversed at most once in the inner loop, bounded by $2n$ total operations.

---

### Concise Interview Takeaway

For **Longest Consecutive Sequence**, load elements into a hash set for $O(1)$ membership checks. To guarantee $O(n)$ linear complexity, only trigger forward sequence expansions from values where `num - 1` is absent. This isolates streak roots and guarantees each element is processed at most twice.
