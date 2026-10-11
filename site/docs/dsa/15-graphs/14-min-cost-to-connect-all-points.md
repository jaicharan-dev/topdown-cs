---
id: 14-min-cost-to-connect-all-points
title: "1584. Min Cost to Connect All Points"
description: "Find the Minimum Spanning Tree of 2D points using Prim's algorithm with a min-heap"
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Minimum Spanning Tree</span>

> **Problem Statement:** You are given an array `points` representing integer coordinates of some points on a 2D plane, where `points[i] = [xi, yi]`. The cost of connecting two points `[xi, yi]` and `[xj, yj]` is the Manhattan distance between them: $|xi - xj| + |yi - yj|$. Return the minimum cost to make all points connected. All points are connected if there is exactly one simple path between any two points.

```text
Input:  points = [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]
Output: 20
Explanation: Connecting the points with edges [0, 1] (cost 4), [1, 3] (cost 3), [3, 4] (cost 4), and [1, 2] (cost 9) yields a tree of total minimum cost 20.
```

---

### The Intuitive Mental Model

Connecting $n$ points such that there is exactly one simple path between any two points while minimizing total edge weights is the canonical definition of a **Minimum Spanning Tree (MST)** on a complete graph with $n$ vertices.

#### Brute Force: Kruskal's Algorithm with All $O(n^2)$ Edges
The standard alternative is Kruskal's algorithm: generate all $n(n - 1) / 2$ pairs of points as explicit edge tuples `(cost, u, v)`, sort them by cost, and iterate through them using Disjoint Set Union (DSU) to connect vertices while skipping cycle-forming edges. While correct, generating and sorting all $O(n^2)$ edge tuples upfront introduces substantial memory and sorting overhead.

#### Optimal Approach: Prim's Algorithm (Greedy Frontier Expansion)
Rather than pre-materializing all $O(n^2)$ explicit edge objects, **Prim's algorithm** grows the MST organically starting from an arbitrary seed node (such as node `0`):
- Maintain a `visited` set to track points already incorporated into the tree.
- Maintain a `min_heap` storing pairs `(edge_cost, point_index)`.
- At each step, extract the cheapest available edge connecting an unvisited point to the growing tree (`cost, u = heapq.heappop(min_heap)`):
  - If point `u` is already in `visited`, discard it as a stale heap entry.
  - Otherwise, mark `u` as visited and accumulate `cost` into `total_cost`.
  - For every point `v` not yet in `visited`, compute its Manhattan distance to `u` and push `(dist, v)` into the min-heap.
- The algorithm terminates the moment `len(visited) == n`, guaranteeing that all $n$ vertices are connected with the minimum aggregate Manhattan distance.

#### Execution Walkthrough

Let us trace `points = [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]`:

| Step | Added Node `u` | Edge Cost | Cumulative MST Cost | Newly Added Frontier Edges to Heap | Visited Nodes |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **Initial** | 0 | 0 | 0 | `(4, 1), (13, 2), (7, 3), (7, 4)` | `{0}` |
| **1** | 1 | 4 | 4 | `(9, 2), (3, 3), (7, 4)` | `{0, 1}` |
| **2** | 3 | 3 | 7 | `(10, 2), (4, 4)` | `{0, 1, 3}` |
| **3** | 4 | 4 | 11 | `(14, 2)` | `{0, 1, 3, 4}` |
| **4** | 2 | 9 | 20 | Complete (all 5 nodes visited) | `{0, 1, 2, 3, 4}` |

Total minimum connection cost = 20.

---

### Step-by-Step Algorithm

1. **Initialize State:**
   - Determine `n = len(points)`.
   - Allocate `visited: set[int] = set()`.
   - Seed `min_heap: list[tuple[int, int]] = [(0, 0)]` storing pairs of `(cost, point_index)`.
   - Set `total_cost = 0`.
