---
id: 18-bst-iterator
title: "173. Binary Search Tree Iterator"
description: "Lazy controlled in-order traversal with an explicit left-spine stack"
sidebar_position: 18
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Design / Iterator</span>

> **Problem Statement:** Implement the `BSTIterator` class that represents an in-order traversal iterator over a Binary Search Tree (BST): `BSTIterator(root)` initializes the iterator with the root of the BST, `hasNext()` returns `True` if there are still numbers to visit in the traversal, and `next()` returns the next smallest number in the BST. Both operations must run in average $O(1)$ time and use $O(h)$ memory, where $h$ is the height of the tree.

```text
Input:
["BSTIterator", "next", "next", "hasNext", "next", "hasNext", "next", "hasNext", "next", "hasNext"]
[[[7, 3, 15, null, null, 9, 20]], [], [], [], [], [], [], [], [], []]
Output:
[null, 3, 7, true, 9, true, 15, true, 20, false]
Explanation:
BSTIterator bSTIterator = new BSTIterator([7, 3, 15, null, null, 9, 20]);
bSTIterator.next();    // return 3
bSTIterator.next();    // return 7
bSTIterator.hasNext(); // return True
bSTIterator.next();    // return 9
bSTIterator.hasNext(); // return True
bSTIterator.next();    // return 15
bSTIterator.hasNext(); // return True
bSTIterator.next();    // return 20
bSTIterator.hasNext(); // return False
```

---

### The Intuitive Mental Model

Imagine streaming a video rather than downloading an entire 50 GB file upfront:
- If you were asked to iterate through a tree with 10 million nodes, storing all 10 million nodes in an array during initialization would consume $O(n)$ memory and waste enormous amounts of time before the first element could even be returned.
- A true iterator is **lazy**: it produces the next element on demand and retains only the bare minimum state required to resume.

In an in-order traversal (Left $\to$ Root $\to$ Right), the smallest element is always the deepest node along the leftmost branch. We simulate the recursive call stack manually using an explicit Python list:
1. In `__init__`, push the root and descend along its **left spine** until hitting `None`.
2. The node sitting on top of the stack is now guaranteed to be the current minimum element.
3. When `next()` is invoked:
   - Pop the top node `curr`.
   - If `curr` has a right child, push that right child and its entire left spine onto the stack.
   - Return `curr.val`.

```
Tree:                     Stack State Evolution:
        [7]               Initial:  push(7), push(3) -> Stack: [7, 3]
       /   \
     [3]   [15]           next() #1: pop 3 -> return 3. (3 has no right child)
           /  \                      Stack: [7]
         [9]  [20]
                          next() #2: pop 7 -> return 7.
                                     7 has right child 15 -> push(15), push(9)
                                     Stack: [15, 9]

                          next() #3: pop 9 -> return 9.
                                     Stack: [15]
```

At any point in time, the stack contains at most the nodes along a single path from root to leaf, strictly bounded by $O(h)$ memory.

#### Brute Force: Precomputing an Inorder Array
The brute force approach performs a complete inorder traversal during initialization, saving all values into a list `self.elements` and tracking an integer cursor `self.index`. While `next()` and `hasNext()` both execute in $O(1)$ time, initialization takes $O(n)$ time and $O(n)$ auxiliary space, failing the problem's strict $O(h)$ memory constraint.

#### Optimal Approach: Controlled Inorder Traversal via Left-Spine Stack
By maintaining an explicit stack of left spines, we achieve true lazy evaluation. Across the entire traversal of the tree, every single node is pushed onto the stack exactly once and popped from the stack exactly once. Over $n$ total calls to `next()`, the sum of all stack pushes and pops is exactly $2n$. Thus, the amortized cost per call is $(2n) / n = 2 = O(1)$ operations, satisfying both the $O(1)$ average time and $O(h)$ memory constraints.

#### Execution Walkthrough

Let us trace `root = [7, 3, 15, null, null, 9, 20]`:

