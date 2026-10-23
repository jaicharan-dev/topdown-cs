---
id: 15-lowest-common-ancestor-of-a-bst
title: "235. Lowest Common Ancestor of a BST"
description: "Walk down until the two targets stop agreeing on which way to go"
sidebar_position: 15
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BST Properties</span>

> **Problem Statement:** Given a binary search tree and two of its nodes, find the deepest node that has both of them below it. A node counts as being below itself.

```text
Input:  root = [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p = 2, q = 8
Output: 6
```

---

### Picture it

In a search tree, a value's location is decided entirely by comparisons. Starting at the root, each target is either smaller, meaning go left, or larger, meaning go right.

Follow both targets at once and they will agree for a while, taking the same turns together. At some point they disagree, and that is the moment they part company. The node where that happens is their lowest common ancestor, because it is the last node on both of their paths.

There are three possibilities at each node:

- **Both targets are smaller.** Both go left, so the answer is deeper on the left.
- **Both are larger.** Both go right.
- **Anything else.** They split here, or one of them *is* this node. Either way, this is the answer.

---

### How to think about it

Walk down from the root. While both targets lie on the same side, step that way. The first node where that stops being true is the answer, so return it.

The third case is doing more work than it looks. It covers the targets splitting left and right, and it also covers the current node **being** one of the targets, because then that target is neither smaller nor larger. The problem allows a node to be its own ancestor, so stopping there is correct.

This is a loop, not a recursion. There is no work to do on the way back up, so there is nothing for a stack to hold, and the walk is $O(1)$ in space.

Compare against the two **values**, not against the node objects, since the whole method rests on the ordering.

Contrast this with the general binary tree version, the next question in this block. Without the search-tree ordering there is no way to pick a direction, so that one has to search both subtrees and report back upward. The ordering here is what turns a search into a walk.

---

### Walking through the example

The tree has root `6`, with `2` on the left and `8` on the right. The targets are `2` and `8`.

1. **At node 6.** Target `2` is smaller, so it would go left. Target `8` is larger, so it would go right. They disagree, so `6` is the answer.

Now take the targets `2` and `4` instead:

1. **At node 6.** Both are smaller, so step left to `2`.
2. **At node 2.** Target `2` is this very node, so it is neither smaller nor larger. The walk stops and returns `2`, which is correct: `2` is an ancestor of `4` and of itself.

---

### The code

```python
class Solution:
    def lowestCommonAncestor(self, root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
        node = root

        while node:
            # both targets are smaller, so the split is deeper on the left
            if p.val < node.val and q.val < node.val:
                node = node.left
            # both larger, so deeper on the right
            elif p.val > node.val and q.val > node.val:
                node = node.right
            # they split here, or this node is one of them
            else:
                return node

        return None
```

---

### Time and space complexity

#### Time: $O(h)$

One walk down from the root, one comparison pair per level. On a balanced tree that is $O(\log n)$; on a tree that is one long chain it is $O(n)$.

#### Space: $O(1)$

A single reference. Writing it recursively is equally correct but costs $O(h)$ stack for no benefit, since nothing happens on the way back up.

---

### Remember this

In a search tree each target's route is decided by comparison, so walk down while both agree on the direction and stop the moment they do not. That stopping point also covers the case where the current node is one of the targets, which the problem counts as an ancestor of itself. A loop suffices, so this is $O(h)$ time and $O(1)$ space.
