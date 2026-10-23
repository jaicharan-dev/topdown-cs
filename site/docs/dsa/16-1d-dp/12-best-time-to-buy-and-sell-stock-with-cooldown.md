---
id: 12-best-time-to-buy-and-sell-stock-with-cooldown
title: "309. Best Time to Buy and Sell Stock with Cooldown"
description: "Three states each day: holding, resting after a sale, or free to buy"
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">State Machine DP</span>

> **Problem Statement:** You are given daily stock prices and may trade as often as you like, holding at most one share, except that the day after a sale you may not buy. Return the most profit you can make.

```text
Input:  prices = [1, 2, 3, 0, 2]
Output: 3
```

---

### Picture it

Without the cooldown, this was the problem where you simply add up every price rise. The cooldown breaks that, because selling now costs you tomorrow's opportunity, so the decision is no longer local.

What fixes it is realising that at the end of each day you are in exactly one of **three** situations:

```text
holding   you own a share
resting   you sold today, so tomorrow you cannot buy
free      you own nothing and may buy tomorrow
```

Track the best possible profit for each situation, day by day. Then each day's values come from the previous day's, and the whole cooldown rule is expressed by which arrows exist between the states.

---

### How to think about it

Three running numbers, each the best profit achievable while ending a day in that situation.

**Holding** means either you were already holding, or you were free and bought today, paying the price.

**Resting** means you were holding and sold today, gaining the price. Nothing else leads here.

**Free** means you were already free and did nothing, or you were resting yesterday and the cooldown has now expired.

That last line is where the cooldown lives: the only route out of resting is into free, which takes a day. There is deliberately no arrow from resting to holding, and that missing arrow is the entire rule.

Start holding at negative infinity, since you cannot own anything before the first day, and the other two at zero.

The answer is the better of resting and free on the last day. Holding is excluded because ending while still owning a share is never worth more than having sold it.

As always, compute all three from the previous day's values before assigning any of them.

---

### Walking through the example

Take `prices = [1, 2, 3, 0, 2]`. Holding starts at negative infinity, resting and free at `0`.

1. **Price `1`.** Buying from free gives holding `0 - 1 = -1`. Resting is impossible, since nothing was held. Free stays `0`.
2. **Price `2`.** Holding stays `-1`, as buying today would be worse. Selling gives resting `-1 + 2 = 1`. Free stays `0`.
3. **Price `3`.** Selling gives resting `-1 + 3 = 2`. Free becomes `1`, inheriting the previous day's rest. Holding stays `-1`.
4. **Price `0`.** Free becomes `2`, inheriting the rest from the sale at `3`. Holding becomes `1 - 0 = 1`, buying from the **previous** day's free value of `1`.
5. **Price `2`.** Selling from holding gives resting `1 + 2 = 3`. Free stays `2`.

The answer is the better of resting and free on the last day: `3`.

Step 4 is the one to watch. Holding buys from the free value as it stood at the **end of the previous day**, not the one computed moments earlier on the same day. Using the fresh value would let a share be bought on the very day the cooldown was still being served.

---

### The code

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        holding = float("-inf")   # cannot own anything before day one
        resting = 0               # sold today, so no buying tomorrow
        free = 0                  # own nothing and may buy

        for price in prices:
            prev_holding, prev_resting, prev_free = holding, resting, free

            holding = max(prev_holding, prev_free - price)
            resting = prev_holding + price
            free = max(prev_free, prev_resting)   # the cooldown expiring

        return max(resting, free)
```

---

### Time and space complexity

#### Time: $O(n)$

One pass with a constant amount of work per day.

#### Space: $O(1)$

Three numbers, plus three copies. The table version keeps three arrays of length `n`, which is $O(n)$ and the natural first draft.

---

### Remember this

When a rule makes a decision depend on what happened yesterday, name the situations you can be in and track the best profit for each. Three states here: holding, resting after a sale, and free. The cooldown is expressed by the **missing** arrow from resting straight to holding, forcing a day in free first. Compute all three from the previous day's values before assigning any. $O(n)$ time, $O(1)$ space.
