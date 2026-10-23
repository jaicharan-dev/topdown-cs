---
id: 13-kth-smallest-element-in-a-bst
title: "230. Kth Smallest Element in a BST"
description: "Inorder visits a search tree in sorted order, so count and stop at k"
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trees</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Inorder Traversal</span>

> **Problem Statement:** Given a binary search tree and a number `k`, return the `k`-th smallest value in it, counting from one.

```text
Input:  root = [5, 3, 6, 2, 4, null, null, 1], k = 3
Output: 3
```

---

### Picture it

One fact does all the work here, and it comes straight from the traversals page: **an inorder walk of a search tree produces its values in sorted order.**

The walk goes left as far as it can, which is to the smallest value, then unwinds, taking each node and then its right subtree. The values come out smallest first.

So the `k`-th smallest value is simply the `k`-th value that walk produces. Nothing needs to be sorted and nothing needs collecting.

---

### How to think about it

Walk inorder with a counter.

Each time a value is produced, increase the count. When the count reaches `k`, that value is the answer. Everything after it is irrelevant, so stop walking.

Collecting all the values into a list and taking index `k - 1` also works and is perfectly readable. The reason to stop early is that `k` is often small compared with the tree: finding the third smallest value in a million-node tree should not require walking the other 999,997 nodes.

The iterative version with an explicit stack stops even more naturally, since the loop simply breaks. It also matches the structure used by BST Iterator, where the same left-spine stack is what makes `next` cheap.

**The follow-up** that interviewers usually add is: what if the tree is modified often and this question is asked a lot? Then store a subtree size on each node. With sizes, you can decide at each step whether the answer is in the left subtree, is this node, or is the `k`-th minus the left size in the right subtree, which turns the lookup into $O(h)$ rather than $O(k)$.

---

### Walking through the example

The tree is root `5`, with left child `3` and right child `6`. Node `3` has children `2` and `4`, and node `2` has a left child `1`. With `k = 3`:

1. **Go left** from `5` to `3`, from `3` to `2`, from `2` to `1`. Node `1` has no left child, so it is produced first. Count `1`.
2. **Back at node 2**, produced second. Count `2`.
3. **Back at node 3**, produced third. Count `3`, which equals `k`, so the answer is `3`.

The walk stops there. Nodes `4`, `5` and `6` are never visited.

---

### The code

```python
class Solution:
    def kthSmallest(self, root: TreeNode, k: int) -> int:
        stack = []
        node = root

        while node or stack:
            # run down the left spine, parking each node on the way
            while node:
                stack.append(node)
                node = node.left

            node = stack.pop()

            # this is the next smallest value
            k -= 1
            if k == 0:
                return node.val

            node = node.right

        return -1
```

---

### Time and space complexity

#### Time: $O(h + k)$

Reaching the smallest value costs one walk down the left spine, which is the height. After that, each further value costs a constant amount of work on average. So a small `k` is cheap no matter how large the tree is.

Collecting the whole tree first would be $O(n)$ regardless.

#### Space: $O(h)$

The stack holds the path from the root down to the current node, which is at most the height.

---

### Remember this

Inorder on a search tree yields sorted values, so the answer is the `k`-th value the walk produces. Count as you go and stop immediately, which keeps a small `k` cheap on a large tree. If the tree changes often and the question is asked repeatedly, store subtree sizes and navigate in $O(h)$ instead. $O(h + k)$ time, $O(h)$ space.
