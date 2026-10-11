---
id: 10-largest-rectangle-in-histogram
title: "84. Largest Rectangle in Histogram"
description: "Monotonic increasing stack tracking left and right boundaries"
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Stack</span>

> **Problem Statement:** Given an array of integers `heights` representing the heights of adjacent bars in a histogram where each bar has width `1`, return the area of the largest rectangle that can be formed within the histogram.

```text
Input:  heights = [2, 1, 5, 6, 2, 3]
Output: 10
Explanation: The largest rectangle is formed by heights [5, 6] with height 5 and width 2, giving an area of 5 * 2 = 10 units.
```

---

### The Intuitive Mental Model

Instead of trying to guess both rectangle widths and heights simultaneously, reframe the problem around bottlenecks: **What is the largest rectangle where bar $i$ serves as the minimum height?**

If bar $i$ has height $h$:
- That rectangle can extend to the left until encountering a bar strictly shorter than $h$.
- It can extend to the right until encountering a bar strictly shorter than $h$.
- The area using bar $i$ as the bottleneck height is:

$$\text{Area} = h \times (\text{right\_boundary} - \text{left\_boundary} - 1)$$

To test every bar as a candidate bottleneck, we must identify the first smaller bar to the left and the first smaller bar to the right.

#### Brute Force: Expand Outward per Bar
For every bar $i$, treat `heights[i]` as the minimum height and expand two pointers outwards: walk left while heights are $\ge heights[i]$, and walk right while heights are $\ge heights[i]$. Multiply the height by the total width spanned. With $n$ bars and up to $O(n)$ scanning time per bar, this requires $O(n^2)$ quadratic time, which times out on large inputs.

#### Optimal Approach: Monotonic Increasing Stack
A monotonic increasing stack of bar indices discovers both boundaries for every bar in amortized constant time:
- Maintain indices in strictly increasing order of height.
- When an arriving bar at index $i$ is strictly shorter than the bar at the top of the stack, the taller bar cannot extend any further to the right. The incoming index $i$ is precisely its right boundary.
- We pop the taller bar `popped_idx` and record its height `h = heights[popped_idx]`.
- Its left boundary is the index now at the top of the stack (`stack[-1]`), because all bars between `stack[-1]` and `popped_idx` were taller than `h` and have already been processed.
- The width is given by $i - \text{stack}[-1] - 1$.
- Appending a dummy height `0` to the end forces all remaining bars off the stack at completion, removing the need for a separate post-processing cleanup pass.

#### Execution Walkthrough

Let us trace `heights = [2, 1, 5, 6, 2, 3]` with a trailing `0` appended (`[2, 1, 5, 6, 2, 3, 0]`):

| Step `i` | Height | Action Taken | Stack (Indices) | Popped Bar (`h`, `w`) | Computed Area | Max Area |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| **0** | `2` | `2 > stack[-1]` sentinel: push `0` | `[-1, 0]` | - | - | `0` |
| **1** | `1` | `1 < heights[0]`: pop `0`, push `1` | `[-1, 1]` | `h=2, w=1-(-1)-1=1` | $2 \times 1 = 2$ | `2` |
| **2** | `5` | `5 > heights[1]`: push `2` | `[-1, 1, 2]` | - | - | `2` |
| **3** | `6` | `6 > heights[2]`: push `3` | `[-1, 1, 2, 3]` | - | - | `2` |
| **4** | `2` | `2 < heights[3]`: pop `3`<br/>`2 < heights[2]`: pop `2`<br/>`2 >= heights[1]`: push `4` | `[-1, 1, 4]` | `h=6, w=4-2-1=1`<br/>`h=5, w=4-1-1=2` | $6 \times 1 = 6$<br/>$5 \times 2 = 10$ | `10` |
| **5** | `3` | `3 > heights[4]`: push `5` | `[-1, 1, 4, 5]` | - | - | `10` |
| **6** | `0` | `0` flushes stack: pop `5`, pop `4`, pop `1` | `[-1]` | `h=3, w=6-4-1=1`<br/>`h=2, w=6-1-1=4`<br/>`h=1, w=6-(-1)-1=6` | $3 \times 1 = 3$<br/>$2 \times 4 = 8$<br/>$1 \times 6 = 6$ | `10` |

