---
id: 4-middle-of-the-linked-list
title: "876. Middle of the Linked List"
description: "When the fast pointer reaches the end, the slow one is halfway"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** You are given the head of a linked list. Return its middle node. If the list has two middle nodes, return the second one.

```text
Input:  head = [1, 2, 3, 4, 5]
Output: the node holding 3
```

---

### Picture it

You cannot ask a linked list how long it is. There is no length to read, and no way to jump to position `n // 2`. The only thing you can do is follow links.

So the obvious plan is two passes: walk once to count the nodes, then walk again half that far.

The pointer trick does it in one. Send two walkers from the head, one moving a node at a time and the other two at a time. The fast one covers twice the ground, so by the time it reaches the end, the slow one has covered exactly half the list, which puts it on the middle node.

---

### How to think about it

Move `slow` one step and `fast` two, for as long as `fast` has two nodes available. When the loop ends, `slow` is the answer.

The loop condition quietly decides which node you get when the list has an even length, and that is exactly what this problem asks about.

With `while fast and fast.next`:

- **Odd length**, say five nodes. Fast lands on the last node, `fast.next` is missing, and slow is on node three, the true middle.
- **Even length**, say four nodes. Fast steps off the end entirely and becomes `None`, and slow is on node three, which is the **second** of the two middles. That is what the problem wants.

If the question had asked for the *first* middle, the fix would be to start `fast` one node ahead, at `head.next`, rather than changing the loop. That variant comes up in Sort List, where the list has to be cut before the middle.

---

### Walking through the example

Take `1 -> 2 -> 3 -> 4 -> 5`.

1. **Start.** Both on node `1`.
2. **Step.** Slow to `2`, fast to `3`.
3. **Step.** Slow to `3`, fast to `5`.
4. **Check.** `fast.next` is missing, so the loop ends.

Slow is on `3`, the middle of five nodes.

Now take `1 -> 2 -> 3 -> 4`. After one step slow is on `2` and fast on `3`. After another, slow is on `3` and fast has stepped past the end to `None`. The loop ends with slow on `3`, the second of the two middles.

---

### The code

```python
class Solution:
    def middleNode(self, head: ListNode) -> ListNode:
        slow = fast = head

        # fast covers two nodes for every one of slow's
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        return slow
```

---

### Time and space complexity

#### Time: $O(n)$

The fast pointer reaches the end in about `n / 2` steps, and each step does a constant amount of work. Counting the length first and then walking half of it is also $O(n)$, but it reads the list twice.

#### Space: $O(1)$

Two references.

---

### Remember this

Two walkers, one at double speed: when the fast one runs out of list, the slow one is at the middle. With `while fast and fast.next`, an even-length list leaves you on the **second** middle, which is what this problem wants. To land on the first middle instead, start the fast pointer at `head.next`. $O(n)$ time, $O(1)$ space.
