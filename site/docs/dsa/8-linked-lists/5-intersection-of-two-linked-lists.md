---
id: 5-intersection-of-two-linked-lists
title: "160. Intersection of Two Linked Lists"
description: "Pointer redirection to equalize traversal distances"
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** Given the heads of two singly linked lists `headA` and `headB`, return the node at which the two lists intersect. If the two linked lists have no intersection at all, return `null`.

```text
Input:  intersectVal = 8, listA = [4, 1, 8, 4, 5], listB = [5, 6, 1, 8, 4, 5], skipA = 2, skipB = 3
Output: Reference of the node with value = 8
Explanation: The intersected node's value is 8. From the head of A, it reads as [4, 1, 8, 4, 5]. From the head of B, it reads as [5, 6, 1, 8, 4, 5].
```

---

### The Intuitive Mental Model

If two linked lists intersect, they form a Y-shaped structure: two distinct prefixes that merge into a single, shared common tail.

```text
List A:   a1 -> a2 \
                    -> c1 -> c2 -> c3 -> None
List B:   b1 -> b2 -> b3 /
```

The core challenge is that the prefixes before the junction point may differ in length ($a \ne b$). Advancing two pointers from their respective heads causes them to arrive at the junction out of sync.

#### Brute Force: Hash Set of Visited Nodes
A direct way to solve this is to traverse List A and store every visited node reference in a hash set. Then, traverse List B and inspect each node: the first node already present in the set is the intersection. While this runs in $O(m + n)$ time, it consumes $O(m)$ auxiliary space.

#### Optimal Approach: Two-Pointer Path Equalization
Instead of allocating auxiliary memory, let two pointers traverse both paths sequentially:
- Pointer A travels path $A$ (length $a + c$), then immediately switches to path $B$.
- Pointer B travels path $B$ (length $b + c$), then immediately switches to path $A$.

By the time they collide:
- Pointer A has covered distance: $a + c + b$
- Pointer B has covered distance: $b + c + a$

Because $a + c + b = b + c + a$, both pointers travel the exact same total distance. They arrive at the shared junction node $c1$ on the exact same iteration. If no intersection exists ($c = 0$), both pointers traverse $a + b$ steps and arrive at `None` simultaneously, ending the loop cleanly.

#### Execution Walkthrough

Let us trace List A ($a=2$, shared $c=3$) and List B ($b=3$, shared $c=3$):

| Step | Pointer A (`pA`) | Pointer B (`pB`) | Status | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **0** | `A1` | `B1` | `pA != pB` | Both pointers start at their respective heads |
| **1** | `A2` | `B2` | `pA != pB` | Advance both |
| **2** | `C1` | `B3` | `pA != pB` | Advance both |
| **3** | `C2` | `C1` | `pA != pB` | Advance both |
| **4** | `C3` | `C2` | `pA != pB` | Advance both |
| **5** | `None` | `C3` | `pA != pB` | `pA` reaches end of List A |
| **6** | `B1` | `None` | `pA != pB` | `pA` redirects to `headB`, `pB` reaches end of List B |
| **7** | `B2` | `A1` | `pA != pB` | `pB` redirects to `headA` |
| **8** | `B3` | `A2` | `pA != pB` | Advance both |
| **9** | `C1` | `C1` | **`pA == pB`** | Both pointers meet at intersection node `C1` |

---

### Step-by-Step Algorithm

1. **Edge Check:** If either `headA` or `headB` is `None`, return `None`.
2. **Initialize Pointers:** Set `pA = headA` and `pB = headB`.
3. **Traverse and Redirect:** While `pA != pB`:
   - If `pA` is not `None`, advance `pA = pA.next`; otherwise switch to `headB`.
   - If `pB` is not `None`, advance `pB = pB.next`; otherwise switch to `headA`.
4. **Return Collision Node:** When `pA == pB`, return `pA` (which either points to the intersection node or `None`).

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pointer Path Equalization" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, x: int):
#         self.val = x
#         self.next = None

class Solution:
    def getIntersectionNode(self, headA: ListNode | None, headB: ListNode | None) -> ListNode | None:
        if not headA or not headB:
            return None

        pA = headA
        pB = headB

        # Traverse both lists; redirect each pointer to the other list's head upon reaching None
        while pA != pB:
            pA = pA.next if pA else headB
            pB = pB.next if pB else headA

        # pA either points to the intersection node or None (if no intersection exists)
        return pA
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
    def getIntersectionNode(self, headA: ListNode | None, headB: ListNode | None) -> ListNode | None:
        seen: set[ListNode] = set()

        currA = headA
        while currA:
            seen.add(currA)
            currA = currA.next

        currB = headB
        while currB:
            if currB in seen:
                return currB
            currB = currB.next

        return None
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pointer Equalization** | $O(m + n)$ | $O(1)$ | Equalizes traversal distances by redirecting pointers, using constant extra memory. |
| **Hash Set Lookup** | $O(m + n)$ | $O(m)$ | Simple lookup mechanism, but requires linear space to store references from the first list. |

---

### Common Pitfall: Premature Switching on Node Pointers

A common bug is writing `if not pA.next: pA = headB`. If you switch when `pA.next` is `None` rather than letting `pA` actually reach `None`, lists with no intersection will loop infinitely because the pointers never align on `None` at the same moment. Allow `pA` and `pB` to become `None` before redirecting to the opposite list's head.

---

### Concise Interview Takeaway

For **Intersection of Two Linked Lists**, equalize path lengths by redirecting each pointer to the opposite list's head upon reaching `None`. Both pointers travel exactly $a + b + c$ steps and land on the intersection node (or `None`) simultaneously in $O(m + n)$ time and $O(1)$ space.
