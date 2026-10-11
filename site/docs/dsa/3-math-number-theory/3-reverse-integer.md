---
id: 3-reverse-integer
title: "7. Reverse Integer"
description: "Mathematical digit peeling with 32-bit hardware overflow guards"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Digit Peeling</span>

> **Problem Statement:** Given a signed 32-bit integer `x`, return `x` with its digits reversed. If reversing `x` causes the value to go outside the signed 32-bit integer range `[-2^31, 2^31 - 1]`, then return `0`. Assume the environment does not allow you to store 64-bit integers.

```text
Input:  x = 123
Output: 321
Explanation: Reversing the digits of 123 produces 321. Both values fall within the signed 32-bit integer range.
```

---

### The Intuitive Mental Model

Reversing an integer mathematically is like popping items from one stack and pushing them onto another.

#### Brute Force: String Reversal with Range Check
A straightforward approach is to convert the number to a string, reverse the characters, restore the negative sign if applicable, and convert the string back to an integer. Afterward, you check if the value falls outside `[-2^31, 2^31 - 1]`. While concise in Python, this approach violates the interview requirement to guard against overflow during calculation without storing 64-bit integers or allocating heap memory for strings.

#### Optimal Approach: Digit Peeling with 32-Bit Overflow Guard
We extract digits from the back of `x` using modulo arithmetic and push them into an accumulator variable `res`:
- **Pop:** `digit = x % 10`, `x //= 10`.
- **Push:** `res = res * 10 + digit`.

The primary challenge is respecting the signed 32-bit integer limits:
$$[-2^{31}, 2^{31} - 1] = [-2,147,483,648, \ 2,147,483,647]$$

If we multiply `res` by 10 after it has already grown too large, the operation overflows a 32-bit integer register.
To prevent overflow before it occurs, define `threshold = INT_MAX // 10 = 214,748,364`:
- If `res > threshold`, then `res * 10` will definitely overflow.
- If `res == threshold`, then `res * 10 + digit` will overflow if `digit > 7`.

Checking this guard on each iteration ensures we catch overflow early and safely return `0`.

#### Execution Walkthrough

Let us trace `x = 123` with `threshold = 214748364`:

| Step | Current `x` | Popped Digit (`x % 10`) | Remaining `x` (`x // 10`) | Overflow Guard Triggered? | Updated `res` (`res * 10 + digit`) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `123` | `3` | `12` | No (`0 < 214748364`) | `3` |
| **2** | `12` | `2` | `1` | No (`3 < 214748364`) | `32` |
| **3** | `1` | `1` | `0` | No (`32 < 214748364`) | `321` |

Now consider an overflow case such as `x = 1534236469`:
- At the 10th step, `res` is `964632435`, which is strictly greater than `threshold` (`214748364`).
- The overflow check immediately triggers and returns `0` before any register overflow can occur.

---

### Step-by-Step Algorithm

1. **Establish 32-Bit Boundary:** Define `INT_MAX = 2**31 - 1` ($2,147,483,647$) and calculate `threshold = INT_MAX // 10` ($214,748,364$).
2. **Record Sign and Magnitude:** Store the sign (`sign = -1 if x < 0 else 1`) and work with the positive magnitude `x = abs(x)`.
3. **Initialize Result:** Set `res = 0`.
4. **Peel Digits in a Loop:** While `x > 0`:
   - Pop the last digit: `digit = x % 10`.
   - Shrink `x`: `x //= 10`.
   - **Check Overflow Guard:** If `res > threshold` or (`res == threshold and digit > 7`), return `0`.
   - Push the digit: `res = res * 10 + digit`.
5. **Reapply Sign:** Multiply `res * sign` and return the resulting 32-bit integer.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Mathematical Digit Peeling" default>

```python
class Solution:
    def reverse(self, x: int) -> int:
        INT_MAX = 2**31 - 1  # 2,147,483,647
        threshold = INT_MAX // 10  # 214,748,364

        sign = -1 if x < 0 else 1
        x = abs(x)
        res = 0

        while x > 0:
            digit = x % 10
            x //= 10

            # Guard against 32-bit signed overflow before multiplying
            if res > threshold or (res == threshold and digit > 7):
                return 0

            res = res * 10 + digit

        return res * sign
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: String Reversal">

```python
class Solution:
    def reverse(self, x: int) -> int:
        sign = -1 if x < 0 else 1
        reversed_int = int(str(abs(x))[::-1]) * sign

        # Check 32-bit signed integer boundary after conversion
        if reversed_int < -2**31 or reversed_int > 2**31 - 1:
            return 0

        return reversed_int
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **String Reversal** | $O(\log_{10} n)$ | $O(\log_{10} n)$ | Converts to string and checks range after the fact. Uses string memory and does not protect intermediate 32-bit registers. |
| **Mathematical Digit Peeling** | $O(\log_{10} n)$ | $O(1)$ | Extracts digits mathematically and guards against overflow prior to multiplication. Constant space and hardware safe. |

---

### Common Pitfall: Checking Overflow After Multiplication

In fixed 32-bit environments (like C++ or Java), waiting until after `res = res * 10 + digit` to check for overflow causes an integer wrap-around or undefined behavior before the `if` condition can run. The boundary check must always occur beforehand using `threshold = INT_MAX // 10`.

---

### Concise Interview Takeaway

Peel digits from the right using modulo math (`x % 10`) and append them using `res * 10 + digit`. To strictly adhere to 32-bit hardware constraints, verify that `res` does not exceed `INT_MAX // 10` before multiplying by 10. This handles signed integers reliably in $O(\log_{10} n)$ time and $O(1)$ auxiliary space.
