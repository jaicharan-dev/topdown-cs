---
id: 17-flatten-binary-tree-to-linked-list
title: "114. Flatten Binary Tree to Linked List"
description: "In-place tree flattening via reverse preorder traversal and Morris predecessor grafting"
sidebar_position: 17
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">In-Place Pointer Manipulation</span>

> **Problem Statement:** Given the root of a binary tree, flatten the tree into a linked list in-place using the existing tree nodes. The resulting linked list should follow the tree's preorder traversal sequence, where every node's left child pointer is set to `None` and its right child pointer points to the next node in the sequence.

```text
Input:  root = [1, 2, 5, 3, 4, null, 6]
Output: [1, null, 2, null, 3, null, 4, null, 5, null, 6]
Explanation: The preorder sequence is 1 -> 2 -> 3 -> 4 -> 5 -> 6. Each node's left child becomes null and right child points to the next node.
```

---

### The Intuitive Mental Model

Preorder traversal visits nodes in the sequence: **Root $\to$ Left $\to$ Right**.
If you attempt to flatten the tree moving forward (such as setting `root.right = root.left`), you immediately overwrite and permanently lose the original `root.right` subtree.

To prevent this data loss, we can use two primary strategies:

```
Original Tree:            Flattened Chain:
      1                         1
    /   \                        \
   2     5         ===>           2
  / \     \                        \
 3   4     6                        3
                                     \
                                      4
                                       \
                                        5
                                         \
                                          6
```

#### Brute Force: Array Collection and Relinking
A straightforward approach performs a standard preorder traversal to collect references to all nodes in a list `[1, 2, 3, 4, 5, 6]`. A secondary loop then iterates through the array, updating `node[i].left = None` and `node[i].right = node[i + 1]`. While this runs in $O(n)$ time, storing all nodes in an auxiliary array consumes $O(n)$ extra memory and does not satisfy the requirement for true in-place restructuring.

#### Optimal Approach: Morris Predecessor Grafting
To achieve true $O(1)$ auxiliary space without recursion:
1. Walk down the tree with a pointer `curr`.
2. Whenever `curr` has a left child:
   - Find the rightmost node of that left subtree (the inorder predecessor).
   - Attach `curr.right` to that predecessor's `right` pointer.
   - Move the entire left subtree to `curr.right`, and set `curr.left = None`.
3. Advance `curr = curr.right`.

Alternatively, a reverse preorder DFS (**Right $\to$ Left $\to$ Root**) assembles the list backwards using a `prev` pointer in $O(h)$ recursion stack space.

#### Execution Walkthrough

Let us trace Morris Predecessor Grafting on `root = [1, 2, 5, 3, 4, null, 6]`:

| Step | `curr` Node | Has Left Child? | Predecessor Found | Action Taken | Next `curr` |
| :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `1` | Yes (`2`) | `4` (rightmost of `2`) | Connect `4.right = 5`, `1.right = 2`, `1.left = None` | `2` |
| **2** | `2` | Yes (`3`) | `3` (rightmost of `3`) | Connect `3.right = 4`, `2.right = 3`, `2.left = None` | `3` |
| **3** | `3` | No | None | Advance along right pointer | `4` |
| **4** | `4` | No | None | Advance along right pointer | `5` |
| **5** | `5` | No | None | Advance along right pointer | `6` |
| **6** | `6` | No | None | Advance along right pointer; traversal terminates | `None` |

---

### Step-by-Step Algorithm (Morris Grafting)

1. **Initialize Pointer:** Set `curr = root`.
2. **Iterate Down Right Spine:** While `curr` is not `None`:
   - **Check Left Subtree:** If `curr.left` is not `None`:
     - Locate the rightmost node of `curr.left`: set `pred = curr.left` and advance `while pred.right: pred = pred.right`.
     - Graft the existing right subtree: `pred.right = curr.right`.
     - Shift left branch to right: `curr.right = curr.left`.
     - Nullify left branch: `curr.left = None`.
   - **Advance:** Move forward via `curr = curr.right`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Morris Grafting (O(1) Space)" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def flatten(self, root: TreeNode | None) -> None:
        """
        Flatten binary tree in-place using Morris predecessor grafting.
        Do not return anything, modify root in-place instead.
        """
        curr = root

        while curr:
            if curr.left:
                # Find the rightmost node of the left subtree
                pred = curr.left
                while pred.right:
                    pred = pred.right

                # Splice original right subtree onto predecessor's right
                pred.right = curr.right
                # Move left subtree to the right
                curr.right = curr.left
                curr.left = None

            # Move down the right spine
            curr = curr.right
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Reverse Preorder DFS">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def flatten(self, root: TreeNode | None) -> None:
        """
        Flatten binary tree in-place using reverse preorder DFS.
        Do not return anything, modify root in-place instead.
        """
        prev: TreeNode | None = None

        def dfs(node: TreeNode | None) -> None:
            nonlocal prev
            if not node:
                return

            # Traverse in reverse preorder: Right -> Left -> Root
            dfs(node.right)
            dfs(node.left)

            # Stitch current node onto the front of the suffix chain
            node.right = prev
            node.left = None
            prev = node

        dfs(root)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Reverse Preorder DFS** | $O(n)$ | $O(h)$ | Builds the linked list from tail to head. Uses $O(h)$ recursion stack frames. |
| **Morris Grafting** | $O(n)$ | $O(1)$ | Traverses each edge at most twice while rewiring pointers in place with zero extra space. |

---

### Common Pitfall: Overwriting the Right Pointer During Forward Traversal

A frequent mistake is setting `root.right = root.left` before processing the original `root.right` subtree. Without saving or grafting the original right branch first, all descendants in that branch are disconnected and permanently lost from the tree.

---

### Concise Interview Takeaway

Forward preorder traversal overwrites right subtrees before they can be visited. To flatten the tree in true $O(1)$ space, use Morris predecessor grafting: attach the right subtree to the rightmost node of the left subtree, shift the left subtree to the right pointer, and set `curr.left = None`. Alternatively, reverse preorder DFS (Right $\to$ Left $\to$ Root) stitches the list backwards from tail to head in $O(h)$ space.
