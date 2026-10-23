---
id: 5-balanced-binary-tree
title: "110. Balanced Binary Tree"
description: "Return the height, but use a sentinel to carry failure up the recursion"
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** A tree is height-balanced when, at every node, the heights of its two subtrees differ by at most one. Given a tree, say whether it is balanced.

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: true
```

---

### Picture it

The condition has to hold **at every node**, not just at the root. A tree can have two subtrees of equal height and still be wildly unbalanced somewhere deeper inside.

The obvious implementation follows the wording directly: walk every node, compute the height of its left subtree, compute the height of its right, compare. That is correct and slow, because computing a height is itself a full walk of a subtree, so the same nodes get measured again and again.

The fix is to get both facts out of a single walk. A node already has to know its children's heights to report its own, and the children's heights are exactly what the balance test needs. So test on the way back up, while the numbers are in your hand.

---

### How to think about it

Write a function that returns a node's height, and have it also enforce the rule as it goes.

The question is how to report failure through a function that returns a number. The neat answer is a **sentinel value**: return `-1` to mean "something below here is unbalanced". No real height is ever `-1`, since an empty node is `0`, so there is no ambiguity.

Then at each node:

- Get the left height. If it is `-1`, give up and return `-1`.
- Get the right height. If it is `-1`, do the same.
- If the two differ by more than one, this node is the problem, so return `-1`.
- Otherwise return the real height, one more than the taller child.

At the top, the tree is balanced exactly when the result is not `-1`.

The early returns matter. Once a violation is found, nothing below needs measuring, and the failure travels straight to the top without any further work.

---

### Walking through the example

The tree is root `3` with children `9` and `20`, and `20` has children `15` and `7`.

1. **Node 9** is a leaf. Both children are empty with height `0`, the difference is `0`, so it returns `1`.
2. **Nodes 15 and 7** are leaves, so each returns `1`.
3. **Node 20.** Its children report `1` and `1`, a difference of `0`, so it returns `2`.
4. **Node 3.** Its children report `1` and `2`, a difference of `1`, which is allowed, so it returns `3`.

Nothing returned `-1`, so the answer is `true`.

If node `15` had its own long chain of children below it, node `20` would see heights like `1` and `4`, return `-1`, and that `-1` would travel up to the root unchanged.

---

### The code

```python
class Solution:
    def isBalanced(self, root: TreeNode) -> bool:
        def height(node) -> int:
            if not node:
                return 0

            left = height(node.left)
            if left == -1:
                return -1   # already broken below, stop measuring

            right = height(node.right)
            if right == -1:
                return -1

            if abs(left - right) > 1:
                return -1   # this node is the violation

            return 1 + max(left, right)

        return height(root) != -1
```

---

### Time and space complexity

#### Time: $O(n)$

Every node is measured once, because the height and the balance check come out of the same pass. The version that calls a separate height function at every node is $O(n^2)$ on a skewed tree, which is the point of doing it this way.

#### Space: $O(h)$

The recursion stack.

---

### Remember this

The rule applies at every node, so check it where the heights are already known: on the way back up. Return `-1` as a sentinel for "unbalanced below", since no genuine height can be negative, and return early the moment you see it. One pass instead of a height computation per node. $O(n)$ time, $O(h)$ stack space.
