---
id: 4-counting-bits
title: "338. Counting Bits"
description: "Erase one bit and you land on a smaller number whose answer you already have"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Programming</span>

> **Problem Statement:** Given a number `n`, return a list where entry `i` is the count of `1`s in the binary form of `i`, for every `i` from `0` to `n`.

```text
Input:  n = 5
Output: [0, 1, 1, 2, 1, 2]
```

---

### Picture it

Counting each number separately works and repeats a lot of effort. The better idea is that each answer can be built from an **earlier** one, which makes this a dynamic programming problem wearing bitwise clothing.

Take the identity from the previous problem: `i & (i - 1)` erases the lowest `1` bit. The result is a smaller number, so its answer is already computed. And since exactly one bit was erased:

```text
bits(i) = 1 + bits(i & (i - 1))
```

One lookup and one addition per number, with no loop over bit positions at all.

---

### How to think about it

Fill an array from `0` to `n`. Zero has no `1`s. Every other entry is one more than the entry at `i & (i - 1)`, which is always smaller than `i` and therefore already filled.

That "always smaller" is what makes the single forward pass valid, and it is the thing to state when asked why this works.

**The other common formulation** uses halving: `bits(i) = bits(i >> 1) + (i & 1)`. Shifting right drops the last bit, so the count is whatever the rest of the number had, plus one if the dropped bit was a `1`. It is equally valid and some find it more intuitive, since it reads as "the same number with its last digit removed".

Both are one line and both are $O(n)$. The erasing version is worth preferring slightly, because it reuses an identity you already know from Number of 1 Bits rather than introducing a second one.

What to avoid is calling a bit-counting routine for each number separately. That is $O(n \log n)$ and misses the point of the question, which is to spot that the answers build on each other.

---

### Walking through the example

Take `n = 5`.

1. **0** has no `1`s, so the entry is `0`.
2. **1** is `1`. Erasing its lowest `1` gives `0`, whose answer is `0`, so this is `1`.
3. **2** is `10`. Erasing gives `0`, so this is `1`.
4. **3** is `11`. Erasing gives `10`, which is `2`, whose answer is `1`, so this is `2`.
5. **4** is `100`. Erasing gives `0`, so this is `1`.
6. **5** is `101`. Erasing gives `100`, which is `4`, whose answer is `1`, so this is `2`.

The result is `[0, 1, 1, 2, 1, 2]`.

Notice that every lookup reached a number already filled in, which is exactly the property the single pass relies on.

---

### The code

```python
class Solution:
    def countBits(self, n: int) -> list[int]:
        bits = [0] * (n + 1)

        for i in range(1, n + 1):
            # erasing the lowest 1 lands on a smaller, already-known number
            bits[i] = 1 + bits[i & (i - 1)]

        return bits
```

---

### Time and space complexity

#### Time: $O(n)$

One lookup and one addition per number. Counting each number from scratch would be $O(n \log n)$.

#### Space: $O(n)$

The output array, which is the answer rather than working memory. Nothing else is kept.

---

### Remember this

Each answer builds on a smaller one, which makes this dynamic programming in disguise. Erasing the lowest `1` with `i & (i - 1)` lands on a smaller number whose count is already known, so the answer is one more than it. The halving form, `bits[i >> 1] + (i & 1)`, is equally good. Either way the point is to reuse earlier answers rather than count each number independently. $O(n)$ time.
