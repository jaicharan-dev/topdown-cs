---
id: 5-longest-common-subsequence
title: "1143. Longest Common Subsequence"
description: "Matching letters extend the diagonal, mismatches take the better of dropping one"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">String Alignment DP</span>

> **Problem Statement:** Given two strings, return the length of the longest sequence of characters appearing in both, in the same order but not necessarily together.

```text
Input:  text1 = "abcde", text2 = "ace"
Output: 3
```

---

### Picture it

Put one string down the side of a table and the other along the top. Each cell answers one question:

> How long is the best common subsequence of the first `i` characters of one and the first `j` of the other?

Standing in a cell, compare the two characters those indices point at:

**They match.** That character can join the subsequence, and the rest is the best you could do before either of them, which is the cell diagonally up-left. So this cell is `1 +` that.

**They differ.** At least one of the two characters is not in the answer, so try dropping each in turn: the cell above, meaning drop a character from the side string, and the cell to the left, meaning drop one from the top. Take the better.

```text
match:     1 + diagonal
no match:  max(above, left)
```

---

### How to think about it

Make the table one larger in each direction, with an extra first row and column of zeros standing for "one of the strings is empty". That removes every boundary check: the diagonal, the above and the left always exist.

Fill it row by row. Every cell is one comparison and either an addition or a maximum.

The answer is in the bottom-right corner, which represents both strings in full.

**Why matching takes the diagonal** rather than the cell above or left is the part to be clear on. Using the matched pair consumes **one character from each** string, so the remaining problem is both strings shortened by one, which is precisely the diagonal.

This table is the foundation for a family of problems. Edit Distance is the same table with a different rule in each cell, and Longest Palindromic Subsequence is this exact algorithm run against the string's own reverse. Recognising the shape is worth more than memorising any single one.

---

### Walking through the example

With `abcde` down the side and `ace` along the top:

```text
      ""  a  c  e
  ""   0  0  0  0
   a   0  1  1  1
   b   0  1  1  1
   c   0  1  2  2
   d    0  1  2  2
   e   0  1  2  3
```

- **Row `a`, column `a`:** they match, so `1 +` the diagonal zero, giving `1`.
- **Row `b`:** `b` matches nothing, so each cell copies the better of above and left, leaving the row unchanged from the one above it.
- **Row `c`, column `c`:** they match, so `1 +` the diagonal `1`, giving `2`.
- **Row `e`, column `e`:** they match, so `1 +` the diagonal `2`, giving `3`.

The bottom-right holds `3`, from the subsequence `ace`.

---

### The code

```python
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        m, n = len(text1), len(text2)

        # the extra row and column stand for an empty string
        table = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if text1[i - 1] == text2[j - 1]:
                    # the pair is used, so both strings shorten by one
                    table[i][j] = 1 + table[i - 1][j - 1]
                else:
                    # drop a character from one string or the other
                    table[i][j] = max(table[i - 1][j], table[i][j - 1])

        return table[m][n]
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

One comparison per cell.

#### Space: $O(m \cdot n)$

The table. It can be reduced to two rows, since each row only reads the one above it, which brings it to $O(n)$. The full table is needed only if the subsequence itself has to be reconstructed by walking back through it.

---

### Remember this

Lay the two strings out as a table where each cell is the answer for two prefixes. Matching characters take `1 +` the **diagonal**, because the pair consumes one character from each string; mismatches take the better of above and left. Pad with a row and column of zeros for the empty prefixes. This table is the base for Edit Distance and for the palindromic subsequence problem. $O(m \cdot n)$ time.
