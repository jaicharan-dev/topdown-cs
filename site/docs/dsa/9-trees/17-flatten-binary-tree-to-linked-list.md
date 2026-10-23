---
id: 17-flatten-binary-tree-to-linked-list
title: "114. Flatten Binary Tree to Linked List"
description: "Build the chain backwards, so the piece you need next is already finished"
sidebar_position: 17
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">In-Place Pointer Manipulation</span>

> **Problem Statement:** Flatten a binary tree into a chain that follows its preorder sequence, reusing the existing nodes. Every node's left pointer must end up empty and its right pointer must lead to the next node.

```text
Input:  root = [1, 2, 5, 3, 4, null, 6]
Output: 1 -> 2 -> 3 -> 4 -> 5 -> 6, all on the right
```

---

### Picture it

Flattening forwards is awkward. At a node you would move its left subtree over to the right, but that overwrites the link to the right subtree, which you still need. You can save it in a variable, then walk to the end of the moved subtree to attach it, and that walking is extra work at every node.

Reverse the order instead and the problem dissolves.

The preorder sequence is `node, left subtree, right subtree`. Build the chain from the **back**: handle the right subtree, then the left, then the node. Each time you finish a node, remember it as the head of everything flattened so far. When you then handle its parent, the piece that should follow it is already built and sitting in that variable, ready to attach.

No searching for a tail, because you always have the head of what comes next.

---

### How to think about it

Walk in **reverse preorder**, meaning right subtree first, then left subtree, then the node itself. Keep one variable holding the head of the chain built so far, starting empty.

At each node, once both children have been handled:

- Point its **right** at the chain built so far.
- Set its **left** to nothing, as the problem requires.
- Make this node the new head of the chain.

Because the traversal runs backwards, the chain grows from its tail toward its head, and every attachment is a single assignment.

The order of the two recursive calls is not optional here. Going right first is what puts the right subtree deeper in the chain than the left, which is what preorder requires.

This is the same shape as building a reversed linked list, where each new node points at everything accumulated so far.

---

### Walking through the example

The tree is root `1`, with left child `2` and right child `5`. Node `2` has children `3` and `4`; node `5` has a right child `6`.

Working in reverse preorder, so the sequence of nodes handled is `6, 5, 4, 3, 2, 1`:

1. **Node 6.** Nothing built yet, so its right becomes empty. The chain is `6`.
2. **Node 5.** Its right becomes `6`. The chain is `5 -> 6`.
3. **Node 4.** Its right becomes `5`. The chain is `4 -> 5 -> 6`.
4. **Node 3.** Its right becomes `4`. The chain is `3 -> 4 -> 5 -> 6`.
5. **Node 2.** Its right becomes `3`, its left is cleared. The chain is `2 -> 3 -> 4 -> 5 -> 6`.
6. **Node 1.** Its right becomes `2`, its left is cleared. The chain is complete.

The result is `1 -> 2 -> 3 -> 4 -> 5 -> 6`, which is exactly the preorder sequence.

---

### The code

```python
class Solution:
    def flatten(self, root: TreeNode) -> None:
        self.built = None   # head of the chain assembled so far

        def walk(node):
            if not node:
                return

            # reverse preorder: right, then left, then this node
            walk(node.right)
            walk(node.left)

            node.right = self.built
            node.left = None
            self.built = node

        walk(root)
```

---

### Time and space complexity

#### Time: $O(n)$

Each node is handled once and does three assignments. The forwards version, which walks to the end of the relocated left subtree at every node, is $O(n^2)$ on a skewed tree.

#### Space: $O(h)$

The recursion stack.

There is also a loop version using Morris-style threading, which finds the rightmost node of each left subtree and splices there, reaching $O(1)$ space. It is worth naming as the follow-up answer, though the reverse walk is far easier to get right under pressure.

---

### Remember this

Build the chain backwards. Walking right, then left, then the node means the piece that should follow is already finished and held in one variable, so attaching it is a single assignment with no tail to search for. Clear each left pointer as you go. $O(n)$ time, $O(h)$ stack space.
