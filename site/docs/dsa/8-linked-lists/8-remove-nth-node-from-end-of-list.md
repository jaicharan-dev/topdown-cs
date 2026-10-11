---
id: 8-remove-nth-node-from-end-of-list
title: "19. Remove Nth Node From End of List"
description: "Two pointers spaced n nodes apart with dummy head sentinel"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** Given the `head` of a singly linked list, remove the $n$-th node from the end of the list and return its head.

```text
Input:  head = [1, 2, 3, 4, 5], n = 2
Output: [1, 2, 3, 5]
Explanation: The 2nd node from the end is 4. Removing it results in 1 -> 2 -> 3 -> 5.
```

---

### The Intuitive Mental Model

To remove any node from a singly linked list, you must position a pointer at its immediate predecessor. The challenge is locating the $n$-th node from the end when links only allow forward traversal.

#### Brute Force: Two-Pass Length Calculation
A simple approach is to traverse the entire list to count its total length $L$. In a second pass, you walk $L - n$ steps from the dummy node to reach the predecessor of the target node, then sever the link. While this runs in $O(L)$ time, it requires two complete traversals over the nodes.

#### Optimal Approach: Fixed-Gap Two Pointers with Sentinel Node
Instead of two passes, use a two-pointer measuring stick:
1. Attach a sentinel `dummy` node before `head`. This cleanly handles deleting the head node without special branch logic.
2. Advance `fast` forward by $n$ steps from `dummy`. The gap between `slow` and `fast` is now exactly $n$ nodes.
3. Slide both `slow` and `fast` forward together at the same speed until `fast` rests on the final node (`fast.next is None`).
4. Because the gap is fixed at $n$, `slow` rests directly on the predecessor of the node to be removed.
5. Snip the target node out in constant time: `slow.next = slow.next.next`.

#### Execution Walkthrough

Let us trace `head = [1, 2, 3, 4, 5]` with $n = 2$:

| Step | Slow Pointer (`slow.val`) | Fast Pointer (`fast.val`) | Action Description | Gap Size |
| :---: | :---: | :---: | :--- | :---: |
| **0** | `dummy` (0) | `dummy` (0) | Initialize dummy sentinel | 0 |
| **1** | `dummy` (0) | `2` | Advance `fast` by $n = 2$ steps | 2 |
| **2** | `1` | `3` | Advance both pointers | 2 |
| **3** | `2` | `4` | Advance both pointers | 2 |
| **4** | `3` | `5` (tail node) | `fast.next is None`; stop loop | 2 |
| **Cut** | `3` | `5` | Set `slow.next = slow.next.next` (removes node `4`) | - |

---

### Step-by-Step Algorithm

1. **Initialize Sentinel Node:** Create `dummy = ListNode(0, head)`, then set `slow = dummy` and `fast = dummy`.
2. **Establish the Gap:** Advance `fast` forward by $n$ steps.
3. **Slide the Window:** Advance both `slow` and `fast` by 1 node until `fast.next` is `None`.
4. **Bypass Target Node:** Relink `slow.next = slow.next.next`.
5. **Return Result:** Return `dummy.next`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: One-Pass Two Pointers with Sentinel" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def removeNthFromEnd(self, head: ListNode | None, n: int) -> ListNode | None:
        # Dummy node protects against edge cases when removing the head node
        dummy = ListNode(0, head)
        slow = dummy
        fast = dummy

        # 1. Advance fast pointer n steps ahead to establish an n-node gap
        for _ in range(n):
            if fast.next:
                fast = fast.next

        # 2. Advance both pointers until fast reaches the last node
        while fast.next:
            fast = fast.next
            slow = slow.next

        # 3. slow is now at the predecessor of the target node; snip it out
        slow.next = slow.next.next

        return dummy.next
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
    def removeNthFromEnd(self, head: ListNode | None, n: int) -> ListNode | None:
        dummy = ListNode(0, head)
        length = 0
        curr = head

        # First pass: calculate total list length
        while curr:
            length += 1
            curr = curr.next

        # Second pass: advance to the predecessor node
        curr = dummy
        for _ in range(length - n):
            if curr:
                curr = curr.next

        # Snip out the target node
        if curr and curr.next:
            curr.next = curr.next.next

        return dummy.next
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **One-Pass Two Pointers** | $O(L)$ | $O(1)$ | Locates and deletes the target node in a single pass using constant extra memory. |
| **Two-Pass Length Counting** | $O(L)$ | $O(1)$ | Straightforward two-pass logic, but requires traversing up to $2L - n$ nodes. |

---

### Common Pitfall: Forgetting the Sentinel Node When Removing the Head

If the list has length $L$ and $n = L$, the node to remove is the very first node (`head`). Without a dummy sentinel node preceding `head`, attempting to position a predecessor pointer before `head` causes an index error or necessitates dedicated conditional logic. Initializing `dummy = ListNode(0, head)` handles all deletions identically.

---

### Concise Interview Takeaway

For **Remove Nth Node From End of List**, anchor the list with `dummy = ListNode(0, head)`. Push `fast` forward by $n$ steps, then slide both `slow` and `fast` until `fast.next` is `None`. At that point, `slow` is positioned directly at the predecessor, allowing deletion with `slow.next = slow.next.next` in a single pass of $O(L)$ time and $O(1)$ space.
