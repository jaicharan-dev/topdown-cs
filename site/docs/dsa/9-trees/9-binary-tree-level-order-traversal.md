---
id: 9-binary-tree-level-order-traversal
title: "102. Binary Tree Level Order Traversal"
description: "Measure the queue before you drain it, and that count is one whole level"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BFS / Level Order</span>

> **Problem Statement:** Given the root of a binary tree, return its values level by level, each level read left to right, with each level as its own list.

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: [[3], [9, 20], [15, 7]]
```

---

### Picture it

Every problem so far has gone **down** a branch as far as possible before coming back. This one goes **across**, finishing an entire row before touching the next.

That is breadth-first search, and it runs on a queue instead of recursion. Start with the root in the queue. Take a node out, record it, and put its children at the back. Because children are always added behind everything already waiting, nodes come out in exactly the order you want: all of one row, then all of the next.

One difficulty remains. A plain queue walk gives you the values in the right order but as one flat stream, with nothing marking where a row ends.

---

### How to think about it

The trick is simple once seen: **measure the queue before you start draining it**.

At the moment a level begins, the queue holds exactly that level's nodes and nothing else. So take its size, then process precisely that many nodes, collecting their values into one list. Every child added during that burst belongs to the next level and waits its turn behind the ones you are processing.

```text
queue holds [3]            size 1 -> take 1  -> level [3]
queue holds [9, 20]        size 2 -> take 2  -> level [9, 20]
queue holds [15, 7]        size 2 -> take 2  -> level [15, 7]
queue is empty             stop
```

Capture the size into a variable before the inner loop. Testing the queue's length as the loop condition fails, because the queue grows while you are draining it and the loop would run past the level boundary.

Use a double-ended queue so that removing from the front is constant time. Removing from the front of an ordinary list shifts every remaining element, which quietly makes the whole traversal $O(n^2)$.

An empty tree should produce an empty list, so check the root before starting.

---

### Walking through the example

The tree is root `3`, with children `9` and `20`, and `20` has children `15` and `7`.

1. **Queue holds `3`**, size `1`. Take `3`, record it, and add `9` and `20`. The first level is `[3]`.
2. **Queue holds `9, 20`**, size `2`. Take `9`, which has no children. Take `20`, adding `15` and `7`. The second level is `[9, 20]`.
3. **Queue holds `15, 7`**, size `2`. Take both; neither has children. The third level is `[15, 7]`.
4. **Queue is empty**, so stop.

The answer is `[[3], [9, 20], [15, 7]]`.

---

### The code

```python
from collections import deque

class Solution:
    def levelOrder(self, root: TreeNode) -> list[list[int]]:
        if not root:
            return []

        out = []
        queue = deque([root])

        while queue:
            # take the size first: the queue grows while this level drains
            level_size = len(queue)
            level = []

            for _ in range(level_size):
                node = queue.popleft()
                level.append(node.val)

                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

            out.append(level)

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

Every node enters and leaves the queue exactly once, each for constant cost.

#### Space: $O(w)$

Where `w` is the widest level of the tree, because that is the most the queue ever holds at once. In the worst case, a complete tree's bottom row, that is about half the nodes, so $O(n)$.

This is the opposite trade from depth-first search, which costs the tree's **height** instead. Deep narrow trees favour breadth-first; wide shallow trees favour depth-first.

---

### Remember this

Breadth-first with a queue gives the values in level order, and capturing the queue's size before draining it is what carves that stream into levels. Use a real queue so removal from the front is constant, not a list. $O(n)$ time and $O(w)$ space, where `w` is the widest level.
