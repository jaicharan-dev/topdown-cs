---
id: 5-power-of-two
title: "231. Power of Two"
description: "A power of two has exactly one bit set, so erasing it must leave nothing"
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Masking</span>

> **Problem Statement:** Given an integer, say whether it is a power of two.

```text
Input:  n = 16
Output: true
```

---

### Picture it

Write a few powers of two in binary and the pattern is immediate:

```text
1    =  1
2    =  10
4    =  100
8    =  1000
16   =  10000
```

Exactly one bit set, every time. That is what being a power of two **means** in binary, in the same way that powers of ten are a `1` followed by zeros in decimal.

So the question becomes: does this number have exactly one `1` bit?

And the identity from Number of 1 Bits answers it in one step. Since `n & (n - 1)` erases the lowest set bit, a number with exactly one set bit becomes **zero**, while a number with more than one keeps something.

```text
16 & 15  =  10000 & 01111  =  0        one bit, so nothing remains
12 & 11  =  1100  & 1011   =  1000     two bits, so something remains
```

---

### How to think about it

The whole test is `n > 0 and (n & (n - 1)) == 0`.

**The positive check is not optional.** Zero passes the bitwise part, since `0 & -1` is `0`, and zero is not a power of two. Negative numbers can also slip through in languages using two's complement. That guard is what the question is quietly testing, alongside the trick itself.

Alternatives exist and are worth a sentence each. Dividing by two repeatedly and checking for a remainder works and takes $O(\log n)$ steps rather than one. Counting the bits and comparing to one is the same idea spelled out longer. For 32-bit integers there is also the neat fact that `2^30` is divisible by every power of two up to it, so a single modulo test suffices, which is cute and inflexible.

The bitwise test is the expected answer because it is constant time and says exactly what the property is.

---

### Walking through the example

Take `n = 16`, which is `10000`.

1. **It is positive**, so the guard passes.
2. **`16 - 1` is `15`**, which is `01111`.
3. **AND them:** no position holds a `1` in both, so the result is `0`.

The result is zero, so the answer is `true`.

Now take `n = 12`, which is `1100`. Subtracting one gives `1011`. The AND leaves `1000`, which is not zero, so the answer is `false`, and `12` is indeed `4 × 3` rather than a power of two.

Finally `n = 0`: the bitwise part gives `0` and would wrongly say `true`, which is precisely why the positive guard comes first.

---

### The code

```python
class Solution:
    def isPowerOfTwo(self, n: int) -> bool:
        # the guard matters: zero passes the bitwise test but is not a power
        return n > 0 and (n & (n - 1)) == 0
```

---

### Time and space complexity

#### Time: $O(1)$

One subtraction, one AND, two comparisons, regardless of the size of the number. The repeated-division approach is $O(\log n)$.

#### Space: $O(1)$

Nothing is stored.

---

### Remember this

A power of two is exactly one `1` bit in binary, and `n & (n - 1)` erases the lowest set bit, so the test is whether that leaves zero. Guard with `n > 0` first, since zero passes the bitwise part and is not a power of two. $O(1)$ time, and the same identity that counts bits in Number of 1 Bits.
