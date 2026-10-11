---
id: 3-number-of-1-bits
title: "191. Number of 1 Bits"
description: "Count set bits using Brian Kernighan's bit clearing algorithm in O(k) time"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Brian Kernighan's Algorithm</span>

> **Problem Statement:** Given a positive integer `n`, write a function that returns the number of set bits (1s) in its binary representation (also known as the Hamming weight).

```text
Input:  n = 11
Output: 3
Explanation: The input binary string 1011 has a total of three set bits.
```

---

### The Intuitive Mental Model

Counting the set bits (1s) in a number requires inspecting its binary representation.

#### Brute Force: Iterative Right Shift
The most straightforward approach inspects the least significant bit with `n & 1`, adds that bit to a running total, and right-shifts the integer with `n >>= 1`:
- While this method is simple, it examines every single bit position sequentially.
- For a 32-bit integer, this loop runs up to 32 iterations, regardless of whether the integer contains thirty 1s or only a single 1.

#### Optimal Approach: Brian Kernighan's Bit Clearing Algorithm
Instead of inspecting zeroes one by one, we can jump directly from one set bit to the next using an algebraic bit trick.

Consider what happens in binary when you subtract `1` from an integer `n`:
- Subtracting 1 flips the **least significant set bit** (the rightmost 1) to `0`.
- All trailing zeros to the right of that bit flip to `1`s.
- For example, if $n = 12$ (`1100_2`), then $n - 1 = 11$ (`1011_2`).

Now compute the bitwise AND between $n$ and $n - 1$:
$$n \, \& \, (n - 1) = 1100_2 \, \& \, 1011_2 = 1000_2$$

The expression `n & (n - 1)` clears the rightmost set bit to 0 in a single step, leaving all higher bits intact. By repeatedly applying `n &= n - 1` until $n$ becomes `0`, the number of iterations equals exactly the number of set bits $k$.

#### Execution Walkthrough

Let us trace $n = 11$ (`1011_2`), starting with `count = 0`:

| Step | Current `n` (Binary) | `n - 1` (Binary) | Bitwise AND (`n & (n - 1)`) | New `n` | Count | Explanation |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | `11` (`1011_2`) | - | - | `11` | `0` | Initial state with 3 set bits |
| **1** | `11` (`1011_2`) | `10` (`1010_2`) | `1011_2 & 1010_2 = 1010_2` | `10` | `1` | Clears rightmost set bit at position 0 |
| **2** | `10` (`1010_2`) | `9` (`1001_2`) | `1010_2 & 1001_2 = 1000_2` | `8` | `2` | Clears rightmost set bit at position 1 |
| **3** | `8` (`1000_2`) | `7` (`0111_2`) | `1000_2 & 0111_2 = 0000_2` | `0` | `3` | Clears rightmost set bit at position 3 |

Because `n` is now `0`, the loop terminates and returns `count = 3`.

---

### Step-by-Step Algorithm

1. **Initialize Counter:** Set `count = 0` to record the number of set bits.
2. **Clear Rightmost Set Bit:** While `n > 0`, perform `n &= n - 1` to clear the lowest set bit.
3. **Increment Count:** Add `1` to `count` on each iteration.
4. **Return Result:** When `n` reaches `0`, return `count`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Brian Kernighan's Algorithm" default>

```python
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0

        # Each iteration clears the lowest set bit
        while n:
            n &= n - 1
            count += 1

        return count
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative Bit Shift">

```python
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0

        while n > 0:
            count += n & 1
            n >>= 1

        return count
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brian Kernighan's Algorithm** | $O(k)$ | $O(1)$ | Runs in time proportional to the number of set bits $k \le 32$. Skips all zero bits entirely. |
| **Iterative Bit Shift** | $O(b)$ | $O(1)$ | Shifts through every bit position until $n = 0$. Incurs up to 32 iterations regardless of bit sparsity. |

---

### Common Pitfall: Infinite Loops on Signed Numbers

In statically typed languages like C++ or Java, performing an arithmetic right shift (`>>`) on a signed negative integer shifts in `1`s from the left to preserve the sign. A loop conditioned on `while n > 0` or shifting negative values without an unsigned logical shift (`>>>`) can lead to infinite loops.

Brian Kernighan's algorithm avoids shifting altogether by directly masking bits with `n &= n - 1`, making it both cleaner and less prone to language-specific shifting quirks.

---

### Concise Interview Takeaway

For **Number of 1 Bits**, apply Brian Kernighan's trick: `n &= n - 1` clears the rightmost set bit in a single bitwise operation. The loop executes in $O(k)$ time, where $k$ is strictly the count of set bits, avoiding unnecessary iterations over zero bits.
