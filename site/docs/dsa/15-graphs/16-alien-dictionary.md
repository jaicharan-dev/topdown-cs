---
id: 16-alien-dictionary
title: "269. Alien Dictionary"
description: "Each neighbouring pair of words reveals exactly one ordering rule"
sidebar_position: 16
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Topological Sort</span>

> **Problem Statement:** A list of words is sorted according to an unknown alphabet. Work out an ordering of the letters consistent with it, or return an empty string if the list contradicts itself.

```text
Input:  words = ["wrt", "wrf", "er", "ett", "rftt"]
Output: "wertf"
```

---

### Picture it

Two questions have to be answered before any algorithm appears: what are the nodes, and where do the edges come from?

**The nodes are the letters.** That part is quick.

**The edges come from comparing neighbouring words**, and the insight is that a pair of words tells you exactly **one** thing. Compare them position by position; at the first position where they differ, the letter in the earlier word comes first in the alphabet. Everything after that point is unconstrained, because the comparison already ended there.

```text
"wrt" and "wrf"   agree on w, agree on r, differ at t and f
                  so t comes before f, and nothing more
```

Collect one rule per neighbouring pair and you have a graph of "comes before" relations. Producing an order consistent with all of them is a topological sort, exactly as in Course Schedule II.

---

### How to think about it

**Build the graph.** Record every letter as a node, including letters that never appear in any rule, since they still belong in the answer. For each neighbouring pair, find the first differing position and add one edge.

**Watch for the invalid prefix.** If a word is a prefix of the one before it, like `"abc"` followed by `"ab"`, the list is impossible: a shorter word must come first in any sorted ordering. This is the case interviewers check, and nothing else in the algorithm catches it.

**Sort topologically.** Count how many letters each one must come after, queue those with none, and take them one at a time, reducing the counts of what they unlock.

**Check the length.** If the result is shorter than the number of distinct letters, the leftovers depend on each other in a cycle, which means contradictory rules, so return an empty string.

Only **neighbouring** pairs are needed. Comparing every pair would add nothing, because ordering is transitive and the chain of neighbouring comparisons already implies it.

---

### Walking through the example

The words are `wrt, wrf, er, ett, rftt`.

1. **`wrt` and `wrf`** first differ at position 2: `t` comes before `f`.
2. **`wrf` and `er`** differ at position 0: `w` comes before `e`.
3. **`er` and `ett`** differ at position 1: `r` comes before `t`.
4. **`ett` and `rftt`** differ at position 0: `e` comes before `r`.

So the rules are `t -> f`, `w -> e`, `r -> t`, `e -> r`. Only `w` comes after nothing, so it goes first, which frees `e`, then `r`, then `t`, then `f`.

The answer is `wertf`.

Note how little each pair gave: four pairs, four rules, and the letters inside the words beyond the first difference were never used.

---

### The code

```python
from collections import deque, defaultdict

class Solution:
    def alienOrder(self, words: list[str]) -> str:
        unlocks = defaultdict(set)
        after = {ch: 0 for word in words for ch in word}   # every letter counts

        for first, second in zip(words, words[1:]):
            # a word followed by its own prefix cannot be sorted
            if len(first) > len(second) and first.startswith(second):
                return ""

            for a, b in zip(first, second):
                if a != b:
                    if b not in unlocks[a]:
                        unlocks[a].add(b)
                        after[b] += 1
                    break   # only the first difference says anything

        queue = deque(ch for ch in after if after[ch] == 0)
        order = []

        while queue:
            ch = queue.popleft()
            order.append(ch)

            for nxt in unlocks[ch]:
                after[nxt] -= 1
                if after[nxt] == 0:
                    queue.append(nxt)

        # a short answer means the rules contradict each other
        return "".join(order) if len(order) == len(after) else ""
```

Checking `if b not in unlocks[a]` before counting stops a repeated rule inflating the count, which would leave a letter permanently stuck.

---

### Time and space complexity

#### Time: $O(C)$

Where `C` is the total number of characters across all the words. Building the rules reads each neighbouring pair up to its first difference, and the sort is linear in the letters and rules, both bounded by the alphabet.

#### Space: $O(1)$ in practice

The graph holds at most 26 letters and the rules between them, so it does not grow with the input.

---

### Remember this

Letters are the nodes, and each neighbouring pair of words yields exactly one rule, taken at their first differing position, with everything after it meaning nothing. Include letters that appear in no rule, reject a word followed by its own prefix, and finish with a topological sort whose short output signals contradictory rules. Only neighbouring pairs matter, since ordering is transitive.
