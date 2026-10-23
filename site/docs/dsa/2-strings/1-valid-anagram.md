---
id: 1-valid-anagram
title: "242. Valid Anagram"
description: "Count the letters of one word, then let the other word spend them"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Frequency Array</span>

> **Problem Statement:** You are given two strings `s` and `t`. Return `true` if `t` is an anagram of `s`, meaning it uses exactly the same letters the same number of times, just in a different order.

```text
Input:  s = "anagram", t = "nagaram"
Output: true
```

---

### Picture it

Anagrams are not about order at all. They are about stock.

Imagine the first word hands you a basket: three `a`, one `g`, one `m`, one `n`, one `r`. Now the second word walks through and takes one letter out of the basket for each letter it contains. If it ever reaches for a letter that is not there, the words cannot be anagrams. If it empties the basket exactly, they are.

---

### How to think about it

Sorting both strings and comparing them works, and it is a single line of code. It is a perfectly good answer, but it costs $O(n \log n)$ because of the sorting, and this problem does not need that much.

Counting is cheaper. Build a count of every letter in `s`, then walk `t` and subtract. If any count drops below zero, `t` has more of some letter than `s` had, so the answer is `false` immediately.

Start by comparing lengths. If they differ, the answer is `false` and you are done. That check is not just a shortcut: it is what makes the subtraction enough on its own. With equal lengths, if `t` never over-spends any letter, it cannot have under-spent one either, because the totals have to match. So you never need a second pass to confirm the basket is empty.

---

### Walking through the example

Take `s = "anagram"` and `t = "nagaram"`.

1. **Lengths match**, both are `7`, so carry on.
2. **Count `s`:** three `a`, one each of `n`, `g`, `r`, `m`.
3. **Spend `t`:** `n` leaves none, `a` drops to two, `g` leaves none, `a` drops to one, `r` leaves none, `a` drops to zero, `m` leaves none.

Nothing ever went negative, so the answer is `true`.

If `t` had been `"nagaramm"`, the lengths would differ and it would have failed at step one. If it had been `"nagarbm"`, the `b` would have gone negative and failed at step three.

---

### The code

```python
from collections import Counter

class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        # different lengths can never be anagrams
        if len(s) != len(t):
            return False

        counts = Counter(s)

        for ch in t:
            counts[ch] -= 1
            # t wants more of this letter than s had
            if counts[ch] < 0:
                return False

        return True
```

---

### Time and space complexity

#### Time: $O(n)$

Counting `s` reads it once. Spending `t` reads it once. Every step inside those loops is a dictionary read or write, which does not get slower as the dictionary fills. Two passes over strings of length `n` is $O(n)$.

That is the gain over sorting, which would be $O(n \log n)$.

#### Space: $O(k)$

The counter holds one entry per distinct letter, where `k` is the size of the alphabet. For lowercase English that is at most 26 entries no matter how long the strings are, so it is effectively $O(1)$.

If the input is full Unicode, `k` grows with the number of distinct characters actually used, which is where this differs from the fixed array of 26 slots that interviewers sometimes ask for.

---

### Remember this

Anagrams are the same letters in the same quantities, so count rather than sort. Check the lengths first, count the letters of `s`, then subtract the letters of `t` and fail the moment a count goes negative. Equal lengths plus no over-spending is all the proof you need. $O(n)$ time, $O(k)$ space for the alphabet.
