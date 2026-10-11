---
id: 1-palindrome-number
title: "9. Palindrome Number"
description: "Reversing half the digits using modulo math without string conversion"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Digit Extraction</span>

> **Problem Statement:** Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise. An integer is a palindrome when it reads the same forward and backward. Solve this problem without converting the integer to a string.

```text
Input:  x = 1221
Output: true
Explanation: 1221 reads as 1221 from left to right and from right to left.
```

---

### The Intuitive Mental Model

Converting `x` to a string (`str(x) == str(x)[::-1]`) is trivial, but in a technical interview, doing so allocates extra memory and circumvents the mathematical concepts being tested.

#### Brute Force: String Conversion or Full Reversal
The most direct approach is converting the integer to a string and checking whether it matches its reverse. Alternatively, one could reverse the entire number mathematically into a new integer. However, string conversion incurs an $O(n)$ memory allocation overhead, and reversing an entire 32-bit integer risks arithmetic overflow if the reversed value exceeds $2^{31} - 1$.

#### Optimal Approach: Reversing Half the Digits
Instead of reversing the entire number, we only need to reverse the second half of the digits and compare it directly against the first half.

As we peel off the last digit of `x` using modulo arithmetic (`digit = x % 10`), we push it onto an accumulator variable `reverted = reverted * 10 + digit`, while shrinking `x` via integer division (`x //= 10`).

Because `x` loses a digit on each step and `reverted` gains one, the exact moment `reverted >= x`, the two numbers have met at the halfway point.

If the number has an even number of digits (such as `1221`), the two halves must match exactly (`x == reverted`). If the number has an odd number of digits (such as `12321`), the middle digit sits at the end of `reverted`, so we discard it with integer division (`x == reverted // 10`).

Negative numbers can never be palindromes due to their leading negative sign, and non-zero numbers ending in `0` cannot be palindromes because positive integers never begin with `0`.

#### Execution Walkthrough

Let us trace `x = 1221`:

| Step | Current `x` | Extracted Digit (`x % 10`) | Updated `reverted` | Remaining `x` (`x // 10`) | Loop Condition (`x > reverted`) |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | `1221` | - | `0` | `1221` | Yes (`1221 > 0`) |
| **1** | `1221` | `1` | `1` | `122` | Yes (`122 > 1`) |
| **2** | `122` | `2` | `12` | `12` | No (`12 > 12` is False, loop stops) |

At loop termination, `x == reverted` evaluates to `12 == 12`, returning `true`.

For an odd-length number like `12321`:
- The loop stops when `x = 12` and `reverted = 123`.
- Comparing `x == reverted // 10` gives `12 == 123 // 10` (`12 == 12`), which correctly evaluates to `true`.

---

### Step-by-Step Algorithm

1. **Filter Impossible Cases:** If `x < 0` or (`x % 10 == 0` and `x != 0`), return `False` immediately because negative numbers and non-zero multiples of 10 cannot be palindromes.
2. **Initialize Reverted Variable:** Initialize `reverted = 0` to store the reversed digits of the second half.
3. **Extract Half of the Digits:** While `x > reverted`:
   - Append the last digit of `x` to `reverted`: `reverted = reverted * 10 + (x % 10)`.
   - Remove the last digit from `x`: `x //= 10`.
4. **Evaluate Symmetry:** When the loop terminates, check whether `x == reverted` (for even-length inputs) or `x == reverted // 10` (for odd-length inputs).
5. **Return Result:** Return `True` if either equality holds, otherwise `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Reversing Half the Digits" default>

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        # Negative numbers and non-zero multiples of 10 cannot be palindromes
        if x < 0 or (x % 10 == 0 and x != 0):
            return False

        reverted = 0
        while x > reverted:
            reverted = reverted * 10 + (x % 10)
            x //= 10

        # For even lengths: x == reverted
        # For odd lengths: x == reverted // 10 (middle digit discarded)
        return x == reverted or x == (reverted // 10)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: String Conversion">

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
            
        s = str(x)
        return s == s[::-1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **String Conversion** | $O(\log_{10} n)$ | $O(\log_{10} n)$ | Converts the number to a string and verifies equality with its reverse. Allocates heap memory for string characters. |
| **Reversing Half the Digits** | $O(\log_{10} n)$ | $O(1)$ | Processes only half of the digits using modulo arithmetic. Optimal space with zero memory allocation and no overflow risk. |

---

### Common Pitfall: Trailing Zeros and Full Reversal Overflow

A common mistake is failing to filter numbers ending with zero (such as `10` or `100`). Without the condition `x % 10 == 0 and x != 0`, input `10` would terminate with `x = 1` and `reverted = 0`, falsely passing the odd-length check `1 == 0 // 10` is False, but with numbers like `100`, `x = 1` and `reverted = 00` can lead to subtle bugs. Additionally, attempting to reverse the entire integer in fixed 32-bit environments risks integer overflow before the comparison is made.

---

### Concise Interview Takeaway

Filter out negative numbers and non-zero multiples of 10 up front. Then peel off digits from the back of the number into a reversed accumulator until `reverted >= x`. By stopping at the midpoint, you compare `x == reverted` for even lengths and `x == reverted // 10` for odd lengths. This avoids integer overflow and runs in $O(\log_{10} n)$ time with $O(1)$ auxiliary space.
