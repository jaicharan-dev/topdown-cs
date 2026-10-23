---
id: 19-binary-tree-maximum-path-sum
title: "124. Binary Tree Maximum Path Sum"
description: "Report one side upward, record both sides sideways, and refuse any negative branch"
sidebar_position: 19
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Programming on Trees</span>

> **Problem Statement:** A path is any sequence of connected nodes, each used once, which need not pass through the root. Return the largest total a path can have. Values may be negative.

```text
Input:  root = [-10, 9, 20, null, null, 15, 7]
Output: 42
```

---

### Picture it

This is Diameter of Binary Tree with values instead of edge counts, and one extra decision.

As before, every path has a **highest node**, and the best path through that node reaches down into the left and down into the right. So compute that at every node and keep the largest.

The new wrinkle is negatives. In the diameter problem, a longer branch was always better. Here a branch can actively hurt: if the best the left side can offer is `-7`, attaching it makes the path worse than not attaching it at all.

So each branch comes with a question: **is this side worth including?** If its best contribution is negative, take nothing from it and count it as zero.

---

### How to think about it

The two-jobs split from the diameter problem carries over exactly, and it is still the crux.

**What a node reports upward:** the best total it can offer on a single downward path, which is its own value plus the better of its two branches. Only one branch, because a path running through this node up to its parent cannot fork.

**What a node contributes to the answer:** its value plus **both** branches, which is the best path whose highest point is this node. That number is never returned, because no parent could use a forked path.

Then clamp each branch at zero. Taking `max(0, child's report)` means "use this side only if it helps", which handles every negative case without a special branch.

Note what is **not** clamped: the node's own value. Every path has at least one node, so a tree of nothing but negative values must answer with its largest single value, not zero. Clamping the node itself would wrongly allow an empty path.

---

### Walking through the example

The tree is root `-10`, with children `9` and `20`, and `20` has children `15` and `7`.

1. **Node 9** is a leaf. Both branches clamp to `0`. It contributes `9` and reports `9` upward.
2. **Nodes 15 and 7** are leaves too, each contributing and reporting their own value.
3. **Node 20.** Its branches report `15` and `7`, both positive, so neither clamps. It contributes `20 + 15 + 7 = 42`, and reports `20 + 15 = 35` upward, taking only the better branch.
4. **Node -10.** Its branches report `9` and `35`. Its contribution is `-10 + 9 + 35 = 34`, which does not beat `42`. It reports `-10 + 35 = 25` upward.

The best contribution seen anywhere is `42`, the path `15 -> 20 -> 7`. Note that this path never touches the root, which is exactly what the problem warns about.

---

### The code

```python
class Solution:
    def maxPathSum(self, root: TreeNode) -> int:
        best = float("-inf")

        def gain(node) -> int:
            nonlocal best

            if not node:
                return 0

            # a branch worth less than nothing is simply not used
            left = max(0, gain(node.left))
            right = max(0, gain(node.right))

            # the best path whose highest point is this node
            best = max(best, node.val + left + right)

            # upward, only one branch can come along
            return node.val + max(left, right)

        gain(root)
        return best
```

---

### Time and space complexity

#### Time: $O(n)$

Each node is visited once and does a constant amount of comparison and addition.

#### Space: $O(h)$

The recursion stack.

---

### Remember this

Every node is a candidate for the highest point of the best path, so record its value plus both branches, while reporting its value plus only the better branch upward, because a path cannot fork. Clamp each branch at zero so a harmful subtree is skipped, but never clamp the node's own value, or an all-negative tree wrongly answers zero instead of its largest value. $O(n)$ time, $O(h)$ stack space.
