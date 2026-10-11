---
id: 15-word-ladder
title: "127. Word Ladder"
description: "Find shortest transformation sequence length using BFS with intermediate pattern buckets"
sidebar_position: 15
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Breadth-First Search</span>

> **Problem Statement:** Given two words, `beginWord` and `endWord`, and a dictionary of words `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, such that: every adjacent pair of words differs by exactly one letter, and every intermediate word is in `wordList`. If no such sequence exists, return 0.

```text
Input:  beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]
Output: 5
Explanation: The shortest transformation sequence is "hit" -> "hot" -> "dot" -> "dog" -> "cog", which consists of 5 words.
```

---

### The Intuitive Mental Model

We are asked to find the **shortest transformation sequence** from a starting state (`beginWord`) to a destination state (`endWord`), where all edge transitions are unweighted (1 step per letter change). This is fundamentally a shortest-path problem on an implicit graph:
- **Vertices:** Every valid dictionary word plus `beginWord`.
- **Edges:** An edge connects two words if they differ by exactly one character (Hamming distance of 1).
- **Tool of Choice:** Breadth-First Search (BFS) is optimal because it guarantees finding the shortest path in an unweighted graph.

#### Brute Force: Pairwise Graph Construction and BFS
If you construct an adjacency list by comparing every word against every other word in `wordList` to test if they differ by 1 character, pairwise comparison requires $O(N^2 \cdot L)$ string operations where $N$ is dictionary size and $L$ is word length. With $N = 5000$ and $L = 10$, this performs $2.5 \times 10^7$ character checks during graph creation alone.

#### Optimal Approach: BFS with Wildcard Pattern Buckets
Instead of scanning every word against every other word, pre-index dictionary entries into intermediate wildcard pattern buckets:
- For a word like `"hot"` of length 3, generate 3 wildcard patterns: `*ot`, `h*t`, and `ho*`.
- Map each wildcard pattern to all matching dictionary words:
  - `*ot` $\to$ `["hot", "dot", "lot"]`
- When expanding `"hot"` during BFS, generate its 3 wildcard patterns, query the bucket hash map, and immediately discover all legal 1-letter mutation neighbors without scanning the rest of the dictionary.
- Clear each pattern bucket once traversed to avoid redundant scans.

#### Execution Walkthrough

Let us trace `beginWord = "hit"`, `endWord = "cog"`, `wordList = ["hot","dot","dog","lot","log","cog"]`:

| Step | Current Word | Wildcard Patterns Queried | Newly Enqueued Neighbors | Sequence Length (`steps`) | Visited Words |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Initial** | `"hit"` | - | - | 1 | `{"hit"}` |
| **1** | `"hit"` | `*it`, `h*t`, `hi*` | `"hot"` | 2 | `{"hit", "hot"}` |
| **2** | `"hot"` | `*ot`, `h*t`, `ho*` | `"dot"`, `"lot"` | 3 | `{"hit", "hot", "dot", "lot"}` |
| **3** | `"dot"` | `*ot`, `d*t`, `do*` | `"dog"` | 4 | `{"hit", "hot", "dot", "lot", "dog"}` |
| **4** | `"lot"` | `*ot`, `l*t`, `lo*` | `"log"` | 4 | `{"hit", ..., "log"}` |
| **5** | `"dog"` | `*og`, `d*g`, `do*` | `"cog"` | 5 | Target reached! Return 5 |

---

### Step-by-Step Algorithm

1. **Target Pre-check:** If `endWord not in wordList`, return `0` immediately.
2. **Build Wildcard Pattern Buckets:**
   - Initialize `pattern_map: dict[str, list[str]] = defaultdict(list)`.
   - Let $L = \text{len(beginWord)}$.
   - For each `word` in `wordList` and each index $i \in [0, L - 1]$, compute `pattern = word[:i] + "*" + word[i+1:]` and append `word` to `pattern_map[pattern]`.
3. **Initialize BFS Queue:**
   - Seed `queue: deque[tuple[str, int]] = deque([(beginWord, 1)])`.
   - Initialize `visited: set[str] = {beginWord}`.
4. **Execute BFS Traversal:**
   - While `queue` is non-empty:
     - Pop `curr_word, steps = queue.popleft()`.
     - If `curr_word == endWord`, return `steps`.
     - For each position $i \in [0, L - 1]$:
       - Form `pattern = curr_word[:i] + "*" + curr_word[i+1:]`.
       - For each `neighbor` in `pattern_map[pattern]`:
         - If `neighbor not in visited`:
           - Add `neighbor` to `visited`.
           - Append `(neighbor, steps + 1)` to `queue`.
       - Clear `pattern_map[pattern] = []` to prevent redundant neighbor evaluations.
5. **Fallback:** If the queue empties without reaching `endWord`, return `0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Standard BFS with Wildcard Buckets" default>

