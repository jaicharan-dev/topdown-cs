---
id: 3-first-unique-character-in-a-string
title: "387. First Unique Character in a String"
description: "Two-pass frequency census with chronological index lookup"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Map</span>

> **Problem Statement:** Given a string `s`, find the first non-repeating character in it and return its index. If it does not exist, return `-1`.

```text
Input:  s = "loveleetcode"
Output: 2
Explanation: The character 'v' at index 2 is the first character that does not repeat.
```

---

### The Intuitive Mental Model

Imagine a line of guests entering an event. You want to award a prize to the first guest in line whose name is completely unique among all attendees.

#### Brute Force: Searching the Rest of the String
For every character at index `i`, scan the remainder of the string to check if the same character appears again.

Because each character triggers a nested scan across the string, this approach takes $O(n^2)$ quadratic time, which becomes slow on larger inputs.

#### Optimal Approach: The Two-Pass Frequency Census
When you read `'l'` at index `0`, you cannot know if another `'l'` appears later without scanning ahead. Instead of rescanning repeatedly, split the problem into two distinct linear passes:
- **Pass 1 (Census):** Walk through the entire string once to count the total occurrences of every character.
- **Pass 2 (Chronological Inspection):** Walk through the string a second time from left to right. At each character, check its count in the census. The very first character with a count of exactly `1` is the winner.

#### Execution Walkthrough

Let us trace `s = "loveleetcode"`:

1. **Pass 1 Census:** Count character frequencies: `{'l': 2, 'o': 2, 'v': 1, 'e': 4, 't': 1, 'c': 1, 'd': 1}`.
2. **Pass 2 Chronological Scan:**

| Step (Index `i`) | Character `s[i]` | Frequency in Census | Status / Action |
| :---: | :---: | :---: | :--- |
| **0** | `'l'` | `2` | Repeating character, continue |
| **1** | `'o'` | `2` | Repeating character, continue |
| **2** | `'v'` | `1` | **First unique character found!** Return index `2` |

The algorithm stops at index `2` without scanning the rest of the string in Pass 2.

---

### Step-by-Step Algorithm

1. **Build Frequency Census:** Count the occurrences of each character in `s` using `collections.Counter` or a hash table.
2. **Scan in Chronological Order:** Iterate through `s` using `enumerate(s)` to inspect characters and their original indices `(i, char)` from left to right.
3. **Identify First Unique:** Check if `counts[char] == 1`. If true, immediately return the current index `i`.
4. **Fallback:** If all characters have frequencies greater than `1`, return `-1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pass Hash Map" default>

```python
from collections import Counter

class Solution:
    def firstUniqChar(self, s: str) -> int:
        # Pass 1: Global frequency census
        counts = Counter(s)

        # Pass 2: Inspect characters in original chronological order
        for i, char in enumerate(s):
            if counts[char] == 1:
                return i

        # No unique character exists
        return -1
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Fixed 26-Slot Array">

```python
class Solution:
    def firstUniqChar(self, s: str) -> int:
        counts = [0] * 26

        # Pass 1: Count letter frequencies
        for char in s:
            counts[ord(char) - ord('a')] += 1

        # Pass 2: Inspect characters in original order
        for i, char in enumerate(s):
            if counts[ord(char) - ord('a')] == 1:
                return i

        return -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pass Hash Map** | $O(n)$ | $O(1)$ | Performs two sequential linear passes. Auxiliary space is bounded by the alphabet size $|\Sigma| \le 26$. |
| **Fixed 26-Slot Array** | $O(n)$ | $O(1)$ | Avoids hash table overhead using fixed integer array, restricted to lowercase English letters. |

---

### Common Pitfall: Iterating Over the Map Instead of the String

Iterating over the keys of the frequency map instead of the string itself can cause subtle ordering bugs depending on language map semantics. To guarantee finding the first unique character according to original string position, always iterate through the original string `s` using `enumerate(s)` during Pass 2 rather than traversing the keys of the census dictionary.

---

### Concise Interview Takeaway

Determining uniqueness requires global frequency information. A two-pass census solves this cleanly: build character counts in Pass 1, then traverse `s` in Pass 2 to return the index of the first character with frequency `1`. This achieves optimal $O(n)$ time complexity and $O(1)$ auxiliary space.
