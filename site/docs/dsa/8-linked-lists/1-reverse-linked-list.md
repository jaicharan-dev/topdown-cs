---
id: 1-reverse-linked-list
title: "206. Reverse Linked List"
description: "Iterative pointer redirection with prev, curr, and nxt"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Pointer Reversal</span>

> **Problem Statement:** Given the `head` of a singly linked list, reverse the list and return the reversed list's new head.

```text
Input:  head = [1, 2, 3, 4, 5]
Output: [5, 4, 3, 2, 1]
Explanation: The direction of all pointers is reversed, making node 5 the new head.
```

---

### The Intuitive Mental Model

Imagine a line of people where each person points to the person ahead of them. To reverse the direction of the line, every person must turn around and point to the person behind them.

#### Brute Force: Collecting Values in an Array
The naive approach is to traverse the linked list, extract all node values into an array, reverse the array, and then reconstruct a brand-new linked list or overwrite the existing node values. While this works in $O(n)$ time, it allocates $O(n)$ auxiliary memory and fails to modify the pointer topology directly in-place.

#### Optimal Approach: In-Place Pointer Redirection
Instead of allocating auxiliary memory, we can reverse the pointers directly in-place using three pointers: `prev`, `curr`, and `nxt`.

The golden rule of pointer manipulation is to never break a link before saving where it leads. At each step:
1. Cache the next node (`nxt = curr.next`) so the remainder of the list is not lost.
2. Redirect `curr.next` to point backwards to `prev`.
3. Shift `prev` forward to `curr`.
4. Shift `curr` forward to `nxt`.

When `curr` reaches `None`, `prev` rests on the final node of the original list, which is now the new head of the reversed list.

#### Execution Walkthrough

Let us trace `head = [1, 2, 3]` to `[3, 2, 1]`:

| Step | Current Node (`curr`) | Next Node (`nxt`) | Action Taken | Reversed Link | Previous Node (`prev`) |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **0** | `1` | `2` | Initial state | None | `None` |
| **1** | `1` | `2` | Point `1.next` to `None`, advance pointers | `1 -> None` | `1` |
| **2** | `2` | `3` | Point `2.next` to `1`, advance pointers | `2 -> 1 -> None` | `2` |
| **3** | `3` | `None` | Point `3.next` to `2`, advance pointers | `3 -> 2 -> 1 -> None` | `3` |
| **End** | `None` | `None` | Loop terminates (`curr is None`) | Return `prev` (`3`) | `3` |

---

### Step-by-Step Algorithm

1. **Initialize Pointers:** Set `prev = None` and `curr = head`.
2. **Traverse the List:** Loop while `curr` is not `None`:
   - **Save Next Node:** Store `nxt = curr.next` to preserve access to the remaining nodes.
   - **Reverse Link:** Point `curr.next = prev`.
   - **Advance Previous:** Move `prev = curr`.
   - **Advance Current:** Move `curr = nxt`.
3. **Return New Head:** Return `prev` as the new head of the reversed list.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative In-Place Reversal" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head: ListNode | None) -> ListNode | None:
        prev = None
        curr = head

        while curr:
            # 1. Save the next node before breaking the forward pointer
            nxt = curr.next
            # 2. Reverse the link to point backward
            curr.next = prev
            # 3. Slide prev and curr forward by one position
            prev = curr
            curr = nxt

        # When curr is None, prev rests on the new head of the reversed list
        return prev
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Reversal">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head: ListNode | None) -> ListNode | None:
        # Base case: empty list or single node is already reversed
        if not head or not head.next:
            return head

        # Recursively reverse the rest of the list
        new_head = self.reverseList(head.next)

        # Make the next node point back to the current node
        head.next.next = head
        head.next = None

        return new_head
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative In-Place** | $O(n)$ | $O(1)$ | Reverses pointers directly in a single pass using constant extra memory. |
| **Recursive Reversal** | $O(n)$ | $O(n)$ | Elegant recursive formulation, but consumes $O(n)$ stack frames. |

---

### Common Pitfall: Severing the Forward Link

The most frequent error is updating `curr.next = prev` before caching `curr.next`. The moment `curr.next` is overwritten, the reference to the remainder of the list is lost permanently, resulting in unreachable nodes or broken loops. Always assign `nxt = curr.next` before redirecting the current pointer.

---

### Concise Interview Takeaway

For **Reverse Linked List**, use the classic four-step pointer slide: save `nxt = curr.next`, redirect `curr.next = prev`, advance `prev = curr`, and advance `curr = nxt`. Once `curr` runs into `None`, `prev` points directly to the head of the reversed list, running in $O(n)$ time and $O(1)$ space.
