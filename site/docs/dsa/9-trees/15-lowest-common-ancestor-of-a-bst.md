---
id: 15-lowest-common-ancestor-of-a-bst
title: "235. Lowest Common Ancestor of a BST"
description: "BST value comparison to find the divergence split point"
sidebar_position: 15
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BST Properties</span>

> **Problem Statement:** Given a binary search tree (BST) and two nodes `p` and `q`, find the Lowest Common Ancestor (LCA) node of `p` and `q`. The LCA is defined as the lowest (deepest) node in the tree that has both `p` and `q` as descendants (where a node is permitted to be a descendant of itself).

```text
Input:  root = [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p = 2, q = 8
Output: 6
Explanation: The LCA of nodes 2 and 8 is 6 because 2 is in the left subtree and 8 is in the right subtree of 6.
```

---

### The Intuitive Mental Model

Imagine a highway fork where two road-trippers are driving toward destinations `p` and `q`:
- If both destinations lie to the west (both `p.val` and `q.val` are strictly smaller than the current junction value), both drivers must turn **left** together.
- If both destinations lie to the east (both `p.val` and `q.val` are strictly greater than the current junction value), both drivers must turn **right** together.
- The very first junction where their paths **diverge** (one branches left while the other branches right, or one driver reaches their destination) is the **Lowest Common Ancestor**. Once their paths split into separate subtrees, they can never cross paths at a deeper node.

```
            [6]          p = 2, q = 8
          /     \
        [2]     [8]      At root 6: p.val (2) < 6 and q.val (8) > 6.
       /   \   /   \     The paths diverge!
      0     4 7     9    LCA is 6!
```

#### Brute Force: Storing Ancestor Paths
A brute force mental model records the path from the root to `p` in a list and the path from the root to `q` in a second list. By scanning both paths from the beginning, the last common node before the sequences differ is the LCA. While correct, this consumes $O(h)$ auxiliary memory for arrays and performs multiple traversals.

#### Optimal Approach: Iterative Divergence Walk
Because the tree is a Binary Search Tree, we do not need to record paths or search both subtrees simultaneously. At any node `curr`:
1. If both `p.val < curr.val` and `q.val < curr.val`, both targets lie strictly in the left subtree; step left (`curr = curr.left`).
2. If both `p.val > curr.val` and `q.val > curr.val`, both targets lie strictly in the right subtree; step right (`curr = curr.right`).
3. Otherwise, the paths diverge (or `curr` equals `p` or `q`). `curr` is the split point, so return it immediately.

This search visits only a single branch, completing in $O(h)$ time with $O(1)$ auxiliary memory.

#### Execution Walkthrough

Let us trace `root = [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]` with `p = 2` and `q = 4`:

| Step | Current Node | Compare `p.val (2)` vs `curr.val` | Compare `q.val (4)` vs `curr.val` | Condition Satisfied | Next Action |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `6` | $2 < 6$ | $4 < 6$ | Both smaller than `6` | Step left: `curr = 2` |
| **2** | `2` | $2 == 2$ | $4 > 2$ | Split / Match: `curr == p` | LCA found! Return `2` |

---

### Step-by-Step Algorithm

1. **Initialize Pointer:** Set `curr = root`.
2. **Traverse Tree:** While `curr` is not `None`:
   - **Both on Left:** If `p.val < curr.val` and `q.val < curr.val`, advance `curr = curr.left`.
   - **Both on Right:** If `p.val > curr.val` and `q.val > curr.val`, advance `curr = curr.right`.
   - **Divergence Detected:** Otherwise, `curr` is the split point (one node is left, one is right, or `curr` matches `p` or `q`). Return `curr`.
3. **Fallback:** Return `root` if traversal concludes without finding another match.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Divergence Walk" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def lowestCommonAncestor(self, root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
        curr = root

        while curr:
            # Both targets lie in the left subtree
            if p.val < curr.val and q.val < curr.val:
                curr = curr.left
            # Both targets lie in the right subtree
            elif p.val > curr.val and q.val > curr.val:
                curr = curr.right
            else:
                # Split point or curr matches p or q
                return curr

        return root
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Divergence Walk">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def lowestCommonAncestor(self, root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
        # Both targets lie in the left subtree
        if p.val < root.val and q.val < root.val:
            return self.lowestCommonAncestor(root.left, p, q)
        
        # Both targets lie in the right subtree
        if p.val > root.val and q.val > root.val:
            return self.lowestCommonAncestor(root.right, p, q)

        # Split point reached
        return root
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Path Comparison** | $O(h)$ | $O(h)$ | Finds root-to-node paths for `p` and `q` into lists, then compares prefixes. Requires extra list memory. |
| **Iterative Divergence Walk** | $O(h)$ | $O(1)$ | Follows BST order decisions directly to the split point with zero call stack overhead. |

---

### Common Pitfall: Treating the BST as a Generic Binary Tree

Searching both children recursively as you would in an arbitrary binary tree wastes time. Because BST node values are strictly partitioned, the LCA is guaranteed to be the highest node where `p` and `q` fall into different branches. We never need to inspect both subtrees simultaneously.

---

### Concise Interview Takeaway

In a BST, the LCA is the first node where `p` and `q` diverge into opposite subtrees (or where one target equals the node itself). Steer left if both target values are smaller than the current node, steer right if both are larger, and return the current node immediately once they diverge. This runs in $O(h)$ time with $O(1)$ auxiliary space.
