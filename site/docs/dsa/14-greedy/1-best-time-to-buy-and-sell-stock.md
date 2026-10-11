---
id: 1-best-time-to-buy-and-sell-stock
title: "121. Best Time to Buy and Sell Stock"
description: "Running minimum price tracking with single-pass profit maximization"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">One-Pass Tracking</span>

> **Problem Statement:** You are given an array `prices` where `prices[i]` is the price of a given stock on the $i$-th day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve. If you cannot achieve any profit, return `0`.

```text
Input:  prices = [7, 1, 5, 3, 6, 4]
Output: 5
Explanation: Buy on day 1 (price = 1) and sell on day 4 (price = 6), profit = 6 - 1 = 5. Note that buying on day 1 and selling on day 0 is not allowed because you must buy before you sell.
```

---

### The Intuitive Mental Model

Imagine looking at a historical price chart for a stock. You are allowed to make a single purchase and a single sale. Crucially, time flows in only one direction: your sell day must occur strictly after your buy day.

#### Brute Force: Checking Every Buy-Sell Pair

The most direct approach is testing every possible transaction:
- Pick day `i` as the buy day.
- Iterate through every subsequent day `j > i` as the sell day.
- Calculate `prices[j] - prices[i]` and track the maximum profit observed.

Because there are $\frac{n(n - 1)}{2}$ potential pairs, this requires $O(n^2)$ time. For arrays with tens of thousands of elements, checking every pair is far too slow and will exceed runtime limits.

#### Optimal Approach: Tracking the Running Minimum

Instead of looking backwards or checking all pairs, what if we walk forward through the timeline just once?

As you progress day by day, you make two constant-time decisions:
1. **Is today's price cheaper than any price seen before?** If so, update your baseline purchase price: `min_price = min(min_price, price)`.
2. **If I bought at that historical minimum and sold today, what would my profit be?** Calculate `price - min_price` and update `max_profit = max(max_profit, price - min_price)`.

Because the best day to sell must be paired with the lowest price that occurred prior to it, maintaining a running minimum guarantees that we always evaluate the optimal purchase price for the current day.

#### Execution Walkthrough

Let us trace `prices = [7, 1, 5, 3, 6, 4]`:

| Day ($i$) | Price (`prices[i]`) | Current Minimum (`min_price`) | Potential Profit (`price - min_price`) | Max Profit (`max_profit`) | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | 7 | 7 | $7 - 7 = 0$ | 0 | Initialize `min_price` to 7 |
| **1** | 1 | 1 | $1 - 1 = 0$ | 0 | New historical minimum found (update `min_price = 1`) |
| **2** | 5 | 1 | $5 - 1 = 4$ | 4 | Update `max_profit` to 4 |
| **3** | 3 | 1 | $3 - 1 = 2$ | 4 | Profit lower than record; keep `max_profit = 4` |
| **4** | 6 | 1 | $6 - 1 = 5$ | 5 | Update `max_profit` to 5 (Global Best) |
| **5** | 4 | 1 | $4 - 1 = 3$ | 5 | Profit lower than record; keep `max_profit = 5` |

---

### Step-by-Step Algorithm

1. **Initialize State:** Set `min_price = float('inf')` to capture the cheapest buying opportunity, and `max_profit = 0`.
2. **Scan Prices Forward:** Iterate through each `price` in `prices`:
   - If `price < min_price`, update `min_price = price`.
   - Else if `price - min_price > max_profit`, update `max_profit = price - min_price`.
3. **Return Result:** After the single pass completes, return `max_profit`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: One-Pass Tracking" default>

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        min_price = float('inf')
        max_profit = 0

        for price in prices:
            # Track the cheapest buying opportunity seen so far
            if price < min_price:
                min_price = price
            # Evaluate profit if selling today
            elif price - min_price > max_profit:
                max_profit = price - min_price

        return max_profit
```

  </TabItem>
  <TabItem value="brute" label="Brute Force: Pairwise Comparison">

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        n = len(prices)
        max_profit = 0

        for i in range(n):
            for j in range(i + 1, n):
                profit = prices[j] - prices[i]
                if profit > max_profit:
                    max_profit = profit

        return max_profit
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n^2)$ | $O(1)$ | Checks all pairs $(i, j)$ with $j > i$. Memory-efficient but computationally prohibitive on large inputs. |
| **One-Pass Tracking** | $O(n)$ | $O(1)$ | Single linear scan maintaining the minimum seen so far. Optimal time and constant auxiliary memory. |

---

### Common Pitfall: Finding Global Extremes Separately

A common mistake is attempting to find the global minimum `min(prices)` and global maximum `max(prices)` independently. If the overall maximum price occurs *before* the overall minimum (for instance, in `prices = [7, 6, 4, 3, 1]`), the transaction would require selling before buying, which violates temporal causality.

By updating `min_price` strictly as we advance left to right, we ensure that every profit calculation uses a buy day strictly preceding the current sell day.

---

### Concise Interview Takeaway

For Best Time to Buy and Sell Stock, maintain a running minimum of the purchase price as you iterate forward through the array. On each day, greedily evaluate the profit if selling today (`price - min_price`) and update the maximum profit recorded. This single-pass greedy scan achieves optimal $O(n)$ time and $O(1)$ auxiliary space.
