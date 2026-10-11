---
id: 7-minimum-window-substring
title: "76. Minimum Window Substring"
description: "Dynamic sliding window with have/need inventory matching in O(m + n)"
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string `""`.

```text
Input:  s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"
Explanation: The minimum window substring "BANC" includes 'A', 'B', and 'C' from string t.
```

---

### The Intuitive Mental Model

Think of string `t` as a **grocery shopping list**. If `t = "ABC"`, your list requires 1 `'A'`, 1 `'B'`, and 1 `'C'`. The number of unique items that must be satisfied is `need = 3`.

String `s` represents a supermarket aisle:
- **Fill the Cart (`right`):** Walk forward through `s`, tossing characters into your shopping cart (`window`). Track how many distinct item requirements are fully satisfied (`have`).
- **Prune Excess Items (`left`):** The moment `have == need`, your cart satisfies the entire grocery list. Now contract from the left:
  - If a character is not on your list, discard it immediately.
  - If a character is a redundant duplicate beyond what is needed, discard it.
  - Record the window length and indices if this is the shortest valid window seen so far.
  - The moment discarding an essential item causes `have < need`, stop contracting and resume walking `right`.

#### Brute Force: Testing Every Substring
The naive approach generates all $O(m^2)$ possible substrings $s[i \dots j]$. For each candidate substring, it counts character frequencies and verifies whether every character in `t` appears with the required frequency. Checking each substring takes $O(m)$ time, producing an $O(m^3)$ algorithm (or $O(m^2)$ if maintained incrementally). On strings of length up to $10^5$, this quadratic or cubic runtime times out.

#### Optimal Approach: Dynamic Sliding Window with Have/Need Counters
Instead of rescanning character counts, maintain a rolling frequency dictionary `window` and track progress using two integers:
- `need = len(count_t)`: The number of distinct characters in `t` that must meet their target frequencies.
- `have`: The number of distinct characters whose counts in `window` currently meet or exceed their target frequencies in `count_t`.

When `have == need`, the current window is valid. We then contract `left` in a `while` loop to find the tightest possible boundary for that window. Because each character in `s` is visited at most twice (once by `right` and once by `left`), the entire process runs in $O(m + n)$ time.

#### Execution Walkthrough

Let us trace `s = "ADOBECODEBANC"` with `t = "ABC"` (`need = 3`):

| Step | Pointer `right` | `s[right]` | Action | Window State | `have` / `need` | Valid? | Action Taken | Best Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `'A'` | Expand | `{'A': 1}` | 1 / 3 | No | Continue | None |
| **2** | `3` | `'B'` | Expand | `{'A': 1, 'B': 1}` | 2 / 3 | No | Continue | None |
| **3** | `5` | `'C'` | Expand | `{'A': 1, 'B': 1, 'C': 1}` | 3 / 3 | **Yes** | Record `"ADOBEC"`, evict `'A'` | `"ADOBEC"` (len 6) |
| **4** | `9` | `'B'` | Expand | `{'B': 2, 'C': 1}` | 2 / 3 | No | Continue | `"ADOBEC"` (len 6) |
| **5** | `10` | `'A'` | Expand | `{'A': 1, 'B': 2, 'C': 1}` | 3 / 3 | **Yes** | Evict non-essentials up to index 9 | `"ADOBEC"` (len 6) |
| **6** | `12` | `'C'` | Expand | `{'A': 1, 'B': 1, 'C': 1}` | 3 / 3 | **Yes** | Tighten window to `[9, 12]` | `"BANC"` (len 4) |

The minimal valid substring found is `"BANC"` with length 4.

---

### Step-by-Step Algorithm

1. **Edge Case Filter:** If `not s`, `not t`, or $\text{len}(s) < \text{len}(t)$, return `""`.
2. **Build Target Frequency Map:** Create a frequency map `count_t` from `t`. Set `need = len(count_t)` and `have = 0`.
3. **Initialize Window State:** Create an empty dictionary `window`, set `left = 0`, `min_len = float('inf')`, and `best_range = (-1, -1)`.
4. **Expand Right Boundary:** Iterate `right, char` across `enumerate(s)`:
   - If `char` is present in `count_t`:
     - Increment `window[char] += 1`.
     - If `window[char] == count_t[char]`, increment `have += 1`.
