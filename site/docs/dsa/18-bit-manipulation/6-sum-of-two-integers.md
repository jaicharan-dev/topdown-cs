---
id: 6-sum-of-two-integers
title: "371. Sum of Two Integers"
description: "Add two integers without + or - operators using half-adder logic and 32-bit masking"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bitwise Adder</span>

> **Problem Statement:** Given two integers `a` and `b`, return the sum of the two integers without using the operators `+` and `-`.

```text
Input:  a = 2, b = 3
Output: 5
Explanation: 2 + 3 = 5, evaluated purely via bitwise logic.
```

---

### The Intuitive Mental Model

Adding two numbers without arithmetic operators requires simulating how an Arithmetic Logic Unit (ALU) performs addition at the hardware transistor level using digital logic gates.

#### Brute Force: Successor and Predecrement Sequences
One could theoretically model addition without `+` by using increment and decrement steps (shifting values along the number line). However, this takes $O(|b|)$ operations, scales poorly for large inputs, and typically relies on built-in arithmetic successor functions.

#### Optimal Approach: Digital Half-Adder Circuit Simulation
A hardware half-adder separates addition into two independent bitwise components:

1. **Sum Without Carry:**
   Single-bit addition without carrying behaves identically to Bitwise XOR ($\oplus$):
   - $0 \oplus 0 = 0$
   - $1 \oplus 0 = 1$
   - $0 \oplus 1 = 1$
   - $1 \oplus 1 = 0$ (the sum bit is 0, generating a carry bit)
   $$\text{sum} = a \oplus b$$

2. **Carry Calculation:**
   A carry bit is generated if and only if both bits are 1 ($1 + 1$). This corresponds to Bitwise AND ($\&$). Because carries propagate to the next higher-order bit position (leftward), we shift the carry left by 1 bit:
   $$\text{carry} = (a \, \& \, b) \ll 1$$

3. **Loop Until No Carry:**
   By updating $a = \text{sum}$ and $b = \text{carry}$, we repeat the addition until $b = 0$, at which point all carry bits have fully propagated and settled.

#### Handling Python's Arbitrary-Precision Integers
In statically typed languages like C++ or Java, 32-bit signed integers overflow naturally and terminate. In Python, integers have arbitrary precision (unbounded bit length). A negative number in Python has an infinite sequence of leading sign bits (`...11111111`), which causes carry propagation to continue indefinitely.

To prevent an infinite loop in Python:
- Mask each calculation with `0xFFFFFFFF` (32 ones) to force 32-bit two's complement behavior.
- When $b = 0$, check if $a > \text{0x7FFFFFFF}$. If true, the 32nd bit is set, indicating a negative number in two's complement. We convert it back to Python's negative format using `~(a ^ mask)`.

#### Execution Walkthrough

Let us trace $a = 2$ (`0010_2`) and $b = 3$ (`0011_2`):

| Step | `a` (Binary) | `b` (Binary) | Partial Sum (`(a ^ b) & mask`) | Carry (`((a & b) << 1) & mask`) | Next `a` | Next `b` | Explanation |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `2` (`0010_2`) | `3` (`0011_2`) | `0001_2` (`1`) | `0100_2` (`4`) | `1` | `4` | $2 \oplus 3 = 1$; carry at bit 1 shifts left to bit 2 |
| **2** | `1` (`0001_2`) | `4` (`0100_2`) | `0101_2` (`5`) | `0000_2` (`0`) | `5` | `0` | $1 \oplus 4 = 5$; no overlapping bits, carry becomes 0 |

Because $b = 0$, the loop terminates. Since $a = 5 \le \text{0x7FFFFFFF}$, the function returns `5`.

---

### Step-by-Step Algorithm

1. **Define 32-Bit Bitmask:** Set `mask = 0xFFFFFFFF` to clamp numbers within a 32-bit boundary.
2. **Execute Half-Adder Loop:** While carry `b != 0`:
   - Compute the partial sum without carry: `sum_without_carry = (a ^ b) & mask`.
   - Compute the carry bits: `carry = ((a & b) << 1) & mask`.
   - Update `a = sum_without_carry` and `b = carry`.
3. **Format Two's Complement Output:**
   - If $a \le \text{0x7FFFFFFF}$, the result is positive: return `a`.
   - Otherwise, convert 32-bit two's complement to Python signed integer: return `~(a ^ mask)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Half-Adder with 32-Bit Mask" default>

```python
class Solution:
    def getSum(self, a: int, b: int) -> int:
        # 32-bit integer mask to simulate fixed-width integer overflow in Python
        mask = 0xFFFFFFFF

        while b != 0:
            # XOR computes addition without carry
            # AND shifted left computes carry bits
            sum_without_carry = (a ^ b) & mask
            carry = ((a & b) << 1) & mask

            a = sum_without_carry
            b = carry

        # If a is within positive 32-bit signed range, return directly
        # Otherwise, reconstruct Python's arbitrary-precision negative representation
        return a if a <= 0x7FFFFFFF else ~(a ^ mask)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Half-Adder">

```python
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF

        def add(x: int, y: int) -> int:
            if y == 0:
                return x
            return add((x ^ y) & mask, ((x & y) << 1) & mask)

        res = add(a & mask, b & mask)
        return res if res <= 0x7FFFFFFF else ~(res ^ mask)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative Half-Adder** | $O(1)$ | $O(1)$ | Loops at most 32 times because the carry bit shifts left by 1 bit in each iteration. Zero heap allocations. |
| **Recursive Half-Adder** | $O(1)$ | $O(1)$ auxiliary | Clean recursive formulation; consumes at most 32 call frames on the call stack. |

---

### Common Pitfall: Infinite Loops from Python's Unbounded Integers

In languages with fixed 32-bit integers like C++ or Java, integer overflow naturally wraps around and carry bits eventually clear to zero within 32 steps.

In Python, integers have arbitrary precision (unbounded bit length). A negative number in Python has an infinite sequence of leading sign bits (`...11111111`), which causes carry propagation to continue leftward indefinitely. Without clamping each step using `mask = 0xFFFFFFFF`, operations involving negative numbers (such as $a = -1, b = 1$) cause an infinite loop.

---

### Concise Interview Takeaway

For **Sum of Two Integers**, simulate a hardware half-adder: calculate sum without carry using `a ^ b` and carry using `(a & b) << 1`. In Python, clamp intermediate values to 32 bits with `0xFFFFFFFF` to ensure termination on negative numbers, completing addition in $O(1)$ time with $O(1)$ auxiliary memory.
