---
id: 18-bst-iterator
title: "173. Binary Search Tree Iterator"
description: "Park the left spine on a stack and unwind it one node at a time"
sidebar_position: 18
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Design / Iterator</span>

> **Problem Statement:** Build an iterator over a binary search tree that hands back its values in increasing order. `next` returns the next smallest value and `hasNext` says whether any remain. Use memory proportional to the tree's height, not its size, and keep `next` constant time on average.

```text
tree [7, 3, 15, null, null, 9, 20]
next -> 3, next -> 7, hasNext -> true, next -> 9, next -> 15, next -> 20
```

---

### Picture it

Collecting every value into a list up front would make both operations trivial, and it is exactly what the memory limit forbids. A tree of a million nodes would need a list of a million values before the first one could be handed out.

So the walk has to be **paused** instead. An inorder traversal normally runs to completion with the call stack remembering where to come back to. An iterator needs that same remembering, but under your control rather than the language's, so that it can stop between any two values and resume later.

That is what the stack holds: the nodes you have walked past but not yet produced. It is precisely the path down the left spine.

---

### How to think about it

Keep a stack holding the chain of nodes from the current position up toward the root, with the next value to produce on top.

**Setting up:** from the root, run down the left spine, pushing every node. The last one pushed has no left child, so it holds the smallest value in the tree.

**`next`:** pop the top node. That is the value to return. Before handing it back, deal with its right subtree, because inorder says that everything in it comes next: move to the right child and run down **its** left spine, pushing as you go.

**`hasNext`:** the stack being non-empty means something is still waiting.

The repeated "run down the left spine, pushing" is the only real operation, so write it once as a helper and call it from both the constructor and `next`.

**Why `next` is constant time on average**, even though it sometimes pushes a whole spine: every node is pushed exactly once and popped exactly once across the entire life of the iterator. So `n` calls to `next` perform about `2n` stack operations in total. Any single call might do more work than another, but the average is a small constant. This is the same counting argument used for the monotonic stack problems.

---

### Walking through the example

The tree is root `7`, with left child `3` and right child `15`, and `15` has children `9` and `20`.

1. **Setting up.** From `7`, push `7`, then go left and push `3`, which has no left child. The stack is `7, 3`.
2. **next.** Pop `3` and return it. It has no right child, so nothing is pushed. The stack is `7`.
3. **next.** Pop `7` and return it. Its right child is `15`, so push `15`, then run down its left spine and push `9`. The stack is `15, 9`.
4. **hasNext** is `true`, since the stack is not empty.
5. **next.** Pop `9` and return it. No right child. The stack is `15`.
6. **next.** Pop `15` and return it. Its right child is `20`, so push it. The stack is `20`.
7. **next.** Pop `20` and return it. The stack is empty, and `hasNext` is now `false`.

The values came out as `3, 7, 9, 15, 20`, in order.

---

### The code

```python
class BSTIterator:
    def __init__(self, root: TreeNode):
        self.stack = []
        self._push_left_spine(root)

    def _push_left_spine(self, node) -> None:
        # park every node on the way down; the last is the smallest
        while node:
            self.stack.append(node)
            node = node.left

    def next(self) -> int:
        node = self.stack.pop()

        # everything in the right subtree comes before this node's ancestors
        self._push_left_spine(node.right)

        return node.val

    def hasNext(self) -> bool:
        return len(self.stack) > 0
```

---

### Time and space complexity

#### Time: $O(1)$ on average for `next`, and $O(1)$ for `hasNext`

Each node is pushed once and popped once over the whole traversal, so `n` calls cost about `2n` operations in total. A single call can cost up to $O(h)$ when it descends a long spine, which is worth stating precisely rather than claiming a flat constant.

#### Space: $O(h)$

The stack never holds more than one node per level, because it only ever contains a root-to-node path.

---

### Remember this

An iterator is a paused traversal, so take over the remembering that the call stack normally does. Push the left spine, and on each `next` pop the top and push the left spine of its right child. Average constant time comes from each node being pushed and popped exactly once, and the stack only ever holds a single root-to-node path, which is $O(h)$.
