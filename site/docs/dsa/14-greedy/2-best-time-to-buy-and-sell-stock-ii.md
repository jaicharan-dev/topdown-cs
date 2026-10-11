---
id: 2-best-time-to-buy-and-sell-stock-ii
title: "122. Best Time to Buy and Sell Stock II"
description: "Greedy accumulation of every upward price delta"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Valley-Peak / Incremental Gains</span>

> **Problem Statement:** You are given an integer array `prices` where `prices[i]` is the price of a given stock on the $i$-th day. On each day, you may decide to buy and/or sell the stock. You can only hold at most one share of the stock at any time, but you can buy and sell on the same day. Find and return the maximum profit you can achieve.

```text
Input:  prices = [7, 1, 5, 3, 6, 4]
Output: 7
Explanation: Buy on day 1 (price = 1) and sell on day 2 (price = 5), profit = 5 - 1 = 4. Then buy on day 3 (price = 3) and sell on day 4 (price = 6), profit = 6 - 3 = 3. Total profit is 4 + 3 = 7.
```

---

### The Intuitive Mental Model

Unlike the single-transaction restriction in the first problem, here you are permitted to execute unlimited transactions. You can hold at most one share at any given time, but you can sell and immediately repurchase on the exact same day.

#### Brute Force: Recursive Decision Tree

The brute-force strategy considers all possible actions on each trading day: either buy, sell, or hold. Because every day presents branching choices dependent on whether a share is currently held, exploring the full decision tree takes exponential $O(2^n)$ time. Even when optimized using dynamic programming with states `(day, holding)`, maintaining the state space requires unnecessary tracking overhead for this problem.

#### Optimal Approach: Telescoping Daily Increments

A common intuition is trying to find the absolute valley before a climb and the absolute peak before a drop. However, the mathematics of continuous growth offers a major simplification.

Suppose a stock price steadily increases across three consecutive days: $[p_0, p_1, p_2]$. Holding across the entire rally yields:

$$p_2 - p_0 = (p_1 - p_0) + (p_2 - p_1)$$

Buying at $p_0$ and selling at $p_2$ generates the exact same profit as buying at $p_0$, selling at $p_1$, immediately repurchasing at $p_1$, and selling at $p_2$.

Because any multi-day upward climb is equal to the sum of its consecutive day-over-day positive deltas, we do not need to look ahead to find peaks. The greedy rule is straightforward:
- If tomorrow's price is higher than today's price (`prices[i] > prices[i - 1]`), collect the daily difference.
- If tomorrow's price drops or stays flat, skip the transaction.

#### Execution Walkthrough

Let us trace `prices = [7, 1, 5, 3, 6, 4]`:

| Day ($i$) | Price (`prices[i]`) | Previous Price (`prices[i - 1]`) | Daily Delta | Action Taken | Total Profit |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **0** | 7 | - | - | Starting day; no previous price | 0 |
| **1** | 1 | 7 | $1 - 7 = -6$ | Price dropped; do not buy on day 0 | 0 |
| **2** | 5 | 1 | $5 - 1 = +4$ | Price climbed; collect profit of 4 | 4 |
| **3** | 3 | 5 | $3 - 5 = -2$ | Price dropped; ignore downward move | 4 |
| **4** | 6 | 3 | $6 - 3 = +3$ | Price climbed; collect profit of 3 | 7 |
| **5** | 4 | 6 | $4 - 6 = -2$ | Price dropped; ignore downward move | 7 |

---

### Step-by-Step Algorithm

1. **Initialize Profit Accumulator:** Set `total_profit = 0`.
2. **Iterate Across Consecutive Days:** Loop from index `1` up to `len(prices) - 1`.
3. **Greedily Accumulate Positive Deltas:** Check if `prices[i] > prices[i - 1]`:
   - If true, add `prices[i] - prices[i - 1]` to `total_profit`.
4. **Return Total Profit:** Once the loop completes, return `total_profit`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Greedy Valley-Peak" default>

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        total_profit = 0

        # Accumulate every positive day-over-day price increase
        for i in range(1, len(prices)):
            if prices[i] > prices[i - 1]:
                total_profit += prices[i] - prices[i - 1]

        return total_profit
```

  </TabItem>
  <TabItem value="dp" label="Alternative: State Machine DP">

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        # hold: max profit holding a share
        # cash: max profit not holding a share
        hold = -prices[0]
        cash = 0

        for price in prices[1:]:
            cash = max(cash, hold + price)
            hold = max(hold, cash - price)

        return cash
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **State Machine DP** | $O(n)$ | $O(1)$ | Tracks explicit portfolio states (`hold` and `cash`). Highly extensible to transaction fees or cooldown periods. |
| **Greedy Valley-Peak** | $O(n)$ | $O(1)$ | Directly accumulates positive daily increments in a single pass. Minimal code with zero state overhead. |

---

### Common Pitfall: Overcomplicating Peak and Valley Detection

A frequent instinct is writing nested loops to find local minima (valleys) followed by local maxima (peaks). While conceptually valid, navigating boundary checks and edge cases (such as monotonically decreasing or increasing prices) makes manual peak-valley pointer manipulation bug-prone.

Summing all positive differences `prices[i] - prices[i - 1]` is mathematically identical and avoids all boundary edge cases.

---

### Concise Interview Takeaway

For Best Time to Buy and Sell Stock II, unlimited transactions mean that any multi-day price gain is the exact sum of its consecutive positive daily steps. Iterate through the array starting from day 1, adding `prices[i] - prices[i - 1]` whenever positive. This greedy scan runs in optimal $O(n)$ time and $O(1)$ auxiliary space.
