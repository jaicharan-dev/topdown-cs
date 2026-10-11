---
id: 8-word-break
title: "139. Word Break"
description: "Determine string segmentation validity using bottom-up boolean DP array"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Subproblem Tabulation</span>

> **Problem Statement:** Given a string `s` and a dictionary of strings `wordDict`, return `True` if `s` can be segmented into a space-separated sequence of one or more dictionary words. Note that the same word in the dictionary may be reused multiple times in the segmentation.

```text
Input:  s = "leetcode", wordDict = ["leet", "code"]
Output: true
Explanation: Return true because "leetcode" can be segmented as "leet code".
```

---

### The Intuitive Mental Model

We must determine whether the full string $s[0 \dots n-1]$ can be completely segmented into valid words from the dictionary.

Trying to match words greedily from left to right often fails. For example, if `s = "cars"` and the dictionary contains `["car", "ca", "rs"]`, greedily taking `"car"` leaves `"s"`, which cannot be matched. However, choosing `"ca"` leaves `"rs"`, which succeeds.

#### Brute Force: Recursive Backtracking
A naive recursive approach tests every matching dictionary word as a prefix, then recurses on the remainder. In the worst case (such as `s = "aaaaab"` with dictionary `["a", "aa", "aaa"]`), this explores an exponential number of dead-end partitions, leading to $O(2^n)$ runtime.

#### Optimal Approach: Bottom-Up Boolean Tabulation
Instead of guessing prefixes from the start, we can compute answers backwards from the end of the string:
- Let `dp[i]` represent whether the suffix $s[i \dots n-1]$ can be segmented into dictionary words.
- Base Case: `dp[n] = True` because an empty string requires zero words and is trivially valid.
- For each index $i$ moving backwards from $n - 1$ down to 0, test each dictionary word $w$:
  1. Does $w$ fit within the remaining string? ($i + \text{len}(w) \le n$)
  2. Does $w$ match the substring starting at $i$? ($s[i \dots i + \text{len}(w)] == w$)
  3. Does the suffix following $w$ form a valid sequence? (`dp[i + len(w)] == True`)

If all three conditions hold, set `dp[i] = True` and break early to the next index. Finally, `dp[0]` provides the answer for the entire string.

#### Execution Walkthrough

Let us trace `s = "leetcode"` with `wordDict = ["leet", "code"]`:

| Suffix Index ($i$) | Remaining Substring (`s[i:]`) | Word Tested | Match & Landing State | `dp[i]` Status |
| :---: | :---: | :---: | :---: | :---: |
| **8** | `""` | - | Base case (empty string) | `True` |
| **7..5** | `"e"`, `"de"`, `"ode"` | `"leet"`, `"code"` | Exceeds bounds or mismatches | `False` |
| **4** | `"code"` | `"code"` | Matches `"code"`, lands on `dp[8] == True` | `True` |
| **3..1** | `"ecode"`, ... | `"leet"`, `"code"` | Exceeds bounds or mismatches | `False` |
| **0** | `"leetcode"` | `"leet"` | Matches `"leet"`, lands on `dp[4] == True` | `True` |

The answer `dp[0]` is `True`.

---

### Step-by-Step Algorithm

1. **Initialize DP Table:** Create a boolean array `dp` of length $n + 1$ initialized to `False`. Set the base case `dp[n] = True`.
2. **Iterate Backwards:** Loop index `i` from $n - 1$ down to 0:
   - For each `word` in `wordDict`:
     - Determine length: `word_len = len(word)`.
     - Check if `i + word_len <= n` and `s[i : i + word_len] == word`.
     - If both hold, update `dp[i] = dp[i + word_len]`.
     - If `dp[i]` becomes `True`, break early out of the inner loop.
3. **Return Global Result:** Return `dp[0]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bottom-Up Tabulation" default>

```python
class Solution:
    def wordBreak(self, s: str, wordDict: list[str]) -> bool:
        n = len(s)
        dp = [False] * (n + 1)
        dp[n] = True

        for i in range(n - 1, -1, -1):
            for word in wordDict:
                word_len = len(word)
                if i + word_len <= n and s[i : i + word_len] == word:
                    dp[i] = dp[i + word_len]
                    if dp[i]:
                        break

        return dp[0]
```

  </TabItem>
  <TabItem value="memo" label="Alternative: Top-Down Memoization">

```python
class Solution:
    def wordBreak(self, s: str, wordDict: list[str]) -> bool:
        memo: dict[int, bool] = {}
        words = set(wordDict)
        n = len(s)

        def dfs(start: int) -> bool:
            if start == n:
                return True
            if start in memo:
                return memo[start]

            for end in range(start + 1, n + 1):
                if s[start:end] in words and dfs(end):
                    memo[start] = True
                    return True

            memo[start] = False
            return False

        return dfs(0)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Recursion)** | $O(2^n)$ | $O(n)$ | Tries every possible word partition recursively without caching. |
| **Top-Down Memoization** | $O(n \times m \times k)$ | $O(n)$ | Caches suffix booleans via recursion and set lookups with call stack overhead. |
| **Bottom-Up Tabulation** | $O(n \times m \times k)$ | $O(n)$ | Evaluates suffixes iteratively from right to left, breaking early on valid matches. |

---

### Common Pitfall: Greedy Forward Matching

A greedy approach that takes the first matching prefix word fails when that choice prevents a valid decomposition later on. For instance, in `s = "cars"` with `wordDict = ["car", "ca", "rs"]`, greedily choosing `"car"` leaves `"s"`, which is not present in the dictionary. Dynamic programming evaluates all valid prefixes at every index, ensuring that the globally valid combination is found.

---

### Concise Interview Takeaway

Work backwards from the end of the string. Define `dp[i]` as whether suffix $s[i:]$ can be formed from dictionary words. If a word matches the prefix at index $i$ and lands on a confirmed subproblem (`dp[i + len(word)] == True`), set `dp[i] = True` and break early. This converts an exponential branching search into an efficient polynomial time solution.
