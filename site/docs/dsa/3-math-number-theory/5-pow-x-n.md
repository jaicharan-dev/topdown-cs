---
id: 5-pow-x-n
title: "50. Pow(x, n)"
description: "Square the base and halve the exponent instead of multiplying n times"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Exponentiation</span>

> **Problem Statement:** Write `myPow(x, n)`, which raises `x` to the power `n`. The exponent can be negative.

```text
Input:  x = 2.00000, n = 10
Output: 1024.00000
```

---

### Picture it

Multiplying `x` by itself `n` times is the obvious way, and for a large `n` it is a very long afternoon.

The shortcut is that squaring doubles the exponent for free:

```text
x squared        has exponent 2
that squared     has exponent 4
that squared     has exponent 8
```

Three multiplications got you to `x` to the eighth, where the plain approach would have taken eight. Every squaring doubles your progress, so you cover a huge exponent in very few steps.

The only question left is what to do with exponents that are not neat powers of two.

---

### How to think about it

Work the problem from the exponent's side, halving it each pass.

Keep two things: a `result` that starts at `1`, and a running `base` that starts at `x`. Then repeat until the exponent reaches zero:

- **If the exponent is odd**, multiply the current base into `result`. Halving an odd number throws away a remainder of one, and that remainder is exactly one copy of the current base. Banking it into `result` is how you keep it.
- **Square the base**, which is what makes it worth twice as much on the next pass.
- **Halve the exponent**, rounding down.

This is the exponent's binary representation being read from the right. Each bit that is set contributes one squared base to the answer. `10` in binary is `1010`, so the answer for `n = 10` is built from the base after one squaring and the base after three squarings, which is `x` to the `2` times `x` to the `8`.

**A negative exponent** means a reciprocal, since `x` to the minus `n` is one over `x` to the `n`. Handle it once at the start by replacing `x` with `1 / x` and making `n` positive, and the rest of the loop never has to think about signs.

---

### Walking through the example

Take `x = 2` and `n = 10`, with `result` at `1` and `base` at `2`.

1. **`n` is `10`, even.** Nothing to bank. Square the base to `4`, halve `n` to `5`.
2. **`n` is `5`, odd.** Bank the base: `result` becomes `4`. Square the base to `16`, halve `n` to `2`.
3. **`n` is `2`, even.** Nothing to bank. Square the base to `256`, halve `n` to `1`.
4. **`n` is `1`, odd.** Bank the base: `result` becomes `4 * 256 = 1024`. Halve `n` to `0`, so the loop ends.

The answer is `1024`, reached in four passes rather than ten multiplications. For an exponent in the billions the gap becomes absurd: about thirty passes against a billion.

---

### The code

```python
class Solution:
    def myPow(self, x: float, n: int) -> float:
        # a negative exponent is just the reciprocal raised to a positive one
        if n < 0:
            x = 1 / x
            n = -n

        result = 1.0
        while n:
            # an odd exponent leaves one copy of the base behind, so bank it
            if n % 2:
                result *= x

            x *= x
            n //= 2

        return result
```

---

### Time and space complexity

#### Time: $O(\log n)$

The exponent is halved on every pass, so the number of passes is however many times `n` can be halved before reaching zero. That is the logarithm of `n` in base two.

An exponent of one billion takes about thirty passes. The plain approach would take a billion multiplications. This is the same reason binary search is fast: repeatedly halving a number gets to zero remarkably quickly.

#### Space: $O(1)$

Two numbers and the exponent, updated in place. Writing this recursively instead is just as valid and often reads more cleanly, but it costs $O(\log n)$ stack frames, so the loop is the better answer when memory is being asked about.

---

### Remember this

Square the base and halve the exponent, banking one copy of the base into the answer whenever the exponent is odd. That turns `n` multiplications into about $\log n$ of them. Deal with a negative exponent once at the start by inverting `x`, so the loop stays sign-free. $O(\log n)$ time, $O(1)$ space when written as a loop.
