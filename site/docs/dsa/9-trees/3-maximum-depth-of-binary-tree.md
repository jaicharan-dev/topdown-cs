---
id: 3-maximum-depth-of-binary-tree
title: "104. Maximum Depth of Binary Tree"
description: "Recursive post-order DFS depth calculation vs level-by-level BFS"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given the `root` of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: 3
Explanation: The longest path travels from root 3 to either node 15 or node 7, covering 3 nodes.
```

---

### The Intuitive Mental Model

Calculating the maximum depth of a binary tree is naturally formulated as a bottom-up problem. For any node, its depth is determined by the maximum depth achieved by its child subtrees plus one for the node itself:

$$\text{depth}(\text{node}) = 1 + \max(\text{depth}(\text{left}), \text{depth}(\text{right}))$$

#### Brute Force: Iterative BFS Level Counting
An alternative iterative strategy explores the tree level by level using a queue (Breadth-First Search). At each step, we record the queue length, consume all nodes belonging to the current level, and increment a depth counter. While optimal in time ($O(n)$), it maintains an explicit queue that can store up to the maximum width of the tree ($O(w)$ memory).

#### Optimal Approach: Recursive Post-Order DFS
A post-order Depth-First Search evaluates children before the parent. We recursively find the height of the left subtree and the height of the right subtree, then return the maximum of the two plus one. When the recursion hits a null pointer, the base case returns zero, neatly unwinding the call stack.

#### Execution Walkthrough

Consider evaluating `root = [3, 9, 20, null, null, 15, 7]`:

| Step | Node Evaluated | Left Subtree Depth | Right Subtree Depth | Calculation | Resulting Depth |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `9` (leaf) | `0` (`None`) | `0` (`None`) | $1 + \max(0, 0)$ | `1` |
| **2** | `15` (leaf) | `0` (`None`) | `0` (`None`) | $1 + \max(0, 0)$ | `1` |
| **3** | `7` (leaf) | `0` (`None`) | `0` (`None`) | $1 + \max(0, 0)$ | `1` |
| **4** | `20` | `1` (node `15`) | `1` (node `7`) | $1 + \max(1, 1)$ | `2` |
| **5** | `3` (root) | `1` (node `9`) | `2` (node `20`) | $1 + \max(1, 2)$ | `3` |

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `root is None`, return `0` because an empty subtree has zero depth.
2. **Compute Left Depth:** Recursively evaluate `self.maxDepth(root.left)`.
3. **Compute Right Depth:** Recursively evaluate `self.maxDepth(root.right)`.
4. **Aggregate and Return:** Return $1 + \max(\text{left\_depth}, \text{right\_depth})$.

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
    def maxDepth(self, root: TreeNode | None) -> int:
        if not root:
            return 0

        left_depth = self.maxDepth(root.left)
        right_depth = self.maxDepth(root.right)

        return 1 + max(left_depth, right_depth)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative BFS (Level Order)">

```python
from collections import deque

class Solution:
    def maxDepth(self, root: TreeNode | None) -> int:
        if not root:
            return 0

        queue: deque[TreeNode] = deque([root])
        depth = 0

        while queue:
            depth += 1
            for _ in range(len(queue)):
                node = queue.popleft()
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

        return depth
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive DFS** | $O(n)$ | $O(h)$ | Clean recursive post-order formulation. Stack space bounded by tree height $h$ ($O(\log n)$ balanced, $O(n)$ skewed). |
| **Iterative BFS** | $O(n)$ | $O(w)$ | Avoids call stack overflow by processing nodes level by level. Queue stores up to max tree width $w$ nodes ($O(n)$ worst-case). |

---

### Common Pitfall: Confusing Depth (Edges) with Node Count (Levels)

In graph theory, depth is occasionally measured as the number of edges from the root to a node (where the root has depth 0). In LeetCode problem definitions, maximum depth specifies the count of nodes along the path (where a single root node has depth 1, and an empty tree has depth 0). Ensure your base cases reflect node count rather than edge distance.

---

### Concise Interview Takeaway

The maximum depth of a binary tree is computed cleanly using post-order recursion via $1 + \max(\text{depth}(\text{left}), \text{depth}(\text{right}))$ with base case $0$ for `None`. This visits every node once in $O(n)$ time using $O(h)$ call stack space.
