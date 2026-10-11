---
id: 5-balanced-binary-tree
title: "110. Balanced Binary Tree"
description: "Bottom-up DFS with short-circuiting height sentinel (-1)"
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given a binary tree, determine if it is height-balanced. A height-balanced binary tree is defined as a binary tree in which the depth of the two subtrees of every node never differs by more than one.

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: true
Explanation: The left subtree has depth 1, the right subtree has depth 2, and the difference is |1 - 2| = 1 <= 1 for all nodes.
```

---

### The Intuitive Mental Model

A binary tree is height-balanced if and only if for every single node in the tree, the height difference between its left and right subtrees is at most 1 ($|\text{height}(\text{left}) - \text{height}(\text{right})| \le 1$), and both subtrees are also height-balanced.

#### Brute Force: Top-Down Repeated Height Checks
A straightforward recursive formulation checks whether the current node's left and right subtrees differ in height by at most 1, and then recurses down to ensure both child subtrees are also balanced. However, computing subtree heights repeatedly from root to leaves visits the same nodes multiple times, degrading runtime to $O(n^2)$ for degenerate or skewed trees.

#### Optimal Approach: Bottom-Up DFS with Sentinel Short-Circuiting
Instead of checking top-down, we calculate subtree heights from the bottom up in postorder fashion:
- If a subtree is balanced, the function returns its actual height ($\ge 0$).
- If a subtree is detected to be imbalanced, it returns a sentinel value of `-1`.
- If either child returns `-1`, the parent immediately short-circuits and propagates `-1` up the call stack, avoiding redundant computation.

#### Execution Walkthrough

Consider testing an imbalanced tree `root = [1, 2, 2, 3, null, null, null, 4]`:

```text
        1
       / \
      2   2
     /
    3
   /
  4
```

| Step | Node | Left Subtree Height | Right Subtree Height | Difference (`|L - R|`) | Action / Sentinel Return |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `4` (leaf) | `0` | `0` | `|0 - 0| = 0` | Balanced, return $1 + 0 = 1$ |
| **2** | `3` | `1` (via `4`) | `0` | `|1 - 0| = 1` | Balanced, return $1 + 1 = 2$ |
| **3** | `2` (left child) | `2` (via `3`) | `0` | `|2 - 0| = 2` | **Imbalanced!** ($2 > 1$), return `-1` |
| **4** | `1` (root) | `-1` (short-circuit) | Not evaluated | N/A | Left child returned `-1`, return `-1` |

The root evaluates to `-1`, immediately confirming the tree is not balanced (`False`).

---

### Step-by-Step Algorithm

1. **Define Recursive Helper:** Create a function `check_height(node)` returning the height or `-1` if imbalanced.
2. **Base Case:** If `node is None`, return `0`.
3. **Inspect Left Subtree:** Recursively call `left_h = check_height(node.left)`. If `left_h == -1`, return `-1` immediately.
4. **Inspect Right Subtree:** Recursively call `right_h = check_height(node.right)`. If `right_h == -1`, return `-1` immediately.
5. **Evaluate Balance Condition:** If `abs(left_h - right_h) > 1`, return `-1`.
6. **Propagate Height:** Return $1 + \max(\text{left\_h}, \text{right\_h})$.
7. **Final Check:** Call `check_height(root)` and return `True` if the result is not `-1`, otherwise `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bottom-Up DFS (Sentinel -1)" default>

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def isBalanced(self, root: TreeNode | None) -> bool:
        def check_height(node: TreeNode | None) -> int:
            if not node:
                return 0

            left_h = check_height(node.left)
            if left_h == -1:
                return -1

            right_h = check_height(node.right)
            if right_h == -1:
                return -1

            # Imbalance found at current node
            if abs(left_h - right_h) > 1:
                return -1

            return 1 + max(left_h, right_h)

        return check_height(root) != -1
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Top-Down Recursion">

```python
class Solution:
    def isBalanced(self, root: TreeNode | None) -> bool:
        def height(node: TreeNode | None) -> int:
            if not node:
                return 0
            return 1 + max(height(node.left), height(node.right))

        if not root:
            return True

        left_h = height(root.left)
        right_h = height(root.right)

        return (
            abs(left_h - right_h) <= 1
            and self.isBalanced(root.left)
            and self.isBalanced(root.right)
        )
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Bottom-Up DFS** | $O(n)$ | $O(h)$ | Computes heights once bottom-up, short-circuiting with sentinel `-1`. Call stack requires $O(h)$ memory. |
| **Top-Down Recursion** | $O(n^2)$ | $O(h)$ | Re-evaluates subtree heights at every node from the top down, resulting in quadratic runtime on skewed trees. |

---

### Common Pitfall: Only Checking the Root Node

A common error is checking that `abs(height(root.left) - height(root.right)) <= 1` and assuming the entire tree is balanced. A tree can have balanced height at the root while possessing severe imbalances deep within one of its subtrees. The balance condition must hold universally for every node in the tree.

---

### Concise Interview Takeaway

Use a bottom-up postorder DFS where each node returns its subtree height or `-1` if imbalanced. If `abs(left_h - right_h) > 1` or either child evaluates to `-1`, immediately short-circuit by returning `-1`. This checks tree balance in a single $O(n)$ pass with $O(h)$ auxiliary stack memory.
