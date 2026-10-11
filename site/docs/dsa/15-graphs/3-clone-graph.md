---
id: 3-clone-graph
title: "133. Clone Graph"
description: "Deep copy an undirected graph using DFS/BFS and an original-to-clone hash map"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / BFS Hash Map</span>

> **Problem Statement:** Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node in the graph contains an integer value `val` and a list `neighbors` of connected `Node` objects.

```text
Input:  adjList = [[2,4],[1,3],[2,4],[1,3]]
Output: [[2,4],[1,3],[2,4],[1,3]]
Explanation: Node 1 connects to 2 and 4. Node 2 connects to 1 and 3. Node 3 connects to 2 and 4. Node 4 connects to 1 and 3.
```

---

### The Intuitive Mental Model

In a tree, nodes only point downward, so cycles do not exist. In an undirected graph, however, edges are bidirectional: if node 1 connects to node 2, then node 2 connects back to node 1.

#### Brute Force: Naive Traversal without Cycle Detection
If you attempt a naive recursive copy without cycle tracking:
1. Clone node 1.
2. For each neighbor of node 1, clone node 2.
3. For each neighbor of node 2, clone node 1, triggering an infinite recursive loop that causes a call stack overflow.

#### Optimal Approach: Hash Map Memoization with Early Registration
To prevent infinite cycles and ensure that each node in the cloned graph is instantiated exactly once, maintain an `original -> clone` hash map:

$$\text{cloned} = \{\text{original\_node}: \text{cloned\_node}\}$$

When visiting an original node `curr`:
1. If `curr` has already been copied (`curr in cloned`), immediately return the existing cloned node pointer.
2. If `curr` has not yet been copied, instantiate its clone: `copy = Node(curr.val)`.
3. **Crucial Registration:** Immediately store `cloned[curr] = copy` before iterating over its neighbors.
4. Iterate over each neighbor in `curr.neighbors`, recursively resolve its clone, and append it to `copy.neighbors`.

Because the clone is registered in the hash map before recursion descends into neighbors, any back-edge or cycle pointing back to `curr` resolves to the cached clone pointer in $O(1)$ time, cleanly severing the loop.

#### Execution Walkthrough

Consider a 4-node ring: `1 - 2 - 3 - 4 - 1`:

| Step | Visited Node | Action Taken | Map Registration (`cloned`) | Cloned Neighbors Linked |
| :---: | :---: | :--- | :--- | :--- |
| **1** | Node `1` | Allocate `copy1`, record in map, recurse to neighbor `2` | `{1: 1'}` | Pending |
| **2** | Node `2` | Allocate `copy2`, record in map, recurse to neighbor `1` | `{1: 1', 2: 2'}` | `1'` already in map; link `2' -> 1'` |
| **3** | Node `2` | Recurse to neighbor `3`, allocate `copy3`, record in map | `{1: 1', 2: 2', 3: 3'}` | Link `2' -> 3'` |
| **4** | Node `3` | Recurse to neighbor `4`, allocate `copy4`, record in map | `{1: 1', 2: 2', 3: 3', 4: 4'}` | Link `3' -> 4'` |
| **5** | Node `4` | Check neighbors `3` and `1`. Both in map; link directly | `{1: 1', 2: 2', 3: 3', 4: 4'}` | Link `4' -> 3'`, `4' -> 1'` |

All vertices and bidirectional edges are copied without duplicate node allocations.

---

### Step-by-Step Algorithm

1. **Guard Against Null Graph:** If `node` is `None`, return `None` immediately.
2. **Initialize Memoization Map:** Create a dictionary `cloned: dict[Node, Node] = {}`.
3. **Define Traversal (`dfs(curr)`):**
   - Check if `curr` is in `cloned`. If present, return `cloned[curr]`.
   - Allocate the clone: `copy = Node(curr.val)`.
   - Register the clone immediately: `cloned[curr] = copy`.
   - Iterate through `curr.neighbors` and append `dfs(neighbor)` to `copy.neighbors`.
   - Return `copy`.
4. **Trigger Traversal:** Return `dfs(node)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Depth-First Search (DFS)" default>

```python
"""
# Definition for a Node.
class Node:
    def __init__(self, val = 0, neighbors = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []
"""

class Solution:
    def cloneGraph(self, node: "Node | None") -> "Node | None":
        if not node:
            return None

        # Map original node references to their cloned copies
        cloned: dict["Node", "Node"] = {}

        def dfs(curr: "Node") -> "Node":
            # Return cached clone if already visited
            if curr in cloned:
                return cloned[curr]

            # 1. Allocate new clone node
            copy = Node(curr.val)

            # 2. Register immediately before neighbor recursion to terminate cycles
            cloned[curr] = copy

            # 3. Recursively copy and connect all neighbors
            for neighbor in curr.neighbors:
                copy.neighbors.append(dfs(neighbor))

            return copy

        return dfs(node)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Breadth-First Search (BFS)">

```python
from collections import deque

class Solution:
    def cloneGraph(self, node: "Node | None") -> "Node | None":
        if not node:
            return None

        # Map original nodes to copies and prime the queue
        cloned: dict["Node", "Node"] = {node: Node(node.val)}
        queue: deque["Node"] = deque([node])

        while queue:
            curr = queue.popleft()

            for neighbor in curr.neighbors:
                # If neighbor has not been instantiated, allocate and enqueue it
                if neighbor not in cloned:
                    cloned[neighbor] = Node(neighbor.val)
                    queue.append(neighbor)

                # Connect cloned neighbor to cloned current node
                cloned[curr].neighbors.append(cloned[neighbor])

        return cloned[node]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Depth-First Search (DFS)** | $O(V + E)$ | $O(V)$ | Traverses each vertex and edge once. Call stack reaches $O(V)$ frames on deep line-shaped graphs. |
| **Breadth-First Search (BFS)** | $O(V + E)$ | $O(V)$ | Uses an explicit queue. Avoids recursion stack overflow for graphs with high diameters. |

---

### Common Pitfall: Registering the Clone Too Late

The most common bug is appending to `copy.neighbors` before registering `cloned[curr] = copy`. If the hash map registration is deferred until after neighbors are processed, any circular reference or back-edge will fail to recognize that the node is currently being constructed. The algorithm will re-enter the same node and overflow the call stack. Always record the clone in the map immediately after allocating it.

---

### Concise Interview Takeaway

Deep copying an arbitrary graph requires pairing traversal with memoization. Maintain a hash map linking each original node to its newly allocated clone, and register the clone before descending into neighbors. This guarantees that cycles terminate in $O(1)$ lookups, producing an exact structural replica in $O(V + E)$ time and $O(V)$ space.
