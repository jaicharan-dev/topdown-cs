---
id: 12-validate-binary-search-tree
title: "98. Validate Binary Search Tree"
description: "Every node inherits a range from its ancestors, not just a rule about its parent"
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BST Properties</span>

> **Problem Statement:** Decide whether a binary tree is a valid binary search tree: every value in a node's left subtree must be smaller than it, every value in its right subtree larger, and the same must hold for every node.

```text
Input:  root = [5, 1, 6, null, null, 4, 7]
Output: false
```

---

### Picture it

Here is the wrong solution, and it is wrong in an interesting way:

> Check that each node is bigger than its left child and smaller than its right child.

That passes the example above. Node `5` is bigger than `1` and smaller than `6`. Node `6` is bigger than `4` and smaller than `7`. Every parent is happy with its own children, and yet the tree is not a valid search tree: the `4` sits in `5`'s **right** subtree while being smaller than `5`.

The reason is that the rule reaches further than one level. Going right from `5` means every value below, however deep, must stay above `5`. A node is constrained not by its parent but by **every ancestor it has**.

---

### How to think about it

Carry a range downward: a low bound and a high bound that the current node must sit strictly between. The root starts with no limits at all.

Then the recursion is short:

- **Empty node:** valid, since an empty subtree breaks nothing.
- **Out of range:** invalid.
- **Otherwise:** go left with the high bound tightened to this node's value, and go right with the low bound tightened to it. Both sides must be valid.

The tightening is the whole idea. Walking left can only ever lower the ceiling; walking right can only raise the floor. By the time you reach a deep node, its range encodes every turn taken to get there.

The bounds must be **strict**, because the problem says strictly less and strictly greater, so a duplicate value makes the tree invalid.

**The other good solution** uses the fact from the traversals page: an inorder walk of a valid search tree produces values in sorted order. So walk inorder and check that each value is strictly greater than the one before. It needs only the previous value rather than a pair of bounds, and it is just as fast.

---

### Walking through the example

The tree is root `5`, with left child `1` and right child `6`. Node `6` has children `4` and `7`.

1. **At node 5**, with no bounds. Fine.
2. **At node 1**, which must be below `5`. It is, so fine.
3. **At node 6**, which must be above `5`. It is. Going into its subtrees, the floor of `5` stays, because `6` is still in `5`'s right subtree.
4. **At node 4**, which must be above `5` and below `6`. It is below `5`, so the range is violated and the answer is `false`.

The check that caught it is the inherited floor of `5`, which a parent-only check would never have applied.

---

### The code

```python
class Solution:
    def isValidBST(self, root: TreeNode) -> bool:
        def valid(node, low, high) -> bool:
            if not node:
                return True

            # strict, because equal values are not allowed
            if not (low < node.val < high):
                return False

            # going left lowers the ceiling, going right raises the floor
            return (valid(node.left, low, node.val)
                    and valid(node.right, node.val, high))

        return valid(root, float("-inf"), float("inf"))
```

---

### Time and space complexity

#### Time: $O(n)$

Every node is checked once against two bounds, and the `and` stops the walk at the first violation.

#### Space: $O(h)$

The recursion stack. The bounds are passed as arguments rather than stored, so nothing accumulates.

---

### Remember this

Checking a node only against its own children is the classic wrong answer: the constraint comes from every ancestor, not just the parent. Pass a low and high bound down, tightening the ceiling when you go left and the floor when you go right, and compare strictly. The inorder walk producing sorted values is the equally good alternative. $O(n)$ time, $O(h)$ stack space.
