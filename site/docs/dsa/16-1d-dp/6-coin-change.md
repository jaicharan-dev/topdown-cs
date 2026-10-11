---
id: 6-coin-change
title: "322. Coin Change"
description: "Find minimum coins needed to make target amount using bottom-up unbounded knapsack DP"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Knapsack</span>

> **Problem Statement:** You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total sum of money. Return the fewest number of coins that you need to make up that amount. If that amount cannot be made up by any combination of the coins, return `-1`. You may assume that you have an infinite quantity of each coin denomination.

```text
Input:  coins = [1, 2, 5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1 (3 coins total).
```

---

### The Intuitive Mental Model

Greedy algorithms (always picking the largest coin first) fail on arbitrary coin sets. For instance, if `coins = [1, 3, 4, 5]` and `amount = 7`, a greedy approach chooses $5 + 1 + 1 = 3$ coins, whereas the optimal combination is $4 + 3 = 2$ coins.

Because greedy choices cannot see ahead, we evaluate subproblems systematically using Dynamic Programming.

#### Brute Force: Recursive Exploration
A brute force recursive solution attempts every coin denomination for the remaining amount. This constructs a decision tree where each level branches up to $|\text{coins}|$ times. With maximum depth proportional to `amount`, the runtime grows exponentially as $O(|\text{coins}|^{\text{amount}})$.

#### Optimal Approach: Bottom-Up Tabulation
Let $\text{dp}[a]$ be the minimum number of coins needed to form amount $a$:
- If we decide to use a coin of denomination $c$ (where $c \le a$), the remaining amount is $a - c$. The total coins used via that path will be $1 + \text{dp}[a - c]$.
- Taking the minimum across all available denominations yields:

$$\text{dp}[a] = \min_{c \in \text{coins}, \, c \le a} (1 + \text{dp}[a - c])$$

By initializing $\text{dp}[0] = 0$ and filling values sequentially from 1 to `amount`, each subproblem is resolved once in constant time per coin denomination.

#### Execution Walkthrough

Let us trace `coins = [1, 2, 5]` for amounts up to 6:

| Amount ($a$) | Valid Choices ($c \le a$) | Subproblem Lookups ($1 + \text{dp}[a - c]$) | Optimal $\text{dp}[a]$ |
| :---: | :---: | :---: | :---: |
| **0** | None | Base case | 0 |
| **1** | 1 | $1 + \text{dp}[0] = 1 + 0 = 1$ | 1 |
| **2** | 1, 2 | $\min(1+\text{dp}[1], 1+\text{dp}[0]) = \min(2, 1) = 1$ | 1 |
| **3** | 1, 2 | $\min(1+\text{dp}[2], 1+\text{dp}[1]) = \min(2, 2) = 2$ | 2 |
| **4** | 1, 2 | $\min(1+\text{dp}[3], 1+\text{dp}[2]) = \min(3, 2) = 2$ | 2 |
| **5** | 1, 2, 5 | $\min(1+\text{dp}[4], 1+\text{dp}[3], 1+\text{dp}[0]) = \min(3, 3, 1) = 1$ | 1 |
| **6** | 1, 2, 5 | $\min(1+\text{dp}[5], 1+\text{dp}[4], 1+\text{dp}[1]) = \min(2, 3, 2) = 2$ | 2 |

---

### Step-by-Step Algorithm

1. **Initialize DP Table:** Create an array `dp` of size `amount + 1` filled with `amount + 1` (a sentinel value representing infinity, since even 1-cent coins cannot exceed `amount` total coins). Set base case `dp[0] = 0`.
2. **Iterate Across Amounts:** Loop `a` from 1 up to `amount`.
3. **Try Each Coin:** For each `coin` in `coins`:
   - If `a - coin >= 0`, update `dp[a] = min(dp[a], 1 + dp[a - coin])`.
4. **Return Answer:** If `dp[amount] != amount + 1`, return `dp[amount]`; otherwise, return `-1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bottom-Up Tabulation" default>

```python
class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [amount + 1] * (amount + 1)
        dp[0] = 0

        for a in range(1, amount + 1):
            for coin in coins:
                if a - coin >= 0:
                    dp[a] = min(dp[a], 1 + dp[a - coin])

        return dp[amount] if dp[amount] != amount + 1 else -1
```

  </TabItem>
  <TabItem value="memo" label="Alternative: Top-Down Memoization">

```python
class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        memo: dict[int, int] = {}

        def dfs(rem: int) -> int:
            if rem == 0:
                return 0
            if rem < 0:
                return -1
            if rem in memo:
                return memo[rem]

            min_coins = float("inf")
            for coin in coins:
                res = dfs(rem - coin)
                if res >= 0:
                    min_coins = min(min_coins, 1 + res)

            memo[rem] = int(min_coins) if min_coins != float("inf") else -1
            return memo[rem]

        return dfs(amount)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(\|\text{coins}\|^{\text{amount}})$ | $O(\text{amount})$ | Branches exponentially across every coin denomination without memoization. |
| **Top-Down Memoization** | $O(\text{amount} \times \|\text{coins}\|)$ | $O(\text{amount})$ | Solves reachable amounts recursively with hash table memoization and call stack overhead. |
| **Bottom-Up Tabulation** | $O(\text{amount} \times \|\text{coins}\|)$ | $O(\text{amount})$ | Iteratively fills an array of size `amount + 1` with optimal cache locality and no recursion. |

---

### Common Pitfall: Assuming a Greedy Strategy Works

A common mistake is assuming that picking the largest coin denomination first always minimizes coin count. While this works for standard currencies like US denominations, it fails on arbitrary coin collections. For example, with `coins = [1, 3, 4, 5]` and `amount = 7`, a greedy choice takes $5 + 1 + 1 = 3$ coins, whereas the optimal combination is $4 + 3 = 2$ coins. Dynamic programming is essential to evaluate all combinations.

---

### Concise Interview Takeaway

Frame the problem as an unbounded knapsack. Fill a 1D DP table from 0 up to `amount`, setting each entry to one plus the minimum of $\text{dp}[a - c]$ across all valid coins. Initializing the table with `amount + 1` acts as infinity, allowing an easy check at the end to return $-1$ if the target is unreachable.
