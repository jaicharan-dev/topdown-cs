---
id: 14-construct-binary-tree-from-preorder-and-inorder
title: "105. Construct Binary Tree from Preorder and Inorder Traversal"
description: "Preorder names the root, inorder says how much belongs on each side of it"
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Divide & Conquer</span>

> **Problem Statement:** You are given the preorder and inorder traversals of a binary tree with unique values. Rebuild the tree.

```text
Input:  preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7]
Output: the tree [3, 9, 20, null, null, 15, 7]
```

---

### Picture it

Neither traversal is enough on its own. Together they are, and each contributes exactly one thing.

**Preorder tells you who the root is.** It writes a node before anything below it, so the first value of any preorder stretch is the root of that stretch.

**Inorder tells you how big each side is.** It writes everything in the left subtree, then the node, then everything in the right subtree. So once you know the root's value, finding it in the inorder list splits the rest into "the left subtree" and "the right subtree":

```text
inorder = [9 | 3 | 15, 20, 7]
           ^    ^    ^
           left root right
```

Now you know the root and the size of each side, and both subtrees are the same problem on smaller stretches.

---

### How to think about it

Walk the preorder list from front to back, consuming one value each time you create a node. Keep that position in a variable shared across the recursion, rather than slicing the list, because preorder visits nodes in exactly the order you want to create them.

For each call you are given the stretch of the inorder list that this subtree covers:

1. If the stretch is empty, there is no node here.
2. Take the next preorder value as this node.
3. Find where that value sits in the inorder stretch. Everything before it is the left subtree, everything after is the right.
4. Build the **left** subtree first, then the right. That order is forced: preorder lists the entire left subtree before any of the right, so consuming them in the wrong order takes the wrong values.

**Searching the inorder list each time is the thing to avoid.** A linear scan per node makes the whole build $O(n^2)$. Since the values are unique, build a dictionary from value to inorder position once at the start, and each lookup becomes instant.

---

### Walking through the example

With `preorder = [3, 9, 20, 15, 7]` and `inorder = [9, 3, 15, 20, 7]`:

1. **Take `3`** from preorder. In the inorder list it sits at position 1, so `[9]` is its left subtree and `[15, 20, 7]` is its right.
2. **Build the left side** from the inorder stretch `[9]`. The next preorder value is `9`, which has an empty stretch on each side, so it is a leaf.
3. **Build the right side** from the stretch `[15, 20, 7]`. The next preorder value is `20`, which sits in the middle of that stretch, so `[15]` goes left and `[7]` goes right.
4. **Take `15`** for the left of `20`, a leaf, and **`7`** for the right, also a leaf.

The result is root `3` with children `9` and `20`, and `20` with children `15` and `7`.

---

### The code

```python
class Solution:
    def buildTree(self, preorder: list[int], inorder: list[int]) -> TreeNode:
        # value -> its position in inorder, so the split is instant
        position = {value: i for i, value in enumerate(inorder)}
        self.next_root = 0

        def build(left: int, right: int):
            if left > right:
                return None

            value = preorder[self.next_root]
            self.next_root += 1

            node = TreeNode(value)
            split = position[value]

            # left first: preorder lists the whole left subtree before the right
            node.left = build(left, split - 1)
            node.right = build(split + 1, right)

            return node

        return build(0, len(inorder) - 1)
```

---

### Time and space complexity

#### Time: $O(n)$

Each node is created once, and finding its split point is a dictionary lookup rather than a scan. Without that dictionary it would be $O(n^2)$.

#### Space: $O(n)$

The dictionary holds one entry per value. The recursion adds $O(h)$ on top, which the dictionary dominates.

---

### Remember this

Preorder supplies the root, inorder supplies the sizes of the two sides. Consume preorder front to back with a shared position, and build the left subtree before the right, because preorder lists it first. Index the inorder positions in a dictionary up front, or the repeated searching makes it quadratic. $O(n)$ time, $O(n)$ space.
