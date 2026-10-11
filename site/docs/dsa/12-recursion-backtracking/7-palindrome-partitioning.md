---
id: 7-palindrome-partitioning
title: "131. Palindrome Partitioning"
description: "Backtracking with prefix palindrome validation cuts"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Partition DFS</span>

> **Problem Statement:** Given a string `s`, partition `s` such that every substring of the partition is a palindrome. Return all possible palindrome partitionings of `s`.

```text
Input:  s = "aab"
Output: [["a", "a", "b"], ["aa", "b"]]
Explanation: Every substring in the partitions ["a", "a", "b"] and ["aa", "b"] is a palindrome.
```

---

### The Intuitive Mental Model

Imagine holding a knife and slicing a loaf of bread into pieces, under one strict rule: you may only make a cut if the piece to the left of your knife is a valid palindrome.

Start with your knife at index `start = 0`. Scan a potential cut position `end` from `start` to `len(s) - 1`:
1. Check if the candidate slice `s[start : end + 1]` is a palindrome.
2. **If invalid:** Do not cut here! A non-palindrome piece violates the problem constraint. Advance `end` to try a wider slice.
3. **If valid:** Make the cut! Place `s[start : end + 1]` into your current basket `path`, and recursively hand the remaining suffix starting at `end + 1` to the next decision step.
4. **Base Case:** When `start == len(s)`, the knife has reached the end of the string. Every slice accumulated in `path` has been validated, so record a snapshot into the final results.

#### Brute Force: Generating All Partitions First
Generate all $2^{n - 1}$ possible partition configurations across string split points, then inspect each partition to see if all substrings are palindromes. This wastes exponential time constructing invalid partitions like `["a", "ab"]`.

#### Optimal Approach: In-Flight Palindrome Pruning
Only branch when the candidate substring `s[start : end + 1]` is a verified palindrome. If the candidate slice is not a palindrome, prune the branch immediately. Checking with two pointers avoids extra string allocations, exploring only valid palindrome trajectories.

#### Execution Walkthrough

Let us trace `s = "aab"`:

| Step | Cut `start` | Cut `end` | Substring Candidate | Is Palindrome? | Path State (`path`) | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `0` | `0` | `"a"` | Yes | `["a"]` | Recurse with `start = 1` |
| **2** | `1` | `1` | `"a"` | Yes | `["a", "a"]` | Recurse with `start = 2` |
| **3** | `2` | `2` | `"b"` | Yes | `["a", "a", "b"]` | Recurse with `start = 3` |
| **4** | `3` | - | - | - | `["a", "a", "b"]` | Base case: collect snapshot |
| **5** | `2` | `2` | Backtrack | - | `["a", "a"]` | Loop finished for `start = 2` |
| **6** | `1` | `2` | `"ab"` | No | `["a"]` | Prune branch |
| **7** | `0` | `1` | `"aa"` | Yes | `["aa"]` | Recurse with `start = 2` |
| **8** | `2` | `2` | `"b"` | Yes | `["aa", "b"]` | Recurse with `start = 3` |
| **9** | `3` | - | - | - | `["aa", "b"]` | Base case: collect snapshot |
| **10** | `0` | `2` | `"aab"` | No | `[]` | Prune branch |

---

### Step-by-Step Algorithm

1. **Initialize Containers:** Create `result = []` and `path = []`.
2. **Define Palindrome Checker:** Define helper `is_palindrome(left, right)` using two pointers moving inward toward the center.
3. **Define Backtrack Helper:** Define `backtrack(start)` where `start` represents the index of the remaining suffix.
4. **Base Case Check:** If `start >= len(s)`, the entire string has been partitioned. Append a copy of `path` to `result` and return.
5. **Iterate Cut Positions:** Loop `end` from `start` to `len(s) - 1`:
   - If `is_palindrome(start, end)` is `True`:
     - Append `s[start : end + 1]` to `path`.
     - Recurse: `backtrack(end + 1)`.
     - Backtrack: pop from `path`.
6. **Trigger and Return:** Call `backtrack(0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Backtracking with Two-Pointer Check" default>

```python
class Solution:
    def partition(self, s: str) -> list[list[str]]:
        result: list[list[str]] = []
        path: list[str] = []

        def is_palindrome(left: int, right: int) -> bool:
            while left < right:
                if s[left] != s[right]:
                    return False
                left += 1
                right -= 1
            return True

        def backtrack(start: int) -> None:
            # Reached end of string: valid partitioning complete
            if start >= len(s):
                result.append(path.copy())
                return

            for end in range(start, len(s)):
                if is_palindrome(start, end):
                    # Cut out the palindrome substring
                    path.append(s[start : end + 1])
                    # Recurse on the remaining suffix
                    backtrack(end + 1)
                    # Backtrack to try wider slices
                    path.pop()

        backtrack(0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: DP Precomputed Palindromes">

```python
class Solution:
    def partition(self, s: str) -> list[list[str]]:
        n = len(s)
        # dp[i][j] is True if s[i..j] is a palindrome
        dp = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                if s[i] == s[j] and (j - i <= 2 or dp[i + 1][j - 1]):
                    dp[i][j] = True

        result: list[list[str]] = []
        path: list[str] = []

        def backtrack(start: int) -> None:
            if start == n:
                result.append(path.copy())
                return

            for end in range(start, n):
                if dp[start][end]:
                    path.append(s[start : end + 1])
                    backtrack(end + 1)
                    path.pop()

        backtrack(0)
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pointer Check** | $O(n \cdot 2^n)$ | $O(n)$ | Validates each substring on the fly using two pointers. Minimal $O(n)$ auxiliary stack space. |
| **DP Precomputation** | $O(n \cdot 2^n)$ | $O(n^2)$ | Precomputes all palindrome substrings in $O(n^2)$ time and space. Lookups become $O(1)$ during backtracking. |

*(Where $n$ is the length of `s`. There are $2^{n - 1}$ possible partition configurations, and copying each valid partition of length $n$ takes $O(n)$ time.)*

---

### Common Pitfall: Slicing with End Instead of End + 1

In Python, slice indices are half-open (`[start:stop]`). Writing `s[start:end]` excludes the character at `end`, which causes single-character substrings to be empty strings `""` when `start == end`. Always use `s[start : end + 1]` when extracting candidate substrings.

---

### Concise Interview Takeaway

For **Palindrome Partitioning**, model the solution as placing cuts between characters. Advance a cut index `end` from `start` to `len(s) - 1`. If the prefix `s[start : end + 1]` forms a valid palindrome, append it, recurse on `end + 1`, and pop during backtrack. This prunes invalid branches in-flight while bounding auxiliary space to $O(n)$.
