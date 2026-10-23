---
id: 1-tree-traversals-inorder-preorder-postorder
title: "Tree Traversals: Inorder, Preorder, Postorder"
description: "One walk, three orders, decided only by when you write the value down"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Traversal</span>

> **Problem Statement:** Given the root of a binary tree, produce its three depth-first traversals: preorder, inorder and postorder. Understand what separates them.

```text
Input:  root = [1, null, 2, 3]
Output: preorder [1, 2, 3], inorder [1, 3, 2], postorder [3, 2, 1]
```

---

### Picture it

Walk the tree the only way a tree can be walked: go as deep as you can down the left, then back up, then down the right. That walk is the same every time.

During it, you pass each node **three times**: once arriving, once coming back from the left child, and once coming back from the right child.

The three traversals are not three different walks. They are the same walk, with the value written down at a different one of those three moments:

```text
preorder   write on arrival,              then left, then right
inorder    left first, write in the middle, then right
postorder  left, then right, write last
```

That is the whole idea. Once you see it, you never have to memorise the three orders again, because the code differs by the position of one line.

---

### How to think about it

Each traversal is the same three statements in a different order:

- **Preorder** writes the node, then recurses left, then right. The root comes out first, which is why it is the order used for copying a tree or serialising one: you meet a parent before its children.
- **Inorder** recurses left, writes, then recurses right. On a binary search tree this produces the values in **sorted order**, which is the single most useful fact in this whole block.
- **Postorder** recurses left, then right, then writes. Children are finished before their parent, which is what you want when a node's answer depends on its subtrees, such as computing heights, or when deleting a tree.

Every version stops immediately at an empty node. That base case is what ends the recursion, and it is also why an empty tree returns an empty list without any special handling.

Depth-first means the recursion stack holds one frame per level of the tree, so the memory is the tree's height, not its node count.

---

### Walking through the example

The tree is `1`, with no left child, a right child `2`, and `2` has a left child `3`.

**Preorder.** Write `1`. No left child. Go right to `2`, write `2`. Go left to `3`, write `3`. Result: `1, 2, 3`.

**Inorder.** At `1`, go left first: nothing. Write `1`. Go right to `2`, and at `2` go left first to `3`, where there is no left child, so write `3`. Back at `2`, write `2`. Result: `1, 3, 2`.

**Postorder.** At `1`, nothing on the left. Go right to `2`; at `2`, go left to `3`, which has no children, so write `3`. Back at `2`, no right child, so write `2`. Back at `1`, write `1`. Result: `3, 2, 1`.

Same walk each time. Only the moment of writing moved.

---

### The code

```python
class Solution:
    def preorder(self, root: TreeNode) -> list[int]:
        out = []

        def walk(node):
            if not node:
                return
            out.append(node.val)   # on arrival
            walk(node.left)
            walk(node.right)

        walk(root)
        return out

    def inorder(self, root: TreeNode) -> list[int]:
        out = []

        def walk(node):
            if not node:
                return
            walk(node.left)
            out.append(node.val)   # between the two children
            walk(node.right)

        walk(root)
        return out

    def postorder(self, root: TreeNode) -> list[int]:
        out = []

        def walk(node):
            if not node:
                return
            walk(node.left)
            walk(node.right)
            out.append(node.val)   # once both children are done
        walk(root)
        return out
```

---

### Time and space complexity

#### Time: $O(n)$

Every node is visited once and written once, whichever order is used.

#### Space: $O(h)$

The recursion stack holds one frame per level, where `h` is the height of the tree. A balanced tree gives $O(\log n)$; a tree that is one long chain gives $O(n)$, which is the worst case.

The output list is $O(n)$ on top of that, but it is the answer rather than working memory.

---

### Remember this

All three traversals are one walk with the write happening at a different moment: on arrival for preorder, between the children for inorder, after both children for postorder. Inorder on a BST gives sorted values, preorder is natural for copying and serialising, postorder is for answers built from subtrees. $O(n)$ time, $O(h)$ stack space.
