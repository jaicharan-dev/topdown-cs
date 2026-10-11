---
id: 6-same-tree
title: "100. Same Tree"
description: "Synchronized dual-tree preorder DFS checking structure and values"
sidebar_position: 6
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / Preorder</span>

> **Problem Statement:** Given the roots of two binary trees `p` and `q`, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.

```text
Input:  p = [1, 2, 3], q = [1, 2, 3]
Output: true
Explanation: Both trees have root 1 with left child 2 and right child 3, possessing identical topology and values.
```

---

### The Intuitive Mental Model

Comparing whether two binary trees are identical requires traversing both trees in lockstep. At every corresponding position across the two trees, both structural topology and node data must match exactly.

#### Brute Force: Serializing Trees to Strings
A naive approach converts both trees into serialized string representations (such as Pre-order traversal strings with null placeholders) and compares the resulting strings for equality. While conceptually simple, string serialization incurs substantial string construction and parsing overhead, allocating unnecessary intermediate string and list memory.

#### Optimal Approach: Synchronized Dual-Tree DFS
A lockstep recursive traversal directly examines corresponding node pairs `(p, q)`:
1. **Both Nodes Empty (`not p and not q`):** Both subtrees terminate at the same position, which is a structural match (`True`).
2. **One Node Empty (`not p or not q`):** One tree branches where the other does not, violating structural identity (`False`).
3. **Value Mismatch (`p.val != q.val`):** Structures match, but data differs (`False`).
4. **Matching Nodes:** Recurse concurrently on both left subtrees and right subtrees:
   $$\text{isSameTree}(p.left, q.left) \land \text{isSameTree}(p.right, q.right)$$

#### Execution Walkthrough

Consider evaluating `p = [1, 2, 1]` and `q = [1, 1, 2]`:

| Step | Pair Evaluated (`p`, `q`) | Left Subtree Status | Right Subtree Status | Comparison / Condition | Result |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `(1, 1)` | Nodes exist | Nodes exist | `1 == 1` (Values match) | Recurse on children |
| **2** | `(2, 1)` | Leaves | Leaves | `2 != 1` (Value mismatch!) | `False` (Short-circuit) |

Because the left children have mismatched values (`2 != 1`), the evaluation terminates early and returns `False` without inspecting the right subtree.

---

### Step-by-Step Algorithm

1. **Check Base Cases:**
   - If both `p` and `q` are `None`, return `True` (both subtrees are empty).
   - If one of `p` or `q` is `None` while the other exists, return `False` (structural mismatch).
   - If `p.val != q.val`, return `False` (value mismatch).
2. **Recurse on Subtrees:** Recursively call `self.isSameTree(p.left, q.left)` and `self.isSameTree(p.right, q.right)`.
3. **Aggregate Result:** Return `True` only if both recursive calls return `True`.

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
    def isSameTree(self, p: TreeNode | None, q: TreeNode | None) -> bool:
        # Both subtrees are empty
        if not p and not q:
            return True

        # Structural asymmetry or value mismatch
        if not p or not q or p.val != q.val:
            return False

        # Recurse on both child pairs simultaneously
        return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative BFS (Queue)">

```python
from collections import deque

class Solution:
    def isSameTree(self, p: TreeNode | None, q: TreeNode | None) -> bool:
        queue: deque[tuple[TreeNode | None, TreeNode | None]] = deque([(p, q)])

        while queue:
            node_p, node_q = queue.popleft()

            if not node_p and not node_q:
                continue
            if not node_p or not node_q or node_p.val != node_q.val:
                return False

            queue.append((node_p.left, node_q.left))
            queue.append((node_p.right, node_q.right))

        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive DFS** | $O(\min(m, n))$ | $O(\min(h_p, h_q))$ | Compares corresponding nodes simultaneously. Early exits upon the first discrepancy. Space is bounded by recursion depth. |
| **Iterative BFS** | $O(\min(m, n))$ | $O(\min(w_p, w_q))$ | Traverses tree levels in tandem using a queue, avoiding call stack recursion limits for deep trees. |

---

### Common Pitfall: Checking Values Before Verifying Null Pointers

Attempting to check `p.val == q.val` before confirming that both `p` and `q` are non-null will raise an `AttributeError: 'NoneType' object has no attribute 'val'`. You must always handle the base cases where either or both nodes are `None` before referencing `.val`.

---

### Concise Interview Takeaway

Traverse both trees in lockstep. Return `True` if both nodes are `None`, `False` if one node is `None` or their values differ, and recurse on both left and right child pairs with logical `and`. The search short-circuits on the first discovered mismatch, running in $O(\min(m, n))$ time and $O(\min(h_p, h_q))$ stack space.
