---
id: 6-palindrome-linked-list
title: "234. Palindrome Linked List"
description: "Find midpoint, reverse second half in-place, and compare"
sidebar_position: 6
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fast & Slow Pointers</span>

> **Problem Statement:** Given the `head` of a singly linked list, return `true` if it is a palindrome or `false` otherwise.

```text
Input:  head = [1, 2, 2, 1]
Output: true
Explanation: Reading the list forward yields 1 -> 2 -> 2 -> 1; reading backward yields the same sequence.
```

---

### The Intuitive Mental Model

Testing whether an array is a palindrome is straightforward because you can place two pointers at opposite ends and walk inward. In a singly linked list, nodes only link forward, preventing backward traversal from the tail.

#### Brute Force: Array Value Extraction
The simplest approach copies all node values into a Python list and checks whether the list equals its reverse (`vals == vals[::-1]`). While this runs in linear time $O(n)$, it consumes $O(n)$ auxiliary space to store the values.

#### Optimal Approach: Midpoint Reversal and Inward Scan
We can achieve strict $O(1)$ space by structuring the solution into three distinct phases:
1. **Find Midpoint:** Advance a slow pointer by 1 step and a fast pointer by 2 steps. When `fast` reaches the end, `slow` rests at the start of the second half.
2. **Reverse the Second Half:** Invert the `.next` pointers of the second half in-place, creating a chain pointing backward from the original tail.
3. **Compare Halves:** Advance two pointers, one from `head` and one from the reversed tail `prev`. If all values match until the reversed chain runs out, the list is a valid palindrome.

#### Execution Walkthrough

Let us trace `head = [1, 2, 2, 1]`:

| Step | Action | Left Pointer (`left.val`) | Right Pointer (`right.val`) | Values Match? | Notes |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Find Midpoint | - | - | - | Fast/slow pointers place `slow` at second `2` |
| **2** | Reverse Second Half | - | - | - | Reverses `2 -> 1` into `1 -> 2 -> None` (`prev` at `1`) |
| **3** | Compare Nodes | `1` | `1` | **Yes** | Advance both pointers |
| **4** | Compare Nodes | `2` | `2` | **Yes** | Advance both pointers |
| **5** | Termination | `2` | `None` | - | `right` reaches `None`; palindrome verified |

---

### Step-by-Step Algorithm

1. **Find Midpoint:**
   - Initialize `slow = head` and `fast = head`.
   - While `fast` and `fast.next` are not `None`:
     - Advance `slow = slow.next`.
     - Advance `fast = fast.next.next`.
2. **Reverse Second Half:**
   - Initialize `prev = None` and `curr = slow`.
   - While `curr`:
     - Cache next node: `nxt = curr.next`.
     - Reverse link: `curr.next = prev`.
     - Advance `prev = curr` and `curr = nxt`.
3. **Compare Both Halves:**
   - Initialize `left = head` and `right = prev`.
   - While `right` is not `None`:
     - If `left.val != right.val`, return `False`.
     - Advance `left = left.next` and `right = right.next`.
4. **Return Result:** If no mismatches are encountered, return `True`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place Midpoint Reversal" default>

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def isPalindrome(self, head: ListNode | None) -> bool:
        if not head or not head.next:
            return True

        # Phase 1: Locate midpoint using fast and slow pointers
        slow = head
        fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        # Phase 2: Reverse second half in-place starting from slow
        prev = None
        curr = slow
        while curr:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt

        # Phase 3: Compare first half with reversed second half
        left = head
        right = prev  # Head of reversed second half
        while right:
            if left.val != right.val:
                return False
            left = left.next
            right = right.next

        return True
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Array Conversion">

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val: int = 0, next: ListNode | None = None):
#         self.val = val
#         self.next = next

class Solution:
    def isPalindrome(self, head: ListNode | None) -> bool:
        vals: list[int] = []
        curr = head

        while curr:
            vals.append(curr.val)
            curr = curr.next

        return vals == vals[::-1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **In-Place Midpoint Reversal** | $O(n)$ | $O(1)$ | Finds midpoint, reverses half the list, and compares values with constant auxiliary memory. |
| **Array Conversion** | $O(n)$ | $O(n)$ | Simplest to implement, but allocates extra memory proportional to the list size. |

---

### Common Pitfall: Asymmetric Odd-Length Handling

In odd-length lists (such as `1 -> 2 -> 3 -> 2 -> 1`), the midpoint node `3` becomes the tail of the reversed half (`1 -> 2 -> 3 -> None`). If you loop while `left and right:`, you might wonder if the middle element requires special-casing. By looping strictly `while right:`, the comparison naturally finishes when the reversed second half runs out, safely ignoring the unpaired central node.

---

### Concise Interview Takeaway

For **Palindrome Linked List**, locate the midpoint using fast and slow pointers, reverse the second half in-place, and compare the two halves inward toward the center. This solves the problem in $O(n)$ time and $O(1)$ auxiliary space without extra array allocations.
