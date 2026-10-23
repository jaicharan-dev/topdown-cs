---
id: 4-find-all-anagrams-in-a-string
title: "438. Find All Anagrams in a String"
description: "A window of fixed width, updated by one letter in and one letter out"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fixed Window</span>

> **Problem Statement:** You are given two strings `s` and `p`. Find every position in `s` where an anagram of `p` begins, and return those positions in any order.

```text
Input:  s = "cbaebabacd", p = "abc"
Output: [0, 6]
```

---

### Picture it

An anagram of `p` has exactly the same letters in the same quantities as `p`, so it also has exactly the same **length**. That is the detail that shapes the whole solution: the window never changes size.

Lay a window of width `len(p)` over the start of `s`, count the letters inside it, and compare those counts with the counts of `p`. Match means you have found an anagram. Then shove the window one step right and compare again.

The only question is how to keep the window's letter counts up to date without recounting them from scratch each time.

---

### How to think about it

Sliding one step changes exactly two things. One letter enters on the right, and one letter leaves on the left. Everything between them is untouched.

So maintain the counts incrementally: add one for the entering letter, subtract one for the leaving letter. That is two updates per position rather than a fresh count of the whole window, which is the difference between a fast solution and a slow one.

**Remove counts that fall to zero.** When a letter's count drops to zero, delete the entry rather than leaving a zero behind. A counter holding "zero `e`" is not necessarily considered equal to one with no `e` at all, depending on the version of Python, and deleting it keeps the comparison honest everywhere.

The comparison itself looks expensive but is not. Two counters over lowercase letters can differ in at most 26 entries, so each comparison is a fixed amount of work no matter how long the strings are.

If `p` is longer than `s` there is nowhere for a window to sit, so return an empty list straight away.

---

### Walking through the example

Take `s = "cbaebabacd"` and `p = "abc"`, so the window is three wide and the target counts are one each of `a`, `b` and `c`.

1. **Window `cba` at position `0`.** One each of `a`, `b`, `c`. That matches, so record position `0`.
2. **Slide:** `e` enters, `c` leaves. The window is `bae`, which has an `e` and no `c`. No match.
3. **Slide:** `b` enters, `b` leaves. The window is `aeb`. Still an `e` in there. No match.
4. **The next few slides** keep carrying that `e` or dropping letters the target needs, so nothing matches.
5. **Window `bac` at position `6`.** One each again, so record position `6`.
6. **The last slides** bring in `d`, which `p` does not contain at all, so they fail.

The answer is `[0, 6]`.

---

### The code

```python
from collections import Counter

class Solution:
    def findAnagrams(self, s: str, p: str) -> list[int]:
        width = len(p)
        if width > len(s):
            return []

        need = Counter(p)
        window = Counter(s[:width])
        out = [0] if window == need else []

        for right in range(width, len(s)):
            # one letter in on the right
            window[s[right]] += 1

            # one letter out on the left
            leaving = s[right - width]
            window[leaving] -= 1
            if window[leaving] == 0:
                del window[leaving]

            if window == need:
                out.append(right - width + 1)

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

The window slides `n` times, and each slide is two counter updates plus one comparison. The comparison touches at most 26 letters, which is a constant, so the work per step does not grow with the input.

Recounting the whole window at each position instead would multiply everything by the width of `p`, which is the version to avoid.

#### Space: $O(1)$

Two counters, each holding at most one entry per letter of the alphabet. Neither grows with the length of `s`.

---

### Remember this

An anagram has the same length as the pattern, so the window is fixed width and only ever slides. Update the counts with one letter in and one letter out rather than recounting, and delete counts that reach zero so the comparison stays reliable. $O(n)$ time, $O(1)$ space.
