---
id: 4-rotting-oranges
title: "994. Rotting Oranges"
description: "Start every rotten orange at once, and each breadth-first level is one minute"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Multi-Source BFS</span>

> **Problem Statement:** A grid holds empty cells, fresh oranges and rotten ones. Each minute, every fresh orange touching a rotten one, up, down, left or right, turns rotten. Return the minutes until none are fresh, or `-1` if some never rot.

```text
Input:  grid = [[2,1,1], [1,1,0], [0,1,1]]
Output: 4
```

---

### Picture it

Rot spreads one step per minute from **every** rotten orange simultaneously. That is the shape of a breadth-first search, with one twist: it does not start from a single point.

Put every rotten orange into the queue before the search begins. They all sit on level zero, and the search expands them together, so each level of the search is exactly one minute of spreading.

```text
minute 0:  every orange rotten at the start
minute 1:  everything they touch
minute 2:  everything those touch
```

The answer is the number of levels the search completes after the first. Starting from many sources at once is no harder than starting from one, which is the point worth taking away.

---

### How to think about it

**Set up** with one sweep: queue every rotten orange and count the fresh ones.

**Spread** level by level, using the "measure the queue before draining it" technique from Level Order Traversal. For each orange pulled out, look at its four neighbours; each fresh one turns rotten, joins the queue, and reduces the fresh count.

Count a minute only when a level actually rots something. Incrementing on every loop pass gives an answer one too high, because the final level rots nothing and still drains the queue.

**Afterwards**, if the fresh count is above zero, those oranges were unreachable, so return `-1`.

Two edge cases that interviewers test: a grid with **no fresh oranges at all** should answer `0`, which falls out when the fresh count starts at zero; and a fresh orange walled off by empty cells makes the answer `-1`, which the leftover count catches.

Why a search rather than repeated grid sweeps: each orange is queued once and examined once, so the whole thing is one pass over the grid rather than one pass per minute.

---

### Walking through the example

The grid is:

```text
2 1 1
1 1 0
0 1 1
```

Six fresh oranges, and the single rotten one at (0, 0) starts in the queue.

1. **Minute 1.** It rots (0, 1) and (1, 0). Four fresh remain.
2. **Minute 2.** Those rot (0, 2) and (1, 1). Two fresh remain.
3. **Minute 3.** (1, 1) rots (2, 1). One fresh remains.
4. **Minute 4.** (2, 1) rots (2, 2). None remain.

The queue then drains with nothing left to rot, so no fifth minute is counted. The answer is `4`.

---

### The code

```python
from collections import deque

class Solution:
    def orangesRotting(self, grid: list[list[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        queue = deque()
        fresh = 0

        # every rotten orange starts on level zero
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    queue.append((r, c))
                elif grid[r][c] == 1:
                    fresh += 1

        minutes = 0

        while queue and fresh:
            # one level of the search is one minute of spreading
            for _ in range(len(queue)):
                r, c = queue.popleft()

                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc

                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        grid[nr][nc] = 2
                        fresh -= 1
                        queue.append((nr, nc))

            minutes += 1

        return minutes if fresh == 0 else -1
```

The `and fresh` in the loop condition is what stops a final empty minute being counted.

---

### Time and space complexity

#### Time: $O(m \cdot n)$

The setup sweep visits every cell, and each orange is queued and examined once.

#### Space: $O(m \cdot n)$

The queue, which in the worst case holds every cell, such as a grid that is entirely rotten at the start.

---

### Remember this

Rot spreading from many places at once is a breadth-first search with many starting points, which costs nothing extra: queue them all before beginning. Each level of the search is one minute, so drain level by level using the captured queue size. Count a minute only when something actually rots, and use the leftover fresh count to detect the unreachable case. $O(m \cdot n)$ time.
