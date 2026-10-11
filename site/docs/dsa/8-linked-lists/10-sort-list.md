---
id: 10-sort-list
title: "148. Sort List"
description: "Divide-and-conquer merge sort on linked list with pointer severing"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Merge Sort</span>

> **Problem Statement:** Given the `head` of a singly linked list, return the list after sorting it in ascending order.

```text
Input:  head = [4, 2, 1, 3]
Output: [1, 2, 3, 4]
Explanation: The four nodes are sorted into ascending numerical order.
```

---

### The Intuitive Mental Model

For contiguous arrays, QuickSort is often preferred because random access is constant-time and standard merge sort requires $O(n)$ auxiliary array allocations. For linked lists, however, Merge Sort is the ideal choice.

#### Brute Force: Array Value Sorting
The straightforward approach extracts all nodes or values into an array, sorts the collection with standard Timsort ($O(n \log n)$), and rebuilds the linked list links. While fast in practice, it consumes $O(n)$ auxiliary memory and does not rearrange the list purely via pointer manipulation.

#### Optimal Approach: Top-Down Merge Sort
Merge Sort aligns naturally with linked list pointer structures:
1. **Zero-Copy Division:** Using slow and fast pointers, we locate the midpoint and sever the connection (`prev.next = None`). This splits the list into two independent sublists in $O(1)$ auxiliary space.
2. **In-Place Merging:** Merging two sorted lists requires only rewiring existing `.next` pointers using a sentinel dummy head, demanding $O(1)$ extra heap memory.
3. **Predictable Runtime:** The recursion tree has $\log n$ levels, and each level processes $n$ total nodes in $O(n)$ time, guaranteeing $O(n \log n)$ total time.

#### Execution Walkthrough

Let us trace `head = [4, 2, 1, 3]`:

| Step | Operation | Left Sublist | Right Sublist | Merged Result |
| :---: | :---: | :---: | :---: | :---: |
| **1** | Midpoint Split | `4 -> 2` | `1 -> 3` | Sever link between `2` and `1` |
| **2** | Base Halving | `4`, `2` | `1`, `3` | Base cases reach single nodes |
| **3** | Merge Sublists | `4` and `2` | `1` and `3` | Yields `2 -> 4` and `1 -> 3` |
| **4** | Final Merge | `2 -> 4` | `1 -> 3` | Spliced into `1 -> 2 -> 3 -> 4` |

---

### Step-by-Step Algorithm

1. **Base Case:** If `head` is `None` or `head.next` is `None`, the list has 0 or 1 node and is already sorted; return `head`.
2. **Find Midpoint and Sever Link:**
   - Initialize `prev = None`, `slow = head`, and `fast = head`.
   - While `fast` and `fast.next` are not `None`:
     - Advance `prev = slow`, `slow = slow.next`, and `fast = fast.next.next`.
   - Set `prev.next = None` to divide the list into two independent chains: `head` and `slow`.
3. **Recursive Sorting:**
   - Sort left sublist: `left = self.sortList(head)`.
   - Sort right sublist: `right = self.sortList(slow)`.
4. **Merge Sorted Sublists:** Merge `left` and `right` using a sentinel `dummy` pointer. Return `dummy.next`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Top-Down Merge Sort" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def sortList(self, head: ListNode | None) -> ListNode | None:
        # Base case: 0 or 1 node is already sorted
        if not head or not head.next:
            return head

        # 1. Split the list into two halves using slow and fast pointers
        prev: ListNode | None = None
        slow = head
        fast = head

        while fast and fast.next:
            prev = slow
            slow = slow.next  # type: ignore
            fast = fast.next.next

        # Cut the connection between the first half and second half
        if prev:
            prev.next = None

        # 2. Recursively sort each half
        left = self.sortList(head)
        right = self.sortList(slow)

        # 3. Merge the two sorted halves
        return self._merge(left, right)

    def _merge(self, l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
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
  <TabItem value="alternative" label="Alternative: Array Node Sorting">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def sortList(self, head: ListNode | None) -> ListNode | None:
        if not head:
            return None

        nodes: list[ListNode] = []
        curr = head
        while curr:
            nodes.append(curr)
            curr = curr.next

        nodes.sort(key=lambda node: node.val)

        for i in range(len(nodes) - 1):
            nodes[i].next = nodes[i + 1]
        nodes[-1].next = None

        return nodes[0]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Top-Down Merge Sort** | $O(n \log n)$ | $O(\log n)$ | Divides and splices pointers in-place, consuming only recursion stack frames. |
| **Array Node Sorting** | $O(n \log n)$ | $O(n)$ | Collects node references in an array and sorts via Timsort, using linear extra memory. |

---

### Common Pitfall: Forgetting to Sever the Midpoint Link

The most critical step during the divide phase is setting `prev.next = None`. If the link between the first half and second half is left intact, the recursive call `self.sortList(head)` still traverses into the second half, creating an infinite loop that crashes with a `RecursionError`. Always sever the forward link before recursing.

---

### Concise Interview Takeaway

For **Sort List**, use Merge Sort: split the list into two halves with slow/fast pointers, sever the connection with `prev.next = None`, recursively sort both halves, and splice them back together using a sentinel dummy node. This guarantees $O(n \log n)$ time and $O(\log n)$ stack space.
