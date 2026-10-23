---
id: 2-merge-two-sorted-lists
title: "21. Merge Two Sorted Lists"
description: "A dummy node in front removes every special case about the first node"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sentinel Node</span>

> **Problem Statement:** You are given the heads of two sorted linked lists. Weave them into one sorted list by relinking the existing nodes, and return its head.

```text
Input:  list1 = [1, 2, 4], list2 = [1, 3, 4]
Output: [1, 1, 2, 3, 4, 4]
```

---

### Picture it

Two sorted piles of cards, face up. Look at the top card of each, take the smaller, put it on your output pile. Repeat. When one pile runs out, the other is already sorted, so drop the whole thing on the end.

With linked lists you are not copying cards, you are redirecting arrows. Each step picks a node from one of the two lists and attaches it to the tail of the result.

---

### How to think about it

The awkward part is the very first node. Attaching to "the tail of the result" needs a tail to exist, and at the start there is nothing there. Writing it directly means a special case for the first node, then separate code for every node after it.

**The dummy node fixes this.** Create a throwaway node before you start, and treat it as the result's first node. Now a tail always exists, every attachment is the same operation, and there is no branch for the first node at all. At the end, the real answer is whatever the dummy points at.

The main loop runs while **both** lists still have nodes, taking the smaller head each time. Once one runs out, the rest of the other is already sorted and already linked together, so a single attachment finishes the job. No loop needed for the leftovers, which is a nice property of relinking rather than copying.

Taking from the first list when the values are equal keeps the merge stable, meaning equal values stay in their original relative order. It makes no difference to this problem's output, but it is the right habit and it matters as soon as the nodes carry more than a number.

---

### Walking through the example

Take `list1 = 1 -> 2 -> 4` and `list2 = 1 -> 3 -> 4`.

1. **Heads are `1` and `1`.** Equal, so take from the first list. The result is `1`.
2. **Heads are `2` and `1`.** Take the `1` from the second list. The result is `1 -> 1`.
3. **Heads are `2` and `3`.** Take the `2`. The result is `1 -> 1 -> 2`.
4. **Heads are `4` and `3`.** Take the `3`. The result is `1 -> 1 -> 2 -> 3`.
5. **Heads are `4` and `4`.** Equal, so take from the first. The first list is now empty.
6. **One list is empty**, so attach everything left in the second, which is its final `4`.

The result is `1 -> 1 -> 2 -> 3 -> 4 -> 4`, and the dummy's `next` is the head to return.

---

### The code

```python
class Solution:
    def mergeTwoLists(self, list1: ListNode, list2: ListNode) -> ListNode:
        dummy = ListNode()    # stands in for the result's head
        tail = dummy

        while list1 and list2:
            if list1.val <= list2.val:
                tail.next = list1
                list1 = list1.next
            else:
                tail.next = list2
                list2 = list2.next

            tail = tail.next

        # whichever list still has nodes is already sorted and already linked
        tail.next = list1 or list2

        return dummy.next
```

---

### Time and space complexity

#### Time: $O(m + n)$

Every node is looked at once and attached once. The leftover tail is attached in a single step rather than walked.

#### Space: $O(1)$

One dummy node and two references. No new nodes are created for the result, which is what "splice the nodes together" is asking for. Building a fresh list by copying values would be $O(m + n)$ memory.

---

### Remember this

Take the smaller head each time and attach it to the tail. Use a dummy node in front so a tail always exists and the first node needs no special case. When one list empties, attach the whole remainder in one move, since it is already sorted. Return the dummy's `next`, never the dummy. $O(m + n)$ time, $O(1)$ space.
