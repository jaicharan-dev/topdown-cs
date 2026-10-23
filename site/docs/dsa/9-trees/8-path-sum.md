---
id: 8-path-sum
title: "112. Path Sum"
description: "Carry what is left of the target downward and check it at the leaves"
sidebar_position: 8
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Preorder</span>

> **Problem Statement:** Given a binary tree and a target number, say whether some path from the root down to a leaf has values adding up to that target. A leaf is a node with no children.

```text
Input:  root = [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], targetSum = 22
Output: true
```

---

### Picture it

Walk down from the root carrying a budget, and spend each node's value as you pass it.

The question then becomes very simple at the bottom: **did the budget land on exactly zero at a leaf?**

```text
arrive at a node with budget B, spend its value v, carry B - v downward
```

That is the other half of the recursion pattern in this block. Depth and diameter build answers **up** from the children. This one pushes information **down** from the parent, and the check happens at the bottom.

---

### How to think about it

The recursion takes a node and the budget remaining when you arrive at it.

**Empty node:** return `false`. There is no path here. This also covers an entirely empty tree, where the answer should be `false` whatever the target is.

**A leaf:** spend its value and see whether the budget is now exactly zero. Only leaves can answer `true`, because the problem asks for root-to-leaf paths specifically.

**Anything else:** subtract this node's value and ask either child whether it can finish the job. Joining the two calls with `or` means the first success ends the search immediately.

The detail that catches people is **stopping at a node that merely hits zero**. A node halfway down whose budget reaches zero is not an answer unless it is also a leaf, and a subtree hanging below it could easily carry negative values that bring a longer path back to zero. The leaf test is what keeps that honest.

Equally, do not test for emptiness on only one child. A node with a single child is not a leaf, and the empty side correctly returns `false` rather than being mistaken for a finished path.

---

### Walking through the example

The target is `22`. The tree starts at `5`, with children `4` and `8`. Node `4` has one child `11`, which has children `7` and `2`.

1. **At node 5** with budget `22`. Spend `5`, so `17` goes down.
2. **At node 4** with `17`. Spend `4`, so `13` goes down.
3. **At node 11** with `13`. Spend `11`, so `2` goes down to both children.
4. **At node 7**, a leaf, with budget `2`. Spending `7` leaves `-5`, not zero, so this path fails.
5. **At node 2**, a leaf, with budget `2`. Spending `2` leaves exactly `0`, so this path succeeds.

The `or` carries that `true` back to the root, and the `8` subtree is never explored.

---

### The code

```python
class Solution:
    def hasPathSum(self, root: TreeNode, targetSum: int) -> bool:
        if not root:
            return False

        remaining = targetSum - root.val

        # only a leaf can finish a root-to-leaf path
        if not root.left and not root.right:
            return remaining == 0

        return (self.hasPathSum(root.left, remaining)
                or self.hasPathSum(root.right, remaining))
```

---

### Time and space complexity

#### Time: $O(n)$

In the worst case every node is visited once. The `or` short-circuits, so a path found early can finish much sooner.

#### Space: $O(h)$

The recursion stack, one frame per level.

---

### Remember this

Push the remaining target downward instead of adding values on the way back up, so the check lands exactly where the problem defines the path to end: at a leaf. A node whose budget reaches zero mid-tree proves nothing, because values below it may be negative. Join the two child calls with `or` so the first success stops the search. $O(n)$ time, $O(h)$ stack space.
