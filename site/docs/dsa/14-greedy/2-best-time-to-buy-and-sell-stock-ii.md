---
id: 2-best-time-to-buy-and-sell-stock-ii
title: "122. Best Time to Buy and Sell Stock II"
description: "Unlimited trades means every price rise can be collected on its own"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Valley-Peak / Incremental Gains</span>

> **Problem Statement:** You are given daily prices for a stock. You may buy and sell as often as you like, holding at most one share at a time, including buying and selling on the same day. Return the most profit you can make.

```text
Input:  prices = [7, 1, 5, 3, 6, 4]
Output: 7
```

---

### Picture it

Unlimited trading changes the problem completely, and it makes it easier rather than harder.

Think about what a profitable run looks like: buy in a valley, sell at the next peak. Now notice that a climb from `1` to `6` can be collected either as one trade, `6 - 1 = 5`, or as a chain of daily trades that sum to exactly the same thing. Selling and rebuying at every step along the way costs nothing, because there are no fees and no limit on trades.

So the valleys and peaks never actually have to be identified. Just collect **every upward step** between consecutive days and ignore every downward one:

```text
7 -> 1   falls, take nothing
1 -> 5   rises by 4, take it
5 -> 3   falls, take nothing
3 -> 6   rises by 3, take it
6 -> 4   falls, take nothing
```

Total: `7`.

---

### How to think about it

Walk the prices and add up `price today minus price yesterday` whenever that difference is positive.

**Why this is optimal**, in one line: any profit you could make is the sum of the price changes between your buy and sell days, and no sequence of trades can include a downward step without losing money, so the very best possible is the sum of all the upward steps. This method collects exactly that.

The contrast with the single-trade version is worth holding on to. There, the answer is the largest **difference** between two days and the order of those days constrains everything. Here it is the sum of all **rises**, and the constraint is gone entirely. One restriction removed turns a tracking problem into a one-line sum.

Falling markets again need no special case: no step is positive, so nothing is added and the answer is `0`.

---

### Walking through the example

Take `prices = [7, 1, 5, 3, 6, 4]`.

1. **`7` to `1`** is a fall of `6`. Skip.
2. **`1` to `5`** rises by `4`. Running total `4`.
3. **`5` to `3`** falls. Skip.
4. **`3` to `6`** rises by `3`. Running total `7`.
5. **`6` to `4`** falls. Skip.

The answer is `7`, which corresponds to buying at `1` and selling at `5`, then buying at `3` and selling at `6`. The same `7` would come from day-by-day trading through those climbs, which is why counting the steps works.

---

### The code

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        total = 0

        for i in range(1, len(prices)):
            # every rise can be collected, and no fall ever has to be
            if prices[i] > prices[i - 1]:
                total += prices[i] - prices[i - 1]

        return total
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, one comparison and sometimes one addition per day.

#### Space: $O(1)$

A single running total.

---

### Remember this

With unlimited trades, the answer is simply the sum of every upward step between consecutive days, because a long climb and a chain of one-day trades across it pay exactly the same. No valleys or peaks need finding. Contrast it with the single-trade version, where the answer is the biggest difference rather than the total of the rises. $O(n)$ time, $O(1)$ space.
