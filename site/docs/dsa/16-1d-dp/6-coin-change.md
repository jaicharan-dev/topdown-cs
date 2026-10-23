---
id: 6-coin-change
title: "322. Coin Change"
description: "To make an amount, try every coin as the last one and take the best remainder"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Knapsack</span>

> **Problem Statement:** Given coin denominations and a target amount, return the fewest coins that add up to it, or `-1` if it cannot be made. Each denomination is available in unlimited supply.

```text
Input:  coins = [1, 2, 5], amount = 11
Output: 3
```

---

### Picture it

The tempting approach is to take the largest coin that fits, repeatedly. It is fast and it is **wrong**. With coins of `1`, `3` and `4` making `6`, greed takes `4` then `1` then `1`, which is three coins, while `3 + 3` is two. No greedy rule works for arbitrary denominations, which is exactly why this is a dynamic programming problem.

So consider every possibility instead. To make an amount, some coin has to be the last one laid down. If it is a `5`, the rest of the pile makes `amount - 5`, and you want that rest to be as small as possible, which is a smaller version of the same question.

```text
best(amount) = 1 + the smallest best(amount - coin) over every coin that fits
```

Compute the small amounts first and each larger one is a quick scan over the coins.

---

### How to think about it

Build an array holding the fewest coins for every amount from `0` up to the target.

**Amount zero needs zero coins.** That is the base, and it is what every chain eventually bottoms out on.

**Every other amount starts as unreachable**, a value larger than any real answer. Using infinity, or `amount + 1`, means an unreachable remainder can never win a comparison.

Then for each amount in turn, try every coin that fits and take the best result. At the end, the target's entry is the answer unless it is still the unreachable marker, in which case return `-1`.

The unreachable marker is what makes the impossible case work without extra logic. With coins of `2` making `3`, every chain reaches an odd remainder that stays unreachable, so the answer stays unreachable too.

Looping over the **amounts** on the outside and the **coins** inside is what allows a coin to be reused, since nothing stops the same coin being chosen at several amounts. That is the unbounded case, and the ordering is what distinguishes it from the counting version in the 2D block.

---

### Walking through the example

Coins `1, 2, 5`, target `11`.

1. **Amount 1.** Only the `1` fits, giving `1 + best(0) = 1`.
2. **Amount 2.** The `1` gives `1 + best(1) = 2`; the `2` gives `1 + best(0) = 1`. Best is `1`.
3. **Amount 5.** The `5` gives `1 + best(0) = 1`, beating the alternatives.
4. **Amount 6.** The `1` gives `1 + best(5) = 2`; the `2` gives `1 + best(4) = 3`; the `5` gives `1 + best(1) = 2`. Best is `2`.
5. **Amount 11.** The `1` gives `1 + best(10) = 3`; the `2` gives `1 + best(9) = 4`; the `5` gives `1 + best(6) = 3`. Best is `3`.

The answer is `3`: `5 + 5 + 1`.

---

### The code

```python
class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        UNREACHABLE = amount + 1   # larger than any real answer
        best = [UNREACHABLE] * (amount + 1)
        best[0] = 0                # nothing costs no coins

        for value in range(1, amount + 1):
            for coin in coins:
                if coin <= value:
                    # this coin last, plus the best way to make the rest
                    best[value] = min(best[value], 1 + best[value - coin])

        return best[amount] if best[amount] != UNREACHABLE else -1
```

---

### Time and space complexity

#### Time: $O(\text{amount} \times \text{number of coins})$

Every amount is considered once against every coin.

#### Space: $O(\text{amount})$

The array. Unlike the earlier problems in this block, the formula reaches back by the coin values, which can be anything, so the whole array has to be kept.

---

### Remember this

Greedy fails for arbitrary denominations, so try every coin as the **last** one and take the best remainder, which is the same question on a smaller amount. Build upward from zero, mark everything unreachable to begin with so impossible amounts never win a comparison, and loop amounts outside with coins inside so coins can be reused.
