---
id: 1-reverse-linked-list
title: "206. Reverse Linked List"
description: "Turn each arrow around, saving the next node before you destroy the link"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Pointer Reversal</span>

> **Problem Statement:** You are given the head of a singly linked list. Reverse it and return the new head.

```text
Input:  head = [1, 2, 3, 4, 5]
Output: [5, 4, 3, 2, 1]
```

---

### Picture it

Nothing moves in this problem. The nodes stay exactly where they are in memory; only the arrows between them turn around.

```text
before:  1 -> 2 -> 3 -> 4 -> 5 -> None
after:   None <- 1 <- 2 <- 3 <- 4 <- 5
```

Walk the list and flip each arrow to point at the node you just came from. The node that used to be last ends up with nothing pointing away from it, which makes it the new head, and the old head now points at nothing, which makes it the new tail.

---

### How to think about it

Flipping an arrow destroys the only route to the rest of the list. The moment you set a node's `next` to point backwards, whatever it used to point at is unreachable, because a singly linked list has no way to go forwards from anywhere else.

So the order of operations is the whole problem: **save the next node before rewriting the link**.

Keep three references:

- **`prev`**, the node already reversed, which the current node should now point at. It starts as `None`, because the old head must end up pointing at nothing.
- **`curr`**, the node being rewired right now.
- **`ahead`**, a temporary hold on the rest of the list, saved before the link is cut.

Each step saves, rewires, and shifts both markers forward. When `curr` falls off the end, `prev` is sitting on the last node it handled, which is the new head.

Returning `curr` at the end is a classic slip. By then it is `None`.

---

### Walking through the example

Take `1 -> 2 -> 3 -> 4 -> 5`, with `prev` as `None` and `curr` on node `1`.

1. **At node 1.** Save `2`. Point `1` at `None`. Now `prev` is `1`, `curr` is `2`. The reversed part is `1`.
2. **At node 2.** Save `3`. Point `2` at `1`. The reversed part is `2 -> 1`.
3. **At node 3.** Save `4`. Point `3` at `2`. The reversed part is `3 -> 2 -> 1`.
4. **At node 4.** Save `5`. Point `4` at `3`.
5. **At node 5.** Save `None`. Point `5` at `4`. Now `prev` is `5` and `curr` is `None`, so the loop ends.

`prev` holds `5`, the new head of `5 -> 4 -> 3 -> 2 -> 1`.

---

### The code

```python
class Solution:
    def reverseList(self, head: ListNode) -> ListNode:
        prev = None
        curr = head

        while curr:
            ahead = curr.next   # save it before the link is destroyed
            curr.next = prev
            prev = curr
            curr = ahead

        return prev   # curr is None by now, prev is the new head
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, with a fixed amount of pointer work at each node.

#### Space: $O(1)$

Three references, no matter how long the list is. Nothing is copied and no new nodes are created.

The recursive version is elegant but costs $O(n)$ stack frames, one per node, which can overflow on a long list. The loop is the better answer when memory comes up.

---

### Remember this

Reversing a list is rewriting arrows, not moving nodes. Save the next node before you overwrite the link, or the rest of the list is lost. Keep `prev`, `curr` and a temporary, and return `prev` at the end, because `curr` has already run off the end. $O(n)$ time, $O(1)$ space.
