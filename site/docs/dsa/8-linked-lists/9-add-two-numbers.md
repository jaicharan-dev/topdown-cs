---
id: 9-add-two-numbers
title: "2. Add Two Numbers"
description: "The digits are already reversed, which is exactly the order you add in"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math Simulation</span>

> **Problem Statement:** You are given two numbers stored as linked lists, one digit per node, with the smallest place value first. Add them and return the sum in the same form.

```text
Input:  l1 = [2, 4, 3], l2 = [5, 6, 4]
Output: [7, 0, 8]
```

---

### Picture it

The reversed storage looks like an obstacle and is actually a gift.

Adding numbers on paper starts at the units column, on the right, and carries leftward. These lists put the units digit **first**, so walking them from the head is already walking from the units column. No reversing, no counting, no alignment.

```text
  3 4 2        (the list 2 -> 4 -> 3 is the number 342)
+ 4 6 5
-------
  8 0 7        so the answer list is 7 -> 0 -> 8
```

So this is column addition, one node at a time, carrying as you go.

---

### How to think about it

At each step, add up to three things: the digit from the first list if it still has one, the digit from the second if it does, and the carry from the previous column.

That total is at most `9 + 9 + 1 = 19`, so the digit to store is the total modulo ten and the new carry is the total divided by ten, which is always `0` or `1`. In Python, `divmod` gives both at once.

Build the answer with a dummy node and a tail, as in Merge Two Sorted Lists, so there is no special case for the first digit.

Two conditions in the loop deserve attention, and they are where most bugs live.

**The lists can be different lengths.** Test each list separately before reading from it, rather than requiring both.

**The carry can outlive both lists.** Adding `5 -> 5` gives `0 -> 1`, so the loop has to keep going while there is a carry left, even after both lists are exhausted. Writing the condition as "while either list has a digit **or** a carry is pending" handles the final carry inside the normal loop instead of as an afterthought.

---

### Walking through the example

Take `l1 = 2 -> 4 -> 3` and `l2 = 5 -> 6 -> 4`, which are `342` and `465`.

1. **Units:** `2 + 5 + 0 = 7`. Store `7`, carry `0`.
2. **Tens:** `4 + 6 + 0 = 10`. Store `0`, carry `1`.
3. **Hundreds:** `3 + 4 + 1 = 8`. Store `8`, carry `0`.

Both lists are empty and the carry is zero, so the loop ends. The answer is `7 -> 0 -> 8`, which reads as `807`, and `342 + 465` is indeed `807`.

---

### The code

```python
class Solution:
    def addTwoNumbers(self, l1: ListNode, l2: ListNode) -> ListNode:
        dummy = ListNode()
        tail = dummy
        carry = 0

        # keep going while either list has digits, or a carry is still pending
        while l1 or l2 or carry:
            total = carry

            if l1:
                total += l1.val
                l1 = l1.next
            if l2:
                total += l2.val
                l2 = l2.next

            carry, digit = divmod(total, 10)

            tail.next = ListNode(digit)
            tail = tail.next

        return dummy.next
```

---

### Time and space complexity

#### Time: $O(\max(m, n))$

One pass, running as long as the longer list, plus at most one extra step for a final carry. Each step is a couple of additions and one new node.

#### Space: $O(\max(m, n))$

The answer list, which is the output rather than working memory. Beyond it, only the carry and a few references are kept, so no scratch space grows with the input.

---

### Remember this

Digits stored smallest-first means walking from the head is walking from the units column, so this is column addition with no preparation. Use `divmod(total, 10)` for the digit and the carry, build with a dummy and a tail, test each list separately since they may differ in length, and keep looping while a carry is pending so the final one is not dropped. $O(\max(m, n))$ time.
