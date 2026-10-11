---
id: 20-serialize-and-deserialize-binary-tree
title: "297. Serialize and Deserialize Binary Tree"
description: "Lossless tree stringification via preorder DFS with explicit null markers"
sidebar_position: 20
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Design / Serialization</span>

> **Problem Statement:** Design an algorithm to serialize a binary tree into a string representation and deserialize that string back into the original binary tree structure. There is no restriction on the serialization format as long as the tree can be reconstructed identically without data loss.

```text
Input:  root = [1, 2, 3, null, null, 4, 5]
Output: [1, 2, 3, null, null, 4, 5]
Explanation: The tree is encoded into a serialized string format and decoded back into the exact same tree structure.
```

---

### The Intuitive Mental Model

In classic tree theory, a single traversal sequence (such as preorder alone) cannot uniquely reconstruct a binary tree. Without knowing where branches terminate, the sequence `[1, 2]` could mean `2` is the left child of `1` with no right child, or the right child of `1` with no left child.

However, if you explicitly mark **empty child slots with a null delimiter** (such as `"N"` or `"#"`), all ambiguity vanishes. A preorder traversal (**Root $\to$ Left $\to$ Right**) with explicit null tokens becomes **100% uniquely invertible**.

```
Tree:                     Preorder DFS Token Stream:
        1                 1 -> 2 -> N -> N -> 3 -> 4 -> N -> N -> 5 -> N -> N
      /   \
     2     3              Serialized String:
          / \             "1,2,N,N,3,4,N,N,5,N,N"
         4   5
```

Because preorder traversal always processes the root before its subtrees:
- The first token in the stream is always the current subtree root.
- Subsequent tokens immediately construct its entire left subtree until all left branches terminate with `"N"`.
- The following tokens construct the right subtree.

Reconstructing the tree simply consumes tokens sequentially from an iterator.

#### Brute Force: Dual Preorder and Inorder Traversals
A naive approach records two separate traversals: preorder and inorder. While sufficient to reconstruct unique-value trees, this approach fails whenever duplicate node values exist in the tree. Furthermore, storing and parsing two separate strings doubles memory usage and complicates deserialization into an $O(n)$ hash-map-driven reconstruction.

#### Optimal Approach: Preorder DFS with Explicit Null Delimiters
Instead of managing multiple traversals:
1. **Serialize:** Walk the tree using preorder DFS. Record `str(node.val)` for valid nodes and `"N"` for `None` pointers. Join the tokens using commas.
2. **Deserialize:** Split the string on commas and wrap the list in an iterator `iter(tokens)`. A recursive function calls `next(iterator)`: if the token is `"N"`, it returns `None`; otherwise, it constructs `TreeNode(int(token))` and recursively sets its `left` and `right` children.

The iterator tracks position automatically in $O(1)$ operations per node without index manipulation.

#### Execution Walkthrough

Let us trace deserializing `"1,2,N,N,3,4,N,N,5,N,N"`:

| Step | Token Consumed | Node Created | Left Child Recursive Action | Right Child Recursive Action | Node Returned |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `"1"` | `TreeNode(1)` | Calls step 2 | Calls step 5 | `1` (Root) |
| **2** | `"2"` | `TreeNode(2)` | Step 3 (`"N"` $\to$ `None`) | Step 4 (`"N"` $\to$ `None`) | `2` |
| **3** | `"N"` | None | Terminal leaf | - | `None` |
| **4** | `"N"` | None | Terminal leaf | - | `None` |
| **5** | `"3"` | `TreeNode(3)` | Calls step 6 | Calls step 9 | `3` |
| **6** | `"4"` | `TreeNode(4)` | Step 7 (`"N"` $\to$ `None`) | Step 8 (`"N"` $\to$ `None`) | `4` |
| **7** | `"N"` | None | Terminal leaf | - | `None` |
| **8** | `"N"` | None | Terminal leaf | - | `None` |
| **9** | `"5"` | `TreeNode(5)` | Step 10 (`"N"` $\to$ `None`) | Step 11 (`"N"` $\to$ `None`) | `5` |
| **10** | `"N"` | None | Terminal leaf | - | `None` |
| **11** | `"N"` | None | Terminal leaf | - | `None` |

