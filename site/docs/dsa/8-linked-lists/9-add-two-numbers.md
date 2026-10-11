---
id: 9-add-two-numbers
title: "2. Add Two Numbers"
description: "Column addition simulation with carry propagation and dummy head"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math Simulation</span>

> **Problem Statement:** You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, where each node contains a single digit. Add the two numbers and return the sum as a linked list.

```text
Input:  l1 = [2, 4, 3], l2 = [5, 6, 4]
Output: [7, 0, 8]
Explanation: 342 + 465 = 807. In reversed linked list representation: [7, 0, 8].
```

---

### The Intuitive Mental Model

Because the digits are stored in reverse order, the heads represent the least significant digits (the ones place $10^0$). Subsequent nodes represent increasing powers of ten ($10^1, 10^2, \dots$). This arrangement mirrors grade-school column addition from right to left.

#### Brute Force: Full Integer Conversion
A naive strategy is to convert both linked lists into integer values, add them together, convert the resulting sum to digits, and reconstruct a new linked list. While Python supports arbitrary-precision integers, in languages like Java or C++ this overflows 64-bit integer limits when lists contain hundreds of digits.

#### Optimal Approach: Digit-by-Digit Addition Simulation
Instead of converting the full numbers, simulate column addition directly on the nodes:
1. At each position, sum the digits plus any incoming carry: $\text{total} = \text{val}_1 + \text{val}_2 + \text{carry}$.
2. The digit stored in the new node is $\text{total} \pmod{10}$.
3. The new carry forwarded to the next position is $\lfloor\text{total} / 10\rfloor$.
4. Use a dummy head node to attach each result node cleanly.

Crucially, the loop must continue while `l1 or l2 or carry` is true so that an incoming carry from the final column (such as $99 + 1 = 100$) produces its own node.

#### Execution Walkthrough

Let us trace `l1 = [2, 4, 3]` and `l2 = [5, 6, 4]`:

| Step | Column Digit 1 | Column Digit 2 | Incoming Carry | Sum (`total`) | New Digit (`total % 10`) | Outgoing Carry (`total // 10`) | Result List State |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | - | - | - | - | - | `0` | `dummy` (0) |
| **1** | `2` | `5` | `0` | $2 + 5 + 0 = 7$ | `7` | `0` | `dummy -> 7` |
| **2** | `4` | `6` | `0` | $4 + 6 + 0 = 10$ | `0` | `1` | `dummy -> 7 -> 0` |
| **3** | `3` | `4` | `1` | $3 + 4 + 1 = 8$ | `8` | `0` | `dummy -> 7 -> 0 -> 8` |
| **End** | `None` | `None` | `0` | - | - | `0` | Return `dummy.next` (`[7, 0, 8]`) |

---

### Step-by-Step Algorithm

1. **Initialize Sentinel and Carry:** Create `dummy = ListNode(0)`, track position with `curr = dummy`, and initialize `carry = 0`.
2. **Iterate Across Columns:** While `l1` is not `None`, or `l2` is not `None`, or `carry != 0`:
   - Extract digit values: `val1 = l1.val if l1 else 0` and `val2 = l2.val if l2 else 0`.
   - Calculate total sum: `total = val1 + val2 + carry`.
   - Update carry: `carry = total // 10`.
   - Create node with digit: `curr.next = ListNode(total % 10)` and advance `curr = curr.next`.
   - Advance list pointers: `l1 = l1.next if l1 else None` and `l2 = l2.next if l2 else None`.
3. **Return Sum Head:** Return `dummy.next`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Simulation" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def addTwoNumbers(self, l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
        dummy = ListNode(0)
        curr = dummy
        carry = 0

        # Loop as long as there is a digit to add or a carry to propagate
        while l1 or l2 or carry:
            val1 = l1.val if l1 else 0
            val2 = l2.val if l2 else 0
            total = val1 + val2 + carry

            carry = total // 10
            curr.next = ListNode(total % 10)
            curr = curr.next

            if l1:
                l1 = l1.next
            if l2:
                l2 = l2.next

        return dummy.next
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Simulation">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def addTwoNumbers(self, l1: ListNode | None, l2: ListNode | None, carry: int = 0) -> ListNode | None:
        if not l1 and not l2 and carry == 0:
            return None

        val1 = l1.val if l1 else 0
        val2 = l2.val if l2 else 0
        total = val1 + val2 + carry

        next_l1 = l1.next if l1 else None
        next_l2 = l2.next if l2 else None

        result_node = ListNode(total % 10)
        result_node.next = self.addTwoNumbers(next_l1, next_l2, total // 10)

        return result_node
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative Simulation** | $O(\max(m, n))$ | $O(\max(m, n))$ | Allocates output list of length $\max(m, n) + 1$ with $O(1)$ auxiliary work per column. |
| **Recursive Simulation** | $O(\max(m, n))$ | $O(\max(m, n))$ | Elegant recursive code, but uses $O(\max(m, n))$ call stack frames. |

---

### Common Pitfall: Omitting the Final Trailing Carry

Consider adding `99` and `1` (`[9, 9]` and `[1]`). When both lists reach `None`, an outstanding `carry = 1` remains. If the loop condition is written strictly as `while l1 or l2:`, the calculation halts with `[0, 0]` ($0$) instead of `[0, 0, 1]` ($100$). Using `while l1 or l2 or carry:` guarantees the final carry node is properly appended.

---

### Concise Interview Takeaway

For **Add Two Numbers**, simulate elementary column addition using a sentinel `dummy` head. Process nodes with the condition `while l1 or l2 or carry:` to seamlessly accommodate unequal list lengths and trailing carry-overs without integer overflow risks. Runs in optimal $O(\max(m, n))$ time.
