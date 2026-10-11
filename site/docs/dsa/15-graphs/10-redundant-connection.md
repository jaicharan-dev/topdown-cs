---
id: 10-redundant-connection
title: "684. Redundant Connection"
description: "Find cycle-inducing edge in an undirected graph using Disjoint Set Union"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Disjoint Set Union</span>

> **Problem Statement:** In this problem, a tree is an undirected graph that is connected and has no cycles. You are given a graph that started as a tree with `n` nodes labeled from 1 to `n`, with one additional edge added. The added edge creates a cycle. The edges are given as an array `edges` of length `n` where `edges[i] = [u, v]`. Return an edge that can be removed so that the resulting graph is a tree of `n` nodes. If there are multiple answers, return the answer that occurs last in the input.

```text
Input:  edges = [[1, 2], [1, 3], [2, 3]]
Output: [2, 3]
Explanation: Removing edge [2, 3] leaves edges [1, 2] and [1, 3], forming a valid tree with 3 nodes.
```

---

### The Intuitive Mental Model

A valid tree with $n$ nodes has **exactly $n - 1$ edges** and **zero cycles**. In this problem, we are provided with exactly $n$ edges. That means exactly one extra edge was introduced, connecting two already-connected nodes and creating a closed cycle.

#### Brute Force: Iterative Edge Removal and Cycle Detection (DFS / BFS)
The naive approach is to test each edge in reverse order: temporarily remove an edge, construct an adjacency list with the remaining $n - 1$ edges, and verify via DFS or BFS whether the graph is fully connected and acyclic. Because running a reachability traversal on $n$ vertices takes $O(n)$ time and testing every edge requires up to $n$ attempts, this trial-and-error strategy takes $O(n^2)$ quadratic time.

#### Optimal Approach: Disjoint Set Union (Union-Find)
Instead of backtracking or re-running traversals, we can process edges sequentially in the exact order they are supplied using Disjoint Set Union (DSU):
- **Component Initialization:** Each node from $1$ to $n$ begins in its own isolated component.
- **Edge Evaluation:** For each edge `[u, v]`, compute root representatives: `root_u = find(u)` and `root_v = find(v)`.
- **Cycle Identification:** If `root_u == root_v`, a valid path already connects $u$ and $v$ through earlier edges. Adding `[u, v]` introduces an alternative path between them, which produces a cycle.
- **Order Preservation:** Because the input graph was originally a tree plus exactly one extra edge, the first edge whose endpoints share an identical root is guaranteed to be the cycle-closing connection.
- **Path Merging:** If `root_u != root_v`, union the components and continue.

#### Execution Walkthrough

Let us trace `edges = [[1, 2], [1, 3], [2, 3]]`:

| Step | Edge `[u, v]` | Root $u$ | Root $v$ | Same Component? | Action Taken | Component Groups |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Initial** | - | - | - | - | Nodes 1, 2, 3 are isolated | `{1}`, `{2}`, `{3}` |
| **1** | `[1, 2]` | 1 | 2 | No | Union roots 1 and 2 | `{1, 2}`, `{3}` |
| **2** | `[1, 3]` | 1 | 3 | No | Union roots 1 and 3 | `{1, 2, 3}` |
| **3** | `[2, 3]` | 1 | 1 | **Yes** | Cycle detected! Return `[2, 3]` | `{1, 2, 3}` |

---

### Step-by-Step Algorithm

1. **Setup 1-Indexed Arrays:** Since node labels range from $1$ to $n$, initialize `parent = list(range(n + 1))` and `rank = [1] * (n + 1)`.
2. **Define Find with Path Compression:** Function `find(node)` checks if `parent[node] != node`. If true, set `parent[node] = find(parent[node])` and return the representative root.
3. **Define Union by Rank:** Function `union(u, v)` evaluates roots `root_u = find(u)` and `root_v = find(v)`.
   - If `root_u == root_v`, return `False` (both vertices already share a component, confirming a cycle).
   - If `rank[root_u] > rank[root_v]`, point `parent[root_v] = root_u`.
   - Elif `rank[root_u] < rank[root_v]`, point `parent[root_u] = root_v`.
   - Otherwise, point `parent[root_v] = root_u` and increment `rank[root_u] += 1`.
   - Return `True`.
4. **Scan Edge List:** Iterate through each edge `[u, v]` in `edges`. The first edge for which `union(u, v)` returns `False` is our redundant edge; return `[u, v]` immediately.
5. **Fallback:** Return an empty list `[]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Disjoint Set Union" default>

```python
class Solution:
    def findRedundantConnection(self, edges: list[list[int]]) -> list[int]:
        n = len(edges)
        # Nodes are 1-indexed from 1 to n
        parent = list(range(n + 1))
        rank = [1] * (n + 1)

        def find(node: int) -> int:
            # Path compression flattens the tree dynamically
            if parent[node] != node:
                parent[node] = find(parent[node])
            return parent[node]

        def union(u: int, v: int) -> bool:
            root_u = find(u)
            root_v = find(v)

            # If both endpoints already share the same root, an edge creates a cycle
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

        # Process edges in given sequence
        for u, v in edges:
            if not union(u, v):
                return [u, v]

        return []
```

  </TabItem>
  <TabItem value="dfs" label="Alternative: Cycle Detection via DFS">

```python
class Solution:
    def findRedundantConnection(self, edges: list[list[int]]) -> list[int]:
        n = len(edges)
        adj: list[list[int]] = [[] for _ in range(n + 1)]

        def has_path(source: int, target: int, visited: set[int]) -> bool:
            if source == target:
                return True
            visited.add(source)
            for neighbor in adj[source]:
                if neighbor not in visited:
                    if has_path(neighbor, target, visited):
                        return True
            return False

        for u, v in edges:
            visited: set[int] = set()
            # If a path already exists between u and v, adding [u, v] closes a cycle
            if has_path(u, v, visited):
                return [u, v]
            adj[u].append(v)
            adj[v].append(u)

        return []
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Disjoint Set Union** | $O(n \cdot \alpha(n))$ | $O(n)$ | Evaluates connectivity in near $O(1)$ amortized time per edge, finding the redundant edge in a single pass. |
| **Cycle Detection via DFS** | $O(n^2)$ | $O(n)$ | Runs a DFS reachability query before adding each edge; degrades to quadratic runtime on long chains. |

---

### Common Pitfall: 1-Based Indexing and Early Return Timing

Node values are labeled from $1$ to $n$. Sizing the `parent` and `rank` arrays to $n$ instead of $n + 1$ triggers `IndexError` when querying node $n$. Additionally, attempting to batch-process all edges before checking cycles loses the order information required by the problem statement: returning the cycle-closing edge as soon as `root_u == root_v` naturally identifies the correct edge.

---

### Concise Interview Takeaway

Iterate through the edges sequentially using Disjoint Set Union. The first edge whose endpoints already share the same representative root completes a cycle and represents the redundant connection. With path compression and union by rank, this resolves in near-linear $O(n \cdot \alpha(n))$ time.
