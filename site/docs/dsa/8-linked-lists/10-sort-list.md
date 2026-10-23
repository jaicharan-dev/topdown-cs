---
id: 10-sort-list
title: "148. Sort List"
description: "Merge sort, because splitting and merging a list costs no extra memory"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Merge Sort</span>

> **Problem Statement:** You are given the head of a linked list. Sort it into ascending order and return the new head.

```text
Input:  head = [4, 2, 1, 3]
Output: [1, 2, 3, 4]
```

---

### Picture it

Most fast sorting algorithms assume you can jump straight to any position. Quicksort picks a pivot and partitions around it; heapsort reaches for element `2i + 1`. A linked list offers none of that, so those approaches lose their advantage immediately.

Merge sort is the exception, and on a linked list it is actually **better** than on an array. Sorting an array by merging needs a scratch array to merge into. A linked list needs nothing: merging two sorted lists is just rewiring arrows, which you already know how to do.

So: split the list in half, sort each half, merge the two sorted halves.

---

### How to think about it

Three parts, and two of them are previous problems.

**Split.** Find the middle with the fast and slow pointers, then **cut the list in two** by setting the node before the middle to point at nothing. Without that cut, both halves still run to the end of the original list and the recursion never shrinks.

To land just *before* the middle, start the fast pointer at `head.next` instead of `head`. That shift matters: with a two-node list, starting both at the head leaves the slow pointer on the first node and the cut produces an empty half, so the recursion calls itself on the same list forever.

**Sort each half** by calling the same function. The recursion bottoms out on a list of zero or one nodes, which is already sorted.

**Merge** the two sorted halves, which is exactly Merge Two Sorted Lists: dummy node, take the smaller head each time, attach the leftover tail in one move.

---

### Walking through the example

Take `4 -> 2 -> 1 -> 3`.

1. **Split** into `4 -> 2` and `1 -> 3`.
2. **Sort `4 -> 2`.** Split again into `4` and `2`, both single nodes and so already sorted. Merge them into `2 -> 4`.
3. **Sort `1 -> 3`.** Split into `1` and `3`, merge into `1 -> 3`.
4. **Merge `2 -> 4` with `1 -> 3`.** Take `1`, then `2`, then `3`, then `4`.

The result is `1 -> 2 -> 3 -> 4`.

---

### The code

```python
class Solution:
    def sortList(self, head: ListNode) -> ListNode:
        if not head or not head.next:
            return head   # zero or one node is already sorted

        # stop slow just before the middle, so the list can be cut
        slow, fast = head, head.next
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        second = slow.next
        slow.next = None   # the cut: without it the halves never shrink

        left = self.sortList(head)
        right = self.sortList(second)

        return self.merge(left, right)

    def merge(self, a: ListNode, b: ListNode) -> ListNode:
        dummy = ListNode()
        tail = dummy

        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next

        tail.next = a or b   # the rest is already sorted
        return dummy.next
```

---

### Time and space complexity

#### Time: $O(n \log n)$

Each level of recursion splits the work in half, so there are about $\log n$ levels. Every level merges a total of `n` nodes, since the halves at that level cover the whole list between them. Multiply the two.

#### Space: $O(\log n)$

No extra nodes are created, but the recursion goes about $\log n$ levels deep, and each level holds a stack frame. This is the honest answer, and it is a common follow-up: truly constant space needs the bottom-up version of merge sort, which merges runs of size one, then two, then four, with no recursion at all. It is correct and fiddly, and worth mentioning rather than writing out under time pressure.

---

### Remember this

Merge sort is the right sort for a linked list, because merging needs no scratch space and no random access. Find the middle, **cut** the list there, sort both halves recursively, and merge. Start the fast pointer at `head.next` so the cut lands before the middle, or a two-node list recurses forever. $O(n \log n)$ time, $O(\log n)$ stack space.
