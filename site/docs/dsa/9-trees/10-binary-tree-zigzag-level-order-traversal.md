---
id: 10-binary-tree-zigzag-level-order-traversal
title: "103. Binary Tree Zigzag Level Order Traversal"
description: "Breadth-first search with alternating direction reversal"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BFS / Two Pointers</span>

> **Problem Statement:** Given the `root` of a binary tree, return the zigzag level order traversal of its nodes' values (i.e., from left to right, then right to left for the next level and alternate between).

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: [[3], [20, 9], [15, 7]]
Explanation: Level 0 reads left to right [3], level 1 reads right to left [20, 9], and level 2 reads left to right [15, 7].
```

---

### The Intuitive Mental Model

Zigzag level order traversal alternates direction from one level to the next: left to right on even depths (0, 2, 4...) and right to left on odd depths (1, 3, 5...).

#### Brute Force: Alternating Dual Stacks
A complex alternative uses two separate LIFO stacks (`stack_odd` and `stack_even`), alternating which stack receives child nodes and flipping whether left or right children are pushed first. While functional, manipulating child push orders across alternating stacks creates intricate pointer mechanics that are error-prone under interview conditions.

#### Optimal Approach: Standard FIFO Queue with Direction Flag
The underlying parent-child hierarchy does not change; children are always located beneath their respective parents in consistent left-to-right geometry.

Instead of disrupting child traversal order in the queue:
1. Maintain standard Breadth-First Search using a double-ended queue (`collections.deque`), always enqueuing `node.left` then `node.right`.
2. Track an orientation flag: `left_to_right = True`.
3. Snapshot `level_size = len(queue)` at the beginning of each level.
4. If `left_to_right` is true, append values to the level list normally. If false, reverse the level list before saving (or append to the left of a double-ended level buffer).
5. Invert the flag (`left_to_right = not left_to_right`) after finishing each tier.

#### Execution Walkthrough

Consider evaluating `root = [3, 9, 20, null, null, 15, 7]`:

| Level | `left_to_right` | Queue Snapshot | Dequeued Nodes | Raw Level Values | Direction Adjusted Level | Output (`result`) |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | `True` | `[3]` | `3` | `[3]` | `[3]` | `[[3]]` |
| **1** | `False` | `[9, 20]` | `9, 20` | `[9, 20]` | `[20, 9]` (reversed) | `[[3], [20, 9]]` |
| **2** | `True` | `[15, 7]` | `15, 7` | `[15, 7]` | `[15, 7]` | `[[3], [20, 9], [15, 7]]` |

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `root is None`, return an empty list `[]`.
2. **Initialize Containers:**
   - Create a deque initialized with `[root]`.
   - Initialize `result = []` and boolean flag `left_to_right = True`.
3. **Traverse Levels:** While `queue` is not empty:
   - Record `level_size = len(queue)`.
   - Initialize an empty list `current_level = []`.
   - For `level_size` iterations:
     - Pop `node = queue.popleft()`.
     - Append `node.val` to `current_level`.
     - Enqueue `node.left` if present.
     - Enqueue `node.right` if present.
   - If not `left_to_right`: reverse `current_level`.
   - Append `current_level` to `result`.
   - Toggle direction: `left_to_right = not left_to_right`.
4. **Return Result:** Return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Standard BFS with Level Reversal" default>

```python
from collections import deque

# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def zigzagLevelOrder(self, root: TreeNode | None) -> list[list[int]]:
        if not root:
            return []

        result: list[list[int]] = []
        queue: deque[TreeNode] = deque([root])
        left_to_right = True

        while queue:
            level_size = len(queue)
            current_level: list[int] = []

            for _ in range(level_size):
                node = queue.popleft()
                current_level.append(node.val)

                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

            if not left_to_right:
                current_level.reverse()

            result.append(current_level)
            left_to_right = not left_to_right

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Double-Ended Level Deque">

```python
from collections import deque

class Solution:
    def zigzagLevelOrder(self, root: TreeNode | None) -> list[list[int]]:
        if not root:
            return []

        result: list[list[int]] = []
        queue: deque[TreeNode] = deque([root])
        left_to_right = True

        while queue:
            level_size = len(queue)
            level_deque: deque[int] = deque()

            for _ in range(level_size):
                node = queue.popleft()

                if left_to_right:
                    level_deque.append(node.val)
                else:
                    level_deque.appendleft(node.val)

                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

            result.append(list(level_deque))
            left_to_right = not left_to_right

        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Standard BFS with Reversal** | $O(n)$ | $O(w)$ | Cleanest and simplest logic. In-place reversal of each level takes linear time proportional to width $w$. |
| **Double-Ended Level Deque** | $O(n)$ | $O(w)$ | Avoids post-processing reversal by placing values into an inner deque directly at head or tail. |

---

### Common Pitfall: Altering Child Insertion Order in the Queue

A tempting but buggy idea is reversing the order children are added to the main BFS queue (e.g. adding right child before left child on odd rows). Because children in the queue belong to the next level, flipping insertion orders corrupts the left-to-right ancestry of subsequent generations. Keep queue insertion order strictly standard (`left` then `right`), and only alternate how values are added or ordered within the current level's output list.

---

### Concise Interview Takeaway

Never alter child insertion order inside the main BFS queue, which must remain strictly left-to-right to preserve structural integrity. Instead, maintain a standard FIFO queue snapshot, collect node values per level, and reverse alternating levels (or use `deque.appendleft`) controlled by a boolean parity flag. This runs in optimal $O(n)$ time and $O(w)$ auxiliary space.