Final maximum area returned: `10`.

---

### Step-by-Step Algorithm

1. **Initialize Sentinels:** Append a dummy height `0` to `heights` to create `extended_heights`. Initialize `stack = [-1]` to serve as an imaginary left boundary before index `0`, and set `max_area = 0`.
2. **Iterate Bars:** Loop through index `i` and height `h` across `enumerate(extended_heights)`:
   - While `stack[-1] != -1` and `extended_heights[stack[-1]] > h`:
     - Pop `popped_idx = stack.pop()`.
     - Read the bar height: `current_height = extended_heights[popped_idx]`.
     - Compute the width: `width = i - stack[-1] - 1`.
     - Update `max_area = max(max_area, current_height * width)`.
   - Push `i` onto `stack`.
3. **Return Maximum Area:** Return `max_area`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Monotonic Increasing Stack" default>

```python
class Solution:
    def largestRectangleArea(self, heights: list[int]) -> int:
        # Append 0 to flush all remaining bars out of the stack at completion
        extended_heights = heights + [0]
        # -1 serves as the left-boundary sentinel before index 0
        stack: list[int] = [-1]
        max_area = 0

        for i, h in enumerate(extended_heights):
            # When the current bar is shorter than the top of the stack,
            # the top bar cannot extend further right.
            while stack[-1] != -1 and extended_heights[stack[-1]] > h:
                popped_idx = stack.pop()
                current_height = extended_heights[popped_idx]
                # Right boundary is i; Left boundary is stack[-1]
                current_width = i - stack[-1] - 1
                max_area = max(max_area, current_height * current_width)

            stack.append(i)

        return max_area
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Expand Around Center">

```python
class Solution:
    def largestRectangleArea(self, heights: list[int]) -> int:
        n = len(heights)
        max_area = 0

        for i in range(n):
            h = heights[i]
            # Expand left
            left = i
            while left >= 0 and heights[left] >= h:
                left -= 1
            # Expand right
            right = i
            while right < n and heights[right] >= h:
                right += 1
            # Width between strictly shorter boundaries
            width = right - left - 1
            max_area = max(max_area, h * width)

        return max_area
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Expand Around Center)** | $O(n^2)$ | $O(1)$ extra space | Expands outward from each bar to find boundaries. Quadratic time makes it unsuitable for large inputs. |
| **Optimal (Monotonic Increasing Stack)** | $O(n)$ | $O(n)$ | Every bar index is pushed and popped at most once. Finds both left and right boundaries in amortized $O(1)$ time per bar. |

---

### Common Pitfall: Unflushed Stack Elements and Width Calculation

Two tricky bugs commonly occur:
1. **Unflushed elements:** For strictly increasing histograms (such as `[1, 2, 3, 4]`), an incoming bar is never strictly shorter than the stack top, leaving bars unflushed on the stack. Appending a trailing `0` height sentinel guarantees that every element is flushed and evaluated.
2. **Incorrect width computation:** Using `i - popped_idx` instead of `i - stack[-1] - 1` produces an incorrect width. The left boundary is defined by the first shorter bar remaining on the stack, not the popped bar itself, because bars that were taller and popped earlier also span across the current height.

---

### Concise Interview Takeaway

Reframe histogram problems around bottleneck heights: for every bar, find its first shorter boundary to the left and to the right. A monotonic increasing stack discovers both boundaries simultaneously when a shorter bar arrives. Appending a trailing zero sentinel flushes all elements cleanly, achieving optimal $O(n)$ time and $O(n)$ space.
