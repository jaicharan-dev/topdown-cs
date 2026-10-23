---
id: 1-climbing-stairs
title: "70. Climbing Stairs"
description: "You arrive at a step from one of two places, so add those two counts"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Space Optimization</span>

> **Problem Statement:** A staircase has `n` steps, and you climb either one or two at a time. Count the distinct ways to reach the top.

```text
Input:  n = 3
Output: 3
```

---

### Picture it

Stand on step `n` and look back. You got here from exactly one of two places: step `n - 1` with a single step, or step `n - 2` with a double.

There are no other options, and those two groups of routes never overlap, since they differ in the last move. So:

```text
ways to reach step n = ways to reach n - 1 + ways to reach n - 2
```

Every route to step `n - 1` becomes a distinct route to `n` by adding a small step, and likewise for `n - 2`.

That is the whole of dynamic programming in one sentence: **a big answer written in terms of smaller ones**. Work out the small answers first and the big one assembles itself.

---

### How to think about it

The small cases come first. There is one way to be on step `1`, and two ways to reach step `2`, either two singles or one double.

Then each step upward is one addition. You will recognise the sequence: these are the Fibonacci numbers, arriving through counting rather than through any formula.

**The memory optimisation** is what makes this a good first problem. An array of `n + 1` entries is the obvious implementation, but look at the formula again: it only ever reaches back **two** places. Everything older is dead weight. So two variables are enough, shuffled forward on each step.

That move, noticing how far back the formula actually reaches and keeping only that much, recurs throughout this block. House Robber uses the same trick, and so does Decode Ways.

Solving it the other way round, recursively from `n` downward, computes the same values over and over and takes exponential time unless results are cached. Building upward avoids the question entirely.

---

### Walking through the example

Take `n = 3`.

1. **Step 1** has `1` way: a single step.
2. **Step 2** has `2` ways: two singles, or one double.
3. **Step 3** is `2 + 1 = 3` ways: arriving from step `2` in any of its two ways, or from step `1` in its one way.

The answer is `3`, namely `1+1+1`, `1+2` and `2+1`.

---

### The code

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n

        # the formula reaches back only two places, so two variables suffice
        two_back, one_back = 1, 2

        for _ in range(3, n + 1):
            two_back, one_back = one_back, one_back + two_back

        return one_back
```

---

### Time and space complexity

#### Time: $O(n)$

One addition per step.

#### Space: $O(1)$

Two numbers. The array version is $O(n)$ and is worth writing first if the formula is unclear, then reduced once it is.

The plain recursive version, without caching, is $O(2^n)$, because it recomputes the same steps repeatedly. For `n = 40` that is over a billion calls against forty additions.

---

### Remember this

Look backwards from a step: you arrived from one below or two below, so the counts add. Build upward from the small cases instead of recursing downward, and once you see the formula only reaches back two places, drop the array for two variables. $O(n)$ time, $O(1)$ space.
