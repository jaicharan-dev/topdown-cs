---
id: 12-validate-binary-search-tree
title: "98. Validate Binary Search Tree"
description: "Recursive range validation with tightening upper and lower bounds"
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">BST Properties</span>

> **Problem Statement:** Given the root of a binary tree, determine whether it is a valid Binary Search Tree (BST). A binary tree is a valid BST if and only if for every node: the left subtree contains only nodes with values strictly less than the node's value, the right subtree contains only nodes with values strictly greater than the node's value, and both left and right subtrees must themselves be valid binary search trees.

```text
Input:  root = [5, 1, 6, null, null, 4, 7]
Output: false
Explanation: The root is 5. Its right child is 6, but 6's left child is 4, which is not greater than the ancestor 5.
```

---

### The Intuitive Mental Model

Think of each node as an heir subject to strict legal covenants inherited from **all** of its ancestors, not just its immediate parent:
- If the ancestor at the root is `5`, and your branch is on its right side, **every single descendant** in your entire subtree must have a value strictly greater than `5`.
- If your immediate parent is `6` and places you as its left child, your allowable window shrinks to strictly between `5` and `6` (`5 < val < 6`).
- If you have value `4`, your immediate parent `6` might think you look fine locally (`4 < 6`), but you flagrantly violate your ancestor `5`!

```
          5
        /   \
       1     6
            / \
          [4]  7   <-- Local check 4 < 6 < 7 passes!
                       BUT [4] is in 5's right subtree (must be > 5).
                       Tree is INVALID!
```

Checking only immediate parent-child relationships (`node.left.val < node.val < node.right.val`) is the single most common trap in BST questions.

#### Brute Force: Full Inorder Traversal Array Check
A property of any valid BST is that its inorder traversal yields a strictly increasing sequence. The brute force mental model traverses the entire tree inorder, records all node values into an array, and checks whether `arr[i] < arr[i + 1]` holds for every adjacent pair. While $O(n)$ in time, it spends $O(n)$ auxiliary space to store all values upfront, even if an early node violates the BST invariant.

#### Optimal Approach: Recursive Range Invariants
Instead of accumulating nodes into an array, we pass valid range bounds `(low, high)` down the recursion stack:
1. The root starts with unbounded boundaries: `(-inf, +inf)`.
2. When stepping into a **left** child, the current node value becomes the new ceiling: `(low, node.val)`.
3. When stepping into a **right** child, the current node value becomes the new floor: `(node.val, high)`.
4. At every node, we assert `low < node.val < high`. If violated, we fail immediately without exploring further.

#### Execution Walkthrough

Let us trace the invalid tree `root = [5, 1, 6, null, null, 4, 7]`:

| Step | Node | Valid Range `(low, high)` | In Range? | Action Taken | Subtree Valid? |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `5` (root) | `(-inf, +inf)` | **Yes** | Check left with `(-inf, 5)`, right with `(5, +inf)` | Pending |
| **2** | `1` (left of 5) | `(-inf, 5)` | **Yes** | Leaf node, left and right are `None` | `True` |
| **3** | `6` (right of 5) | `(5, +inf)` | **Yes** | Check left with `(5, 6)`, right with `(6, +inf)` | Pending |
| **4** | `4` (left of 6) | `(5, 6)` | **No** (`4 <= 5`) | Violates lower bound from root ancestor `5`! | `False` |

The recursion halts and returns `False` immediately.

---

### Step-by-Step Algorithm

1. **Define Helper Function `validate(node, low, high)`:**
   - **Base Case:** If `node` is `None`, return `True` (an empty subtree satisfies all bounds).
   - **Range Check:** If not `low < node.val < high`, return `False` (strict inequalities are required; duplicates violate BST rules).
   - **Recurse Subtrees:**
     - Left branch: `validate(node.left, low, node.val)`.
     - Right branch: `validate(node.right, node.val, high)`.
     - Return `True` only if both branches return `True`.
2. **Initial Call:** Start at the root with infinite bounds: `validate(root, float('-inf'), float('inf'))`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Recursive Range Invariants" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isValidBST(self, root: TreeNode | None) -> bool:
        def validate(node: TreeNode | None, low: float, high: float) -> bool:
            # An empty subtree is trivially valid
            if not node:
                return True

            # Node value must strictly lie within inherited (low, high) bounds
            if not (low < node.val < high):
                return False

            # Tighten ceiling for left child, tighten floor for right child
            return (validate(node.left, low, node.val) and 
                    validate(node.right, node.val, high))

        return validate(root, float('-inf'), float('inf'))
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative Inorder Traversal">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isValidBST(self, root: TreeNode | None) -> bool:
        stack: list[TreeNode] = []
        current = root
        prev_val = float('-inf')

        while stack or current:
            # Push all left nodes
            while current:
                stack.append(current)
                current = current.left

            current = stack.pop()

            # Inorder traversal of a valid BST must be strictly increasing
            if current.val <= prev_val:
                return False

            prev_val = current.val
            current = current.right

        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative Inorder** | $O(n)$ | $O(h)$ | Verifies strictly increasing values using an explicit stack. Stops immediately upon seeing an inversion. |
| **Recursive Range Invariants** | $O(n)$ | $O(h)$ | Tightens $(low, high)$ bounds on each frame. Stack memory is proportional to tree height $h$. |

---

### Common Pitfall: Local-Only Validation and Strict Inequality Violations

Checking only that `node.left.val < node.val < node.right.val` fails because ancestor constraints are inherited globally across deep subtrees. Furthermore, remember that standard BST definitions require strictly smaller left descendants and strictly larger right descendants. If a node has a child with the identical value (`node.val == child.val`), the tree is invalid.

---

### Concise Interview Takeaway

Local parent-child checks fail because ancestor constraints are inherited globally. Pass allowable bounds `(low, high)` down the call stack, tightening the upper bound on left turns and the lower bound on right turns. Alternatively, an iterative inorder traversal must yield strictly increasing values: if any popped node value is less than or equal to the previous value, return `False`.
