---
id: 4-coin-change-ii
title: "518. Coin Change II"
description: "Loop coins on the outside, and each combination gets counted exactly once"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Knapsack</span>

> **Problem Statement:** Given coin denominations and an amount, count the combinations that make it. Coins are unlimited, and two combinations differ only by which coins they use, not the order.

```text
Input:  amount = 5, coins = [1, 2, 5]
Output: 4
```

---

### Picture it

Coin Change asked for the fewest coins. This asks **how many** ways, and that one word changes which loop goes on the outside.

The trap is real. Write the loops as in Coin Change, amounts outside and coins inside, and the answer comes out far too large, because `1 + 2` and `2 + 1` are both counted. The problem considers them the same combination.

The fix is to decide the coins in a fixed order. Think of it as considering one denomination at a time:

```text
using only 1s:          one way to make each amount
now allowing 2s:        more ways appear
now allowing 5s:        more again
```

Because a combination is built by taking some number of `1`s, then some number of `2`s, then some `5`s, and never revisiting a denomination, each combination is produced exactly once.

---

### How to think about it

Keep a row of counts, one per amount from `0` to the target. Start with `1` way to make zero, by taking nothing, and `0` everywhere else.

Then for each coin, walk the amounts **upward** from the coin's value, adding the count from `amount - coin` to the count at `amount`.

Two loop details, and between them they define the problem:

**Coins on the outside.** This is what makes order irrelevant. Amounts outside would count permutations instead, which is the answer to a genuinely different question, "in how many ordered ways", and is worth naming so the distinction sticks.

**Amounts upward.** This allows a coin to be used repeatedly, since a count already improved by this coin is read again at a larger amount. Walking downward, as in Partition Equal Subset Sum, would allow each coin only once.

Those two choices, which loop is outer and which direction the inner one runs, cover all four variants of the knapsack family:

```text
coins outer, amounts up    combinations, unlimited coins   (this problem)
coins outer, amounts down  combinations, one of each       (subset sum)
amounts outer, coins inner permutations, unlimited coins
```

---

### Walking through the example

Target `5` with coins `1, 2, 5`. Counts start as `1, 0, 0, 0, 0, 0`.

**After allowing 1s:** every amount has exactly one way, all `1`s. Counts are `1, 1, 1, 1, 1, 1`.

**After allowing 2s:** amount `2` gains the way from amount `0`, giving `2`. Amount `3` gains from `1`, giving `2`. Amount `4` gains from `2`, which is now `2`, giving `3`. Amount `5` gains from `3`, giving `3`. Counts are `1, 1, 2, 2, 3, 3`.

**After allowing 5s:** amount `5` gains the way from amount `0`, giving `4`.

The answer is `4`: `5`, `2+2+1`, `2+1+1+1`, and `1+1+1+1+1`.

---

### The code

```python
class Solution:
    def change(self, amount: int, coins: list[int]) -> int:
        ways = [0] * (amount + 1)
        ways[0] = 1   # one way to make nothing: take no coins

        # coins outside, so each combination is built in one fixed order
        for coin in coins:
            # upward, so this coin may be used repeatedly
            for value in range(coin, amount + 1):
                ways[value] += ways[value - coin]

        return ways[amount]
```

---

### Time and space complexity

#### Time: $O(\text{amount} \times \text{number of coins})$

Every coin is swept across every amount once.

#### Space: $O(\text{amount})$

One row. The textbook version is a full table of coins against amounts, and the row is what remains after noticing that each coin's pass only reads the row it is updating.

---

### Remember this

Counting combinations rather than minimising count flips which loop goes outside. **Coins outer** fixes a single order for building each combination, so `1 + 2` and `2 + 1` are not counted twice; amounts outer would count permutations instead. **Amounts upward** lets coins repeat, where downward would allow one of each. Seed one way to make zero. $O(\text{amount} \times \text{coins})$ time.
