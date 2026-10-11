---
id: 19-binary-tree-maximum-path-sum
title: "124. Binary Tree Maximum Path Sum"
description: "Postorder one-way branch gain with global split arch optimization"
sidebar_position: 19
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Programming on Trees</span>

> **Problem Statement:** A path in a binary tree is a non-empty sequence of nodes where each adjacent pair in the sequence is connected by an edge. A node may appear at most once in the sequence, and the path does not need to pass through the root. Given the root of a binary tree, return the maximum path sum of any valid path.

```text
Input:  root = [-10, 9, 20, null, null, 15, 7]
Output: 42
Explanation: The optimal path is 15 -> 20 -> 7 with path sum 15 + 20 + 7 = 42.
```

---

### The Intuitive Mental Model

A tree path can twist and turn, but it has a fundamental physical rule: **a valid path cannot branch**. You can enter a node from one subtree and exit into another, but you cannot visit three branches at once.

At any given node `curr`, we must resolve a tension between two distinct geometric concepts:

1. **The Peak of the Arch (The Local Split):**
   - Imagine `curr` acts as the highest elevation of a bridge connecting its left subtree to its right subtree.
   - The total sum of this bridge is: `curr.val + left_gain + right_gain`.
   - Because this path forms an inverted "U" shape (turning around at `curr`), it **cannot be extended upward** to `curr`'s parent.
   - We evaluate this complete arch as a candidate for our overall answer: `global_max = max(global_max, arch_sum)`.

2. **The Extendable Branch (Sent to the Parent):**
   - When reporting back to `curr`'s parent, the parent can only extend the path down **one** of `curr`'s sides (either left or right).
   - Therefore, the helper function must return: `curr.val + max(left_gain, right_gain)`.

```
         (Parent)
            |
          [curr]   <-- Peak of the Arch!
          /    \
     [Left]    [Right]

     Candidate for global_max:  curr.val + left_gain + right_gain
     Value returned to Parent: curr.val + max(left_gain, right_gain)
```

Node values can be negative. If a child subtree yields a negative sum (such as `-5`), including it in our path will only decrease the total score. We greedily clamp negative subtree contributions to zero using `max(0, dfs(child))`, effectively choosing to skip that subtree entirely.

#### Brute Force: Evaluating Paths for Every Node Pair
The brute force mental model evaluates every pair of nodes $(u, v)$ in the tree, finds their unique simple path, and sums the values along that path. Because there are $O(n^2)$ pairs and computing each path takes $O(n)$ time, this naive enumeration scales at $O(n^3)$ or $O(n^2)$ time with heavy allocations.

#### Optimal Approach: Postorder Bottom-Up Gain Propagation
Instead of evaluating paths externally, we compute optimal gains bottom-up in a single postorder traversal:
1. Recursively calculate the maximum extendable branch gain from the left and right subtrees.
2. Clamp negative gains to `0`.
3. Calculate the complete arch sum passing through `curr` (`curr.val + left_gain + right_gain`) and update our running `global_max`.
4. Return only the single best branch continuation (`curr.val + max(left_gain, right_gain)`) to the parent.

This resolves both local peaks and parent continuations in $O(n)$ time and $O(h)$ space.

#### Execution Walkthrough

Let us trace `root = [-10, 9, 20, null, null, 15, 7]`:

| Node Visited | Left Child Gain | Right Child Gain | Arch Sum (`node + left + right`) | Global Max Updated | Value Returned to Parent |
| :---: | :---: | :---: | :---: | :---: | :---: |
| `9` | 0 | 0 | $9 + 0 + 0 = 9$ | 9 | $9 + \max(0, 0) = 9$ |
| `15` | 0 | 0 | $15 + 0 + 0 = 15$ | 15 | $15 + \max(0, 0) = 15$ |
| `7` | 0 | 0 | $7 + 0 + 0 = 7$ | 15 | $7 + \max(0, 0) = 7$ |
| `20` | 15 | 7 | $20 + 15 + 7 = 42$ | **42** | $20 + \max(15, 7) = 35$ |
| `-10` | 9 | 35 | $-10 + 9 + 35 = 34$ | 42 | $-10 + \max(9, 35) = 25$ |

The maximum path sum found is **42** (the path `15 -> 20 -> 7`).

---

### Step-by-Step Algorithm

1. **Initialize Global Best:** Set `global_max = float('-inf')` to correctly handle trees where all node values are negative.
2. **Define Helper `max_gain(node)`:**
   - **Base Case:** If `node` is `None`, return `0`.
   - **Compute Child Gains:**
     - `left_gain = max(0, max_gain(node.left))`
     - `right_gain = max(0, max_gain(node.right))`
   - **Evaluate Local Arch:**
     - Compute `arch_sum = node.val + left_gain + right_gain`.
     - Update `global_max = max(global_max, arch_sum)`.
   - **Return Extendable Branch:** Return `node.val + max(left_gain, right_gain)`.
3. **Execute & Return:** Invoke `max_gain(root)` and return `global_max`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Postorder DFS with Global Max" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def maxPathSum(self, root: TreeNode | None) -> int:
        global_max = float('-inf')

        def max_gain(node: TreeNode | None) -> int:
            nonlocal global_max
            if not node:
                return 0

            # Prune negative branches by taking max with 0
            left_gain = max(0, max_gain(node.left))
            right_gain = max(0, max_gain(node.right))

            # Arch sum treats current node as the highest convergence point
            arch_sum = node.val + left_gain + right_gain
            global_max = max(global_max, arch_sum)

            # Return only a single branch continuation to parent
            return node.val + max(left_gain, right_gain)

        max_gain(root)
        return int(global_max)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Object Attribute State Tracking">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def __init__(self):
        self.max_sum = float('-inf')

    def maxPathSum(self, root: TreeNode | None) -> int:
        self.max_sum = float('-inf')
        self._calculate_gain(root)
        return int(self.max_sum)

    def _calculate_gain(self, node: TreeNode | None) -> int:
        if not node:
            return 0

        left = max(0, self._calculate_gain(node.left))
        right = max(0, self._calculate_gain(node.right))

        self.max_sum = max(self.max_sum, node.val + left + right)

        return node.val + max(left, right)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Pairwise Path Search** | $O(n^2)$ | $O(n)$ | Checks simple paths across every pair of nodes. Excessively slow for medium and large trees. |
| **Postorder DFS** | $O(n)$ | $O(h)$ | Single postorder traversal computing arch sums while propagating single-branch gains upward. |

---

### Common Pitfall: Returning the Full Arch to Ancestors or Initializing with Zero

Returning `node.val + left_gain + right_gain` to the parent is invalid because a tree path cannot branch into two children and then continue upward to its parent (creating a disallowed Y-junction). Furthermore, initializing `global_max = 0` fails when the tree consists entirely of negative numbers (such as `[-3]`), where the correct answer must be `-3`.

---

### Concise Interview Takeaway

Distinguish between the local arch (`node.val + left + right`) evaluated for the global maximum and the extendable branch (`node.val + max(left, right)`) returned to the parent. Clamp negative branches to zero using `max(0, gain)`, and initialize the global maximum to negative infinity to support trees with exclusively negative values.
