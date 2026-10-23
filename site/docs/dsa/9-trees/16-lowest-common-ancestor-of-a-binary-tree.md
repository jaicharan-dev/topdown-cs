---
id: 16-lowest-common-ancestor-of-a-binary-tree
title: "236. Lowest Common Ancestor of a Binary Tree"
description: "Each node reports what it found below, and the node that hears from both sides wins"
sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Depth-First Search</span>

> **Problem Statement:** Given any binary tree and two of its nodes, find the deepest node that has both of them below it. A node counts as being below itself.

```text
Input:  root = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p = 5, q = 1
Output: 3
```

---

### Picture it

In the search tree version, comparisons told you which way to walk. Here there is no ordering at all, so a target could be absolutely anywhere. There is no direction to choose, which means both subtrees have to be searched.

So turn the question around. Instead of walking **down** looking for targets, let information come **up**.

Have every node report one thing: "did I find either target at or below me?" Then the answer is the node that hears yes from its **left** side and yes from its **right** side, because that is the lowest point where the two targets stop being in the same subtree.

---

### How to think about it

The recursion returns a node, with a meaning that has to be stated carefully: *something relevant found at or below here*, which is either one of the targets or the answer itself.

Three cases:

**Empty, or this node is one of the targets.** Return the node as it stands. Note that finding a target means stopping without looking below it, which is what makes a target that is an ancestor of the other still come out correct: the deeper one is never reported, so the shallower one travels up alone and wins.

**Both sides reported something.** The two targets are in different subtrees, so this node is where they meet. Return it.

**Only one side reported something.** Pass that report upward unchanged. Either it is a lone target still looking for its partner, or it is the answer already found deeper down, travelling to the top.

That last case is the part worth saying out loud. The same return value carries two different meanings at different moments, and the code cannot tell them apart. It does not need to: both are simply handed up.

This assumes, as the problem states, that both targets actually exist in the tree. If they might not, the answer has to be verified afterwards, because a lone target would be returned as though it were the ancestor.

---

### Walking through the example

The tree is root `3`, with `5` on the left and `1` on the right. The targets are `5` and `1`.

1. **At node 5.** It is a target, so it returns itself immediately. Its children are never explored.
2. **At node 1.** Also a target, so it returns itself.
3. **At node 3.** The left side reported `5`, the right side reported `1`. Both sides spoke, so `3` is the answer.

Now take the targets `5` and `4`, where `4` sits below `5`:

1. **At node 5.** It is a target, so it returns itself without exploring below, and `4` is never found.
2. **At node 1.** Nothing below it, so it returns nothing.
3. **At node 3.** Only the left side spoke, so it passes `5` upward, which is the correct answer.

---

### The code

```python
class Solution:
    def lowestCommonAncestor(self, root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
        # nothing here, or this node is one of the targets
        if not root or root is p or root is q:
            return root

        left = self.lowestCommonAncestor(root.left, p, q)
        right = self.lowestCommonAncestor(root.right, p, q)

        # heard from both sides, so the targets split here
        if left and right:
            return root

        # otherwise pass up whatever was found, if anything
        return left or right
```

---

### Time and space complexity

#### Time: $O(n)$

Every node is visited at most once. Without an ordering to guide the search, there is no way to avoid examining the tree, though stopping at a target does prune whatever was below it.

#### Space: $O(h)$

The recursion stack.

---

### Remember this

With no ordering there is no direction to choose, so search both sides and let the answer come up. Return the node itself when it is a target, return this node when both sides report back, and otherwise pass up whichever single report arrived. That one return value means "a target" and "the answer" at different moments, and handing it up blindly is correct for both. $O(n)$ time, $O(h)$ stack space.
