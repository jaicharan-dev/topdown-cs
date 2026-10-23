---
id: 6-palindrome-linked-list
title: "234. Palindrome Linked List"
description: "Find the middle, reverse the back half, then walk the two halves together"
sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** You are given the head of a linked list. Return `true` if its values read the same forwards and backwards.

```text
Input:  head = [1, 2, 2, 1]
Output: true
```

---

### Picture it

Checking a palindrome means comparing the first value with the last, the second with the second to last, and so on. On an array that is two fingers walking inward. On a linked list it is impossible, because there is no way to walk backwards.

Copying the values into a list and comparing is the easy answer, and it is $O(n)$ memory. The interesting version does it with none.

The way in is to notice that you can make the second half walkable backwards by **reversing it**. Then you have two forward-walkable halves, one starting at the original head and one starting at the original tail, and comparing them is a straight walk.

```text
1 -> 2 -> 2 -> 1

front half:            1 -> 2
back half reversed:    1 -> 2
```

---

### How to think about it

Three steps, and each one is a problem you already know.

**Find the middle** with the fast and slow pointers from Middle of the Linked List.

**Reverse from the middle onward**, which is Reverse Linked List applied to a tail rather than a whole list.

**Walk the two halves together**, comparing values as you go. Stop as soon as one of them runs out.

Stopping on the **reversed half** is what makes odd lengths work without a special case. With an odd number of nodes the middle node belongs to both halves, and the comparison of it against itself is harmless.

Worth saying out loud in an interview: this modifies the input list. If that matters, you either restore it by reversing the second half back, or you accept the $O(n)$ copy instead. Knowing the trade is more valuable than the trick.

---

### Walking through the example

Take `1 -> 2 -> 2 -> 1`.

1. **Find the middle.** Fast and slow set off together; slow ends on the third node, the first of the two `2`-then-`1` pairs.
2. **Reverse from there.** The tail `2 -> 1` becomes `1 -> 2`, and the reversed head is the node holding `1`.
3. **Compare.** The front half starts at the original head: `1`, then `2`. The reversed half gives `1`, then `2`. Both match, and the reversed half runs out.

The answer is `true`.

For `1 -> 2 -> 3 -> 2 -> 1`, the middle `3` ends up at the end of the reversed half and gets compared against itself, which costs nothing and keeps the loop free of special cases.

---

### The code

```python
class Solution:
    def isPalindrome(self, head: ListNode) -> bool:
        # 1. find the middle
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        # 2. reverse everything from the middle onward
        prev = None
        while slow:
            ahead = slow.next
            slow.next = prev
            prev = slow
            slow = ahead

        # 3. walk both halves; the reversed one is never the longer
        left, right = head, prev
        while right:
            if left.val != right.val:
                return False
            left = left.next
            right = right.next

        return True
```

---

### Time and space complexity

#### Time: $O(n)$

Three passes, none nested: half a pass to find the middle, half to reverse, half to compare. Three halves of a list is still linear.

#### Space: $O(1)$

A handful of references. Everything happens by relinking the existing nodes, which is the entire reason to go through the reversal rather than copying the values into an array.

---

### Remember this

A linked list cannot be walked backwards, so make the back half walkable forwards by reversing it in place. Find the middle with fast and slow pointers, reverse from there, then compare the two halves and stop when the reversed one ends, which handles odd lengths for free. Mention that it mutates the input, and that reversing back restores it. $O(n)$ time, $O(1)$ space.
