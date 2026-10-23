---
id: 12-network-delay-time
title: "743. Network Delay Time"
description: "Always expand the nearest unsettled node, and its distance is already final"
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dijkstra's Algorithm</span>

> **Problem Statement:** A signal starts at one node of a directed network and travels along edges that each take some time. Return how long until every node has received it, or `-1` if some node never does.

```text
Input:  times = [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n = 4, k = 2
Output: 2
```

---

### Picture it

The answer is the time the **last** node receives the signal, which means working out the shortest travel time to every node and taking the largest.

Breadth-first search finds shortest paths when every edge costs the same, because then "fewest edges" and "shortest time" are the same thing. Here the edges have different weights, so that breaks down: a two-edge route can easily be quicker than a one-edge route.

Dijkstra's algorithm is breadth-first search repaired for weights. Instead of expanding in the order nodes were discovered, always expand the **nearest unsettled node**. Keep the frontier in a min-heap so the nearest one is always on top.

The claim that makes it work: when a node comes off the heap with the smallest distance, that distance is final. Any other route to it would have to pass through some node still on the heap, and every one of those is at least as far away, so the route could only be longer. This needs edge weights to be non-negative, which is the assumption to state out loud.

---

### How to think about it

Build an adjacency list, then push the starting node at distance zero.

Repeatedly pop the nearest node. If it has already been settled, skip it: the heap can hold several entries for the same node, and only the first one off is the real distance. Otherwise record its distance as final and push each neighbour at this distance plus the edge's weight.

When the heap empties, the answer is the largest settled distance. If some node was never settled, it is unreachable, so return `-1`.

Rather than updating an entry already in the heap, which standard heaps cannot do cheaply, just push another entry and skip stale ones on the way out. That is the usual implementation and it is why the settled check matters.

---

### Walking through the example

Edges: `2 -> 1` taking `1`, `2 -> 3` taking `1`, `3 -> 4` taking `1`, starting from node `2`.

1. **Pop node 2 at distance 0.** Settle it. Push node `1` at `1` and node `3` at `1`.
2. **Pop node 1 at distance 1.** Settle it. It has no outgoing edges.
3. **Pop node 3 at distance 1.** Settle it. Push node `4` at `2`.
4. **Pop node 4 at distance 2.** Settle it.

All four nodes are settled, and the largest distance is `2`, so the answer is `2`.

Had there been no edge into node `4`, it would never have been settled, and the answer would be `-1`.

---

### The code

```python
import heapq
from collections import defaultdict

class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        graph = defaultdict(list)
        for u, v, w in times:
            graph[u].append((v, w))

        settled = {}
        heap = [(0, k)]   # (distance so far, node)

        while heap:
            distance, node = heapq.heappop(heap)

            # a stale entry for a node already finalised
            if node in settled:
                continue

            settled[node] = distance

            for neighbour, weight in graph[node]:
                if neighbour not in settled:
                    heapq.heappush(heap, (distance + weight, neighbour))

        if len(settled) < n:
            return -1   # something never received the signal

        return max(settled.values())
```

---

### Time and space complexity

#### Time: $O(E \log V)$

Each edge can push one entry onto the heap, and each push or pop costs about $\log V$.

#### Space: $O(V + E)$

The adjacency list, the settled map and the heap.

---

### Remember this

Breadth-first search finds shortest paths only when all edges cost the same; with weights you need Dijkstra, which expands the nearest unsettled node instead of the oldest. A node popped with the smallest distance is final, because any other route runs through something at least as far away, and that argument requires non-negative weights. Push duplicates and skip settled nodes on the way out rather than updating the heap. $O(E \log V)$ time.
