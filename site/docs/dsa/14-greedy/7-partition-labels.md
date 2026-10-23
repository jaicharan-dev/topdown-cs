---
id: 7-partition-labels
title: "763. Partition Labels"
description: "A part cannot close before the last appearance of every letter inside it"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Interval Expansion / Two-Pass</span>

> **Problem Statement:** Cut a string into as many parts as possible so that no letter appears in more than one part. Return the sizes of the parts in order.

```text
Input:  s = "ababcbacadefegdehijhklij"
Output: [9, 7, 8]
```

---

### Picture it

Every letter owns a stretch of the string, from where it first appears to where it last appears. For a part to be valid, it has to contain each of its letters' stretches **entirely**, otherwise that letter would also show up in a later part.

So walk forward with a part open, and keep a deadline: the furthest last-appearance of any letter seen so far inside this part.

```text
"ababcbaca..."
 a last appears at 8, so meeting an 'a' pushes the deadline to 8
 b last appears at 5, which is already inside, so nothing changes
```

Every new letter can push the deadline further out. When you finally arrive **at** the deadline, every letter in this part has finished, so the part can close.

---

### How to think about it

Two passes.

**First**, record the last position of every letter. One sweep, 26 entries at most, and this is what makes the deadline available immediately.

**Second**, walk the string holding the start of the current part and the deadline. At each position, stretch the deadline to include this letter's last appearance. When the position equals the deadline, record the part's size, and start the next part at the following position.

The greedy claim is that closing **as soon as the deadline is met** is right. Closing earlier would split some letter across two parts, which is not allowed. Closing later would merge two valid parts into one, giving fewer parts when the problem asks for as many as possible. So the first legal moment is always the correct one.

Note the resemblance to the interval problems: each letter is really an interval from first to last appearance, and a part is a group of overlapping ones merged together. The difference is that the intervals arrive in order of their starts for free, so no sorting is needed.

---

### Walking through the example

Take `s = "ababcbacadefegdehijhklij"`.

1. **Position 0 holds `a`**, whose last appearance is at `8`. The deadline becomes `8`.
2. **Positions 1 to 7** hold `b`, `a`, `b`, `c`, `b`, `a`, `c`. The last `b` is at `5` and the last `c` is at `7`, both already inside, so the deadline stays `8`.
3. **Position 8 holds `a`**, and the position now equals the deadline. Close the part: it runs from `0` to `8`, a size of `9`.
4. **Position 9 holds `d`**, last at `14`, so the new deadline is `14`. The letters `e`, `f` and `g` follow, with `e` last at `15`, pushing the deadline to `15`.
5. **Position 15** meets the deadline, closing a part of size `7`.
6. **The rest**, `hijhklij`, has its furthest last appearance at the end of the string, giving a part of size `8`.

The answer is `[9, 7, 8]`.

---

### The code

```python
class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        # where each letter appears for the last time
        last = {ch: i for i, ch in enumerate(s)}

        out = []
        start = 0
        deadline = 0

        for i, ch in enumerate(s):
            # this part cannot end before this letter does
            deadline = max(deadline, last[ch])

            if i == deadline:
                out.append(i - start + 1)
                start = i + 1

        return out
```

Building the `last` dictionary by simple assignment works because later positions overwrite earlier ones, leaving each letter mapped to its final appearance.

---

### Time and space complexity

#### Time: $O(n)$

Two passes over the string, each doing constant work per character.

#### Space: $O(1)$

The dictionary holds at most one entry per letter of the alphabet, which does not grow with the length of the string.

---

### Remember this

Each letter spans from its first to its last appearance, and a part must contain those spans whole. Record every letter's last position first, then sweep holding a deadline that each new letter can push further out, closing the part the moment the position reaches it. Closing at the first legal moment is what maximises the number of parts. $O(n)$ time, $O(1)$ space.
