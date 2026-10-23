---
id: 6-gas-station
title: "134. Gas Station"
description: "If the tank runs dry, no station in the stretch you just drove could have started it"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Deficit / Reset</span>

> **Problem Statement:** Gas stations sit around a circular route. Station `i` offers `gas[i]` fuel, and driving from it to the next costs `cost[i]`. Starting with an empty tank, return a station you could start from and complete the loop, or `-1` if none exists. Any solution is unique.

```text
Input:  gas = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2]
Output: 3
```

---

### Picture it

Each station has a net value: what it gives you minus what it costs to leave it.

```text
gas:   1   2   3   4   5
cost:  3   4   5   1   2
net:  -2  -2  -2  +3  +3
```

Two facts follow from those nets, and together they solve the problem.

**First, whether any answer exists at all.** If the nets add up to less than zero, the loop burns more fuel than it offers and no starting point can work. If they add to zero or more, a valid start is guaranteed to exist.

**Second, where to look.** Suppose you start somewhere and the tank runs dry when leaving station `k`. Then no station between your start and `k` could have worked either: each of them would have begun with an empty tank where you arrived with a non-negative one, so each would run dry no later than you did. So skip the whole stretch and try again from `k + 1`.

---

### How to think about it

One pass does both jobs.

Carry a **total** of all the nets, which decides whether an answer exists, and a **running tank** since the current candidate start.

At each station add its net to both. If the running tank goes below zero, the current candidate has failed, so set the candidate to the next station and reset the tank to zero.

At the end, return the candidate if the total is not negative, otherwise `-1`.

**Why the surviving candidate is correct**: every station before it has been ruled out by the argument above, and the total being non-negative guarantees some station works. Only one candidate remains unruled-out, so it must be the one. There is no need to drive the loop again to verify.

That argument is what makes this a single pass rather than trying each start in turn, which would be $O(n^2)$.

---

### Walking through the example

The nets are `-2, -2, -2, +3, +3`, and they total `0`, so an answer exists.

1. **Station 0**, net `-2`. The tank is `-2`, below zero, so station `0` fails. The candidate becomes station `1` and the tank resets to `0`.
2. **Station 1**, net `-2`. The tank is `-2` again. The candidate becomes station `2`, tank `0`.
3. **Station 2**, net `-2`. Same again. The candidate becomes station `3`, tank `0`.
4. **Station 3**, net `+3`. The tank is `3`, which is fine.
5. **Station 4**, net `+3`. The tank is `6`.

The total is `0`, which is not negative, so the answer is the surviving candidate, station `3`.

Checking it by hand: starting at `3` with `4` fuel, costing `1` to leave gives `3` remaining; station `4` adds `5` for `8`, costing `2` leaves `6`; station `0` adds `1` for `7`, costing `3` leaves `4`; and so on round the loop without ever running dry.

---

### The code

```python
class Solution:
    def canCompleteCircuit(self, gas: list[int], cost: list[int]) -> int:
        total = 0      # decides whether any answer exists
        tank = 0       # fuel since the current candidate start
        start = 0

        for i in range(len(gas)):
            net = gas[i] - cost[i]
            total += net
            tank += net

            # dry here, so nothing from the candidate up to i can work
            if tank < 0:
                start = i + 1
                tank = 0

        return start if total >= 0 else -1
```

---

### Time and space complexity

#### Time: $O(n)$

One pass. Trying every station as a start and driving the loop each time would be $O(n^2)$.

#### Space: $O(1)$

Three numbers.

---

### Remember this

Work with each station's net, gas minus cost. The nets summing to less than zero means no answer exists at all. When the tank runs dry at some station, every station since the last reset is ruled out together, so jump the candidate past it rather than retrying one at a time. The last surviving candidate is the answer, with no second pass needed. $O(n)$ time, $O(1)$ space.
