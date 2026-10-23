---
id: 20-serialize-and-deserialize-binary-tree
title: "297. Serialize and Deserialize Binary Tree"
description: "Write the empty children down too, and the shape rebuilds itself"
sidebar_position: 20
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Design / Serialization</span>

> **Problem Statement:** Turn a binary tree into a string, and turn that string back into the identical tree. Any format is allowed as long as nothing is lost.

```text
Input:  root = [1, 2, 3, null, null, 4, 5]
Output: the same tree, after a round trip through a string
```

---

### Picture it

Recall from Construct Binary Tree that a preorder traversal on its own is **not** enough to rebuild a tree. `[1, 2, 3]` could be a chain leaning left, a chain leaning right, or a root with two children. That is why that problem needed the inorder list as well: to say where each subtree ended.

But there is a second way to remove the ambiguity, and it is much simpler: **write down the empty spots too**.

```text
1 -> 2 -> 3 is ambiguous
1, 2, #, #, 3, #, # is not
```

Once every missing child is marked, the preorder sequence describes the shape exactly. A `#` says "this branch stops here", and the reader always knows when to come back up.

---

### How to think about it

**Writing.** Walk preorder. At each position, write the node's value, or a marker if the spot is empty, then write the left subtree followed by the right. Join everything with a separator such as a comma.

**Reading.** Walk the tokens front to back with a shared position, in exactly the same order they were written. Take the next token: if it is the marker, this spot is empty, so return nothing. Otherwise create a node, then build its left subtree, then its right.

The two walks must mirror each other precisely. Because both follow preorder, the reader always consumes the token that the writer produced for the position it is currently filling. The recursion keeps the two in step without any bracket counting or index arithmetic.

Choose a marker that cannot be confused with a value. Values here can be negative, so a `#` is safer than something numeric.

**The alternative format** is level order with markers, which is the layout LeetCode uses when it prints trees. It is equally valid and a little more readable, at the cost of a queue on both sides. Preorder is shorter to write and easier to get right, because the recursion mirrors the structure of the tree itself.

---

### Walking through the example

The tree is root `1`, with children `2` and `3`, and node `3` has children `4` and `5`.

**Writing**, in preorder with markers:

```text
1, 2, #, #, 3, 4, #, #, 5, #, #
```

Node `2` is a leaf, so it is followed by two markers. Node `3` produces its value, then the whole of node `4` with its two markers, then node `5` likewise.

**Reading** the same tokens:

1. `1` creates the root, which then asks for its left subtree.
2. `2` creates a node. Its left asks next and gets `#`, so nothing. Its right gets `#` too, so node `2` is finished as a leaf.
3. Back at the root, its right subtree asks and gets `3`.
4. Node `3`'s left gets `4`, which consumes two markers and finishes.
5. Node `3`'s right gets `5`, which consumes two more.

The tokens run out exactly as the tree completes.

---

### The code

```python
class Codec:
    def serialize(self, root: TreeNode) -> str:
        parts = []

        def write(node):
            if not node:
                parts.append("#")   # the empty spots are what remove ambiguity
                return

            parts.append(str(node.val))
            write(node.left)
            write(node.right)

        write(root)
        return ",".join(parts)

    def deserialize(self, data: str) -> TreeNode:
        tokens = iter(data.split(","))

        def read():
            token = next(tokens)

            if token == "#":
                return None

            node = TreeNode(int(token))
            node.left = read()    # same order the writer used
            node.right = read()
            return node

        return read()
```

Using an iterator over the tokens keeps the shared position implicit, so no index variable has to be threaded through the recursion.

---

### Time and space complexity

#### Time: $O(n)$

Each node produces one token and each empty spot produces one marker, and a tree with `n` nodes has exactly `n + 1` empty spots. Reading consumes each token once.

#### Space: $O(n)$

The string itself, plus $O(h)$ of recursion stack on both sides.

---

### Remember this

A preorder sequence alone cannot describe a shape, but preorder **with markers for the empty spots** can, which is why this needs one traversal where reconstruction from traversals needed two. Write value, left, right; read in exactly the same order with a shared position. Pick a marker that no value could be mistaken for. $O(n)$ time and space.