2. **Execute Prim's MST Traversal:**
   - While `len(visited) < n`:
     - Pop `cost, u = heapq.heappop(min_heap)`.
     - If `u in visited`, continue (stale heap entry).
     - Add `u` to `visited` and add `cost` to `total_cost`.
     - Extract coordinates `x1, y1 = points[u]`.
     - For every candidate point `v` in range `n`:
       - If `v not in visited`:
         - Calculate Manhattan distance: `dist = abs(x1 - points[v][0]) + abs(y1 - points[v][1])`.
         - Push `(dist, v)` into `min_heap`.
3. **Return Total Cost:** Return `total_cost`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Prim's Algorithm (Min-Heap)" default>

```python
import heapq

class Solution:
    def minCostConnectPoints(self, points: list[list[int]]) -> int:
        n = len(points)
        visited: set[int] = set()
        # Min-heap storing tuples of (edge_cost, point_index)
        min_heap: list[tuple[int, int]] = [(0, 0)]
        total_cost = 0

        while len(visited) < n:
            cost, u = heapq.heappop(min_heap)

            # Skip if node u is already part of the spanning tree
            if u in visited:
                continue

            visited.add(u)
            total_cost += cost

            # Calculate Manhattan distances from u to all remaining unvisited points
            x1, y1 = points[u]
            for v in range(n):
                if v not in visited:
                    x2, y2 = points[v]
                    dist = abs(x1 - x2) + abs(y1 - y2)
                    heapq.heappush(min_heap, (dist, v))

        return total_cost
```

  </TabItem>
  <TabItem value="kruskal" label="Alternative: Kruskal's Algorithm (DSU)">

```python
class Solution:
    def minCostConnectPoints(self, points: list[list[int]]) -> int:
        n = len(points)
        edges: list[tuple[int, int, int]] = []

        # Generate all pairwise edges
        for i in range(n):
            x1, y1 = points[i]
            for j in range(i + 1, n):
                x2, y2 = points[j]
                dist = abs(x1 - x2) + abs(y1 - y2)
                edges.append((dist, i, j))

        # Sort edges by increasing distance
        edges.sort()

        parent = list(range(n))
        rank = [1] * n

        def find(node: int) -> int:
            if parent[node] != node:
                parent[node] = find(parent[node])
            return parent[node]

        def union(u: int, v: int) -> bool:
            root_u = find(u)
            root_v = find(v)
            if root_u == root_v:
                return False
            if rank[root_u] > rank[root_v]:
                parent[root_v] = root_u
            elif rank[root_u] < rank[root_v]:
                parent[root_u] = root_v
            else:
                parent[root_v] = root_u
                rank[root_u] += 1
            return True

        total_cost = 0
        edges_used = 0

        for cost, u, v in edges:
            if union(u, v):
                total_cost += cost
                edges_used += 1
                if edges_used == n - 1:
                    break

        return total_cost
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Prim's Algorithm** | $O(n^2 \log n)$ | $O(n^2)$ | Grows tree frontier organically without pre-materializing all $O(n^2)$ edge tuples upfront. |
| **Kruskal's Algorithm** | $O(n^2 \log n)$ | $O(n^2)$ | Explicitly materializes and sorts all $n(n - 1) / 2$ edges, using DSU to unite forest components. |

---

### Common Pitfall: Prematurely Stopping Without Visiting All Vertices

Stopping the heap loop when the heap is empty rather than tracking `len(visited) == n` or neglecting to check `if u in visited` upon popping leads to processing stale entries with outdated, suboptimal distances. Maintaining a strict `visited` set and skipping already-settled nodes guarantees that only valid minimum edges are credited.

---

### Concise Interview Takeaway

Model the coordinates as a complete graph where edge weights are Manhattan distances. Build the Minimum Spanning Tree using Prim's algorithm with a min-heap to greedily extract the lowest-cost frontier edge to an unvisited node until all $n$ coordinates are connected.
