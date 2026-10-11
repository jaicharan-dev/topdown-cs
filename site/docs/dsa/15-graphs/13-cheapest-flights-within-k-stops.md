---
id: 13-cheapest-flights-within-k-stops
title: "787. Cheapest Flights Within K Stops"
description: "Find minimum cost path with at most K stops using Bellman-Ford or BFS"
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bellman-Ford</span>

> **Problem Statement:** There are `n` cities connected by some number of flights. You are given an array `flights` where `flights[i] = [from, to, price]`. You are also given three integers `src`, `dst`, and `k`. Return the cheapest price to travel from `src` to `dst` with at most `k` stops. If no such route exists, return `-1`.

```text
Input:  n = 4, flights = [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], src = 0, dst = 3, k = 1
Output: 700
Explanation: The path 0 -> 1 -> 3 has 1 stop with cost 100 + 600 = 700. The path 0 -> 1 -> 2 -> 3 is cheaper (400) but requires 2 stops, which exceeds k = 1.
```

---

### The Intuitive Mental Model

In standard shortest path algorithms like Dijkstra's, edges are relaxed based purely on cumulative lowest weight without restriction on how many edges are traversed.

Here, we face an explicit constraint: **at most $k$ stops**, which corresponds to **at most $k + 1$ flight segments (edges)**. Standard Dijkstra would greedily explore paths with low costs that might exhaust all $k$ stops too early, potentially starving a slightly pricier path that reaches `dst` in fewer hops.

#### Brute Force: Recursive Backtracking / Exhaustive DFS
The direct approach is to explore all paths starting from `src` using DFS, incrementing the stop count at each hop. Whenever `stops > k`, the path is abandoned. In dense networks, exploring all candidate routes takes exponential time $O(V^k)$, quickly exceeding reasonable execution limits.

#### Optimal Approach: Bellman-Ford with Frozen Snapshot
Bellman-Ford is fundamentally structured around edge counts:
- In standard Bellman-Ford, relaxing all edges $V - 1$ times discovers shortest paths using at most $V - 1$ edges.
- Each relaxation pass corresponds to adding at most **one additional edge** to paths discovered so far.
- Running exactly **$k + 1$ relaxation rounds** naturally computes the cheapest routes utilizing at most $k + 1$ edges.

To prevent an edge chain (such as $A \to B \to C \to D$) from propagating multiple hops in a single relaxation pass, we must freeze a snapshot of prices from the previous round before evaluating any flights.

#### Execution Walkthrough

Let us trace $n = 3$, `flights = [[0, 1, 100], [1, 2, 100], [0, 2, 500]]`, `src = 0`, `dst = 2`, `k = 1`:

| Round | Flight Evaluated | Source Price `prices[u]` | New Cost to `v` | `temp_prices` Snapshot | Notes |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **Initial** | - | - | - | `[0, inf, inf]` | City `src = 0` initialized to 0 |
| **Round 1 (1 edge)** | `0 -> 1` (100) | 0 | 100 | `[0, 100, inf]` | Discovers 1-hop flight to 1 |
| **Round 1 (1 edge)** | `0 -> 2` (500) | 0 | 500 | `[0, 100, 500]` | Discovers direct flight to 2 |
| **Round 2 (2 edges)** | `1 -> 2` (100) | 100 | $100 + 100 = 200$ | `[0, 100, 200]` | Discovers 2-hop route to 2 with lower cost |

Algorithm terminates after $k + 1 = 2$ rounds. Final cheapest price to `dst = 2` is $200$.

---

### Step-by-Step Algorithm

1. **Initialize Price Array:** Allocate `prices = [float('inf')] * n` and set `prices[src] = 0`.
2. **Execute $k + 1$ Relaxation Rounds:** Loop `_` across $k + 1$ iterations:
   - Create a copy: `temp_prices = prices.copy()`.
   - For each flight `u, v, price` in `flights`:
     - If `prices[u] != float('inf')`:
       - If `prices[u] + price < temp_prices[v]`:
         - `temp_prices[v] = prices[u] + price`
   - Commit the round: `prices = temp_prices`.
3. **Return Destination Price:**
   - If `prices[dst] != float('inf')`, return `int(prices[dst])`.
   - Otherwise, return `-1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bellman-Ford (Snapshot Relaxation)" default>

```python
class Solution:
    def findCheapestPrice(self, n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:
        # Distance array tracking the minimum cost to reach each city
        prices = [float("inf")] * n
        prices[src] = 0

        # At most k stops implies at most k + 1 flights (edges)
        for _ in range(k + 1):
            # Take a snapshot of prices from the previous round
            temp_prices = prices.copy()

            for u, v, price in flights:
                # If departure city u was reachable in preceding rounds
                if prices[u] != float("inf"):
                    temp_prices[v] = min(temp_prices[v], prices[u] + price)

            # Update prices for the next iteration
            prices = temp_prices

        return int(prices[dst]) if prices[dst] != float("inf") else -1
```

  </TabItem>
  <TabItem value="bfs" label="Alternative: Modified BFS (Level Queue)">

```python
from collections import deque

class Solution:
    def findCheapestPrice(self, n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:
        adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
        for u, v, price in flights:
            adj[u].append((v, price))

        # min_cost[city] tracks cheapest cost discovered so far
        min_cost = [float("inf")] * n
        min_cost[src] = 0

        # Queue stores tuples of (city, current_cost, stops)
        queue: deque[tuple[int, int, int]] = deque([(src, 0, 0)])

        while queue:
            city, cost, stops = queue.popleft()

            if stops > k:
                continue

            for neighbor, price in adj[city]:
                next_cost = cost + price
                if next_cost < min_cost[neighbor]:
                    min_cost[neighbor] = next_cost
                    queue.append((neighbor, next_cost, stops + 1))

        return int(min_cost[dst]) if min_cost[dst] != float("inf") else -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Bellman-Ford (Snapshot)** | $O((k + 1) \cdot E)$ | $O(n)$ | Strictly limits edge counts by executing exactly $k + 1$ rounds over all flights. Minimal memory footprint. |
| **Modified BFS** | $O((k + 1) \cdot E)$ | $O(V + E)$ | Prunes paths using a cost table; traverses level-by-level up to $k + 1$ stops. |

---

### Common Pitfall: Modifying Prices In-Place During the Same Round

If you update the distance array directly instead of reading from a frozen snapshot of the prior round, a single round can cascade multiple flight hops (e.g. relaxing $u \to v$ and immediately using the newly reduced cost at $v$ to relax $v \to w$). This violates the $k$-stops limit by chaining multiple edges within a single round.

---

### Concise Interview Takeaway

At most $k$ stops corresponds to at most $k + 1$ edges. Run Bellman-Ford for exactly $k + 1$ rounds using a cloned snapshot of prices per iteration to prevent hop leakage, achieving optimal $O((k + 1) \cdot E)$ runtime with $O(n)$ space.
