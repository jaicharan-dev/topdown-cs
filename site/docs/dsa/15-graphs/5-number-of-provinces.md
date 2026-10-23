---
id: 5-number-of-provinces
title: "547. Number of Provinces"
description: "Number of Islands on a matrix of connections instead of a map"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Connected Components / DSU</span>

> **Problem Statement:** You are given a matrix where entry `i, j` says whether city `i` and city `j` are directly joined. A province is a group of cities all reachable from each other. Count the provinces.

```text
Input:  isConnected = [[1,1,0], [1,1,0], [0,0,1]]
Output: 2
```

---

### Picture it

Strip away the wording and this is Number of Islands again: count the connected groups.

The only difference is the packaging. There, the graph was a grid and a cell's neighbours were the four cells around it. Here, the graph is given as a matrix of connections, and city `i`'s neighbours are every `j` where the entry is `1`.

So the same sweep works. Walk the cities, and each time you meet one that has not been visited, you have found a new province: add one to the count, then visit everything reachable from it so none of those is counted again.

The matrix is a way of writing down the edges, not a map to be walked cell by cell. Reading it that way is what makes this a three-line change from the islands problem.

---

### How to think about it

Keep a set of visited cities and sweep from city `0` upward.

When a city is unvisited, increase the count and start a search. The search marks the city, then looks along its row in the matrix: for every `j` the city connects to that has not been visited, continue from `j`.

Because the connection is mutual, the matrix is symmetric, and the visited set keeps the search from bouncing back and forth between two cities forever.

The diagonal entries are always `1`, since a city connects to itself. They cause no trouble: by the time the search reads its own row, the city is already marked visited, so it is skipped.

**Disjoint set union** is the other standard answer, and it is the one the block's name points at. Start with every city in its own group and merge the two groups behind each connection; the answer is how many groups survive. It is the right tool when connections arrive over time rather than all at once, which is exactly what Redundant Connection and Accounts Merge need later in this block.

---

### Walking through the example

The matrix says city `0` and city `1` are joined, and city `2` stands alone.

1. **City 0** is unvisited, so the count becomes `1` and a search starts. It marks `0`, reads row `0`, and finds a connection to `1`. City `1` is unvisited, so the search moves there, marks it, and reads row `1`, which connects back to `0`, already visited. The search ends.
2. **City 1** is visited by the time the sweep reaches it, so it is skipped.
3. **City 2** is unvisited, so the count becomes `2`. Its row connects only to itself, so the search ends immediately.

The answer is `2`.

---

### The code

```python
class Solution:
    def findCircleNum(self, isConnected: list[list[int]]) -> int:
        n = len(isConnected)
        seen = set()
        count = 0

        def visit(city: int) -> None:
            seen.add(city)

            # the row lists this city's neighbours
            for other in range(n):
                if isConnected[city][other] and other not in seen:
                    visit(other)

        for city in range(n):
            if city not in seen:
                count += 1   # a new province
                visit(city)

        return count
```

---

### Time and space complexity

#### Time: $O(n^2)$

Each city's row is read once during its search, and there are `n` rows of `n` entries. That is forced by the input format: the matrix itself has `n²` entries, so even reading it costs that much, however few connections it describes.

An edge list would allow $O(V + E)$ instead, which matters when the graph is sparse.

#### Space: $O(n)$

The visited set, plus recursion depth up to the number of cities in one province.

---

### Remember this

This is counting connected groups, exactly like Number of Islands, with the graph handed over as a connection matrix rather than a grid. Sweep the cities, count each unvisited one as a new province, and visit everything reachable so the rest of the province is skipped. The $O(n^2)$ cost comes from the matrix format, not the algorithm. Disjoint set union is the alternative, and the right one when edges arrive over time.
