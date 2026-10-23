---
id: 6-edit-distance
title: "72. Edit Distance"
description: "Three neighbours, three operations, and a free move when the letters already match"
sidebar_position: 6
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">String Alignment DP</span>

> **Problem Statement:** Given two words, return the fewest single-character edits needed to turn the first into the second. An edit inserts, deletes or replaces one character.

```text
Input:  word1 = "horse", word2 = "ros"
Output: 3
```

---

### Picture it

Same table as Longest Common Subsequence, with each cell asking a cost rather than a length:

> What is the cheapest way to turn the first `i` characters of one word into the first `j` of the other?

Now the three neighbours each correspond to one of the three permitted edits:

```text
diagonal  replace a character   (or free, if they already match)
above     delete a character from the first word
left      insert a character into the first word
```

When the two characters at this position **match**, nothing needs doing: the cost is whatever the diagonal was, with no edit added. That free move is the only place a cost does not increase, and it is what the whole table is really searching for.

When they differ, all three edits are available, so take the cheapest and add one.

---

### How to think about it

Pad the table with an extra first row and column, as before, but this time they are **not** zeros. They are the costs of turning a prefix into nothing, or nothing into a prefix:

- Row zero counts insertions: turning an empty word into `j` characters costs `j`.
- Column zero counts deletions: turning `i` characters into nothing costs `i`.

Getting those boundaries right is half the problem, and leaving them as zeros is the usual mistake.

Then each inner cell is one comparison: equal characters take the diagonal unchanged, different characters take one more than the smallest of the three neighbours.

The answer sits in the bottom-right corner.

Matching the three neighbours to the three operations is worth being able to recite, because it is the question that follows "what is the recurrence". Above means the first word had a character the second did not, so delete it. Left means the second word had one the first did not, so insert it. Diagonal means both had a character in that position, so replace if they differ.

---

### Walking through the example

Turning `horse` into `ros`:

```text
       ""  r  o  s
  ""    0  1  2  3
   h    1  1  2  3
   o    2  2  1  2
   r    3  2  2  2
   s    4  3  3  2
   e    5  4  4  3
```

- **The first row and column** count pure insertions and deletions.
- **Row `o`, column `o`:** the characters match, so the cost is the diagonal unchanged, `1`.
- **Row `r`, column `r`:** they match, so take the diagonal, `2`.
- **Row `s`, column `s`:** they match, giving `2`.
- **Row `e`:** `e` matches nothing, so every cell is one more than its cheapest neighbour, ending at `3`.

The answer is `3`: replace `h` with `r`, delete `r`, delete `e`.

---

### The code

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        m, n = len(word1), len(word2)
        table = [[0] * (n + 1) for _ in range(m + 1)]

        # turning a prefix into nothing, and nothing into a prefix
        for i in range(m + 1):
            table[i][0] = i
        for j in range(n + 1):
            table[0][j] = j

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if word1[i - 1] == word2[j - 1]:
                    table[i][j] = table[i - 1][j - 1]   # free, no edit needed
                else:
                    table[i][j] = 1 + min(
                        table[i - 1][j - 1],   # replace
                        table[i - 1][j],       # delete
                        table[i][j - 1],       # insert
                    )

        return table[m][n]
```

---

### Time and space complexity

#### Time: $O(m \cdot n)$

One comparison and at most one three-way minimum per cell.

#### Space: $O(m \cdot n)$

The table, reducible to two rows since each row reads only the one above and the cell to its left.

---

### Remember this

The same table as Longest Common Subsequence with costs instead of lengths, where the three neighbours are the three edits: diagonal replaces, above deletes, left inserts. Matching characters take the diagonal with **no** cost added, which is the free move the whole table hunts for. Fill the first row and column with `j` and `i` rather than zeros, since those are the costs of building from or reducing to nothing. $O(m \cdot n)$ time.
