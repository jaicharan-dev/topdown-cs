---
id: 6-is-graph-bipartite
title: "785. Is Graph Bipartite?"
description: "Validate two-colorability of an undirected graph using BFS or DFS"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bipartite Coloring</span>

> **Problem Statement:** There is an undirected graph with `n` nodes, numbered from 0 to `n - 1`. You are given an adjacency list `graph` where `graph[u]` is an array of nodes adjacent to node `u`. Return `True` if and only if the graph is bipartite. A graph is bipartite if its nodes can be partitioned into two independent sets $A$ and $B$ such that every edge in the graph connects a node in set $A$ and a node in set $B$.

```text
Input:  graph = [[1,2,3],[0,2],[0,1,3],[0,2]]
Output: false
Explanation: Nodes 0, 1, and 2 form an odd-length triangle cycle (0 connects to 1 and 2, and 1 connects to 2). No valid 2-partition exists.
```

---

### The Intuitive Mental Model

In graph theory, an undirected graph is bipartite if and only if it contains **no odd-length cycles**. 

This property can be tested directly using **Graph Two-Coloring**:
- Imagine coloring every node with one of two colors: `0` or `1`.
- For the graph to be bipartite, every edge must connect two nodes of **opposite colors** (a `0` must only connect to `1`s, and a `1` must only connect to `0`s).
- If during graph exploration we encounter an edge connecting two nodes that already share the exact same color, an odd cycle has been found, proving the graph cannot be bipartite.

#### Brute Force: Testing All Subsets
A brute-force strategy tests all $2^n$ possible binary partitions of nodes into set $A$ and set $B$. For each partition, it iterates through all edges to verify that no edge connects two nodes in the same partition. This takes $O(2^n \cdot (V + E))$ exponential time, making it impractical for $n > 20$.

#### Optimal Approach: BFS Two-Coloring
Because the graph can be disconnected into multiple components, we scan all nodes from $0$ to $n - 1$:
1. If node $i$ has not been colored yet (marked with `-1`), color it with `0` and seed the BFS queue.
2. While the queue contains nodes, pop `curr`:
   - Inspect each `neighbor` in `graph[curr]`.
   - If `neighbor` is uncolored, assign it the complementary color `1 - color[curr]` and push it to the queue.
   - If `neighbor` is already colored and `color[neighbor] == color[curr]`, a color conflict has occurred. Return `False` immediately.
3. If all vertices across all components are colored without conflicts, return `True`.

#### Execution Walkthrough

Consider `graph = [[1,3],[0,2],[1,3],[0,2]]` (a 4-node ring):

| Step | Current Node | Assigned Color | Neighbor Inspected | Neighbor Color Before | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Node `0` | `0` | Node `1` | `-1` | Color `1` with `1`, enqueue `1` |
| **2** | Node `0` | `0` | Node `3` | `-1` | Color `3` with `1`, enqueue `3` |
| **3** | Node `1` | `1` | Node `0` | `0` | Opposite color. Valid edge. |
| **4** | Node `1` | `1` | Node `2` | `-1` | Color `2` with `0`, enqueue `2` |
| **5** | Node `3` | `1` | Node `0` | `0` | Opposite color. Valid edge. |
| **6** | Node `3` | `1` | Node `2` | `0` | Opposite color. Valid edge. |
| **7** | Node `2` | `0` | Nodes `1`, `3` | `1`, `1` | Both opposite color. Valid. |

All nodes colored without conflict. Graph is bipartite (`True`).

---

### Step-by-Step Algorithm

1. **Initialize Color Array:**
   - Let `n = len(graph)`.
   - Create an array `color = [-1] * n` where `-1` represents an uncolored vertex.
2. **Iterate Across All Components:**
   - Loop `start_node` from `0` to `n - 1`.
   - If `color[start_node] != -1`, the component has already been validated; continue.
   - Assign `color[start_node] = 0` and initialize a queue with `[start_node]`.
3. **Run BFS Coloring:**
   - While the queue is not empty:
     - Pop `curr = queue.popleft()`.
     - For each `neighbor` in `graph[curr]`:
       - If `color[neighbor] == -1`:
         - Assign `color[neighbor] = 1 - color[curr]`.
         - Append `neighbor` to the queue.
       - Else if `color[neighbor] == color[curr]`:
         - Conflict detected (odd cycle exists). Return `False`.
4. **Return Success:** If all components are processed without conflict, return `True`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: BFS Two-Coloring" default>

```python
from collections import deque

class Solution:
    def isBipartite(self, graph: list[list[int]]) -> bool:
        n = len(graph)
        # -1 indicates unvisited; 0 and 1 represent the two partitions
        color = [-1] * n

        for start_node in range(n):
            if color[start_node] != -1:
                continue

            # Seed a new connected component with color 0
            color[start_node] = 0
            queue: deque[int] = deque([start_node])

            while queue:
                curr = queue.popleft()

                for neighbor in graph[curr]:
                    if color[neighbor] == -1:
                        # Color neighbor with the opposite color
                        color[neighbor] = 1 - color[curr]
                        queue.append(neighbor)
                    elif color[neighbor] == color[curr]:
                        # Conflict detected: odd cycle found
                        return False

        return True
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: DFS Two-Coloring">

```python
class Solution:
    def isBipartite(self, graph: list[list[int]]) -> bool:
        n = len(graph)
        color = [-1] * n

        def dfs(node: int, c: int) -> bool:
            color[node] = c

            for neighbor in graph[node]:
                if color[neighbor] == -1:
                    # Recurse with opposite color; fail if any conflict down the chain
                    if not dfs(neighbor, 1 - c):
                        return False
                elif color[neighbor] == c:
                    return False

            return True

        # Check all connected components
        for i in range(n):
            if color[i] == -1:
                if not dfs(i, 0):
                    return False

        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **BFS Two-Coloring** | $O(V + E)$ | $O(V)$ | Traverses each vertex and edge once. Iterative queue avoids call stack depth limitations. |
| **DFS Two-Coloring** | $O(V + E)$ | $O(V)$ | Straightforward recursive backtracking. Recursion stack can take up to $O(V)$ frames on long paths. |

---

### Common Pitfall: Forgetting Disconnected Subgraphs

The input graph is not guaranteed to be connected. If you only launch the coloring traversal once from node `0`, any isolated vertices or disconnected components will remain uninspected. If one of those disconnected components contains an odd-length cycle, a single traversal will return `True` erroneously. Always wrap the traversal in an outer loop from `0` to `n - 1`.

---

### Concise Interview Takeaway

Bipartiteness is equivalent to two-colorability. Loop through all vertices to handle disconnected subgraphs, seeding each unvisited component with color `0`. Use BFS or DFS to alternate colors between adjacent nodes, and immediately return `False` if any edge connects two nodes sharing the same color.
