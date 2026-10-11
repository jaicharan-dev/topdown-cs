---
id: 12-network-delay-time
title: "743. Network Delay Time"
description: "Find time for signal to reach all nodes in weighted graph using Dijkstra's algorithm"
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dijkstra's Algorithm</span>

> **Problem Statement:** You are given a network of `n` nodes labeled from `1` to `n`. You are also given `times`, a list of travel times as directed edges `times[i] = [u, v, w]`, where `u` is the source node, `v` is the target node, and `w` is the time it takes for a signal to travel from source to target. We send a signal from a given node `k`. Return the minimum time it takes for all `n` nodes to receive the signal. If it is impossible for all `n` nodes to receive the signal, return `-1`.

```text
Input:  times = [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n = 4, k = 2
Output: 2
Explanation: Node 2 sends signal to 1 and 3 in 1 unit of time, and node 3 forwards signal to 4 taking another 1 unit (total 2 units). All nodes receive the signal by time 2.
```

---

### The Intuitive Mental Model

We are tasked with finding the shortest travel time from a single source node `k` to all other nodes in a directed graph where all edge weights are non-negative ($w \ge 0$). This is the textbook scenario for **Dijkstra's Algorithm**.

#### Brute Force: Bellman-Ford Iterative Edge Relaxation
One could explore all simple paths from source $k$ to every node or execute the Bellman-Ford algorithm by relaxing all $E$ edges across $V - 1$ rounds. Because Bellman-Ford relaxes edges without prioritizing shorter paths, it runs in $O(V \cdot E)$ time. While simple, relaxing every edge indiscriminately incurs substantial overhead compared to greedy shortest-path expansion.

#### Optimal Approach: Dijkstra's Algorithm with Min-Heap
Imagine the signal radiating outward like water flowing through interconnected pipes:
- The signal reaches nearby nodes first before propagating further downstream.
- A **Min-Heap (Priority Queue)** stores tuples of `(accumulated_travel_time, current_node)`. By always popping the node with the smallest cumulative delay, we ensure that the first time a node is popped from the heap, its absolute shortest arrival time has been determined.
- When popping `(time, u)`:
  - If `u` was already finalized in our `shortest_time` dictionary, we discard it as a stale heap entry.
  - Otherwise, record `shortest_time[u] = time`.
  - For each outgoing edge `(v, weight)` from `u`, push `(time + weight, v)` into the min-heap.
- Because the signal propagates concurrently across all paths, the network delay is dictated by the slowest node: $\max(\text{shortest\_time.values()})$. If fewer than $n$ nodes were reached, at least one node is disconnected, so we return `-1`.

#### Execution Walkthrough

Let us trace `times = [[2, 1, 1], [2, 3, 1], [3, 4, 1]]`, $n = 4$, $k = 2$:

| Step | Popped `(time, node)` | Action Taken | Min-Heap State | Finalized Distances (`shortest_time`) |
| :---: | :---: | :---: | :---: | :--- |
| **Initial** | - | Push source `(0, 2)` | `[(0, 2)]` | `{}` |
| **1** | `(0, 2)` | Finalize node 2; push neighbors `(1, 1)`, `(1, 3)` | `[(1, 1), (1, 3)]` | `{2: 0}` |
| **2** | `(1, 1)` | Finalize node 1; no outgoing edges | `[(1, 3)]` | `{2: 0, 1: 1}` |
| **3** | `(1, 3)` | Finalize node 3; push neighbor `(2, 4)` | `[(2, 4)]` | `{2: 0, 1: 1, 3: 1}` |
| **4** | `(2, 4)` | Finalize node 4; no outgoing edges | `[]` | `{2: 0, 1: 1, 3: 1, 4: 2}` |

All 4 nodes finalized. Total network delay = $\max(0, 1, 1, 2) = 2$.

---

### Step-by-Step Algorithm

1. **Construct Adjacency List:** Create `adj: dict[int, list[tuple[int, int]]] = defaultdict(list)` mapping `u -> [(v, weight), ...]`.
2. **Initialize Data Structures:**
   - Seed `min_heap` with `[(0, k)]` storing tuples of `(accumulated_time, node)`.
   - Allocate `shortest_time: dict[int, int] = {}` to store finalized arrival times.
3. **Execute Dijkstra Traversal:**
   - While `min_heap` is non-empty:
     - Pop `curr_time, u = heapq.heappop(min_heap)`.
     - If `u` is in `shortest_time`, continue (skip stale heap entry).
     - Store `shortest_time[u] = curr_time`.
     - For each neighbor `(v, weight)` in `adj[u]`:
       - If `v not in shortest_time`, push `(curr_time + weight, v)` to `min_heap`.
4. **Evaluate Network Reachability:**
   - If `len(shortest_time) == n`, return `max(shortest_time.values())`.
   - Otherwise, return `-1` because one or more nodes were unreachable.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Dijkstra's Algorithm (Min-Heap)" default>

```python
import heapq
from collections import defaultdict

class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        # Build adjacency list: u -> list of (v, weight)
        adj: dict[int, list[tuple[int, int]]] = defaultdict(list)
        for u, v, w in times:
            adj[u].append((v, w))

        # Min-heap storing tuples of (accumulated_time, current_node)
        min_heap: list[tuple[int, int]] = [(0, k)]
        shortest_time: dict[int, int] = {}

        while min_heap:
            curr_time, u = heapq.heappop(min_heap)

            # Skip stale entries if node u was already finalized
            if u in shortest_time:
                continue

            shortest_time[u] = curr_time

            # Relax outgoing edges
            for v, weight in adj[u]:
                if v not in shortest_time:
                    heapq.heappush(min_heap, (curr_time + weight, v))

        # Return max propagation time if all n nodes received the signal, else -1
        return max(shortest_time.values()) if len(shortest_time) == n else -1
```

  </TabItem>
  <TabItem value="bellman-ford" label="Alternative: Bellman-Ford Algorithm">

```python
class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        dist = [float("inf")] * (n + 1)
        dist[k] = 0

        # Relax all edges up to n - 1 times
        for _ in range(n - 1):
            updated = False
            for u, v, w in times:
                if dist[u] != float("inf") and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    updated = True
            if not updated:
                break

        max_dist = max(dist[1:])
        return int(max_dist) if max_dist != float("inf") else -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Dijkstra's (Min-Heap)** | $O(E \log V)$ | $O(V + E)$ | Greedily expands the earliest-arriving signal paths first. Optimal for sparse to moderately dense graphs. |
| **Bellman-Ford** | $O(V \cdot E)$ | $O(V)$ | Relaxes all edges iteratively without priority queue overhead, but performs redundant passes. |

---

### Common Pitfall: Forgetting to Discard Stale Heap Entries

A node can be inserted into the priority queue multiple times as alternative incoming paths are discovered. If you do not check `if u in shortest_time: continue` immediately upon popping from the min-heap, you will redundantly re-evaluate outgoing edges for already-finalized nodes, creating unnecessary work and slowing down execution.

---

### Concise Interview Takeaway

Run Dijkstra's algorithm with a min-heap from source $k$. Because edge weights are non-negative, the first time a node is popped from the heap, its shortest path is guaranteed. The total signal delay equals the maximum shortest path across all $n$ nodes, returning `-1` if any node remains unreached.
