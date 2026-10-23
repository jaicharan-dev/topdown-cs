---
id: 13-cheapest-flights-within-k-stops
title: "787. Cheapest Flights Within K Stops"
description: "Relax every edge once per allowed hop, from a frozen copy of the previous round"
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bellman-Ford</span>

> **Problem Statement:** Cities are joined by one-way flights with prices. Given a start, a destination and a limit of `k` stops in between, return the cheapest fare, or `-1` if no route qualifies.

```text
Input:  n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],
        src = 0, dst = 3, k = 1
Output: 700
```

---

### Picture it

Dijkstra solves the cheapest-route question, but this problem adds a **limit on hops**, and that breaks it.

The reason is worth understanding. Dijkstra settles a node as soon as it is reached most cheaply, and then never reconsiders it. Here, a cheap route using many hops can be useless while a dearer route using fewer hops is the answer. The cheapest way to reach a city is no longer the whole story: how many hops it took matters too.

So think in **rounds** instead. After one round, you know the cheapest fare reachable in one flight. After two rounds, in two flights. Running `k + 1` rounds, since `k` stops means `k + 1` flights, gives exactly what is asked for.

Each round goes through every flight once and asks whether taking it improves the cost of arriving at its destination.

---

### How to think about it

This is Bellman-Ford with the round count capped.

Hold an array of the best known cost to reach each city, starting at infinity except for the source at zero. Then repeat `k + 1` times:

1. **Take a frozen copy** of the current costs.
2. For each flight, if the copy shows its origin as reachable, see whether going from there beats the destination's current cost, and improve it if so.

**The copy is the crux.** Without it, a flight improved earlier in the same round could be used again later in that same round, letting one round cover two hops and allowing routes with more stops than the limit. Reading from a frozen snapshot and writing to the live array keeps every round worth exactly one flight.

That subtlety is the whole reason this problem is interesting, and it is where almost every wrong answer comes from.

At the end, return the destination's cost, or `-1` if it is still infinity.

---

### Walking through the example

Starting at city `0`, heading to city `3`, with `k = 1`, so two rounds.

**Round one.** From the frozen costs, only city `0` is reachable at `0`. The flight `0 -> 1` costs `100`, so city `1` becomes `100`. No other flight starts from a reachable city.

**Round two.** The frozen copy shows city `0` at `0` and city `1` at `100`.

- `0 -> 1` offers `100`, no improvement.
- `1 -> 2` offers `200`, so city `2` becomes `200`.
- `1 -> 3` offers `700`, so city `3` becomes `700`.

Rounds are done, so the answer is `700`.

Note the route `0 -> 1 -> 2 -> 3` costs only `400`, which is cheaper, but it uses two stops and the limit is one. The frozen copy is what kept round two from finding it: city `2` only became reachable **during** round two, so no flight leaving it could be used until round three.

---

### The code

```python
class Solution:
    def findCheapestPrice(self, n: int, flights: list[list[int]],
                          src: int, dst: int, k: int) -> int:
        INF = float("inf")
        cost = [INF] * n
        cost[src] = 0

        # k stops means k + 1 flights, so k + 1 rounds
        for _ in range(k + 1):
            # frozen, so each round is worth exactly one flight
            previous = cost[:]

            for u, v, price in flights:
                if previous[u] != INF and previous[u] + price < cost[v]:
                    cost[v] = previous[u] + price

        return cost[dst] if cost[dst] != INF else -1
```

---

### Time and space complexity

#### Time: $O(k \cdot E)$

Each of the `k + 1` rounds walks every flight once.

#### Space: $O(n)$

Two arrays of costs, the live one and the frozen copy.

---

### Remember this

A hop limit breaks Dijkstra, because the cheapest way to reach a city is no longer the only thing that matters. Run `k + 1` rounds of relaxing every edge instead, and read each round from a **frozen copy** of the previous costs, or one round quietly covers several hops and routes exceeding the limit sneak in. $O(k \cdot E)$ time, $O(n)$ space.
