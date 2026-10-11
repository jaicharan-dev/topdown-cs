---
id: 4-middle-of-the-linked-list
title: "876. Middle of the Linked List"
description: "Single-pass fast and slow pointer midpoint detection"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** Given the `head` of a singly linked list, return the middle node of the list. If there are two middle nodes, return the second middle node.

```text
Input:  head = [1, 2, 3, 4, 5]
Output: [3, 4, 5]
Explanation: The middle node of the list is node 3 (serialized as [3, 4, 5]).
```

---

### The Intuitive Mental Model

Imagine two runners starting at the same starting line on a straight track:
- **The Slow Runner (`slow`):** Advances 1 step per turn.
- **The Fast Runner (`fast`):** Advances 2 steps per turn (twice as fast).

Because the fast runner travels at double the speed of the slow runner, when `fast` reaches the end of the list, `slow` has covered exactly half the distance and rests directly on the middle node.

#### Brute Force: Two-Pass Length Counting
A straightforward approach is to traverse the entire list to count the total number of nodes $n$. Then, start a second traversal from `head` and advance $n // 2$ steps to locate the middle node. While this runs in linear time $O(n)$, it requires two full passes across the list.

#### Optimal Approach: Single-Pass Fast and Slow Pointers
Instead of counting beforehand, we advance both pointers simultaneously in a single pass.
- For an **odd** number of nodes (e.g. `[1, 2, 3, 4, 5]`), `fast` lands on the last node (`fast.next is None`), leaving `slow` on node `3`.
- For an **even** number of nodes (e.g. `[1, 2, 3, 4, 5, 6]`), `fast` steps past the end (`fast is None`), placing `slow` on node `4` (the second middle node, exactly as required).

The single loop condition `while fast and fast.next:` gracefully handles both odd and even lengths without extra conditional branching.

#### Execution Walkthrough

Let us trace `head = [1, 2, 3, 4, 5, 6]`:

| Step | Slow Pointer (`slow.val`) | Fast Pointer (`fast.val`) | Fast Can Advance? | Description |
| :---: | :---: | :---: | :---: | :--- |
| **0** | `1` | `1` | Yes | Both pointers start at `head` |
| **1** | `2` | `3` | Yes | `slow` advances 1, `fast` advances 2 |
| **2** | `3` | `5` | Yes | `slow` advances 1, `fast` advances 2 |
| **3** | `4` | `None` | No | `fast` reaches end; loop terminates |
| **End** | `4` | `None` | - | Return `slow` (`4 -> 5 -> 6`) |

---

### Step-by-Step Algorithm

1. **Initialize Pointers:** Set `slow = head` and `fast = head`.
2. **Advance Pointers Simultaneously:** While `fast` is not `None` and `fast.next` is not `None`:
   - Move `slow = slow.next` (1 step).
   - Move `fast = fast.next.next` (2 steps).
3. **Return Midpoint:** Once `fast` can no longer take two steps, return `slow`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Fast & Slow Pointers" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def middleNode(self, head: ListNode | None) -> ListNode | None:
        slow = head
        fast = head

        # fast advances at 2x speed; when fast hits the end, slow is at the midpoint
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        return slow
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Two-Pass Length Counting">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def middleNode(self, head: ListNode | None) -> ListNode | None:
        count = 0
        curr = head
        while curr:
            count += 1
            curr = curr.next

        curr = head
        for _ in range(count // 2):
            if curr:
                curr = curr.next

        return curr
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Fast & Slow Pointers** | $O(n)$ | $O(1)$ | Locates the midpoint in a single pass of $n / 2$ iterations with constant space. |
| **Two-Pass Length Counting** | $O(n)$ | $O(1)$ | Simple counting logic, but traverses the linked list twice ($1.5n$ operations). |

---

### Common Pitfall: Guarding the Fast Pointer Traversal

Checking only `while fast:` without verifying `fast.next` leads to an `AttributeError` when `fast.next` is `None` and the code attempts `fast.next.next`. Both `fast` and `fast.next` must be non-null in the loop predicate to ensure taking two forward steps is completely safe.

---

### Concise Interview Takeaway

For **Middle of the Linked List**, advance `slow` by 1 and `fast` by 2. When `fast` reaches the end (`fast` or `fast.next` is `None`), `slow` is guaranteed to be at the midpoint, naturally landing on the second middle node for even-length lists in a single pass.
