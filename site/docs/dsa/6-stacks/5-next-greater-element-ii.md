---
id: 5-next-greater-element-ii
title: "503. Next Greater Element II"
description: "Circular array simulation via virtual 2n modulo traversal with monotonic stack"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Stack (Circular)</span>

> **Problem Statement:** Given a circular integer array `nums` (where the next element of `nums[n - 1]` is `nums[0]`), return the next greater number for every element in `nums`. If no greater number exists, return `-1` for that element.

```text
Input:  nums = [1, 2, 1]
Output: [2, -1, 2]
Explanation: The first 1's next greater number is 2. The number 2 has no greater element. The second 1 circularly wraps around to find 2.
```

---

### The Intuitive Mental Model

In a standard linear array, elements near the end cannot look behind them for greater numbers. In a circular array, elements can wrap around to index `0` and continue searching until they reach their own starting position.

#### Brute Force: Circular Nested Scan
For each index $i$, run an inner loop inspecting indices `(i + j) % n` for $j$ from $1$ to $n - 1$. The first element strictly greater than `nums[i]` is stored as the answer. If no element is larger after a full circle, store `-1`. For strictly decreasing or uniform arrays, this examines $O(n)$ elements for every item, taking $O(n^2)$ time.

#### Optimal Approach: Virtual 2n Modulo Traversal with Monotonic Stack
To allow elements to wrap around without physically duplicating the array (which wastes memory), we simulate a double-length array by iterating $i$ from $0$ to $2n - 1$. The element at each step is accessed via modulo indexing: `idx = i % n`.

We use a monotonic decreasing stack that holds indices of unresolved elements:
- **Lap 1 ($0 \le i < n$):** Elements look forward for their next greater element. When an arriving element `nums[idx]` is strictly greater than `nums[stack[-1]]`, it resolves and pops elements from the stack. The current index `idx` is then pushed onto the stack.
- **Lap 2 ($n \le i < 2n$):** Elements wrap around to the beginning to resolve any remaining candidates on the stack. Crucially, during this second pass, we only resolve existing elements and never push new indices onto the stack.
- Elements that never find a greater element remain unresolved and retain their initial default value of `-1`.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 1]` with $n = 3$:

| Step `i` | Circular Index `idx` | Element | Action Taken | Stack (Indices) | Result `res` |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **0** | `0` | `1` | Push `0` | `[0]` | `[-1, -1, -1]` |
| **1** | `1` | `2` | `2 > nums[0] (1)`: pop `0`, `res[0] = 2`. Push `1` | `[1]` | `[2, -1, -1]` |
| **2** | `2` | `1` | `1 <= nums[1] (2)`: push `2` | `[1, 2]` | `[2, -1, -1]` |
| **3** | `0` | `1` | Lap 2: `1 <= nums[2] (1)`. Do not push | `[1, 2]` | `[2, -1, -1]` |
| **4** | `1` | `2` | Lap 2: `2 > nums[2] (1)`: pop `2`, `res[2] = 2`. Do not push | `[1]` | `[2, -1, 2]` |
| **5** | `2` | `1` | Lap 2: `1 <= nums[1] (2)`. Do not push | `[1]` | `[2, -1, 2]` |

Index `1` remains on the stack, correctly leaving `res[1] = -1`.

---

### Step-by-Step Algorithm

1. **Initialize Result and Stack:** Create an output array `res = [-1] * n` and an empty list `stack = []` to hold unresolved indices.
2. **Iterate Virtual Indices:** Loop $i$ from $0$ to $2n - 1$:
   - Compute circular index: `idx = i % n`.
   - While `stack` is non-empty and `nums[idx] > nums[stack[-1]]`:
     - Pop `prev_idx = stack.pop()`.
     - Assign `res[prev_idx] = nums[idx]`.
   - If $i < n$ (first pass only):
     - Push `idx` onto `stack`.
3. **Return Result:** Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Virtual 2n Monotonic Stack" default>

```python
class Solution:
    def nextGreaterElements(self, nums: list[int]) -> list[int]:
        n = len(nums)
        res: list[int] = [-1] * n
        stack: list[int] = []  # Stores indices in monotonic decreasing order

        # Traverse the array twice to simulate circular wrap-around
        for i in range(2 * n):
            idx = i % n

            # Resolve all elements on the stack smaller than current element
            while stack and nums[idx] > nums[stack[-1]]:
                prev_idx = stack.pop()
                res[prev_idx] = nums[idx]

            # Only push indices during the first full pass
            if i < n:
                stack.append(idx)

        return res
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Circular Nested Scan">

```python
class Solution:
    def nextGreaterElements(self, nums: list[int]) -> list[int]:
        n = len(nums)
        res: list[int] = [-1] * n

        for i in range(n):
            for j in range(1, n):
                next_idx = (i + j) % n
                if nums[next_idx] > nums[i]:
                    res[i] = nums[next_idx]
                    break

        return res
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Circular Nested Scan)** | $O(n^2)$ | $O(1)$ extra space | Compares every element up to $n - 1$ steps ahead circularly. Too slow for large inputs. |
| **Optimal (Virtual 2n Monotonic Stack)** | $O(n)$ | $O(n)$ | Simulates circular traversal with `i % n`. Each index is pushed once and popped at most once. |

---

### Common Pitfall: Pushing During the Second Pass

A frequent bug is pushing indices onto the stack during the second lap ($i \ge n$). Pushing during the second pass introduces duplicate indices and risks overwriting previously resolved values. The second pass exists strictly to give elements already on the stack a chance to see the front of the array; no new elements should be added.

---

### Concise Interview Takeaway

To handle circular array lookups without duplicating memory, traverse $2n$ steps using `i % n`. Use a monotonic decreasing stack to resolve smaller unresolved indices as larger elements appear. Only push indices during the first pass ($i < n$) so elements that have no greater counterpart naturally retain their default value of `-1`, achieving $O(n)$ time and $O(n)$ space.
