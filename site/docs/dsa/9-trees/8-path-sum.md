---
id: 8-path-sum
title: "112. Path Sum"
description: "Root-to-leaf target subtraction with short-circuiting recursion"
sidebar_position: 8
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Preorder</span>

> **Problem Statement:** Given the root of a binary tree and an integer `targetSum`, return `true` if the tree has a root-to-leaf path such that adding up all the values along the path equals `targetSum`. A leaf is a node with no children.

```text
Input:  root = [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], targetSum = 22
Output: true
Explanation: The root-to-leaf path 5 -> 4 -> 11 -> 2 sums to 5 + 4 + 11 + 2 = 22.
```

---

### The Intuitive Mental Model

We must determine whether any path starting at the root and terminating at a genuine leaf node has node values that sum to `targetSum`.

#### Brute Force: Path Backtracking and Accumulation
A brute-force solution collects every root-to-leaf path into list buffers, calculates the sum of each collected path list, and tests if any sum equals `targetSum`. While functional, constructing and retaining intermediate lists creates unnecessary memory allocations and visits all leaves even when an early match exists.

#### Optimal Approach: Top-Down Target Subtraction
Instead of collecting lists or carrying a separate running total, we subtract the current node's value from `targetSum` as we descend:
$$\text{remaining} = \text{targetSum} - \text{node.val}$$

When reaching a leaf node (`not node.left and not node.right`), we simply check whether `node.val == targetSum`. The logical `or` operator automatically short-circuits as soon as any valid branch returns `True`.

#### Execution Walkthrough

Consider searching for `targetSum = 22` in the tree:

```text
         5
        / \
       4   8
      /
    11
    / \
   7   2
```

| Step | Node | Current `targetSum` | Leaf Node? | Remaining Balance (`targetSum - val`) | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `5` (root) | `22` | No | $22 - 5 = 17$ | Recurse left with `17` |
| **2** | `4` | `17` | No | $17 - 4 = 13$ | Recurse left with `13` |
| **3** | `11` | `13` | No | $13 - 11 = 2$ | Recurse left to `7` with `2` |
| **4** | `7` | `2` | **Yes** | $2 - 7 = -5 \ne 0$ | Leaf value $7 \ne 2$, returns `False` |
| **5** | `2` | `2` | **Yes** | $2 - 2 = 0$ | Leaf value $2 == 2$, returns `True` |

Node `2` succeeds, short-circuiting back through `11`, `4`, and `5` to return `True`.

---

### Step-by-Step Algorithm

1. **Check Base Case:** If `root is None`, return `False` because an empty tree contains no root-to-leaf paths.
2. **Evaluate Leaf Condition:** If both `root.left` and `root.right` are `None`, return `root.val == targetSum`.
3. **Subtract and Recurse:**
   - Compute `remaining = targetSum - root.val`.
   - Recursively call `self.hasPathSum(root.left, remaining)` and `self.hasPathSum(root.right, remaining)`.
4. **Short-Circuit Return:** Return `True` if either subtree path returns `True`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Recursive DFS" default>

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def hasPathSum(self, root: TreeNode | None, targetSum: int) -> bool:
        if not root:
            return False

        # Leaf node check: path must terminate at an actual leaf
        if not root.left and not root.right:
            return root.val == targetSum

        # Deduct current node value and explore subtrees
        remaining = targetSum - root.val
        return self.hasPathSum(root.left, remaining) or self.hasPathSum(root.right, remaining)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative DFS (Stack)">

```python
class Solution:
    def hasPathSum(self, root: TreeNode | None, targetSum: int) -> bool:
        if not root:
            return False

        stack: list[tuple[TreeNode, int]] = [(root, targetSum - root.val)]

        while stack:
            node, curr_sum = stack.pop()

            if not node.left and not node.right and curr_sum == 0:
                return True

            if node.right:
                stack.append((node.right, curr_sum - node.right.val))
            if node.left:
                stack.append((node.left, curr_sum - node.left.val))

        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive DFS** | $O(n)$ | $O(h)$ | Direct top-down subtraction. Early exits on first valid leaf. Space bounded by tree height $h$. |
| **Iterative DFS** | $O(n)$ | $O(h)$ | Explicit stack storing node and remaining target pairs. Avoids call stack overflow on deep trees. |

---

### Common Pitfall: Terminating at Non-Leaf Nodes or Pruning Negatives

A frequent mistake is returning `True` when `remaining == 0` at an internal node that still has children. The problem strictly mandates a root-to-leaf path, so the condition can only be validated when `not node.left and not node.right`. Additionally, because node values can be negative, never prune branches simply because `targetSum < 0`.

---

### Concise Interview Takeaway

Subtract `node.val` as you descend the tree and check whether `root.val == targetSum` strictly at leaf nodes (`not root.left and not root.right`). Using the logical `or` operator short-circuits traversal as soon as any valid path is confirmed, executing in $O(n)$ time and $O(h)$ stack space.
