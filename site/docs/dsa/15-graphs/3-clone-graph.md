---
id: 3-clone-graph
title: "133. Clone Graph"
description: "A map from old node to new node is both the memo and the cycle guard"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">DFS / BFS Hash Map</span>

> **Problem Statement:** Given one node of a connected undirected graph, return a deep copy of the whole graph. Every node has a value and a list of neighbours.

```text
Input:  adjList = [[2,4],[1,3],[2,4],[1,3]]
Output: an identical graph made of entirely new nodes
```

---

### Picture it

Copying a tree is easy, because you can never arrive anywhere twice. A graph has cycles, so a naive copy walks round a cycle forever, making a fresh copy of the same node on each lap.

The fix is a single dictionary: **old node to its copy**.

Before copying a node, look it up. If it is already in the dictionary, the copy exists, so hand that back rather than making another. If it is not, make the copy, record it **immediately**, and only then deal with its neighbours.

That dictionary does two jobs at once. It stops the infinite walk, and it guarantees that two different nodes pointing at the same neighbour end up pointing at the same copy, which is what makes the result a faithful duplicate rather than a tree-shaped unrolling of the graph.

---

### How to think about it

Walk the graph depth-first.

For a node:

1. **Already in the dictionary?** Return the stored copy.
2. **Make a copy** holding the same value, with no neighbours yet.
3. **Record it in the dictionary before recursing.** This is the critical ordering.
4. **For each neighbour**, copy it recursively and append the result to the new node's neighbour list.

Step three has to happen before step four. If the node is recorded only after its neighbours are done, then a cycle coming back to it finds nothing in the dictionary, makes a second copy, and the recursion never ends.

Making the copy with an **empty** neighbour list first, then filling it, is what allows the node to be recorded before its neighbours exist.

Handle an empty input explicitly: a `None` node should give `None` back, not a crash.

---

### Walking through the example

The graph is a square: node `1` joins `2` and `4`, node `2` joins `1` and `3`, and so on.

1. **Start at node 1.** Not in the dictionary, so create copy `1'` and record it. Now copy its neighbours.
2. **Neighbour 2.** Not recorded, so create `2'` and record it. Its neighbours are `1` and `3`.
   - **Node 1** is already recorded, so `1'` is returned at once. This is where the cycle would otherwise have spun.
   - **Node 3** is new, so create `3'`, record it, and copy its neighbours `2` and `4`. Node `2` is recorded, giving `2'`. Node `4` is new, so create `4'` and copy its neighbours `1` and `3`, both already recorded.
3. **Back at node 1**, its second neighbour `4` is now recorded, so `4'` comes straight from the dictionary.

Four nodes created, each exactly once, with the links among the copies mirroring the original.

---

### The code

```python
class Solution:
    def cloneGraph(self, node: "Node") -> "Node":
        if not node:
            return None

        copies = {}   # original node -> its copy

        def clone(original):
            if original in copies:
                return copies[original]   # already done, and this breaks cycles

            copy = Node(original.val)
            copies[original] = copy       # record BEFORE visiting neighbours

            for neighbour in original.neighbors:
                copy.neighbors.append(clone(neighbour))

            return copy

        return clone(node)
```

---

### Time and space complexity

#### Time: $O(V + E)$

Every node is created once, thanks to the dictionary, and every edge is followed once from each of its ends.

#### Space: $O(V)$

The dictionary holds one entry per node, plus recursion depth that can reach the number of nodes on a long chain. The copied graph itself is the output.

---

### Remember this

Keep a dictionary from each original node to its copy. It prevents the infinite walk round a cycle **and** makes shared neighbours share a copy, which is what a deep copy means. Create the copy with an empty neighbour list and record it before recursing, since recording afterwards leaves cycles unguarded. $O(V + E)$ time, $O(V)$ space.
