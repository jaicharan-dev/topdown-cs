---
id: 8-container-with-most-water
title: "11. Container With Most Water"
description: "Two-pointer bottleneck elimination maximizing area in O(n)"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy Shrink</span>

> **Problem Statement:** Given an integer array `height` of length $n$, there are $n$ vertical lines drawn such that the two endpoints of the $i^{\text{th}}$ line are `(i, 0)` and `(i, height[i])`. Find two lines that, together with the x-axis, form a container that contains the most water. Return the maximum amount of water a container can store.

```text
Input:  height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
Output: 49
Explanation: The vertical lines are represented by array [1, 8, 6, 2, 5, 4, 8, 3, 7]. The max area is between index 1 (height 8) and index 8 (height 7), with width = 8 - 1 = 7 and height = min(8, 7) = 7, yielding area = 7 * 7 = 49.
```

---

### The Intuitive Mental Model

A container formed by two vertical walls at indices `left` and `right` holds an amount of water defined by the rectangle formula:

$$\text{Area} = (\text{right} - \text{left}) \times \min(height[\text{left}], height[\text{right}])$$

The width is the horizontal distance between the two lines, and the effective height is strictly bottlenecked by the shorter of the two walls.

#### Brute Force: Quadratic Pair Enumeration
The simplest approach tests every combination of pairs $(i, j)$ using two nested loops:
- For each pair, compute the area using the formula above.
- Track the maximum area encountered.

With $n$ up to $10^5$, evaluating $O(n^2)$ pairs causes a time-limit exceeded failure.

#### Optimal Approach: Two Pointers with Bottleneck Elimination
We begin with the widest possible container: `left = 0` and `right = len(height) - 1`.

Every time we move a pointer inward, the container width decreases by 1. To compensate for lost width and discover a larger area, the bottleneck height must increase:
- **If we move the taller wall:** The width shrinks, but the height is still bottlenecked by the shorter wall (or gets even smaller). The area is guaranteed to be smaller. Moving the taller wall is provably wasteful.
- **If we move the shorter wall:** We discard the limiting factor. Although width decreases, we may encounter a much taller wall that yields a greater overall area.

By continually advancing the pointer pointing to the shorter wall, we discard inferior containers while guaranteeing that no potentially superior container is missed.

#### Execution Walkthrough

Let us trace `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`:

| Step | `left` (Height) | `right` (Height) | Width | Limiting Height | Calculated Area | Max Area | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `0` (`1`) | `8` (`7`) | `8` | $\min(1, 7) = 1$ | $8 \times 1 = 8$ | `8` | Shorter wall at `left`; increment `left -> 1` |
| **2** | `1` (`8`) | `8` (`7`) | `7` | $\min(8, 7) = 7$ | $7 \times 7 = 49$ | `49` | Shorter wall at `right`; decrement `right -> 7` |
| **3** | `1` (`8`) | `7` (`3`) | `6` | $\min(8, 3) = 3$ | $6 \times 3 = 18$ | `49` | Shorter wall at `right`; decrement `right -> 6` |
| **4** | `1` (`8`) | `6` (`8`) | `5` | $\min(8, 8) = 8$ | $5 \times 8 = 40$ | `49` | Equal height; decrement `right -> 5` |
| **5** | `1` (`8`) | `5` (`4`) | `4` | $\min(8, 4) = 4$ | $4 \times 4 = 16$ | `49` | Shorter wall at `right`; decrement `right -> 4` |
| **6** | `1` (`8`) | `4` (`5`) | `3` | $\min(8, 5) = 5$ | $3 \times 5 = 15$ | `49` | Shorter wall at `right`; decrement `right -> 3` |
| **7** | `1` (`8`) | `3` (`2`) | `2` | $\min(8, 2) = 2$ | $2 \times 2 = 4$ | `49` | Shorter wall at `right`; decrement `right -> 2` |
| **8** | `1` (`8`) | `2` (`6`) | `1` | $\min(8, 6) = 6$ | $1 \times 6 = 6$ | `49` | Shorter wall at `right`; decrement `right -> 1` |
| **End** | `1` (`8`) | `1` (`8`) | `0` | - | - | **49** | Pointers meet; terminate loop |

---

### Step-by-Step Algorithm

1. **Initialize Pointers and State:** Set `left = 0`, `right = len(height) - 1`, and `max_water = 0`.
2. **Loop While Pointers Do Not Cross:** Continue while `left < right`:
   - Compute current width: `w = right - left`.
   - Compute limiting height: `h = min(height[left], height[right])`.
   - Update maximum volume: `max_water = max(max_water, w * h)`.
   - If `height[left] < height[right]`, increment `left += 1` to discard the shorter left wall.
   - Otherwise, decrement `right -= 1` to discard the shorter (or equal) right wall.
3. **Return Global Maximum:** Once pointers meet, return `max_water`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pointer Greedy Shrink" default>

```python
class Solution:
    def maxArea(self, height: list[int]) -> int:
        left = 0
        right = len(height) - 1
        max_water = 0

        while left < right:
            # Water level is strictly constrained by the shorter wall
            h = min(height[left], height[right])
            w = right - left
            max_water = max(max_water, w * h)

            # Greedily discard the limiting wall
            if height[left] < height[right]:
                left += 1
            else:
                right -= 1

        return max_water
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Nested Loops">

```python
class Solution:
    def maxArea(self, height: list[int]) -> int:
        n = len(height)
        max_water = 0

        for i in range(n):
            for j in range(i + 1, n):
                h = min(height[i], height[j])
                w = j - i
                max_water = max(max_water, w * h)

        return max_water
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Nested Loops** | $O(n^2)$ | $O(1)$ | Tests every possible pair of lines. Quadratic time causes timeout on large inputs. |
| **Two-Pointer Greedy Shrink** | $O(n)$ | $O(1)$ | Discards the limiting bottleneck at each step, converging inward in a single pass with constant extra memory. |

---

### Common Pitfall: Moving the Taller Boundary Pointer

Moving the pointer pointing to the taller wall is a common conceptual blunder. If `height[left] < height[right]`, moving `right` inward reduces width while keeping the ceiling height bounded by `height[left]`. No pairing of `left` with an interior wall can exceed the initial area formed with `right`. Always move the pointer corresponding to the shorter wall.

---

### Concise Interview Takeaway

For **Container With Most Water**, place two pointers at opposite ends to maximize width. Because width shrinks with every inward step, only moving the shorter wall can potentially increase area by finding a taller bottleneck. This greedy elimination solves the problem in $O(n)$ time and $O(1)$ auxiliary space.
