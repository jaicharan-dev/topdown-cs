---
id: 11-perfect-squares
title: "279. Perfect Squares"
description: "Coin Change where the coins are the square numbers"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Knapsack</span>

> **Problem Statement:** Given a number `n`, return the fewest perfect squares that add up to it.

```text
Input:  n = 12
Output: 3
```

---

### Picture it

This is **Coin Change** with the denominations handed to you by arithmetic rather than by the input. The coins are `1, 4, 9, 16, 25` and so on, every square up to `n`, and each may be used as often as you like.

So the same reasoning applies. To build `n`, one square has to be the last one added. If it is `9`, the rest makes `n - 9`, and you want that rest to use as few squares as possible, which is the same question on a smaller number.

```text
best(n) = 1 + the smallest best(n - square) over every square that fits
```

Recognising the restatement is most of the work here. Once it is Coin Change, the implementation is already known.

Note that greed fails just as it did there. For `12`, taking the largest square first gives `9 + 1 + 1 + 1`, four squares, while `4 + 4 + 4` is three.

---

### How to think about it

Build an array of best counts from `0` up to `n`.

**Zero needs no squares.** Every other entry starts as unreachable, though here nothing actually is: every number can be made from `1`s, so the answer always exists and no `-1` case is needed. That is the one simplification over Coin Change.

For each value, try every square up to it and keep the smallest result.

Generating the squares as you go, with an inner loop over `i` while `i * i` is at most the value, avoids building a list first and makes the bound obvious: there are about the square root of `n` squares to try.

**The number-theory shortcut** is worth knowing because interviewers enjoy it. Lagrange's four-square theorem says every positive integer is the sum of at most four squares, and there are simple tests for whether the answer is `1`, `2` or `4`, leaving `3` otherwise. That gives an $O(\sqrt{n})$ solution. It is a fine thing to mention; the dynamic programming version is the one to write, since it generalises and does not depend on recalling a theorem.

---

### Walking through the example

Take `n = 12`.

1. **Value 1.** Only `1` fits, giving `1 + best(0) = 1`.
2. **Value 4.** The square `4` gives `1 + best(0) = 1`, beating four `1`s.
3. **Value 8.** The square `4` gives `1 + best(4) = 2`, which is `4 + 4`.
4. **Value 9.** The square `9` gives `1`.
5. **Value 12.** The square `1` gives `1 + best(11)`; the square `4` gives `1 + best(8) = 3`; the square `9` gives `1 + best(3) = 4`, since `3` needs three `1`s. The best is `3`.

The answer is `3`, from `4 + 4 + 4`.

Step 5 shows the greedy failure plainly: starting from the largest square, `9`, leads to four, while `4` leads to three.

---

### The code

```python
class Solution:
    def numSquares(self, n: int) -> int:
        best = [0] * (n + 1)

        for value in range(1, n + 1):
            fewest = value          # the worst case is that many 1s
            i = 1

            while i * i <= value:
                # this square last, plus the best way to make the rest
                fewest = min(fewest, 1 + best[value - i * i])
                i += 1

            best[value] = fewest

        return best[n]
```

Seeding `fewest` with `value` itself is a tidy touch: it is the count of using nothing but `1`s, which is always achievable, so no unreachable marker is needed.

---

### Time and space complexity

#### Time: $O(n \sqrt{n})$

Every value from `1` to `n` is tried against roughly the square root of `n` squares.

#### Space: $O(n)$

The array of best counts.

---

### Remember this

This is Coin Change with the squares as denominations, and greed fails here for the same reason: `12` is `4 + 4 + 4`, not `9 + 1 + 1 + 1`. Build upward, trying every square as the last one added. No unreachable case exists, since `1` is a square, so seeding each value with its own count of `1`s is enough. $O(n \sqrt{n})$ time.
