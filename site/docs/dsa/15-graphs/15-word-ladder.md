---
id: 15-word-ladder
title: "127. Word Ladder"
description: "Words are nodes, one-letter changes are edges, and the shortest chain is a level count"
sidebar_position: 15
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Breadth-First Search</span>

> **Problem Statement:** Given a start word, an end word and a dictionary, change one letter at a time so that every word along the way is in the dictionary. Return the number of words in the shortest such chain, or `0` if there is none.

```text
Input:  beginWord = "hit", endWord = "cog",
        wordList = ["hot","dot","dog","lot","log","cog"]
Output: 5
```

---

### Picture it

There is no graph in the input, which is what makes this problem hard to recognise. Build one in your head:

- **Nodes** are words.
- **An edge** joins two words that differ by exactly one letter.

Then "the shortest chain of changes" is the shortest path, and every edge costs the same, so breadth-first search is the right tool. No weights means no need for Dijkstra.

The answer counts **words**, not steps, so a chain of four changes contains five words. Starting the level count at one rather than zero handles that.

---

### How to think about it

The part that decides whether this passes or times out is **how neighbours are found**.

The obvious way is to compare the current word against every word in the dictionary and keep those differing in one position. With `N` words of length `L` that is `N × L` work per word examined, and it is too slow on a large dictionary.

The better way is to generate the neighbours instead of searching for them. For each of the `L` positions, try all 26 letters and check whether the resulting word is in the dictionary. That is `26 × L` work per word, which does not grow with the dictionary at all. Hold the dictionary in a set so each check is instant.

The rest is a standard level-by-level breadth-first search, with the queue measured before draining, exactly as in Level Order Traversal. Remove each word from the set as it is queued: it doubles as the visited marker and stops the same word being queued from several places on the same level.

If the end word is not in the dictionary at all, there is no chain, which is worth checking before starting.

---

### Walking through the example

From `"hit"` to `"cog"`, with the dictionary `hot, dot, dog, lot, log, cog`.

1. **Level 1 holds `hit`.** Changing each position gives `hot` as the only dictionary word. Queue it.
2. **Level 2 holds `hot`.** Its dictionary neighbours are `dot` and `lot`. Queue both.
3. **Level 3 holds `dot` and `lot`.** From `dot` comes `dog`; from `lot` comes `log`. Queue both.
4. **Level 4 holds `dog` and `log`.** From either, changing the first letter gives `cog`, which is the target.

Reaching it on level 5 means the chain is `hit, hot, dot, dog, cog`: five words.

---

### The code

```python
from collections import deque
import string

class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        words = set(wordList)

        if endWord not in words:
            return 0

        queue = deque([beginWord])
        length = 1   # the chain counts words, so it starts at one

        while queue:
            for _ in range(len(queue)):
                word = queue.popleft()

                if word == endWord:
                    return length

                # generate neighbours rather than scanning the dictionary
                for i in range(len(word)):
                    for ch in string.ascii_lowercase:
                        candidate = word[:i] + ch + word[i + 1:]

                        if candidate in words:
                            words.remove(candidate)   # also marks it visited
                            queue.append(candidate)

            length += 1

        return 0
```

---

### Time and space complexity

#### Time: $O(N \cdot L^2)$

Each of the `N` words is dequeued at most once. For each, `L` positions times 26 letters produces candidates, and building each candidate string costs `L`. The 26 is a constant, which leaves `L` squared per word.

The scan-the-dictionary version is $O(N^2 \cdot L)$, which is the difference between passing and timing out.

#### Space: $O(N \cdot L)$

The set of words and the queue.

---

### Remember this

Nothing in the input looks like a graph, so build one: words are nodes and one-letter differences are edges. Equal weights mean breadth-first search, and each level is one word of the chain, counted from one because words are counted rather than changes. Generate neighbours by trying 26 letters in each position instead of scanning the dictionary, and remove words from the set as you queue them to mark them visited.
