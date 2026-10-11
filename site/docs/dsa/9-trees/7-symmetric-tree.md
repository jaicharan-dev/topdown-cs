---
id: 7-symmetric-tree
title: "101. Symmetric Tree"
description: "Cross-recursive dual-node mirror reflection"
sidebar_position: 7
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Mirror Cross-Recursion</span>

> **Problem Statement:** Given the `root` of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).

```text
Input:  root = [1, 2, 2, 3, 4, 4, 3]
Output: true
Explanation: The tree is symmetric across the central vertical axis because the left subtree is an exact mirror reflection of the right subtree.
```

---

### The Intuitive Mental Model

A binary tree is symmetric if folding it along its central vertical axis causes the left and right halves to align perfectly. Symmetry is not a property of a single node in isolation; it is fundamentally an equivalence relation between two opposing mirrored branches.

#### Brute Force: Level-by-Level Palindrome Verification
A naive approach collects node values level by level using Breadth-First Search, inserting `None` placeholders for missing child nodes, and tests whether each level's array forms a palindrome. While intuitive, generating padded level arrays creates substantial unnecessary allocations and requires fragile sentinel value bookkeeping.

#### Optimal Approach: Dual-Pointer Cross-Recursion
Instead of materializing level arrays, we dispatch two simultaneous traversals across the tree:
1. One explorer inspects the left subtree.
2. The other explorer inspects the right subtree in mirror-opposite order.

For two companion nodes `t1` and `t2` to be symmetric:
- Their values must match: `t1.val == t2.val`.
- The outer boundary nodes must mirror each other: `t1.left` matches `t2.right`.
- The inner boundary nodes must mirror each other: `t1.right` matches `t2.left`.

#### Execution Walkthrough

Consider evaluating `root = [1, 2, 2, 3, 4, 4, 3]`:

```text
          1 (Axis of Symmetry)
        /   \
       2     2
      / \   / \
     3   4 4   3
```

| Step | Pair Checked (`t1`, `t2`) | Type of Pair | Comparison | Match Status | Next Pairs Dispatched |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `(2, 2)` | Immediate children | `2 == 2` | Match | Outer `(3, 3)`, Inner `(4, 4)` |
| **2** | `(3, 3)` | Outer pair (`t1.left`, `t2.right`) | `3 == 3` | Match | Both leaves (children are `None`) |
| **3** | `(4, 4)` | Inner pair (`t1.right`, `t2.left`) | `4 == 4` | Match | Both leaves (children are `None`) |

All pairs match symmetrically across the reflection axis, confirming the tree is symmetric (`True`).

---

### Step-by-Step Algorithm

1. **Check Tree Root:** If `root is None`, return `True` (an empty tree is trivially symmetric).
2. **Define Mirror Helper:** Create a recursive function `is_mirror(t1, t2)`:
   - If both `t1` and `t2` are `None`, return `True`.
   - If exactly one is `None`, or if `t1.val != t2.val`, return `False`.
   - Recursively verify that outer children match (`is_mirror(t1.left, t2.right)`) and inner children match (`is_mirror(t1.right, t2.left)`).
3. **Execute Comparison:** Return the result of `is_mirror(root.left, root.right)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Cross-Recursive DFS" default>

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def isSymmetric(self, root: TreeNode | None) -> bool:
        if not root:
            return True

        def is_mirror(t1: TreeNode | None, t2: TreeNode | None) -> bool:
            # Both subtrees are empty
            if not t1 and not t2:
                return True

            # One is empty or values differ
            if not t1 or not t2 or t1.val != t2.val:
                return False

            # Outer pair and inner pair cross-verification
            return is_mirror(t1.left, t2.right) and is_mirror(t1.right, t2.left)

        return is_mirror(root.left, root.right)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative BFS (Queue)">

```python
from collections import deque

class Solution:
    def isSymmetric(self, root: TreeNode | None) -> bool:
        if not root:
            return True

        queue: deque[tuple[TreeNode | None, TreeNode | None]] = deque([(root.left, root.right)])

        while queue:
            t1, t2 = queue.popleft()

            if not t1 and not t2:
                continue
            if not t1 or not t2 or t1.val != t2.val:
                return False

            # Push outer pair, then inner pair
            queue.append((t1.left, t2.right))
            queue.append((t1.right, t2.left))

        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Cross-Recursive DFS** | $O(n)$ | $O(h)$ | Direct pointer comparisons. Recursion depth is bounded by tree height $h$ ($O(\log n)$ balanced, $O(n)$ skewed). |
| **Iterative BFS** | $O(n)$ | $O(w)$ | Enqueues mirror pairs into a queue, avoiding call stack recursion limits for deep trees. |

---

### Common Pitfall: Comparing Subtrees in Parallel Instead of Mirrored

A classic blunder is checking `is_mirror(t1.left, t2.left)` instead of `is_mirror(t1.left, t2.right)`. Comparing left-to-left and right-to-right tests for tree equality (Same Tree), not reflective mirror symmetry. The outer left must pair with outer right, and inner right must pair with inner left.

---

### Concise Interview Takeaway

Symmetry is a pairwise reflection property. Compare `root.left` and `root.right` concurrently: ensure their values match, then cross-recurse on the outer pair `(t1.left, t2.right)` and inner pair `(t1.right, t2.left)`. This validates symmetry in $O(n)$ time with $O(h)$ space.
