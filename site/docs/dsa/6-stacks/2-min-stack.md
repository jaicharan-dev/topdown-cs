---
id: 2-min-stack
title: "155. Min Stack"
description: "Parallel historical minimum tracking stack in O(1) time"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Auxiliary Min Stack</span>

> **Problem Statement:** Design a stack that supports `push`, `pop`, `top`, and retrieving the minimum element in constant $O(1)$ time. Implement the `MinStack` class with `push(val)`, `pop()`, `top()`, and `getMin()`.

```text
Input:  ["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"]
        [[], [-2], [0], [-3], [], [], [], []]
Output: [null, null, null, null, -3, null, 0, -2]
Explanation:
MinStack minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
minStack.getMin(); // returns -3
minStack.pop();
minStack.top();    // returns 0
minStack.getMin(); // returns -2
```

---

### The Intuitive Mental Model

In a standard stack, finding the minimum element requires scanning all elements in $O(n)$ time. Attempting to track the minimum with a single scalar variable (`min_val`) works during `push`, but fails completely during `pop`: if the minimum element is removed, the previous minimum is lost unless the entire stack is rescanned.

#### Brute Force: Linear Scan on Query
The naive strategy maintains a single standard stack. While `push`, `pop`, and `top` execute in $O(1)$ time, retrieving the minimum element via `getMin()` iterates across all $n$ elements in the stack using Python's `min(self.stack)`. This results in $O(n)$ query time, failing the problem contract requiring constant-time retrieval for all operations.

#### Optimal Approach: Historical Minimum Snapshots
Because a stack is strictly Last-In, First-Out (LIFO), popping an element is equivalent to stepping backward in time. Every time a new element is pushed, we can record a snapshot of the minimum element across the stack up to that exact depth.

We maintain a companion auxiliary stack, `min_stack`:
- When pushing a value `val`, determine the new minimum: `current_min = min(val, min_stack[-1])` (or simply `val` if `min_stack` is empty). Append `current_min` to `min_stack`.
- When popping, pop from both `stack` and `min_stack` simultaneously. The previous minimum is instantly restored to the top of `min_stack`.
- `getMin()` simply inspects the top element of `min_stack` in $O(1)$ time.

#### Execution Walkthrough

Let us trace the sequence of operations:

| Step | Operation | Value | Main Stack | Min Stack | `getMin()` Result |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `push(-2)` | `-2` | `[-2]` | `[-2]` | `-2` |
| **2** | `push(0)` | `0` | `[-2, 0]` | `[-2, -2]` | `-2` |
| **3** | `push(-3)` | `-3` | `[-2, 0, -3]` | `[-2, -2, -3]` | `-3` |
| **4** | `getMin()` | - | `[-2, 0, -3]` | `[-2, -2, -3]` | `-3` |
| **5** | `pop()` | - | `[-2, 0]` | `[-2, -2]` | - |
| **6** | `top()` | - | `[-2, 0]` | `[-2, -2]` | `0` |
| **7** | `getMin()` | - | `[-2, 0]` | `[-2, -2]` | `-2` |

---

### Step-by-Step Algorithm

1. **Initialize State:** Create two empty lists, `self.stack` for primary values and `self.min_stack` for minimum snapshots.
2. **Push Value (`push(val)`):**
   - Append `val` to `self.stack`.
   - If `self.min_stack` is empty, append `val` to `self.min_stack`.
   - Otherwise, append `min(val, self.min_stack[-1])` to `self.min_stack`.
3. **Pop Value (`pop()`):**
   - Remove and discard the top item of `self.stack`.
   - Remove and discard the top item of `self.min_stack`.
4. **Top Value (`top()`):**
   - Return the last element `self.stack[-1]`.
5. **Get Minimum (`getMin()`):**
   - Return the last element `self.min_stack[-1]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Dual Auxiliary Stacks" default>

```python
class MinStack:
    def __init__(self) -> None:
        self.stack: list[int] = []
        self.min_stack: list[int] = []

    def push(self, val: int) -> None:
        self.stack.append(val)
        # Compute the running minimum at this exact stack depth
        current_min = val if not self.min_stack else min(val, self.min_stack[-1])
        self.min_stack.append(current_min)

    def pop(self) -> None:
        self.stack.pop()
        self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Single Stack of Tuples">

```python
class MinStack:
    def __init__(self) -> None:
        # Each entry stores (val, current_min_at_this_depth)
        self.stack: list[tuple[int, int]] = []

    def push(self, val: int) -> None:
        current_min = val if not self.stack else min(val, self.stack[-1][1])
        self.stack.append((val, current_min))

    def pop(self) -> None:
        self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]

    def getMin(self) -> int:
        return self.stack[-1][1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Scan on Query)** | $O(1)$ push/pop, $O(n)$ getMin | $O(1)$ extra space | Avoids extra memory overhead, but linear searches fail the strict $O(1)$ constant-time requirement for `getMin`. |
| **Optimal (Dual Auxiliary Stacks)** | $O(1)$ all operations | $O(n)$ extra space | Stores running minimum snapshots at each depth, achieving constant time across all four operations. |

---

### Common Pitfall: Desynchronized Stack Pops

A common error is keeping a scalar `current_min` variable or conditionally pushing onto `min_stack` only when a strictly smaller value arrives, but forgetting equal duplicates. For example, if `-2` is pushed twice and only recorded once on `min_stack`, the first `pop()` removes `-2` from `min_stack`, corrupting the minimum for the second `-2`. Synchronizing both stacks on every single `push` and `pop` operation eliminates this edge case completely.

---

### Concise Interview Takeaway

A single minimum variable cannot survive pop operations without rescanning. Maintain a parallel auxiliary stack to track the running minimum at every depth in LIFO history. Both push and pop remain strictly synchronized, allowing `push`, `pop`, `top`, and `getMin` to execute in constant $O(1)$ time with $O(n)$ auxiliary space.
