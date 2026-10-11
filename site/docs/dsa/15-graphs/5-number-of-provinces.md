---
id: 5-number-of-provinces
title: "547. Number of Provinces"
description: "Count connected components in an adjacency matrix using DFS or Disjoint Set Union"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Connected Components / DSU</span>

> **Problem Statement:** There are `n` cities. Some of them are connected directly, while some are not. If city `a` is connected directly with city `b`, and city `b` is connected directly with city `c`, then city `a` is connected indirectly with city `c`. A province is a group of directly or indirectly connected cities with no outside connections. Given an `n x n` matrix `isConnected` where `isConnected[i][j] = 1` if city `i` and city `j` are directly connected and `0` otherwise, return the total number of provinces.

```text
Input:  isConnected = [[1,1,0],[1,1,0],[0,0,1]]
Output: 2
Explanation: Cities 0 and 1 are directly connected to each other, forming Province 1. City 2 is isolated, forming Province 2. Total provinces = 2.
```

---

### The Intuitive Mental Model

Unlike 2D grid problems where each cell only borders four orthogonal coordinates, the input here is an **adjacency matrix** representing an arbitrary undirected graph:
- **Vertices:** The $n$ cities indexed from $0$ to $n - 1$.
- **Edges:** A direct road exists between city $i$ and city $j$ if and only if `isConnected[i][j] == 1`. Every city connects to itself (`isConnected[i][i] == 1`), and edges are bidirectional (`isConnected[i][j] == isConnected[j][i]`).

Under this definition, a province is simply a **connected component** of the graph.

#### Brute Force: Pairwise Path Verification
A naive approach would test connectivity between every pair of vertices by running separate pathfinding searches for all $O(n^2)$ pairs, manually grouping vertices with mutual reachability. This results in $O(n^3)$ redundant graph sweeps and complex intermediate set bookkeeping.

#### Optimal Approach: Connected Component Traversal
Because any connected component can be completely traversed from any single vertex within it, we only need to visit each vertex once:
1. Maintain a boolean array `visited` of size $n$, initialized to `False`.
2. Iterate through each city index $i \in [0, n - 1]$.
3. If city $i$ has not been visited yet, we have discovered a brand-new province. Increment `provinces += 1`.
4. Launch a Depth-First Search (DFS) starting from city $i$:
   - Mark city $i$ as `visited`.
   - Scan row `isConnected[i]`: for every neighbor $j$ from $0$ to $n - 1$, if `isConnected[i][j] == 1` and `visited[j]` is `False`, recurse into city $j$.
5. After the traversal terminates, every city in that province is flagged. When the outer loop encounters them, they are skipped immediately.

#### Execution Walkthrough

Consider $n = 3$ with `isConnected = [[1,1,0],[1,1,0],[0,0,1]]`:

| Step | City Inspected | Visited Status | Action Taken | Cities Traversed in DFS | Visited State | Province Count |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **1** | City `0` | `False` | New province found! Increment count and launch DFS | `0` connects to `1`; both visited | `[True, True, False]` | 1 |
| **2** | City `1` | `True` | Already part of Province 1. Skip. | None | `[True, True, False]` | 1 |
| **3** | City `2` | `False` | New province found! Increment count and launch DFS | `2` connects only to itself | `[True, True, True]` | 2 |

Traversal complete. Total provinces = 2.

---

### Step-by-Step Algorithm

1. **Initialize State:**
   - Determine `n = len(isConnected)`.
   - Create a boolean array `visited = [False] * n`.
   - Initialize `provinces = 0`.
2. **Define Traversal Routine (`dfs(city)`):**
   - Set `visited[city] = True`.
   - Iterate through every candidate neighbor `neighbor` from $0$ to $n - 1$:
     - If `isConnected[city][neighbor] == 1` and `not visited[neighbor]`:
       - Recursively invoke `dfs(neighbor)`.
3. **Scan All Vertices:**
   - Loop `i` from $0$ to $n - 1$:
     - If `not visited[i]`:
       - Increment `provinces += 1`.
       - Call `dfs(i)`.
4. **Return Total:** Return `provinces`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Depth-First Search (DFS)" default>

```python
class Solution:
    def findCircleNum(self, isConnected: list[list[int]]) -> int:
        n = len(isConnected)
        visited = [False] * n
        provinces = 0

        def dfs(city: int) -> None:
            visited[city] = True

            # Scan the adjacency row for all connected neighbors
            for neighbor in range(n):
                if isConnected[city][neighbor] == 1 and not visited[neighbor]:
                    dfs(neighbor)

        # Iterate through every city to find all connected components
        for i in range(n):
            if not visited[i]:
                provinces += 1
                dfs(i)

        return provinces
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Disjoint Set Union (DSU / Union-Find)">

```python
class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x != root_y:
            # Union by rank
            if self.rank[root_x] < self.rank[root_y]:
                self.parent[root_x] = root_y
            elif self.rank[root_x] > self.rank[root_y]:
                self.parent[root_y] = root_x
            else:
                self.parent[root_y] = root_x
                self.rank[root_x] += 1
            self.count -= 1

class Solution:
    def findCircleNum(self, isConnected: list[list[int]]) -> int:
        n = len(isConnected)
        dsu = UnionFind(n)

        # Only upper triangular matrix needs evaluation due to symmetry
        for i in range(n):
            for j in range(i + 1, n):
                if isConnected[i][j] == 1:
                    dsu.union(i, j)

        return dsu.count
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Depth-First Search (DFS)** | $O(n^2)$ | $O(n)$ | Scans each cell in the $n \times n$ adjacency matrix once. Call stack takes at most $O(n)$ frames. |
| **Disjoint Set Union (DSU)** | $O(n^2 \cdot \alpha(n))$ | $O(n)$ | Iterates over the upper triangle of the matrix with near-constant $\alpha(n)$ union operations. Avoids recursion stacks entirely. |

---

### Common Pitfall: Treating Adjacency Matrix Cells as 4-Directional Grid Coordinates

A frequent conceptual error is attempting to navigate `isConnected` using grid directional offsets like `(r + 1, c)` or `(r, c + 1)`. The matrix is not a spatial board; it is an adjacency matrix. Moving to a neighbor does not mean stepping to the cell below; it means reading row `i` across all columns `0` through `n - 1` to find which cities `j` satisfy `isConnected[i][j] == 1`.

---

### Concise Interview Takeaway

The Number of Provinces problem is standard connected component counting on an adjacency matrix. Loop through all vertices from $0$ to $n - 1$; whenever an unvisited vertex is encountered, increment the province count and trigger a DFS across its row in the matrix to mark all transitively reachable vertices as visited. This solves the problem cleanly in $O(n^2)$ time and $O(n)$ auxiliary space.
