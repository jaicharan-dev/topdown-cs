---
id: 6-reorganize-string
title: "767. Reorganize String"
description: "Max-heap greedy character interleaving with single-step cooldown"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy / Max-Heap</span>

> **Problem Statement:** Given a string `s`, rearrange its characters so that no two adjacent characters are identical. Return any valid rearrangement, or return `""` if no such arrangement is possible.

```text
Input:  s = "aab"
Output: "aba"
Explanation: Alternating characters ensures no two adjacent characters are identical.
```

---

### The Intuitive Mental Model

Imagine laying tiles on a checkered board. To prevent identical colors from touching, you must prioritize placing your most dominant color first, interleaving it with other colors.

#### The Impossibility Threshold (Pigeonhole Principle)

If any single character appears strictly more than `(len(s) + 1) // 2` times, no valid arrangement exists. For example, in a string of length 4 (`"aaab"`), the maximum slots `'a'` can occupy without touching is $\lceil 4 / 2 \rceil = 2$. Having 3 `'a'`s guarantees at least two must sit adjacent, so we can return `""` immediately.

#### Brute Force: Generating Permutations

A naive approach generates all permutations of the string and scans each for adjacent duplicates. Because a string of length $N$ has $N!$ permutations, this brute-force approach requires $O(N! \cdot N)$ time, which becomes infeasible for strings longer than 10 characters.

#### Optimal Approach: Max-Heap with Single-Step Cooldown

To interleave characters greedily:
1. Maintain a Max-Heap of character frequencies `[-freq, char]`.
2. Pop the character with the highest remaining frequency and append it to the result.
3. Crucially, do not push it back into the heap immediately. If its frequency is still highest, it would be popped right back on the next cycle, creating adjacent duplicates.
4. Instead, hold it in a temporary `prev` cooldown variable.
5. On the subsequent iteration, pop a different character from the heap, and only then return `prev` to the heap.

```
s = "aab"
Counts: {'a': 2, 'b': 1}
Max-Heap: [(-2, 'a'), (-1, 'b')]

Iteration 1:
  Pop 'a' (remaining: 1) -> Append 'a' -> Result: ['a']
  Hold in cooldown: prev = (-1, 'a')

Iteration 2:
  Pop 'b' (remaining: 0) -> Append 'b' -> Result: ['a', 'b']
  Push prev (-1, 'a') back into heap!
  prev = None (since 'b' reached 0)

Iteration 3:
  Pop 'a' (remaining: 0) -> Append 'a' -> Result: ['a', 'b', 'a']
  prev = None

Output: "aba"
```

#### Execution Walkthrough

Let `s = "aab"` with character counts `{'a': 2, 'b': 1}`:

| Step | Popped Character | Action Taken | Result String | Cooldown State (`prev`) | Next Heap State |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `'a'` (count 2) | Append `'a'`, hold remaining 1 in `prev` | `"a"` | `(-1, 'a')` | `[(-1, 'b')]` |
| **2** | `'b'` (count 1) | Append `'b'`, re-enqueue `prev`, count for `'b'` reaches 0 | `"ab"` | `None` | `[(-1, 'a')]` |
| **3** | `'a'` (count 1) | Append `'a'`, count reaches 0 | `"aba"` | `None` | `[]` |

---

### Step-by-Step Algorithm

1. **Count Frequencies:** Compute `counts = Counter(s)`.
2. **Impossibility Guard:** Check if `max(counts.values()) > (len(s) + 1) // 2`. If so, return `""`.
3. **Build Max-Heap:** Construct `max_heap = [[-freq, char] for char, freq in counts.items()]` and call `heapq.heapify(max_heap)`.
4. **Interleave via Cooldown:**
   - Initialize `prev = None` and `result = []`.
   - While `max_heap`:
     - Pop `freq, char = heapq.heappop(max_heap)`.
     - Append `char` to `result`.
     - If `prev` is not `None`: push `prev` back into `max_heap` and set `prev = None`.
     - Decrement the count (by incrementing negative `freq += 1`). If `freq != 0`, set `prev = [freq, char]`.
5. **Return Result:** Return `"".join(result)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Max-Heap with Cooldown" default>

```python
from collections import Counter
import heapq


class Solution:
    def reorganizeString(self, s: str) -> str:
        counts = Counter(s)
        max_freq = max(counts.values())

        # Mathematical impossibility check
        if max_freq > (len(s) + 1) // 2:
            return ""

        # Max-heap storing [-frequency, character]
        max_heap: list[list] = [[-freq, char] for char, freq in counts.items()]
        heapq.heapify(max_heap)

        prev: list | None = None
        result: list[str] = []

        while max_heap:
            freq, char = heapq.heappop(max_heap)
            result.append(char)

            # Re-enqueue the previously held character back into circulation
            if prev:
                heapq.heappush(max_heap, prev)
                prev = None

            # Decrement usage (freq is negative, so adding 1 moves towards 0)
            freq += 1
            if freq != 0:
                prev = [freq, char]

        return "".join(result)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Parity Bucket Placement">

```python
from collections import Counter


class Solution:
    def reorganizeString(self, s: str) -> str:
        counts = Counter(s)
        max_freq = max(counts.values())

        if max_freq > (len(s) + 1) // 2:
            return ""

        # Sort characters by frequency descending
        sorted_chars = sorted(counts.keys(), key=lambda c: counts[c], reverse=True)

        res = [""] * len(s)
        idx = 0

        # Place the most frequent characters on even indices first, then odd
        for char in sorted_chars:
            for _ in range(counts[char]):
                if idx >= len(s):
                    idx = 1
                res[idx] = char
                idx += 2

        return "".join(res)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Permutation Search** | $O(N! \cdot N)$ | $O(N)$ | Evaluates all permutations. Factorial complexity is completely impractical. |
| **Max-Heap Interleaving** | $O(N \log K)$ | $O(K) = O(1)$ | Greedily pops highest frequency elements with a 1-step delay. For 26 English letters, $\log 26 \le 5$, running in linear time. |
| **Parity Placement** | $O(N)$ | $O(N)$ | Sorts character frequencies and populates even positions followed by odd positions in a single pass. |

---

### Common Pitfall: Pushing Characters Directly Back Into the Heap

A common mistake is pushing a decremented character back onto the heap immediately. If that character had a high count, it will immediately float back to the root of the heap and be popped on the very next cycle, producing consecutive duplicate characters. Stashing it in a 1-step `prev` buffer guarantees that an alternative character must be selected before this character can be chosen again.

---

### Concise Interview Takeaway

Verify feasibility up front using the pigeonhole condition `max_freq <= (len(s) + 1) // 2`. Greedily extract the most frequent character using a Max-Heap while buffering the previous character in a 1-step cooldown variable to prevent adjacent collisions in $O(N)$ time.
