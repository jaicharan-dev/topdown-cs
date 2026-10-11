---
id: 6-gas-station
title: "134. Gas Station"
description: "Find starting circuit station via net gas deficits and greedy reset"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Deficit / Reset</span>

> **Problem Statement:** There are `n` gas stations along a circular route, where the amount of gas at station `i` is `gas[i]` and the cost of gas to travel from station `i` to the next station `i + 1` is `cost[i]`. You have an empty tank. Return the starting gas station's index if you can travel around the circuit once in a clockwise direction, or `-1` if it is impossible. If a valid starting station exists, it is guaranteed to be unique.

```text
Input:  gas = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2]
Output: 3
Explanation:
Start at station 3 with 0 gas. Add 4 gas, cost is 1. Tank = 3.
Travel to station 4. Add 5 gas, cost is 2. Tank = 3 + 5 - 2 = 6.
Travel to station 0. Add 1 gas, cost is 3. Tank = 6 + 1 - 3 = 4.
Travel to station 1. Add 2 gas, cost is 4. Tank = 4 + 2 - 4 = 2.
Travel to station 2. Add 3 gas, cost is 5. Tank = 2 + 3 - 5 = 0.
You have returned to station 3, successfully completing the full circuit.
```

---

### The Intuitive Mental Model

Simulating the circular journey from every candidate station requires $O(n^2)$ time. However, two mathematical invariants compress the search into a single linear pass.

#### Brute Force: Simulating Each Starting Station

The brute-force strategy tests every station $i \in [0, n-1]$ as a candidate starting point. For each candidate, it simulates traveling clockwise along the circuit, checking whether the running tank ever dips below zero before returning to $i$. In the worst case, this requires $O(n^2)$ operations, which times out for large circuits.

#### Optimal Approach: Global Balance and Greedy Reset

Two mathematical insights eliminate redundant simulation:

1. **The Global Balance Invariant:**
   If the sum of all gas available along the entire circuit is strictly less than the sum of all travel costs ($\sum \text{gas} < \sum \text{cost}$), the vehicle suffers an inescapable net deficit: return `-1` immediately.
   Conversely, if $\sum \text{gas} \ge \sum \text{cost}$, a valid starting station is mathematically guaranteed to exist.

2. **The Candidate Pruning Rule:**
   Suppose you depart from station $A$ and run out of gas trying to reach station $C$. Could any intermediate station $B$ between $A$ and $C$ ($A < B \le C$) serve as a valid starting station?
   No. When departing $A$, your tank began at 0. Arriving at $B$, your tank was non-negative ($\ge 0$), meaning station $A$ provided a net fuel surplus to assist the leg from $B$ to $C$. If even with that head start the car ran dry at $C$, then starting at $B$ with an empty tank (0) will cause you to stall at or before $C$ as well.

Therefore, every station from $A$ through $C$ can be permanently eliminated. The next viable starting candidate must be $C + 1$.

#### Execution Walkthrough

Let us trace `gas = [1, 2, 3, 4, 5]` and `cost = [3, 4, 5, 1, 2]`:

Global check: `sum(gas) = 15`, `sum(cost) = 15`. Since $15 \ge 15$, a unique solution exists.

| Station ($i$) | `gas[i]` | `cost[i]` | Net Gain (`gas[i] - cost[i]`) | `curr_tank` Before | `curr_tank` After | Condition Met? | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | 1 | 3 | -2 | 0 | -2 | `curr_tank < 0` | Deficit at 0: reset `start_station = 1`, `curr_tank = 0` |
| **1** | 2 | 4 | -2 | 0 | -2 | `curr_tank < 0` | Deficit at 1: reset `start_station = 2`, `curr_tank = 0` |
| **2** | 3 | 5 | -2 | 0 | -2 | `curr_tank < 0` | Deficit at 2: reset `start_station = 3`, `curr_tank = 0` |
| **3** | 4 | 1 | +3 | 0 | +3 | `curr_tank >= 0` | Fuel surplus: maintain `start_station = 3` |
| **4** | 5 | 2 | +3 | +3 | +6 | `curr_tank >= 0` | Fuel surplus: maintain `start_station = 3` |

The surviving candidate is index `3`.

---

### Step-by-Step Algorithm

1. **Global Feasibility Check:** If `sum(gas) < sum(cost)`, return `-1` immediately.
2. **Initialize State:** Set `start_station = 0` and `curr_tank = 0`.
3. **Linear Scan:** For each index `i` from `0` to `len(gas) - 1`:
   - Add net fuel to tank: `curr_tank += gas[i] - cost[i]`.
   - If `curr_tank < 0`:
     - Discard all candidates up to `i`: set `start_station = i + 1`.
     - Reset fuel tank: set `curr_tank = 0`.
4. **Return Candidate:** Return `start_station`. Because global gas is sufficient, the final remaining candidate is guaranteed to complete the entire circular route.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Greedy Deficit Reset" default>

```python
class Solution:
    def canCompleteCircuit(self, gas: list[int], cost: list[int]) -> int:
        # If total gas is less than total cost, completing the circuit is impossible
        if sum(gas) < sum(cost):
            return -1

        start_station = 0
        curr_tank = 0

        # Find starting station by resetting whenever running tank dips below 0
        for i in range(len(gas)):
            curr_tank += gas[i] - cost[i]

            # If we cannot reach station i + 1 from current start_station
            if curr_tank < 0:
                start_station = i + 1
                curr_tank = 0

        return start_station
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Circuit Simulation">

```python
class Solution:
    def canCompleteCircuit(self, gas: list[int], cost: list[int]) -> int:
        n = len(gas)

        for start in range(n):
            tank = 0
            possible = True

            for step in range(n):
                idx = (start + step) % n
                tank += gas[idx] - cost[idx]
                if tank < 0:
                    possible = False
                    break

            if possible:
                return start

        return -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Circuit Simulation** | $O(n^2)$ | $O(1)$ | Simulates circular travel starting from each index. Inefficient quadratic runtime on large circuits. |
| **Greedy Deficit Reset** | $O(n)$ | $O(1)$ | Verifies global feasibility and eliminates failed prefixes in a single pass. Optimal time and space. |

---

### Common Pitfall: Re-verifying Circular Wraparound Unnecessarily

A common concern in interviews is whether the surviving `start_station` must be checked to confirm it can successfully wrap around from the end of the array back to `start_station`.

This extra check is unnecessary. Since we already validated that `sum(gas) >= sum(cost)`, any candidate station that successfully reaches the end of the array with a non-negative fuel tank will have accumulated sufficient excess fuel to cover any negative deficits from the beginning of the array.

---

### Concise Interview Takeaway

For Gas Station, first verify global feasibility with `sum(gas) >= sum(cost)`. Then sweep through the array once, tracking running tank fuel. Whenever `curr_tank < 0`, greedily eliminate the entire tested prefix and reset `start_station = i + 1` with `curr_tank = 0`. The single surviving candidate is guaranteed to complete the circuit in $O(n)$ time and $O(1)$ auxiliary space.
