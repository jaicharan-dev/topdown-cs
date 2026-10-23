---
id: 3-linked-list-cycle
title: "141. Linked List Cycle"
description: "Two walkers at different speeds: on a loop, the faster one catches up"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** You are given the head of a linked list. Decide whether following the links forever gets you back somewhere you have already been.

```text
Input:  head = [3, 2, 0, -4], with the last node linking back to the second
Output: true
```

---

### Picture it

Two runners set off on a track. One jogs, one sprints at twice the speed.

If the track is a straight line, the sprinter reaches the end and that is that. They never meet again.

If the track is a loop, the sprinter comes round and catches the jogger from behind. It has to happen, and the reason is simple: once both are going round the loop, the gap between them closes by exactly one step each time. A gap that shrinks by one every step eventually reaches zero, so they land on the same node.

That is the whole test. Run two pointers at different speeds and see whether they ever meet.

---

### How to think about it

Move `slow` one node at a time and `fast` two. If they ever point at the same node, there is a cycle.

The loop condition is where the care goes. The fast pointer needs two nodes ahead of it to be safe, so check both `fast` and `fast.next` before each move. If either is missing, the list has an end, which means no cycle, so return `false`.

Compare the **nodes themselves**, not their values. Two different nodes can easily hold the same number, and that is not a cycle. This is the one place in these problems where identity rather than equality is the point.

The obvious alternative is to record every node you visit in a set and watch for a repeat. It works and it is easy to explain, but it costs $O(n)$ memory. Two pointers do the same job with none, which is why this technique is worth knowing by name.

---

### Walking through the example

Take `3 -> 2 -> 0 -> -4`, where `-4` links back to `2`.

1. **Start.** Both pointers are on `3`.
2. **Step one.** Slow moves to `2`. Fast moves two, to `0`.
3. **Step two.** Slow moves to `0`. Fast moves two: to `-4`, then round the link to `2`.
4. **Step three.** Slow moves to `-4`. Fast moves two: to `0`, then to `-4`.

Both are on `-4`, so the answer is `true`.

On a list with no cycle, say `1 -> 2 -> 3`, fast reaches `3` and then `fast.next` is missing, so the loop ends and the answer is `false`.

---

### The code

```python
class Solution:
    def hasCycle(self, head: ListNode) -> bool:
        slow = fast = head

        # fast needs two nodes ahead of it to take a step
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

            if slow is fast:   # the same node, not merely the same value
                return True

        return False
```

---

### Time and space complexity

#### Time: $O(n)$

With no cycle, fast reaches the end after about half as many steps as there are nodes. With a cycle, the slow pointer enters the loop and the fast one closes the gap by one per step, so they meet within the length of the loop. Either way the work grows with the size of the list.

#### Space: $O(1)$

Two references. The set-based approach would need $O(n)$.

---

### Remember this

Run one pointer at single speed and another at double. On a loop the gap closes by one each step, so they are guaranteed to meet; on a straight list the fast one simply runs out of track. Guard with `fast and fast.next` before stepping, and compare node identity rather than values. $O(n)$ time, $O(1)$ space.
