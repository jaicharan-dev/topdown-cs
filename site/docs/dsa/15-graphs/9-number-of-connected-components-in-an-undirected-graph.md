---
id: 9-number-of-connected-components-in-an-undirected-graph
title: "323. Number of Connected Components in an Undirected Graph"
description: "Start with everything apart, and every edge that joins two groups removes one"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Disjoint Set Union</span>

> **Problem Statement:** You are given `n` nodes and a list of undirected edges. Count how many separate connected pieces the graph has.

```text
Input:  n = 5, edges = [[0, 1], [1, 2], [3, 4]]
Output: 2
```

---

### Picture it

A search would work: sweep the nodes, and each unvisited one starts a new piece. That is Number of Provinces again.

This page uses the other tool, because the problem is the cleanest possible introduction to it.

Start by assuming nothing is connected: `n` nodes, `n` separate groups. Then read the edges one at a time. Each edge either joins two nodes already in the same group, which changes nothing, or joins two different groups, which merges them and **reduces the count by one**.

```text
5 nodes, so 5 groups
edge 0-1  merges two groups  -> 4
edge 1-2  merges two groups  -> 3
edge 3-4  merges two groups  -> 2
```

The count left at the end is the answer. No traversal at all.

---

### How to think about it

This is **disjoint set union**, and it needs two operations.

**Find** answers "which group is this node in?" Each node points at a parent, and following parents leads to the group's representative. A node that is its own parent is a representative.

**Union** joins two groups by pointing one representative at the other.

Done naively, the parent chains grow long and `find` becomes slow. Two refinements fix that, and both are one line:

**Path compression.** While following the chain, point each node directly at the representative, so later lookups are short.

**Union by size.** Always hang the smaller group under the larger, so chains stay shallow.

With both, each operation costs effectively constant time. The exact bound involves the inverse Ackermann function, which is below five for any input that fits in a computer, so it is fair to call it constant.

The key reason to reach for this rather than a search: it handles edges arriving **one at a time** without rebuilding anything, which is exactly what Redundant Connection needs next.

---

### Walking through the example

Five nodes, so five groups.

1. **Edge 0-1.** Nodes `0` and `1` are in different groups, so merge them. The count drops to `4`.
2. **Edge 1-2.** Node `1` is now in the group led by `0`, and node `2` is alone, so merge. The count drops to `3`.
3. **Edge 3-4.** Two separate groups merge. The count drops to `2`.

The answer is `2`: the piece holding `0, 1, 2` and the piece holding `3, 4`.

If a fourth edge `0-2` arrived, both nodes would already share a representative, so nothing would merge and the count would stay at `2`.

---

### The code

```python
class Solution:
    def countComponents(self, n: int, edges: list[list[int]]) -> int:
        parent = list(range(n))   # everyone starts in their own group
        size = [1] * n
        groups = n

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]   # path compression
                x = parent[x]
            return x

        for a, b in edges:
            ra, rb = find(a), find(b)

            if ra == rb:
                continue   # already together, so this edge changes nothing

            # hang the smaller group under the larger
            if size[ra] < size[rb]:
                ra, rb = rb, ra

            parent[rb] = ra
            size[ra] += size[rb]
            groups -= 1

        return groups
```

---

### Time and space complexity

#### Time: $O(V + E)$ for practical purposes

Setting up is $O(V)$, and each edge costs two `find` calls plus a possible merge. With compression and union by size those are effectively constant, so the total tracks the number of edges.

#### Space: $O(V)$

The parent and size arrays.

---

### Remember this

Start with every node in its own group and let each edge merge two, reducing the count only when the two were genuinely apart. Keep `find` fast with path compression and union by size, which together make the operations effectively constant. Unlike a search, this needs no traversal and copes with edges arriving over time. $O(V + E)$ time, $O(V)$ space.
