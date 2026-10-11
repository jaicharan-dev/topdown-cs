---
id: 13-reverse-nodes-in-k-group
title: "25. Reverse Nodes in k-Group"
description: "Iterative k-length group reversal with lookahead validation"
sidebar_position: 13
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Pointer Reversal</span>

> **Problem Statement:** Given the `head` of a singly linked list, reverse the nodes of the list `k` at a time, and return the modified list. `k` is a positive integer less than or equal to the length of the linked list. If the number of nodes is not a multiple of `k`, then left-out nodes at the end should remain as they are. You may not alter the values in the list's nodes, only nodes themselves may be changed.

```text
Input:  head = [1, 2, 3, 4, 5], k = 2
Output: [2, 1, 4, 3, 5]
Explanation: The first two nodes [1, 2] are reversed to [2, 1], the next two [3, 4] to [4, 3], and node 5 remains as is.
```

---

### The Intuitive Mental Model

Reversing an entire linked list is straightforward. Reversing it in discrete chunks of $k$ nodes introduces the challenge of managing the boundary connections (the seams) between neighboring groups:
1. Connect the tail of the preceding group to the new head of the reversed group.
2. Connect the new tail of the reversed group to the upcoming group.

#### Brute Force: Array Group Reversal
The naive approach collects all nodes into a Python list, reverses successive sub-slices of length $k$, and relinks all pointers. While this runs in linear time $O(n)$, it consumes $O(n)$ auxiliary space and violates the in-place pointer manipulation requirement.

#### Optimal Approach: In-Place Segment Reversal with Lookahead Validation
We process the list iteratively using a lookahead check:
1. Before detaching any group, inspect whether at least $k$ nodes exist ahead. If fewer than $k$ nodes remain, leave them untouched and terminate.
2. Initialize `prev = group_next` before reversing the $k$ nodes. This automatically links the reversed segment's new tail to the upcoming group in one continuous operation.
3. Stitch the left boundary by pointing `group_prev.next` to the group's new head (`kth`).
4. Shift `group_prev` forward to the group's new tail and repeat.

#### Execution Walkthrough

Let us trace `head = [1, 2, 3, 4, 5]` with $k = 2$:

| Round | Lookahead $k$-th Node | Group to Reverse | Action Taken | Resulting Chain | Next `group_prev` |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **0** | - | - | Initialize dummy | `dummy -> 1 -> 2 -> 3 -> 4 -> 5` | `dummy` (0) |
| **1** | `2` (Valid) | `[1, 2]` | Reverse `[1, 2]`, stitch left | `dummy -> 2 -> 1 -> 3 -> 4 -> 5` | `1` |
| **2** | `4` (Valid) | `[3, 4]` | Reverse `[3, 4]`, stitch left | `dummy -> 2 -> 1 -> 4 -> 3 -> 5` | `3` |
| **3** | `None` (< 2 nodes) | `[5]` | Fewer than $k$ nodes; stop | `dummy -> 2 -> 1 -> 4 -> 3 -> 5` | - |

---

### Step-by-Step Algorithm

1. **Initialize Sentinel Dummy:** Attach `dummy = ListNode(0, head)` and set `group_prev = dummy`.
2. **Lookahead Check:** Find the $k$-th node from `group_prev` using helper `_get_kth(group_prev, k)`.
   - If `kth` is `None`, fewer than $k$ nodes remain; break the loop.
3. **Save Boundary Pointer:** Cache `group_next = kth.next`.
4. **Reverse the $k$-Node Segment:**
   - Set `prev = group_next` and `curr = group_prev.next`.
   - While `curr != group_next`:
     - Cache next node: `nxt = curr.next`.
     - Redirect link: `curr.next = prev`.
     - Advance `prev = curr` and `curr = nxt`.
5. **Stitch Seams and Advance:**
   - Save the new tail: `tail = group_prev.next`.
   - Connect left seam: `group_prev.next = kth`.
   - Advance: `group_prev = tail`.
6. **Return Head:** Return `dummy.next`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Segment Reversal" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseKGroup(self, head: ListNode | None, k: int) -> ListNode | None:
        dummy = ListNode(0, head)
        group_prev = dummy

        while True:
            # 1. Verify that a complete k-length group exists ahead
            kth = self._get_kth(group_prev, k)
            if not kth:
                break

            group_next = kth.next

            # 2. Reverse the group; initialize prev to group_next so the new tail
            # automatically links to the start of the next group
            prev = group_next
            curr = group_prev.next

            while curr != group_next:
                nxt = curr.next
                curr.next = prev
                prev = curr
                curr = nxt

            # 3. Stitch the left seam and advance group_prev to the new tail
            tail = group_prev.next
            group_prev.next = kth
            group_prev = tail

        return dummy.next

    def _get_kth(self, curr: ListNode | None, k: int) -> ListNode | None:
        """Walks forward k steps and returns the kth node, or None if fewer than k exist."""
        while curr and k > 0:
            curr = curr.next
            k -= 1
        return curr
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Group Reversal">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseKGroup(self, head: ListNode | None, k: int) -> ListNode | None:
        # Check if there are at least k nodes remaining
        curr = head
        for _ in range(k):
            if not curr:
                return head
            curr = curr.next

        # Reverse k nodes
        prev = None
        curr = head
        for _ in range(k):
            if curr:
                nxt = curr.next
                curr.next = prev
                prev = curr
                curr = nxt

        # head is now the tail of this reversed group; link to next group
        if head:
            head.next = self.reverseKGroup(curr, k)

        return prev
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative Segment Reversal** | $O(n)$ | $O(1)$ | Visited at most twice per node (lookahead and reversal) with strict constant memory. |
| **Recursive Group Reversal** | $O(n)$ | $O(n / k)$ | Clean recursive flow, but consumes $n / k$ call stack frames. |

---

### Common Pitfall: Reversing Incomplete Trailing Segments

A common bug is reversing nodes unconditionally as you traverse. The problem description explicitly requires that if the remaining number of nodes is less than $k$, they must remain in their original order. Using a dedicated lookahead helper to locate the $k$-th node before executing any pointer reversals guarantees that incomplete trailing fragments are never reversed.

---

### Concise Interview Takeaway

For **Reverse Nodes in k-Group**, verify that a full $k$-length group exists using a lookahead helper before modifying pointers. Set `prev = group_next` so the reversed group automatically connects forward, and anchor the previous segment with `group_prev.next = kth`. This achieves $O(n)$ time and $O(1)$ space.
