---
id: 5-longest-common-subsequence
title: "1143. Longest Common Subsequence"
description: "Find longest common subsequence length of two strings using 2D grid dynamic programming"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">String Alignment DP</span>

> **Problem Statement:** Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0. A subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.

```text
Input:  text1 = "abcde", text2 = "ace"
Output: 3
Explanation: The longest common subsequence is "ace" and its length is 3.
```

---

### The Intuitive Mental Model

When comparing two sequences to find shared patterns or alignments, structure the problem as a 2D grid where each axis represents the prefix of one string.

#### Brute Force: Generating All Subsequences
A brute force approach enumerates all possible subsequences of `text1` (there are $2^m$ such subsequences) and checks whether each exists within `text2`. Because string length can reach $1000$, generating $2^{1000}$ subsets is computationally impossible.

#### Optimal Approach: 2D Prefix Matrix Alignment
Let `dp[i][j]` represent the length of the longest common subsequence between prefix `text1[:i]` (length $i$) and prefix `text2[:j]` (length $j$). A grid of size $(m + 1) \times (n + 1)$ allows row 0 and column 0 to denote empty string prefixes where LCS is always 0.

When evaluating `text1[i - 1]` and `text2[j - 1]`, two mutually exclusive cases emerge:

1. **Characters Match (`text1[i - 1] == text2[j - 1]`):**
   This shared character extends the LCS of the prefixes prior to these two letters. We add 1 to the top-left diagonal:
   $$\text{dp}[i][j] = 1 + \text{dp}[i - 1][j - 1]$$

2. **Characters Differ (`text1[i - 1] != text2[j - 1]`):**
   These two characters cannot be paired together. The optimal subsequence must either discard `text1[i - 1]` or discard `text2[j - 1]`. We inherit the maximum of the two options:
   $$\text{dp}[i][j] = \max(\text{dp}[i - 1][j], \, \text{dp}[i][j - 1])$$

Because computing row $i$ relies only on row $i - 1$ and the current row, auxiliary space can be reduced from $O(m \times n)$ down to $O(n)$ using two alternating rows.

#### Execution Walkthrough

Tracing `text1 = "abcde"` against `text2 = "ace"`:

| `text1` Char (`i`) | `text2` Char (`j`) | Match? | Recurrence Relation | Resulting Cell `dp[i][j]` | Current Row State |
| :---: | :---: | :---: | :--- | :---: | :--- |
| `a` (`i = 1`) | `a` (`j = 1`) | **Yes** | $1 + \text{dp}[0][0] = 1 + 0$ | 1 | `[0, 1, 1, 1]` |
| `b` (`i = 2`) | `a`, `c`, `e` | No | $\max(\text{top}, \text{left})$ | No change | `[0, 1, 1, 1]` |
| `c` (`i = 3`) | `c` (`j = 2`) | **Yes** | $1 + \text{dp}[2][1] = 1 + 1$ | 2 | `[0, 1, 2, 2]` |
| `d` (`i = 4`) | `a`, `c`, `e` | No | $\max(\text{top}, \text{left})$ | No change | `[0, 1, 2, 2]` |
| `e` (`i = 5`) | `e` (`j = 3`) | **Yes** | $1 + \text{dp}[4][2] = 1 + 2$ | 3 | `[0, 1, 2, 3]` |

The bottom-right cell `dp[5][3]` yields the final answer 3.

---

### Step-by-Step Algorithm

1. **Initialize Table:** Create a matrix `dp` of size $(m + 1) \times (n + 1)$ filled with zeros, where $m = \text{len}(text1)$ and $n = \text{len}(text2)$.
2. **Iterate Prefix Lengths:** Loop `i` from 1 to $m$ and `j` from 1 to $n$.
3. **Apply Recurrence Transition:**
   - If `text1[i - 1] == text2[j - 1]`, set `dp[i][j] = 1 + dp[i - 1][j - 1]`.
   - Otherwise, set `dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])`.
4. **Return Final Prefix Alignment:** Return `dp[m][n]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized Rolling Rows" default>

```python
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        m, n = len(text1), len(text2)
        # Ensure text2 is the shorter string to minimize auxiliary memory
        if m < n:
            text1, text2 = text2, text1
            m, n = n, m

        prev = [0] * (n + 1)

        for i in range(1, m + 1):
            curr = [0] * (n + 1)
            for j in range(1, n + 1):
                if text1[i - 1] == text2[j - 1]:
                    curr[j] = 1 + prev[j - 1]
                else:
                    curr[j] = max(prev[j], curr[j - 1])
            prev = curr

        return prev[n]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Full 2D DP Table">

```python
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        m, n = len(text1), len(text2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                # Characters match: extend diagonal alignment
                if text1[i - 1] == text2[j - 1]:
                    dp[i][j] = 1 + dp[i - 1][j - 1]
                else:
                    # Characters differ: take optimal prefix exclusion
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

        return dp[m][n]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full 2D DP Table** | $O(m \times n)$ | $O(m \times n)$ | Clear visual correspondence with the entire alignment matrix, but retains all rows in memory. |
| **Space-Optimized Rolling Rows** | $O(m \times n)$ | $O(\min(m, n))$ | Preserves identical quadratic time while limiting memory to two rows of the shorter string. |

---

### Common Pitfall: Substring vs Subsequence Confusion

Substrings require contiguous character sequences, whereas subsequences permit skipping characters so long as the relative left-to-right order is preserved. In substring problems, a mismatch resets the counter to 0 (`dp[i][j] = 0`). In subsequence problems, a mismatch retains the best prior result: `dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])`.

---

### Concise Interview Takeaway

LCS forms the foundational template for two-string sequence alignments. If characters match, step diagonally to add 1: `dp[i][j] = 1 + dp[i - 1][j - 1]`. If characters mismatch, take the maximum of skipping either character: `max(dp[i - 1][j], dp[i][j - 1])`. Using two rolling arrays reduces memory from $O(m \times n)$ to $O(\min(m, n))$.
