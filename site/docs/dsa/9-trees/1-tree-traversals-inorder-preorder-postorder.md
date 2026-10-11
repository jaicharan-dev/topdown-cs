---
id: 1-tree-traversals-inorder-preorder-postorder
title: "Tree Traversals: Inorder, Preorder, Postorder"
description: "The DFS traversal trinity: Pre-order, In-order, and Post-order"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Traversal</span>

> **Problem Statement:** Given the `root` of a binary tree, implement and contrast the three fundamental Depth-First Search (DFS) traversals: Pre-order, In-order, and Post-order.

```text
Input:  root = [1, null, 2, 3]
Output: Pre-order: [1, 2, 3], In-order: [1, 3, 2], Post-order: [3, 2, 1]
Explanation: Node 1 has no left child and right child 2. Node 2 has left child 3.
```

---

### The Intuitive Mental Model

In a linear data structure such as an array or linked list, elements sit sequentially, so traversal order is straightforward. In a binary tree, each node branches into two distinct subtrees (left and right). Depth-First Search (DFS) explores as deeply as possible along each branch before backtracking.

#### Brute Force: Iterative Traversal with Explicit State Machine
An iterative approach simulates call-frame mechanics using an explicit stack, tracking whether each node has been visited once, twice, or three times. While it avoids recursion, manually managing stack states for multiple traversals introduces unnecessary bookkeeping overhead.

#### Optimal Approach: Recursive Depth-First Search
Recursion provides the most natural model because a binary tree is inherently a recursive structure: every subtree is itself a binary tree.

All three classic DFS traversals visit the left subtree before the right subtree. The traversal name describes exactly when the current root node is processed relative to its children:
- **Pre-order (`Root -> Left -> Right`):** Process the root node before recursing into its children. Ideal for cloning, serialization, and prefix expressions.
- **In-order (`Left -> Root -> Right`):** Process the root node between recursing into the left child and right child. For a Binary Search Tree (BST), this visits keys in non-decreasing sorted order.
- **Post-order (`Left -> Right -> Root`):** Process the root node after completely exploring both subtrees. Ideal for bottom-up computations like calculating subtree sizes, heights, or deleting nodes.

#### Execution Walkthrough

Consider the binary tree:
```text
      1
     / \
    2   3
   / \
  4   5
```

Tracing the sequence of visits across all three traversals:

| Step | Current Action | Pre-order Accumulator | In-order Accumulator | Post-order Accumulator |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Visit root `1` | `[1]` | `[]` | `[]` |
| **2** | Recurse left to `2` | `[1, 2]` | `[]` | `[]` |
| **3** | Recurse left to `4` (leaf) | `[1, 2, 4]` | `[4]` | `[4]` |
| **4** | Backtrack to `2` | `[1, 2, 4]` | `[4, 2]` | `[4]` |
| **5** | Recurse right to `5` (leaf) | `[1, 2, 4, 5]` | `[4, 2, 5]` | `[4, 5]` |
| **6** | Finish subtree of `2` | `[1, 2, 4, 5]` | `[4, 2, 5]` | `[4, 5, 2]` |
| **7** | Backtrack to `1` | `[1, 2, 4, 5]` | `[4, 2, 5, 1]` | `[4, 5, 2]` |
| **8** | Recurse right to `3` (leaf) | `[1, 2, 4, 5, 3]` | `[4, 2, 5, 1, 3]` | `[4, 5, 2, 3]` |
| **9** | Finish root `1` | `[1, 2, 4, 5, 3]` | `[4, 2, 5, 1, 3]` | `[4, 5, 2, 3, 1]` |

---

### Step-by-Step Algorithm

1. **Define Recursive DFS:** Create a recursive helper `dfs(node)` that operates on the current `TreeNode`.
2. **Establish Base Case:** If `node is None`, return immediately to terminate the recursive branch.
3. **Sequence Node Processing:**
   - **Pre-order:** Append `node.val` to the result, then call `dfs(node.left)`, then call `dfs(node.right)`.
   - **In-order:** Call `dfs(node.left)`, append `node.val` to the result, then call `dfs(node.right)`.
   - **Post-order:** Call `dfs(node.left)`, call `dfs(node.right)`, then append `node.val` to the result.
4. **Initiate Traversal:** Invoke `dfs(root)` on the input tree and return the accumulated result array.

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
    def preorderTraversal(self, root: TreeNode | None) -> list[int]:
        res: list[int] = []
        def dfs(node: TreeNode | None) -> None:
            if not node:
                return
            res.append(node.val)
            dfs(node.left)
            dfs(node.right)
        dfs(root)
        return res

    def inorderTraversal(self, root: TreeNode | None) -> list[int]:
        res: list[int] = []
        def dfs(node: TreeNode | None) -> None:
            if not node:
                return
            dfs(node.left)
            res.append(node.val)
            dfs(node.right)
        dfs(root)
        return res

    def postorderTraversal(self, root: TreeNode | None) -> list[int]:
        res: list[int] = []
        def dfs(node: TreeNode | None) -> None:
            if not node:
                return
            dfs(node.left)
            dfs(node.right)
            res.append(node.val)
        dfs(root)
        return res
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative Stack">

```python
class Solution:
    def preorderTraversal(self, root: TreeNode | None) -> list[int]:
        if not root:
            return []
        res: list[int] = []
        stack: list[TreeNode] = [root]
        while stack:
            node = stack.pop()
            res.append(node.val)
            # Push right first so that left is popped and processed first
            if node.right:
                stack.append(node.right)
            if node.left:
                stack.append(node.left)
        return res

    def inorderTraversal(self, root: TreeNode | None) -> list[int]:
        res: list[int] = []
        stack: list[TreeNode] = []
        curr = root
        while curr or stack:
            while curr:
                stack.append(curr)
                curr = curr.left
            curr = stack.pop()
            res.append(curr.val)
            curr = curr.right
        return res

    def postorderTraversal(self, root: TreeNode | None) -> list[int]:
        if not root:
            return []
        res: list[int] = []
        stack: list[TreeNode] = [root]
        # Root -> Right -> Left traversal, then reversed to Left -> Right -> Root
        while stack:
            node = stack.pop()
            res.append(node.val)
            if node.left:
                stack.append(node.left)
            if node.right:
                stack.append(node.right)
        return res[::-1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive DFS** | $O(n)$ | $O(h)$ | Clean and intuitive. Space is bounded by call stack depth equal to tree height $h$ ($O(\log n)$ balanced, $O(n)$ worst-case). |
| **Iterative Stack** | $O(n)$ | $O(h)$ | Uses an explicit heap-allocated stack, avoiding call stack recursion limits on deeply skewed trees. |

---

### Common Pitfall: Forgetting Base Case Returns

A frequent mistake in tree recursion is omitting the null check (`if not node: return`) or attempting to access `node.left.val` without first verifying whether `node.left` exists. Always verify that `node` is non-null as the very first guard condition of your traversal function.

---

### Concise Interview Takeaway

The traversal order determines the placement of the root node relative to its children: Pre-order processes root first (`Root, Left, Right`), In-order visits root between subtrees (`Left, Root, Right`) and yields sorted elements for a BST, and Post-order processes root last (`Left, Right, Root`) for bottom-up tree evaluation. All three execute in $O(n)$ time and require $O(h)$ space where $h$ is the tree height.
