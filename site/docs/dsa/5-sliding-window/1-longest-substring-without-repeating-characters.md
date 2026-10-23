---
id: 1-longest-substring-without-repeating-characters
title: "3. Longest Substring Without Repeating Characters"
description: "When a repeat appears, jump the left edge past where that character last sat"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** You are given a string `s`. Find the length of the longest stretch of it that contains no repeated characters.

```text
Input:  s = "abcabcbb"
Output: 3
```

---

### Picture it

Hold a window over the string, and keep one promise about it: no character inside it appears twice.

Stretch the right edge forward one character at a time. As long as the promise holds, the window grows and you note its size. The moment the new character is already inside the window, the promise breaks, and the only way to restore it is to pull the left edge forward until the old copy of that character is outside.

The window never shrinks for any other reason, and both edges only ever move right.

---

### How to think about it

The question when a repeat appears is how far to pull the left edge. Moving it one step at a time works, but there is no need: you can jump it straight to the position just after the old copy, because anything before that still contains the duplicate.

To do that you need to know where that old copy was, so keep a dictionary of each character and the position it was last seen at.

One guard matters enormously. The dictionary remembers every character ever seen, including ones that have already fallen out behind the left edge. If a character's last position is **behind** the left edge, it is not in the window at all and the promise is not broken, so the left edge must stay where it is.

Without that check the left edge can jump backwards, the window grows wider than it should, and the answer comes out too large. The fix is to move the left edge only when the remembered position is at or after it.

---

### Walking through the example

Take `s = "abcabcbb"`, with the window starting empty at position `0`.

1. **`a`, `b`, `c`** are all new. The window is `abc`, length `3`. That is the best so far.
2. **`a` at position `3`** was last seen at position `0`, which is inside the window. Jump the left edge to `1`. The window is `bca`, still length `3`.
3. **`b` at position `4`** was last seen at `1`, inside the window. Jump the left edge to `2`. The window is `cab`, length `3`.
4. **`c` at position `5`** was last seen at `2`. Jump the left edge to `3`. The window is `abc`, length `3`.
5. **`b` at position `6`** was last seen at `4`. Jump the left edge to `5`. The window is `cb`, length `2`.
6. **`b` at position `7`** was last seen at `6`. Jump the left edge to `7`. The window is `b`, length `1`.

The longest the window ever reached was `3`.

---

### The code

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last_seen = {}
        left = 0
        best = 0

        for right, ch in enumerate(s):
            # only jump if the old copy is actually inside the window
            if ch in last_seen and last_seen[ch] >= left:
                left = last_seen[ch] + 1

            last_seen[ch] = right
            best = max(best, right - left + 1)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

The right edge visits every character once. The left edge only ever jumps forward and never passes the right edge, so across the whole run it also moves at most `n` times. Everything else is a dictionary read or write.

#### Space: $O(k)$

The dictionary holds one entry per distinct character, where `k` is the alphabet size. For ASCII that is a fixed ceiling no matter how long the string is, so it behaves as $O(1)$.

---

### Remember this

Keep a window with no repeats, stretching it rightward. When the incoming character is already inside, jump the left edge to just past the old copy rather than stepping it along. Only jump when the remembered position is at or after the left edge, or the window will grow backwards and the answer will be too big. $O(n)$ time, $O(k)$ space.
