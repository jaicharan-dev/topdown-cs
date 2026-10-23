---
id: 3-maximum-depth-of-binary-tree
title: "104. Maximum Depth of Binary Tree"
description: "A node's depth is one more than the deeper of its two children"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given the root of a binary tree, return its maximum depth, counted as the number of nodes on the longest path from the root down to a leaf.

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: 3
```

---

### Picture it

Ask the question at a single node and the answer almost writes itself.

How deep is the tree hanging below me? However deep my deeper child is, plus one for me.

```text
depth(node) = 1 + the larger of depth(left) and depth(right)
```

An empty spot has depth zero. That is the whole problem: one line of arithmetic and one base case.

This is the shape that nearly every tree problem in this block takes. A node's answer is built from its children's answers, so the recursion has to finish the children **before** the parent can respond. That is postorder.

---

### How to think about it

**Empty node:** return `0`. There is nothing there, so it contributes no depth. This also handles an entirely empty tree with no extra code.

**Any other node:** ask both children how deep they are, take the larger, add one for the node itself.

The `+ 1` is where the counting convention lives. This problem counts **nodes** on the path, so a single leaf has depth `1`. Some versions of the same question count **edges**, where a single leaf is `0`. Nothing about the recursion changes, only what the base case returns, so read the wording before writing.

A breadth-first version is also fine: walk the tree level by level and count how many levels you complete. It uses a queue whose width can be $O(n)$ rather than a stack whose depth is $O(h)$, so on a wide tree it costs more, and on a very deep one it costs less.

---

### Walking through the example

The tree is root `3`, with children `9` and `20`, and `20` has children `15` and `7`.

1. **At node 9**, a leaf. Both children are empty and return `0`, so its depth is `1 + 0 = 1`.
2. **At node 15 and node 7**, both leaves, so both have depth `1`.
3. **At node 20.** Its children report `1` and `1`, so its depth is `1 + 1 = 2`.
4. **At node 3.** Its children report `1` from node `9` and `2` from node `20`. The larger is `2`, so the depth is `1 + 2 = 3`.

The answer is `3`, the path `3 -> 20 -> 15`.

---

### The code

```python
class Solution:
    def maxDepth(self, root: TreeNode) -> int:
        if not root:
            return 0   # nothing here contributes no depth

        # both children have to answer before this node can
        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))
```

---

### Time and space complexity

#### Time: $O(n)$

Every node is asked exactly once, and each answer is one comparison and one addition.

#### Space: $O(h)$

The recursion stack holds one frame per level, so it is the height of the tree. Balanced gives $O(\log n)$. A tree that is one long chain gives $O(n)$, and that is also the case where a recursive solution can run out of stack on very large inputs.

---

### Remember this

A node's depth is one more than its deeper child, and an empty spot is zero. That makes this the simplest example of the pattern used throughout tree problems: finish the children, then answer for the parent. Check whether the question counts nodes or edges, because that changes only the base case. $O(n)$ time, $O(h)$ stack space.
