---
id: 16-alien-dictionary
title: "269. Alien Dictionary"
description: "Derive character precedence from lexicographical word order using topological sort"
sidebar_position: 16
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Topological Sort</span>

> **Problem Statement:** There is a new alien language that uses the English alphabet. However, the order of the letters is unknown to you. You are given a list of strings `words` from the alien language's dictionary, where the strings are claimed to be sorted lexicographically by the rules of this new language. Return a string of the unique letters in the new alien language sorted in lexicographically-increasing order. If the order is invalid, return `""`. If there are multiple valid orders, return any of them.

```text
Input:  words = ["wrt", "wrf", "er", "ett", "rftt"]
Output: "wertf"
Explanation: From "wrt" and "wrf", we derive 't' < 'f'. From "wrf" and "er", 'w' < 'e'. From "er" and "ett", 'r' < 't'. From "ett" and "rftt", 'e' < 'r'. Topologically sorting these edges yields "wertf".
```

---

### The Intuitive Mental Model

In any dictionary sorted lexicographically, comparing two adjacent words $w_1$ and $w_2$ exposes the exact precedence of characters:
1. Compare $w_1$ and $w_2$ character by character until you discover the **first mismatch**:
   - If $w_1[j] \ne w_2[j]$, then $w_1[j]$ precedes $w_2[j]$ in the alien alphabet ($w_1[j] \to w_2[j]$).
   - Once the first differing letter is identified, **stop comparing** $w_1$ and $w_2$. Subsequent characters have no bearing on the word ordering (e.g. in standard English, "cat" precedes "dog" because `'c'` comes before `'d'`, regardless of `'a'` vs `'o'`).
2. Repeating this comparison across all adjacent pairs $(w_i, w_{i+1})$ constructs a **Directed Graph** of character relationships.

#### Brute Force: Permutation Testing
One could attempt to generate all permutations of the distinct characters found across all words, then verify whether every word in `words` satisfies that ordering. Because there are up to 26 distinct characters, evaluating $26!$ permutations is computationally impossible.

#### Optimal Approach: Directed Graph and Topological Sort (Kahn's Algorithm)
Instead of permutations, we construct a directed graph and resolve the ordering using topological sort:
- **Prefix Guard:** If $w_1$ is strictly longer than $w_2$ and $w_2$ is a prefix of $w_1$ (such as `["apple", "app"]`), the dictionary is corrupted. In valid lexicographical order, a prefix must appear before a longer string. In this case, return `""` immediately.
- **Topological Sorting:**
  - Build an adjacency set and calculate the in-degree of every unique character.
  - Enqueue all characters with an in-degree of 0 into a queue.
  - Dequeue characters into a result list `res`, decrementing the in-degrees of their outgoing neighbors.
  - If a neighbor reaches an in-degree of 0, enqueue it.
  - If `len(res) == total_unique_characters`, return `" ".join(res)`.
  - If `len(res) < total_unique_characters`, a cycle exists (e.g. `'a' -> 'b'` and `'b' -> 'a'`), which represents a contradictory ordering. Return `""`.

#### Execution Walkthrough

Let us trace `words = ["wrt", "wrf", "er", "ett", "rftt"]`:

| Step | Adjacent Word Pair | First Mismatch | Directed Edge Added | In-Degree State | Zero In-Degree Queue |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **Initial** | - | - | - | `{'w': 0, 'e': 0, 'r': 0, 't': 0, 'f': 0}` | `['w']` |
| **1** | `"wrt"` vs `"wrf"` | `'t'` vs `'f'` | `'t' -> 'f'` | `in_degree['f'] = 1` | `['w']` |
| **2** | `"wrf"` vs `"er"` | `'w'` vs `'e'` | `'w' -> 'e'` | `in_degree['e'] = 1` | `['w']` |
| **3** | `"er"` vs `"ett"` | `'r'` vs `'t'` | `'r' -> 't'` | `in_degree['t'] = 1` | `['w']` |
| **4** | `"ett"` vs `"rftt"` | `'e'` vs `'r'` | `'e' -> 'r'` | `in_degree['r'] = 1` | `['w']` |

Topological order resolves as: `'w' -> 'e' -> 'r' -> 't' -> 'f'`, returning `"wertf"`.

---

### Step-by-Step Algorithm

1. **Initialize Data Structures:**
   - Adjacency map: `adj: dict[str, set[str]] = {c: set() for w in words for c in w}`.
   - In-degree table: `in_degree: dict[str, int] = {c: 0 for c in adj}`.
