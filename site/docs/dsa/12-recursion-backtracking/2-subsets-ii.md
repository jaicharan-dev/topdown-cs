---
id: 2-subsets-ii
title: "90. Subsets II"
description: "Sorting and skipping duplicate sibling elements in the exclusion branch"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Duplicate Pruning</span>

> **Problem Statement:** Given an integer array `nums` that may contain duplicate elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.

```text
Input:  nums = [1, 2, 2]
Output: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
Explanation: Duplicate elements are grouped together so that duplicate subsets like [1, 2] are not generated twice.
```

---

### The Intuitive Mental Model

Imagine packing for a trip where your checklist contains duplicate items: `[1, 2, 2]`. If you apply a standard include/exclude decision tree naively, multiple branches produce the exact same outcome:
- Include `1`, include the first `2`, exclude the second `2`: results in `[1, 2]`.
- Include `1`, exclude the first `2`, include the second `2`: results in `[1, 2]`.

Both paths produce identical subsets. To prevent duplicate subsets at their root, we enforce an exclusion rule: whenever you choose to leave an element behind at a particular decision level, you must refuse to pick any subsequent copy of that exact same value at that same level.

#### Brute Force: Hash Set Deduplication
Generate every possible subset naively, sort each subset, convert it into an immutable tuple, and insert it into a hash set. While this filters out duplicates, it explores completely redundant subtrees, wastes time generating identical paths, and requires extra memory to store every tuple in a hash set.

#### Optimal Approach: Sort and Prune Siblings
By sorting the array first, identical elements are guaranteed to sit next to each other. When traversing the state tree:
1. **Include branch:** Take `nums[i]` and advance to `i + 1`.
2. **Exclude branch:** Undo the inclusion with `pop()`. Then fast-forward the index `i` past all identical neighbors: `while i + 1 < len(nums) and nums[i] == nums[i + 1]: i += 1`.
3. Finally, advance to `i + 1` from the last duplicate's position.

This prunes redundant sibling branches before they ever execute, ensuring every generated branch is unique.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 2]` after sorting:

| Step | Index `i` | Choice Made | Path State (`subset`) | Action Taken | Result Collected |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` | Include `1` | `[1]` | Recurse to `i = 1` | `[]` |
| **2** | `1` | Include `2` (first) | `[1, 2]` | Recurse to `i = 2` | `[]` |
| **3** | `2` | Include `2` (second) | `[1, 2, 2]` | Recurse to `i = 3` | `[]` |
| **4** | `3` | Base case reached | `[1, 2, 2]` | Snapshot `[1, 2, 2]` | `[[1, 2, 2]]` |
| **5** | `2` | Backtrack, skip dups | `[1, 2]` | Recurse to `i = 3` | `[[1, 2, 2]]` |
| **6** | `3` | Base case reached | `[1, 2]` | Snapshot `[1, 2]` | `[[1, 2, 2], [1, 2]]` |
| **7** | `1` | Backtrack, skip dups | `[1]` | `nums[1] == nums[2]`, fast-forward `i` to `2` | `[[1, 2, 2], [1, 2]]` |
| **8** | `2` | Exclude branch | `[1]` | Recurse to `i = 3` | `[[1, 2, 2], [1, 2]]` |
| **9** | `3` | Base case reached | `[1]` | Snapshot `[1]` | `[[1, 2, 2], [1, 2], [1]]` |
| **10** | `0` | Backtrack | `[]` | Recurse to `i = 1` | `[[1, 2, 2], [1, 2], [1]]` |
| **11** | `1` | Include `2` (first) | `[2]` | Recurse to `i = 2` | `[[1, 2, 2], [1, 2], [1]]` |
| **12** | `2` | Include `2` (second) | `[2, 2]` | Recurse to `i = 3` | `[[1, 2, 2], [1, 2], [1]]` |
| **13** | `3` | Base case reached | `[2, 2]` | Snapshot `[2, 2]` | `[[...], [2, 2]]` |
| **14** | `2` | Backtrack, skip dups | `[2]` | Recurse to `i = 3` | `[[...], [2, 2]]` |
| **15** | `3` | Base case reached | `[2]` | Snapshot `[2]` | `[[...], [2, 2], [2]]` |
| **16** | `1` | Backtrack, skip dups | `[]` | `nums[1] == nums[2]`, fast-forward `i` to `2` | `[[...], [2, 2], [2]]` |
| **17** | `2` | Exclude branch | `[]` | Recurse to `i = 3` | `[[...], [2, 2], [2]]` |
| **18** | `3` | Base case reached | `[]` | Snapshot `[]` | `[[...], [2, 2], [2], []]` |

---

### Step-by-Step Algorithm

1. **Sort Input:** Sort `nums` in ascending order so identical values are contiguous.
2. **Initialize State:** Create `result = []` and `subset = []`.
3. **Define Recursive DFS:** Define `dfs(i)` to evaluate the element at index `i`.
4. **Base Case Check:** If `i == len(nums)`, all elements have been evaluated. Append a copy of `subset` to `result` and return.
5. **Include Branch:** Append `nums[i]` to `subset`, then call `dfs(i + 1)`.
6. **Backtrack and Prune:** Pop `nums[i]` from `subset`. Advance `i` past all identical neighbors:
   ```python
   while i + 1 < len(nums) and nums[i] == nums[i + 1]:
       i += 1
   ```
7. **Exclude Branch:** Call `dfs(i + 1)` using the updated index.
8. **Trigger and Return:** Call `dfs(0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Backtracking with Duplicate Pruning" default>

```python
class Solution:
    def subsetsWithDup(self, nums: list[int]) -> list[list[int]]:
        result: list[list[int]] = []
        subset: list[int] = []

        # Sort upfront to cluster identical elements together
        nums.sort()

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

            # Skip all identical sibling values to avoid duplicate subsets
            while i + 1 < len(nums) and nums[i] == nums[i + 1]:
                i += 1

            dfs(i + 1)

        dfs(0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Hash Set Deduplication">

```python
class Solution:
    def subsetsWithDup(self, nums: list[int]) -> list[list[int]]:
        nums.sort()
        seen: set[tuple[int, ...]] = set()
        subset: list[int] = []

        def dfs(i: int) -> None:
            if i >= len(nums):
                seen.add(tuple(subset))
                return

            subset.append(nums[i])
            dfs(i + 1)
            subset.pop()
            dfs(i + 1)

        dfs(0)
        return [list(t) for t in seen]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Hash Set Deduplication** | $O(n \cdot 2^n)$ | $O(n \cdot 2^n)$ | Explores redundant branches and hashes each subset into a set. High auxiliary memory overhead. |
| **Backtracking with Duplicate Pruning** | $O(n \cdot 2^n)$ | $O(n)$ | Sorts upfront in $O(n \log n)$ and prunes duplicate sibling branches in-flight. Minimal $O(n)$ auxiliary stack space. |

---

### Common Pitfall: Forgetting to Sort Before Pruning

The sibling skipping logic `nums[i] == nums[i + 1]` relies entirely on duplicate numbers being adjacent. If `nums = [2, 1, 2]` is not sorted first, the two `2` values are separated by `1`. The adjacent comparison fails to detect the relationship, and both branches will be explored, causing `[2, 1]` to appear twice in the output. Always sort the input array as the very first step.

---

### Concise Interview Takeaway

For **Subsets II**, sort the array first so identical values are clustered together. When taking an element, advance normally to the next index. When leaving an element, fast-forward past all identical adjacent values before exploring the exclusion branch. This prunes duplicate subtrees at the root and preserves optimal $O(n)$ auxiliary stack space.
