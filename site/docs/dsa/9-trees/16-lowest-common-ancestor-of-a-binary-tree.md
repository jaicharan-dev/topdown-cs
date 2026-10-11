---
id: 16-lowest-common-ancestor-of-a-binary-tree
title: "236. Lowest Common Ancestor of a Binary Tree"
description: "Bottom-up postorder propagation to find convergence point"
sidebar_position: 16
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Depth-First Search</span>

> **Problem Statement:** Given an arbitrary binary tree and two nodes `p` and `q`, find their Lowest Common Ancestor (LCA). The LCA is the lowest (deepest) node in the tree that has both `p` and `q` as descendants (where a node is permitted to be a descendant of itself).

```text
Input:  root = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p = 5, q = 1
Output: 3
Explanation: The LCA of nodes 5 and 1 is 3 because 5 is in 3's left subtree and 1 is in 3's right subtree.
```

---

### The Intuitive Mental Model

Imagine two lost hikers `p` and `q` separated in a mountain forest. Every base station (tree node) radios down to its left and right search parties: *"Have you located hiker p or hiker q?"*
- If a station receives positive signals from **both** its left and right search branches, that station is the exact junction where both trails converge: the **Lowest Common Ancestor**.
- If a signal is detected from only **one** side, that station forwards the signal upward to its parent.
- If a station is itself hiker `p` or hiker `q`, it immediately reports its own identity upward without needing to search deeper.

```
          [3]               p = 5, q = 1
        /     \
      [5]     [1]           Left search returns 5; Right search returns 1.
     /   \   /   \          Both branches report non-null!
    6     2 0     8         Therefore, [3] is the LCA!
```

Unlike a Binary Search Tree (where node values direct search left or right), a generic binary tree has no ordering invariants. We must use a bottom-up postorder traversal so subtrees can report their discoveries back to ancestors.

#### Brute Force: Storing Parent Pointers and Ancestor Sets
A brute force approach traverses the tree using BFS or DFS to build a child-to-parent lookup table. Once built, we collect all ancestors of `p` into a hash set by climbing up to the root, then climb upward from `q` until encountering the first ancestor already present in that set. While functional, this requires $O(n)$ time and $O(n)$ auxiliary dictionary storage.

#### Optimal Approach: Single-Pass Postorder DFS
A recursive postorder traversal returns either `p`, `q`, or `None`:
1. If the current node is `None`, `p`, or `q`, return `root` immediately.
2. Recursively search both subtrees: `left = LCA(root.left)` and `right = LCA(root.right)`.
3. If **both** `left` and `right` return non-null, the two targets are located in separate branches of `root`, meaning `root` is the LCA.
4. If only one branch returns a non-null node, propagate that non-null node upward.

This handles both split branches and ancestor-descendant relationships (where `p` is an ancestor of `q` or vice versa) in a single traversal pass.

#### Execution Walkthrough

Let us trace `root = [3, 5, 1, 6, 2, 0, 8]` with `p = 5` and `q = 1`:

| Call / Node | Left Subtree Result | Right Subtree Result | Both Non-Null? | Returned Value | Description |
| :---: | :---: | :---: | :---: | :---: | :--- |
| `5` | Not visited | Not visited | No | `5` | Matches `p`; returns `5` immediately |
| `1` | Not visited | Not visited | No | `1` | Matches `q`; returns `1` immediately |
| `3` (root) | `5` | `1` | **Yes** | **3** | Both children report matches: `3` is the LCA! |

---

### Step-by-Step Algorithm

1. **Check Base Cases:** If `root` is `None`, or if `root == p`, or if `root == q`, return `root`.
2. **Recurse Subtrees:**
   - Query left child: `left = lowestCommonAncestor(root.left, p, q)`.
   - Query right child: `right = lowestCommonAncestor(root.right, p, q)`.
3. **Evaluate Convergence:**
   - If both `left` and `right` are non-null: return `root` (targets diverge across both subtrees).
   - Otherwise: return `left if left else right` (bubble up whichever candidate was found).

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Postorder DFS" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def lowestCommonAncestor(self, root: TreeNode | None, p: TreeNode, q: TreeNode) -> TreeNode | None:
        # Base case: empty node, or current node is p or q
        if not root or root == p or root == q:
            return root

        # Bottom-up postorder search in both subtrees
        left = self.lowestCommonAncestor(root.left, p, q)
        right = self.lowestCommonAncestor(root.right, p, q)

        # If both subtrees returned a non-null match, root is the LCA
        if left and right:
            return root

        # Otherwise, bubble up whichever non-null candidate was found
        return left if left else right
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Parent Pointers and Ancestor Set">

```python
from collections import deque

class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def lowestCommonAncestor(self, root: TreeNode | None, p: TreeNode, q: TreeNode) -> TreeNode | None:
        if not root:
            return None

        # Map each node to its parent pointer
        parent: dict[TreeNode, TreeNode | None] = {root: None}
        queue: deque[TreeNode] = deque([root])

        # Traverse until both p and q are in the parent map
        while p not in parent or q not in parent:
            node = queue.popleft()
            if node.left:
                parent[node.left] = node
                queue.append(node.left)
            if node.right:
                parent[node.right] = node
                queue.append(node.right)

        # Collect all ancestors of p
        ancestors: set[TreeNode] = set()
        curr: TreeNode | None = p
        while curr:
            ancestors.add(curr)
            curr = parent[curr]

        # The first ancestor of q that exists in p's ancestor set is the LCA
        curr = q
        while curr not in ancestors:
            curr = parent[curr]

        return curr
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Parent Pointers & Set** | $O(n)$ | $O(n)$ | Iterative queue-based traversal. Allocates dictionaries and sets for parent tracking. |
| **Postorder DFS** | $O(n)$ | $O(h)$ | Uses call stack space bounded by tree height $h$. Requires no auxiliary collections. |

---

### Common Pitfall: Continuing Search After Finding Ancestor Target

When `p` is an ancestor of `q`, the recursive call returns `p` immediately as soon as it reaches `p`. Beginners often believe the algorithm must continue searching deeper inside `p`'s subtrees to confirm `q`'s existence. Because `q` is guaranteed to exist in the tree, finding `p` first means `p` is inherently the common ancestor of both, allowing the recursion to short-circuit safely.

---

### Concise Interview Takeaway

Use bottom-up postorder DFS: return `root` if it matches `p` or `q`. If both `left` and `right` recursive calls return non-null, `root` is the Lowest Common Ancestor. Otherwise, propagate whichever non-null child reference was returned. This traverses the tree in $O(n)$ time using $O(h)$ stack space.
