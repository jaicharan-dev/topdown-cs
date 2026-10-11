---
id: 5-permutation-in-string
title: "567. Permutation in String"
description: "Fixed-size sliding window with O(1) match counter optimization"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Fixed Window</span>

> **Problem Statement:** Given two strings `s1` and `s2`, return `true` if `s2` contains a permutation of `s1`, or `false` otherwise. In other words, return `true` if one of `s1`'s permutations is the substring of `s2`.

```text
Input:  s1 = "ab", s2 = "eidbaooo"
Output: true
Explanation: s2 contains one permutation of s1 ("ba").
```

---

### The Intuitive Mental Model

A permutation of a string is simply an anagram: it requires the **exact same length** and the **exact same character frequencies**.

The problem directly translates to:

**"Does string `s2` contain any substring of length `len(s1)` with identical character counts to `s1`?"**

Because the window size is constant ($k = \text{len}(s1)$), we can slide a fixed-size frame across `s2`:
- At each step, one character enters the right side of the window, and one character leaves from the left side.
- Comparing two 26-element arrays (`s1_count == s2_count`) at every shift takes 26 operations.
- We can optimize this further to strict $O(1)$ operations per shift by maintaining a `matches` counter that records how many of the 26 lowercase English letters currently share equal counts between `s1` and the active window.

#### Brute Force: Generating All Permutations
Generating all $O(k!)$ permutations of `s1` and searching for each within `s2` is intractable. Even extracting every substring of length $k$ from `s2` and sorting it takes $O((n - k + 1) \cdot k \log k)$ time, which creates significant performance overhead when strings are large.

#### Optimal Approach: Fixed-Size Window with Rolling Matches Tracker
Instead of recomputing window frequencies or comparing entire arrays on every shift:
- Initialize two 26-slot frequency arrays, `s1_count` and `s2_count`.
- Initialize `matches` as the number of letters among the 26 English characters whose counts in `s1_count` and `s2_count` are identical.
- When sliding the window by one position:
  - Update `s2_count` for the incoming character. If its count now equals `s1_count`, increment `matches`. If it was previously equal and now diverges, decrement `matches`.
  - Update `s2_count` for the outgoing character similarly.
- If `matches == 26`, all character frequencies match, and we can immediately return `True`.

#### Execution Walkthrough

Let us trace `s1 = "ab"` and `s2 = "eidbaooo"` ($k = 2$):

| Step | Index Span | Active Window | Incoming Char | Outgoing Char | Matches (out of 26) | Action Taken | Result |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **0** | `[0, 1]` | `"ei"` | Initial seed | None | 22 | Compare initial window | Continue |
| **1** | `[1, 2]` | `"id"` | `'d'` | `'e'` | 22 | Slide window | Continue |
| **2** | `[2, 3]` | `"db"` | `'b'` | `'i'` | 23 | Slide window | Continue |
| **3** | `[3, 4]` | `"ba"` | `'a'` | `'d'` | 26 | Exact match found! | Return `True` |

Because all 26 character slots match at index span `[3, 4]`, the algorithm terminates early and returns `True`.

---

### Step-by-Step Algorithm

1. **Check String Lengths:** If $\text{len}(s1) > \text{len}(s2)$, string `s2` is too short to contain a permutation; return `False`.
2. **Initialize Frequency Arrays:** Allocate two 26-slot lists `s1_count` and `s2_count` initialized to zeros.
3. **Seed Initial Window:** Populate counts for `s1` and the first $k = \text{len}(s1)$ characters of `s2`.
4. **Compute Initial Matches:** Calculate `matches = sum(1 for i in range(26) if s1_count[i] == s2_count[i])`.
5. **Slide the Window Across `s2`:** Iterate $i$ from $k$ to $\text{len}(s2) - 1$:
   - If `matches == 26`, return `True` immediately.
   - **Process Incoming Character (`s2[i]`):** Increment its count in `s2_count`. If its count now matches `s1_count`, increment `matches`. If its count previously matched and now exceeds it, decrement `matches`.
   - **Process Outgoing Character (`s2[i - k]`):** Decrement its count in `s2_count`. If its count now matches `s1_count`, increment `matches`. If its count previously matched and now falls below, decrement `matches`.
6. **Check Final State:** Return `matches == 26`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: O(1) Rolling Matches Window" default>

```python
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        if len(s1) > len(s2):
            return False

        s1_count = [0] * 26
        s2_count = [0] * 26
        k = len(s1)

        # Seed initial window counts
        for i in range(k):
            s1_count[ord(s1[i]) - ord('a')] += 1
            s2_count[ord(s2[i]) - ord('a')] += 1

        # Count how many characters out of 26 currently match
        matches = sum(1 for i in range(26) if s1_count[i] == s2_count[i])

        # Slide the window across s2
        for i in range(k, len(s2)):
            if matches == 26:
                return True

            # Process incoming character (right boundary)
            in_idx = ord(s2[i]) - ord('a')
            s2_count[in_idx] += 1
            if s2_count[in_idx] == s1_count[in_idx]:
                matches += 1
            elif s2_count[in_idx] == s1_count[in_idx] + 1:
                matches -= 1

            # Process outgoing character (left boundary)
            out_idx = ord(s2[i - k]) - ord('a')
            s2_count[out_idx] -= 1
            if s2_count[out_idx] == s1_count[out_idx]:
                matches += 1
            elif s2_count[out_idx] == s1_count[out_idx] - 1:
                matches -= 1

        return matches == 26
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Fixed Window Array Equality">

```python
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        if len(s1) > len(s2):
            return False

        s1_count = [0] * 26
        s2_count = [0] * 26
        k = len(s1)

        for i in range(k):
            s1_count[ord(s1[i]) - ord('a')] += 1
            s2_count[ord(s2[i]) - ord('a')] += 1

        if s1_count == s2_count:
            return True

        for i in range(k, len(s2)):
            s2_count[ord(s2[i]) - ord('a')] += 1
            s2_count[ord(s2[i - k]) - ord('a')] -= 1

            if s1_count == s2_count:
                return True

        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Substring Sorting** | $O(n \cdot k \log k)$ | $O(k)$ | Slices and sorts every substring of size $k$. Impractical for long strings. |
| **Array Equality Comparison** | $O(26 \cdot n)$ | $O(1)$ | Compares 26-element arrays directly on each shift. Simple and practical. |
| **Rolling Matches Window** | $O(n)$ | $O(1)$ | Tracks individual matches with zero array rescan overhead. Strictly $O(1)$ operations per shift. |

---

### Common Pitfall: Desynchronizing the Matches Counter

When tracking a running `matches` counter, it is easy to mishandle the boundary conditions. For incoming characters, incrementing `s2_count` can either establish equality (`s2_count == s1_count`) or break existing equality (`s2_count == s1_count + 1`). Similarly, evicting an outgoing character can restore equality or create a shortfall. Tracking these transitions explicitly prevents desynchronizing the match counter.

---

### Concise Interview Takeaway

Because a permutation preserves length and character frequencies, maintain a fixed-size sliding window of length `len(s1)`. Tracking an integer `matches` variable allows evaluating whether the window is a valid permutation in strict $O(1)$ operations per shift, achieving early termination and an optimal $O(n)$ total runtime with $O(1)$ space.
