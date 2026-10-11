---
id: 9-binary-tree-level-order-traversal
title: "102. Binary Tree Level Order Traversal"
description: "Batch breadth-first search using queue level snapshotting"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BFS / Level Order</span>

> **Problem Statement:** Given the `root` of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).

```text
Input:  root = [3, 9, 20, null, null, 15, 7]
Output: [[3], [9, 20], [15, 7]]
Explanation: Level 0 contains [3], level 1 contains [9, 20], and level 2 contains [15, 7].
```

---

### The Intuitive Mental Model

Level order traversal processes nodes layer by layer from top to bottom and left to right. This behavior corresponds directly to Breadth-First Search (BFS) using a First-In, First-Out (FIFO) queue.

#### Brute Force: Recursive DFS with Depth Indexing
An alternative DFS strategy passes an integer `depth` argument during recursion, appending each node's value into a nested list at index `depth` (expanding the list as new depth levels are reached). While functionally correct, it visits nodes out of level order (diving deep before backtracking), requiring careful list management and failing to process elements in strict breadth-first order.

#### Optimal Approach: Queue Snapshotting BFS
To group nodes cleanly by level in pure BFS order without needing depth metadata on nodes:
1. Use a double-ended queue (`collections.deque`) initialized with `root`.
2. At the start of each level iteration, take a snapshot of the queue length: `level_size = len(queue)`.
3. Loop exactly `level_size` times to consume all nodes belonging strictly to the current level, while pushing their children to the back of the queue.
4. Append the collected level values to the final result list.

Because children are placed at the back of the queue, they will only be processed during subsequent level iterations after the current batch finishes.

#### Execution Walkthrough

Consider evaluating `root = [3, 9, 20, null, null, 15, 7]`:

| Level | Queue Snapshot (`len`) | Nodes Dequeued | Values Collected | Children Enqueued | Output Array (`result`) |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | `1` (`[3]`) | `3` | `[3]` | `9, 20` | `[[3]]` |
| **1** | `2` (`[9, 20]`) | `9, 20` | `[9, 20]` | `15, 7` | `[[3], [9, 20]]` |
| **2** | `2` (`[15, 7]`) | `15, 7` | `[15, 7]` | None (leaves) | `[[3], [9, 20], [15, 7]]` |

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `root is None`, return an empty list `[]`.
2. **Initialize Queue and Result:** Create a deque initialized with `[root]` and an empty list `result`.
3. **Iterate Over Levels:** While `queue` is not empty:
   - Capture `level_size = len(queue)` to freeze the current level count.
   - Initialize an empty list `current_level = []`.
   - Loop `level_size` times:
     - Pop the front node: `node = queue.popleft()`.
     - Append `node.val` to `current_level`.
     - If `node.left` exists, enqueue `node.left`.
     - If `node.right` exists, enqueue `node.right`.
   - Append `current_level` to `result`.
4. **Return Traversal:** Return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative BFS (Queue Snapshot)" default>

```python
from collections import deque

# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def levelOrder(self, root: TreeNode | None) -> list[list[int]]:
        if not root:
            return []

        result: list[list[int]] = []
        queue: deque[TreeNode] = deque([root])

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

            result.append(current_level)

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive DFS (Depth Tracking)">

```python
class Solution:
    def levelOrder(self, root: TreeNode | None) -> list[list[int]]:
        result: list[list[int]] = []

        def dfs(node: TreeNode | None, depth: int) -> None:
            if not node:
                return

            # Start a new level list if reaching this depth for the first time
            if depth == len(result):
                result.append([])

            result[depth].append(node.val)
            dfs(node.left, depth + 1)
            dfs(node.right, depth + 1)

        dfs(root, 0)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative BFS (Queue Snapshot)** | $O(n)$ | $O(w)$ | Natural level-by-level evaluation using FIFO queue. Space is proportional to maximum level width $w \le n/2$. |
| **Recursive DFS (Depth Tracking)** | $O(n)$ | $O(h)$ | Uses call stack recursion with explicit depth indices. Space is bounded by tree height $h$ ($O(\log n)$ balanced, $O(n)$ skewed). |

---

### Common Pitfall: Using Python list.pop(0) Instead of deque.popleft()

Using a standard Python `list` as a FIFO queue causes `pop(0)` to shift all remaining elements to the left, taking $O(k)$ time per pop where $k$ is the current length. Over $n$ nodes, this degrades overall runtime from optimal $O(n)$ to $O(n^2)$. Always use `collections.deque` which guarantees $O(1)$ amortized double-ended pops and pushes.

---

### Concise Interview Takeaway

For level-order traversal, use Breadth-First Search with a FIFO queue. Record `level_size = len(queue)` at the start of each level to process nodes in discrete batches without attaching depth tags to each node. This achieves optimal $O(n)$ time complexity and $O(w)$ auxiliary space, where $w$ is the maximum width of the tree.
