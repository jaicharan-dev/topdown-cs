---
id: 2-merge-two-sorted-lists
title: "21. Merge Two Sorted Lists"
description: "Dummy head sentinel with iterative pointer splicing"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sentinel Node</span>

> **Problem Statement:** You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one sorted linked list by splicing together the nodes of the first two lists. Return the head of the merged linked list.

```text
Input:  list1 = [1, 2, 4], list2 = [1, 3, 4]
Output: [1, 1, 2, 3, 4, 4]
Explanation: The two sorted lists are spliced together in numerical order.
```

---

### The Intuitive Mental Model

Imagine two lines of students already organized from shortest to tallest. To merge them into a single sorted line, compare the student at the front of each line and let the shorter one step forward next.

#### Brute Force: Collect and Sort
The naive approach collects all values from both linked lists into an array, sorts the array, and then constructs a new linked list. This requires $O((m + n) \log(m + n))$ time and allocates $O(m + n)$ auxiliary space, failing to exploit the fact that both lists are already sorted.

#### Optimal Approach: Sentinel Node with Pointer Splicing
Because both lists are sorted, we can build the merged list in a single pass by rewiring existing `.next` pointers.

Two key techniques make this clean and optimal:
1. **Sentinel Dummy Node:** Initializing `dummy = ListNode(0)` avoids clumsy boundary checks when choosing the head of the merged list. We append nodes to `curr.next` and return `dummy.next` at the end.
2. **Constant-Time Tail Graft:** When one list is exhausted, the remaining nodes of the other list are already linked in sorted order. Instead of iterating through them, we attach the entire remaining chain in a single assignment: `curr.next = list1 or list2`.

#### Execution Walkthrough

Let us trace `list1 = [1, 2, 4]` and `list2 = [1, 3, 4]`:

| Step | `list1.val` | `list2.val` | Comparison | Node Appended | Remaining Lists (`list1`, `list2`) | Merged Tail (`curr.val`) |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **0** | `1` | `1` | - | `dummy` initialized | `[1, 2, 4]`, `[1, 3, 4]` | `dummy` (0) |
| **1** | `1` | `1` | $1 \le 1$ | `list1` (1) | `[2, 4]`, `[1, 3, 4]` | `1` |
| **2** | `2` | `1` | $2 > 1$ | `list2` (1) | `[2, 4]`, `[3, 4]` | `1` |
| **3** | `2` | `3` | $2 \le 3$ | `list1` (2) | `[4]`, `[3, 4]` | `2` |
| **4** | `4` | `3` | $4 > 3$ | `list2` (3) | `[4]`, `[4]` | `3` |
| **5** | `4` | `4` | $4 \le 4$ | `list1` (4) | `[]`, `[4]` | `4` |
| **End** | `None` | `4` | Tail Graft | `list2` chain `[4]` | `[]`, `[]` | `4` |

---

### Step-by-Step Algorithm

1. **Initialize Sentinel Node:** Create a sentinel node `dummy = ListNode(0)` and track the tail with `curr = dummy`.
2. **Iteratively Compare and Splice:** While both `list1` and `list2` are not `None`:
   - If `list1.val <= list2.val`, set `curr.next = list1` and advance `list1 = list1.next`.
   - Else, set `curr.next = list2` and advance `list2 = list2.next`.
   - Advance `curr = curr.next`.
3. **Attach Remaining Tail:** Link the remaining chain directly using `curr.next = list1 or list2`.
4. **Return Head:** Return `dummy.next` as the new head of the merged list.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Sentinel Splicing" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeTwoLists(self, list1: ListNode | None, list2: ListNode | None) -> ListNode | None:
        # Dummy node simplifies edge cases by anchoring the head
        dummy = ListNode(0)
        curr = dummy

        while list1 and list2:
            if list1.val <= list2.val:
                curr.next = list1
                list1 = list1.next
            else:
                curr.next = list2
                list2 = list2.next
            curr = curr.next

        # Graft the entire remaining sorted segment in O(1) time
        curr.next = list1 or list2

        return dummy.next
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Merging">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeTwoLists(self, list1: ListNode | None, list2: ListNode | None) -> ListNode | None:
        if not list1:
            return list2
        if not list2:
            return list1

        if list1.val <= list2.val:
            list1.next = self.mergeTwoLists(list1.next, list2)
            return list1
        else:
            list2.next = self.mergeTwoLists(list1, list2.next)
            return list2
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative Sentinel Splicing** | $O(m + n)$ | $O(1)$ | Traverses both lists once, splicing pointers in-place with constant memory. |
| **Recursive Merging** | $O(m + n)$ | $O(m + n)$ | Concise recursive logic, but incurs $O(m + n)$ call stack frames. |

---

### Common Pitfall: Copying Remaining Elements Iteratively

In array-based merging, you must loop through the rest of the non-empty array to copy elements over. A common mistake in linked lists is writing a `while` loop to copy or traverse the remaining nodes one by one. In a linked list, all remaining nodes are already connected in sorted order, so a single pointer link `curr.next = list1 or list2` finishes the merge in $O(1)$ time.

---

### Concise Interview Takeaway

For **Merge Two Sorted Lists**, allocate a `dummy = ListNode(0)` sentinel node to eliminate edge cases when deciding the initial head. Compare current node values to attach the smaller node, advance pointers, and finish with a single tail graft `curr.next = list1 or list2`. This achieves optimal $O(m + n)$ time and $O(1)$ space.
