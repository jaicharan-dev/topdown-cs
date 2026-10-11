---
id: 5-decode-ways
title: "91. Decode Ways"
description: "Count valid letter decodings of numeric string using single- and two-digit DP transitions"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Conditional Transitions</span>

> **Problem Statement:** A message containing letters from A-Z can be encoded into numbers using the mapping `'A' -> "1"`, `'B' -> "2"`, ..., `'Z' -> "26"`. To decode an encoded message, all digits must be grouped and mapped back into letters. There may be multiple ways to group the digits (for example, `"11106"` can be mapped into `"AAJF"` with grouping `(1, 1, 10, 6)` or `"KJF"` with grouping `(11, 10, 6)`). Note that `"06"` is invalid because leading zeros are not allowed. Given a string `s` containing only digits, return the total number of ways to decode it.

```text
Input:  s = "226"
Output: 3
Explanation: "226" could be decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).
```

---

### The Intuitive Mental Model

This problem is a constrained extension of the stair-climbing problem. At each index $i$, you can make one of two choices:
1. **Take a 1-digit step:** Decode the single character $s[i]$ into a letter.
2. **Take a 2-digit step:** Decode the two-character pair $s[i-1 \dots i]$ together into a letter.

#### Brute Force: Recursive Branching
A naive recursive solution checks both 1-digit and 2-digit options at each index. Because subproblem prefixes overlap heavily, this binary recursion takes exponential $O(2^n)$ time without caching.

#### Optimal Approach: Constrained Fibonacci Transitions
Unlike standard staircase climbing where all steps are valid, numeric decoding introduces strict constraints:
- **Single digit ($s[i]$):** A digit can be decoded if and only if $s[i] \ne \text{'0'}$. If valid, it contributes the total ways up to index $i - 1$ (`one_back`).
- **Two digits ($s[i-1 \dots i]$):** The numeric value must lie between 10 and 26. Values below 10 are invalid due to leading zeros (e.g. `"06"`), and values above 26 exceed the alphabet limit (e.g. `"27"`). If valid, it contributes the total ways up to index $i - 2$ (`two_back`).

Because each position only depends on the previous two states, we can discard the $O(n)$ dynamic programming array and maintain just two variables: `two_back` and `one_back`.

#### Execution Walkthrough

Let us trace `s = "226"`:

| Index ($i$) | Char (`s[i]`) | 1-Digit Check (`s[i] != '0'`) | 2-Digit Check (`10 <= val <= 26`) | Calculation (`current`) | New `two_back` | New `one_back` |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial** | - | - | - | - | 1 | 1 |
| **1** | `'2'` | Valid (`+one_back = 1`) | `"22"` valid (`+two_back = 1`) | $1 + 1 = 2$ | 1 | 2 |
| **2** | `'6'` | Valid (`+one_back = 2`) | `"26"` valid (`+two_back = 1`) | $2 + 1 = 3$ | 2 | 3 |

The final answer stored in `one_back` is 3.

---

### Step-by-Step Algorithm

1. **Validate Initial Character:** If `not s` or `s[0] == '0'`, the string starts with an unparseable zero; return 0 immediately.
2. **Initialize Pointers:** Set `two_back = 1` (representing an empty prefix) and `one_back = 1` (representing the first valid single digit).
3. **Iterate Through Digits:** Loop index `i` from 1 to `len(s) - 1`:
   - Initialize `current = 0`.
   - **Check 1-digit transition:** If $s[i] \ne \text{'0'}$, increment `current += one_back`.
   - **Check 2-digit transition:** Parse the integer `two_digit = int(s[i-1 : i+1])`. If $10 \le \text{two\_digit} \le 26$, increment `current += two_back`.
   - Shift states: `two_back = one_back`, `one_back = current`.
4. **Return Final Decodings:** Return `one_back`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized DP" default>

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        if not s or s[0] == "0":
            return 0

        # two_back represents dp[i - 2], one_back represents dp[i - 1]
        two_back = 1
        one_back = 1

        for i in range(1, len(s)):
            current = 0

            # 1-digit transition
            if s[i] != "0":
                current += one_back

            # 2-digit transition
            two_digit = int(s[i - 1 : i + 1])
            if 10 <= two_digit <= 26:
                current += two_back

            # Advance window
            two_back = one_back
            one_back = current

        return one_back
```

  </TabItem>
  <TabItem value="tabulation" label="Alternative: 1D Tabulation Array">

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        if not s or s[0] == "0":
            return 0

        n = len(s)
        dp = [0] * (n + 1)
        dp[0] = 1
        dp[1] = 1

        for i in range(2, n + 1):
            # Single digit check
            if s[i - 1] != "0":
                dp[i] += dp[i - 1]

            # Double digit check
            two_digit = int(s[i - 2 : i])
            if 10 <= two_digit <= 26:
                dp[i] += dp[i - 2]

        return dp[n]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Explores every single- and double-digit grouping recursively without caching. |
| **1D Tabulation** | $O(n)$ | $O(n)$ | Tracks decodings for each prefix length in an array of size $n + 1$. |
| **Space-Optimized DP** | $O(n)$ | $O(1)$ | Retains only the two preceding counts in scalar variables. |

---

### Common Pitfall: Improper Handling of Zero

The character `'0'` has no independent letter representation because alphabetical encodings range from 1 to 26. A `'0'` is only valid when combined with a preceding `'1'` or `'2'` (producing `'10'` or `'20'`). Any standalone zero or invalid two-digit sequence such as `'30'` or `'70'` yields zero valid decodings for that branch. In addition, an input starting with `'0'` must immediately return 0.

---

### Concise Interview Takeaway

Decode Ways is a constrained variant of the Fibonacci recurrence. At each digit, add the ways from one step back if the single character is non-zero, and add the ways from two steps back if the two-digit pair falls in the valid range of 10 to 26. Because each state depends only on the prior two steps, you can solve it in $O(n)$ time with $O(1)$ space.
