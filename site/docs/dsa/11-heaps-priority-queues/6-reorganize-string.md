---
id: 6-reorganize-string
title: "767. Reorganize String"
description: "Fill the even positions first, so identical letters can never touch"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy / Max-Heap</span>

> **Problem Statement:** Rearrange a string so that no two neighbouring characters are the same. Return any valid arrangement, or an empty string if none exists.

```text
Input:  s = "aab"
Output: "aba"
```

---

### Picture it

First work out when it is impossible, because that bound also shows how to build the answer.

The most common letter has to be spread out with something between each pair of its copies. In a string of length `n` there are only so many positions that can hold it before two are forced to touch:

```text
a _ a _ a       three copies need the string to be at least five long
```

So the most frequent letter can appear at most `(n + 1) / 2` times, rounded down. Any more and no arrangement works.

That bound hints at the construction. The positions `0, 2, 4, ...` are exactly the ones that never touch each other. Fill those first with the most common letter, and it can never collide with itself.

---

### How to think about it

Count the letters and find the most frequent. If its count exceeds `(n + 1) // 2`, return an empty string immediately.

Otherwise, lay the letters into the **even positions first**, then the odd ones, writing each letter's copies consecutively as you go:

1. Start at position `0`.
2. Place every copy of the most frequent letter, stepping forward by two each time.
3. When the index runs off the end, continue from position `1`.
4. Carry on with the other letters, most frequent first, using the same stepping.

Why this never puts two identical letters together: a letter's copies land two apart as long as they are all on the same parity, so they never touch. The only risk is a letter that straddles the switch from even to odd positions, putting a copy at the last even slot and another at position `1`. Placing the most frequent letter first is exactly what prevents that, because the count bound guarantees it fits within the even positions alone, so any letter that does straddle has few enough copies to stay apart.

Sorting the letters by count descending is what makes "most frequent first" true.

**The heap version** does the same thing differently: repeatedly take the two most frequent remaining letters, append one of each, and push them back with their counts reduced. Taking two at a time is what guarantees the next character differs from the last. It is the more common answer in this block, at $O(n \log 26)$.

---

### Walking through the example

Take `s = "aab"`, so `n = 3`.

1. **Counts:** `a` twice, `b` once. The limit is `(3 + 1) // 2 = 2`, and `a` has exactly two, so an arrangement exists.
2. **Place `a`**, the most frequent, at position `0`, then at position `2`. The string so far is `a _ a`.
3. **Next index** would be `4`, which is past the end, so continue from position `1`.
4. **Place `b`** at position `1`.

The result is `aba`.

Had the input been `"aaab"` with `n = 4`, the limit would be `2` while `a` appears three times, so the answer is an empty string.

---

### The code

```python
from collections import Counter

class Solution:
    def reorganizeString(self, s: str) -> str:
        n = len(s)
        counts = Counter(s)

        # the most frequent letter cannot need more slots than exist
        if max(counts.values()) > (n + 1) // 2:
            return ""

        out = [""] * n
        i = 0

        # most frequent first, which is what keeps a letter off both parities
        for ch, count in counts.most_common():
            for _ in range(count):
                if i >= n:
                    i = 1      # even positions are full, start on the odds
                out[i] = ch
                i += 2

        return "".join(out)
```

---

### Time and space complexity

#### Time: $O(n \log 26)$

Counting is one pass. Sorting the counts touches at most 26 entries, which is effectively constant. Placing the letters writes each position once.

#### Space: $O(n)$

The output array. The counter is bounded by the alphabet.

---

### Remember this

Check feasibility first: the most frequent letter may appear at most `(n + 1) // 2` times. Then fill the even positions before the odd ones, placing the most frequent letter first, which guarantees it stays within one parity and so never touches itself. The two-at-a-time max-heap is the other standard answer. $O(n)$ time in practice, $O(n)$ space.
