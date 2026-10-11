---
id: 4-find-all-anagrams-in-a-string
title: "438. Find All Anagrams in a String"
description: "Fixed-size sliding window with O(1) rolling frequency updates"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fixed Window</span>

> **Problem Statement:** Given two strings `s` and `p`, return an array of all starting indices of `p`'s anagrams in `s`. The answer may be returned in any order.

```text
Input:  s = "cbaebabacd", p = "abc"
Output: [0, 6]
Explanation:
The substring with start index = 0 is "cba", which is an anagram of "abc".
The substring with start index = 6 is "bac", which is an anagram of "abc".
```

---

### The Intuitive Mental Model

An anagram is a rearrangement of characters. Two strings of equal length are anagrams if and only if they possess identical character frequency profiles. Because every anagram of `p` must match the length of `p` exactly, this problem requires a **fixed-size sliding window** of width $k = \text{len}(p)$.

#### Brute Force: Sorting Every Window
The brute force method inspects every substring of length $k$ in `s`. For every index $i$ from $0$ to $\text{len}(s) - k$, it slices $s[i \dots i + k - 1]$ and sorts it, comparing the result with the sorted characters of `p`. Sorting each substring takes $O(k \log k)$ time, resulting in an overall time complexity of $O((n - k + 1) \cdot k \log k)$. When $n$ and $k$ are large, this redundant work causes unnecessary latency.

#### Optimal Approach: Fixed-Size Window with Rolling Frequency Array
Instead of inspecting each window from scratch, slide a frame of length $k$ across `s`:
- Maintain a 26-slot frequency array for `p` and a matching array for the active window of `s`.
- As the window slides one index to the right:
  - Add the new incoming character on the right: increment `s_count[s[i]]`.
  - Evict the outgoing character falling off the left: decrement `s_count[s[i - k]]`.
- After each slide, compare the two 26-slot frequency profiles. Because the alphabet size is constant ($26$), the comparison takes $O(1)$ time.

#### Execution Walkthrough

Let us trace `s = "cbaebabacd"` with `p = "abc"` ($k = 3$).  
Target frequency inventory: `{'a': 1, 'b': 1, 'c': 1}`.

| Step | Index Span | Active Window | Incoming Char | Outgoing Char | Frequency Match? | Action Taken | Result (`res`) |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **0** | `[0, 2]` | `"cba"` | Initial seed | None | **Yes** | Match found at index 0 | `[0]` |
| **1** | `[1, 3]` | `"bae"` | `'e'` | `'c'` | No | No match | `[0]` |
| **2** | `[2, 4]` | `"aeb"` | `'b'` | `'b'` | No | No match | `[0]` |
| **3** | `[3, 5]` | `"eba"` | `'a'` | `'a'` | No | No match | `[0]` |
| **4** | `[4, 6]` | `"bab"` | `'b'` | `'e'` | No | No match | `[0]` |
| **5** | `[5, 7]` | `"aba"` | `'a'` | `'b'` | No | No match | `[0]` |
| **6** | `[6, 8]` | `"bac"` | `'c'` | `'a'` | **Yes** | Match found at index 6 | `[0, 6]` |
| **7** | `[7, 9]` | `"acd"` | `'d'` | `'b'` | No | No match | `[0, 6]` |

The resulting list of starting indices is `[0, 6]`.

---

### Step-by-Step Algorithm

1. **Edge Case Filter:** If $\text{len}(s) < \text{len}(p)$, no anagram can fit inside `s`; return `[]`.
2. **Initialize Frequency Arrays:** Allocate two 26-element lists, `p_count` and `s_count`, initialized to zeros.
3. **Seed Initial Window:** Iterate over the first $k = \text{len}(p)$ characters, tallying counts for both `p` and the prefix of `s`.
4. **Evaluate Starting Position:** If `s_count == p_count`, append index `0` to the result list `res`.
5. **Slide Window Across String:** Iterate $i$ from $k$ to $\text{len}(s) - 1$:
   - Increment `s_count[ord(s[i]) - ord('a')]` for the incoming character.
   - Decrement `s_count[ord(s[i - k]) - ord('a')]` for the evicted character.
   - If `s_count == p_count`, append the new start index $i - k + 1$ to `res`.
6. **Return Result:** Return `res`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Fixed Frequency Array" default>

```python
class Solution:
    def findAnagrams(self, s: str, p: str) -> list[int]:
        if len(s) < len(p):
            return []

        p_count = [0] * 26
        s_count = [0] * 26
        res: list[int] = []
        k = len(p)

        # Seed target frequencies and the first window
        for i in range(k):
            p_count[ord(p[i]) - ord('a')] += 1
            s_count[ord(s[i]) - ord('a')] += 1

        if s_count == p_count:
            res.append(0)

        # Slide the fixed window across the remainder of s
        for i in range(k, len(s)):
            s_count[ord(s[i]) - ord('a')] += 1
            s_count[ord(s[i - k]) - ord('a')] -= 1

            # Compare the 26-slot frequency profiles in O(1)
            if s_count == p_count:
                res.append(i - k + 1)

        return res
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Hash Map Window">

```python
from collections import Counter

class Solution:
    def findAnagrams(self, s: str, p: str) -> list[int]:
        if len(s) < len(p):
            return []

        p_count = Counter(p)
        window = Counter(s[:len(p)])
        res: list[int] = []
        k = len(p)

        if window == p_count:
            res.append(0)

        for i in range(k, len(s)):
            # Add incoming character
            window[s[i]] += 1
            
            # Evict outgoing character
            outgoing = s[i - k]
            window[outgoing] -= 1
            if window[outgoing] == 0:
                del window[outgoing]

            if window == p_count:
                res.append(i - k + 1)

        return res
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Substring Sorting** | $O(n \cdot k \log k)$ | $O(k)$ | Slices and sorts each window. Extremely slow for large windows. |
| **Hash Map Window** | $O(n)$ | $O(|\Sigma|)$ | Uses `collections.Counter`. Clean syntax, but dictionary hashing adds minor overhead compared to flat arrays. |
| **Fixed Frequency Array** | $O(n)$ | $O(1)$ | Fixed 26-element integer lists with $O(1)$ rolling updates and direct array comparisons. |

---

### Common Pitfall: Recomputing Window Frequencies

A common pitfall is reconstructing a frequency map or slicing a new substring on every step inside the loop, leading to an accidental $O(n \cdot k)$ runtime. A fixed-size sliding window only requires two updates per step: incrementing the incoming right character and decrementing the outgoing left character.

---

### Concise Interview Takeaway

Because anagrams require identical lengths and identical character counts, maintain a fixed-size window of length `len(p)`. Update the 26-element frequency profile in $O(1)$ by incrementing the incoming character and decrementing the outgoing character, solving the problem in optimal $O(n)$ time and $O(1)$ space.
