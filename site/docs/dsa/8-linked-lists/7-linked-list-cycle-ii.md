---
id: 7-linked-list-cycle-ii
title: "142. Linked List Cycle II"
description: "Floyd's cycle detection with mathematical pointer reset to find the cycle entrance"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** Given the `head` of a singly linked list, return the node where the cycle begins. If there is no cycle, return `null`. Do not modify the linked list.

```text
Input:  head = [3, 2, 0, -4], pos = 1
Output: Reference of node with value = 2
Explanation: There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed), which has value 2.
```

---

### The Intuitive Mental Model

Detecting whether a cycle exists is the first half of the puzzle. Pinpointing the exact node where the cycle begins requires exploiting the mathematical relationship between the distance from `head` to the entrance and the distance around the cycle.

#### Brute Force: Hash Set of Visited Nodes
The most direct approach is to store each visited node in a hash set. As we traverse the list, the very first node encountered that is already present in the set must be the cycle entrance. While this operates in $O(n)$ time, it consumes $O(n)$ auxiliary space to retain node references.

#### Optimal Approach: Floyd's Phase 2 Pointer Reset
We model the list structure as a rho-shape ($\rho$):
- Let $L$ be the distance from `head` to the cycle entrance.
- Let $k$ be the distance from the cycle entrance to the meeting point $M$.
- Let $C$ be the circumference of the cycle.

When the slow and fast runners collide at $M$:
- The slow runner has covered: $D_{\text{slow}} = L + k$
- The fast runner has covered: $D_{\text{fast}} = 2 \times D_{\text{slow}} = 2(L + k)$

Because the fast runner has circled the loop an integer number of times $n$:
$$2(L + k) = L + k + nC \implies L + k = nC \implies L = nC - k$$

This algebraic equality shows that the distance from `head` to the cycle entrance ($L$) equals the distance from the meeting point $M$ forward to the entrance ($nC - k$).

Therefore, resetting `slow` to `head` while leaving `fast` at $M$, and advancing both at identical 1-step increments, guarantees they will meet directly at the cycle entrance.

#### Execution Walkthrough

Let us trace `head = [3, 2, 0, -4]` where `-4` links back to `2` ($L=1$, $C=3$, collision at `-4`):

| Phase | Step | Slow Pointer (`slow.val`) | Fast Pointer (`fast.val`) | Event Description |
| :---: | :---: | :---: | :---: | :--- |
| **Phase 1** | **0** | `3` | `3` | Both pointers start at `head` |
| **Phase 1** | **1** | `2` | `0` | `slow` moves 1 step, `fast` moves 2 steps |
| **Phase 1** | **2** | `0` | `2` | `fast` loops past `-4` back to `2` |
| **Phase 1** | **3** | `-4` | `-4` | **Collision detected** at node `-4` |
| **Phase 2** | **Reset** | `3` (Reset to `head`) | `-4` (Stationed at collision) | Prepare equal-speed march |
| **Phase 2** | **4** | `2` | `2` | Both advance 1 step: **Collision at entrance** |

---

### Step-by-Step Algorithm

1. **Detect Collision (Phase 1):**
   - Initialize `slow = head` and `fast = head`.
   - While `fast` and `fast.next` are not `None`:
     - Advance `slow = slow.next` (1 step).
     - Advance `fast = fast.next.next` (2 steps).
     - If `slow == fast`, collision found; break out of the loop.
   - If `fast` or `fast.next` becomes `None`, no cycle exists; return `None`.
2. **Reset Pointer (Phase 2):**
   - Reset `slow = head`, while keeping `fast` at the collision node.
3. **Locate Entrance:**
   - While `slow != fast`:
     - Advance `slow = slow.next` (1 step).
     - Advance `fast = fast.next` (1 step).
4. **Return Entrance:** When `slow == fast`, return `slow`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Floyd's Algorithm with Pointer Reset" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, x: int):
#         self.val = x
#         self.next = None

class Solution:
    def detectCycle(self, head: ListNode | None) -> ListNode | None:
        slow = head
        fast = head

        # Phase 1: Determine if a cycle exists
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow == fast:
                break
        else:
            # Reached the end; no cycle exists
            return None

        # Phase 2: Reset slow to head; advance both at 1 step per turn
        slow = head
        while slow != fast:
            slow = slow.next
            fast = fast.next

        return slow
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
    def detectCycle(self, head: ListNode | None) -> ListNode | None:
        seen: set[ListNode] = set()
        curr = head

        while curr:
            if curr in seen:
                return curr
            seen.add(curr)
            curr = curr.next

        return None
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Floyd's Pointer Reset** | $O(n)$ | $O(1)$ | Traverses at most $2n$ steps across two phases with zero auxiliary heap allocation. |
| **Hash Set Lookup** | $O(n)$ | $O(n)$ | Straightforward identification, but requires linear space for node addresses. |

---

### Common Pitfall: Advancing at Asymmetric Speeds During Phase 2

In Phase 1, `fast` must advance by 2 steps while `slow` advances by 1 to create the relative speed difference needed for collision. In Phase 2, however, both pointers must advance at exactly 1 step per iteration. If `fast` continues taking 2 steps in Phase 2, the mathematical guarantee $L = nC - k$ is invalidated and the pointers will bypass each other.

---

### Concise Interview Takeaway

For **Linked List Cycle II**, find the collision point using fast and slow pointers in Phase 1. Then reset `slow` to `head` and advance both pointers at 1 step per iteration in Phase 2. Because the distance from `head` to the entrance equals the distance from collision to the entrance ($L = nC - k$), they collide at the exact cycle entrance in $O(n)$ time and $O(1)$ space.