2. **Build Directed Edges:**
   - Loop `i` from $0$ to $\text{len}(words) - 2$:
     - Let `w1 = words[i]` and `w2 = words[i + 1]`.
     - Calculate `min_len = min(len(w1), len(w2))`.
     - *Prefix Check:* If `len(w1) > len(w2)` and `w1[:min_len] == w2[:min_len]`, return `""`.
     - For index $j$ from $0$ to `min_len - 1`:
       - If `w1[j] != w2[j]`:
         - If `w2[j] not in adj[w1[j]]`:
           - `adj[w1[j]].add(w2[j])`
           - `in_degree[w2[j]] += 1`
         - Break (only the first differing character establishes precedence).
3. **Execute Kahn's Algorithm:**
   - Enqueue all characters where `in_degree[c] == 0`.
   - Initialize `res: list[str] = []`.
   - While `queue` is non-empty:
     - Pop `curr = queue.popleft()`, append to `res`.
     - For each `neighbor` in `adj[curr]`:
       - Decrement `in_degree[neighbor] -= 1`.
       - If `in_degree[neighbor] == 0`, append `neighbor` to `queue`.
4. **Cycle Validation:**
   - If `len(res) == len(in_degree)`, return `"".join(res)`.
   - Otherwise, return `""` indicating an invalid cyclic dependency.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Kahn's Algorithm (BFS Topological Sort)" default>

```python
from collections import deque

class Solution:
    def alienOrder(self, words: list[str]) -> str:
        # Initialize graph structures for every unique character
        adj: dict[str, set[str]] = {c: set() for w in words for c in w}
        in_degree: dict[str, int] = {c: 0 for c in adj}

        # 1. Compare adjacent words to deduce character ordering
        for i in range(len(words) - 1):
            w1, w2 = words[i], words[i + 1]
            min_len = min(len(w1), len(w2))

            # Guard against invalid prefix order: e.g. "apple" before "app"
            if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
                return ""

            for j in range(min_len):
                if w1[j] != w2[j]:
                    # Add directed edge: w1[j] -> w2[j]
                    if w2[j] not in adj[w1[j]]:
                        adj[w1[j]].add(w2[j])
                        in_degree[w2[j]] += 1
                    break  # Stop after the first differing character

        # 2. Seed Kahn's BFS with characters having 0 incoming prerequisites
        queue: deque[str] = deque([c for c in in_degree if in_degree[c] == 0])
        res: list[str] = []

        while queue:
            curr = queue.popleft()
            res.append(curr)

            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # 3. If result contains all unique characters, no cycle existed
        return "".join(res) if len(res) == len(in_degree) else ""
```

  </TabItem>
  <TabItem value="dfs" label="Alternative: Post-Order DFS Topological Sort">

```python
class Solution:
    def alienOrder(self, words: list[str]) -> str:
        adj: dict[str, set[str]] = {c: set() for w in words for c in w}

        # 1. Build directed graph
        for i in range(len(words) - 1):
            w1, w2 = words[i], words[i + 1]
            min_len = min(len(w1), len(w2))

            if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
                return ""

            for j in range(min_len):
                if w1[j] != w2[j]:
                    adj[w1[j]].add(w2[j])
                    break

        visited: dict[str, bool] = {}  # False = in stack, True = fully visited
        result: list[str] = []

        def dfs(c: str) -> bool:
            if c in visited:
                return visited[c]

            visited[c] = False  # Mark as currently visiting
            for neighbor in adj[c]:
                if not dfs(neighbor):
                    return False

            visited[c] = True  # Mark as finalized
            result.append(c)
            return True

        for c in adj:
            if not dfs(c):
                return ""

        return "".join(reversed(result))
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Kahn's Algorithm (BFS)** | $O(C)$ | $O(1)$ or $O(U)$ | Derives dependencies in a single pass over characters $C$ and sorts via queue. Detects cycles naturally via count. |
| **Post-Order DFS** | $O(C)$ | $O(1)$ or $O(U)$ | Traverses dependencies using recursion call stack; reverses post-order result. Cycle detection via tri-color states. |

---

### Common Pitfall: Missing the Prefix Inversion Edge Case

If a longer word precedes its own prefix in the dictionary (e.g. `["apple", "app"]`), no character mismatch will be encountered during the first `min_len` characters. However, this is an invalid ordering according to lexicographical conventions. Failing to explicitly check `len(w1) > len(w2) and w1[:min_len] == w2[:min_len]` causes algorithms to miss this invalid input and return an incorrect alphabet.

---

### Concise Interview Takeaway

Compare adjacent words to locate the first mismatching character, validate against prefix inversions, and apply Kahn's topological sort to derive the alphabet ordering while detecting cyclic contradictions in $O(C)$ time where $C$ is the total character count.
