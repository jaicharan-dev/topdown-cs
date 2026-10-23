---
id: 6-is-graph-bipartite
title: "785. Is Graph Bipartite?"
description: "Paint each node the opposite colour to its neighbour and see if anything clashes"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bipartite Coloring</span>

> **Problem Statement:** Given an undirected graph, say whether its nodes can be split into two groups such that every edge joins a node in one group to a node in the other.

```text
Input:  graph = [[1,2,3],[0,2],[0,1,3],[0,2]]
Output: false
```

---

### Picture it

Splitting into two groups is the same as **colouring with two colours** so that no edge joins two nodes of the same colour.

And with only two colours, nothing is ever a choice. Pick any node, give it red. Every neighbour must be blue. Every neighbour of those must be red. The colour of the starting node is arbitrary, but once chosen, every other colour in that connected piece follows by force.

So walk the graph, painting as you go. One of two things happens: every node gets a colour with no argument, or you reach a node that already has a colour and it is the **wrong** one. That clash means no valid split exists.

---

### How to think about it

Keep a colour for each node, with a third state meaning uncoloured.

Walk from an uncoloured node, painting it, then visit each neighbour:

- **Uncoloured?** Paint it the opposite colour and continue from there.
- **Already coloured the opposite?** Fine, nothing to do.
- **Already coloured the same?** That edge joins two nodes of one colour, so return `false` at once.

Two practical points.

**The graph may be disconnected**, so the outer loop must try every node as a starting point, not just node `0`. A graph can have one piece that colours fine and another that does not.

**A clash means an odd cycle.** Following an even cycle alternates colours and arrives back consistently; following an odd one arrives back on the same colour. So this is really a test for odd cycles, which is the standard characterisation worth being able to state.

Depth-first and breadth-first both work. Breadth-first makes the "levels alternate" picture clearest, since colour is just the level's parity.

---

### Walking through the example

Node `0` joins `1`, `2` and `3`. Node `1` joins `0` and `2`. Node `2` joins `0`, `1` and `3`. Node `3` joins `0` and `2`.

1. **Paint node 0 red.**
2. **Its neighbours must be blue**, so paint `1`, `2` and `3` blue.
3. **Visit node 1.** Its neighbours are `0`, which is red and fine, and `2`, which is **blue**, the same as node `1`.

That is the clash, so the answer is `false`. The culprit is the triangle `0, 1, 2`, which is a cycle of odd length, and a triangle can never be two-coloured.

---

### The code

```python
from collections import deque

class Solution:
    def isBipartite(self, graph: list[list[int]]) -> bool:
        colour = {}

        for start in range(len(graph)):
            if start in colour:
                continue   # already handled with another piece of the graph

            colour[start] = 0
            queue = deque([start])

            while queue:
                node = queue.popleft()

                for neighbour in graph[node]:
                    if neighbour not in colour:
                        colour[neighbour] = 1 - colour[node]   # the opposite
                        queue.append(neighbour)
                    elif colour[neighbour] == colour[node]:
                        return False   # an edge joining one colour to itself

            # the graph may be in several pieces, so the outer loop continues

        return True
```

Writing the opposite colour as `1 - colour[node]` keeps the two states flipping without any branching.

---

### Time and space complexity

#### Time: $O(V + E)$

Each node is coloured once and each edge is inspected once from each end.

#### Space: $O(V)$

The colour map and the queue, both holding at most one entry per node.

---

### Remember this

Two groups means two colours, and with two colours nothing is a choice: paint a node, then every neighbour takes the opposite. A clash on an already-coloured node means the graph is not bipartite, which is the same as saying it contains an odd cycle. Start the walk from every node, because the graph may be in several pieces. $O(V + E)$ time, $O(V)$ space.
