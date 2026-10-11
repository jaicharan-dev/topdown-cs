---
id: 2-longest-repeating-character-replacement
title: "424. Longest Repeating Character Replacement"
description: "Sliding window with frequency high-watermark tracking"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** Given a string `s` consisting of uppercase English letters and an integer `k`, you may choose at most `k` characters and replace them with any other uppercase English letter. Return the length of the longest substring containing identical characters that can be formed.

```text
Input:  s = "AABABBA", k = 1
Output: 4
Explanation: Replace the one 'B' in substring "AABA" to form "AAAA", which has length 4.
```

---

### The Intuitive Mental Model

In any substring window of length $L$, if the most frequent character appears $M$ times, turning the entire window into that single character requires replacing all remaining letters. The number of replacements needed is:

$$\text{replacements} = L - M = (\text{right} - \text{left} + 1) - \text{max\_freq}$$

If the required replacements are at most $k$, the window is valid because our budget of $k$ replacements is sufficient. If the replacements exceed $k$, the window is invalid and must shrink or slide forward.

#### Brute Force: Evaluating All Windows
The brute force strategy tests every possible substring $s[i \dots j]$. For each substring, we tally the counts of all 26 uppercase English letters, identify the most frequent character count $M$, and verify whether $(j - i + 1) - M \le k$. Evaluating all $O(n^2)$ substrings takes $O(26 \cdot n^2)$ time. For strings with tens of thousands of characters, this quadratic runtime is too slow.

#### Optimal Approach: Sliding Window with Frequency High-Watermark
Instead of recalculating substrings from scratch, we use a two-pointer sliding window:
- Expand `right` across the string and increment the count of `s[right]` in a frequency map.
- Track `max_freq`, the maximum frequency of any character observed in the current window.
- When `(right - left + 1) - max_freq > k`, our replacement budget is exceeded. We decrement `counts[s[left]]` and shift `left` forward by 1.

Crucially, we do not need to rescan the frequency table to decrement `max_freq` when `left` shifts forward. `max_freq` represents a historical high-watermark. To discover a valid window that is strictly longer than our best so far, we would need to encounter a character whose frequency is strictly greater than our existing `max_freq`. Any smaller frequency inside a contracted window cannot set a new record. Maintaining `max_freq` monotonically non-decreasing keeps each step strictly $O(1)$.

#### Execution Walkthrough

Let us trace `s = "AABABBA"` with `k = 1`:

| Step | Pointer `right` | Char `s[right]` | Window Span | Frequency Map | `max_freq` | Replacements ($L - M$) | Valid? | Action Taken | Active Window |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `'A'` | `[0, 0]` | `{'A': 1}` | 1 | $1 - 1 = 0 \le 1$ | Yes | Expand | `"A"` |
| **2** | `1` | `'A'` | `[0, 1]` | `{'A': 2}` | 2 | $2 - 2 = 0 \le 1$ | Yes | Expand | `"AA"` |
| **3** | `2` | `'B'` | `[0, 2]` | `{'A': 2, 'B': 1}` | 2 | $3 - 2 = 1 \le 1$ | Yes | Expand | `"AAB"` |
| **4** | `3` | `'A'` | `[0, 3]` | `{'A': 3, 'B': 1}` | 3 | $4 - 3 = 1 \le 1$ | Yes | Expand | `"AABA"` |
| **5** | `4` | `'B'` | `[0, 4]` | `{'A': 3, 'B': 2}` | 3 | $5 - 3 = 2 > 1$ | No | Evict `s[0]`, slide `left` to 1 | `"ABAB"` |
| **6** | `5` | `'B'` | `[1, 5]` | `{'A': 2, 'B': 3}` | 3 | $5 - 3 = 2 > 1$ | No | Evict `s[1]`, slide `left` to 2 | `"BABB"` |
| **7** | `6` | `'A'` | `[2, 6]` | `{'A': 3, 'B': 2}` | 3 | $5 - 3 = 2 > 1$ | No | Evict `s[2]`, slide `left` to 3 | `"ABBA"` |

The maximum window size attained without exceeding the replacement budget is 4.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create a hash map `counts` to store character frequencies, a pointer `left = 0`, a frequency high-watermark `max_freq = 0`, and `max_len = 0`.
2. **Expand Right Boundary:** Iterate `right` across indices $0$ to $n - 1$.
3. **Update Character Count:** Increment `counts[s[right]]` by 1.
4. **Update High-Watermark:** Set `max_freq = max(max_freq, counts[s[right]])`.
5. **Enforce Replacement Budget:** Check if `(right - left + 1) - max_freq > k`. If invalid, decrement `counts[s[left]]` and advance `left += 1`.
6. **Track Maximum Length:** Update `max_len = max(max_len, right - left + 1)`.
7. **Return Result:** Return `max_len` once the iteration terminates.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: High-Watermark Sliding Window" default>

```python
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        counts: dict[str, int] = {}
        left = 0
        max_freq = 0
        max_len = 0

        for right in range(len(s)):
            char = s[right]
            counts[char] = counts.get(char, 0) + 1
            
            # High-watermark of the most frequent character
            max_freq = max(max_freq, counts[char])

            # If replacement budget is exceeded, slide left boundary
            if (right - left + 1) - max_freq > k:
                counts[s[left]] -= 1
                left += 1

            max_len = max(max_len, right - left + 1)

        return max_len
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Rescanning Frequencies">

```python
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        counts: dict[str, int] = {}
        left = 0
        max_len = 0

        for right in range(len(s)):
            char = s[right]
            counts[char] = counts.get(char, 0) + 1

            # Contract left pointer until window satisfies replacement budget
            while (right - left + 1) - max(counts.values()) > k:
                counts[s[left]] -= 1
                left += 1

            max_len = max(max_len, right - left + 1)

        return max_len
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Rescanning Frequencies** | $O(26 \cdot n)$ | $O(1)$ | Scans all alphabet frequencies using `max(counts.values())` on contractions. Correct but incurs repeated alphabet overhead. |
| **High-Watermark Window** | $O(n)$ | $O(1)$ | Retains historical maximum frequency without recalculating on contraction. Guarantees strict $O(1)$ amortized steps. |

---

### Common Pitfall: Unnecessary High-Watermark Rescanning

Developers often assume `max_freq` must be decremented whenever `left` is shifted forward and an element is evicted. Rescanning all 26 character frequencies every time `left` increments degrades performance. Because a candidate window can only set a new global maximum if its dominant character count exceeds the previously observed `max_freq`, stale values of `max_freq` never lead to incorrect window lengths.

---

### Concise Interview Takeaway

A sliding window is valid as long as $(\text{length} - \text{max\_freq}) \le k$. Tracking `max_freq` as a historical high-watermark avoids rescanning character frequencies when shifting `left`, maintaining an optimal $O(n)$ runtime with $O(1)$ space across the 26 uppercase letters.