5. **Contract Left Boundary:** While `have == need`:
   - If `right - left + 1 < min_len`, update `min_len = right - left + 1` and `best_range = (left, right)`.
   - Evict `s[left]`:
     - If `s[left]` is in `count_t`:
       - Decrement `window[s[left]] -= 1`.
       - If `window[s[left]] < count_t[s[left]]`, decrement `have -= 1`.
     - Increment `left += 1`.
6. **Return Result:** If `min_len == float('inf')`, return `""`; otherwise return `s[best_range[0] : best_range[1] + 1]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Have/Need Sliding Window" default>

```python
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not s or not t or len(s) < len(t):
            return ""

        count_t: dict[str, int] = Counter(t)
        window: dict[str, int] = {}

        have = 0
        need = len(count_t)
        best_range = (-1, -1)
        min_len = float('inf')
        left = 0

        for right, char in enumerate(s):
            # Add character to active window
            if char in count_t:
                window[char] = window.get(char, 0) + 1
                if window[char] == count_t[char]:
                    have += 1

            # Contract window from left while all requirements are met
            while have == need:
                # Update candidate minimum window
                if (right - left + 1) < min_len:
                    min_len = right - left + 1
                    best_range = (left, right)

                # Evict character from left
                left_char = s[left]
                if left_char in count_t:
                    window[left_char] -= 1
                    if window[left_char] < count_t[left_char]:
                        have -= 1

                left += 1

        start, end = best_range
        return s[start : end + 1] if min_len != float('inf') else ""
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Filtered Character Window">

```python
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not s or not t or len(s) < len(t):
            return ""

        count_t: dict[str, int] = Counter(t)
        # Store only indices and characters that appear in target t
        filtered_s: list[tuple[int, str]] = [
            (i, char) for i, char in enumerate(s) if char in count_t
        ]

        window: dict[str, int] = {}
        have = 0
        need = len(count_t)
        best_range = (-1, -1)
        min_len = float('inf')
        left = 0

        for right in range(len(filtered_s)):
            char = filtered_s[right][1]
            window[char] = window.get(char, 0) + 1
            if window[char] == count_t[char]:
                have += 1

            while have == need:
                end = filtered_s[right][0]
                start = filtered_s[left][0]
                if (end - start + 1) < min_len:
                    min_len = end - start + 1
                    best_range = (start, end)

                evict_char = filtered_s[left][1]
                window[evict_char] -= 1
                if window[evict_char] < count_t[evict_char]:
                    have -= 1
                left += 1

        start, end = best_range
        return s[start : end + 1] if min_len != float('inf') else ""
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force** | $O(m^2)$ | $O(|\Sigma|)$ | Evaluates all substrings. Impractical for strings with length $> 1000$. |
| **Filtered Window** | $O(m + n)$ | $O(m + |\Sigma|)$ | Skips irrelevant characters via indexed filtering. Beneficial when $m \gg n$. |
| **Have/Need Sliding Window** | $O(m + n)$ | $O(|\Sigma|)$ | Single linear scan with two pointers and frequency hash maps. Optimal time and space. |

---

### Common Pitfall: Premature Decrementing of Satisfied Counts

When evicting characters with pointer `left`, only decrement `have` when `window[char] < count_t[char]`. If `t` requires one `'A'` and the active window holds three `'A'`s, evicting the first duplicate leaves two `'A'`s, which still satisfies the quota. Decrementing `have` on redundant duplicates prematurely breaks the valid state and causes the algorithm to miss tighter windows.

---

### Concise Interview Takeaway

Model the target string as an inventory requirement and track satisfaction using `have` and `need`. Expand `right` until `have == need`, then contract `left` in a `while` loop to prune redundant duplicates and non-essential characters, recording the minimal valid window. Both pointers visit each character at most once, securing an optimal $O(m + n)$ runtime and $O(|\Sigma|)$ auxiliary space.
