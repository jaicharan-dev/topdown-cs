---
id: 1-subsets
title: "78. Subsets"
description: "Binary include/exclude decision tree generating the power set"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Decision Tree DFS</span>

> **Problem Statement:** Given an integer array `nums` of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.

```text
Input:  nums = [1, 2, 3]
Output: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
Explanation: The power set of 3 elements contains 2^3 = 8 possible subsets.
```

---

### The Intuitive Mental Model

Imagine packing a backpack for a day hike with a checklist of $n$ items: `[camera, jacket, umbrella]`. For every single item on your checklist, you face a binary choice:
1. **Include it:** Place the item into your backpack.
2. **Exclude it:** Leave the item at home.

This "take it or leave it" choice creates a binary decision tree of depth $n$:
- At level 0, you decide on `nums[0]`.
- At level 1, you decide on `nums[1]`.
- At level $n$, you have reached a leaf of the decision tree where decisions for all elements are finalized. Take a snapshot copy of the current backpack contents and store it in your collection.

Because each of the $n$ items offers exactly 2 possibilities, the tree terminates at $2^n$ leaves, yielding the complete power set.

#### Brute Force: Iterative Cascading
Start with a list containing just the empty set: `[[]]`. For each number in `nums`, take every subset generated so far, duplicate it, append the current number, and add the new subset back to the list. While this runs in $O(n \cdot 2^n)$ time, it repeatedly copies intermediate lists and does not teach the recursive backtracking pattern essential for constrained state space problems.

#### Optimal Approach: Backtracking Decision Tree
Instead of allocating numerous intermediate lists, maintain a single mutable list `subset` across recursive calls. For each index `i`:
1. **Include `nums[i]`:** Append `nums[i]` to `subset` and recurse to `i + 1`.
2. **Exclude `nums[i]` (Backtrack):** Remove `nums[i]` via `pop()` to restore the original state, then recurse to `i + 1`.

This explores every branch depth-first and consumes only $O(n)$ auxiliary memory for the call stack and path container.

#### Execution Walkthrough

Let us trace `nums = [1, 2]`:

| Step | Index `i` | Choice Made | Path State (`subset`) | Action Taken | Result Collected |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` | Include `1` | `[1]` | Recurse to `i = 1` | `[]` |
| **2** | `1` | Include `2` | `[1, 2]` | Recurse to `i = 2` | `[]` |
| **3** | `2` | Base case reached | `[1, 2]` | Snapshot `[1, 2]` | `[[1, 2]]` |
| **4** | `1` | Backtrack (pop `2`) | `[1]` | Recurse to `i = 2` | `[[1, 2]]` |
| **5** | `2` | Base case reached | `[1]` | Snapshot `[1]` | `[[1, 2], [1]]` |
| **6** | `0` | Backtrack (pop `1`) | `[]` | Recurse to `i = 1` | `[[1, 2], [1]]` |
| **7** | `1` | Include `2` | `[2]` | Recurse to `i = 2` | `[[1, 2], [1]]` |
| **8** | `2` | Base case reached | `[2]` | Snapshot `[2]` | `[[1, 2], [1], [2]]` |
| **9** | `1` | Backtrack (pop `2`) | `[]` | Recurse to `i = 2` | `[[1, 2], [1], [2]]` |
| **10** | `2` | Base case reached | `[]` | Snapshot `[]` | `[[1, 2], [1], [2], []]` |

---

### Step-by-Step Algorithm

1. **Initialize State:** Create `result = []` to store all subsets, and `subset = []` to hold the current decision path.
2. **Define Recursive DFS:** Define a helper function `dfs(i)` where `i` represents the current element index in `nums`.
3. **Check Base Case:** If `i == len(nums)`, all elements have been evaluated. Append a shallow copy `subset.copy()` to `result` and return.
4. **Branch 1 (Include):** Append `nums[i]` to `subset`, then call `dfs(i + 1)`.
5. **Branch 2 (Exclude / Backtrack):** Remove `nums[i]` by calling `subset.pop()`, then call `dfs(i + 1)`.
6. **Trigger and Return:** Call `dfs(0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Backtracking Decision Tree" default>

```python
class Solution:
    def subsets(self, nums: list[int]) -> list[list[int]]:
        result: list[list[int]] = []
        subset: list[int] = []

        def dfs(i: int) -> None:
            # Base case: choices made for all elements
            if i >= len(nums):
                result.append(subset.copy())
                return

            # Decision 1: INCLUDE nums[i]
            subset.append(nums[i])
            dfs(i + 1)

            # Decision 2: EXCLUDE nums[i] (backtrack)
            subset.pop()
            dfs(i + 1)

        dfs(0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative Cascading">

```python
class Solution:
    def subsets(self, nums: list[int]) -> list[list[int]]:
        result: list[list[int]] = [[]]
        
        for num in nums:
            # For each existing subset, create a new one containing num
            result += [curr + [num] for curr in result]
            
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative Cascading** | $O(n \cdot 2^n)$ | $O(n \cdot 2^n)$ | Iteratively doubles existing subsets by copying. Simple to read, but allocates many intermediate arrays. |
| **Backtracking Decision Tree** | $O(n \cdot 2^n)$ | $O(n)$ | Traverses a binary state tree with one mutable list. Uses optimal $O(n)$ auxiliary recursion stack space. |

---

### Common Pitfall: Appending Mutable List Without Copying

In Python, writing `result.append(subset)` stores a reference to the mutable list rather than a point-in-time snapshot. As subsequent recursive steps mutate and empty `subset` via `pop()`, every element previously appended into `result` mutates in place, resulting in an output filled entirely with empty lists `[[], [], ...]`.

Always append a copy using `result.append(subset.copy())` or `result.append(list(subset))`.

---

### Concise Interview Takeaway

For **Subsets**, structure the state space as a binary decision tree where each level decides whether to include or exclude an element. By maintaining a single mutable path list and undoing additions with `pop()`, you generate all $2^n$ subsets while bounding auxiliary memory strictly to the recursion tree height of $O(n)$.
