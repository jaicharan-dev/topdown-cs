---
id: 7-longest-palindromic-subsequence
title: "516. Longest Palindromic Subsequence"
description: "Find longest palindromic subsequence using interval dynamic programming"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Interval DP</span>

> **Problem Statement:** Given a string `s`, find the length of the longest palindromic subsequence in `s`. A subsequence is a sequence that can be derived from another sequence by deleting some or no elements without changing the order of the remaining elements.

```text
Input:  s = "bbbab"
Output: 4
Explanation: One possible longest palindromic subsequence is "bbbb".
```

---

### The Intuitive Mental Model

A palindromic subsequence reads identically forwards and backwards. We can conceptualize this problem either through interval dynamic programming or as a reduction to Longest Common Subsequence.

#### Brute Force: Evaluating Every Subsequence
A string of length $n$ contains $2^n$ distinct subsequences. Generating each subsequence and testing whether it equals its reversed string requires $O(n \cdot 2^n)$ operations. For $n = 1000$, this exponential workload is completely intractable.

#### Optimal Approach: Expanding Interval DP
Let `dp[i][j]` represent the length of the longest palindromic subsequence within substring `s[i:j + 1]`.

1. **Base Case:** Every single character `s[i]` forms a palindrome of length 1:
   $$\text{dp}[i][i] = 1$$

2. **Matching Endpoints (`s[i] == s[j]`):**
   When the outer boundary characters match, both characters can wrap around the optimal palindrome contained inside the inner substring `s[i + 1:j]`:
   $$\text{dp}[i][j] = 2 + \text{dp}[i + 1][j - 1]$$
   (If $j = i + 1$, the length is simply 2, as there are no inner characters).

3. **Mismatching Endpoints (`s[i] != s[j]`):**
   Both boundary characters cannot be simultaneously included. The optimal palindrome must either omit `s[i]` or omit `s[j]`:
   $$\text{dp}[i][j] = \max(\text{dp}[i + 1][j], \, \text{dp}[i][j - 1])$$

Alternatively, notice that any palindromic subsequence of $s$ is identical to a common subsequence between $s$ and its reversed counterpart $s^R$. Thus, $\text{LPS}(s) = \text{LCS}(s, s^R)$.

#### Execution Walkthrough

Tracing `s = "bbbab"` across increasing window lengths:

| Substring Window | Indices `(i, j)` | Length | Matching Endpoints? | Recurrence Transition | Result `dp[i][j]` |
| :---: | :---: | :---: | :---: | :--- | :---: |
| `"bb"` | `(0, 1)` | 2 | **Yes** (`'b' == 'b'`) | $2 + 0$ | 2 |
| `"bb"` | `(1, 2)` | 2 | **Yes** (`'b' == 'b'`) | $2 + 0$ | 2 |
| `"ba"` | `(2, 3)` | 2 | No (`'b' != 'a'`) | $\max(\text{dp}[3][3], \text{dp}[2][2]) = \max(1, 1)$ | 1 |
| `"ab"` | `(3, 4)` | 2 | No (`'a' != 'b'`) | $\max(\text{dp}[4][4], \text{dp}[3][3]) = \max(1, 1)$ | 1 |
| `"bbb"` | `(0, 2)` | 3 | **Yes** (`'b' == 'b'`) | $2 + \text{dp}[1][1] = 2 + 1$ | 3 |
| `"bba"` | `(1, 3)` | 3 | No (`'b' != 'a'`) | $\max(\text{dp}[2][3], \text{dp}[1][2]) = \max(1, 2)$ | 2 |
| `"bab"` | `(2, 4)` | 3 | **Yes** (`'b' == 'b'`) | $2 + \text{dp}[3][3] = 2 + 1$ | 3 |
| `"bbab"` | `(1, 4)` | 4 | **Yes** (`'b' == 'b'`) | $2 + \text{dp}[2][3] = 2 + 1$ | 3 |
| `"bbbab"` | `(0, 4)` | 5 | **Yes** (`'b' == 'b'`) | $2 + \text{dp}[1][3] = 2 + 2$ | 4 |

The full range `dp[0][4]` yields the maximum length 4.

---

### Step-by-Step Algorithm

1. **Allocate State Matrix:** Create a 2D table `dp` of size $n \times n$ where $n = \text{len}(s)$.
2. **Set Single Character Base Cases:** For each index `i` from 0 to $n - 1$, set `dp[i][i] = 1`.
3. **Iterate by Interval Length:** Loop `length` from 2 up to $n$:
   - For each start index `i` from 0 up to $n - \text{length}$:
     - Let end index `j = i + length - 1`.
     - If `s[i] == s[j]`, assign `dp[i][j] = 2 + (dp[i + 1][j - 1] if length > 2 else 0)`.
     - Otherwise, assign `dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])`.
4. **Return Entire Substring LPS:** Return `dp[0][n - 1]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Interval Dynamic Programming" default>

```python
class Solution:
    def longestPalindromeSubseq(self, s: str) -> int:
        n = len(s)
        dp = [[0] * n for _ in range(n)]

        # Base case: every single character is a palindrome of length 1
        for i in range(n):
            dp[i][i] = 1

        # Expand interval window lengths from 2 up to n
        for length in range(2, n + 1):
            for i in range(n - length + 1):
                j = i + length - 1

                # If outer characters match, expand the inner palindrome
                if s[i] == s[j]:
                    dp[i][j] = 2 + (dp[i + 1][j - 1] if length > 2 else 0)
                else:
                    # Mismatch: take the maximum of shrinking either end
                    dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])

        return dp[0][n - 1]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: LCS Reduction with Reversed String">

```python
class Solution:
    def longestPalindromeSubseq(self, s: str) -> int:
        # A palindromic subsequence is the LCS of s and its reverse
        rev_s = s[::-1]
        n = len(s)
        prev = [0] * (n + 1)

        for i in range(1, n + 1):
            curr = [0] * (n + 1)
            for j in range(1, n + 1):
                if s[i - 1] == rev_s[j - 1]:
                    curr[j] = 1 + prev[j - 1]
                else:
                    curr[j] = max(prev[j], curr[j - 1])
            prev = curr

        return prev[n]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Interval Dynamic Programming** | $O(n^2)$ | $O(n^2)$ | Fills an upper-triangular table by window length, solving palindromes directly on the original string. |
| **LCS Reduction with Reversed String** | $O(n^2)$ | $O(n)$ | Reuses standard LCS code by reversing $s$, allowing easy $O(n)$ space compression using rolling rows. |

---

### Common Pitfall: Loop Ordering in Interval DP

In interval DP, calculating `dp[i][j]` requires `dp[i + 1][j - 1]` (a strictly smaller sub-interval). If you iterate linearly with `for i in range(n)` and `for j in range(i, n)`, `dp[i + 1][j - 1]` will not have been computed yet when processing row `i`. You must either iterate by increasing window length (`for length in range(2, n + 1)`) or loop `i` backwards from $n - 1$ down to 0 while looping `j` forwards from $i + 1$ to $n - 1$.

---

### Concise Interview Takeaway

Longest Palindromic Subsequence can be solved directly with interval DP: when endpoints match, expand the inner result by 2 (`dp[i][j] = 2 + dp[i + 1][j - 1]`); otherwise take `max(dp[i + 1][j], dp[i][j - 1])`. Alternatively, running standard LCS between $s$ and its reverse $s[::-1]$ produces the exact same answer while cleanly compressing memory to $O(n)$.
