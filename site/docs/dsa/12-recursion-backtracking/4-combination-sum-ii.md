---
id: 4-combination-sum-ii
title: "40. Combination Sum II"
description: "Single-use elements with sibling duplicate pruning and early loop termination"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Duplicate Pruning</span>

> **Problem Statement:** Given a collection of candidate numbers `candidates` (which may contain duplicates) and a target number `target`, find all unique combinations in `candidates` where the candidate numbers sum to `target`. Each number in `candidates` may only be used once in the combination. The solution set must not contain duplicate combinations.

```text
Input:  candidates = [10, 1, 2, 7, 6, 1, 5], target = 8
Output: [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
Explanation: Each number may only be used once. Duplicate combinations are not included.
```

---

### The Intuitive Mental Model

Combination Sum II synthesizes two classic backtracking challenges:
- Like Combination Sum, we aim to hit an exact sum `target` by deducting candidate values.
- Like Subsets II, the input array contains duplicate numbers, and each individual element index can only be used once.

For candidates `[1, 1, 2, 5, 6, 7, 10]` and target `8`:
- We can legitimately form `[1, 1, 6]` because there are two distinct `'1'` elements in the input.
- We must not form `[1, 7]` twice (once using the first `'1'` and once using the second `'1'`).

#### Brute Force: Post-Processing with a Hash Set
Generate all combinations by recursing with `i + 1`, sort each collected combination, and insert it into a hash set to eliminate duplicates. While functionally correct, this wastes substantial runtime exploring identical subtrees and consumes extra memory storing duplicate combinations in set collections.

#### Optimal Approach: Sort and In-Flight Sibling Pruning
Sort the candidates ascending upfront. This enables two critical optimizations:
1. **Early loop termination:** If `candidates[i] > remain`, we can break immediately. Because the array is sorted, no subsequent candidate can possibly fit.
2. **Sibling duplicate pruning:** In the choice loop, if `i > start and candidates[i] == candidates[i - 1]`, skip that candidate with `continue`. Exploring `candidates[i]` at this position would spawn an identical subtree of choices that was already evaluated when we processed `candidates[start]`.
3. **Single-use advancement:** Recurse with `i + 1` so that each element index is consumed at most once.

#### Execution Walkthrough

Let us trace sorted `candidates = [1, 1, 2]`, `target = 3`:

| Step | Remaining Target | `start` | Loop Index `i` | Candidate | Condition / Decision | Path (`combo`) | Result Collected |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: | :--- |
| **1** | `3` | `0` | `0` | `1` (first) | Pick candidate | `[1]` | `[]` |
| **2** | `2` | `1` | `1` | `1` (second) | Pick candidate | `[1, 1]` | `[]` |
| **3** | `1` | `2` | `2` | `2` | $2 > 1$: break loop | `[1, 1]` | `[]` |
| **4** | `2` | `1` | `1` | Backtrack | Pop second `1` | `[1]` | `[]` |
| **5** | `2` | `1` | `2` | `2` | Pick candidate | `[1, 2]` | `[]` |
| **6** | `0` | `3` | - | - | Base case: target hit! | `[1, 2]` | `[[1, 2]]` |
| **7** | `3` | `0` | `0` | Backtrack | Pop first `1` | `[]` | `[[1, 2]]` |
| **8** | `3` | `0` | `1` | `1` (second) | `i > start` and `1 == 1`: skip | `[]` | `[[1, 2]]` |
| **9** | `3` | `0` | `2` | `2` | Pick candidate | `[2]` | `[[1, 2]]` |
| **10** | `1` | `3` | - | - | Loop range exhausted | `[2]` | `[[1, 2]]` |
| **11** | `3` | `0` | `2` | Backtrack | Pop `2` | `[]` | `[[1, 2]]` |

---

### Step-by-Step Algorithm

1. **Sort Upfront:** Sort `candidates` ascending to cluster duplicates and enable early breaks.
2. **Initialize Containers:** Create `result = []` and `combo = []`.
3. **Define Backtrack Helper:** Define `backtrack(remain, start)` where `remain` is the remaining target and `start` is the earliest eligible candidate index.
4. **Base Case Check:** If `remain == 0`, append a copy of `combo` to `result` and return.
5. **Iterate Eligible Candidates:** For `i` from `start` to `len(candidates) - 1`:
   - If `candidates[i] > remain`, `break` out of the loop (all subsequent candidates are even larger).
   - If `i > start and candidates[i] == candidates[i - 1]`, `continue` (skip sibling duplicates at the current recursion level).
   - Append `candidates[i]` to `combo`.
   - Recurse: `backtrack(remain - candidates[i], i + 1)` (advance to `i + 1` for single-use).
   - Backtrack: pop `candidates[i]` from `combo`.
6. **Trigger and Return:** Call `backtrack(target, 0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Backtracking with Duplicate Pruning" default>

```python
class Solution:
    def combinationSum2(self, candidates: list[int], target: int) -> list[list[int]]:
        result: list[list[int]] = []
        combo: list[int] = []

        # Sort upfront to cluster duplicates and enable early loop breaks
        candidates.sort()

        def backtrack(remain: int, start: int) -> None:
            # Target reached
            if remain == 0:
                result.append(combo.copy())
                return

            for i in range(start, len(candidates)):
                # Early break: all subsequent candidates will exceed remain
                if candidates[i] > remain:
                    break

                # Sibling duplicate pruning: skip identical choices at the same depth
                if i > start and candidates[i] == candidates[i - 1]:
                    continue

                combo.append(candidates[i])
                # Advance to i + 1: each element instance can only be used once
                backtrack(remain - candidates[i], i + 1)
                combo.pop()

        backtrack(target, 0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Hash Set Deduplication">

```python
class Solution:
    def combinationSum2(self, candidates: list[int], target: int) -> list[list[int]]:
        candidates.sort()
        seen: set[tuple[int, ...]] = set()
        combo: list[int] = []

        def backtrack(remain: int, start: int) -> None:
            if remain == 0:
                seen.add(tuple(combo))
                return

            for i in range(start, len(candidates)):
                if candidates[i] > remain:
                    break

                combo.append(candidates[i])
                backtrack(remain - candidates[i], i + 1)
                combo.pop()

        backtrack(target, 0)
        return [list(t) for t in seen]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Hash Set Deduplication** | $O(2^n)$ | $O(2^n)$ | Explores redundant sibling branches and hashes combinations into a set. High auxiliary memory overhead. |
| **Backtracking with Duplicate Pruning** | $O(2^n)$ | $O(n)$ | Sorts upfront in $O(n \log n)$ and skips sibling duplicates in-flight. Minimal $O(n)$ recursion stack space. |

---

### Common Pitfall: Confusing i > start with i > 0

A common mistake is writing `if i > 0 and candidates[i] == candidates[i - 1]: continue`. This incorrectly prunes identical elements across different recursion depths. For example, in `candidates = [1, 1, 2]`, it would prevent taking the second `1` as a child of the first `1`, missing the valid combination `[1, 1]`.

The condition must be `i > start`. This ensures that identical values are allowed down the recursion tree (different depths), but skipped as parallel sibling choices at the same depth.

---

### Concise Interview Takeaway

For **Combination Sum II**, sort candidates upfront to enable both early loop termination via `break` and sibling deduplication via `if i > start and candidates[i] == candidates[i - 1]: continue`. Advance to `i + 1` on recursive calls to ensure each element is used at most once.
