---
id: 5-power-of-two
title: "231. Power of Two"
description: "Check if an integer is a power of two in O(1) time using bitwise isolation"
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Masking</span>

> **Problem Statement:** Given an integer `n`, return `true` if it is a power of two. Otherwise, return `false`. An integer `n` is a power of two if there exists an integer `x` such that $n == 2^x$.

```text
Input:  n = 16
Output: true
Explanation: 2^4 = 16, which is a power of two.
```

---

### The Intuitive Mental Model

We need to determine if an integer can be expressed as $2^x$ where $x \ge 0$.

#### Brute Force: Iterative Division by 2
The traditional approach divides `n` repeatedly:
- If `n <= 0`, it cannot be a power of two.
- While `n % 2 == 0`, divide `n` by 2.
- If `n` eventually reduces to 1, return `true`; otherwise return `false`.
- This approach takes $O(\log n)$ time, requiring up to 31 division and modulo operations.

#### Optimal Approach: Single Bit Masking via n & (n - 1)
Observing powers of two in binary reveals a key pattern:
- $1 = 2^0 = 0000\,0001_2$
- $2 = 2^1 = 0000\,0010_2$
- $4 = 2^2 = 0000\,0100_2$
- $8 = 2^3 = 0000\,1000_2$
- $16 = 2^4 = 0001\,0000_2$

In binary, **every positive power of two contains exactly one set bit (`1`)**.

Subtracting 1 from a power of two flips that single `1` bit to `0`, while turning all lower trailing zeros to `1`s:
- $16 = 10000_2 \implies 15 = 01111_2$

Because $n$ and $n - 1$ share no set bits in common, taking their bitwise AND clears the only `1` bit and results in strictly zero:
$$n \, \& \, (n - 1) == 0$$

If any other set bits existed (such as in $12 = 1100_2$), clearing the lowest set bit leaves the remaining bits intact ($12 \, \& \, 11 = 8 \ne 0$). Combined with a positivity check ($n > 0$), this evaluates in a single CPU instruction.

#### Execution Walkthrough

Let us trace several inputs against the bitwise clearing test:

| Candidate (`n`) | Binary (`n`) | Binary (`n - 1`) | Bitwise AND (`n & (n - 1)`) | Positivity (`n > 0`) | Result | Explanation |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **16** | `10000_2` | `01111_2` | `00000_2` | True | `True` | Single set bit cleared to zero |
| **12** | `01100_2` | `01011_2` | `01000_2` | True | `False` | Multiple set bits; leaves bit 3 intact |
| **1** | `00001_2` | `00000_2` | `00000_2` | True | `True` | $2^0 = 1$; valid boundary power of two |
| **0** | `00000_2` | - | - | False | `False` | Fails positivity condition $n > 0$ |
| **-16** | Two's comp. | - | - | False | `False` | Negative values cannot be powers of two |

---

### Step-by-Step Algorithm

1. **Check Positivity:** Confirm that $n > 0$, eliminating zero and negative integers.
2. **Clear Single Bit:** Evaluate `(n & (n - 1)) == 0`. If $n$ contains only one set bit, this expression equals zero.
3. **Return Result:** Return `n > 0 and (n & (n - 1)) == 0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bitwise AND Masking" default>

```python
class Solution:
    def isPowerOfTwo(self, n: int) -> bool:
        # A power of two must be positive and have exactly one set bit
        return n > 0 and (n & (n - 1)) == 0
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative Division">

```python
class Solution:
    def isPowerOfTwo(self, n: int) -> bool:
        if n <= 0:
            return False

        while n % 2 == 0:
            n //= 2

        return n == 1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Bitwise AND Masking** | $O(1)$ | $O(1)$ | Evaluates in a single constant-time CPU operation without branching loops. |
| **Iterative Division** | $O(\log n)$ | $O(1)$ | Performs repeated arithmetic divisions. Simple but requires up to 31 loop cycles. |

---

### Common Pitfall: Omitting the Positivity Guard

A common mistake is checking only `(n & (n - 1)) == 0` without verifying $n > 0$.

For $n = 0$, evaluating $0 \, \& \, (-1)$ yields $0$, which falsely identifies 0 as a power of two. In addition, in fixed-width signed 32-bit representations, the most negative number $-2147483648$ has only its sign bit set, which could also evaluate to 0 under certain bit manipulations. Guarding with `n > 0` is strictly necessary.

---

### Concise Interview Takeaway

For **Power of Two**, positive powers of two contain exactly one set bit in binary. Test both conditions simultaneously: $n > 0 \text{ and } (n \, \& \, (n - 1)) == 0$ to solve the problem in $O(1)$ time and $O(1)$ space.
