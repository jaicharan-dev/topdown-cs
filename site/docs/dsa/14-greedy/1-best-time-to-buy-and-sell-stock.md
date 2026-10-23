---
id: 1-best-time-to-buy-and-sell-stock
title: "121. Best Time to Buy and Sell Stock"
description: "Remember the cheapest day so far and ask what selling today would make"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">One-Pass Tracking</span>

> **Problem Statement:** You are given daily prices for a stock. Buy on one day and sell on a later day to make the most profit. Return that profit, or `0` if no profit is possible.

```text
Input:  prices = [7, 1, 5, 3, 6, 4]
Output: 5
```

---

### Picture it

Walk forward through the days, and on each one ask a single question:

> If I sold today, what is the most I could have made?

The answer depends on one thing only: the **cheapest price seen before today**. You would have bought then, because no earlier day was better and no later day is available to you yet.

So carry two numbers as you go. The cheapest price so far, and the best profit so far. Each day, work out today's profit against the cheapest, keep it if it beats the record, then see whether today is the new cheapest.

Nothing has to be remembered about the days in between.

---

### How to think about it

Checking every pair of days is the direct reading of the problem and it is $O(n^2)$. The observation that collapses it is that the buy day is **never a free choice**: for any sell day, the best buy is simply the minimum before it, and that minimum is easy to carry forward.

The order inside the loop matters.

```text
work out today's profit first, using the cheapest from BEFORE today
then update the cheapest to include today
```

Updating first would let the same day serve as both the buy and the sell, giving a profit of zero. That is harmless here but wrong in spirit, and it becomes a real bug in variants where same-day trading changes the answer.

A falling market needs no special case. The profit on every day comes out negative, never beats the starting record of zero, and the answer stays `0`, which is exactly what the problem asks for.

---

### Walking through the example

Take `prices = [7, 1, 5, 3, 6, 4]`, with the cheapest starting at infinity and the best profit at `0`.

1. **Day price `7`.** No cheaper price exists yet, so no profit. The cheapest becomes `7`.
2. **Price `1`.** Selling at `1` after buying at `7` loses money, so the record stays `0`. The cheapest becomes `1`.
3. **Price `5`.** Selling now makes `5 - 1 = 4`, a new record.
4. **Price `3`.** Selling makes `2`, which does not beat `4`.
5. **Price `6`.** Selling makes `5`, a new record.
6. **Price `4`.** Selling makes `3`, no improvement.

The answer is `5`, from buying at `1` and selling at `6`.

---

### The code

```python
class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        cheapest = float("inf")
        best = 0

        for price in prices:
            # today's profit uses the cheapest price from before today
            best = max(best, price - cheapest)

            # only then does today become a candidate buy
            cheapest = min(cheapest, price)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, with two comparisons per day. Testing every buy and sell pair would be $O(n^2)$.

#### Space: $O(1)$

Two numbers, whatever the length of the input.

---

### Remember this

For any sell day the best buy is just the cheapest price before it, so carry that minimum and the best profit and never look back. Compute today's profit **before** folding today into the minimum, so one day cannot be both the buy and the sell. A market that only falls returns `0` with no special case. $O(n)$ time, $O(1)$ space.
