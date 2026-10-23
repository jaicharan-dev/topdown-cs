---
id: 2-longest-repeating-character-replacement
title: "424. Longest Repeating Character Replacement"
description: "Keep the most common letter and ask whether changing the rest fits the budget"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** You are given a string `s` of uppercase letters and a budget `k`. You may change up to `k` characters into any other letters. Find the length of the longest stretch you can turn into a single repeated letter.

```text
Input:  s = "AABABBA", k = 1
Output: 4
```

---

### Picture it

Take any stretch of the string. If you were going to turn it into one repeated letter, which letter would you pick?

Whichever one already appears the most, obviously. Every other character in that stretch has to be changed, and the most common letter leaves you the fewest changes to make.

So for a stretch to be achievable:

```text
characters that must change = length of the stretch - count of its most common letter
```

and that number has to be within `k`. Otherwise the stretch costs more changes than you are allowed, and it is out of reach.

---

### How to think about it

Slide a window along, keeping a count of each letter inside it.

Stretch the right edge forward and add the new letter to the counts. Then test the rule above. If the changes needed exceed `k`, the window is too expensive, so pull the left edge in by one and drop that letter from the counts. Record the best window size you have seen.

**The part that looks wrong.** The usual way to write this keeps a `max_count` that only ever increases, and never recalculates it when the window shrinks. It looks like a bug, because after shrinking, `max_count` may be larger than any letter actually in the window.

It is fine, and here is why. A stale `max_count` can only make the window look *cheaper* than it is, so the window never shrinks when it should have. But the window can only ever record a new best when it **grows**, and it only grows when a genuine letter count rises high enough to allow it. A stale value can keep the window the same size as it slides, but it can never push the answer above a size that was truly achievable.

So the window slides rather than shrinking, which is also what keeps this to a single pass.

---

### Walking through the example

Take `s = "AABABBA"` with `k = 1`.

1. **`A`.** Window `A`, most common count `1`, changes needed `0`. Fits. Best is `1`.
2. **`A`.** Window `AA`, count `2`, changes `0`. Fits. Best is `2`.
3. **`B`.** Window `AAB`, most common is `A` at `2`, changes `1`. Fits the budget exactly. Best is `3`.
4. **`A`.** Window `AABA`, `A` is now `3`, changes `1`. Still fits. Best is `4`.
5. **`B`.** Window `AABAB`, `A` is `3`, length `5`, changes `2`. Over budget, so the left edge moves in, dropping an `A`. The window becomes `ABAB`, length `4`.
6. **`B`** and the final **`A`** carry on sliding, and nothing ever beats `4`.

The answer is `4`, which is `AABA` with its single `B` changed to an `A`.

---

### The code

```python
from collections import defaultdict

class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        counts = defaultdict(int)
        left = 0
        max_count = 0
        best = 0

        for right, ch in enumerate(s):
            counts[ch] += 1
            max_count = max(max_count, counts[ch])

            # everything but the most common letter has to be changed
            if (right - left + 1) - max_count > k:
                counts[s[left]] -= 1
                left += 1

            best = max(best, right - left + 1)

        return best
```

Note the `if` rather than a `while`. The left edge moves at most one step per character, which is what makes the window slide instead of collapsing.

---

### Time and space complexity

#### Time: $O(n)$

Each character enters the window once and leaves at most once. Everything inside the loop is counter arithmetic, which is constant.

#### Space: $O(1)$

The counts hold at most 26 entries, one per uppercase letter, regardless of how long the string is.

---

### Remember this

A stretch is achievable when its length minus the count of its most common letter is within `k`. Slide a window and test exactly that. The high-water `max_count` is deliberately never recalculated: it can only stop the window shrinking, and since a new best requires genuine growth, the answer stays correct. $O(n)$ time, $O(1)$ space.
