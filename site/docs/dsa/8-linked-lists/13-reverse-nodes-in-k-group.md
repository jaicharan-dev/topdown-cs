---
id: 13-reverse-nodes-in-k-group
title: "25. Reverse Nodes in k-Group"
description: "Look ahead for a full group, reverse it, then stitch it back in"
sidebar_position: 13
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Pointer Reversal</span>

> **Problem Statement:** You are given the head of a linked list and a number `k`. Reverse the nodes in groups of `k`. If fewer than `k` nodes are left at the end, leave them alone. You must relink nodes rather than change their values.

```text
Input:  head = [1, 2, 3, 4, 5], k = 2
Output: [2, 1, 4, 3, 5]
```

---

### Picture it

Reversing a whole list is a known move. This is that move applied over and over to short stretches, with the stretches stitched back together afterwards.

```text
1 -> 2 | 3 -> 4 | 5
2 -> 1 | 4 -> 3 | 5     each pair flipped, the lonely 5 untouched
```

Two things make it harder than a plain reversal.

**You must check before you commit.** The final stretch might be short, and a short stretch has to stay as it is. Since reversing destroys the arrangement, you cannot start reversing and change your mind, so count the nodes ahead of you **first**.

**Each reversed group has to be reconnected at both ends.** The node before the group must point at the group's new first node, and the group's new last node must point at whatever comes next.

---

### How to think about it

Keep a pointer to the node **before** the current group, called `group_prev`. A dummy node in front gives you one even for the very first group.

Each round does four things.

**Look ahead.** Walk `k` steps from `group_prev`. If you fall off the end before arriving, fewer than `k` nodes remain, so the work is finished and the list is returned as it stands. Otherwise you are standing on the group's last node, and the node after it is where the group will eventually point.

**Reverse the group**, with the standard three-pointer loop, but started so that it finishes pointing at the node after the group rather than at nothing. Seeding `prev` with that following node does this, which reconnects the tail end for free.

**Reconnect the front.** Before the reversal, `group_prev.next` was the group's first node, which is now its **last**. So grab that reference before rewiring, then point `group_prev` at the group's new first node.

**Move on.** The node you grabbed is the end of the reversed group, so it becomes `group_prev` for the next round.

---

### Walking through the example

Take `1 -> 2 -> 3 -> 4 -> 5` with `k = 2`, and a dummy in front.

1. **Look ahead two** from the dummy: node `1`, then node `2`. A full group exists, and `3` follows it.
2. **Reverse `1 -> 2`** so that it finishes pointing at `3`: the result is `2 -> 1 -> 3`. The dummy now points at `2`, and `group_prev` moves to node `1`.
3. **Look ahead two** from node `1`: node `3`, then node `4`. Full group, with `5` after it.
4. **Reverse `3 -> 4`** finishing at `5`: `4 -> 3 -> 5`. Node `1` now points at `4`, and `group_prev` moves to node `3`.
5. **Look ahead two** from node `3`: node `5`, then nothing. Fewer than `k` nodes remain, so stop and return.

The list is `2 -> 1 -> 4 -> 3 -> 5`.

---

### The code

```python
class Solution:
    def reverseKGroup(self, head: ListNode, k: int) -> ListNode:
        dummy = ListNode(0, head)
        group_prev = dummy

        while True:
            # look ahead: is a full group of k still available?
            check = group_prev
            for _ in range(k):
                check = check.next
                if not check:
                    return dummy.next

            group_next = check.next

            # reverse the group, seeded so its tail already points past it
            prev, curr = group_next, group_prev.next
            while curr is not group_next:
                ahead = curr.next
                curr.next = prev
                prev = curr
                curr = ahead

            # the old first node is now the group's last node
            new_group_prev = group_prev.next
            group_prev.next = prev
            group_prev = new_group_prev
```

---

### Time and space complexity

#### Time: $O(n)$

Each node is visited twice: once by the look-ahead that counts the group, and once by the reversal itself. Two passes over the list in total, so the work is linear regardless of `k`.

#### Space: $O(1)$

A dummy and a handful of references. The recursive version is shorter to write but costs $O(n / k)$ stack frames, which is the trade to mention if asked.

---

### Remember this

Count `k` nodes ahead before touching anything, because a short final group must be left alone and reversal cannot be undone. Seed the reversal's `prev` with the node *after* the group, which reconnects the back end automatically, and remember that the group's old first node becomes both its new last node and the next round's `group_prev`. $O(n)$ time, $O(1)$ space.
