---
id: 4-reverse-words-in-a-string
title: "151. Reverse Words in a String"
description: "Tokenizing whitespace vs the classic two-step reversal technique"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** Given an input string `s`, reverse the order of the words. A word is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space. Return a string of the words in reverse order concatenated by a single space, with no leading, trailing, or multiple consecutive spaces.

```text
Input:  s = "the sky is blue"
Output: "blue is sky the"
Explanation: The words are reversed in order and joined by a single space.
```

---

### The Intuitive Mental Model

Imagine a sentence containing inconsistent spacing: `"  the  sky  is   blue  "`.

#### Brute Force: Built-in Tokenization and Reversal
The most straightforward approach treats words like cards in a deck. Strip away irregular surrounding whitespace, split the sentence into clean tokens `["the", "sky", "is", "blue"]`, reverse the order of the cards to `["blue", "is", "sky", "the"]`, and join them with single spaces.

In Python, `s.split()` handles this directly in linear time by automatically trimming whitespace and collapsing consecutive spaces.

#### Optimal Approach: Two-Pointer Backward Scan
In technical interviews, you are often asked to implement the logic without high-level library functions:
- Traverse the string from right to left using two pointers (`i` and `j`).
- Skip past any trailing or consecutive whitespace.
- Anchor the right end of a word at `j`, move pointer `i` leftward until encountering another space or the string start, and extract the word slice `s[i + 1 : j + 1]`.
- Append each word directly to a list, collecting words in reverse order as you go.

In systems languages with mutable strings (such as C++ or Java `char[]`), you can also achieve $O(1)$ auxiliary space through the classic double reversal: reverse the entire string, then reverse each word individually and compress whitespace in place.

#### Execution Walkthrough

Let us trace `s = "  the sky  "` using a backward two-pointer scan:

| Step | Pointer `i` | Action | Word Extracted | Collected Words |
| :---: | :---: | :--- | :---: | :--- |
| **1** | Index `10` down to `8` | Skip trailing spaces | None | `[]` |
| **2** | Index `8` down to `6` | Scan word `"sky"` (indices `6..8`) | `"sky"` | `["sky"]` |
| **3** | Index `5` | Skip intermediate space | None | `["sky"]` |
| **4** | Index `4` down to `2` | Scan word `"the"` (indices `2..4`) | `"the"` | `["sky", "the"]` |
| **5** | Index `1` down to `0` | Skip leading spaces, finish scan | None | `["sky", "the"]` |

Joining the collected words with `" "` yields `"sky the"`.

---

### Step-by-Step Algorithm

1. **Initialize Pointers and Storage:** Initialize pointer `i` at the end of the string (`len(s) - 1`) and an empty list `words = []` to store parsed tokens.
2. **Skip Redundant Spaces:** While `i >= 0` and `s[i] == ' '`, decrement `i`. If `i < 0`, terminate the loop.
3. **Identify Word Boundaries:** Set `j = i`. Decrement `i` while `i >= 0` and `s[i] != ' '`.
4. **Collect Word Token:** Append the slice `s[i + 1 : j + 1]` to `words`.
5. **Repeat and Join:** Continue the loop until the front of the string is reached. Concatenate the tokens with `" ".join(words)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two-Pointer Backward Scan" default>

```python
class Solution:
    def reverseWords(self, s: str) -> str:
        words: list[str] = []
        i = len(s) - 1

        while i >= 0:
            # Skip spaces moving backwards
            while i >= 0 and s[i] == ' ':
                i -= 1
            if i < 0:
                break

            # Mark the end of the word
            j = i
            # Move backwards to find the start of the word
            while i >= 0 and s[i] != ' ':
                i -= 1

            # Extract the word and append
            words.append(s[i + 1 : j + 1])

        return " ".join(words)
```

  </TabItem>
  <TabItem value="brute" label="Alternative: Built-in Split and Reverse">

```python
class Solution:
    def reverseWords(self, s: str) -> str:
        # s.split() automatically strips extra whitespace and collapses duplicates
        words = s.split()
        return " ".join(reversed(words))
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pointer Scan** | $O(n)$ | $O(n)$ | Scans characters backwards in a single pass without relying on high-level split helpers. Allocates $O(n)$ memory for extracted tokens. |
| **Built-in Split** | $O(n)$ | $O(n)$ | Clean and idiomatic Python implementation. Fast in practice, but relies on language-level tokenization. |

---

### Common Pitfall: Handling Consecutive Whitespace with Explicit Delimiters

Calling `s.split(' ')` with an explicit space delimiter treats adjacent spaces as separate boundaries, generating empty strings `""` in the output array. In contrast, calling `s.split()` with no arguments automatically strips leading and trailing spaces and collapses multiple consecutive spaces. When writing manual pointer loops, ensure you skip all consecutive spaces before slicing out each word.

---

### Concise Interview Takeaway

In Python, `s.split()` cleanly handles irregular whitespace and isolates words in $O(n)$ time. When asked for manual character-level handling, use a backward two-pointer scan to extract words from right to left. For low-level languages with mutable strings, mention the classic double reversal trick (reverse entire string, then reverse each word) to achieve $O(1)$ auxiliary space.
