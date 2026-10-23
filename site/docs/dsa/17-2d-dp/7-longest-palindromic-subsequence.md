---
id: 7-longest-palindromic-subsequence
title: "516. Longest Palindromic Subsequence"
description: "A palindrome reads the same backwards, so compare the string with its own reverse"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Interval DP</span>

> **Problem Statement:** Given a string, return the length of its longest subsequence that reads the same forwards and backwards. The characters keep their order but need not be neighbours.

```text
Input:  s = "bbbab"
Output: 4
```

---

### Picture it

Two routes lead to the answer, and both are worth knowing.

**The one-line route.** A palindromic subsequence of a string is a subsequence that also appears, in the same order, in the string's reverse. So the answer is the Longest Common Subsequence of the string and its reverse, and the previous problem solves it unchanged.

**The direct route**, which is the one that generalises. Work on **stretches** of the string, asking for the longest palindromic subsequence inside each. Look at the two ends of a stretch:

- **They match.** Both can be used, wrapped around whatever the inside gives, so the answer is `2 +` the stretch without its ends.
- **They differ.** At least one of them is unusable, so drop each in turn and take the better.

```text
ends match:     2 + inside
ends differ:    max(drop the left end, drop the right end)
```

---

### How to think about it

The direct version is **interval dynamic programming**, which has one thing to get right: the order of filling.

A stretch depends on **shorter** stretches, so every shorter one must be computed first. Two ways to arrange that: loop over lengths from small to large, or loop the left end **downward** while the right end runs upward. The second is the common idiom, because the shorter stretches sit below and to the left in the table.

Stretches of length one are palindromes of length one, which seeds everything.

The answer is the entry covering the whole string, from the first character to the last.

Mention the reverse trick in an interview even if you write the direct version, since it shows you connected the two problems. The direct version is more valuable to know, though, because interval filling is how a whole family of problems works, including palindrome partitioning with minimum cuts and matrix chain multiplication.

Note the difference from Longest Palindromic **Substring** in the 1D block: a substring must be contiguous, which is why that one expands around centres, while a subsequence may skip characters, which is why this one needs a table.

---

### Walking through the example

Take `s = "bbbab"`.

1. **Single characters** are each palindromes of length `1`.
2. **Stretch `bb` at positions 0 and 1.** The ends match, so `2 +` the empty inside, giving `2`.
3. **Stretch `bbb` at positions 0 to 2.** The ends match, so `2 +` the inside `b`, which is `1`, giving `3`.
4. **Stretch `bba` at positions 1 to 3.** The ends differ, so the better of `bb` which is `2` and `ba` which is `1`, giving `2`.
5. **Stretch `bbab` at positions 1 to 4.** The ends match, `b` and `b`, so `2 +` the inside `ba`, which is `1`, giving `3`.
6. **The whole string, positions 0 to 4.** The ends match, `b` and `b`, so `2 +` the inside `bba`, which is `2`, giving `4`.

The answer is `4`, from `bbbb`.

---

### The code

```python
class Solution:
    def longestPalindromeSubseq(self, s: str) -> int:
        n = len(s)
        table = [[0] * n for _ in range(n)]

        # left runs downward so shorter stretches are always already filled
        for left in range(n - 1, -1, -1):
            table[left][left] = 1   # a single character is a palindrome

            for right in range(left + 1, n):
                if s[left] == s[right]:
                    table[left][right] = 2 + table[left + 1][right - 1]
                else:
                    table[left][right] = max(table[left + 1][right],
                                             table[left][right - 1])

        return table[0][n - 1]
```

When the ends match on a stretch of length two, the inside is an empty range whose table entry is `0`, so the result is `2` without any special case.

---

### Time and space complexity

#### Time: $O(n^2)$

One comparison per stretch, and there are about `n²/2` stretches.

#### Space: $O(n^2)$

The table. It can be reduced to two rows, as with the other alignment tables.

---

### Remember this

Either compare the string with its reverse and reuse Longest Common Subsequence, or fill a table over stretches: matching ends give `2 +` the inside, differing ends give the better of dropping each end. Fill shorter stretches first, which the downward left-end loop arranges. Contrast with the **substring** version, which must be contiguous and so expands around centres instead. $O(n^2)$ time.
