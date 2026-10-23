---
id: 3-first-unique-character-in-a-string
title: "387. First Unique Character in a String"
description: "Count everything first, because you cannot judge a letter until the end"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Map</span>

> **Problem Statement:** You are given a string `s`. Find the first character that appears exactly once and return its position. If every character repeats, return `-1`.

```text
Input:  s = "loveleetcode"
Output: 2
```

---

### Picture it

Here is the awkward part of this problem. Standing on a character, you cannot tell whether it is unique.

The `l` at the very start looks unique when you meet it, because nothing before it repeats. But there is another `l` further along, which you have not reached yet. No amount of care at position `0` can tell you that.

So no single pass can answer the question at the moment it is asked. You have to finish reading before you can judge anything, which means the work splits in two: find out the counts, then find the first one that is `1`.

---

### How to think about it

**Pass one counts.** Walk the string and tally how many times each character appears. At the end of this pass you know everything about repetition, but nothing about order.

**Pass two finds the position.** Walk the string again from the start, and the first character whose tally is `1` is the answer. Return its index.

The second pass has to walk the **string**, not the tally. This is the detail that catches people out. The tally knows which characters are unique, but it does not reliably know which one came first, and the question asks for a position in the string. Walking the string in order is what makes "first" mean what the problem wants.

If the second pass finishes without finding a count of `1`, every character repeats, so return `-1`.

---

### Walking through the example

Take `s = "loveleetcode"`.

**Pass one** produces these tallies: `l` twice, `o` twice, `v` once, `e` four times, `t` once, `c` once, `d` once.

**Pass two** walks the string from the left:

1. **Position `0`** holds `l`, counted twice. Keep going.
2. **Position `1`** holds `o`, counted twice. Keep going.
3. **Position `2`** holds `v`, counted once. That is the answer, so return `2`.

Notice that `t`, `c` and `d` are unique too. They lose only because `v` sits further left, which is exactly why the second pass has to follow the string's own order.

---

### The code

```python
from collections import Counter

class Solution:
    def firstUniqChar(self, s: str) -> int:
        counts = Counter(s)

        # walk the string, not the counter, because position decides the winner
        for i, ch in enumerate(s):
            if counts[ch] == 1:
                return i

        return -1
```

---

### Time and space complexity

#### Time: $O(n)$

Two passes over the string. The first builds the tally, one dictionary update per character. The second reads the tally, one lookup per character. Neither gets slower as the tally grows, so the total is two sweeps of `n`, which is $O(n)$.

Two passes is not worse than one in any way that matters here. Both are linear, and the constant in front does not change the shape of the growth.

#### Space: $O(k)$

The tally holds one entry per distinct character, where `k` is the alphabet size. For lowercase English letters that caps out at 26 entries regardless of how long the string is, so it behaves as $O(1)$.

---

### Remember this

You cannot judge a character until you have read the whole string, so count first and search second. The search must walk the string rather than the tally, because the question asks for the first position, not just any unique character. $O(n)$ time, $O(k)$ space for the alphabet.
