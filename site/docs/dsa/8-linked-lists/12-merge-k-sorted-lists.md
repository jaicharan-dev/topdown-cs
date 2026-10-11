---
id: 12-merge-k-sorted-lists
title: "23. Merge k Sorted Lists"
description: "Min-heap priority queue vs divide-and-conquer pairwise merge"
sidebar_position: 12
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Min-Heap</span>

> **Problem Statement:** You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.

```text
Input:  lists = [[1, 4, 5], [1, 3, 4], [2, 6]]
Output: [1, 1, 2, 3, 4, 4, 5, 6]
Explanation: The linked-lists are:
[
  1->4->5,
  1->3->4,
  2->6
]
merging them into one sorted list: 1->1->2->3->4->4->5->6.
```

---

### The Intuitive Mental Model

Merging two sorted lists requires only comparing two head elements. When merging $k$ lists, comparing all $k$ heads simultaneously via linear scan requires $O(k)$ time per node, leading to $O(N \cdot k)$ overall time.

#### Brute Force: Collect All Values and Sort
The naive route extracts all $N$ values across all $k$ lists into a Python array, sorts them using Timsort ($O(N \log N)$), and builds a newly linked list. While simple, it allocates $O(N)$ auxiliary memory and ignores the existing sorted ordering of each list.

#### Optimal Approach: Min-Heap of Size k
We can optimize candidate selection by maintaining a Min-Heap of size at most $k$:
1. Seed the heap with the initial head of each non-empty list.
2. In each iteration, extract the global minimum node in $O(\log k)$ time and append it to our merged list.
3. Advance that specific list to its `.next` node and push it back into the heap in $O(\log k)$ time.
4. When the heap is exhausted, all $N$ nodes have been processed in strict sorted order.

#### Tuple Tie-Breaker Handling
In Python, if two nodes possess identical values, `heapq` compares the next element in the tuple. If we push `(node.val, node)`, Python attempts `node1 < node2`, raising `TypeError: '<' not supported between instances of 'ListNode'`. Pushing a three-element tuple `(node.val, tie_breaker_id, node)` ensures the unique integer breaks ties before Python attempts to compare node objects.

#### Execution Walkthrough

Let us trace `L1: [1, 4]`, `L2: [1, 3]`, and `L3: [2, 6]`:

| Step | Extracted Node | Origin List | Merged Chain Tail | Heap State After Insertion |
| :---: | :---: | :---: | :---: | :--- |
| **0** | - | - | `dummy` (0) | `[(1, L1), (1, L2), (2, L3)]` |
| **1** | `1` | L1 | `dummy -> 1` | `[(1, L2), (2, L3), (4, L1)]` |
| **2** | `1` | L2 | `... -> 1 -> 1` | `[(2, L3), (4, L1), (3, L2)]` |
| **3** | `2` | L3 | `... -> 1 -> 2` | `[(3, L2), (4, L1), (6, L3)]` |
| **4** | `3` | L2 | `... -> 2 -> 3` | `[(4, L1), (6, L3)]` |
| **5** | `4` | L1 | `... -> 3 -> 4` | `[(6, L3)]` |
| **6** | `6` | L3 | `... -> 4 -> 6` | `[]` (Heap Empty) |

---

### Step-by-Step Algorithm

1. **Initialize Sentinel and Min-Heap:** Create sentinel `dummy = ListNode(0)`, tracker `curr = dummy`, and empty heap `min_heap = []`.
2. **Seed Initial Heads:** Iterate over `lists` and push `(node.val, index, node)` for every non-empty list head.
3. **Extract and Replenish:** While `min_heap` is non-empty:
   - Pop `val, _, node = heapq.heappop(min_heap)`.
   - Append `curr.next = node` and advance `curr = curr.next`.
   - If `node.next` exists, push `(node.next.val, counter, node.next)` into the heap and increment `counter`.
4. **Return Head:** Return `dummy.next`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Min-Heap Priority Queue" default>

```python
import heapq

# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeKLists(self, lists: list[ListNode | None]) -> ListNode | None:
        dummy = ListNode(0)
        curr = dummy
        min_heap: list[tuple[int, int, ListNode]] = []

        # Seed heap with the head of each non-empty list
        for i, node in enumerate(lists):
            if node:
                heapq.heappush(min_heap, (node.val, i, node))

        # Counter guarantees unique tie-breakers for duplicate values
        tie_breaker = len(lists)

        while min_heap:
            val, _, node = heapq.heappop(min_heap)
            curr.next = node
            curr = curr.next

            # If extracted node has a next element, push it into the heap
            if node.next:
                heapq.heappush(min_heap, (node.next.val, tie_breaker, node.next))
                tie_breaker += 1

        return dummy.next
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Divide-and-Conquer Pairwise Merge">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeKLists(self, lists: list[ListNode | None]) -> ListNode | None:
        if not lists:
            return None

        # Pairwise merge lists until a single merged list remains
        while len(lists) > 1:
            merged_lists: list[ListNode | None] = []
            for i in range(0, len(lists), 2):
                l1 = lists[i]
                l2 = lists[i + 1] if (i + 1) < len(lists) else None
                merged_lists.append(self._merge_two(l1, l2))
            lists = merged_lists

        return lists[0]

    def _merge_two(self, l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
        dummy = ListNode(0)
        curr = dummy

        while l1 and l2:
            if l1.val <= l2.val:
                curr.next = l1
                l1 = l1.next
            else:
                curr.next = l2
                l2 = l2.next
            curr = curr.next

        curr.next = l1 or l2
        return dummy.next
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Min-Heap Priority Queue** | $O(N \log k)$ | $O(k)$ | Extracts the minimal element among $k$ candidates dynamically in $O(\log k)$ time. |
| **Divide-and-Conquer Merge** | $O(N \log k)$ | $O(1)$ auxiliary | Merges pairs hierarchically in $\log k$ levels without auxiliary heap data structures. |

---

### Common Pitfall: Direct Node Comparisons in Heap Tuples

When pushing tuples of the form `(node.val, node)` to `heapq`, identical node values force Python to compare the second tuple element. Because `ListNode` does not implement the `<` comparison operator, this throws a `TypeError: '<' not supported between instances of 'ListNode'`. Always include an integer counter `(node.val, index, node)` as a tie-breaker.

---

### Concise Interview Takeaway

For **Merge k Sorted Lists**, maintain a Min-Heap of size at most $k$ holding the active heads of each list. Each heap pop and push costs $O(\log k)$, processing all $N$ nodes in $O(N \log k)$ time and $O(k)$ auxiliary space. Use a unique integer index in tuple entries to avoid comparator collisions on duplicate values.
