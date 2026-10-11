---
id: 2-plus-one
title: "66. Plus One"
description: "Reverse carry propagation and the mechanical odometer rollover"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Carry Propagation</span>

> **Problem Statement:** You are given a large integer represented as an integer array `digits`, where each `digits[i]` is the $i$-th digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. Increment the large integer by one and return the resulting array of digits.

```text
Input:  digits = [1, 2, 3]
Output: [1, 2, 4]
Explanation: The array represents the integer 123. Incrementing by one gives 123 + 1 = 124, so the result is [1, 2, 4].
```

---

### The Intuitive Mental Model

Think of the array of digits as a mechanical car odometer clicking forward by one mile.

#### Brute Force: String or BigInt Conversion
One approach is to concatenate the array into a string, convert the string into a large integer, add 1, convert the resulting number back into a string, and split each character back into an integer array. While practical in languages with arbitrary-precision integers like Python, this approach allocates multiple intermediate strings and lists ($O(n)$ extra memory) and fails outright in languages with fixed 32-bit or 64-bit primitive integer types when the input contains dozens or hundreds of digits.

#### Optimal Approach: Reverse Carry Propagation
The crucial observation is that adding 1 only creates a carry if the current digit is `9`. For any digit between `0` and `8`, adding 1 settles the operation immediately with no further carry needed.

We traverse the array backward starting from the least significant digit:
- If `digits[i] < 9`, increment `digits[i]` by 1 and return `digits` immediately.
- If `digits[i] == 9`, that digit rolls over to `0`, and we carry `+1` into the next digit to the left.

If the loop finishes without returning, every single digit was `9` (such as `[9, 9, 9]`). In this scenario, all elements have become `0` (`[0, 0, 0]`), and we only need to prepend `1` to the front, yielding `[1, 0, 0, 0]`.

#### Execution Walkthrough

Let us trace `digits = [1, 2, 9]`:

| Step | Index `i` | Current Digit `digits[i]` | Condition (`< 9`) | Action Taken | Array State (`digits`) |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `2` | `9` | No (`9 < 9` is False) | Set `digits[2] = 0`, carry 1 left | `[1, 2, 0]` |
| **2** | `1` | `2` | **Yes** (`2 < 9` is True) | Increment `digits[1] += 1`, return immediately | `[1, 3, 0]` |

Now let us trace an all-nines rollover with `digits = [9, 9]`:

| Step | Index `i` | Current Digit `digits[i]` | Condition (`< 9`) | Action Taken | Array State (`digits`) |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `1` | `9` | No | Set `digits[1] = 0`, carry 1 left | `[9, 0]` |
| **2** | `0` | `9` | No | Set `digits[0] = 0`, loop finishes | `[0, 0]` |
| **Post-loop** | - | - | - | Prepend `[1]` to `digits` | `[1, 0, 0]` |

---

### Step-by-Step Algorithm

1. **Traverse Backward:** Iterate backward from the least significant digit at index `len(digits) - 1` down to `0`.
2. **Evaluate Digit:**
   - If `digits[i] < 9`: increment `digits[i]` by 1 and return `digits` immediately.
   - If `digits[i] == 9`: set `digits[i] = 0` to absorb the rollover and continue leftward.
3. **Handle Complete Rollover:** If the loop terminates without returning, all digits were `9`. Return `[1] + digits` to attach the leading overflow digit.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place Reverse Traversal" default>

```python
class Solution:
    def plusOne(self, digits: list[int]) -> list[int]:
        n = len(digits)

        # Traverse backward from least to most significant digit
        for i in range(n - 1, -1, -1):
            if digits[i] < 9:
                digits[i] += 1
                return digits

            # Digit 9 rolls over to 0; propagate carry leftward
            digits[i] = 0

        # If all digits were 9 (e.g. [9, 9] -> [1, 0, 0]), prepend 1
        return [1] + digits
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Integer Reconstruction">

```python
class Solution:
    def plusOne(self, digits: list[int]) -> list[int]:
        num = 0
        for d in digits:
            num = num * 10 + d

        num += 1
        return [int(ch) for ch in str(num)]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Integer Reconstruction** | $O(n)$ | $O(n)$ | Converts the array to an integer and parses it back. Incurs memory overhead and fails in languages without arbitrary-precision arithmetic. |
| **In-Place Reverse Traversal** | $O(n)$ | $O(1)$ | Modifies the list in place with early exit in $O(1)$ average time. Requires $O(n)$ space only during the rare all-nines rollover. |

---

### Common Pitfall: Repeated Inefficient Array Insertions

A common mistake is using `digits.insert(0, 1)` inside the loop or reallocating arrays on each carry step. Prepending to an array in Python takes $O(n)$ time because every following element must be shifted right. By modifying elements in place and performing at most a single prepend (`[1] + digits`) after the loop terminates, the optimal solution remains clean and efficient.

---

### Concise Interview Takeaway

Model the increment like a mechanical odometer. Traverse backward from the last digit: if the digit is less than 9, increment it and return immediately. If it is 9, turn it to 0 and propagate the carry to the next digit left. If the loop completes without an early exit, every digit was 9, so prepend `[1]` to the front. This achieves $O(1)$ average runtime and $O(1)$ auxiliary space.
