---
id: 9-trapping-rain-water
title: "42. Trapping Rain Water"
description: "Converging two pointers with dynamic boundary bottleneck tracking"
sidebar_position: 9
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Bottleneck</span>

> **Problem Statement:** Given $n$ non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

```text
Input:  height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
Output: 6
Explanation: The elevation map is represented by array [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]. In this case, 6 units of rain water are trapped.
```

---

### The Intuitive Mental Model

Calculating the total water volume across the entire elevation profile at once is difficult. Instead, decompose the problem column by column:

$$\text{Water}[i] = \max(0, \min(\text{left\_max}[i], \text{right\_max}[i]) - height[i])$$

Water trapped directly above bar $i$ is constrained by the shorter of its two highest surrounding walls: the tallest bar to its left and the tallest bar to its right.

#### Brute Force: Precomputed Prefix and Suffix Arrays
A direct implementation precomputes maximum boundaries across two passes:
- Build `left_max` where `left_max[i] = max(left_max[i - 1], height[i])`.
- Build `right_max` where `right_max[i] = max(right_max[i + 1], height[i])`.
- In a third pass, sum `min(left_max[i], right_max[i]) - height[i]` for every bar.

While this achieves linear $O(n)$ time, storing the prefix and suffix arrays requires $O(n)$ auxiliary memory.

#### Optimal Approach: Converging Two Pointers
Notice that to determine the trapped water above a bar, you do not need the exact height of both boundaries: you only need the height of the **shorter boundary** (the limiting bottleneck).

We initialize pointers at opposite ends (`left = 0`, `right = len(height) - 1`) along with running boundary values `left_max = height[left]` and `right_max = height[right]`:
- **If `left_max < right_max`:** The bottleneck for `left` is definitively `left_max`. Because a wall of height at least `right_max > left_max` already exists on the right, the water level at `left` cannot rise above `left_max`. We advance `left += 1`, update `left_max`, and add `left_max - height[left]` directly to our answer.
- **If `right_max <= left_max`:** The bottleneck for `right` is definitively `right_max`. We decrement `right -= 1`, update `right_max`, and add `right_max - height[right]`.

Both pointers converge toward the highest peak, processing every bar in a single pass without any extra array allocations.

#### Execution Walkthrough

Let us trace `height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]`:

| Step | `left` | `right` | `left_max` | `right_max` | Bottleneck Side | Action & Water Added | Total Water |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **Start** | `0` | `11` | `0` | `1` | Left (`0 < 1`) | Advance `left -> 1` | `0` |
| **1** | `1` | `11` | `1` | `1` | Right (`1 <= 1`) | `right -> 10`, `right_max = 2`, add $2 - 2 = 0$ | `0` |
| **2** | `1` | `10` | `1` | `2` | Left (`1 < 2`) | `left -> 2`, `left_max = 1`, add $1 - 0 = 1$ | `1` |
| **3** | `2` | `10` | `1` | `2` | Left (`1 < 2`) | `left -> 3`, `left_max = 2`, add $2 - 2 = 0$ | `1` |
| **4** | `3` | `10` | `2` | `2` | Right (`2 <= 2`) | `right -> 9`, `right_max = 2`, add $2 - 1 = 1$ | `2` |
| **5** | `3` | `9` | `2` | `2` | Right (`2 <= 2`) | `right -> 8`, `right_max = 2`, add $2 - 2 = 0$ | `2` |
| **6** | `3` | `8` | `2` | `2` | Right (`2 <= 2`) | `right -> 7`, `right_max = 3`, add $3 - 3 = 0$ | `2` |
| **7** | `3` | `7` | `2` | `3` | Left (`2 < 3`) | `left -> 4`, `left_max = 2`, add $2 - 1 = 1$ | `3` |
| **8** | `4` | `7` | `2` | `3` | Left (`2 < 3`) | `left -> 5`, `left_max = 2`, add $2 - 0 = 2$ | `5` |
| **9** | `5` | `7` | `2` | `3` | Left (`2 < 3`) | `left -> 6`, `left_max = 2`, add $2 - 1 = 1$ | `6` |
| **10** | `6` | `7` | `2` | `3` | Left (`2 < 3`) | `left -> 7`, `left_max = 3`, add $3 - 3 = 0$ | `6` |
| **End** | `7` | `7` | `3` | `3` | Converged | `left == right`, terminate loop | **6** |

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `height` is empty, return `0`.
2. **Initialize Pointers and State:**
   - Set `left = 0`, `right = len(height) - 1`.
   - Set `left_max = height[left]`, `right_max = height[right]`.
   - Set `total_water = 0`.
3. **Loop While `left < right`:**
   - If `left_max < right_max`:
     - Increment `left += 1`.
     - Update `left_max = max(left_max, height[left])`.
     - Add `left_max - height[left]` to `total_water`.
   - Otherwise:
     - Decrement `right -= 1`.
     - Update `right_max = max(right_max, height[right])`.
     - Add `right_max - height[right]` to `total_water`.
4. **Return Result:** Return `total_water`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Converging Two Pointers" default>

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        if not height:
            return 0

        left = 0
        right = len(height) - 1
        left_max = height[left]
        right_max = height[right]
        total_water = 0

        while left < right:
            # The smaller boundary dictates the water level
            if left_max < right_max:
                left += 1
                left_max = max(left_max, height[left])
                total_water += left_max - height[left]
            else:
                right -= 1
                right_max = max(right_max, height[right])
                total_water += right_max - height[right]

        return total_water
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Dynamic Programming Prefix/Suffix Arrays">

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        if not height:
            return 0

        n = len(height)
        left_max = [0] * n
        right_max = [0] * n

        # Populate left prefix maximums
        left_max[0] = height[0]
        for i in range(1, n):
            left_max[i] = max(left_max[i - 1], height[i])

        # Populate right suffix maximums
        right_max[n - 1] = height[n - 1]
        for i in range(n - 2, -1, -1):
            right_max[i] = max(right_max[i + 1], height[i])

        # Calculate trapped water above each bar
        total_water = 0
        for i in range(n):
            total_water += min(left_max[i], right_max[i]) - height[i]

        return total_water
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Prefix / Suffix Arrays** | $O(n)$ | $O(n)$ | Precomputes boundary maximums in two separate arrays before computing volume in a final pass. |
| **Converging Two Pointers** | $O(n)$ | $O(1)$ | Tracks dynamic running maximums from both ends simultaneously in a single pass with constant extra memory. |

---

### Common Pitfall: Misunderstanding the Limiting Boundary Guarantee

A common source of doubt is whether `left_max < right_max` truly guarantees that no taller wall exists between `left` and `right`. In reality, what lies in between does not matter: because `right_max` is already greater than `left_max`, we already have proof that a right wall exists that is at least as tall as `left_max`. Any even taller interior peak would only increase the right bound further, leaving `left_max` as the true limiting ceiling. Thus, `left_max - height[left]` is guaranteed to be correct.

---

### Concise Interview Takeaway

For **Trapping Rain Water**, calculate water trapped column by column using $\min(\text{left\_max}, \text{right\_max}) - height[i]$. Rather than storing $O(n)$ prefix and suffix arrays, converge two pointers from the ends and advance the side with the smaller maximum. Because the smaller maximum acts as the true bottleneck, its water volume can be calculated immediately, giving an optimal $O(n)$ time and $O(1)$ auxiliary space solution.
