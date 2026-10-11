---
id: 2-invert-binary-tree
title: "226. Invert Binary Tree"
description: "Recursive mirror reflection via child pointer swapping"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given the `root` of a binary tree, invert the tree, and return its root.

```text
Input:  root = [4, 2, 7, 1, 3, 6, 9]
Output: [4, 7, 2, 9, 6, 3, 1]
Explanation: The root node 4 has children 2 and 7. Inverting swaps 2 and 7, and recursively inverts all descending subtrees.
```

---

### The Intuitive Mental Model

Inverting a binary tree means generating its mirror image: every node's left child becomes its right child, and every right child becomes its left child.

#### Brute Force: Allocating a New Inverted Tree
A brute-force strategy creates a completely new mirror copy of the tree from scratch by allocating new `TreeNode` instances at every level. While correct, it allocates $O(n)$ heap memory for duplicate nodes and discards the original tree structure.

#### Optimal Approach: In-Place Recursive Pointer Swapping
Because we have direct references to each node's pointers, we can mirror the tree in-place without allocating new nodes:
1. Swap the references: `root.left, root.right = root.right, root.left`.
2. Recursively invert the left subtree.
3. Recursively invert the right subtree.

When the recursion hits a leaf node or `None`, the calls resolve bottom-up, leaving the entire tree mirrored in-place.

#### Execution Walkthrough

Consider inverting the tree with `root = [4, 2, 7, 1, 3, 6, 9]`:

| Step | Current Node | Left Child Before | Right Child Before | Action Taken | New Subtree State |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `4` | `2` | `7` | Swap children of `4` | Left is `7`, Right is `2` |
| **2** | `7` | `6` | `9` | Swap children of `7` | Left is `9`, Right is `6` |
| **3** | `9` | `None` | `None` | Leaf node, base case returns | Leaves remain unchanged |
| **4** | `6` | `None` | `None` | Leaf node, base case returns | Leaves remain unchanged |
| **5** | `2` | `1` | `3` | Swap children of `2` | Left is `3`, Right is `1` |
| **6** | `3` | `None` | `None` | Leaf node, base case returns | Leaves remain unchanged |
| **7** | `1` | `None` | `None` | Leaf node, base case returns | Leaves remain unchanged |

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `root is None`, return `None` immediately.
2. **Swap Pointers:** Swap `root.left` and `root.right` using simultaneous tuple assignment.
3. **Recurse on Subtrees:**
   - Recursively call `self.invertTree(root.left)`.
   - Recursively call `self.invertTree(root.right)`.
4. **Return Root:** Return the current `root` node pointer.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Recursive DFS" default>

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def invertTree(self, root: TreeNode | None) -> TreeNode | None:
        if not root:
            return None

        # Swap children in-place
        root.left, root.right = root.right, root.left

        # Recursively invert both subtrees
        self.invertTree(root.left)
        self.invertTree(root.right)

        return root
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative BFS (Queue)">

```python
from collections import deque

class Solution:
    def invertTree(self, root: TreeNode | None) -> TreeNode | None:
        if not root:
            return None

        queue: deque[TreeNode] = deque([root])

        while queue:
            node = queue.popleft()
            
            # Swap current node's children
            node.left, node.right = node.right, node.left

            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

        return root
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive DFS** | $O(n)$ | $O(h)$ | Modifies pointers in-place. Space is bounded by recursion depth $h$ ($O(\log n)$ balanced, $O(n)$ skewed). |
| **Iterative BFS** | $O(n)$ | $O(w)$ | Avoids call stack limitations. Uses a queue storing up to tree max width $w$ nodes ($O(n)$ worst-case). |

---

### Common Pitfall: Overwriting Pointers During Sequential Assignment

When swapping child pointers without Python's tuple unpacking (`root.left, root.right = root.right, root.left`), assigning `root.left = root.right` immediately overwrites the original left pointer. To avoid losing the reference in languages without simultaneous assignment, you must save the original pointer in a temporary variable: `temp = root.left; root.left = root.right; root.right = temp`.

---

### Concise Interview Takeaway

Inverting a binary tree requires swapping the left and right child pointers of each node and recursively repeating the operation down both subtrees. This in-place pointer swap traverses every node once in $O(n)$ time with $O(h)$ auxiliary stack memory.
