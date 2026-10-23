---
id: 10-binary-tree-zigzag-level-order-traversal
title: "103. Binary Tree Zigzag Level Order Traversal"
description: "Walk the tree normally and reverse every other level on the way out"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BFS / Two Pointers</span>

> **Problem Statement:** Given the root of a binary tree, return its values level by level, but alternate direction: the first level left to right, the second right to left, and so on.

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: [[3], [20, 9], [15, 7]]
```

---

### Picture it

This is Level Order Traversal with a twist that sounds harder than it is.

The tempting idea is to change the **walk**, alternating which child goes into the queue first. Resist it. Doing that scrambles which nodes belong to which level and the parent-child order stops lining up, and it is a genuinely annoying bug to find.

The walk should stay exactly as it was. The zigzag is a property of the **output**, so apply it to the output: collect each level left to right as usual, and reverse the ones that should read the other way.

---

### How to think about it

Take the level-order code unchanged: a queue, the size captured before draining, one list built per level.

Then add a single flag that flips each time a level is finished. When it says right-to-left, reverse that level's list before adding it to the answer.

The levels that get reversed are the odd-numbered ones, counting the root as level zero. So the flag can be replaced by checking whether the answer so far has an odd number of entries, which removes the extra variable entirely.

For a faster version, build the level into a double-ended queue and append to whichever end the direction calls for. That avoids the reversal, though reversing a list is cheap enough that it rarely matters: each level is reversed once, so across the whole tree it adds up to one extra pass over `n` values.

---

### Walking through the example

The tree is root `3`, with children `9` and `20`, and `20` has children `15` and `7`.

1. **Level 0.** Collected left to right as `[3]`. It is level zero, so it stays as it is.
2. **Level 1.** Collected left to right as `[9, 20]`, exactly as the plain traversal would. Level one is odd, so reverse it to `[20, 9]`.
3. **Level 2.** Collected as `[15, 7]`. Level two is even, so it stays.

The answer is `[[3], [20, 9], [15, 7]]`.

Note that `15` and `7` were queued in that order because `20` was processed normally. The walk never changed, only the presentation did.

---

### The code

```python
from collections import deque

class Solution:
    def zigzagLevelOrder(self, root: TreeNode) -> list[list[int]]:
        if not root:
            return []

        out = []
        queue = deque([root])

        while queue:
            level_size = len(queue)
            level = []

            for _ in range(level_size):
                node = queue.popleft()
                level.append(node.val)

                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

            # the walk never changes; only the finished level is flipped
            if len(out) % 2:
                level.reverse()

            out.append(level)

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

Every node enters and leaves the queue once. The reversals add at most one more pass over all the values in total, since each node belongs to exactly one level.

#### Space: $O(w)$

The queue, bounded by the widest level of the tree.

---

### Remember this

Keep the breadth-first walk exactly as it is and flip the finished level instead. Changing which child is queued first breaks the level grouping and is far harder to debug than it looks. Reverse the odd-numbered levels, which you can test with the length of the answer so far rather than a separate flag. $O(n)$ time, $O(w)$ space.
