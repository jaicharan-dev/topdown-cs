---
id: 11-binary-tree-right-side-view
title: "199. Binary Tree Right Side View"
description: "One node per level: whichever one comes last as you sweep across it"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Breadth-First Search</span>

> **Problem Statement:** Standing to the right of a binary tree, return the values you can see from top to bottom.

```text
Input:  root = [1, 2, 3, null, 5, null, 4]
Output: [1, 3, 4]
```

---

### Picture it

Standing on the right, each level of the tree hides behind its rightmost node. Everything else on that level is blocked from view.

So the answer is exactly one value per level: **the last node on each level**, reading left to right.

The trap in the wording is thinking this means "keep going right from the root". It does not. A level's rightmost node may well sit in the left half of the tree, if the right half has nothing at that depth. The example is built to catch precisely that.

---

### How to think about it

Level order traversal already walks each level left to right, so the answer is the last node of each sweep.

Take the level-order code and, instead of collecting the whole level, keep only the final value. The cleanest way is to notice when you are on the last node of the level: with the level size captured up front, that is the iteration where the counter reaches the end.

An empty tree gives an empty answer, which the usual root check handles.

**The depth-first alternative** is also worth knowing. Walk the tree visiting the **right child first**, carrying the current depth. The first node you reach at each new depth is the rightmost one, so record a value whenever the depth equals the number of values collected so far. It costs $O(h)$ stack rather than $O(w)$ queue, which is the better trade on a deep narrow tree. The breadth-first version matches the problem's phrasing more directly, which is why it comes first here.

---

### Walking through the example

The tree is root `1`, with children `2` and `3`. Node `2` has a right child `5` and no left child; node `3` has a right child `4` and no left child.

1. **Level 0** holds `1`. The last node is `1`, so it is visible.
2. **Level 1** holds `2` then `3`. The last is `3`, so `2` is hidden behind it.
3. **Level 2** holds `5` then `4`, since `2` is processed before `3` and each contributes its right child. The last is `4`.

The answer is `[1, 3, 4]`.

Now imagine node `3` had no children at all. Level 2 would hold only `5`, which sits in the **left** half of the tree, and it would be visible. That is why "always go right" is wrong.

---

### The code

```python
from collections import deque

class Solution:
    def rightSideView(self, root: TreeNode) -> list[int]:
        if not root:
            return []

        out = []
        queue = deque([root])

        while queue:
            level_size = len(queue)

            for i in range(level_size):
                node = queue.popleft()

                # the last node of the level is the one you can see
                if i == level_size - 1:
                    out.append(node.val)

                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

Every node passes through the queue once, even though only one per level is recorded. There is no way to know which node is last without sweeping the level.

#### Space: $O(w)$

The queue, bounded by the widest level. The depth-first alternative trades this for $O(h)$ stack space.

---

### Remember this

The visible node on each level is simply the last one in a left-to-right sweep, which may sit anywhere in the tree, not necessarily on the right branch. Run level order and keep the final node of each level. The right-first depth-first walk is the same answer at $O(h)$ space instead of $O(w)$. $O(n)$ time.
