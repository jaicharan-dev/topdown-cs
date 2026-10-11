---
id: 3-majority-element
title: "169. Majority Element"
description: "Boyer-Moore voting vs hash map frequency count"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Boyer-Moore Voting</span>

> **Problem Statement:** Given an array `nums` of size $n$, return the majority element. The majority element is the element that appears more than $\lfloor n / 2 \rfloor$ times. You may assume that the majority element always exists in the array.

```text
Input:  nums = [2, 2, 1, 1, 1, 2, 2]
Output: 2
Explanation: The number 2 appears 4 times out of 7 elements, which is strictly greater than 7 / 2 = 3.5.
```

---

### The Intuitive Mental Model

A majority element is an element that accounts for strictly more than half the entries in an array of size $n$. For example, in `[2, 2, 1, 1, 1, 2, 2]`, the length is $7$. The value `2` appears $4$ times, satisfying $4 > \lfloor 7 / 2 \rfloor = 3$.

#### Brute Force: Hash Map Frequency Counting
The most natural first thought is to count how many times each number appears using a hash map:
- Traverse the array and record frequencies in a dictionary: `{2: 4, 1: 3}`.
- Identify the key whose count exceeds $n / 2$.

This requires $O(n)$ time and is simple to implement, but it consumes $O(n)$ auxiliary space to store unique element tallies.

#### Optimal Approach: Boyer-Moore Voting Algorithm
Can we identify the majority element using $O(1)$ extra space?

Imagine an arena where every number represents a team of fighters. Whenever two fighters from different teams clash, both eliminate each other. Because the majority element accounts for strictly more than 50% of all combatants in the entire arena, even if every minority team unites against it, the majority team will still have surviving members standing at the end.

We maintain two variables:
1. `candidate`: The element currently leading.
2. `count`: The net lead of that candidate.

As we traverse the array:
- If `count == 0`, all previous candidates and opposing elements have neutralized each other. We nominate the current element as the new `candidate`.
- If the current element matches `candidate`, increment `count`.
- If the current element differs from `candidate`, decrement `count`.

#### Execution Walkthrough

Let us trace `nums = [2, 2, 1, 1, 1, 2, 2]`:

| Step | Element | Count Before | Action Taken | Candidate | Count After |
| :---: | :---: | :---: | :--- | :---: | :---: |
| **1** | `2` | `0` | Slate clear: nominate `2` | `2` | `1` |
| **2** | `2` | `1` | Matches candidate: increment count | `2` | `2` |
| **3** | `1` | `2` | Rival element: decrement count | `2` | `1` |
| **4** | `1` | `1` | Rival element: decrement count | `2` | `0` |
| **5** | `1` | `0` | Slate clear: nominate `1` | `1` | `1` |
| **6** | `2` | `1` | Rival element: decrement count | `1` | `0` |
| **7** | `2` | `0` | Slate clear: nominate `2` | `2` | `1` |

The final remaining candidate is `2`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Maintain `candidate = None` (or `nums[0]`) and `count = 0` to track the current leader and their net surplus.
2. **Iterate Through Array:** For each number `num` in `nums`:
   - If `count == 0`, assign `candidate = num`.
   - If `num == candidate`, increment `count` by 1.
   - If `num != candidate`, decrement `count` by 1.
3. **Return Candidate:** After finishing the linear pass, return `candidate` as the guaranteed majority element.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Boyer-Moore Voting" default>

```python
class Solution:
    def majorityElement(self, nums: list[int]) -> int:
        candidate: int = nums[0]
        count: int = 0
        
        for num in nums:
            # When count hits zero, assign the current element as new candidate
            if count == 0:
                candidate = num
                
            # Identical element reinforces lead (+1), rival cancels out (-1)
            if num == candidate:
                count += 1
            else:
                count -= 1
                
        return candidate
```

  </TabItem>
  <TabItem value="hashmap" label="Alternative: Hash Map Counting">

```python
class Solution:
    def majorityElement(self, nums: list[int]) -> int:
        counts: dict[int, int] = {}
        majority_threshold = len(nums) // 2
        
        for num in nums:
            counts[num] = counts.get(num, 0) + 1
            if counts[num] > majority_threshold:
                return num
                
        return nums[0]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Hash Map Counting** | $O(n)$ | $O(n)$ | Tallies frequencies using auxiliary dictionary storage. Simple to reason about, but scales memory with unique entries. |
| **Boyer-Moore Voting** | $O(n)$ | $O(1)$ | Exploits $> n/2$ frequency via pairwise cancellation. Achieves optimal constant auxiliary space. |

---

### Common Pitfall: Assuming Majority Always Exists Without Verification

The Boyer-Moore voting algorithm relies on the mathematical precondition that a true majority element appears strictly more than $\lfloor n / 2 \rfloor$ times. If an input array lacks a true majority (for example, `[1, 2, 3]`), the algorithm will still output a candidate, but that candidate is meaningless. In generalized problem variants where a majority is not guaranteed, a second linear verification pass is required to count the candidate's actual occurrences.

---

### Concise Interview Takeaway

For **Majority Element**, use the **Boyer-Moore Voting Algorithm**. Because the majority element accounts for strictly more than half of the total elements, it survives pairwise cancellation against all other values combined. By tracking a running `candidate` and `count`, we identify the dominant element in $O(n)$ time using only $O(1)$ auxiliary space.
