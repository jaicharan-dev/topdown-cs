---
id: 14-construct-binary-tree-from-preorder-and-inorder
title: "105. Construct Binary Tree from Preorder and Inorder Traversal"
description: "Tree reconstruction using preorder root selection and inorder hash map splitting"
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Divide & Conquer</span>

> **Problem Statement:** Given two integer arrays `preorder` and `inorder` representing the preorder and inorder traversals of the same binary tree (where all values are guaranteed to be unique), reconstruct and return the binary tree.

```text
Input:  preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7]
Output: [3, 9, 20, null, null, 15, 7]
Explanation: The root is 3. In the inorder array, 9 is to the left of 3, so 9 forms the left subtree. The elements [15, 20, 7] form the right subtree.
```

---

### The Intuitive Mental Model

Think of this problem as decoding an organizational chart using two distinct reports:
1. **The Executive List (`preorder` = Root $\to$ Left $\to$ Right):**
   - The preorder traversal tells you **who the current root is**.
   - The very first unused element in preorder is always the root of the active subtree.
2. **The Territorial Seating Chart (`inorder` = Left $\to$ Root $\to$ Right):**
   - The inorder traversal defines the **boundary between subtrees**.
   - Once you locate the root value in the seating chart, every node to its left belongs to its left subtree, and every node to its right belongs to its right subtree.

```
Preorder: [ 3  |  9  |  20   15   7 ]  -> 3 is the Root!
            ^
Inorder:  [ 9  |  3  |  15   20   7 ]  -> 3 splits the territories!
          <--->   ^    <------------>
          Left   Root      Right
         Subtree          Subtree
```

Because preorder traversal visits the entire left subtree before touching any node in the right subtree, we must always recursively construct `root.left` before `root.right` as we advance through the preorder stream.

#### Brute Force: Linear Search and Array Slicing
The most naive recursive implementation searches `inorder` for the root value using `inorder.index(root_val)` (an $O(n)$ search) and physically slices copies of both sub-arrays (`inorder[:mid]`, `preorder[1:mid + 1]`). Because list slicing copies elements on every recursive step, this naive division degenerates to $O(n^2)$ time and wastes substantial memory.

#### Optimal Approach: Hash Map Lookups with Index Boundaries
To eliminate both linear scanning and array slicing:
1. Precompute a hash map of `inorder` values to their indices (`{val: idx}`) in a single $O(n)$ pass.
2. Maintain index boundary pointers `(left_bound, right_bound)` for the active slice of `inorder`, passing integers rather than copying arrays.
3. Advance through `preorder` using a forward iterator or index counter.
Every tree node is constructed in $O(1)$ time, yielding an optimal $O(n)$ total runtime.

#### Execution Walkthrough

Let us trace `preorder = [3, 9, 20, 15, 7]` and `inorder = [9, 3, 15, 20, 7]`.
The precomputed hash map is `{9: 0, 3: 1, 15: 2, 20: 3, 7: 4}`:

| Call | Subtree Root | Inorder Range `[left, right]` | Inorder Index `mid` | Left Child Range | Right Child Range |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `3` | `[0, 4]` | 1 | `[0, 0]` | `[2, 4]` |
| **2** | `9` | `[0, 0]` | 0 | None (empty) | None (empty) |
| **3** | `20` | `[2, 4]` | 3 | `[2, 2]` | `[4, 4]` |
| **4** | `15` | `[2, 2]` | 2 | None (empty) | None (empty) |
| **5** | `7` | `[4, 4]` | 4 | None (empty) | None (empty) |

---

### Step-by-Step Algorithm

1. **Precompute Hash Map:** Build `inorder_map = {val: idx for idx, val in enumerate(inorder)}` for instant $O(1)$ coordinate lookups.
2. **Initialize Preorder Cursor:** Create an iterator `preorder_iter = iter(preorder)` to yield nodes in preorder sequence.
3. **Define Recursive Builder `build(left_bound, right_bound)`:**
   - **Base Case:** If `left_bound > right_bound`, the subtree contains no nodes; return `None`.
   - **Root Extraction:** Fetch the next value: `root_val = next(preorder_iter)`.
   - **Instantiate Node:** Create `root = TreeNode(root_val)`.
   - **Find Boundary:** Retrieve `mid = inorder_map[root_val]`.
   - **Recurse Left and Right:**
     - Build left branch: `root.left = build(left_bound, mid - 1)`.
     - Build right branch: `root.right = build(mid + 1, right_bound)`.
   - **Return:** Return `root`.
4. **Trigger:** Return `build(0, len(inorder) - 1)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Hash Map with Range Pointers" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def buildTree(self, preorder: list[int], inorder: list[int]) -> TreeNode | None:
        # Map inorder values to their indices for O(1) lookups
        inorder_map = {val: idx for idx, val in enumerate(inorder)}
        preorder_iter = iter(preorder)

        def build(left_bound: int, right_bound: int) -> TreeNode | None:
            if left_bound > right_bound:
                return None

            # Next element in preorder sequence is always the current subtree root
            root_val = next(preorder_iter)
            root = TreeNode(root_val)

            # Split boundary in inorder array
            mid = inorder_map[root_val]

            # Left child must be constructed before right child
            root.left = build(left_bound, mid - 1)
            root.right = build(mid + 1, right_bound)

            return root

        return build(0, len(inorder) - 1)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative / Brute Force: Recursive Array Slicing">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def buildTree(self, preorder: list[int], inorder: list[int]) -> TreeNode | None:
        if not preorder or not inorder:
            return None

        # Root is always the first item in preorder
        root_val = preorder[0]
        root = TreeNode(root_val)

        # Linear scan for the split index
        mid = inorder.index(root_val)

        # Slice arrays for left and right subtrees
        root.left = self.buildTree(preorder[1:1 + mid], inorder[:mid])
        root.right = self.buildTree(preorder[1 + mid:], inorder[mid + 1:])

        return root
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Array Slicing** | $O(n^2)$ | $O(n^2)$ | Searches `inorder` via linear scans and copies array slices in each recursive frame. |
| **Hash Map Pointers** | $O(n)$ | $O(n)$ | Preindexes `inorder` in $O(n)$ time and uses range boundary pointers, constructing each node in $O(1)$. |

---

### Common Pitfall: Constructing Subtrees in Reverse Order

Because preorder sequence visits **Root $\to$ Left $\to$ Right**, advancing through `preorder` sequentially requires creating `root.left` before `root.right`. If you call `build(mid + 1, right_bound)` first, the iterator will hand left-subtree values to the right child, corrupting the entire tree layout.

---

### Concise Interview Takeaway

The `preorder` sequence supplies root values sequentially, while the `inorder` sequence partitions nodes into left and right subtrees. Map each value's inorder position into a hash map once to eliminate linear searches, and pass index boundaries `(left_bound, right_bound)` to avoid expensive array slicing. Always construct the left child before the right child.
