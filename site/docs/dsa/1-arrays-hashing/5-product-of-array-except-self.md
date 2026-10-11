---
id: 5-product-of-array-except-self
title: "238. Product of Array Except Self"
description: "Prefix and suffix product passes without division"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Product</span>

> **Problem Statement:** Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. You must write an algorithm that runs in $O(n)$ time and without using the division operation.

```text
Input:  nums = [1, 2, 3, 4]
Output: [24, 12, 8, 6]
Explanation: The product of elements excluding nums[0] is 2 * 3 * 4 = 24; excluding nums[1] is 1 * 3 * 4 = 12; excluding nums[2] is 1 * 2 * 4 = 8; excluding nums[3] is 1 * 2 * 3 = 6.
```

---

### The Intuitive Mental Model

For every index $i$ in `nums = [1, 2, 3, 4]`, we seek the product of all other elements:
- Index 0: $2 \times 3 \times 4 = 24$
- Index 1: $1 \times 3 \times 4 = 12$
- Index 2: $1 \times 2 \times 4 = 8$
- Index 3: $1 \times 2 \times 3 = 6$
Output: `[24, 12, 8, 6]`.

#### Brute Force: Total Product with Division (and its failure modes)
The initial intuition is often to calculate the total product of the entire array and divide by `nums[i]` for each index. However, the problem explicitly disallows the division operator. Furthermore, arrays containing zeros cause division-by-zero crashes (`ZeroDivisionError`) or require multiple branching conditions depending on whether zero occurs once or multiple times. Without division, computing the product via nested loops requires $O(n^2)$ quadratic time.

#### Optimal Approach: Prefix and Suffix Decomposition
Notice that for any element at index $i$, the product of all other elements can be decomposed into two distinct components:

$$\text{answer}[i] = (\text{product of all elements to the left of } i) \times (\text{product of all elements to the right of } i)$$

Rather than allocating separate prefix and suffix arrays of size $n$, we can reuse the output array:
1. In a forward pass (left-to-right), populate each position with the cumulative product of elements strictly to its left.
2. In a backward pass (right-to-left), maintain a running scalar for the suffix product and multiply it directly into each corresponding element.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 3, 4]`:

**Forward Pass (Prefix Products):**

| Step | Index `i` | `nums[i]` | Running `left` | Action | `res` State |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` | `1` | `1` | `res[0] = 1`, `left = 1 * 1 = 1` | `[1, 1, 1, 1]` |
| **2** | `1` | `2` | `1` | `res[1] = 1`, `left = 1 * 2 = 2` | `[1, 1, 1, 1]` |
| **3** | `2` | `3` | `2` | `res[2] = 2`, `left = 2 * 3 = 6` | `[1, 1, 2, 1]` |
| **4** | `3` | `4` | `6` | `res[3] = 6`, `left = 6 * 4 = 24` | `[1, 1, 2, 6]` |

**Backward Pass (Suffix Multiplier):**

| Step | Index `i` | `nums[i]` | Running `right` | Action | `res` State |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `3` | `4` | `1` | `res[3] = 6 * 1 = 6`, `right = 1 * 4 = 4` | `[1, 1, 2, 6]` |
| **2** | `2` | `3` | `4` | `res[2] = 2 * 4 = 8`, `right = 4 * 3 = 12` | `[1, 1, 8, 6]` |
| **3** | `1` | `2` | `12` | `res[1] = 1 * 12 = 12`, `right = 12 * 2 = 24` | `[1, 12, 8, 6]` |
| **4** | `0` | `1` | `24` | `res[0] = 1 * 24 = 24`, `right = 24 * 1 = 24` | `[24, 12, 8, 6]` |

---

### Step-by-Step Algorithm

1. **Initialize Output Array:** Allocate an array `res` of length $n$ initialized with `1`.
2. **Compute Prefix Products (Forward Pass):** Maintain running variable `left = 1`. Traverse from index `0` to `n - 1`:
   - Set `res[i] = left`.
   - Update `left *= nums[i]`.
3. **Compute Suffix Products (Backward Pass):** Maintain running variable `right = 1`. Traverse from index `n - 1` down to `0`:
   - Multiply `res[i] *= right`.
   - Update `right *= nums[i]`.
4. **Return Result:** Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pass Constant Auxiliary Space" default>

```python
class Solution:
    def productExceptSelf(self, nums: list[int]) -> list[int]:
        n = len(nums)
        res: list[int] = [1] * n
        
        # Forward pass: calculate prefix products
        left = 1
        for i in range(n):
            res[i] = left
            left *= nums[i]
            
        # Backward pass: multiply by suffix products
        right = 1
        for i in range(n - 1, -1, -1):
            res[i] *= right
            right *= nums[i]
            
        return res
```

  </TabItem>
  <TabItem value="arrays" label="Alternative: Separate Prefix and Suffix Arrays">

```python
class Solution:
    def productExceptSelf(self, nums: list[int]) -> list[int]:
        n = len(nums)
        prefix = [1] * n
        suffix = [1] * n
        
        for i in range(1, n):
            prefix[i] = prefix[i - 1] * nums[i - 1]
            
        for i in range(n - 2, -1, -1):
            suffix[i] = suffix[i + 1] * nums[i + 1]
            
        return [prefix[i] * suffix[i] for i in range(n)]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Separate Prefix and Suffix Arrays** | $O(n)$ | $O(n)$ | Allocates distinct prefix and suffix buffers. Straightforward logic at the cost of additional memory allocations. |
| **Two-Pass In-Place Output** | $O(n)$ | $O(1)$ | Reuses output array to accumulate prefix products, then multiplies suffix in-place. Meets optimal constant auxiliary space. |

---

### Common Pitfall: Edge Cases with Zeros

When implementing division-based shortcuts, arrays with zeros introduce critical failure modes: a single zero forces every other index to zero and its own index to the product of non-zero numbers, while two or more zeros make every output element zero. Relying on prefix and suffix products naturally handles all zero distributions with no special-case conditional logic.

---

### Concise Interview Takeaway

For **Product of Array Except Self**, decompose the problem into `res[i] = prefix[i] * suffix[i]`. Populate prefix products directly into the result array during a forward traversal, then accumulate suffix products using a running scalar during a backward pass. This satisfies the no-division constraint in $O(n)$ time and $O(1)$ auxiliary space.
