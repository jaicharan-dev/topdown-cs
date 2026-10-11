---
id: 3-linked-list-cycle
title: "141. Linked List Cycle"
description: "Floyd's Tortoise and Hare two-pointer cycle detection"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** Given `head`, the head of a singly linked list, determine if the linked list contains a cycle. A cycle exists if some node in the list can be reached again by continuously following the `next` pointer. Return `true` if there is a cycle in the linked list; otherwise, return `false`.

```text
Input:  head = [3, 2, 0, -4], pos = 1
Output: true
Explanation: There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).
```

---

### The Intuitive Mental Model

Imagine two runners starting at the same starting mark on a track:
- **The Tortoise (`slow`):** Advances 1 node per iteration.
- **The Hare (`fast`):** Advances 2 nodes per iteration.

#### Brute Force: Hash Set of Visited Nodes
A straightforward approach is to record every node object visited in a hash set. At each step, we check if the current node is already in the set. If it is, a cycle exists. While this takes linear time, storing node references requires $O(n)$ extra memory.

#### Optimal Approach: Floyd's Tortoise and Hare
Instead of recording visited nodes, let the two runners race:
1. **Linear Track (No Cycle):** The hare reaches the end of the road (`fast is None` or `fast.next is None`). If the hare hits the boundary, there is no loop.
2. **Circular Loop (Cycle Exists):** Both runners eventually enter the cycle. Because the hare moves 1 step faster than the tortoise each round, the gap between them closes by exactly 1 node per step ($2 - 1 = 1$). A gap of length $k$ shrinks to $k-1, k-2, \dots, 0$. The hare is mathematically guaranteed to collide with the tortoise without jumping over it.

#### Execution Walkthrough

Let us trace `head = [3, 2, 0, -4]` where `-4` loops back to `2`:

| Step | Slow Pointer (`slow.val`) | Fast Pointer (`fast.val`) | Fast Can Advance? | Collision Detected? |
| :---: | :---: | :---: | :---: | :---: |
| **0** | `3` (Head) | `3` (Head) | Yes | Initial state |
| **1** | `2` | `0` | Yes | No (`2 != 0`) |
| **2** | `0` | `2` (looped back) | Yes | No (`0 != 2`) |
| **3** | `-4` | `-4` (caught up) | Yes | **Yes** (`slow == fast`) |

---

### Step-by-Step Algorithm

1. **Initialize Pointers:** Set `slow = head` and `fast = head`.
2. **Iterate with Unequal Speeds:** While `fast` and `fast.next` are not `None`:
   - Advance `slow = slow.next` (1 step).
   - Advance `fast = fast.next.next` (2 steps).
   - Check if `slow == fast`. If they reference the exact same node, return `True`.
3. **Handle List End:** If `fast` or `fast.next` evaluates to `None`, the list is acyclic; return `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Floyd's Cycle Detection" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, x: int):
#         self.val = x
#         self.next = None

class Solution:
    def hasCycle(self, head: ListNode | None) -> bool:
        slow = head
        fast = head

        # Advance while fast runner has valid road ahead
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

            # Collision indicates fast runner lapped slow runner in a cycle
            if slow == fast:
                return True

        return False
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Hash Set Lookup">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, x: int):
#         self.val = x
#         self.next = None

class Solution:
    def hasCycle(self, head: ListNode | None) -> bool:
        seen: set[ListNode] = set()
        curr = head

        while curr:
            if curr in seen:
                return True
            seen.add(curr)
            curr = curr.next

        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Floyd's Fast & Slow** | $O(n)$ | $O(1)$ | Traverses nodes in linear time with zero extra memory allocation. |
| **Hash Set Lookup** | $O(n)$ | $O(n)$ | Intuitive identity tracking, but requires linear auxiliary storage for node references. |

---

### Common Pitfall: Comparing Node Values Instead of References

Never compare node values using `slow.val == fast.val`. A valid, cycle-free list can have identical values across distinct nodes (e.g. `1 -> 2 -> 2 -> None`). To reliably detect a cycle, compare the node identities directly (`slow == fast`), verifying whether both pointers reference the exact same memory address.

---

### Concise Interview Takeaway

For **Linked List Cycle**, use Floyd's cycle-finding algorithm: advance `slow` by 1 node and `fast` by 2 nodes. If `fast` or `fast.next` reaches `None`, the list terminates naturally without cycles. If `slow == fast`, the two pointers collided within a loop. Runs in $O(n)$ time and $O(1)$ space.
