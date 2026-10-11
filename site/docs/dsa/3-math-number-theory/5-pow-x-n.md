---
id: 5-pow-x-n
title: "50. Pow(x, n)"
description: "Binary exponentiation (exponentiation by squaring) in O(log n)"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Exponentiation</span>

> **Problem Statement:** Implement `myPow(x, n)`, which calculates `x` raised to the power `n` (that is, $x^n$).

```text
Input:  x = 2.00000, n = 10
Output: 1024.00000
Explanation: 2.0 raised to the power 10 is 2^10 = 1024.
```

---

### The Intuitive Mental Model

Calculating $x^n$ directly involves repeated multiplication, but large exponents require a logarithmic approach.

#### Brute Force: Linear Multiplication
The simplest approach is multiplying $x$ by itself $n$ times in a loop.
However, when $n$ reaches $2^{31} - 1 \approx 2.14 \times 10^9$, performing 2.14 billion multiplications takes several seconds and causes a Time Limit Exceeded (TLE) error.

#### Optimal Approach: Binary Exponentiation
Every integer exponent $n$ can be expressed as a sum of powers of 2 using its binary representation.

For example, to compute $x^{13}$:
Since $13 = 1101_2 = 8 + 4 + 1$, we can factor the expression as:
$$x^{13} = x^8 \cdot x^4 \cdot x^1$$

Instead of multiplying $x$ thirteen times:
1. Start with `res = 1.0` and `curr_product = x`.
2. Inspect the lowest bit of $n$:
   - If the bit is `1` ($n$ is odd), multiply `res` by `curr_product`.
3. Square the base: `curr_product = curr_product * curr_product` ($x \to x^2 \to x^4 \to x^8$).
4. Halve the exponent: $n = \lfloor n / 2 \rfloor$.

Negative exponents are inverted mathematically via $x^{-n} = (1 / x)^n$, setting `x = 1 / x` and `n = -n`.

#### Execution Walkthrough

Let us trace $x = 2.0, n = 10$ ($10 = 1010_2$):

| Step | Exponent `n` | Is `n` Odd? (`n % 2 == 1`) | Updated `res` | Squared Base (`curr_product`) | Next `n` (`n // 2`) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `10` | No | `1.0` | $2.0^2 = 4.0$ | `5` |
| **2** | `5` | **Yes** | $1.0 \times 4.0 = 4.0$ | $4.0^2 = 16.0$ | `2` |
| **3** | `2` | No | `4.0` | $16.0^2 = 256.0$ | `1` |
| **4** | `1` | **Yes** | $4.0 \times 256.0 = 1024.0$ | $256.0^2 = 65536.0$ | `0` |

The loop terminates when `n == 0`, returning `1024.0` in just 4 steps instead of 10.

---

### Step-by-Step Algorithm

1. **Handle Negative Exponents:** If $n < 0$, invert the base `x = 1 / x` and negate the exponent `n = -n`.
2. **Initialize Accumulators:** Set `res = 1.0` and `curr_product = x`.
3. **Loop While `n > 0`:**
   - If `n % 2 == 1`: multiply `res *= curr_product`.
   - Square the base: `curr_product *= curr_product`.
   - Halve the exponent: `n //= 2`.
4. **Return Result:** Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Binary Exponentiation" default>

```python
class Solution:
    def myPow(self, x: float, n: int) -> float:
        # Handle negative exponents
        if n < 0:
            x = 1 / x
            n = -n

        res = 1.0
        curr_product = x

        # Exponentiation by squaring
        while n > 0:
            if n % 2 == 1:
                res *= curr_product

            curr_product *= curr_product
            n //= 2

        return res
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Divide and Conquer">

```python
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n == 0:
            return 1.0

        if n < 0:
            return 1.0 / self.myPow(x, -n)

        half = self.myPow(x, n // 2)

        if n % 2 == 0:
            return half * half
        else:
            return half * half * x
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive Divide & Conquer** | $O(\log n)$ | $O(\log n)$ | Halves the exponent recursively. Takes logarithmic time but consumes $O(\log n)$ call stack frames. |
| **Iterative Binary Exponentiation** | $O(\log n)$ | $O(1)$ | Squares the base and shifts the exponent bitwise. Optimal logarithmic time with zero recursion overhead. |

---

### Common Pitfall: 32-Bit Integer Overflow When Negating INT_MIN

In statically typed languages like C++ or Java, the minimum signed 32-bit integer is $-2^{31} = -2,147,483,648$, whereas the maximum is $2^{31} - 1 = 2,147,483,647$. Directly calculating `-n` when $n = -2^{31}$ causes an integer overflow crash because $2,147,483,648$ does not fit in a signed 32-bit integer. In those languages, you must cast `n` to a 64-bit integer (`long long`) before negating. While Python automatically handles arbitrarily large integers, recognizing this hardware boundary is crucial in technical interviews.

---

### Concise Interview Takeaway

Instead of multiplying $x$ linearly in $O(n)$ time, use binary exponentiation to achieve $O(\log n)$. Express the exponent in binary, square the base in each step, and multiply into the result whenever the current bit is 1. Convert negative exponents via $x^{-n} = (1 / x)^n$. For exponents up to $2 \times 10^9$, this executes in at most 32 operations with $O(1)$ auxiliary space.
