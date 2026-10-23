---
id: 4-longest-palindromic-substring
title: "5. Longest Palindromic Substring"
description: "Stand at every centre and push outwards while the letters agree"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Expand Around Center</span>

> **Problem Statement:** Given a string, return its longest stretch that reads the same forwards and backwards.

```text
Input:  s = "babad"
Output: "bab", or "aba", either is accepted
```

---

### Picture it

Every palindrome is built outwards from a **centre**. Start at the middle and the letters match in pairs as you walk away from it in both directions.

So instead of testing stretches, try every centre and push outwards while the letters on each side agree. The moment they disagree, or you run off an end, that centre has given everything it has.

There is one wrinkle. A palindrome of odd length has a single letter at its centre, like `aba`. One of even length has a gap between two letters, like `abba`. Both kinds have to be tried, which gives `2n - 1` centres rather than `n`.

```text
"babad"
 centres: b, ba, a, ab, b, ba, a, ad, d     single letters and gaps
```

---

### How to think about it

Write one helper that takes a left and a right starting point and pushes them apart while the characters match and both stay inside the string. It returns the stretch it managed to cover.

Then loop over the positions, calling it twice: once with left and right both on the position, for odd lengths, and once with right one further along, for even lengths. Keep the longest result.

Track the answer as a **start position and a length** rather than slicing out a string at every centre. Slicing inside the loop quietly adds a factor of the string length to the running time.

This sits in the dynamic programming block, and the textbook solution here really is a table saying whether each start-and-end pair is a palindrome, filled using the fact that a stretch is a palindrome when its ends match and its inside is one. That is correct and costs $O(n^2)$ memory. Expanding around centres computes the same information in the same time with no table at all, so it is the version to write.

---

### Walking through the example

Take `s = "babad"`.

1. **Centre at position 0, `b`.** Pushing out immediately runs off the left end, so the best here is `b`, length `1`.
2. **Centre at position 1, `a`.** Left is `b`, right is `b`, which match, giving `bab`. Pushing again runs off the left end. Length `3`, a new best.
3. **Gap between positions 1 and 2, `a` and `b`.** They differ, so nothing.
4. **Centre at position 2, `b`.** Left is `a`, right is `a`, giving `aba`, length `3`. It ties the best rather than beating it, so the earlier one is kept.
5. **The remaining centres** give nothing longer.

The answer is `bab`, with `aba` equally valid.

---

### The code

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        best_start, best_len = 0, 0

        def expand(left: int, right: int) -> None:
            nonlocal best_start, best_len

            while left >= 0 and right < len(s) and s[left] == s[right]:
                left -= 1
                right += 1

            # the loop stepped one too far on each side
            length = right - left - 1
            if length > best_len:
                best_start, best_len = left + 1, length

        for i in range(len(s)):
            expand(i, i)        # odd length, a single letter at the centre
            expand(i, i + 1)    # even length, a gap at the centre

        return s[best_start:best_start + best_len]
```

The `- 1` in the length, and the `+ 1` in the start, correct for the final step that failed the match.

---

### Time and space complexity

#### Time: $O(n^2)$

There are `2n - 1` centres, and each can expand up to `n` positions. The worst case is a string of identical characters, where every centre expands the whole way.

#### Space: $O(1)$

Two numbers for the answer. The table version costs $O(n^2)$ for the same running time, which is why expanding is preferred.

Manacher's algorithm solves this in $O(n)$, and is worth naming as the theoretical best while being far too intricate to write under interview conditions.

---

### Remember this

Palindromes grow outwards from a centre, so try all `2n - 1` of them, single letters for odd lengths and gaps for even, and push out while the ends agree. Track a start and a length rather than slicing inside the loop. The table solution is equally fast but costs $O(n^2)$ memory, so expanding around centres is the better answer.
