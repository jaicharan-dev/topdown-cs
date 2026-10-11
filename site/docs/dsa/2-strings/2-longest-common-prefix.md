---
id: 2-longest-common-prefix
title: "14. Longest Common Prefix"
description: "Vertical scanning across string columns with early exit"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Vertical Scanning</span>

> **Problem Statement:** Given an array of strings `strs`, find the longest common prefix string amongst them. If there is no common prefix, return an empty string `""`.

```text
Input:  strs = ["flower", "flow", "flight"]
Output: "fl"
Explanation: The longest prefix shared among all three words is "fl".
```

---

### The Intuitive Mental Model

Imagine stacking words vertically like departure listings on an airport flight board:

```text
Index:    0   1   2   3   4   5
Word 0:   f   l   o   w   e   r
Word 1:   f   l   o   w
Word 2:   f   l   i   g   h   t
          |   |   |
          f   l  MISMATCH ('o' vs 'i')
```

There are two primary ways to find the shared prefix:

#### Brute Force: Horizontal Scanning
Horizontal scanning compares strings in sequential pairs: compare Word 0 and Word 1 to obtain `"flow"`, then compare `"flow"` with Word 2 to narrow it down to `"fl"`.

While correct, horizontal scanning does extra work when a later string is very short or shares no prefix at all. If the 100th word starts with `'z'`, comparing the first 99 words in depth is wasted effort.

#### Optimal Approach: Vertical Scanning
Vertical scanning looks straight down column by column across all strings simultaneously:
- Column 0: All three words have `'f'`. Continue.
- Column 1: All three words have `'l'`. Continue.
- Column 2: Word 0 and Word 1 have `'o'`, but Word 2 has `'i'`. Stop immediately!

Vertical scanning guarantees the earliest possible termination: the instant any string runs out of characters or disagrees, we return the prefix formed so far without inspecting any remaining columns.

#### Execution Walkthrough

Let us trace `strs = ["flower", "flow", "flight"]`:

| Column Index `i` | Char in `strs[0]` | Char in `strs[1]` | Char in `strs[2]` | Column Status | Current Prefix |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **0** | `'f'` | `'f'` | `'f'` | All match | `"f"` |
| **1** | `'l'` | `'l'` | `'l'` | All match | `"fl"` |
| **2** | `'o'` | `'o'` | `'i'` | Mismatch at `strs[2][2]` | Return `strs[0][:2]` (`"fl"`) |

The loop halts immediately at column index `2`, returning `"fl"`.

---

### Step-by-Step Algorithm

1. **Handle Edge Case:** If `strs` is empty, return an empty string `""`.
2. **Select Reference String:** Choose `strs[0]` as the column reference guide.
3. **Iterate Through Character Columns:** Loop through each character `char` at index `i` in `strs[0]` using `enumerate(strs[0])`.
4. **Compare Across Remaining Words:** For each string `other_word` in `strs[1:]`:
   - If `i == len(other_word)` (the word has ended) or `other_word[i] != char` (mismatch found), return `first_word[:i]`.
5. **Return Full Reference String:** If all columns pass without mismatch, the entire first string is the common prefix. Return `first_word`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Vertical Scanning" default>

```python
class Solution:
    def longestCommonPrefix(self, strs: list[str]) -> str:
        if not strs:
            return ""

        # Use the first string as our column-by-column reference
        first_word = strs[0]

        for i, char in enumerate(first_word):
            # Inspect the i-th character across all remaining words
            for other_word in strs[1:]:
                # Stop if other_word has ended or character doesn't match
                if i == len(other_word) or other_word[i] != char:
                    return first_word[:i]

        return first_word
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Horizontal Scanning">

```python
class Solution:
    def longestCommonPrefix(self, strs: list[str]) -> str:
        if not strs:
            return ""

        prefix = strs[0]

        for word in strs[1:]:
            # Shrink prefix until it matches the start of current word
            while not word.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""

        return prefix
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Vertical Scanning** | $O(S)$ | $O(1)$ | Where $S$ is the sum of characters. Exits at the exact first mismatch, achieving minimal checks in typical inputs. |
| **Horizontal Scanning** | $O(S)$ | $O(1)$ | Compares full prefixes across words sequentially. May perform unnecessary comparisons if short words or mismatches appear late. |

---

### Common Pitfall: Index Out of Range on Variable String Lengths

Strings in `strs` often have varying lengths. Accessing `other_word[i]` directly without checking string bounds leads to an `IndexError` when `other_word` is shorter than `strs[0]`. By placing `i == len(other_word)` before `other_word[i] != char`, short-circuit evaluation prevents out-of-range indexing and safely triggers the early return.

---

### Concise Interview Takeaway

Scan character columns vertically across all strings simultaneously. The algorithm exits the exact moment any string terminates or produces a mismatch, guaranteeing optimal early exit with $O(1)$ auxiliary space and at most $O(S)$ time complexity.
