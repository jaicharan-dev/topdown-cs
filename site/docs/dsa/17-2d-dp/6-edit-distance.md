---
id: 6-edit-distance
title: "72. Edit Distance"
description: "Find minimum insert, delete, and replace operations to convert one string into another"
sidebar_position: 6
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">String Alignment DP</span>

> **Problem Statement:** Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`. You have three operations permitted on a word: insert a character, delete a character, or replace a character.

```text
Input:  word1 = "horse", word2 = "ros"
Output: 3
Explanation:
horse -> rorse (replace 'h' with 'r')
rorse -> rose (remove 'r')
rose -> ros (remove 'e')
```

---

### The Intuitive Mental Model

We want to transform prefix `word1[:i]` into prefix `word2[:j]` with the minimum number of edits.

#### Brute Force: Recursive Three-Way Branching
A naive recursive solution attempts all three allowed edits whenever two characters disagree: delete a character from `word1`, insert the needed character from `word2`, or replace the character. Without memoization, this explores a branching factor of 3 at every step, creating an exponential time complexity of $O(3^{\max(m, n)})$ that quickly crashes due to time limits.

#### Optimal Approach: 2D Levenshtein Matrix DP
Let `dp[i][j]` represent the minimum edit distance required to convert prefix `word1[:i]` into prefix `word2[:j]`.

Base cases establish the cost of transforming to or from empty strings:
- Transforming an empty string into `word2[:j]` requires $j$ insertions: `dp[0][j] = j`.
- Transforming `word1[:i]` into an empty string requires $i$ deletions: `dp[i][0] = i`.

When evaluating character `word1[i - 1]` against `word2[j - 1]`:
1. **Characters Match (`word1[i - 1] == word2[j - 1]`):**
   No operation is needed. The cost is identical to aligning the prefixes without these characters:
   $$\text{dp}[i][j] = \text{dp}[i - 1][j - 1]$$

2. **Characters Differ (`word1[i - 1] != word2[j - 1]`):**
   We incur 1 edit operation and select the cheapest among the three permissible actions:
   - **Delete from `word1`:** transitions from `dp[i - 1][j]` (top neighbor).
   - **Insert into `word1`:** transitions from `dp[i][j - 1]` (left neighbor).
   - **Replace in `word1`:** transitions from `dp[i - 1][j - 1]` (top-left diagonal).
   $$\text{dp}[i][j] = 1 + \min(\text{dp}[i - 1][j], \, \text{dp}[i][j - 1], \, \text{dp}[i - 1][j - 1])$$

#### Execution Walkthrough

Tracing `word1 = "horse"` and `word2 = "ros"`:

| `i` (`word1`) | `j` (`word2`) | Characters Compared | Match? | Optimal Decision | Resulting `dp[i][j]` |
| :---: | :---: | :---: | :---: | :--- | :---: |
| `1` (`h`) | `1` (`r`) | `'h'` vs `'r'` | No | $1 + \min(\text{del}: 1, \text{ins}: 1, \text{rep}: 0) = 1 + 0$ | 1 |
| `2` (`o`) | `2` (`o`) | `'o'` vs `'o'` | **Yes** | Copy diagonal `dp[1][1]` directly | 1 |
| `3` (`r`) | `1` (`r`) | `'r'` vs `'r'` | **Yes** | Copy diagonal `dp[2][0]` directly | 2 |
| `4` (`s`) | `3` (`s`) | `'s'` vs `'s'` | **Yes** | Copy diagonal `dp[3][2]` directly | 2 |
| `5` (`e`) | `3` (`s`) | `'e'` vs `'s'` | No | $1 + \min(\text{del}: 2, \text{ins}: 4, \text{rep}: 2) = 1 + 2$ | 3 |

The bottom-right corner `dp[5][3]` yields the minimal edit distance of 3.

---

### Step-by-Step Algorithm

1. **Initialize State Matrix:** Construct a 2D table `dp` of size $(m + 1) \times (n + 1)$, where $m = \text{len}(word1)$ and $n = \text{len}(word2)$.
2. **Populate Base Borders:**
   - Set `dp[i][0] = i` for all $0 \le i \le m$.
   - Set `dp[0][j] = j` for all $0 \le j \le n$.
3. **Fill Table by Prefixes:** For `i` from 1 to $m$ and `j` from 1 to $n$:
   - If `word1[i - 1] == word2[j - 1]`, assign `dp[i][j] = dp[i - 1][j - 1]`.
   - Otherwise, assign `dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])`.
4. **Return Answer:** Return `dp[m][n]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Space-Optimized 1D Rolling Row" default>

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        m, n = len(word1), len(word2)
        # Ensure word2 is the shorter string to optimize auxiliary space
        if m < n:
            word1, word2 = word2, word1
            m, n = n, m

        # dp[j] stores edit distance from empty prefix of word1 to word2[:j]
        dp = list(range(n + 1))

        for i in range(1, m + 1):
            prev_diag = dp[0]
            dp[0] = i  # Cost of deleting i characters to form empty word2
            for j in range(1, n + 1):
                temp = dp[j]
                if word1[i - 1] == word2[j - 1]:
                    dp[j] = prev_diag
                else:
                    # 1 + min(delete: dp[j], insert: dp[j - 1], replace: prev_diag)
                    dp[j] = 1 + min(dp[j], dp[j - 1], prev_diag)
                prev_diag = temp

        return dp[n]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Full 2D Levenshtein Table">

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        m, n = len(word1), len(word2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        # Base case: converting prefix of word1 to empty string
        for i in range(m + 1):
            dp[i][0] = i

        # Base case: converting empty string to prefix of word2
        for j in range(n + 1):
            dp[0][j] = j

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if word1[i - 1] == word2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1]
                else:
                    dp[i][j] = 1 + min(
                        dp[i - 1][j],      # Delete
                        dp[i][j - 1],      # Insert
                        dp[i - 1][j - 1]   # Replace
                    )

        return dp[m][n]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Full 2D Levenshtein Table** | $O(m \times n)$ | $O(m \times n)$ | Visualizes the complete transformation matrix across all prefixes, using full grid allocation. |
| **Space-Optimized 1D Rolling Row** | $O(m \times n)$ | $O(\min(m, n))$ | Tracks the diagonal predecessor via a scalar variable, cutting memory to a single row array. |

---

### Common Pitfall: Forgetting Base Case Initialization for Empty Strings

A common mistake is initializing the entire DP matrix with zeros without filling row 0 and column 0. Transforming an empty string into a word of length $k$ requires exactly $k$ insertions, and transforming a word of length $k$ into an empty string requires $k$ deletions. Without setting `dp[i][0] = i` and `dp[0][j] = j`, transitions along the boundaries will produce incorrect zero-cost edits.

---

### Concise Interview Takeaway

Edit distance uses dynamic programming to evaluate three potential operations when characters differ: deletion (`dp[i - 1][j]`), insertion (`dp[i][j - 1]`), and replacement (`dp[i - 1][j - 1]`). Adding 1 to the minimum of these three choices guarantees optimal edit count. When characters match, inherit the diagonal predecessor directly without adding cost.
