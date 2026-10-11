---
id: 1-longest-substring-without-repeating-characters
title: "3. Longest Substring Without Repeating Characters"
description: "Dynamic sliding window with hash map index teleportation"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** Given a string `s`, find the length of the longest substring without repeating characters.

```text
Input:  s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
```

---

### The Intuitive Mental Model

Imagine stretching a rubber band across the string from index `left` to index `right`. As the `right` pointer moves forward, it introduces each new character into the window. If the current character is unique within the active window, the rubber band expands, recording a potentially new maximum length.

#### Brute Force: Generating All Substrings
The naive strategy checks every possible substring. For every starting index `i` from $0$ to $n - 1$ and every ending index `j` from `i` to $n - 1$, we collect characters into a hash set. As soon as a duplicate appears, we abort and test the next substring. Examining all $O(n^2)$ substrings and validating uniqueness takes $O(n^2)$ time with a set (or $O(n^3)$ if checking each substring from scratch). For long strings, this repeated work creates massive computational overhead.

#### Optimal Approach: Sliding Window with Index Teleportation
Instead of resetting to the beginning when a duplicate appears, we maintain a dynamic sliding window:
- As `right` advances, we record the most recent index where each character appeared in a hash map `last_seen`.
- If `s[right]` was seen previously within our active window, we have a collision.
- Rather than contracting `left` one index at a time with a `while` loop, we teleport `left` directly past the previous occurrence: `left = last_seen[char] + 1`.

A critical detail arises with strings like `"abba"`: when reading the second `'a'` at index 3, its previous index was 0. However, `left` has already advanced to 2 due to the duplicate `'b'`. Teleporting `left` backward would reintroduce the duplicate `'b'`. Therefore, `left` must only move forward: we require `last_seen[char] >= left` before teleporting.

#### Execution Walkthrough

Let us trace `s = "abcabcbb"`:

| Step | Pointer `right` | Char `s[right]` | `last_seen` Lookup | Action Taken | Window | Window Length | `max_len` | `last_seen` State |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | `0` | `'a'` | Not in map | Expand window | `"a"` | 1 | 1 | `{'a': 0}` |
| **2** | `1` | `'b'` | Not in map | Expand window | `"ab"` | 2 | 2 | `{'a': 0, 'b': 1}` |
| **3** | `2` | `'c'` | Not in map | Expand window | `"abc"` | 3 | 3 | `{'a': 0, 'b': 1, 'c': 2}` |
| **4** | `3` | `'a'` | `last_seen['a'] = 0 >= left` | Teleport `left` to $0 + 1 = 1$ | `"bca"` | 3 | 3 | `{'a': 3, 'b': 1, 'c': 2}` |
| **5** | `4` | `'b'` | `last_seen['b'] = 1 >= left` | Teleport `left` to $1 + 1 = 2$ | `"cab"` | 3 | 3 | `{'a': 3, 'b': 4, 'c': 2}` |
| **6** | `5` | `'c'` | `last_seen['c'] = 2 >= left` | Teleport `left` to $2 + 1 = 3$ | `"abc"` | 3 | 3 | `{'a': 3, 'b': 4, 'c': 5}` |
| **7** | `6` | `'b'` | `last_seen['b'] = 4 >= left` | Teleport `left` to $4 + 1 = 5$ | `"cb"` | 2 | 3 | `{'a': 3, 'b': 6, 'c': 5}` |
| **8** | `7` | `'b'` | `last_seen['b'] = 6 >= left` | Teleport `left` to $6 + 1 = 7$ | `"b"` | 1 | 3 | `{'a': 3, 'b': 7, 'c': 5}` |

The maximum window length observed throughout the traversal is 3.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create an empty hash map `last_seen` to track the most recent index of each character, set `left = 0`, and `max_len = 0`.
2. **Iterate with Index:** Traverse `s` using `enumerate(s)` to track pointer `right` and character `char`.
3. **Resolve Duplicate:** Check if `char` exists in `last_seen` and its recorded position satisfies `last_seen[char] >= left`. If so, jump `left` forward to `last_seen[char] + 1`.
4. **Update Mapping:** Record the current position in `last_seen[char] = right`.
5. **Update Maximum Window:** Calculate the current window span `right - left + 1` and update `max_len = max(max_len, right - left + 1)`.
6. **Return Result:** Return `max_len` after the loop finishes.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Index Teleportation" default>

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last_seen: dict[str, int] = {}
        left = 0
        max_len = 0

        for right, char in enumerate(s):
            # If char was seen within current window, teleport left past it
            if char in last_seen and last_seen[char] >= left:
                left = last_seen[char] + 1

            # Update latest position of character
            last_seen[char] = right

            # Track maximum valid window length
            max_len = max(max_len, right - left + 1)

        return max_len
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Sliding Window with Set">

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        seen: set[str] = set()
        left = 0
        max_len = 0

        for right in range(len(s)):
            # Shrink window step-by-step until duplicate is removed
            while s[right] in seen:
                seen.remove(s[left])
                left += 1
            
            seen.add(s[right])
            max_len = max(max_len, right - left + 1)

        return max_len
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Sliding Window with Set** | $O(n)$ | $O(\min(n, |\Sigma|))$ | Simple set contraction. Each character is added and removed at most once ($2n$ total operations). |
| **Index Teleportation** | $O(n)$ | $O(\min(n, |\Sigma|))$ | Stores index mappings to jump `left` in $O(1)$. Single pass with no inner loop contractions. |

---

### Common Pitfall: Stale Index Regression

A common mistake is unconditionally setting `left = last_seen[char] + 1` without verifying whether the duplicate lies inside the active window. In strings such as `"abba"`, at index 3 (`'a'`), the character `'a'` was last seen at index 0. If `left` is currently at index 2, unconditionally moving `left` back to $0 + 1 = 1$ causes `left` to move backward, reintroducing already evicted duplicates. Always ensure `last_seen[char] >= left` or use `left = max(left, last_seen[char] + 1)`.

---

### Concise Interview Takeaway

Expand the sliding window using pointer `right` while tracking each character's latest index in a hash map. When an encountered character has an index at or after `left`, teleport `left` directly past it in $O(1)$ time rather than contracting one element at a time. This yields a clean, optimal $O(n)$ single-pass solution.