| Operation | Stack Before (`bottom -> top`) | Popped Node | Push Action | Stack After | Return Value |
| :---: | :---: | :---: | :--- | :---: | :---: |
| `__init__` | `[]` | None | Push left spine of 7 (`[7, 3]`) | `[7, 3]` | `None` |
| `next()` | `[7, 3]` | `3` | No right child | `[7]` | `3` |
| `next()` | `[7]` | `7` | Push left spine of 15 (`[15, 9]`) | `[15, 9]` | `7` |
| `hasNext()` | `[15, 9]` | None | Stack is non-empty | `[15, 9]` | `True` |
| `next()` | `[15, 9]` | `9` | No right child | `[15]` | `9` |
| `next()` | `[15]` | `15` | Push left spine of 20 (`[20]`) | `[20]` | `15` |
| `next()` | `[20]` | `20` | No right child | `[]` | `20` |
| `hasNext()` | `[]` | None | Stack is empty | `[]` | `False` |

---

### Step-by-Step Algorithm

1. **`__init__(root)`:**
   - Initialize `self.stack = []`.
   - Call helper `self._push_left_spine(root)`.
2. **Helper `_push_left_spine(node)`:**
   - While `node` is not `None`: append `node` to `self.stack`, and advance `node = node.left`.
3. **`next()`:**
   - Pop the top node: `curr = self.stack.pop()`.
   - If `curr.right` exists: call `self._push_left_spine(curr.right)`.
   - Return `curr.val`.
4. **`hasNext()`:**
   - Return `len(self.stack) > 0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Controlled Stack Traversal" default>

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class BSTIterator:
    def __init__(self, root: TreeNode | None):
        self.stack: list[TreeNode] = []
        self._push_left_spine(root)

    def _push_left_spine(self, node: TreeNode | None) -> None:
        """Pushes a node and all of its recursive left descendants onto the stack."""
        while node:
            self.stack.append(node)
            node = node.left

    def next(self) -> int:
        """Returns the next smallest number in the BST."""
        node = self.stack.pop()
        # If the popped node has a right child, load that child's left spine
        if node.right:
            self._push_left_spine(node.right)
        return node.val

    def hasNext(self) -> bool:
        """Returns True if there are remaining nodes in the in-order sequence."""
        return len(self.stack) > 0
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Precomputed Array Traversal">

```python
class TreeNode:
    def __init__(self, val: int = 0, left: 'TreeNode | None' = None, right: 'TreeNode | None' = None):
        self.val = val
        self.left = left
        self.right = right

class BSTIterator:
    def __init__(self, root: TreeNode | None):
        self.elements: list[int] = []
        self.index = 0
        self._inorder(root)

    def _inorder(self, node: TreeNode | None) -> None:
        if not node:
            return
        self._inorder(node.left)
        self.elements.append(node.val)
        self._inorder(node.right)

    def next(self) -> int:
        val = self.elements[self.index]
        self.index += 1
        return val

    def hasNext(self) -> bool:
        return self.index < len(self.elements)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Precomputed Array** | $O(1)$ per call, $O(n)$ init | $O(n)$ | Flattens the entire tree during initialization. Exceeds the required $O(h)$ memory limit. |
| **Controlled Stack** | $O(1)$ amortized per call | $O(h)$ | Produces nodes lazily on demand. Stores at most one root-to-leaf path in memory. |

---

### Common Pitfall: Eager Evaluation and $O(n)$ Memory Traps

A frequent misstep is flattening the tree into a list inside `__init__`. While simple to implement, doing so violates the core requirements of an iterator by running in $O(n)$ startup time and using $O(n)$ memory instead of the bounded $O(h)$ stack space.

---

### Concise Interview Takeaway

Simulate lazy in-order traversal using an explicit stack of left spines. Popping the top node and pushing its right child's left spine guarantees $O(h)$ memory and amortized $O(1)$ time per `next()` call, because each tree node is pushed and popped exactly once over the entire iteration.
