---
id: 8-word-break
title: "139. Word Break"
description: "A position is reachable if some earlier reachable position leads here by one word"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Subproblem Tabulation</span>

> **Problem Statement:** Given a string and a dictionary, say whether the string can be cut into a sequence of dictionary words. Words may be reused.

```text
Input:  s = "leetcode", wordDict = ["leet", "code"]
Output: true
```

---

### Picture it

Think of the gaps between letters as stepping stones, numbered `0` to `n`. Stone `0` is the start, before any letters, and stone `n` is the end.

You can hop from stone `i` to stone `j` when the letters between them spell a dictionary word. The question becomes: **can you get from stone 0 to stone n?**

```text
"leetcode"
 0    4       8
 |leet|code  |
 stone 0 -> stone 4 -> stone 8
```

So walk the stones from left to right, marking each one reachable or not. A stone is reachable when some earlier reachable stone connects to it by a single word, which is what makes this a build-up rather than a search.

---

### How to think about it

Keep an array of flags, one per stone. Stone `0` is reachable, standing for the empty prefix, which is the seed the whole thing rests on.

For each stone in turn, look back at every earlier stone. If that earlier one is reachable **and** the letters between them form a dictionary word, mark the current one reachable and stop looking, since one route is enough.

The answer is the flag on the last stone.

Two things make the implementation sane. Put the dictionary in a **set** so each word check is instant rather than a scan. And break out of the inner loop on the first success, which does not change the complexity but avoids pointless work.

A useful refinement: the inner loop only needs to look back as far as the longest word in the dictionary, since no single hop can be longer than that. On a long string with short words, that is a large saving.

The recursive version without memoisation is exponential, because the same suffix gets re-tested along every path that reaches it. Building up the flags is exactly the memo, laid out as an array.

---

### Walking through the example

Take `s = "leetcode"` with the dictionary `leet` and `code`. Stone `0` is reachable.

1. **Stones 1 to 3.** Looking back from each, the only reachable earlier stone is `0`, and `l`, `le` and `lee` are not words. All unreachable.
2. **Stone 4.** From stone `0`, the letters are `leet`, which is a word, so stone `4` is reachable.
3. **Stones 5 to 7.** The reachable earlier stones are `0` and `4`. Nothing from `0` is a word, and `c`, `co`, `cod` from stone `4` are not either. All unreachable.
4. **Stone 8.** From stone `4`, the letters are `code`, which is a word. Stone `8` is reachable.

The last stone is reachable, so the answer is `true`.

---

### The code

```python
class Solution:
    def wordBreak(self, s: str, wordDict: list[str]) -> bool:
        words = set(wordDict)
        longest = max(len(w) for w in words) if words else 0

        reachable = [False] * (len(s) + 1)
        reachable[0] = True   # the empty prefix, which seeds everything

        for end in range(1, len(s) + 1):
            # no single word can be longer than the longest in the dictionary
            for start in range(max(0, end - longest), end):
                if reachable[start] and s[start:end] in words:
                    reachable[end] = True
                    break

        return reachable[len(s)]
```

---

### Time and space complexity

#### Time: $O(n \cdot L \cdot k)$

Where `L` is the length of the longest dictionary word and `k` the cost of slicing and hashing a substring. Without the longest-word limit the inner loop runs over every earlier position, making it $O(n^2 \cdot k)$.

#### Space: $O(n)$

The flags, plus the set of words.

---

### Remember this

Treat the gaps between letters as stones and ask whether the last one is reachable. A stone is reachable when some earlier reachable stone connects to it by one dictionary word. Seed stone `0` as reachable for the empty prefix, use a set for instant word checks, and look back no further than the longest word. $O(n)$ space.
