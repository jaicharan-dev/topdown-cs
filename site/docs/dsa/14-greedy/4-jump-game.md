---
id: 4-jump-game
title: "55. Jump Game"
description: "Determine reachability using backwards goalpost shifting or forward max-reach tracking"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Goalpost Shifting / Farthest Reach</span>

> **Problem Statement:** Given an integer array `nums` where each element represents the maximum jump distance allowed from that position, return `True` if you can reach the last index starting from index 0, or `False` otherwise.

```text
Input:  nums = [2, 3, 1, 1, 4]
Output: true
Explanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.
```

---

### The Intuitive Mental Model

At each position in `nums`, you can jump any distance up to `nums[i]`. A brute-force approach simulates all possible jump paths, branching exponentially at every intermediate stop.

#### Brute Force: Recursive Jump Tree

Starting from index 0, you could recursively test all jump lengths $1 \le k \le \text{nums}[i]$. Because each step branches into multiple potential target indices, exhaustive search incurs $O(2^n)$ worst-case time complexity, or $O(n^2)$ when memoized with dynamic programming.

#### Optimal Approach: Moving the Goalpost Backwards

Instead of guessing which forward jump to select from the start, we can stand at the finish line and reason backwards.

If the target is the final index $n - 1$ and a preceding index $i$ satisfies $i + \text{nums}[i] \ge \text{goal}$, then arriving at index $i$ guarantees reaching the finish line. Therefore, reaching index $i$ becomes our new sufficient objective.

We greedily shift the goalpost leftward: `goal = i`. If continuing this backwards scan allows the goalpost to collapse all the way back to index 0, then index 0 can reach the final index.

Alternatively, a forward greedy pass tracks the farthest reachable boundary `max_reach`. If the current index ever exceeds `max_reach`, progression is blocked.

#### Execution Walkthrough

Let us trace `nums = [2, 3, 1, 1, 4]` using the backwards goalpost approach:

| Step | Index ($i$) | Jump Value (`nums[i]`) | Max Reach from $i$ ($i + \text{nums}[i]$) | Current Goal | Condition Met? ($i + \text{nums}[i] \ge \text{goal}$) | Updated Goal |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial** | - | - | - | 4 | - | 4 |
| **1** | 3 | 1 | $3 + 1 = 4$ | 4 | Yes ($4 \ge 4$) | 3 |
| **2** | 2 | 1 | $2 + 1 = 3$ | 3 | Yes ($3 \ge 3$) | 2 |
| **3** | 1 | 3 | $1 + 3 = 4$ | 2 | Yes ($4 \ge 2$) | 1 |
| **4** | 0 | 2 | $0 + 2 = 2$ | 1 | Yes ($2 \ge 1$) | 0 |

Because the goalpost successfully collapsed to index 0, the last index is reachable.

---

### Step-by-Step Algorithm

1. **Initialize Goalpost:** Set `goal = len(nums) - 1`, the final target index.
2. **Backwards Pass:** Loop backwards with index `i` from `len(nums) - 2` down to 0:
   - Check if the jump from `i` can reach or overshoot `goal`: `i + nums[i] >= goal`.
   - If true, greedily shift the goalpost: `goal = i`.
3. **Validate Reachability:** After completing the traversal, check if `goal == 0`:
   - If `goal == 0`, return `True`.
   - If `goal > 0`, return `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Backwards Goalpost" default>

```python
class Solution:
    def canJump(self, nums: list[int]) -> bool:
        # Initialize goalpost at the destination index
        goal = len(nums) - 1

        # Walk backwards from the second-to-last index down to index 0
        for i in range(len(nums) - 2, -1, -1):
            # If current index can reach or surpass the current goal
            if i + nums[i] >= goal:
                goal = i  # Greedily move the goalpost to current index

        # If the goalpost successfully reached index 0, the destination is reachable
        return goal == 0
```

  </TabItem>
  <TabItem value="forward" label="Alternative: Forward Max Reach">

```python
class Solution:
    def canJump(self, nums: list[int]) -> bool:
        max_reach = 0

        for i, jump in enumerate(nums):
            # If current index is beyond the farthest reachable boundary
            if i > max_reach:
                return False

            max_reach = max(max_reach, i + jump)

        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Forward Max Reach** | $O(n)$ | $O(1)$ | Sweeps left to right tracking maximum reachable boundary. Can exit early if trapped. |
| **Backwards Goalpost** | $O(n)$ | $O(1)$ | Sweeps right to left collapsing the target milestone. Minimal state with zero auxiliary memory. |

---

### Common Pitfall: Getting Trapped by Zeros

Zeros act as potential roadblocks. For instance, in `nums = [3, 2, 1, 0, 4]`, every jump prior to index 3 lands on the zero at index 3, which offers no further movement.

In the backwards goalpost approach, index 3 cannot reach 4 ($3 + 0 < 4$), index 2 cannot reach 4 ($2 + 1 < 4$), index 1 cannot reach 4 ($1 + 2 < 4$), and index 0 cannot reach 4 ($0 + 3 < 4$). The goalpost never shifts below 4, correctly concluding that the destination is unreachable without requiring manual zero-skipping logic.

---

### Concise Interview Takeaway

For Jump Game, invert the perspective by shifting the goalpost backwards. Starting from the last index, greedily update `goal = i` whenever `i + nums[i] >= goal`. If `goal` reaches 0 at the end of the pass, the finish line is reachable. This runs in optimal $O(n)$ time and $O(1)$ auxiliary space.
