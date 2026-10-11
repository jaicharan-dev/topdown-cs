---
id: 4-longest-palindromic-substring
title: "5. Longest Palindromic Substring"
description: "Find longest palindromic substring using two-pointer center expansion in O(1) space"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Expand Around Center</span>

> **Problem Statement:** Given a string `s`, return the longest palindromic substring in `s`.

```text
Input:  s = "babad"
Output: "bab"
Explanation: "aba" is also a valid answer.
```

---

### The Intuitive Mental Model

A palindrome reads identically forwards and backwards, which means it is mirrored across a central axis. In a string of length $n$, there are $2n - 1$ possible centers:
- **$n$ Odd-Length Centers:** Centered on a single character (e.g. `"aba"` centered at `'b'`).
- **$n - 1$ Even-Length Centers:** Centered between two adjacent characters (e.g. `"abba"` centered between `'b'` and `'b'`).

#### Brute Force: Checking All Substrings
Generating every substring takes $O(n^2)$ pairs of indices, and checking whether each substring is a palindrome requires $O(n)$ time. This results in an inefficient $O(n^3)$ total runtime.

#### Optimal Approach: Expanding Around Centers
Instead of checking substrings from the outside in, we can start at each potential center and expand outwards as long as the mirrored characters match:
1. Initialize two pointers, `left` and `right`, at the center.
2. While both pointers are within bounds and `s[left] == s[right]`, expand outward by decrementing `left` and incrementing `right`.
3. Stop at the first mismatch and record the palindrome bounds.

This matches the $O(n^2)$ runtime of traditional 2D Dynamic Programming while dropping auxiliary memory usage from $O(n^2)$ down to $O(1)$.

#### Execution Walkthrough

Let us trace `s = "babad"` across centers:

| Center ($i$) | Type | Initial (`left`, `right`) | Expansion Steps | Palindrome Found | Length |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | Odd | (0, 0) | Match `'b'` | `"b"` | 1 |
| **0** | Even | (0, 1) | Mismatch `'b'` vs `'a'` | `""` | 0 |
| **1** | Odd | (1, 1) | Match `'a'`, then `'b' == 'b'` | `"bab"` | 3 |
| **1** | Even | (1, 2) | Mismatch `'a'` vs `'b'` | `""` | 0 |
| **2** | Odd | (2, 2) | Match `'b'`, then `'a' == 'a'` | `"aba"` | 3 |
| **2** | Even | (2, 3) | Mismatch `'b'` vs `'a'` | `""` | 0 |
| **3** | Odd | (3, 3) | Match `'a'` | `"a"` | 1 |
| **3** | Even | (3, 4) | Mismatch `'a'` vs `'d'` | `""` | 0 |
| **4** | Odd | (4, 4) | Match `'d'` | `"d"` | 1 |

The longest palindrome discovered has length 3: `"bab"` (or `"aba"`).

---

### Step-by-Step Algorithm

1. **Guard Clause:** If `s` is empty, return `""`.
2. **Track Longest Substring:** Maintain `start = 0` and `max_len = 0`.
3. **Define Helper Function (`expand(left, right)`):**
   - While `left >= 0`, `right < len(s)`, and `s[left] == s[right]`:
     - Decrement `left` and increment `right`.
   - The valid palindrome spans index `left + 1` through `right - 1`, with length `right - left - 1`.
   - Return `(left + 1, right - left - 1)`.
4. **Scan Centers:**
   - Loop `i` from 0 to `len(s) - 1`:
     - Check odd center with `expand(i, i)`. Update `start` and `max_len` if larger.
     - Check even center with `expand(i, i + 1)`. Update `start` and `max_len` if larger.
5. **Return Longest Slice:** Return `s[start : start + max_len]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Expand Around Center" default>

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        if not s:
            return ""

        start = 0
        max_len = 0

        def expand(left: int, right: int) -> tuple[int, int]:
            while left >= 0 and right < len(s) and s[left] == s[right]:
                left -= 1
                right += 1
            # Valid palindrome is between left + 1 and right - 1
            return left + 1, right - left - 1

        for i in range(len(s)):
            # Odd-length palindrome
            l1, len1 = expand(i, i)
            if len1 > max_len:
                start, max_len = l1, len1

            # Even-length palindrome
            l2, len2 = expand(i, i + 1)
            if len2 > max_len:
                start, max_len = l2, len2

        return s[start : start + max_len]
```

  </TabItem>
  <TabItem value="dp" label="Alternative: 2D Dynamic Programming">

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        if n <= 1:
            return s

        dp = [[False] * n for _ in range(n)]
        start = 0
        max_len = 1

        # Base case: single character palindromes
        for i in range(n):
            dp[i][i] = True

        # Base case: two character palindromes
        for i in range(n - 1):
            if s[i] == s[i + 1]:
                dp[i][i + 1] = True
                start = i
                max_len = 2

        # Substrings of length 3 to n
        for length in range(3, n + 1):
            for i in range(n - length + 1):
                j = i + length - 1
                if s[i] == s[j] and dp[i + 1][j - 1]:
                    dp[i][j] = True
                    start = i
                    max_len = length

        return s[start : start + max_len]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (All Substrings)** | $O(n^3)$ | $O(1)$ | Evaluates all $O(n^2)$ substrings and validates each with an $O(n)$ symmetry check. |
| **2D Dynamic Programming** | $O(n^2)$ | $O(n^2)$ | Caches palindrome truth values in an $n \times n$ table, incurring high memory overhead. |
| **Expand Around Center** | $O(n^2)$ | $O(1)$ | Expands outward from all $2n - 1$ centers with zero extra memory allocation. |

---

### Common Pitfall: Missing Even-Length Palindromes

A common oversight is checking only single-character centers (`expand(i, i)`). This correctly handles odd palindromes like `"racecar"`, but completely misses even palindromes like `"abba"` or `"noon"`. Always expand both odd centers (`i, i`) and even centers (`i, i + 1`).

---

### Concise Interview Takeaway

Every palindrome expands symmetrically from its center. Instead of allocating an $O(n^2)$ 2D dynamic programming grid, expanding outward from all $2n - 1$ centers (both single characters and between adjacent pairs) achieves the same optimal $O(n^2)$ time bound in $O(1)$ auxiliary space.
