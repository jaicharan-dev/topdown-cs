---
id: 9-number-of-connected-components-in-an-undirected-graph
title: "323. Number of Connected Components in an Undirected Graph"
description: "Count connected components in an undirected edge list using Disjoint Set Union or DFS"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Disjoint Set Union</span>

> **Problem Statement:** You have a graph of `n` nodes labeled from `0` to `n - 1`. You are given an integer `n` and an array `edges` where `edges[i] = [a, b]` indicates that there is an undirected edge between `a` and `b` in the graph. Return the total number of connected components in the graph.

```text
Input:  n = 5, edges = [[0, 1], [1, 2], [3, 4]]
Output: 2
Explanation: Nodes 0, 1, and 2 form one connected component, while nodes 3 and 4 form a second component.
```

---

### The Intuitive Mental Model

Imagine a collection of islands in an archipelago where every island begins isolated from the rest. Each island initially represents its own autonomous component.

#### Brute Force: Graph Traversal (DFS / BFS)
The conventional way to count islands is to construct an explicit adjacency list and visit every node. We iterate from node $0$ to $n - 1$: whenever we encounter an unvisited node, we know we have stumbled upon an undiscovered component. We increment our component counter by 1 and launch a DFS or BFS traversal to mark all nodes reachable from that vertex as visited. While this takes linear $O(V + E)$ time, it requires pre-allocating an adjacency list with $2E$ entries and maintaining a traversal stack.

#### Optimal Approach: Disjoint Set Union (Union-Find)
Instead of building a full graph, we can process the edges one by one in place using Disjoint Set Union (DSU):
- **Initial State:** Before evaluating any edges, each node is its own representative root. We start with exactly $n$ independent components.
- **Processing Connections:** For each edge `[u, v]`, we find the root representative for both endpoints: `root_u = find(u)` and `root_v = find(v)`.
- **Merging Groups:** If `root_u != root_v`, the two nodes previously belonged to separate components. Unifying them merges the two components into a single set, allowing us to decrement our active component counter by 1.
- **Cycle Detection:** If `root_u == root_v`, the two nodes were already connected. This edge is redundant and the component count remains unchanged.
- **Tree Flattening:** By applying path compression during `find` and union by rank during `union`, the tree height stays nearly flat, delivering virtually constant $O(\alpha(n))$ time per edge.

#### Execution Walkthrough

Let us trace $n = 5$ with `edges = [[0, 1], [1, 2], [3, 4]]`:

| Step | Edge `[u, v]` | Root $u$ | Root $v$ | Same Component? | Action Taken | Remaining Components |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **Initial** | - | - | - | - | Nodes `{0}`, `{1}`, `{2}`, `{3}`, `{4}` are disjoint | 5 |
| **1** | `[0, 1]` | 0 | 1 | No | Union roots 0 and 1; decrement count | 4 |
| **2** | `[1, 2]` | 0 | 2 | No | Union roots 0 and 2; decrement count | 3 |
| **3** | `[3, 4]` | 3 | 4 | No | Union roots 3 and 4; decrement count | 2 |

---

### Step-by-Step Algorithm

1. **Initialize State:** Create a `parent` array where `parent[i] = i` for all $i \in [0, n - 1]$, an array `rank = [1] * n`, and set `components = n`.
2. **Implement Find with Path Compression:** Function `find(node)` looks up the root of the component. If `parent[node] != node`, recursively point `parent[node] = find(parent[node])` to compress the path directly to the ultimate root.
3. **Implement Union by Rank:** Function `union(u, v)` computes `root_u = find(u)` and `root_v = find(v)`.
   - If `root_u == root_v`, return `False` as they already belong to the same component.
   - If `rank[root_u] > rank[root_v]`, point `parent[root_v] = root_u`.
   - Elif `rank[root_u] < rank[root_v]`, point `parent[root_u] = root_v`.
   - Otherwise, point `parent[root_v] = root_u` and increment `rank[root_u] += 1`.
   - Return `True`.
4. **Iterate Edges:** For each edge `[u, v]` in `edges`, call `union(u, v)`. If it returns `True`, decrement `components` by 1.
5. **Return Result:** Return `components`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Disjoint Set Union" default>

```python
class Solution:
    def countComponents(self, n: int, edges: list[list[int]]) -> int:
        parent = list(range(n))
        rank = [1] * n
        components = n

        def find(node: int) -> int:
            # Path compression: point node directly to the tree's ultimate root
            if parent[node] != node:
                parent[node] = find(parent[node])
            return parent[node]

        def union(u: int, v: int) -> bool:
            root_u = find(u)
            root_v = find(v)

            # Already in the same connected component
            if root_u == root_v:
                return False

            # Union by rank: attach shorter tree under taller tree
            if rank[root_u] > rank[root_v]:
                parent[root_v] = root_u
            elif rank[root_u] < rank[root_v]:
                parent[root_u] = root_v
            else:
                parent[root_v] = root_u
                rank[root_u] += 1

            return True

        # Process every edge
        for u, v in edges:
            if union(u, v):
                components -= 1

        return components
```

  </TabItem>
  <TabItem value="dfs" label="Alternative: Adjacency List Traversal (DFS)">

```python
class Solution:
    def countComponents(self, n: int, edges: list[list[int]]) -> int:
        adj: list[list[int]] = [[] for _ in range(n)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)

        visited = [False] * n
        components = 0

        def dfs(node: int) -> None:
            visited[node] = True
            for neighbor in adj[node]:
                if not visited[neighbor]:
                    dfs(neighbor)

        # Explore all unvisited vertices
        for i in range(n):
            if not visited[i]:
                components += 1
                dfs(i)

        return components
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Disjoint Set Union** | $O(V + E \cdot \alpha(V))$ | $O(V)$ | Processes edge list directly without building an adjacency list. Path compression and rank union yield near-linear runtime. |
| **Adjacency List (DFS / BFS)** | $O(V + E)$ | $O(V + E)$ | Requires building an explicit adjacency graph requiring $O(V + E)$ auxiliary memory, but runs in strict linear time. |

---

### Common Pitfall: Forgetting Path Compression or Rank Balancing

Omitting path compression and union by rank allows the DSU trees to degenerate into linear linked lists of height $O(V)$. Under that worst-case shape, every `find` query degrades to $O(V)$, causing the overall runtime across $E$ edges to balloon to $O(V \cdot E)$. Adding one line for path compression (`parent[node] = find(parent[node])`) ensures virtually flat trees and near-constant amortized time.

---

### Concise Interview Takeaway

Start with $n$ components and decrement the count upon each successful union of previously separated trees. Equipped with path compression and union by rank, Disjoint Set Union runs in near-linear $O(V + E \cdot \alpha(V))$ time without needing to allocate an explicit adjacency graph.
