---
id: 11-binary-tree-right-side-view
title: "199. Binary Tree Right Side View"
description: "Capturing the rightmost node per depth level via level-order BFS"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Breadth-First Search</span>

> **Problem Statement:** Given the root of a binary tree, imagine yourself standing on the right-hand side of it. Return the values of the nodes you can see from top to bottom.

```text
Input:  root = [1, 2, 3, null, 5, null, 4]
Output: [1, 3, 4]
Explanation: Looking from the right side, the visible nodes are 1 at depth 0, 3 at depth 1, and 4 at depth 2.
```

---

### The Intuitive Mental Model

Imagine an urban skyline viewed from the east at sunset. For each floor of an office complex, only the outermost eastern silhouette is visible; all buildings positioned further to the west on that same floor are occluded by darkness.

In binary tree terms:
- Looking from the right side, you see exactly **one node per depth level**.
- That visible node is the **rightmost** node existing at that depth.
- Crucially, the rightmost node is **not** necessarily in the right subtree of the root. If a right branch terminates early, deeper nodes from the left subtree emerge into view.

```
        1            <-- Level 0: sees 1
      /   \
     2     3         <-- Level 1: sees 3 (blocks 2)
      \     \
       5     4       <-- Level 2: sees 4 (blocks 5)

Output: [1, 3, 4]
```

#### Brute Force: Full Level Traversal with Post-Filtering
The brute force mental model traverses every level of the tree using level-order traversal, collects all node values across each depth into nested lists (such as `[[1], [2, 3], [5, 4]]`), and then extracts only the last element from each sublist (`[sub[-1] for sub in levels]`). While functionally correct and $O(n)$ in time, it incurs unnecessary intermediate allocations for all hidden nodes on every level.

#### Optimal Approach: Direct Rightmost Selection via BFS
Instead of accumulating full lists of nodes per level, we process the tree level by level using a FIFO queue. At each level of size `level_size`, we dequeue nodes from left to right. When our iteration index reaches `level_size - 1`, we have arrived at the rightmost node of that tier. We append only that node's value directly to our result list, discarding the need for intermediate level storage.

Alternatively, a reverse depth-first search visiting **Root $\to$ Right $\to$ Left** can track recursion depth: the first node encountered at depth $d$ is guaranteed to be the rightmost node at that level.

#### Execution Walkthrough

Let us trace the tree `root = [1, 2, 3, null, 5, null, 4]`:

| Level | Queue at Start | Node Processed | Last in Level? | Action Taken | Result |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **0** | `[1]` | `1` | **Yes** (`i = 0 == 0`) | Enqueue left (`2`), right (`3`); record `1` | `[1]` |
| **1** | `[2, 3]` | `2` | No (`i = 0 != 1`) | Enqueue right (`5`) | `[1]` |
| **1** | `[3, 5]` | `3` | **Yes** (`i = 1 == 1`) | Enqueue right (`4`); record `3` | `[1, 3]` |
| **2** | `[5, 4]` | `5` | No (`i = 0 != 1`) | No children to enqueue | `[1, 3]` |
| **2** | `[4]` | `4` | **Yes** (`i = 1 == 1`) | No children to enqueue; record `4` | `[1, 3, 4]` |

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `root` is `None`, return an empty list `[]`.
2. **Initialize Queue:** Create a double-ended queue `queue` containing `root`, and an empty list `result`.
3. **Iterate Level by Level:** While `queue` is non-empty:
   - Record `level_size = len(queue)` to freeze the boundary of the current depth level.
   - Loop `i` from `0` to `level_size - 1`:
     - Pop `node = queue.popleft()`.
     - If `i == level_size - 1`, append `node.val` to `result`.
     - If `node.left` exists, append it to `queue`.
     - If `node.right` exists, append it to `queue`.
4. **Return Result:** Once the queue is exhausted, return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Level-Order BFS" default>

```python
from collections import deque

class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def rightSideView(self, root: TreeNode | None) -> list[int]:
        if not root:
            return []

        result: list[int] = []
        queue: deque[TreeNode] = deque([root])

        while queue:
            level_size = len(queue)

            for i in range(level_size):
                node = queue.popleft()

                # The last node popped in this level is the rightmost visible node
                if i == level_size - 1:
                    result.append(node.val)

                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive DFS (Root -> Right -> Left)">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def rightSideView(self, root: TreeNode | None) -> list[int]:
        result: list[int] = []

        def dfs(node: TreeNode | None, depth: int) -> None:
            if not node:
                return

            # The first node visited at this depth is the rightmost node
            if depth == len(result):
                result.append(node.val)

            # Prioritize right branch over left branch
            dfs(node.right, depth + 1)
            dfs(node.left, depth + 1)

        dfs(root, 0)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive DFS** | $O(n)$ | $O(h)$ | Visits right subtrees first. Uses call stack space proportional to height $h$ ($O(\log n)$ balanced, $O(n)$ skewed). |
| **Level-Order BFS** | $O(n)$ | $O(w)$ | Traverses layer by layer using an explicit queue. Uses space proportional to maximum width $w \le \lceil n/2 \rceil$. |

---

### Common Pitfall: Assuming the Right Subtree Holds All Answers

A frequent mistake is simply walking down the right pointers (`root = root.right`). If the right subtree is shallower than the left subtree, nodes from the deeper left branches become visible from the right once the right branches end. Both BFS and DFS must inspect both children so that deeper left branches are never ignored.

---

### Concise Interview Takeaway

The right side view consists of the last node of each level-order BFS tier. By freezing `level_size = len(queue)` at the start of each level, the element at index `level_size - 1` is guaranteed to be the rightmost node. Alternatively, a Root-to-Right-to-Left DFS captures the rightmost node whenever `depth == len(result)`.
