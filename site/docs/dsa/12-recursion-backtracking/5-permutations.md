---
id: 5-permutations
title: "46. Permutations"
description: "State tracking with boolean visited array vs in-place element swapping"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Permutations</span>

> **Problem Statement:** Given an array `nums` of distinct integers, return all the possible permutations. You may return the answer in any order.

```text
Input:  nums = [1, 2, 3]
Output: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
Explanation: All 3! = 6 unique orderings are returned.
```

---

### The Intuitive Mental Model

Imagine assigning medal placements on an Olympic podium for $n$ runners. In combinations, `[1, 2, 3]` and `[3, 2, 1]` are considered the same group. In permutations, ordering is paramount: `[1, 2, 3]` is completely different from `[3, 2, 1]`.

For an array of length $n$, there are mathematically $n!$ unique permutations:
- For the first podium position, you have $n$ available runners.
- For the second position, you have $n - 1$ remaining runners.
- For the final position, you have only $1$ runner left.
- Total permutations: $n \times (n - 1) \times \dots \times 1 = n!$.

To explore every possibility without reusing the same runner twice in a single arrangement:
- Maintain a boolean mask `used` of size $n$.
- At each step, iterate through all $n$ candidates: if `used[i]` is `False`, pick `nums[i]`, mark `used[i] = True`, and recurse.
- Upon returning, unmark `used[i] = False` and pop `nums[i]` so subsequent sibling branches can use that candidate.

#### Brute Force: Slicing Remaining Elements
At each recursion step, create a new sliced array containing all elements except the chosen one: `permute(nums[:i] + nums[i+1:])`. While functionally correct, copying sub-arrays at every tree node creates significant memory allocation overhead and increases runtime by an extra factor of $O(n)$.

#### Optimal Approach: Visited Array Backtracking
Use a preallocated boolean array `used = [False] * n` alongside a single mutable `path` list. State checks and updates happen in $O(1)$ time per transition. Alternatively, in-place element swapping can eliminate auxiliary boolean tracking altogether.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 3]` using a visited array to generate the first branches:

| Step | Current Path | Visited Mask (`used`) | Next Candidate | Action Taken | Result Collected |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `[]` | `[F, F, F]` | `nums[0] = 1` | Choose `1`, mark `used[0] = T` | `[]` |
| **2** | `[1]` | `[T, F, F]` | `nums[1] = 2` | Choose `2`, mark `used[1] = T` | `[]` |
| **3** | `[1, 2]` | `[T, T, F]` | `nums[2] = 3` | Choose `3`, mark `used[2] = T` | `[]` |
| **4** | `[1, 2, 3]` | `[T, T, T]` | - | Base case: collect snapshot | `[[1, 2, 3]]` |
| **5** | `[1, 2]` | `[T, T, F]` | - | Backtrack: pop `3`, unmark `used[2]` | `[[1, 2, 3]]` |
| **6** | `[1]` | `[T, F, F]` | - | Backtrack: pop `2`, unmark `used[1]` | `[[1, 2, 3]]` |
| **7** | `[1]` | `[T, F, F]` | `nums[2] = 3` | Choose `3`, mark `used[2] = T` | `[[1, 2, 3]]` |
| **8** | `[1, 3]` | `[T, F, T]` | `nums[1] = 2` | Choose `2`, mark `used[1] = T` | `[[1, 2, 3]]` |
| **9** | `[1, 3, 2]` | `[T, T, T]` | - | Base case: collect snapshot | `[[1, 2, 3], [1, 3, 2]]` |

---

### Step-by-Step Algorithm

1. **Initialize State:** Create `result = []`, `path = []`, and `used = [False] * len(nums)`.
2. **Define Recursive DFS:** Define helper `dfs()`.
3. **Base Case Check:** If `len(path) == len(nums)`, all elements are assigned. Append a copy of `path` to `result` and return.
4. **Iterate Candidates:** Loop index `i` from `0` to `len(nums) - 1`:
   - If `used[i]` is `True`, continue to the next candidate.
   - **Choose:** Append `nums[i]` to `path` and mark `used[i] = True`.
   - **Explore:** Recurse with `dfs()`.
   - **Backtrack:** Pop `nums[i]` from `path` and reset `used[i] = False`.
5. **Trigger and Return:** Call `dfs()` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Visited Array Backtracking" default>

```python
class Solution:
    def permute(self, nums: list[int]) -> list[list[int]]:
        result: list[list[int]] = []
        path: list[int] = []
        used = [False] * len(nums)

        def dfs() -> None:
            # Base case: full permutation formed
            if len(path) == len(nums):
                result.append(path.copy())
                return

            for i in range(len(nums)):
                if used[i]:
                    continue

                # Choose
                path.append(nums[i])
                used[i] = True

                # Explore
                dfs()

                # Backtrack
                path.pop()
                used[i] = False

        dfs()
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: In-Place Swapping">

```python
class Solution:
    def permute(self, nums: list[int]) -> list[list[int]]:
        result: list[list[int]] = []

        def backtrack(start: int) -> None:
            # Base case: current arrangement is complete
            if start == len(nums):
                result.append(nums.copy())
                return

            for i in range(start, len(nums)):
                # Swap candidate into the start position
                nums[start], nums[i] = nums[i], nums[start]
                backtrack(start + 1)
                # Swap back to restore state
                nums[start], nums[i] = nums[i], nums[start]

        backtrack(0)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Slicing Subarrays** | $O(n^2 \cdot n!)$ | $O(n \cdot n!)$ | Creates sliced copies of remaining candidates at every recursion frame. High allocation overhead. |
| **Visited Array Backtracking** | $O(n \cdot n!)$ | $O(n)$ | Uses a single mutable path and boolean array with $O(1)$ state updates. Standard interview pattern. |
| **In-Place Swapping** | $O(n \cdot n!)$ | $O(n)$ | Swaps elements in the original list without allocating a visited array. Saves auxiliary memory. |

*(Note: Output storage requires $O(n \cdot n!)$ space across all implementations.)*

---

### Common Pitfall: Forgetting to Reset the Visited Flag

If you append to `path` and set `used[i] = True`, but forget to reset `used[i] = False` during the backtrack phase, that element remains locked for subsequent sibling branches. The search tree runs out of valid candidates prematurely, resulting in missing or incomplete permutations.

Always ensure the state restoration (`used[i] = False`) mirrors the state change (`used[i] = True`) directly after the recursive call.

---

### Concise Interview Takeaway

For **Permutations**, explore all $n$ candidates from index $0$ at every level while tracking assigned positions with a boolean `used` mask. Upon returning from recursion, unmark the visited flag and pop the element to restore state. This constructs all $n!$ orderings in $O(n \cdot n!)$ time using $O(n)$ auxiliary recursion space.
