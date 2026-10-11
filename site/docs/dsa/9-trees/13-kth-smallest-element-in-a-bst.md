---
id: 13-kth-smallest-element-in-a-bst
title: "230. Kth Smallest Element in a BST"
description: "Iterative inorder traversal with early termination"
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Inorder Traversal</span>

> **Problem Statement:** Given the root of a binary search tree (BST) and an integer `k`, return the `k`-th smallest value (1-indexed) among all the node values in the tree.

```text
Input:  root = [5, 3, 6, 2, 4, null, null, 1], k = 3
Output: 3
Explanation: The node values in ascending order are [1, 2, 3, 4, 5, 6]. The 3rd smallest value is 3.
```

---

### The Intuitive Mental Model

Imagine reading through a dictionary or an encyclopedia index. A Binary Search Tree is not an unsorted collection: it is an **implicitly sorted array**.
- In any valid BST, an **inorder traversal** (visiting Left subtree $\to$ Root $\to$ Right subtree) enumerates all elements in strictly ascending numerical order.
- To find the 3rd smallest word in a dictionary, you do not dump 100,000 words into a max-heap or priority queue; you simply read the first 3 entries from the front and stop.

By using an explicit stack to simulate inorder traversal, we dive straight down the left spine to the absolute minimum element in the tree. We pop elements one by one, decrementing `k`. The moment `k` reaches 0, the current node is our exact answer. We can stop immediately without touching the rest of the tree.

```
          [5]   (Find k = 3)
        /     \
      [3]     [6]
     /   \
   [2]   [4]
   /
 [1]

Step 1: Dive left -> Stack: [5, 3, 2, 1]
Step 2: Pop [1] -> k = 2 (1st smallest)
Step 3: Pop [2] -> k = 1 (2nd smallest)
Step 4: Pop [3] -> k = 0 (3rd smallest) -> Stop and return 3!
```

#### Brute Force: Full Traversal Array Collection
The brute force mental model conducts a full traversal of the tree, appends all node values to a list, and indexes `arr[k - 1]`. While conceptually simple, visiting all $n$ nodes wastes execution time and consumes $O(n)$ auxiliary memory, especially when $k \ll n$.

#### Optimal Approach: Iterative Inorder with Early Termination
Instead of collecting all nodes, we maintain an explicit call stack. We push nodes while descending left until reaching the leftmost leaf. We then pop the top element (the next smallest value in the tree), decrement $k$, and inspect whether $k == 0$. If $k$ has reached zero, we return that node's value immediately. Otherwise, we pivot to `curr.right` and resume descending left. This guarantees we touch at most $O(h + k)$ nodes.

For systems requiring frequent lookups alongside dynamic updates, each node can be augmented with a `left_subtree_size` field (an Order Statistic Tree), enabling $O(h)$ search without iterative popping.

#### Execution Walkthrough

Let us trace `root = [5, 3, 6, 2, 4, null, null, 1]` with `k = 3`:

| Step | Current Node | Stack (`bottom -> top`) | Action Taken | Remaining `k` | Output |
| :---: | :---: | :---: | :--- | :---: | :---: |
| **1** | `5` | `[5, 3, 2, 1]` | Dive left to minimum leaf `1` | 3 | None |
| **2** | `1` | `[5, 3, 2]` | Pop `1`, right is `None` | 2 | None |
| **3** | `2` | `[5, 3]` | Pop `2`, right is `None` | 1 | None |
| **4** | `3` | `[5]` | Pop `3`, `k` reaches 0! Return value | 0 | **3** |

---

### Step-by-Step Algorithm

1. **Initialize Containers:** Create an empty list `stack` to manage ancestor frames and set `curr = root`.
2. **Loop While Nodes Remain:** Continue while `stack` is non-empty or `curr` is not `None`:
   - **Dive Left:** While `curr` is not `None`, push `curr` onto `stack` and advance `curr = curr.left`.
   - **Pop Smallest Node:** Pop `curr = stack.pop()`.
   - **Decrement Rank:** Decrement `k -= 1`.
   - **Check Target:** If `k == 0`, return `curr.val`.
   - **Explore Right Branch:** Set `curr = curr.right`.
3. **Fallback:** Return `-1` if no valid node satisfies the rank constraint.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Inorder Traversal" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def kthSmallest(self, root: TreeNode | None, k: int) -> int:
        stack: list[TreeNode] = []
        curr = root

        while stack or curr:
            # 1. Dive deep left to reach the smallest unvisited element
            while curr:
                stack.append(curr)
                curr = curr.left

            # 2. Pop the next smallest node in ascending order
            curr = stack.pop()
            k -= 1

            # 3. Early termination: found the k-th smallest element
            if k == 0:
                return curr.val

            # 4. Turn to the right subtree
            curr = curr.right

        return -1
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Inorder Traversal">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def kthSmallest(self, root: TreeNode | None, k: int) -> int:
        result = -1
        count = 0

        def inorder(node: TreeNode | None) -> None:
            nonlocal result, count
            if not node or count >= k:
                return

            inorder(node.left)

            count += 1
            if count == k:
                result = node.val
                return

            inorder(node.right)

        inorder(root)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive Inorder** | $O(n)$ | $O(h)$ | Simple recursion that short-circuits via counter flags. Max call stack bounded by tree height $h$. |
| **Iterative Inorder** | $O(h + k)$ | $O(h)$ | Halts immediately at step $k$. Visits only the minimal set of nodes needed to find the target. |

---

### Common Pitfall: Converting to Unsorted Structures or Mismanaging 1-Indexing

Reaching for a heap or dumping the entire tree into an array ignores the foundational property of binary search trees, which already order elements naturally. Another common error is mishandling the 1-indexed definition of $k$: decrementing $k$ before testing equality with 0 ensures clean termination without off-by-one errors.

---

### Concise Interview Takeaway

An inorder traversal of a BST visits nodes in strictly increasing numerical order. Using an explicit stack lets you dive down the leftmost spine and pop items one by one. Decrement $k$ at each pop and return immediately when $k == 0$, achieving $O(h + k)$ time and $O(h)$ space without wasting cycles on the rest of the tree.
