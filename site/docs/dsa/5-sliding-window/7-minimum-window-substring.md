---
id: 7-minimum-window-substring
title: "76. Minimum Window Substring"
description: "Count how many letters are fully stocked, and squeeze while the window still has them all"
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** You are given strings `s` and `t`. Find the shortest stretch of `s` that contains every character of `t`, including repeats. If no such stretch exists, return an empty string.

```text
Input:  s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"
```

---

### Picture it

Think of `t` as a shopping list, with quantities. If `t` is `"AABC"` then you need two `A`, one `B`, one `C`.

Now drag a window along `s`. Everything inside the window is your basket. The window is **valid** when the basket covers the whole shopping list. Extra items are fine, they just make the window longer than it needs to be.

So: reach forward until the basket is complete, then start putting things back from the left for as long as the list is still covered. Every time you have a complete basket, note how wide the window is. The narrowest one wins.

---

### How to think about it

The expensive-looking part is checking "is the basket complete" at every step. Comparing two counts of letters each time would work but is wasteful.

Instead keep a single number: **how many distinct letters are currently fully stocked**. Call it `have`, and compare it with `required`, the number of distinct letters on the list.

It only changes at precise moments:

- **A letter enters** and its count in the window becomes *exactly* what the list asks for. That letter just became fully stocked, so `have` goes up. If its count rises past what is needed, nothing changes, because it was already stocked.
- **A letter leaves** and its count drops *below* what the list asks for. That letter is no longer stocked, so `have` goes down.

When `have` equals `required` the window is valid, and that test is a single comparison.

The structure is then the same two moods as the minimum-subarray problem. Expand on the right until valid, then shrink on the left while still valid, recording the best window on every shrink. Record the window's start and length rather than slicing the string each time, because slicing inside the loop quietly makes the whole thing much slower.

---

### Walking through the example

Take `s = "ADOBECODEBANC"` and `t = "ABC"`, so the list needs one each of `A`, `B` and `C`, and `required` is `3`.

1. **Expand** through `A`, `D`, `O`, `B`, `E`, `C`. At the `C`, all three letters are stocked, so `have` reaches `3`. The window is `ADOBEC`, length `6`. Best so far.
2. **Shrink:** drop the `A`. Now `A` is understocked, `have` falls to `2`, and the window is invalid again. Stop shrinking.
3. **Expand** through `O`, `D`, `E`, `B`, `A`. At that `A`, all three are stocked again. The window is `DOBECODEBA`, length `10`, which is worse than `6`.
4. **Shrink** from the left: `D`, `O`, `B`, `E`, `C` come out one by one. Dropping the `C` makes `C` understocked, so shrinking stops. Along the way the window `CODEBA` of length `6` was seen, which ties but does not beat the best.
5. **Expand** to the final `C`. All three stocked again, and the window is `BANC`, length `4`. New best.
6. **Shrink:** dropping `B` breaks it, so the walk ends.

The answer is `BANC`.

---

### The code

```python
from collections import Counter, defaultdict

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not s or not t:
            return ""

        need = Counter(t)
        required = len(need)

        window = defaultdict(int)
        have = 0

        best_len = len(s) + 1
        best_start = 0
        left = 0

        for right, ch in enumerate(s):
            window[ch] += 1

            # this letter has just reached the amount the list asks for
            if ch in need and window[ch] == need[ch]:
                have += 1

            while have == required:
                if right - left + 1 < best_len:
                    best_len = right - left + 1
                    best_start = left

                leaving = s[left]
                window[leaving] -= 1

                # dropping below the needed amount breaks the window
                if leaving in need and window[leaving] < need[leaving]:
                    have -= 1

                left += 1

        if best_len > len(s):
            return ""

        return s[best_start:best_start + best_len]
```

---

### Time and space complexity

#### Time: $O(m + n)$

Building the shopping list reads `t` once. Then each character of `s` is added by the right edge once and removed by the left edge at most once, with constant work at each step because validity is a single integer comparison rather than a counter comparison.

#### Space: $O(m + n)$

Two dictionaries. The list holds one entry per distinct character of `t`, and the basket holds one per distinct character seen in `s`. Over a fixed alphabet both are capped, so this is often quoted as $O(1)$.

---

### Remember this

Treat `t` as a shopping list with quantities and the window as a basket. Track `have`, the count of letters that are fully stocked, and nudge it only when a count reaches the needed amount or falls below it, so checking validity is one comparison. Expand until valid, shrink while still valid, and record the best start and length rather than slicing as you go. $O(m + n)$ time.
