---
id: 2-invert-binary-tree
title: "226. Invert Binary Tree"
description: "Swap the two children at every node and let the recursion reach the rest"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Postorder</span>

> **Problem Statement:** Given the root of a binary tree, mirror it left to right and return the root.

```text
Input:  root = [4, 2, 7, 1, 3, 6, 9]
Output: [4, 7, 2, 9, 6, 3, 1]
```

---

### Picture it

Hold the tree up to a mirror. Everything that was on the left is now on the right, all the way down.

The useful observation is that mirroring is **local**. At any single node, mirroring means swapping its two children. If each child subtree then mirrors itself, the whole tree is mirrored.

So there is no clever structure to find here. Swap, then ask the children to do the same.

---

### How to think about it

The recursion is as short as recursion gets:

**If the node is empty**, there is nothing to mirror, so return.

**Otherwise**, swap its left and right children, then invert each of them.

The order does not matter here, which is unusual. You can swap first and then recurse into the new positions, or recurse first and swap afterwards. Both produce the same tree, because the swap and the recursion touch different things: the swap rearranges arrows at this node, while the recursion rearranges arrows further down.

That freedom is worth noticing, because most tree problems do care. Anything where a node's answer depends on its subtrees must recurse first, and anything passing information downward must act first.

An iterative version works too: put the root in a queue or stack, and for each node pulled out, swap its children and push them. Same work, no recursion stack.

---

### Walking through the example

The tree has root `4` with children `2` and `7`. Node `2` has children `1` and `3`, and node `7` has children `6` and `9`.

1. **At node 4.** Swap its children, so `7` is now on the left and `2` on the right.
2. **At node 7** (now the left child). Swap its children, so `9` is on the left and `6` on the right. Both are leaves, so their own calls do nothing.
3. **At node 2** (now the right child). Swap its children, so `3` is on the left and `1` on the right.

Reading the tree level by level now gives `4`, then `7, 2`, then `9, 6, 3, 1`.

---

### The code

```python
class Solution:
    def invertTree(self, root: TreeNode) -> TreeNode:
        if not root:
            return None

        # swapping here and recursing below are independent, so order is free
        root.left, root.right = root.right, root.left

        self.invertTree(root.left)
        self.invertTree(root.right)

        return root
```

---

### Time and space complexity

#### Time: $O(n)$

Every node is visited exactly once, and the swap at each one is a constant amount of work.

#### Space: $O(h)$

The recursion stack, one frame per level, where `h` is the height. Balanced gives $O(\log n)$, a chain gives $O(n)$.

No new nodes are created. The existing ones are relinked, which is why the function can return the same root it was given.

---

### Remember this

Mirroring is local: swap the two children at a node, then let each subtree mirror itself. Unlike most tree problems the order is free here, because the swap and the recursive calls touch different links. $O(n)$ time, $O(h)$ stack space.
