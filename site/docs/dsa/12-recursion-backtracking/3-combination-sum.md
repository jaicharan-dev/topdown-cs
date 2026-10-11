---
id: 3-combination-sum
title: "39. Combination Sum"
description: "Unbounded choice decision tree with element reuse and target deduction"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Unbounded Backtracking</span>

> **Problem Statement:** Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of `candidates` where the chosen numbers sum to `target`. You may return the combinations in any order. The same number may be chosen from `candidates` an unlimited number of times.

```text
Input:  candidates = [2, 3, 6, 7], target = 7
Output: [[2, 2, 3], [7]]
Explanation: 2 and 3 can be chosen multiple times: 2 + 2 + 3 = 7. Also 7 = 7.
```

---

### The Intuitive Mental Model

Imagine a vending machine where you need to insert exact change totaling `target` (e.g. $7$), and you have an unlimited supply of each coin denomination in `candidates` (e.g. $2, $3, $6, $7).

At each step, we make a choice from available denominations:
1. **Deduct coin value:** When picking a coin `c`, the remaining target shrinks: `remain = target - c`.
2. **Element reuse:** Because coins can be reused indefinitely, after picking `candidates[i]`, we can pick `candidates[i]` again on the very next decision.
3. **Dead ends and targets:**
   - If `remain == 0`: Exact change achieved! Record a snapshot of the combination.
   - If `remain < 0`: Budget exceeded. Abandon this branch and backtrack immediately.

#### Brute Force: Unconstrained Permutation Generation
Exploring every candidate from index `0` at each step produces duplicate permutations such as `[2, 2, 3]`, `[2, 3, 2]`, and `[3, 2, 2]`. To eliminate these duplicates, we enforce an index monotonicity rule: candidate loops only explore indices from `start` to `len(candidates) - 1`. Once our search moves past candidate $2 to consider $3, we never look backward to pick $2 again on that branch.

#### Optimal Approach: Forward Indexing with Early Pruning
By sorting `candidates` ascending upfront, we unlock early loop termination. In the candidate loop, if `candidates[i] > remain`, then because the array is sorted, every subsequent candidate `candidates[i + 1], candidates[i + 2], ...` is guaranteed to exceed `remain` as well. We can immediately `break` out of the loop instead of executing redundant recursive calls.

#### Execution Walkthrough

Let us trace `candidates = [2, 3]`, `target = 7`:

| Step | Remaining Target | Loop Start Index | Candidate Picked | Path (`combo`) | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `7` | `0` | `2` | `[2]` | Recurse with `remain = 5, start = 0` |
| **2** | `5` | `0` | `2` | `[2, 2]` | Recurse with `remain = 3, start = 0` |
| **3** | `3` | `0` | `2` | `[2, 2, 2]` | Recurse with `remain = 1, start = 0` |
| **4** | `1` | `0` | `2` | `[2, 2, 2]` | $2 > 1$: break loop; backtrack |
| **5** | `3` | `0` | `3` | `[2, 2, 3]` | Recurse with `remain = 0, start = 1` |
| **6** | `0` | `1` | Base case | `[2, 2, 3]` | Exact sum reached! Collect `[2, 2, 3]` |
| **7** | `5` | `0` | `3` | `[2, 3]` | Recurse with `remain = 2, start = 1` |
| **8** | `2` | `1` | `3` | `[2, 3]` | $3 > 2$: break loop; backtrack |
| **9** | `7` | `0` | `3` | `[3]` | Recurse with `remain = 4, start = 1` |
| **10** | `4` | `1` | `3` | `[3, 3]` | Recurse with `remain = 1, start = 1` |
| **11** | `1` | `1` | `3` | `[3, 3]` | $3 > 1$: break loop; backtrack |

---

### Step-by-Step Algorithm

1. **Sort Candidates:** Sort `candidates` ascending to enable early pruning.
2. **Initialize Containers:** Create `result = []` to store valid combinations and `combo = []` for the current path.
3. **Define Backtrack Helper:** Define `backtrack(remain, start)` where `remain` is the remaining target and `start` is the lowest candidate index allowed.
4. **Base Case Check:** If `remain == 0`, append a copy of `combo` to `result` and return.
5. **Iterate with Early Exit:** Loop index `i` from `start` to `len(candidates) - 1`:
   - If `candidates[i] > remain`, `break` the loop (all subsequent candidates are even larger).
   - Append `candidates[i]` to `combo`.
   - Recurse: `backtrack(remain - candidates[i], i)`. Passing `i` permits unlimited reuse of the current candidate.
   - Backtrack: pop `candidates[i]` from `combo`.
6. **Trigger and Return:** Call `backtrack(target, 0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Backtracking with Early Pruning" default>

```python
class Solution:
    def combinationSum(self, candidates: list[int], target: int) -> list[list[int]]:
        result: list[list[int]] = []
        combo: list[int] = []

        # Sort upfront to enable early loop termination
        candidates.sort()

        def backtrack(remain: int, start: int) -> None:
            # Exact sum achieved
            if remain == 0:
                result.append(combo.copy())
                return

            for i in range(start, len(candidates)):
                # Early pruning: candidate exceeds remaining target
                if candidates[i] > remain:
                    break

                combo.append(candidates[i])
                # Pass 'i' (not i + 1) to permit reuse of the current element
                backtrack(remain - candidates[i], i)
                combo.pop()

        backtrack(target, 0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Binary Decision Tree DFS">

```python
class Solution:
    def combinationSum(self, candidates: list[int], target: int) -> list[list[int]]:
        result: list[list[int]] = []
        combo: list[int] = []

        def dfs(i: int, remain: int) -> None:
            if remain == 0:
                result.append(combo.copy())
                return
            if i >= len(candidates) or remain < 0:
                return

            # Branch 1: Include candidates[i] and stay at index i (reuse)
            combo.append(candidates[i])
            dfs(i, remain - candidates[i])

            # Branch 2: Exclude candidates[i] and advance to i + 1
            combo.pop()
            dfs(i + 1, remain)

        dfs(0, target)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Binary Decision Tree DFS** | $O(2^T)$ | $O(T / M)$ | Explores include and exclude choices at each step. Explores branches without sorting, checking `remain < 0` only after branching. |
| **Backtracking with Early Pruning** | $O(N^{T / M})$ | $O(T / M)$ | Sorts upfront in $O(N \log N)$ and breaks loops early. Drastically reduces the effective branching factor. |

*(Where $N$ is the number of candidates, $T$ is the target value, and $M$ is the minimum value in `candidates`.)*

---

### Common Pitfall: Passing i + 1 Instead of i

Passing `i + 1` prohibits reusing the same element, turning the problem into 0/1 knapsack and missing valid answers such as `[2, 2, 3]`. Conversely, resetting `start` back to `0` introduces duplicate permutations (`[2, 3, 2]` and `[3, 2, 2]`). Passing `i` precisely satisfies both requirements: candidates can be picked multiple times without ever scanning backward.

---

### Concise Interview Takeaway

For **Combination Sum**, enforce index monotonicity by passing `i` (not `i + 1`) to allow unlimited reuse of the current candidate while preventing reverse-order permutations. Sort candidates upfront so that whenever `candidates[i] > remain`, you can break immediately out of the choice loop.
