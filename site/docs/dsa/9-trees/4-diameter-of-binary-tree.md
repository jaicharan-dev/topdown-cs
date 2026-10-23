---
id: 4-diameter-of-binary-tree
title: "543. Diameter of Binary Tree"
description: "Every node could be the top of the longest path, so measure there and keep the best"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given the root of a binary tree, return the length of the longest path between any two nodes, measured in edges. The path does not have to go through the root.

```text
Input:  root = [1, 2, 3, 4, 5]
Output: 3
```

---

### Picture it

Any path through a tree has a **highest point**: the one node on it that is closest to the root. From that node the path goes down into the left subtree, and down into the right.

So the longest path through a particular node is:

```text
how far down the left side can I go  +  how far down the right side can I go
```

The catch in the wording is "does not have to pass through the root". That does not make the problem harder, it just means the highest point could be any node. So compute that sum **at every node** and keep the largest.

---

### How to think about it

Each node has two different jobs, and keeping them apart is the whole trick.

**What it reports upward:** how far down it can reach, which is `1 + the deeper child`. A path running through this node to its parent can only use one side, because a path cannot fork.

**What it contributes to the answer:** the left reach plus the right reach, which is the longest path whose highest point is this node. This value is **not** returned, because a parent could not use it anyway.

So the recursion returns a height, while the best answer is recorded off to the side as the recursion unwinds. That split, return one thing and record another, is the pattern to recognise. It reappears in Binary Tree Maximum Path Sum, which is this same shape with values instead of edge counts.

Since the answer is in edges, the reach of an empty child is `0` and a leaf's two reaches are both `0`, giving it a diameter of `0`, which is right.

---

### Walking through the example

The tree is root `1` with children `2` and `3`, and node `2` has children `4` and `5`.

1. **Nodes 4 and 5** are leaves. Each reports a reach of `1` upward, and each contributes `0 + 0 = 0` to the answer.
2. **Node 2.** Its children report `1` and `1`. Its contribution is `1 + 1 = 2`, the path `4 -> 2 -> 5`. It reports `1 + 1 = 2` upward.
3. **Node 3** is a leaf, so it reports `1` and contributes `0`.
4. **Node 1.** Its children report `2` from node `2` and `1` from node `3`. Its contribution is `2 + 1 = 3`, the path `4 -> 2 -> 1 -> 3`.

The best contribution seen anywhere is `3`.

---

### The code

```python
class Solution:
    def diameterOfBinaryTree(self, root: TreeNode) -> int:
        best = 0

        def reach(node) -> int:
            nonlocal best

            if not node:
                return 0

            left = reach(node.left)
            right = reach(node.right)

            # the longest path whose highest point is this node
            best = max(best, left + right)

            # upward, only one side can be used, because a path cannot fork
            return 1 + max(left, right)

        reach(root)
        return best
```

---

### Time and space complexity

#### Time: $O(n)$

Each node is visited once and does constant work. The naive version, computing a height from scratch at every node, recomputes the same subtree heights over and over and is $O(n^2)$ on a skewed tree.

#### Space: $O(h)$

The recursion stack, one frame per level.

---

### Remember this

Every node is a candidate for the highest point of the longest path, so at each one add the left reach to the right reach and keep the best. Return the height upward but record the sum sideways, because a path cannot fork and so a parent can only use one side. $O(n)$ time, $O(h)$ stack space.
