---
id: 3-number-of-1-bits
title: "191. Number of 1 Bits"
description: "n AND n minus one erases the lowest set bit, so count how often you can do it"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Brian Kernighan's Algorithm</span>

> **Problem Statement:** Given a positive integer, count the `1`s in its binary form.

```text
Input:  n = 11
Output: 3
```

---

### Picture it

The obvious method checks all 32 bit positions, counting the ones that are set. That works and always costs 32 steps, even for a number with a single `1` in it.

There is a sharper tool. Subtracting one from a number does something very specific to its bits:

```text
n      = 1011000
n - 1  = 1010111
```

The lowest `1` becomes `0`, and every `0` below it becomes `1`. Everything above is untouched.

Now AND the two together. Above the lowest `1` the bits agree, so they survive. At the lowest `1` the two differ, so it is wiped. Below it they are opposites everywhere, so all of them vanish:

```text
n & (n - 1) = 1010000
```

The effect is to **erase exactly one `1`**, the lowest. So count how many times you can do it before nothing is left, and that count is the number of `1`s.

---

### How to think about it

Loop while the number is not zero, applying `n = n & (n - 1)` and counting each time.

The loop runs once per `1` bit rather than once per bit position. For a number with three `1`s it takes three steps regardless of how wide the number is, which is the gain over checking every position.

This is Brian Kernighan's algorithm, and the identity is worth keeping because it shows up elsewhere. Counting Bits uses it, and Power of Two uses the fact that it leaves zero when there is only one `1`.

In Python, `bin(n).count("1")` gets the answer in a line, and it is fine to mention. Write the loop anyway, since the question is really asking whether you know the trick.

---

### Walking through the example

Take `n = 11`, which is `1011` in binary.

1. **`1011 & 1010 = 1010`.** The lowest `1`, the final bit, is erased. Count `1`.
2. **`1010 & 1001 = 1000`.** The lowest remaining `1` is erased. Count `2`.
3. **`1000 & 0111 = 0000`.** The last `1` is erased. Count `3`.

The number is zero, so the loop ends. The answer is `3`.

Three steps for three `1`s, where checking every position would have taken 32.

---

### The code

```python
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0

        while n:
            n &= n - 1   # erases the lowest 1, and nothing else
            count += 1

        return count
```

---

### Time and space complexity

#### Time: $O(k)$, where `k` is the number of `1`s

Checking every position is $O(32)$, or $O(w)$ for a width of `w`. This loop runs only as many times as there are `1`s, so it is faster whenever the number is sparse and never slower.

#### Space: $O(1)$

A counter.

---

### Remember this

`n & (n - 1)` erases the lowest `1` bit and leaves everything above it alone, because subtracting one flips that bit and everything below it. Loop until the number is zero, counting the erasures, which costs one step per `1` rather than one per bit position. The same identity reappears in Counting Bits and Power of Two. $O(k)$ time, $O(1)$ space.
