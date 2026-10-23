---
id: 14-min-cost-to-connect-all-points
title: "1584. Min Cost to Connect All Points"
description: "Grow one connected blob, always adding the cheapest edge that reaches somewhere new"
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Minimum Spanning Tree</span>

> **Problem Statement:** Given points on a plane, connect them all as cheaply as possible, where joining two points costs the Manhattan distance between them.

```text
Input:  points = [[0,0], [2,2], [3,10], [5,2], [7,0]]
Output: 20
```

---

### Picture it

Every pair of points could be joined, so this is a graph where **every** node connects to every other, with the distance as the weight. Connecting everything as cheaply as possible is the minimum spanning tree.

Prim's algorithm builds it by growing a single blob. Start with any one point inside the blob and all the others outside. Then repeat: find the cheapest edge crossing from inside to outside, add it, and the point at its far end joins the blob. Stop when everything is inside.

```text
blob: {A}            cheapest edge out of A       -> add B
blob: {A, B}         cheapest edge out of either  -> add C
```

Each step adds exactly one point, so `n - 1` steps connect everything, which is what a tree on `n` nodes has.

---

### How to think about it

Keep a min-heap of candidate edges, holding the cost to reach a point and the point itself.

Start by pushing the first point at cost zero. Then repeatedly pop the cheapest entry:

- **Already in the blob?** Skip it. The heap collects stale entries, exactly as in Dijkstra.
- **Otherwise** add it to the blob, add the cost to the total, and push an edge to every point still outside, costing the distance from this new point.

When the blob holds every point, the total is the answer.

The resemblance to Dijkstra is close enough to be worth separating clearly:

```text
Dijkstra:  the heap holds distance from the START    (a running total)
Prim:      the heap holds distance from the BLOB     (a single edge)
```

That is the only difference, and it is the whole difference between shortest paths and a minimum spanning tree.

Because every pair is connected, there is no edge list to build. Distances are computed on demand, which keeps the memory down.

**Kruskal's algorithm** is the alternative: sort every edge by weight and add each one whose ends are not already connected, using disjoint set union to tell. It is a natural fit after Redundant Connection, though here it means generating and sorting all `n²` edges, so Prim is the better match for a dense graph like this one.

---

### Walking through the example

The points are `(0,0)`, `(2,2)`, `(3,10)`, `(5,2)`, `(7,0)`.

1. **Start with `(0,0)`** at cost zero. Total `0`.
2. **The cheapest edge out** goes to `(2,2)` at distance `4`. Total `4`.
3. **From the blob**, the cheapest reach is `(5,2)` at distance `3` from `(2,2)`. Total `7`.
4. **Next**, `(7,0)` at distance `4` from `(5,2)`. Total `11`.
5. **Last**, `(3,10)` at distance `9` from `(2,2)`. Total `20`.

All five points are connected for `20`.

---

### The code

```python
import heapq

class Solution:
    def minCostConnectPoints(self, points: list[list[int]]) -> int:
        n = len(points)
        inside = set()
        heap = [(0, 0)]   # (cost to reach it, point index)
        total = 0

        while len(inside) < n:
            cost, i = heapq.heappop(heap)

            if i in inside:
                continue   # a stale entry for a point already added

            inside.add(i)
            total += cost

            # offer an edge from the new point to everything still outside
            xi, yi = points[i]
            for j in range(n):
                if j not in inside:
                    xj, yj = points[j]
                    heapq.heappush(heap, (abs(xi - xj) + abs(yi - yj), j))

        return total
```

---

### Time and space complexity

#### Time: $O(n^2 \log n)$

Each point added pushes up to `n` candidate edges, so the heap sees about `n²` entries, each costing $\log n$ to push or pop.

#### Space: $O(n^2)$

The heap in the worst case. A version that keeps only the best known cost per outside point, rather than every candidate, brings this down to $O(n)$ with $O(n^2)$ time, which is the better choice for a dense graph and worth naming.

---

### Remember this

Connecting everything as cheaply as possible is a minimum spanning tree. Grow one blob and always take the cheapest edge leaving it, skipping points already inside. The difference from Dijkstra is exactly what the heap stores: distance from the start for shortest paths, distance from the blob for a spanning tree. Kruskal with disjoint set union is the alternative, better suited to sparse graphs.
