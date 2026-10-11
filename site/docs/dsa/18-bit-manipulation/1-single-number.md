---
id: 1-single-number
title: "136. Single Number"
description: "Find the unique element in an array of pairs using XOR cancellation identity"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">XOR Cancellation</span>

> **Problem Statement:** Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one. You must implement a solution with linear runtime complexity and use only constant extra space.

```text
Input:  nums = [4, 1, 2, 1, 2]
Output: 4
Explanation: Every element appears twice except 4, which appears once.
```

---

### The Intuitive Mental Model

Imagine you have an array where almost every number has an identical twin, and exactly one number stands alone without a partner.

#### Brute Force: Frequency Map or Set Tallying
The most direct approach is tracking how many times each number appears using a hash table or set:
- As you scan each number, increment its count in a dictionary, or insert it into a set and remove it when seen a second time.
- The remaining element in the set (or the key with count 1) is the solitary number.

Alternatively, sorting the array places identical elements next to each other, allowing you to scan pairs in steps of two. However, hash set tallying requires $O(n)$ auxiliary memory, violating the strict $O(1)$ space requirement. Sorting avoids extra space but takes $O(n \log n)$ time, violating the linear time constraint.

#### Optimal Approach: XOR Cancellation Identity
Instead of allocating memory to remember seen elements, we can exploit the algebraic properties of the bitwise XOR operation ($\oplus$):

1. **Self-Inverse Identity:** Any number XORed with itself cancels out to zero:
   $$x \oplus x = 0$$
2. **Identity Element:** Any number XORed with zero remains unchanged:
   $$x \oplus 0 = x$$
3. **Commutative and Associative Properties:** The order and grouping of operations do not change the outcome:
   $$a \oplus b \oplus c \oplus a = (a \oplus a) \oplus b \oplus c = 0 \oplus b \oplus c = b \oplus c$$

By initializing an accumulator to `0` and XORing every number in the array into it:
$$\text{res} = 0 \oplus \text{nums}[0] \oplus \text{nums}[1] \oplus \dots \oplus \text{nums}[n-1]$$
Every duplicate pair cancels itself out to $0$ regardless of their positions in the array. The only value that survives is the single unique number!

#### Execution Walkthrough

Let us trace `nums = [4, 1, 2, 1, 2]` starting with `res = 0`:

| Step | Element (`num`) | Binary Representation | XOR Operation | Accumulator State (`res`) | Explanation |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | Initial | - | - | `0` (`0000_2`) | Initialized to neutral identity value |
| **1** | `4` | `0100_2` | `0 ^ 4` | `4` (`0100_2`) | First appearance of `4` |
| **2** | `1` | `0001_2` | `4 ^ 1` | `5` (`0101_2`) | First appearance of `1` |
| **3** | `2` | `0010_2` | `5 ^ 2` | `7` (`0111_2`) | First appearance of `2` |
| **4** | `1` | `0001_2` | `7 ^ 1` | `6` (`0110_2`) | Duplicate `1` cancels previous `1` |
| **5** | `2` | `0010_2` | `6 ^ 2` | `4` (`0100_2`) | Duplicate `2` cancels previous `2` |

At the end of the pass, `res = 4`, which is the solitary element.

---

### Step-by-Step Algorithm

1. **Initialize Accumulator:** Set `res = 0`, the neutral identity element for bitwise XOR.
2. **Iterate and Accumulate:** Loop through each integer `num` in `nums` and compute `res ^= num`.
3. **Return Result:** Once the loop completes, all paired numbers have cancelled to zero, leaving only the solitary number in `res`. Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bitwise XOR Cancellation" default>

```python
class Solution:
    def singleNumber(self, nums: list[int]) -> int:
        res = 0

        # Every duplicate pair cancels itself out via x ^ x = 0
        for num in nums:
            res ^= num

        return res
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Hash Set Tallying">

```python
class Solution:
    def singleNumber(self, nums: list[int]) -> int:
        seen: set[int] = set()

        for num in nums:
            if num in seen:
                seen.remove(num)
            else:
                seen.add(num)

        # The remaining item in the set is the single number
        return seen.pop()
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Bitwise XOR Accumulator** | $O(n)$ | $O(1)$ | Scans the array in a single linear pass. Uses zero auxiliary memory while achieving optimal runtime. |
| **Hash Set Tallying** | $O(n)$ | $O(n)$ | Tracks elements by inserting and removing from a set. Simple logic, but consumes linear auxiliary memory. |

---

### Common Pitfall: Non-Bitwise Operators and Odd Repetitions

A frequent mistake is assuming XOR cancellation works when numbers appear an odd number of times (such as three times). Because $x \oplus x \oplus x = x$, XOR cannot isolate unique elements when duplicates appear in odd frequencies. The cancellation property strictly relies on duplicate values appearing in even multiples (namely, exactly twice).

Additionally, do not confuse Python's exponentiation operator `**` with the bitwise XOR operator `^`. Writing `res = res ^ num` is correct; writing `res ** num` computes exponentiation and quickly causes integer overflow or incorrect calculations.

---

### Concise Interview Takeaway

For **Single Number**, exploit the XOR identity $x \oplus x = 0$ and $x \oplus 0 = x$. By accumulating XOR over the entire array, duplicate pairs cancel out regardless of order, isolating the solitary number in $O(n)$ time and $O(1)$ extra space.
