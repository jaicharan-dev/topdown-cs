---
id: 2-missing-number
title: "268. Missing Number"
description: "Find the single missing number in range [0, n] using XOR cancellation or Gauss formula"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">XOR Cancellation</span>

> **Problem Statement:** Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.

```text
Input:  nums = [3, 0, 1]
Output: 2
Explanation: n = 3 since there are 3 numbers, so all numbers are in the range [0, 3]. 2 is the missing number in the range since it does not appear in nums.
```

---

### The Intuitive Mental Model

The input array contains $n$ numbers drawn from a complete universe of $n + 1$ integers spanning $0$ to $n$. Exactly one number has been omitted.

#### Brute Force: Sorting or Hash Set Lookup
The most intuitive approaches involve tracking presence:
- Storing every number in a hash set allows you to query each value from $0$ to $n$. The first value absent from the set is your answer. This requires $O(n)$ extra memory.
- Sorting the array organizes elements sequentially, letting you verify that each index matches its element. However, sorting incurs $O(n \log n)$ time.

#### Optimal Approach: XOR Cancellation Identity
Instead of storing numbers in memory, we can use the bitwise XOR property ($x \oplus x = 0$ and $x \oplus 0 = x$):
- The complete expected universe contains every index $i \in [0, n - 1]$ plus the terminal integer $n$.
- The numbers physically present in the array are `nums[0], nums[1], ..., nums[n-1]`.
- If we XOR every expected value alongside every present value, every matching number appears twice and cancels to zero.
- The single omitted number appears only once (in the expected sequence) and naturally survives in the accumulator.

$$\text{res} = n \oplus \bigoplus_{i=0}^{n-1} (i \oplus \text{nums}[i])$$

An alternative optimal method is Gauss's arithmetic summation formula:
$$\text{Expected Sum} = \frac{n(n + 1)}{2}$$
Subtracting the actual sum of `nums` from the expected sum yields the missing number. While arithmetic summation is concise, bitwise XOR is preferred in systems programming because it avoids any potential integer overflow when $n$ is very large.

#### Execution Walkthrough

Let us trace `nums = [3, 0, 1]` where $n = 3$, initializing `res = 3`:

| Step | Index (`i`) | Actual Element (`nums[i]`) | XOR Operation | Accumulator State (`res`) | Explanation |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | - | - | Initial value $n$ | `3` (`0011_2`) | Pre-loaded with terminal boundary $n = 3$ |
| **1** | `0` | `3` | `3 ^ 0 ^ 3` | `0` (`0000_2`) | Value `3` cancels out with initial `res` |
| **2** | `1` | `0` | `0 ^ 1 ^ 0` | `1` (`0001_2`) | Value `0` cancels out; index `1` remains |
| **3** | `2` | `1` | `1 ^ 2 ^ 1` | `2` (`0010_2`) | Value `1` cancels out; missing value `2` survives |

After iterating through all indices, `res = 2`, which is the missing number.

---

### Step-by-Step Algorithm

1. **Initialize Accumulator:** Set `res = len(nums)` to include the upper boundary $n$, since loop indices only span $0$ through $n - 1$.
2. **Iterate and Cancel:** Traverse the array using `enumerate(nums)`. For each index `i` and element `num`, update `res ^= i ^ num`.
3. **Return Result:** Once the loop terminates, all matching integers have canceled out. Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bitwise XOR Cancellation" default>

```python
class Solution:
    def missingNumber(self, nums: list[int]) -> int:
        # Start with n because index iteration only reaches n - 1
        res = len(nums)

        # XOR every expected index and every actual element
        for i, num in enumerate(nums):
            res ^= i ^ num

        return res
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Gauss Summation Formula">

```python
class Solution:
    def missingNumber(self, nums: list[int]) -> int:
        n = len(nums)
        expected_sum = n * (n + 1) // 2
        actual_sum = sum(nums)
        
        return expected_sum - actual_sum
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Bitwise XOR** | $O(n)$ | $O(1)$ | Scans the array in a single linear pass. Zero extra memory and zero risk of integer overflow. |
| **Gauss Summation** | $O(n)$ | $O(1)$ | Elegant closed-form math solution. In fixed 32-bit integer languages, $n(n+1)$ can overflow for large $n$. |
| **Hash Set Lookup** | $O(n)$ | $O(n)$ | Simple membership testing, but allocates linear auxiliary space to store elements. |

---

### Common Pitfall: Forgetting the Boundary Number

A common bug is running the index loop from `0` to `n - 1` without incorporating $n$ into the expected set. Because the array has length $n$, its indices stop at $n - 1$, while the range of values extends up to $n$.

Initializing `res = len(nums)` before the loop ensures that $n$ is part of the XOR chain. Without this initialization, if the missing number happens to be $n$, the algorithm will return an incorrect result.

---

### Concise Interview Takeaway

For **Missing Number**, XOR all array values with the full expected sequence $[0 \dots n]$. Every matching number appears twice and cancels out to zero via $x \oplus x = 0$, leaving only the missing number in $O(n)$ time and $O(1)$ space with zero overflow risk.
