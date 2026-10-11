---
id: 4-counting-bits
title: "338. Counting Bits"
description: "Count set bits for all integers up to N using 1D dynamic programming and bit shifting"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Programming</span>

> **Problem Statement:** Given an integer `n`, return an array `ans` of length `n + 1` such that for each `i` (`0 <= i <= n`), `ans[i]` is the number of 1s in the binary representation of `i`.

```text
Input:  n = 5
Output: [0, 1, 1, 2, 1, 2]
Explanation:
0 --> 0 (0 set bits)
1 --> 1 (1 set bit)
2 --> 10 (1 set bit)
3 --> 11 (2 set bits)
4 --> 100 (1 set bit)
5 --> 101 (2 set bits)
```

---

### The Intuitive Mental Model

We must generate set bit counts for every number from $0$ up to $n$ in linear $O(n)$ time.

#### Brute Force: Independent Bit Counting per Integer
The most direct approach iterates from $0$ to $n$ and counts the 1-bits of each number individually (using bit shifts or Brian Kernighan's bit clearing algorithm):
- Each number requires up to 32 operations.
- Across all $n$ integers, this approach takes $O(n \log n)$ time (or $O(32n)$).
- It recalculates bit patterns from scratch without reusing work already completed for smaller values.

#### Optimal Approach: Dynamic Programming via Right Shift
To achieve linear $O(n)$ time, notice how binary numbers relate to their halved values:
- Right-shifting `i` by 1 bit (`i >> 1`) discards only the least significant bit (LSB).
- The remaining higher-order bits are identical to the binary representation of `i // 2`.
- When `i` is even, its discarded LSB is `0`. Thus, `i` contains the exact same number of 1-bits as `i // 2`. For example, $6$ (`110_2`) has the same number of set bits as $3$ (`011_2`).
- When `i` is odd, its discarded LSB is `1`. Thus, `i` contains exactly one more set bit than `i // 2`. For example, $7$ (`111_2`) has one more set bit than $3$ (`011_2`).

This yields a direct $O(1)$ recurrence relation:
$$\text{ans}[i] = \text{ans}[i \gg 1] + (i \, \& \, 1)$$

Because $i \gg 1 < i$, the subproblem $\text{ans}[i \gg 1]$ has already been solved and stored in our array.

#### Execution Walkthrough

Let us trace from $i = 0$ to $n = 5$, building the `ans` array:

| `i` | Binary Representation | Halved Index (`i >> 1`) | Looked-up Value (`ans[i >> 1]`) | LSB (`i & 1`) | Result (`ans[i]`) | Explanation |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | `0_2` | - | - | - | `0` | Base case: zero has 0 set bits |
| **1** | `1_2` | `0` | `0` | `1` | `1` | `ans[0] + 1 = 0 + 1` |
| **2** | `10_2` | `1` | `1` | `0` | `1` | `ans[1] + 0 = 1 + 0` (even) |
| **3** | `11_2` | `1` | `1` | `1` | `2` | `ans[1] + 1 = 1 + 1` (odd) |
| **4** | `100_2` | `2` | `1` | `0` | `1` | `ans[2] + 0 = 1 + 0` (even) |
| **5** | `101_2` | `2` | `1` | `1` | `2` | `ans[2] + 1 = 1 + 1` (odd) |

Final output: `[0, 1, 1, 2, 1, 2]`.

---

### Step-by-Step Algorithm

1. **Initialize DP Array:** Create a list `ans` of size $n + 1$ filled with zeros. The base case `ans[0] = 0` is inherently satisfied.
2. **Iterate from 1 to $n$:** For each index `i`:
   - Retrieve the set bit count of `i >> 1` from `ans[i >> 1]`.
   - Check the parity of `i` using `i & 1` (`1` if odd, `0` if even).
   - Set `ans[i] = ans[i >> 1] + (i & 1)`.
3. **Return Result:** Return `ans`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Dynamic Programming via Right Shift" default>

```python
class Solution:
    def countBits(self, n: int) -> list[int]:
        # ans[i] stores the number of 1-bits in integer i
        ans = [0] * (n + 1)

        for i in range(1, n + 1):
            # Number of bits in i // 2 plus the least significant bit
            ans[i] = ans[i >> 1] + (i & 1)

        return ans
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Brian Kernighan per Integer">

```python
class Solution:
    def countBits(self, n: int) -> list[int]:
        ans = [0] * (n + 1)

        for i in range(1, n + 1):
            val = i
            count = 0
            while val:
                val &= val - 1
                count += 1
            ans[i] = count

        return ans
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Dynamic Programming (Right Shift)** | $O(n)$ | $O(1)$ auxiliary | Computes each entry in $O(1)$ time by reusing the halved subproblem. Optimal runtime. |
| **Brian Kernighan per Integer** | $O(n \log n)$ | $O(1)$ auxiliary | Calculates bit counts independently for each number. Incurs repeated redundant bit clearing work. |

---

### Common Pitfall: Operator Precedence with Addition and Bitwise AND

In Python, addition (`+`) has higher operator precedence than bitwise AND (`&`) and bitwise right shift (`>>`).

Writing `ans[i >> 1] + i & 1` without parentheses causes Python to evaluate `(ans[i >> 1] + i) & 1`, which corrupts the output. Always wrap the bitwise expression explicitly in parentheses: `ans[i >> 1] + (i & 1)`.

---

### Concise Interview Takeaway

For **Counting Bits**, leverage dynamic programming: right-shifting $i$ by 1 discards only the least significant bit, which is preserved in subproblem $i \gg 1$. Computing $\text{ans}[i] = \text{ans}[i \gg 1] + (i \, \& \, 1)$ calculates each bit count in $O(1)$ time, yielding a strictly linear $O(n)$ solution.
