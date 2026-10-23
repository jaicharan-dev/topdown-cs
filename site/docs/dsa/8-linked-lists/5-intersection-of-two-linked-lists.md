---
id: 5-intersection-of-two-linked-lists
title: "160. Intersection of Two Linked Lists"
description: "Let each pointer walk both lists, so they travel the same distance"
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** You are given the heads of two linked lists that may join and share a tail. Return the node where they join, or nothing if they never do.

```text
listA = [4, 1, 8, 4, 5]
listB = [5, 6, 1, 8, 4, 5]
Output: the node holding 8
```

---

### Picture it

Two roads that merge into one:

```text
4 -> 1 ->
          8 -> 4 -> 5
5 -> 6 -> 1 ->
```

If the two approaches were the same length, you could just walk both at once and watch for the step where the pointers land on the same node. The trouble is that they are usually different lengths, so the walkers arrive at the junction out of step.

Here is the fix, and it is lovely. When a walker reaches the end of its own road, send it back to the **start of the other road**.

Now both walkers cover exactly the same total distance: the length of road A, plus the length of road B. Whatever the individual lengths, those two totals are identical, so the walkers fall into step and arrive at the junction at the same moment.

---

### How to think about it

Start one pointer at each head. Each step, move both forward. When a pointer falls off the end, restart it at the other list's head instead.

Stop when the two pointers are on the same node, and that node is the junction.

The elegant part is the no-intersection case. If the lists never join, both walkers finish their two roads at exactly the same time and become `None` together. Since `None` equals `None`, the loop ends and returns `None`, which is the correct answer. No special check is needed.

The switch has to happen exactly once per pointer. Checking "is this pointer `None`" and redirecting rather than advancing is what gives each walker precisely one pass over each list.

The alternative is to measure both lists, advance the longer one by the difference, then walk together. It works and is easy to justify, but it is three passes and more code for the same $O(1)$ memory.

---

### Walking through the example

List A is `4 -> 1 -> 8 -> 4 -> 5`, five nodes. List B is `5 -> 6 -> 1 -> 8 -> 4 -> 5`, six nodes. They join at `8`.

Pointer A walks its own five nodes, then starts on B. Pointer B walks its own six, then starts on A.

- After **five** steps, pointer A has finished list A and switches to B's head. Pointer B is two nodes into the shared tail.
- After **eleven** steps in total, pointer A has walked `5 + 6` nodes and pointer B has walked `6 + 5`. Both have travelled the same distance, and both are standing on the junction node `8`.

---

### The code

```python
class Solution:
    def getIntersectionNode(self, headA: ListNode, headB: ListNode) -> ListNode:
        a, b = headA, headB

        # each pointer walks its own list, then the other one
        while a is not b:
            a = a.next if a else headB
            b = b.next if b else headA

        return a   # the junction, or None if the lists never join
```

---

### Time and space complexity

#### Time: $O(m + n)$

Each pointer walks at most one full pass of each list before they meet or both hit the end together.

#### Space: $O(1)$

Two references. The other common approach, putting every node of one list into a set and then walking the other list to find a hit, is also $O(m + n)$ in time but costs $O(m)$ memory.

---

### Remember this

Different approach lengths are the only obstacle, so remove them: when a pointer finishes its list, send it to the head of the other one. Both then cover the same total distance and reach the junction together. If the lists never join, both become `None` at the same step and the loop ends on its own. $O(m + n)$ time, $O(1)$ space.