```python
from collections import deque, defaultdict

class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        # If the destination word is not in the dictionary, no valid ladder exists
        if endWord not in wordList:
            return 0

        L = len(beginWord)

        # Map each intermediate wildcard pattern to matching dictionary words
        pattern_map: dict[str, list[str]] = defaultdict(list)
        for word in wordList:
            for i in range(L):
                pattern = word[:i] + "*" + word[i + 1:]
                pattern_map[pattern].append(word)

        # BFS queue stores tuples of (current_word, sequence_length)
        queue: deque[tuple[str, int]] = deque([(beginWord, 1)])
        visited: set[str] = {beginWord}

        while queue:
            curr_word, steps = queue.popleft()

            # Destination reached: return total words in ladder
            if curr_word == endWord:
                return steps

            # Generate all L generic patterns for curr_word
            for i in range(L):
                pattern = curr_word[:i] + "*" + curr_word[i + 1:]

                for neighbor in pattern_map[pattern]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, steps + 1))

                # Empty the bucket once processed to avoid redundant neighbor scans
                pattern_map[pattern] = []

        return 0
```

  </TabItem>
  <TabItem value="bidirectional" label="Alternative: Bidirectional BFS">

```python
class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        words = set(wordList)
        if endWord not in words:
            return 0

        # Two frontier sets searching toward each other
        begin_set = {beginWord}
        end_set = {endWord}
        visited = {beginWord, endWord}
        length = 1

        while begin_set and end_set:
            # Always expand the smaller frontier to minimize branching factor
            if len(begin_set) > len(end_set):
                begin_set, end_set = end_set, begin_set

            next_set: set[str] = set()
            for word in begin_set:
                for i in range(len(word)):
                    for char_code in range(ord("a"), ord("z") + 1):
                        char = chr(char_code)
                        candidate = word[:i] + char + word[i + 1:]

                        # If candidate touches opposite frontier, shortest path found
                        if candidate in end_set:
                            return length + 1

                        if candidate in words and candidate not in visited:
                            visited.add(candidate)
                            next_set.add(candidate)

            begin_set = next_set
            length += 1

        return 0
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **BFS with Wildcard Buckets** | $O(L^2 \cdot N)$ | $O(L^2 \cdot N)$ | Pre-indexes $L$ patterns per word, enabling direct neighbor lookups during level-order exploration. |
| **Bidirectional BFS** | $O(L \cdot 26 \cdot N^{1/2})$ | $O(N)$ | Searches simultaneously from both ends, significantly reducing exponential search tree expansion. |

---

### Common Pitfall: Pairwise Word Comparisons vs Wildcard Pattern Indexing

Attempting to build the graph by comparing all pairs of words with nested loops costs $O(L \cdot N^2)$ time. For $N = 5000$, $N^2 = 2.5 \times 10^7$ iterations, causing Time Limit Exceeded. Using wildcard patterns or alphabet substitutions limits per-word exploration strictly to $O(L \cdot 26)$ or $O(L^2)$ hash lookups.

---

### Concise Interview Takeaway

Bypass $O(N^2)$ all-pairs comparisons by indexing words into wildcard pattern buckets (`*ot`, `h*t`) or generating single-letter mutations. Explore the transition space using BFS to guarantee the shortest unweighted sequence length in $O(L^2 \cdot N)$ time.
