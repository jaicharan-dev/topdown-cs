---
id: 7-palindrome-partitioning
title: "131. Palindrome Partitioning"
description: "Choose where the first piece ends, and only recurse when that piece is a palindrome"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Partition DFS</span>

> **Problem Statement:** Given a string, return every way of cutting it into pieces such that each piece reads the same forwards and backwards.

```text
Input:  s = "aab"
Output: [["a", "a", "b"], ["aa", "b"]]
```

---

### Picture it

The choice at each step is **where to put the next cut**.

Standing at the start of what remains, the first piece could be one character, or two, or all of it. Try each length in turn. If that piece is a palindrome, keep it and carry on cutting whatever is left. If it is not, abandon that length and try the next one.

```text
"aab"
 |-> "a"   palindrome, continue with "ab"
 |-> "aa"  palindrome, continue with "b"
 |-> "aab" not a palindrome, abandon
```

When nothing is left to cut, every piece chosen along the way was a palindrome, so the arrangement is recorded.

---

### How to think about it

The recursion carries a start position.

**At the end of the string**, record a copy of the pieces collected so far.

**Otherwise**, loop over every possible end position. Take the piece from the start to there, and if it is a palindrome, append it, recurse from just past it, then remove it.

The palindrome test is the pruning. Without it the recursion would enumerate all `2^(n-1)` ways to cut a string and filter afterwards; testing before recursing kills whole subtrees the moment a piece fails.

Checking a piece with two pointers from both ends is $O(\text{piece length})$. For a faster version, precompute a table saying whether each start-and-end pair is a palindrome, built from the fact that a piece is a palindrome when its ends match and its inside is one. That turns each test into a lookup, and it is the standard follow-up when asked to speed this up.

The pieces are **substrings**, so they must be contiguous and in order. That is why only the cut position is ever chosen, and nothing is ever skipped.

---

### Walking through the example

Take `s = "aab"`.

1. **First piece `"a"`**, a palindrome. Continue from position 1 with `"ab"` remaining.
   - **Next piece `"a"`**, a palindrome. Continue with `"b"`.
     - **Next piece `"b"`**, a palindrome. Nothing remains, so record `["a", "a", "b"]`.
   - **Back up. Next piece `"ab"`**, not a palindrome, so abandon.
2. **Back to the start. First piece `"aa"`**, a palindrome. Continue with `"b"`.
   - **Next piece `"b"`.** Nothing remains, so record `["aa", "b"]`.
3. **First piece `"aab"`**, not a palindrome, so abandon.

Two arrangements, matching the expected answer.

---

### The code

```python
class Solution:
    def partition(self, s: str) -> list[list[str]]:
        out = []
        pieces = []

        def is_palindrome(left: int, right: int) -> bool:
            while left < right:
                if s[left] != s[right]:
                    return False
                left += 1
                right -= 1
            return True

        def cut(start: int) -> None:
            if start == len(s):
                out.append(pieces[:])
                return

            for end in range(start, len(s)):
                # test before recursing: this is the pruning
                if not is_palindrome(start, end):
                    continue

                pieces.append(s[start:end + 1])
                cut(end + 1)
                pieces.pop()

        cut(0)
        return out
```

---

### Time and space complexity

#### Time: $O(n \cdot 2^n)$ in the worst case

A string of `n` characters has `n - 1` possible cut positions, each taken or not, so there are up to `2^(n-1)` arrangements, and building each costs up to `n`. The worst case is a string like `"aaaa"`, where every piece is a palindrome and nothing prunes.

For ordinary strings the palindrome test cuts most branches almost immediately.

#### Space: $O(n)$ beyond the answer

Recursion depth and the list of pieces. The precomputed palindrome table, if used, is $O(n^2)$.

---

### Remember this

The decision is where the next cut goes, so loop over end positions and recurse from just past the piece you took. Test each piece for being a palindrome **before** recursing, which is what prunes the search rather than filtering at the end. Precompute the palindrome table when asked to make it faster.
