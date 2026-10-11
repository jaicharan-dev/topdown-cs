---
id: 5-jump-game-ii
title: "45. Jump Game II"
description: "Find minimum jumps to reach the end using greedy BFS level-window expansion"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Implicit BFS / Window Expansion</span>

> **Problem Statement:** Given a 0-indexed integer array `nums` of length `n` where each element represents your maximum jump distance from that position, return the minimum number of jumps required to reach the last index (`nums[n - 1]`). You can assume that reaching the last index is always possible.

```text
Input:  nums = [2, 3, 1, 1, 4]
Output: 2
Explanation: Jump 1 step from index 0 to 1, then 3 steps to the last index. The minimum number of jumps is 2.
```

---

### The Intuitive Mental Model

While Jump Game I asks whether reaching the end is possible, Jump Game II asks for the minimum number of jumps needed to get there.

#### Brute Force: Dynamic Programming

A standard dynamic programming approach defines `dp[i]` as the minimum jumps required to reach index `i`. For each index `i`, we examine all previous indices `j < i` capable of jumping to `i`, taking $\min(dp[j] + 1)$. Because every index may need to check all preceding indices, this leads to an $O(n^2)$ time complexity and requires an $O(n)$ memoization array.

#### Optimal Approach: Implicit BFS Window Expansion

Rather than checking every pair of indices, view the process as a level-by-level Breadth-First Search (BFS) on a line:
1. **Current Level Window:** You start at index 0 with 0 jumps. The initial reachable window is `[0, 0]`.
2. **Expanding the Next Level Window:** As you sweep through the current window, observe the maximum index any element in this window can reach:
   $$\text{farthest} = \max(\text{farthest}, i + \text{nums}[i])$$
3. **Taking a Jump:** When the loop index `i` reaches `current_end` (the boundary of the current level), you must expend one jump (`jumps += 1`). The new level boundary becomes `current_end = farthest`.

This greedily discovers the furthest reach achievable in $k$ jumps before incrementing to jump $k + 1$.

#### Execution Walkthrough

Let us trace `nums = [2, 3, 1, 1, 4]`:

| Index ($i$) | `nums[i]` | Reach from $i$ ($i + \text{nums}[i]$) | `farthest` | `current_end` | Reached Boundary? (`i == current_end`) | `jumps` | Action / New Boundary |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | 2 | $0 + 2 = 2$ | 2 | 0 | Yes | 1 | Expand window: `current_end = 2` |
| **1** | 3 | $1 + 3 = 4$ | 4 | 2 | No | 1 | Update `farthest = 4` |
| **2** | 1 | $2 + 1 = 3$ | 4 | 2 | Yes | 2 | Boundary reached: `current_end = 4` (Destination covered!) |

The loop terminates because `current_end >= len(nums) - 1`. The minimum number of jumps is 2.

---

### Step-by-Step Algorithm

1. **State Tracking:**
   - `jumps = 0`: Count of jumps taken.
   - `current_end = 0`: The right boundary of the current jump window.
   - `farthest = 0`: The furthest index discoverable from any position in the current window.
2. **Linear Scan:**
   - Iterate with index `i` from 0 up to `len(nums) - 2` (we stop before the last index because once we reach `len(nums) - 1`, no additional jump from that point is required).
   - Update `farthest = max(farthest, i + nums[i])`.
   - If `i == current_end`:
     - Increment `jumps += 1`.
     - Update `current_end = farthest`.
     - If `current_end >= len(nums) - 1`, break early since the destination is already reachable.
3. **Return:** Return `jumps`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Implicit BFS Window" default>

```python
class Solution:
    def jump(self, nums: list[int]) -> int:
        jumps = 0
        current_end = 0
        farthest = 0

        # Loop up to len(nums) - 1 because we never jump from the destination
        for i in range(len(nums) - 1):
            farthest = max(farthest, i + nums[i])

            # When reaching the boundary of the current jump window
            if i == current_end:
                jumps += 1
                current_end = farthest

                # Early break if current window envelopes the destination
                if current_end >= len(nums) - 1:
                    break

        return jumps
```

  </TabItem>
  <TabItem value="dp" label="Alternative: Dynamic Programming">

```python
class Solution:
    def jump(self, nums: list[int]) -> int:
        n = len(nums)
        dp = [float('inf')] * n
        dp[0] = 0

        for i in range(n):
            for step in range(1, nums[i] + 1):
                if i + step < n:
                    dp[i + step] = min(dp[i + step], dp[i] + 1)

        return int(dp[-1])
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Dynamic Programming** | $O(n^2)$ | $O(n)$ | Computes minimum jumps to each index via nested loops. Quadratic time is slow for large arrays. |
| **Implicit BFS Window** | $O(n)$ | $O(1)$ | Sweeps once while expanding jump boundaries greedily. Achieves linear time and constant auxiliary memory. |

---

### Common Pitfall: Looping Over the Final Index

A frequent off-by-one bug is running the loop through `len(nums) - 1`. If `i` reaches `len(nums) - 1` and matches `current_end`, the code will trigger an unintended additional jump increment.

Stopping the loop at `len(nums) - 2` guarantees that when you arrive at the final index, you record no further jumps.

---

### Concise Interview Takeaway

For Jump Game II, model the jump sequence as an implicit BFS. Maintain `current_end` and `farthest`, iterating up to `len(nums) - 2`. At each index, update `farthest = max(farthest, i + nums[i])`, and whenever `i == current_end`, increment `jumps` and update `current_end = farthest`. This greedy frontier expansion runs in optimal $O(n)$ time and $O(1)$ auxiliary space.
