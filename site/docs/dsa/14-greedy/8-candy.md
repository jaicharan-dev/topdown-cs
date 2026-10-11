---
id: 8-candy
title: "135. Candy"
description: "Distribute minimum candies to children using two-pass left-right greedy rating comparison"
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two-Pass Array</span>

> **Problem Statement:** There are `n` children standing in a line, each assigned a rating value given in an integer array `ratings`. You must give candies to these children adhering to two rules: each child must receive at least one candy, and children with a strictly higher rating than their immediate neighbors must receive more candies than those neighbors. Return the minimum total number of candies required.

```text
Input:  ratings = [1, 0, 2]
Output: 5
Explanation: You can allocate to the first, second, and third child with 2, 1, and 2 candies respectively.
```

---

### The Intuitive Mental Model

Each child has two simultaneous constraints: their left neighbor and their right neighbor. Attempting to balance both directions in a single forward pass is difficult because deciding how many candies child $i$ requires often depends on how far a descending valley extends to the right.

#### Brute Force: Iterative Relaxation

A brute-force simulation initializes every child with 1 candy. It then repeatedly sweeps through the entire array, bumping a child's candy count whenever a neighbor with a lower rating has equal or greater candies. In the worst case (such as a strictly decreasing ratings array of length $n$), updates propagate by only one index per sweep, leading to $O(n^2)$ time.

#### Optimal Approach: Two-Pass Directional Decoupling

The key insight is to decouple bilateral constraints into two independent directional sweeps:

1. **Initial State:** Every child must receive at least one candy. Initialize `candies = [1] * n`.
2. **Left-to-Right Pass:** Ensure every child with a higher rating than their left neighbor receives strictly more candies:
   $$\text{if } \text{ratings}[i] > \text{ratings}[i - 1], \quad \text{candies}[i] = \text{candies}[i - 1] + 1$$
   This pass guarantees that the left-neighbor condition is fully satisfied everywhere.
3. **Right-to-Left Pass:** Ensure every child with a higher rating than their right neighbor receives strictly more candies:
   $$\text{if } \text{ratings}[i] > \text{ratings}[i + 1], \quad \text{candies}[i] = \max(\text{candies}[i], \text{candies}[i + 1] + 1)$$
   The `max()` operation is essential: if child $i$ already received a higher candy count during the left pass due to an uphill climb from the left, taking the maximum ensures we satisfy the right neighbor without violating the already established left-neighbor condition.

#### Execution Walkthrough

Let us trace `ratings = [1, 2, 87, 87, 87, 2, 1]`:

Start with `candies = [1, 1, 1, 1, 1, 1, 1]`.

| Index ($i$) | Rating (`ratings[i]`) | Left Pass Rule | Candies after Left Pass | Right Pass Rule | Final Candies |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | 1 | Base ($i = 0$) | 1 | No right neighbor condition ($1 \le 2$) | 1 |
| **1** | 2 | $2 > 1 \implies 1 + 1 = 2$ | 2 | No right neighbor condition ($2 \le 87$) | 2 |
| **2** | 87 | $87 > 2 \implies 2 + 1 = 3$ | 3 | Equal ratings ($87 \le 87$) | 3 |
| **3** | 87 | Equal ratings ($87 \le 87$) | 1 | Equal ratings ($87 \le 87$) | 1 |
| **4** | 87 | Equal ratings ($87 \le 87$) | 1 | $87 > 2 \implies \max(1, 2 + 1) = 3$ | 3 |
| **5** | 2 | $2 \le 87$ | 1 | $2 > 1 \implies \max(1, 1 + 1) = 2$ | 2 |
| **6** | 1 | $1 \le 2$ | 1 | Base ($i = n - 1$) | 1 |

Total candies distributed: $1 + 2 + 3 + 1 + 3 + 2 + 1 = 13$.

---

### Step-by-Step Algorithm

1. **Initialize Candies:** Create `candies = [1] * len(ratings)` so that every child receives at least one candy.
2. **Left-to-Right Pass:**
   - Loop `i` from `1` to `len(ratings) - 1`.
   - If `ratings[i] > ratings[i - 1]`, set `candies[i] = candies[i - 1] + 1`.
3. **Right-to-Left Pass:**
   - Loop `i` from `len(ratings) - 2` down to `0`.
   - If `ratings[i] > ratings[i + 1]`, set `candies[i] = max(candies[i], candies[i + 1] + 1)`.
4. **Aggregate:** Return `sum(candies)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pass Greedy" default>

```python
class Solution:
    def candy(self, ratings: list[int]) -> int:
        n = len(ratings)
        candies = [1] * n

        # Pass 1: Left-to-right to satisfy left neighbor inequalities
        for i in range(1, n):
            if ratings[i] > ratings[i - 1]:
                candies[i] = candies[i - 1] + 1

        # Pass 2: Right-to-left to satisfy right neighbor inequalities
        for i in range(n - 2, -1, -1):
            if ratings[i] > ratings[i + 1]:
                candies[i] = max(candies[i], candies[i + 1] + 1)

        return sum(candies)
```

  </TabItem>
  <TabItem value="slope" label="Alternative: Single-Pass Slope Tracking">

```python
class Solution:
    def candy(self, ratings: list[int]) -> int:
        n = len(ratings)
        if n <= 1:
            return n

        candies = 1
        up = down = peak = 0

        for i in range(1, n):
            if ratings[i] > ratings[i - 1]:
                up += 1
                down = 0
                peak = up
                candies += 1 + up
            elif ratings[i] == ratings[i - 1]:
                up = down = peak = 0
                candies += 1
            else:
                up = 0
                down += 1
                candies += 1 + down - (1 if peak >= down else 0)

        return candies
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Single-Pass Slope Tracking** | $O(n)$ | $O(1)$ | Tracks uphill, downhill, and peak sequences in a single pass. Zero extra memory, but tricky edge cases. |
| **Two-Pass Greedy** | $O(n)$ | $O(n)$ | Decouples left and right neighbor constraints into two simple passes. Clear, robust, and standard in interviews. |

---

### Common Pitfall: Over-allocating for Equal Ratings

The problem statement requires giving more candies only to children with a *strictly higher* rating than their neighbor. When adjacent children share the exact same rating (for example, `ratings = [1, 2, 2]`), the second `2` is not required to receive more candies than the first `2`.

In this scenario, assigning candies `[1, 2, 1]` is completely valid. Incrementing candy counts on equal ratings is a common mistake that violates the minimum-candies requirement.

---

### Concise Interview Takeaway

For Candy, decouple the bilateral neighbor constraints into two directional sweeps. Initialize each child with 1 candy. Sweep left-to-right to satisfy the left neighbor condition, then sweep right-to-left using `candies[i] = max(candies[i], candies[i + 1] + 1)` to satisfy the right neighbor condition without invalidating earlier gains. This solves the problem in $O(n)$ time and $O(n)$ auxiliary space.
