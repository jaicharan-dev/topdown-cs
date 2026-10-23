---
id: 7-linked-list-cycle-ii
title: "142. Linked List Cycle II"
description: "After the two pointers meet, walking one from the head lands on the entrance"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** You are given the head of a linked list. If it loops, return the node where the loop begins. If not, return nothing. Do not modify the list.

```text
Input:  head = [3, 2, 0, -4], with the last node linking back to the second
Output: the node holding 2
```

---

### Picture it

Detecting the loop is the previous problem: run a slow and a fast pointer until they meet. This one asks **where** the loop starts, which is the first node that two different nodes point at.

The surprising part is the answer. Once the pointers meet, put a fresh pointer at the head of the list and move it and the slow pointer forward one step at a time. They meet at the entrance.

It looks like a coincidence. It is not, and the reason is a short piece of arithmetic worth being able to reproduce.

---

### Why that works

Give the three stretches names:

```text
a  = steps from the head to the entrance
b  = steps from the entrance to where the pointers met
c  = steps from the meeting point back round to the entrance
```

so the loop has length `b + c`.

When they meet, the slow pointer has taken `a + b` steps. The fast pointer has taken exactly twice as many, `2(a + b)`, because it moves twice per step.

The fast pointer walked the same route plus some whole number of extra laps. So the difference between the two distances is a whole number of laps:

```text
2(a + b) - (a + b) = a + b, and that must be a multiple of the loop length
```

So `a + b` is a multiple of `b + c`. Subtracting `b` from both sides says that `a` is `c` plus some whole number of laps.

In plain terms: **the distance from the head to the entrance equals the distance from the meeting point onward to the entrance**, give or take complete laps that change nothing. So two pointers walking at the same speed, one from the head and one from the meeting point, arrive at the entrance together.

---

### How to think about it

Two phases.

**Phase one** is Linked List Cycle unchanged. Slow moves one, fast moves two, guarded by `fast and fast.next`. If fast runs out of list, there is no loop, so return nothing.

**Phase two** starts the moment they meet. Put a new pointer at the head and advance it and the slow pointer one step at a time until they land on the same node. That node is the entrance.

Phase two must start from the **meeting point**, not from wherever the fast pointer happens to sit afterwards, and the two pointers must move at the **same** speed. Both are easy to get wrong when writing it from memory, and both break the arithmetic above.

---

### Walking through the example

Take `3 -> 2 -> 0 -> -4` with `-4` linking back to `2`. Here `a` is 1, since the entrance is one step from the head.

**Phase one.** Slow and fast set off from `3`. After one step slow is on `2` and fast on `0`. After two, slow is on `0` and fast is on `2`. After three, slow is on `-4` and fast is on `-4`. They have met.

**Phase two.** A new pointer starts at `3`. Both move one step: the new pointer reaches `2`, and slow moves from `-4` round the link to `2`. They are on the same node.

The entrance is `2`.

---

### The code

```python
class Solution:
    def detectCycle(self, head: ListNode) -> ListNode:
        slow = fast = head

        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

            if slow is fast:
                # same speed from the head and from the meeting point
                walker = head
                while walker is not slow:
                    walker = walker.next
                    slow = slow.next
                return walker

        return None   # fast ran out of list, so there is no loop
```

---

### Time and space complexity

#### Time: $O(n)$

Phase one meets within a number of steps bounded by the list length. Phase two walks at most the distance from the head to the entrance. Two linear walks.

#### Space: $O(1)$

Three references. Recording visited nodes in a set would also find the entrance, as the first node seen twice, but it costs $O(n)$ memory.

---

### Remember this

Find the meeting point with slow and fast pointers, then walk one pointer from the head and one from the meeting point, both at single speed, until they touch. That node is the entrance, because the head-to-entrance distance equals the meeting-point-to-entrance distance once whole laps are discounted. $O(n)$ time, $O(1)$ space.
