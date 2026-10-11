---
id: 1-valid-anagram
title: "242. Valid Anagram"
description: "Letter frequency balancing using a fixed array or hash map"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Frequency Array</span>

> **Problem Statement:** Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise. An anagram is a word formed by rearranging the letters of another word, using all original letters exactly once.

```text
Input:  s = "anagram", t = "nagaram"
Output: true
Explanation: Both strings contain three 'a's, one 'g', one 'm', one 'n', and one 'r'.
```

---

### The Intuitive Mental Model

Imagine you have two bags of Scrabble letter tiles. You want to know whether both bags contain the exact same inventory of letters.

#### Brute Force: Sorting Both Strings
The most direct approach is sorting both strings alphabetically and checking whether they match character-by-character: `sorted(s) == sorted(t)`. If the sorted sequences are identical, the strings must be anagrams.

While straightforward, sorting takes $O(n \log n)$ time and creates new sorted string copies in memory.

#### Optimal Approach: The Balance Sheet (Frequency Array)
Instead of reordering characters, we can count them directly. Think of a ledger with 26 slots, one for each lowercase English letter from `'a'` to `'z'`:
- Every time you see a letter in `s`, deposit `+1` into its slot.
- Every time you see a letter in `t`, withdraw `-1` from its slot.
- If both words are true anagrams, every deposit is cancelled out by a matching withdrawal, leaving every balance at zero.

#### Execution Walkthrough

Let us trace `s = "anagram"` and `t = "nagaram"`:

| Step | Char in `s` (+1) | Char in `t` (-1) | Net Balance Changes | Non-Zero Ledger Entries |
| :---: | :---: | :---: | :--- | :--- |
| **1** | `'a'` | `'n'` | `count['a'] += 1`, `count['n'] -= 1` | `{'a': 1, 'n': -1}` |
| **2** | `'n'` | `'a'` | `count['n'] += 1`, `count['a'] -= 1` | All balances currently `0` |
| **3** | `'a'` | `'g'` | `count['a'] += 1`, `count['g'] -= 1` | `{'a': 1, 'g': -1}` |
| **4** | `'g'` | `'a'` | `count['g'] += 1`, `count['a'] -= 1` | All balances currently `0` |
| **5** | `'a'` | `'r'` | `count['a'] += 1`, `count['r'] -= 1` | `{'a': 1, 'r': -1}` |
| **6** | `'r'` | `'a'` | `count['r'] += 1`, `count['a'] -= 1` | All balances currently `0` |
| **7** | `'m'` | `'m'` | `count['m'] += 1`, `count['m'] -= 1` | All balances currently `0` |

All 26 slots end at zero, confirming that `t` is a valid anagram of `s`.

---

### Step-by-Step Algorithm

1. **Check Lengths:** If `len(s) != len(t)`, return `False` immediately since strings of unequal length cannot be anagrams.
2. **Initialize Frequency Ledger:** Create an array `counts` of size 26 initialized to zero (`counts = [0] * 26`).
3. **Tally Character Frequencies:** Iterate through both strings simultaneously using `zip(s, t)`. For each step, increment `counts[ord(char_s) - ord('a')]` and decrement `counts[ord(char_t) - ord('a')]`.
4. **Verify Balances:** Check whether all values in `counts` are equal to zero. If any slot is non-zero, return `False`.
5. **Return Result:** Return `True` once all 26 balances are confirmed to be zero.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Frequency Array" default>

```python
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        # Quick check: lengths must be identical
        if len(s) != len(t):
            return False

        # 26-slot frequency ledger for lowercase English letters 'a' through 'z'
        counts = [0] * 26

        for char_s, char_t in zip(s, t):
            counts[ord(char_s) - ord('a')] += 1
            counts[ord(char_t) - ord('a')] -= 1

        # Every deposit must be cancelled out by a matching withdrawal
        return all(count == 0 for count in counts)
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Sorting">

```python
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False

        return sorted(s) == sorted(t)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Frequency Array** | $O(n)$ | $O(1)$ | Single pass over both strings with a fixed 26-element array. Optimal linear time with constant auxiliary space. |
| **Sorting** | $O(n \log n)$ | $O(n)$ | Clean one-liner, but incurs higher runtime and creates new sorted string copies in memory. |

---

### Common Pitfall: Handling Non-ASCII and Unicode Characters

A fixed 26-slot array relies on the assumption that input contains only lowercase English characters (`'a'` through `'z'`). If inputs include uppercase characters, whitespace, punctuation, or Unicode codepoints (such as accented characters or emojis), `ord(char) - ord('a')` produces out-of-bounds indices. For general Unicode support, replace the fixed array with a dynamic hash map (`dict` or `collections.Counter`).

---

### Concise Interview Takeaway

Treat anagram validation as a zero-sum balance sheet. Increment counts for string `s` and decrement for string `t`. If all balances return to zero, the character frequencies match identically. This achieves optimal $O(n)$ runtime with $O(1)$ auxiliary memory.
