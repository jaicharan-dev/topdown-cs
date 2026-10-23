---
id: 6-sum-of-two-integers
title: "371. Sum of Two Integers"
description: "XOR adds without carrying, AND finds the carries, so repeat until none are left"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bitwise Adder</span>

> **Problem Statement:** Add two integers without using `+` or `-`.

```text
Input:  a = 2, b = 3
Output: 5
```

---

### Picture it

Addition on paper has two halves: adding the digits in each column, and carrying into the next column when a column overflows. Binary addition is the same, and each half has its own bitwise operator.

**XOR is addition without carrying.** In each position, `0 + 1` gives `1` and `1 + 1` gives `0`, which is exactly what XOR does.

**AND finds where the carries are.** A carry happens precisely where both bits are `1`, and it lands one position to the left, so shift the result left by one.

```text
a = 0101
b = 0011

a ^ b        = 0110     the sum, ignoring carries
(a & b) << 1 = 0010     the carries, moved into place
```

Neither alone is the answer. But adding those two together is a smaller version of the same problem, so repeat: take the partial sum and the carries as the new pair, and keep going until there are no carries left.

---

### How to think about it

Loop while the carry is non-zero:

1. **The carry** is `(a & b) << 1`.
2. **`a`** becomes `a ^ b`, the carry-free sum.
3. **`b`** becomes the carry.

When `b` reaches zero, `a` holds the answer. The loop terminates because each round pushes the carries further left, and they eventually fall off the end.

**Python needs extra care**, and this is the part that makes an otherwise tidy problem fiddly. Its integers are unbounded and negative numbers behave as though they have infinitely many leading `1`s, so the carry never dies and the loop spins forever.

The fix is to work inside a 32-bit window: mask both values to 32 bits after each round, and at the end decide whether the result should be read as negative. If the sign bit is set, convert it back by flipping the bits within the mask and negating.

In C or Java none of this is needed, because the arithmetic is already 32-bit. Saying that out loud is worth as much as the code, since it shows you know the masking is a language workaround rather than part of the algorithm.

---

### Walking through the example

Add `2` and `3`, which are `010` and `011`.

1. **Round one.** The carry-free sum is `010 ^ 011 = 001`. The carries are `(010 & 011) << 1 = 010 << 1 = 100`. So the new pair is `001` and `100`.
2. **Round two.** The sum is `001 ^ 100 = 101`. The carries are `(001 & 100) << 1 = 0`. No carries remain.

The loop ends with `101`, which is `5`.

---

### The code

```python
class Solution:
    def getSum(self, a: int, b: int) -> int:
        MASK = 0xFFFFFFFF
        LIMIT = 0x7FFFFFFF   # the largest positive 32-bit value

        a, b = a & MASK, b & MASK

        while b:
            carry = ((a & b) << 1) & MASK   # where both bits are 1
            a = (a ^ b) & MASK              # the sum without carries
            b = carry

        # read the result back as a signed 32-bit number
        return a if a <= LIMIT else ~(a ^ MASK)
```

---

### Time and space complexity

#### Time: $O(1)$

Each round moves every carry one place left, and a 32-bit value runs out of places after at most 32 rounds. That is a fixed ceiling, so it counts as constant.

#### Space: $O(1)$

Three numbers.

---

### Remember this

Split addition into its two halves: XOR is the sum ignoring carries, and `(a & b) << 1` is the carries put where they belong. Feed those back as the new pair and repeat until no carries remain. In Python the loop needs a 32-bit mask and a signed conversion at the end, because unbounded integers never let a negative carry die; in a fixed-width language the plain loop is enough.
