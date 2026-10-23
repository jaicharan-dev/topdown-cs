---
id: 10-redundant-connection
title: "684. Redundant Connection"
description: "The edge that joins two nodes already connected is the one closing the cycle"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Disjoint Set Union</span>

> **Problem Statement:** A tree has had one extra edge added, creating exactly one cycle. Given the edges, return the one that can be removed to leave a tree again. If several would work, return the one appearing last in the input.

```text
Input:  edges = [[1, 2], [1, 3], [2, 3]]
Output: [2, 3]
```

---

### Picture it

The previous problem built groups up edge by edge, and one case was dismissed as uninteresting: an edge whose two nodes were **already in the same group**.

That case is this entire problem.

If two nodes are already connected, a path between them exists. Adding a direct edge creates a second route, and two routes between the same pair of nodes is precisely a cycle. So the redundant edge is the first one that joins two nodes already together.

```text
edge 1-2  separate groups, merge them
edge 1-3  separate groups, merge them
edge 2-3  already connected, so this closes the cycle
```

---

### How to think about it

Process the edges in the order given, maintaining the same disjoint set union structure.

For each edge, find the representative of both ends:

- **Different representatives?** The edge is genuinely connecting two pieces, so merge them and carry on.
- **The same?** This edge closes a cycle, so return it.

The "last in the input" requirement is satisfied automatically, which is worth seeing clearly. The problem guarantees exactly one extra edge, so exactly one edge is redundant, and scanning in order finds it at its own position. There is no need to collect candidates and pick the last.

Why this beats searching for the cycle directly: a depth-first search can find a cycle, but then you still have to work out which of its edges came last in the input, which means extra bookkeeping. Here the answer falls out of the first failed merge.

The path compression and union by size refinements carry over unchanged.

---

### Walking through the example

Three nodes, each in its own group.

1. **Edge `[1, 2]`.** Nodes `1` and `2` have different representatives, so merge them. The group is now `1, 2`.
2. **Edge `[1, 3]`.** Different representatives, so merge. The group is now `1, 2, 3`.
3. **Edge `[2, 3]`.** Both nodes are in that single group, so they already have a route between them, through node `1`. This edge creates a second route, so return `[2, 3]`.

That matches the expected answer, and removing it leaves the path `2 - 1 - 3`, which is a tree.

---

### The code

```python
class Solution:
    def findRedundantConnection(self, edges: list[list[int]]) -> list[int]:
        parent = list(range(len(edges) + 1))   # nodes are labelled from 1
        size = [1] * (len(edges) + 1)

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]   # path compression
                x = parent[x]
            return x

        for a, b in edges:
            ra, rb = find(a), find(b)

            # already connected, so this edge closes the cycle
            if ra == rb:
                return [a, b]

            if size[ra] < size[rb]:
                ra, rb = rb, ra

            parent[rb] = ra
            size[ra] += size[rb]

        return []
```

The arrays are sized one larger than the number of edges because the nodes are numbered from `1` rather than `0`, which is an easy off-by-one to walk into.

---

### Time and space complexity

#### Time: $O(n)$ for practical purposes

One pass over the edges, with two `find` calls each. Compression and union by size make those effectively constant.

#### Space: $O(n)$

The parent and size arrays.

---

### Remember this

An edge between two nodes that are already connected creates a second route between them, which is a cycle, so the answer is the first edge whose two ends share a representative. Processing in input order satisfies the "last one" requirement for free, since exactly one edge is redundant. This is the case the connected-components problem skipped over. $O(n)$ time.
