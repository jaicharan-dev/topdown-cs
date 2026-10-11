---
id: 4-diameter-of-binary-tree
title: "543. Diameter of Binary Tree"
description: "Bottom-up postorder DFS computing height while updating global diameter"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given the `root` of a binary tree, return the length of the diameter of the tree. The diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root. The length of a path between two nodes is represented by the number of edges between them.

```text
Input:  root = [1, 2, 3, 4, 5]
Output: 3
Explanation: The longest path travels 4 -> 2 -> 1 -> 3 or 5 -> 2 -> 1 -> 3, which has a length of 3 edges.
```

---

### The Intuitive Mental Model

The diameter of a binary tree is the longest path of edges between any two nodes. A common trap is assuming that the longest path must pass through the tree root. In reality, a large, bushy subtree can contain an internal path longer than any path crossing the overall root.

#### Brute Force: Redundant Top-Down Height Computations
A naive approach computes the diameter passing through each node by calling an independent `height()` helper function for its left and right children, then recursing down to compute the diameter for both subtrees:
$$\text{diameter}(node) = \max(\text{height}(node.left) + \text{height}(node.right), \text{diameter}(node.left), \text{diameter}(node.right))$$
Because heights are repeatedly recalculated from scratch at every node, this degrades to $O(n^2)$ time on skewed trees.

#### Optimal Approach: Single-Pass Bottom-Up Postorder DFS
Every node has two distinct roles during postorder traversal:
1. **Act as a Path Peak:** The longest path turning at this specific node connects its deepest left branch and deepest right branch:
   $$\text{diameter\_through\_node} = \text{left\_height} + \text{right\_height}$$
2. **Report Height to Parent:** To its parent, the node can only contribute a single straight branch. It returns:
   $$\text{height} = 1 + \max(\text{left\_height}, \text{right\_height})$$

By computing subtree heights from leaves upward, we evaluate every node as a potential peak in a single pass while tracking the maximum diameter in an accumulator variable.

#### Execution Walkthrough

Consider evaluating `root = [1, 2, 3, 4, 5]`:

```text
       1
      / \
     2   3
    / \
   4   5
```

| Step | Node | Left Height | Right Height | Peak Path (`L + R`) | Max Diameter So Far | Height Returned (`1 + max`) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `4` (leaf) | `0` | `0` | `0 + 0 = 0` | `0` | `1` |
| **2** | `5` (leaf) | `0` | `0` | `0 + 0 = 0` | `0` | `1` |
| **3** | `2` | `1` (via `4`) | `1` (via `5`) | `1 + 1 = 2` | `2` | `1 + max(1, 1) = 2` |
| **4** | `3` (leaf) | `0` | `0` | `0 + 0 = 0` | `2` | `1` |
| **5** | `1` (root) | `2` (via `2`) | `1` (via `3`) | `2 + 1 = 3` | `3` | `1 + max(2, 1) = 3` |

---

### Step-by-Step Algorithm

1. **Initialize Max Diameter:** Create an accumulator variable `max_diameter = 0` to track the longest path observed.
2. **Define Postorder DFS:** Create a recursive helper `height(node)`:
   - If `node is None`, return `0`.
   - Recursively compute `left_h = height(node.left)`.
   - Recursively compute `right_h = height(node.right)`.
   - Update `max_diameter = max(max_diameter, left_h + right_h)`.
   - Return $1 + \max(\text{left\_h}, \text{right\_h})$ to the parent caller.
3. **Trigger Traversal:** Invoke `height(root)`.
4. **Return Result:** Return `max_diameter`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bottom-Up DFS" default>

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def diameterOfBinaryTree(self, root: TreeNode | None) -> int:
        max_diameter = 0

        def height(node: TreeNode | None) -> int:
            nonlocal max_diameter
            if not node:
                return 0

            left_h = height(node.left)
            right_h = height(node.right)

            # Update the global longest path turning at current node
            max_diameter = max(max_diameter, left_h + right_h)

            # Return the single longest branch upward
            return 1 + max(left_h, right_h)

        height(root)
        return max_diameter
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Top-Down Recursion">

```python
class Solution:
    def diameterOfBinaryTree(self, root: TreeNode | None) -> int:
        def height(node: TreeNode | None) -> int:
            if not node:
                return 0
            return 1 + max(height(node.left), height(node.right))

        if not root:
            return 0

        # Diameter at current node vs diameter in left/right subtrees
        curr_diameter = height(root.left) + height(root.right)
        left_sub_diameter = self.diameterOfBinaryTree(root.left)
        right_sub_diameter = self.diameterOfBinaryTree(root.right)

        return max(curr_diameter, left_sub_diameter, right_sub_diameter)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Bottom-Up DFS** | $O(n)$ | $O(h)$ | Computes heights and updates max diameter in a single pass. Space is bounded by recursion depth $h$. |
| **Top-Down Recursion** | $O(n^2)$ | $O(h)$ | Recomputes node heights repeatedly from the top down, degrading to quadratic performance on skewed trees. |

---

### Common Pitfall: Counting Nodes Instead of Edges

A frequent error is returning the number of nodes along the path rather than edges. If a tree has 3 nodes along its diameter path (for example, `4 -> 2 -> 5`), there are 2 edges connecting them. The height helper definition (where `None` returns `0`) naturally results in `left_h + right_h` equaling the edge count without subtracting 1.

---

### Concise Interview Takeaway

The diameter of a binary tree is the maximum value of `left_height + right_height` across all nodes in the tree. By using bottom-up postorder DFS, each node computes its children's heights, checks if the path peaking at itself breaks the record, and returns `1 + max(left_h, right_h)` to its parent in $O(n)$ time and $O(h)$ stack space.
