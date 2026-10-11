---
id: 8-koko-eating-bananas
title: "875. Koko Eating Bananas"
description: "Binary search on the answer space with monotonic feasibility checking"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Answer Space</span>

> **Problem Statement:** Koko loves to eat bananas. There are `n` piles of bananas, where the $i$-th pile has `piles[i]` bananas. The guards will return in `h` hours. Koko can decide her hourly eating speed `k`. Each hour, she chooses a pile and eats `k` bananas from it; if the pile has fewer than `k` bananas, she eats all of them and will not eat any more bananas during that hour. Return the minimum integer `k` such that she can eat all the bananas within `h` hours.

```text
Input:  piles = [3, 6, 7, 11], h = 8
Output: 4
Explanation: At speed k = 4, Koko finishes the piles in 1 + 2 + 2 + 3 = 8 hours. At speed k = 3, she takes 10 hours, which exceeds h.
```

---

### The Intuitive Mental Model

Most binary search problems seek a specific value inside a pre-sorted array. Here, the input array `piles` is unsorted, but the answer space itself (the eating rate $k$) is sorted and monotonic.

#### Brute Force: Linear Scan Across Speeds
Test candidate speeds starting from $k = 1$ upward sequentially: $1, 2, 3, \dots, \max(\text{piles})$. For each speed, compute the total hours taken across all $n$ piles. If the largest pile contains $M = 10^9$ bananas, linear search takes $O(n \cdot M)$ operations, triggering a Time Limit Exceeded error.

#### Optimal Approach: Binary Search on Feasibility
Eating speed exhibits a monotonic property: if speed $k$ is fast enough to finish within $h$ hours, any speed greater than $k$ will also finish on time. Conversely, if speed $k$ is too slow, any speed less than $k$ is guaranteed to fail.

This monotonic transition allows binary searching across the candidate speeds $[1, \max(\text{piles})]$:
- If speed `mid` enables Koko to finish within $h$ hours, it is a valid speed: attempt to find an even slower valid rate by searching left (`high = mid - 1`).
- If speed `mid` requires more than $h$ hours, it is too slow: speed up by searching right (`low = mid + 1`).

#### Execution Walkthrough

Let us trace `piles = [3, 6, 7, 11]` with `h = 8`:

| Step | `low` | `high` | `mid` (Speed) | Hours per Pile | Total Hours | Feasible? ($\le 8$) | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `1` | `11` | `6` | `[1, 1, 2, 2]` | 6 | Yes | Try slower speed: `high = mid - 1` | `[1, 5]` |
| **2** | `1` | `5` | `3` | `[1, 2, 3, 4]` | 10 | No | Speed up: `low = mid + 1` | `[4, 5]` |
| **3** | `4` | `5` | `4` | `[1, 2, 2, 3]` | 8 | Yes | Try slower speed: `high = mid - 1` | `[4, 3]` |

When `low > high`, the loop terminates. The algorithm returns `low = 4`, the minimum valid eating speed.

---

### Step-by-Step Algorithm

1. **Establish Answer Space:** Set `low = 1` (minimum conceivable eating rate) and `high = max(piles)` (maximum needed rate).
2. **Execute Binary Search on Feasibility:** While `low <= high`:
   - Compute midpoint speed: `mid = low + (high - low) // 2`.
   - Calculate total hours required across all piles:
     $$\text{hours} = \sum_{p \in \text{piles}} \lceil \frac{p}{\text{mid}} \rceil = \sum_{p \in \text{piles}} \frac{p + \text{mid} - 1}{\text{mid}}$$
   - If `hours <= h`:
     - Speed `mid` is sufficient: record feasibility and try slower rates with `high = mid - 1`.
   - Else:
     - Speed `mid` is too slow: force higher rates with `low = mid + 1`.
3. **Return Minimal Speed:** Return `low`, which converges precisely to the smallest valid speed.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Binary Search on Speed" default>

```python
import math

class Solution:
    def minEatingSpeed(self, piles: list[int], h: int) -> int:
        # Minimum possible speed is 1; maximum needed speed is max(piles)
        low, high = 1, max(piles)

        while low <= high:
            speed = low + (high - low) // 2

            # Calculate total hours needed at this eating speed
            total_hours = 0
            for pile in piles:
                total_hours += math.ceil(pile / speed)

            if total_hours <= h:
                # Eating at 'speed' finishes on time; test if a slower speed works
                high = speed - 1
            else:
                # Too slow to finish within h hours; must increase speed
                low = speed + 1

        # 'low' terminates at the minimal speed satisfying the condition
        return low
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Linear Scan Across Speeds">

```python
import math

class Solution:
    def minEatingSpeed(self, piles: list[int], h: int) -> int:
        speed = 1
        max_speed = max(piles)

        while speed <= max_speed:
            total_hours = sum(math.ceil(p / speed) for p in piles)
            if total_hours <= h:
                return speed
            speed += 1

        return max_speed
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Speed Scan** | $O(n \cdot M)$ | $O(1)$ | Tests each integer speed incrementally up to $M = \max(\text{piles})$. Inefficient when piles are large. |
| **Binary Search on Speed** | $O(n \log M)$ | $O(1)$ | Binary searches the monotonic answer range $[1, M]$. Evaluates feasibility in $O(n)$ per iteration. |

---

### Common Pitfall: Setting Upper Bound to Array Sum

Setting `high = sum(piles)` instead of `high = max(piles)` is an unnecessary inflation of the search space. Because Koko can eat from at most one pile per hour, eating faster than `max(piles)` can never save additional hours. Using `max(piles)` bounds the search strictly and cleanly. Furthermore, using floor division instead of ceiling division undercounts hours on partially eaten piles.

---

### Concise Interview Takeaway

When the problem asks for the minimum or maximum rate and feasibility is monotonic, binary search the answer space $[1, \max(\text{piles})]$. Test each speed in $O(n)$ time using ceiling division. This yields an optimal $O(n \log(\max(\text{piles})))$ solution with $O(1)$ space.
