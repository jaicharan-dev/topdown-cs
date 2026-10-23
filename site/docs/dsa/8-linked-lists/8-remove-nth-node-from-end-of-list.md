---
id: 8-remove-nth-node-from-end-of-list
title: "19. Remove Nth Node From End of List"
description: "Open a gap of n between two pointers, then walk them to the end together"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** You are given the head of a linked list and a number `n`. Remove the node that is `n` places from the end, and return the head of what remains.

```text
Input:  head = [1, 2, 3, 4, 5], n = 2
Output: [1, 2, 3, 5]
```

---

### Picture it

"From the end" is awkward, because a singly linked list only knows about forwards. Counting the length first and then walking to position `length - n` works, and reads the list twice.

One pass is possible with a fixed gap. Put two pointers on the list with exactly `n` nodes between them, then walk them forward in step. The gap never changes, so when the leading pointer reaches the end, the trailing one is sitting `n` places from the end: exactly where you need to be.

```text
1 -> 2 -> 3 -> 4 -> 5
     ^         ^
     lag       lead, with a gap of 2
```

---

### How to think about it

To delete a node from a singly linked list you need the node **before** it, because deleting means rewriting that node's `next`. So walk the pointers until the leader is on the **last** node rather than past it, which leaves the trailing pointer one before the target.

The case that breaks a naive version is deleting the head itself, when `n` equals the length. There is no node before the head to rewrite.

**The dummy node solves it.** Put a throwaway node in front of the list and start both pointers there. Now every real node has something before it, including the head, and the deletion is the same line of code wherever it happens. Return the dummy's `next` at the end, which is the new head whether or not the old one was removed.

This is the same sentinel idea as in Merge Two Sorted Lists, used for the same reason: it removes the special case rather than handling it.

---

### Walking through the example

Take `1 -> 2 -> 3 -> 4 -> 5` with `n = 2`, and a dummy in front.

1. **Open the gap.** Move the leader two steps, from the dummy to node `2`.
2. **Walk together** while the leader has a next node:
   - Leader to `3`, lag to `1`.
   - Leader to `4`, lag to `2`.
   - Leader to `5`, lag to `3`. The leader is now on the last node, so stop.
3. **Delete.** The lag pointer is on `3`, and `3.next` is `4`, the second node from the end. Point `3` at `5` instead.

The list is `1 -> 2 -> 3 -> 5`.

Now take `1 -> 2` with `n = 2`, where the head itself goes. The leader moves two steps to node `2`, which is the last node, so the walking loop never runs and the lag pointer is still on the dummy. Deleting `dummy.next` removes node `1`, and returning `dummy.next` gives `2` as the new head.

---

### The code

```python
class Solution:
    def removeNthFromEnd(self, head: ListNode, n: int) -> ListNode:
        dummy = ListNode(0, head)   # so the head has something before it
        lead = lag = dummy

        # open a gap of n nodes
        for _ in range(n):
            lead = lead.next

        # stop with lead on the last node, so lag is just before the target
        while lead.next:
            lead = lead.next
            lag = lag.next

        lag.next = lag.next.next

        return dummy.next
```

---

### Time and space complexity

#### Time: $O(n)$

One pass. The leader covers the whole list, and the trailing pointer covers all but the last `n` nodes. Counting the length first and then walking again is also linear, but it reads the list twice.

#### Space: $O(1)$

A dummy node and two references.

---

### Remember this

Open a gap of `n` between two pointers and walk them together; when the leader hits the last node, the trailing one is just before the node to remove. Use a dummy in front so removing the head needs no special case, and return the dummy's `next` rather than the original head, which may be the node you just deleted. $O(n)$ time, $O(1)$ space.
