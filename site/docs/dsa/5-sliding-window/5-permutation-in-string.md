---
id: 5-permutation-in-string
title: "567. Permutation in String"
description: "A permutation is an anagram, so slide a fixed window and stop at the first match"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fixed Window</span>

> **Problem Statement:** You are given two strings `s1` and `s2`. Return `true` if any rearrangement of `s1` appears as a stretch inside `s2`.

```text
Input:  s1 = "ab", s2 = "eidbaooo"
Output: true
```

---

### Picture it

Strip the wording back. A permutation of `s1` is a rearrangement of its letters, which is exactly what an anagram is. And for one to appear *inside* `s2`, it has to occupy a stretch of `s2` of exactly the same length as `s1`.

So the question is: does any window of width `len(s1)` in `s2` hold the same letters, in the same quantities, as `s1`?

That is a fixed-width window being dragged along `s2`, with a letter count compared at each stop. Unlike the "find all anagrams" version of this problem, you are not collecting positions, so you can stop at the first match and return.

---

### How to think about it

Count the letters of `s1` once. That is the target and it never changes.

Count the letters of the first window of `s2`. Then drag the window one step at a time. Each step adds the letter arriving on the right and removes the letter leaving on the left, which keeps the counts current with two updates instead of a recount.

Compare after every step. The first time the counts match, return `true`. If the window runs off the end without a match, return `false`.

Two practical points:

**Delete zero counts.** When a letter's count reaches zero, remove the entry instead of leaving a zero sitting there, so the comparison between the two counters is reliable across Python versions.

**Return early if `s1` is longer than `s2`.** There is no window to place, so the answer is immediately `false`.

There is a further refinement interviewers sometimes want: rather than comparing the counters at each step, keep a tally of how many letters currently have exactly the right count, and nudge that tally as the two updates happen. The window matches when all 26 letters agree. It makes each step genuinely constant rather than a 26-way comparison, though for this input size the difference is small.

---

### Walking through the example

Take `s1 = "ab"` and `s2 = "eidbaooo"`, so the window is two wide and the target is one `a` and one `b`.

1. **Window `ei`.** No `a`, no `b`. No match.
2. **Slide:** `d` in, `e` out. Window `id`. No match.
3. **Slide:** `b` in, `i` out. Window `db`. It has the `b` but not the `a`. No match.
4. **Slide:** `a` in, `d` out. Window `ba`. One `a` and one `b`, which matches the target exactly. Return `true`.

The remaining `ooo` is never examined, because the answer was already settled.

---

### The code

```python
from collections import Counter

class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        width = len(s1)
        if width > len(s2):
            return False

        need = Counter(s1)
        window = Counter(s2[:width])

        if window == need:
            return True

        for right in range(width, len(s2)):
            # one letter in on the right
            window[s2[right]] += 1

            # one letter out on the left
            leaving = s2[right - width]
            window[leaving] -= 1
            if window[leaving] == 0:
                del window[leaving]

            if window == need:
                return True

        return False
```

---

### Time and space complexity

#### Time: $O(n)$

The window makes one pass along `s2`, and each stop costs two counter updates and a comparison over at most 26 letters. That is a constant per position, so the total tracks the length of `s2`.

Returning at the first match often makes it far less in practice, though the worst case is a string with no permutation anywhere in it.

#### Space: $O(1)$

Two counters, each capped at one entry per letter of the alphabet.

---

### Remember this

A permutation is an anagram, and an anagram has the same length, so this is a fixed-width window dragged along `s2`. Update the counts with one letter in and one out, compare, and return at the first match. Delete counts that reach zero. $O(n)$ time, $O(1)$ space.
