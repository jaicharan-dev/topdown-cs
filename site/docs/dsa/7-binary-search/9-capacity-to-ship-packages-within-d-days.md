---
id: 9-capacity-to-ship-packages-within-d-days
title: "1011. Capacity To Ship Packages Within D Days"
description: "Binary search on conveyor ship capacity with greedy day simulation"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Answer Space</span>

> **Problem Statement:** A conveyor belt carries packages that must be shipped from one port to another within `days` days. The $i$-th package has weight `weights[i]`. Packages must be loaded in the order given, and each ship cannot exceed a maximum weight capacity. Return the minimum ship capacity required to ship all packages within `days` days.

```text
Input:  weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days = 5
Output: 15
Explanation: A ship capacity of 15 allows packages to be shipped in 5 days as:
- Day 1: 1, 2, 3, 4, 5 (total weight 15)
- Day 2: 6, 7 (total weight 13)
- Day 3: 8 (total weight 8)
- Day 4: 9 (total weight 9)
- Day 5: 10 (total weight 10)
```

---

### The Intuitive Mental Model

Because the packages must be shipped in strict sequential order without rearranging, we do not binary search the input array. Instead, we binary search the continuous answer space of possible ship capacities.

#### Brute Force: Linear Capacity Scan
Begin testing candidate capacities sequentially starting from $\max(\text{weights})$ up to $\sum \text{weights}$. For each capacity, simulate packing packages greedily to check if the schedule finishes within `days`. When package weights are large, checking every integer capacity takes $O(n \cdot (\sum \text{weights} - \max(\text{weights})))$ operations, triggering a Time Limit Exceeded error.

#### Optimal Approach: Binary Search on Monotonic Capacity
Feasibility is monotonic:
- If a ship capacity can deliver all cargo within `days`, any larger capacity can also do so.
- If a ship capacity takes more than `days`, any smaller capacity will require even more days.

We establish sharp lower and upper bounds:
- **Lower bound (`low = max(weights)`):** The ship must at least carry the heaviest individual package, otherwise that package can never be loaded.
- **Upper bound (`high = sum(weights)`):** A ship capable of carrying all packages at once completes delivery in 1 day.

For each candidate capacity `mid`, a greedy linear pass verifies whether `mid` allows shipment within `days`. If feasible, we search for a smaller capacity (`high = mid - 1`); otherwise, we increase capacity (`low = mid + 1`).

#### Execution Walkthrough

Let us trace `weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` with `days = 5` (`low = 10`, `high = 55`):

| Step | `low` | `high` | `mid` (Capacity) | Daily Allocations | Days Needed | Feasible? ($\le 5$) | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `10` | `55` | `32` | `[28, 27]` | 2 | Yes | Try smaller: `high = mid - 1` | `[10, 31]` |
| **2** | `10` | `31` | `20` | `[15, 13, 17, 10]` | 4 | Yes | Try smaller: `high = mid - 1` | `[10, 19]` |
| **3** | `10` | `19` | `14` | `[10, 11, 13, 11, 10]` | 6 | No | Increase capacity: `low = mid + 1` | `[15, 19]` |
| **4** | `15` | `19` | `17` | `[15, 13, 17, 10]` | 4 | Yes | Try smaller: `high = mid - 1` | `[15, 16]` |
| **5** | `15` | `16` | `15` | `[15, 13, 8, 9, 10]` | 5 | Yes | Try smaller: `high = mid - 1` | `[15, 14]` |

When `low > high`, the loop terminates. The algorithm returns `low = 15`.

---

### Step-by-Step Algorithm

1. **Establish Feasibility Interval:** Set `low = max(weights)` and `high = sum(weights)`.
2. **Execute Binary Search on Capacity:** While `low <= high`:
   - Compute midpoint capacity: `mid = low + (high - low) // 2`.
   - Greedily simulate package loading:
     - Set `days_needed = 1` and `current_weight = 0`.
     - For each package `w` in `weights`:
       - If `current_weight + w <= mid`, add weight: `current_weight += w`.
       - Else, advance day: `days_needed += 1`, and reset `current_weight = w`.
   - If `days_needed <= days`:
     - Feasible: seek smaller capacity with `high = mid - 1`.
   - Else:
     - Infeasible: increase capacity with `low = mid + 1`.
3. **Return Lower Bound:** When the search completes, return `low`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Binary Search on Capacity" default>

```python
class Solution:
    def shipWithinDays(self, weights: list[int], days: int) -> int:
        # Minimum capacity must at least hold the heaviest package
        low = max(weights)
        # Maximum capacity loads all packages in a single day
        high = sum(weights)

        def can_ship(capacity: int) -> bool:
            days_needed = 1
            current_weight = 0

            for w in weights:
                if current_weight + w <= capacity:
                    current_weight += w
                else:
                    # Current ship is full; rollover to the next day
                    days_needed += 1
                    current_weight = w

            return days_needed <= days

        while low <= high:
            mid = low + (high - low) // 2

            if can_ship(mid):
                # Capacity is sufficient; try finding an even smaller valid capacity
                high = mid - 1
            else:
                # Took too many days; must increase ship capacity
                low = mid + 1

        return low
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Linear Capacity Search">

```python
class Solution:
    def shipWithinDays(self, weights: list[int], days: int) -> int:
        capacity = max(weights)

        def can_ship(cap: int) -> bool:
            days_needed = 1
            current_weight = 0
            for w in weights:
                if current_weight + w <= cap:
                    current_weight += w
                else:
                    days_needed += 1
                    current_weight = w
            return days_needed <= days

        while not can_ship(capacity):
            capacity += 1

        return capacity
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Capacity Search** | $O(n \cdot (\sum W - \max W))$ | $O(1)$ | Tests capacities sequentially. Inefficient when total package weight is large. |
| **Binary Search on Capacity** | $O(n \log(\sum W))$ | $O(1)$ | Halves candidate capacities logarithmically. Evaluates each capacity with an $O(n)$ greedy scan. |

---

### Common Pitfall: Setting Lower Bound Below Maximum Element Weight

Setting `low` to 1 or the average weight rather than `max(weights)` is a frequent bug. If candidate capacity `mid` is smaller than an individual package weight, that package can never fit onto any ship, causing the simulator to fail or enter infinite day increments. Initializing `low = max(weights)` guarantees that every package fits within the capacity bounds.

---

### Concise Interview Takeaway

Binary search the capacity range $[\max(\text{weights}), \sum \text{weights}]$. At each trial capacity, greedily load packages until the ship fills, counting days in $O(n)$ time. This yields an optimal $O(n \log(\sum \text{weights}))$ runtime with $O(1)$ space.
