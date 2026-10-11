---
id: 4-coin-change-ii
title: "518. Coin Change II"
description: "Count combinations of coins making target amount using unbounded knapsack DP"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Knapsack</span>

> **Problem Statement:** You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total sum of money. Return the number of combinations that make up that amount. If that amount of money cannot be made up by any combination of the coins, return 0. You may assume that you have an infinite number of each kind of coin.

```text
Input:  amount = 5, coins = [1, 2, 5]
Output: 4
Explanation: There are four ways to make up the amount:
5 = 5
5 = 2 + 2 + 1
5 = 2 + 1 + 1 + 1
5 = 1 + 1 + 1 + 1 + 1
```

---

### The Intuitive Mental Model

In *Coin Change I*, the objective was finding the *minimum* coin count. In *Coin Change II*, the objective is counting *unique unordered combinations*: `[1, 2]` is treated as the exact same combination as `[2, 1]`.

#### Brute Force: Recursive Decision Tree
At each coin denomination index `i`, we decide how many instances of `coins[i]` to take (from $0$ up to $\lfloor \text{amount} / \text{coins}[i] \rfloor$) and branch recursively on the remaining balance. Without memoization, this explores an unbounded tree of depth proportional to `amount / min(coins)`, creating exponential runtime that times out on large amounts.

#### Optimal Approach: Unbounded Knapsack DP (Coins as Outer Loop)
This problem maps directly to the classic unbounded knapsack pattern. The critical architectural choice is the ordering of the nested loops:

- **Amount in Outer Loop, Coins in Inner Loop:** At amount 3, adding coin 1 to an existing 2 creates `[2, 1]`, while adding coin 2 to an existing 1 creates `[1, 2]`. This counts order-dependent arrangements, yielding *permutations* rather than combinations.
- **Coins in Outer Loop, Amount in Inner Loop:** Each coin denomination is considered systematically before moving to the next. Because coin 1 is finished before coin 2 is ever considered, 1s can never be added after 2s. This imposes a canonical sorted order on every selection, guaranteeing that only *unique combinations* are accumulated.

Let `dp[a]` represent the number of ways to form amount `a`:
$$\text{dp}[a] += \text{dp}[a - \text{coin}]$$
The base case is `dp[0] = 1`, representing exactly 1 valid combination to form amount 0 (choosing no coins).

#### Execution Walkthrough

Tracing `coins = [1, 2, 5]` and `amount = 5`:

| Step / Coin | `dp[0]` | `dp[1]` | `dp[2]` | `dp[3]` | `dp[4]` | `dp[5]` | Combinations Formed |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Initial** | 1 | 0 | 0 | 0 | 0 | 0 | Base case: 1 way to form 0 (the empty set `{}`) |
| **`coin = 1`** | 1 | 1 | 1 | 1 | 1 | 1 | Exactly one way to form every amount (all 1s) |
| **`coin = 2`** | 1 | 1 | 2 | 2 | 3 | 3 | Adds combos with 2s: `{2}`, `{1, 2}`, `{2, 2}`, `{1, 1, 1, 2}` |
| **`coin = 5`** | 1 | 1 | 2 | 2 | 3 | 4 | Adds combo `{5}` via `dp[5] += dp[0]` |

The final number of combinations in `dp[5]` is 4.

---

### Step-by-Step Algorithm

1. **Initialize Combination Array:** Allocate a 1D list `dp = [0] * (amount + 1)` and set the base case `dp[0] = 1`.
2. **Iterate Denominations First:** Loop through each `coin` in `coins`.
3. **Accumulate Sub-amounts:** For each amount `a` from `coin` up to `amount`:
   - Add the combinations formed by subtracting the current coin: `dp[a] += dp[a - coin]`.
4. **Return Answer:** Return `dp[amount]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized 1D DP" default>

```python
class Solution:
    def change(self, amount: int, coins: list[int]) -> int:
        # dp[a] stores the number of unique combinations to form amount a
        dp = [0] * (amount + 1)
        dp[0] = 1

        # Coin in outer loop strictly enforces combinations (order-independent)
        for coin in coins:
            for a in range(coin, amount + 1):
                dp[a] += dp[a - coin]

        return dp[amount]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Full 2D Knapsack Table">

```python
class Solution:
    def change(self, amount: int, coins: list[int]) -> int:
        n = len(coins)
        # dp[i][a] stores combinations using a subset of the first i coins
        dp = [[0] * (amount + 1) for _ in range(n + 1)]

        for i in range(n + 1):
            dp[i][0] = 1

        for i in range(1, n + 1):
            coin = coins[i - 1]
            for a in range(amount + 1):
                # Option 1: Exclude the current coin
                dp[i][a] = dp[i - 1][a]
                # Option 2: Include the current coin (if amount allows)
                if a >= coin:
                    dp[i][a] += dp[i][a - coin]

        return dp[n][amount]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full 2D Knapsack Table** | $O(n \times \text{amount})$ | $O(n \times \text{amount})$ | Clarifies the decision boundary between including and excluding coins at the cost of a full 2D table. |
| **Space-Optimized 1D DP** | $O(n \times \text{amount})$ | $O(\text{amount})$ | Flattens rows into a single rolling 1D array of size $\text{amount} + 1$, minimizing auxiliary memory. |

---

### Common Pitfall: Inverting the Loop Order (Combinations vs Permutations)

The most notorious error in Coin Change problems is flipping the loop nesting. When `amount` is placed in the outer loop and `coins` in the inner loop, sequences like `[1, 2]` and `[2, 1]` are counted as separate entities (which solves LeetCode 377: Combination Sum IV). To enforce unique *combinations*, you must iterate over `coins` on the outside and `amount` on the inside.

---

### Concise Interview Takeaway

To count combinations without duplicate orderings in an unbounded knapsack problem, place coin denominations in the outer loop and target values in the inner loop. Processing each coin denomination sequentially enforces a monotonic order on coin choices, updating `dp[a] += dp[a - coin]` in $O(n \times \text{amount})$ time and $O(\text{amount})$ auxiliary space.