---

### Step-by-Step Algorithm

1. **Serialize Method:**
   - Initialize an empty list `tokens = []`.
   - Define recursive helper `dfs(node)`:
     - If `not node`: append `"N"` and return.
     - Append `str(node.val)`.
     - Recurse left: `dfs(node.left)`.
     - Recurse right: `dfs(node.right)`.
   - Trigger `dfs(root)` and return `",".join(tokens)`.
2. **Deserialize Method:**
   - Split tokens and wrap in an iterator: `token_iter = iter(data.split(","))`.
   - Define recursive helper `rebuild()`:
     - Retrieve next token: `val = next(token_iter)`.
     - If `val == "N"`: return `None`.
     - Instantiate node: `node = TreeNode(int(val))`.
     - Recursively construct children: `node.left = rebuild()`, `node.right = rebuild()`.
     - Return `node`.
   - Return `rebuild()`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Preorder DFS with Iterator" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Codec:
    def serialize(self, root: TreeNode | None) -> str:
        """Encodes a tree to a single comma-delimited string."""
        tokens: list[str] = []

        def dfs(node: TreeNode | None) -> None:
            if not node:
                tokens.append("N")
                return
            tokens.append(str(node.val))
            dfs(node.left)
            dfs(node.right)

        dfs(root)
        return ",".join(tokens)

    def deserialize(self, data: str) -> TreeNode | None:
        """Decodes encoded string back to original binary tree."""
        token_iter = iter(data.split(","))

        def rebuild() -> TreeNode | None:
            val = next(token_iter)
            if val == "N":
                return None

            node = TreeNode(int(val))
            node.left = rebuild()
            node.right = rebuild()
            return node

        return rebuild()
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Level-Order BFS">

```python
from collections import deque

class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class Codec:
    def serialize(self, root: TreeNode | None) -> str:
        """Encodes a tree to a single comma-delimited string using BFS."""
        if not root:
            return ""

        queue: deque[TreeNode | None] = deque([root])
        tokens: list[str] = []

        while queue:
            node = queue.popleft()
            if node:
                tokens.append(str(node.val))
                queue.append(node.left)
                queue.append(node.right)
            else:
                tokens.append("N")

        return ",".join(tokens)

    def deserialize(self, data: str) -> TreeNode | None:
        """Decodes encoded BFS string back to binary tree."""
        if not data:
            return None

        tokens = data.split(",")
        root = TreeNode(int(tokens[0]))
        queue: deque[TreeNode] = deque([root])
        index = 1

        while queue and index < len(tokens):
            node = queue.popleft()

            # Process left child
            if tokens[index] != "N":
                node.left = TreeNode(int(tokens[index]))
                queue.append(node.left)
            index += 1

            # Process right child
            if index < len(tokens) and tokens[index] != "N":
                node.right = TreeNode(int(tokens[index]))
                queue.append(node.right)
            index += 1

        return root
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Level-Order BFS** | $O(n)$ | $O(n)$ | Level-by-level queue encoding. Requires manual pointer tracking through tokens during decode. |
| **Preorder DFS** | $O(n)$ | $O(n)$ | Preorder traversal with explicit null delimiters. Uses an iterator for concise recursive decoding. |

---

### Common Pitfall: Assuming Values Are Unique or Mismanaging Null Delimiters

Attempting to deserialize without null delimiters makes tree reconstruction impossible because multiple distinct tree topologies produce identical preorder sequences. Furthermore, relying on preorder plus inorder traversals fails whenever nodes share duplicate values, whereas explicit null delimiters preserve arbitrary tree shapes regardless of node values.

---

### Concise Interview Takeaway

Preorder traversal with explicit null markers (`"N"`) uniquely defines a binary tree without requiring dual traversals or unique value constraints. Rebuilding the tree is achieved by consuming tokens sequentially with an iterator: set `node.left = rebuild()` followed immediately by `node.right = rebuild()`. This operates in $O(n)$ time and $O(n)$ memory.
