---
id: 5-string-to-integer-atoi
title: "8. String to Integer (atoi)"
description: "Sequential 4-phase conveyor belt parser with 32-bit clamping"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Simulation & Parsing</span>

> **Problem Statement:** Implement the `myAtoi(string s)` function, which converts a string to a 32-bit signed integer. Follow the rules: ignore leading whitespace, determine sign (`+` or `-`), read contiguous digits until the first non-digit, and clamp the result to the 32-bit signed integer range `[-2^31, 2^31 - 1]`.

```text
Input:  s = "   -042"
Output: -42
Explanation: Leading whitespace is ignored, '-' sets negative sign, and digits "042" are parsed as 42. Final value is -42.
```

---

### The Intuitive Mental Model

Imagine a coin-sorting conveyor belt at a bank. Every character must pass through four strict, one-way checkpoints in exact chronological order:

```text
Input: "   -0042abc"

Checkpoint 1: [ Skip Whitespaces ]  ---> Ignores "   "
Checkpoint 2: [ Read Sign (+ / -)]  ---> Catches "-", records sign = -1
Checkpoint 3: [ Accumulate Digits]  ---> Reads '0', '0', '4', '2' -> 42
                                         Stops immediately at 'a'!
Checkpoint 4: [ 32-Bit Clamping  ]  ---> -42 is safely within [-2^31, 2^31 - 1]
                                         Result: -42
```

The conveyor belt never moves backward:
- Once you see a sign, you can never process another sign.
- Once you start reading digits, the moment you encounter a space or letter, parsing terminates immediately.
- If no valid digits are encountered at all (for example `"words and 987"`), output `0`.

#### Brute Force: Regular Expression Extraction
A regex pattern like `^\s*([+-]?\d+)` can capture optional whitespace, an optional sign, and contiguous digits before delegating to `int()`.

While concise, regular expressions incur high parsing overhead, create intermediate substring copies, and bypass the manual state machine mechanics expected in interview evaluations.

#### Optimal Approach: Single-Pass State Machine
Instead of regular expressions or auxiliary string trimming, use a single pointer `i` that advances sequentially across the four checkpoints:
1. Skip leading whitespace.
2. Read at most one sign flag (`+` or `-`).
3. Accumulate numerical digits while preemptively guarding against 32-bit signed overflow.
4. Stop immediately upon encountering any non-digit character or reaching the end of the string.

#### Execution Walkthrough

Let us trace `s = "   -42a"`:

| Pointer `i` | Char `s[i]` | Phase / Checkpoint | State Updates |
| :---: | :---: | :--- | :--- |
| **0..2** | `' '` | Phase 1: Skip whitespace | Advance `i` to `3` |
| **3** | `'-'` | Phase 2: Detect sign | `sign = -1`, advance `i` to `4` |
| **4** | `'4'` | Phase 3: Parse digit | `res = 0 * 10 + 4 = 4`, advance `i` to `5` |
| **5** | `'2'` | Phase 3: Parse digit | `res = 4 * 10 + 2 = 42`, advance `i` to `6` |
| **6** | `'a'` | Non-digit encountered | Halt parsing immediately |

Apply sign: `res * sign = 42 * (-1) = -42`.
Clamping: $-42$ falls within $[-2^{31}, 2^{31} - 1]$, returning `-42`.

---

### Step-by-Step Algorithm

1. **Initialize Constants and Pointers:** Set `INT_MAX = 2**31 - 1`, `INT_MIN = -2**31`, `n = len(s)`, and `i = 0`.
2. **Skip Leading Whitespace:** Increment `i` while `i < n` and `s[i] == ' '`. If `i == n`, return `0`.
3. **Determine Sign:** Initialize `sign = 1`. If `s[i] == '-'`, set `sign = -1` and increment `i`. Else if `s[i] == '+'`, increment `i`.
4. **Accumulate Digits with Overflow Protection:** While `i < n` and `s[i].isdigit()`:
   - Calculate `digit = ord(s[i]) - ord('0')`.
   - Check if `res > INT_MAX // 10` or (`res == INT_MAX // 10` and `digit > 7`). If so, return `INT_MAX` if `sign == 1` else `INT_MIN`.
   - Update `res = res * 10 + digit` and increment `i`.
5. **Apply Sign and Return:** Return `res * sign`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Single-Pass Parser" default>

```python
class Solution:
    def myAtoi(self, s: str) -> int:
        INT_MAX = 2**31 - 1
        INT_MIN = -2**31

        n = len(s)
        i = 0

        # Phase 1: Skip leading whitespace without string allocation
        while i < n and s[i] == ' ':
            i += 1

        if i == n:
            return 0

        # Phase 2: Detect sign
        sign = 1
        if s[i] == '-':
            sign = -1
            i += 1
        elif s[i] == '+':
            i += 1

        # Phase 3: Parse digits with 32-bit overflow guard
        res = 0
        threshold = INT_MAX // 10  # 214748364

        while i < n and s[i].isdigit():
            digit = ord(s[i]) - ord('0')

            # Guard against overflow before multiplying by 10
            if res > threshold or (res == threshold and digit > 7):
                return INT_MAX if sign == 1 else INT_MIN

            res = res * 10 + digit
            i += 1

        return res * sign
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Regex Parsing">

```python
import re

class Solution:
    def myAtoi(self, s: str) -> int:
        INT_MAX = 2**31 - 1
        INT_MIN = -2**31

        # Match optional leading whitespace, optional sign, and contiguous digits
        match = re.match(r'^\s*([+-]?\d+)', s)
        if not match:
            return 0

        val = int(match.group(1))
        return max(INT_MIN, min(val, INT_MAX))
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Single-Pass Parser** | $O(n)$ | $O(1)$ | Scans the string once with a single pointer. Prevents overflow with constant auxiliary space. |
| **Regex Parsing** | $O(n)$ | $O(n)$ | Short and expressive, but incurs regex engine overhead and allocates match substrings. |

---

### Common Pitfall: Checking Overflow After Integer Multiplication

In compiled languages like C, C++, or Java, computing `res * 10 + digit` when `res` is already near `INT_MAX` causes signed integer overflow before any clamping comparison can run. Even though Python provides arbitrary-precision integers, interviewers test whether you implement the pre-multiplication boundary check: verifying `res > INT_MAX // 10` or (`res == INT_MAX // 10` and `digit > 7`) before multiplying by 10.

---

### Concise Interview Takeaway

Model `atoi` as a sequential 4-checkpoint state machine: skip whitespace, parse sign, accumulate digits, and clamp. Always check 32-bit limits before multiplying by 10 to demonstrate robust low-level engineering principles.
