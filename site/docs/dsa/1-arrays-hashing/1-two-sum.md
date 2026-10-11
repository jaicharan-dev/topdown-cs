---
id: 1-two-sum
title: "1. Two Sum"
description: "Hash map complement lookup in a single pass"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Map</span>

> **Problem Statement:** Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`. Each input has exactly one solution, and you may not use the same element twice. You can return the answer in any order.

```text
Input:  nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] == 2 + 7 == 9, so we return [0, 1].
```

---

### The Intuitive Mental Model

Imagine you have a list of numbers: `nums = [2, 7, 11, 15]`, and your target is `9`. You need to find the two numbers that sum to `9`.

#### Brute Force: Checking Every Pair
The most direct approach is comparing every pair:
- Pick the first number `2`.
- Test it against `7`: Does $2 + 7 = 9$? Yes, a match is found.

If the answer was not at the front, you would check `2` with `11`, then `2` with `15`. Next, you would test `7` against all subsequent numbers, and so on.

While simple, checking every pair takes $O(n^2)$ quadratic time. If the array contains tens of thousands of items, this approach is far too slow for production systems.

#### Optimal Approach: The Complement Notebook
Instead of repeatedly scanning backwards, what if we walk through the list **just once**?

As you inspect each number `x`, you only need to determine the exact partner value required to reach the target:

$$\text{complement} = \text{target} - x$$

To make lookups instant, you carry a **small notebook** (a hash map / dictionary). In this notebook, you record every number you have seen so far, along with its index.

#### Execution Walkthrough

Let us trace `nums = [2, 7, 11, 15]` with `target = 9`:

| Step | Element | Required Complement | Found in Notebook? | Action Taken | Notebook State (`seen`) |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `nums[0] = 2` | $9 - 2 = 7$ | No | Record `2` at index `0` | `{2: 0}` |
| **2** | `nums[1] = 7` | $9 - 7 = 2$ | **Yes** (at index `0`) | Match found! Return `[0, 1]` | `{2: 0}` |

Because hash table lookups take $O(1)$ constant time on average, you examine each number once, solving the problem in a single pass.

---

### Step-by-Step Algorithm

1. **Initialize Hash Map:** Create an empty dictionary `seen` to store previously inspected numbers and their indices (`value -> index`).
2. **Iterate with Index:** Traverse `nums` using `enumerate(nums)` to track both the index `i` and element `num`.
3. **Compute Complement:** For each number, determine its required partner: `complement = target - num`.
4. **Probe Hash Map:**
   - If `complement` already exists in `seen`, return `[seen[complement], i]`.
   - If not, save the current number and its index: `seen[num] = i`.
5. **Fallback:** Return an empty list if no solution is found.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: One-Pass Hash Map" default>

```python
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen: dict[int, int] = {}  # value -> index
        
        for i, num in enumerate(nums):
            complement = target - num
            
            # If the partner number was already seen, return the answer
            if complement in seen:
                return [seen[complement], i]
            
            # Otherwise, remember this number and where we saw it
            seen[num] = i
            
        return []
```

  </TabItem>
  <TabItem value="brute" label="Brute Force: Nested Loops">

```python
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        n = len(nums)
        for i in range(n):
            for j in range(i + 1, n):
                if nums[i] + nums[j] == target:
                    return [i, j]
                    
        return []
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(n^2)$ | $O(1)$ | Tests every pair with nested loops. Uses no auxiliary memory, but quadratic time is too slow for large arrays. |
| **One-Pass Hash Map** | $O(n)$ | $O(n)$ | Traverses the array once with $O(1)$ average lookups. Trades $O(n)$ extra memory for optimal linear speed. |

---

### Common Pitfall: Using the Same Element Twice

If `target = 6` and `nums = [3, 2, 4]`, pairing `3` at index `0` with itself ($3 + 3 = 6$) is invalid because the problem prohibits using the same element twice.

We avoid this by checking `seen` **before** writing the current number into it. Because `nums[i]` has not yet been recorded, an element can never look up and pair with itself.

---

### Concise Interview Takeaway

For **Two Sum**, use a single-pass hash map lookup. As you iterate through `nums`, calculate `complement = target - num`. If that complement exists in your map, return both indices immediately. Otherwise, record the current element and continue. This trades $O(n)$ auxiliary memory to reduce runtime from $O(n^2)$ down to $O(n)$.
