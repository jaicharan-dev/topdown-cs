---
id: 6-same-tree
title: "100. Same Tree"
description: "Walk both trees in step and compare the nodes you land on"
sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Preorder</span>

> **Problem Statement:** Given the roots of two binary trees, say whether they have the same shape and the same values in the same places.

```text
Input:  p = [1, 2, 3], q = [1, 2, 3]
Output: true
```

---

### Picture it

Walk both trees at once, taking the same step in each. Whenever you move left in one, move left in the other.

At every stop, three things can be true:

- **Both positions are empty.** The trees agree here, so this branch is fine.
- **One is empty and the other is not.** The shapes differ, so the answer is `false`.
- **Both hold a node.** Compare the values, then carry on into both pairs of children.

The trees are the same exactly when the walk finishes without hitting the second case or a value mismatch.

---

### How to think about it

The recursion compares two nodes at a time rather than one, which is the only difference from a single-tree walk.

Order the checks carefully, because the empty cases have to be settled before any value is read:

1. **Both empty** returns `true`. Note this comes first, so it also covers two empty trees.
2. **Only one empty** returns `false`. Reaching this line means at least one is a real node, so a mismatch in shape is already proven.
3. **Values differ** returns `false`.
4. Otherwise, both left subtrees must match **and** both right subtrees must match.

That final `and` is what forces the whole tree to agree. It also short-circuits: if the left sides disagree, the right sides are never examined, so a mismatch near the top ends the work immediately.

Comparing values before checking for emptiness is the classic crash here, since an empty position has no value to read.

---

### Walking through the example

Both trees are root `1` with children `2` and `3`.

1. **Both roots hold `1`.** Values match, so compare the children.
2. **Both left children hold `2`.** Values match. Their own children are all empty, and empty against empty is `true`.
3. **Both right children hold `3`.** Same again.

Every branch returns `true`, so the answer is `true`.

Had the second tree been `[1, 3, 2]`, step 2 would compare `2` against `3`, return `false`, and the right subtrees would never be looked at.

---

### The code

```python
class Solution:
    def isSameTree(self, p: TreeNode, q: TreeNode) -> bool:
        # both empty: this branch agrees
        if not p and not q:
            return True

        # one empty, one not: the shapes differ
        if not p or not q:
            return False

        if p.val != q.val:
            return False

        return (self.isSameTree(p.left, q.left)
                and self.isSameTree(p.right, q.right))
```

---

### Time and space complexity

#### Time: $O(n)$

Where `n` is the size of the smaller tree, since any disagreement stops the walk. In the worst case, identical trees, every pair of nodes is compared once.

#### Space: $O(h)$

The recursion stack, one frame per level of the trees being walked in step.

---

### Remember this

Walk both trees together and compare node pairs. Handle both-empty first, then one-empty, then the values, then recurse into both pairs of children joined with `and`. Checking emptiness before reading a value is what keeps it from crashing, and the `and` short-circuits so a mismatch ends the work early. $O(n)$ time, $O(h)$ stack space.
