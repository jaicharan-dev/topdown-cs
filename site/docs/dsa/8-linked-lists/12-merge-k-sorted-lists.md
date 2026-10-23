---
id: 12-merge-k-sorted-lists
title: "23. Merge k Sorted Lists"
description: "A heap holds the front of every list, so the next smallest is always on top"
sidebar_position: 12
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Min-Heap</span>

> **Problem Statement:** You are given `k` sorted linked lists. Merge them all into one sorted list and return its head.

```text
Input:  lists = [[1, 4, 5], [1, 3, 4], [2, 6]]
Output: [1, 1, 2, 3, 4, 4, 5, 6]
```

---

### Picture it

Merging two lists is easy: compare two heads, take the smaller. With `k` lists you are comparing `k` heads and taking the smallest, which is the same idea with a harder question in the middle.

Checking all `k` heads every time works, and it costs `k` comparisons per node produced. With many lists that is most of the running time, and all of it is repeated work: taking one node only changes **one** of the `k` heads, yet you re-examine all of them.

A heap is built for exactly this. It keeps a collection where the smallest item is always on top, and both removing that item and adding a new one cost about $\log k$ rather than `k`.

So: put the head of every list into a heap. Repeatedly take the smallest, attach it to the result, and push that node's successor in its place.

---

### How to think about it

The heap never holds more than `k` nodes, one per list, because taking a node from a list immediately offers its successor and nothing else.

**Python's heap cannot compare nodes.** It compares tuples element by element, so when two nodes have equal values it tries to compare the nodes themselves and raises an error. Since equal values are guaranteed to show up in this problem, insert a tiebreaker: `(value, list index, node)`. The index is unique per list, so the comparison always settles before reaching the node.

Skip empty lists when seeding the heap. The input can contain them, including a list that is entirely empty.

Build the output with a dummy node and a tail, as in the two-list merge.

**The other good answer** is to merge the lists in pairs: merge them two at a time, halving the number of lists each round, until one is left. That is also $O(N \log k)$, using the two-list merge you already have and no heap at all. If an interviewer asks for a version without a priority queue, that is the one to reach for.

---

### Walking through the example

Take `[1, 4, 5]`, `[1, 3, 4]` and `[2, 6]`.

1. **Seed the heap** with the three heads: `1` from list 0, `1` from list 1, and `2` from list 2.
2. **Take the smallest**, the `1` from list 0, since the list index breaks the tie. Attach it and push its successor `4`. The heap holds `1`, `2`, `4`.
3. **Take `1`** from list 1. Attach it and push `3`. The heap holds `2`, `3`, `4`.
4. **Take `2`** from list 2. Attach it and push `6`. The heap holds `3`, `4`, `6`.
5. **Carry on** taking `3`, then `4`, then `4`, then `5`, then `6`, each time pushing the successor if there is one.

The result is `1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6`.

---

### The code

```python
import heapq

class Solution:
    def mergeKLists(self, lists: list[ListNode]) -> ListNode:
        heap = []

        # the list index breaks ties, because nodes cannot be compared
        for i, node in enumerate(lists):
            if node:
                heapq.heappush(heap, (node.val, i, node))

        dummy = ListNode()
        tail = dummy

        while heap:
            _, i, node = heapq.heappop(heap)

            tail.next = node
            tail = node

            if node.next:
                heapq.heappush(heap, (node.next.val, i, node.next))

        return dummy.next
```

---

### Time and space complexity

#### Time: $O(N \log k)$

`N` is the total number of nodes across all the lists, and `k` is how many lists there are. Every node is pushed once and popped once, and each of those costs about $\log k$ because the heap never holds more than `k` items.

Scanning all `k` heads each time would be $O(N k)$. With a thousand lists that is the difference between about ten operations per node and a thousand.

#### Space: $O(k)$

The heap, one entry per list. The result reuses the original nodes rather than copying them.

---

### Remember this

The question is always "which of the `k` heads is smallest", and a heap answers it in $\log k$ instead of `k`. Seed it with every non-empty head, and each time you take a node push its successor. In Python, include the list index in the tuple so equal values never force a comparison between nodes. The pairwise merge is the heap-free alternative with the same complexity. $O(N \log k)$ time, $O(k)$ space.
