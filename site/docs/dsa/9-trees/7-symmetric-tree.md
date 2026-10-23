---
id: 7-symmetric-tree
title: "101. Symmetric Tree"
description: "Compare outside against outside and inside against inside"
sidebar_position: 7
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Mirror Cross-Recursion</span>

> **Problem Statement:** Given the root of a binary tree, say whether it is a mirror image of itself across its centre.

```text
Input:  root = [1, 2, 2, 3, 4, 4, 3]
Output: true
```

---

### Picture it

Symmetry is not a property of a single node, it is a property of a **pair**: the left subtree and the right subtree have to mirror each other.

So this is Same Tree with one change. Instead of comparing two trees step for step, compare them as reflections:

```text
Same Tree:   left against left,   right against right
Mirror:      left against right,  right against left
```

Picture two walkers starting on the root's two children. One always goes left where the other goes right. If they see the same value at every stop, the tree is symmetric.

---

### How to think about it

Write a helper that takes **two** nodes and asks whether they mirror each other.

The empty cases are handled exactly as in Same Tree: both empty is fine, one empty is a failure, then compare the values.

The recursion is where the mirroring lives. For the two nodes to mirror each other:

- The **outer** pair must mirror: the left one's left child against the right one's right child.
- The **inner** pair must mirror: the left one's right child against the right one's left child.

That crossing is the entire problem. Writing `left.left` against `right.left` by habit turns this back into Same Tree and gives wrong answers on any tree that is symmetric but not identical on both sides.

Start the helper on the root's two children. An empty tree is symmetric, and a lone root is too, both of which fall out of the both-empty base case without extra code.

---

### Walking through the example

The tree is root `1` with children `2` and `2`. The left `2` has children `3` and `4`; the right `2` has children `4` and `3`.

1. **Start with the two `2`s.** Values match.
2. **Outer pair:** the left `2`'s left child is `3`, and the right `2`'s right child is `3`. They match, and their children are all empty.
3. **Inner pair:** the left `2`'s right child is `4`, and the right `2`'s left child is `4`. They match too.

Every comparison agrees, so the answer is `true`.

Notice that comparing without the crossing would have put `3` against `4` and reported `false`, even though the tree is plainly symmetric.

---

### The code

```python
class Solution:
    def isSymmetric(self, root: TreeNode) -> bool:
        def mirrors(a, b) -> bool:
            if not a and not b:
                return True
            if not a or not b:
                return False
            if a.val != b.val:
                return False

            # outer pair, then inner pair: this crossing is the whole problem
            return mirrors(a.left, b.right) and mirrors(a.right, b.left)

        if not root:
            return True

        return mirrors(root.left, root.right)
```

---

### Time and space complexity

#### Time: $O(n)$

Each node takes part in exactly one comparison pair, and a mismatch stops the walk early.

#### Space: $O(h)$

The recursion stack, one frame per level.

---

### Remember this

Symmetry is about a pair of subtrees, so write a two-node helper and start it on the root's children. Compare outer against outer, `a.left` with `b.right`, and inner against inner, `a.right` with `b.left`. Forgetting to cross turns this into Same Tree and silently gives wrong answers. $O(n)$ time, $O(h)$ stack space.
