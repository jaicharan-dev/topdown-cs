---
id: 12-best-time-to-buy-and-sell-stock-with-cooldown
title: "309. Best Time to Buy and Sell Stock with Cooldown"
description: "Maximize stock trading profit with 1-day cooldown using 3-state finite state machine"
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">State Machine DP</span>

> **Problem Statement:** You are given an array `prices` where `prices[i]` is the price of a given stock on the $i$-th day. Find the maximum profit you can achieve. You may complete as many transactions as you like (buy and sell multiple times) with the restriction that after selling your stock, you cannot buy stock on the next day (a mandatory 1-day cooldown). You may not engage in multiple transactions simultaneously.

```text
Input:  prices = [1, 2, 3, 0, 2]
Output: 3
Explanation: Transactions = [buy, sell, cooldown, buy, sell], profits = 3.
```

---

### The Intuitive Mental Model

Instead of attempting complex index offsets for cooldown days, this problem is best understood as a three-state Finite State Machine. At the conclusion of each day, you must end up in exactly one of three mutually exclusive states:

1. **`held`:** You currently own a share of stock.
   - You either kept holding the share from yesterday (`held`), or
   - You bought a share today, which requires you to have been in the `rest` state yesterday (`rest - price`).
   - Transition: $\text{held} = \max(\text{held}, \, \text{rest} - \text{price})$.
2. **`sold`:** You sold a share today and must cool down tomorrow.
   - You must have held a share yesterday:
   - Transition: $\text{sold} = \text{prev\_held} + \text{price}$.
3. **`rest`:** You do not own a share and did not sell today.
   - You either stayed resting from yesterday (`rest`), or
   - You just transitioned out of yesterday's `sold` state (`sold`).
   - Transition: $\text{rest} = \max(\text{rest}, \, \text{sold})$.

#### Base Conditions
Before trading begins:
- `held = -inf` (impossible to hold a stock prior to any purchases).
- `sold = 0` (no stock sold yet).
- `rest = 0` (starting cash is zero).

The final answer is $\max(\text{sold}, \text{rest})$ because holding a stock on the final day leaves capital tied up without realizing profit.

#### Execution Walkthrough

Let us trace `prices = [1, 2, 3, 0, 2]`:

| Day ($i$) | Price (`price`) | `held = max(held, prev_rest - price)` | `sold = prev_held + price` | `rest = max(prev_rest, prev_sold)` |
| :---: | :---: | :---: | :---: | :---: |
| **Initial** | - | $-\infty$ | 0 | 0 |
| **0** | 1 | $\max(-\infty, 0 - 1) = -1$ | $-\infty + 1 = -\infty$ | $\max(0, 0) = 0$ |
| **1** | 2 | $\max(-1, 0 - 2) = -1$ | $-1 + 2 = 1$ | $\max(0, -\infty) = 0$ |
| **2** | 3 | $\max(-1, 0 - 3) = -1$ | $-1 + 3 = 2$ | $\max(0, 1) = 1$ |
| **3** | 0 | $\max(-1, 1 - 0) = 1$ | $-1 + 0 = -1$ | $\max(1, 2) = 2$ |
| **4** | 2 | $\max(1, 2 - 2) = 1$ | $1 + 2 = 3$ | $\max(2, -1) = 2$ |

Final profit is $\max(\text{sold}, \text{rest}) = \max(3, 2) = 3$.

---

### Step-by-Step Algorithm

1. **Initialize State Trackers:**
   - Set `held = float('-inf')`.
   - Set `sold = 0`.
   - Set `rest = 0`.
2. **Iterate Across Daily Prices:** For each `price` in `prices`:
   - Store yesterday's held value: `prev_held = held`.
   - Update `held = max(held, rest - price)`.
   - Update `rest = max(rest, sold)`.
   - Update `sold = prev_held + price`.
3. **Return Maximum Profit:** Return `max(sold, rest)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: State Machine DP (O(1) Space)" default>

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        held = float("-inf")
        sold = 0
        rest = 0

        for price in prices:
            prev_held = held
            held = max(held, rest - price)
            rest = max(rest, sold)
            sold = prev_held + price

        return int(max(sold, rest))
```

  </TabItem>
  <TabItem value="memo" label="Alternative: Top-Down Memoization">

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        memo: dict[tuple[int, bool], int] = {}
        n = len(prices)

        def dfs(i: int, buying: bool) -> int:
            if i >= n:
                return 0
            if (i, buying) in memo:
                return memo[(i, buying)]

            cooldown = dfs(i + 1, buying)
            if buying:
                buy = dfs(i + 1, False) - prices[i]
                memo[(i, buying)] = max(buy, cooldown)
            else:
                # Selling imposes mandatory 1-day cooldown: advance to i + 2
                sell = dfs(i + 2, True) + prices[i]
                memo[(i, buying)] = max(sell, cooldown)

            return memo[(i, buying)]

        return dfs(0, True)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Explores buy, sell, and cooldown decisions recursively without caching. |
| **Top-Down Memoization** | $O(n)$ | $O(n)$ | Caches `(day, state)` pairs in a hash table with call stack overhead. |
| **State Machine DP** | $O(n)$ | $O(1)$ | Tracks the 3 state variables (`held`, `sold`, `rest`) in constant memory. |

---

### Common Pitfall: Buying on the Cooldown Day

A common error is allowing a buy transaction on the day immediately following a sale. Under the problem rules, selling on day $i$ imposes a mandatory cooldown on day $i + 1$, meaning the next allowed purchase can only occur on day $i + 2$. By structuring the state machine so that buying requires transitioning from the `rest` state, and entering `rest` from `sold` consumes one full day, the cooldown constraint is automatically enforced without manual flag checks.

---

### Concise Interview Takeaway

Model the problem as a 3-state finite state machine with `held`, `sold`, and `rest`. Because buying is permitted only from `rest`, and exiting `sold` requires transitioning to `rest`, the mandatory one-day cooldown is cleanly enforced. Updating these three scalar variables daily achieves an optimal $O(n)$ time and $O(1)$ space solution.
