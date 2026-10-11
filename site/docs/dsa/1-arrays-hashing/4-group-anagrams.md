---
id: 4-group-anagrams
title: "49. Group Anagrams"
description: "Character-frequency tuple keys vs sorted-string hashing"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Map</span>

> **Problem Statement:** Given an array of strings `strs`, group the anagrams together. You can return the answer in any order. An anagram is a word formed by rearranging the letters of another word, using all original letters exactly once.

```text
Input:  strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
Output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
Explanation: "eat", "tea", and "ate" are anagrams and map to one group; "tan" and "nat" form another; "bat" forms the third.
```

---

### The Intuitive Mental Model

An anagram is a word produced by rearranging the letters of another word using all original characters exactly once. For example, `"eat"`, `"tea"`, and `"ate"` are anagrams because each contains one `'a'`, one `'e'`, and one `'t'`. To group anagrams together, every member of the same anagram family must map to an identical canonical key.

#### Brute Force: Pairwise Anagram Comparison
Comparing every pair of words to determine if they are anagrams requires $O(n^2 \cdot k)$ operations, which becomes prohibitively slow when the list contains thousands of strings.

#### Optimal Approach: Canonical Signature Hashing
Instead of comparing pairs, we compute a canonical signature for each word to serve as a hash map key:
- **Sorted String Key:** Sorting the characters of any anagram yields the exact same string (e.g., `"eat"`, `"tea"`, and `"ate"` all become `"aet"`). This requires $O(k \log k)$ time per word of length $k$.
- **Character Count Tuple Key:** Counting the 26 lowercase English character frequencies yields an identical 26-element tuple for all anagrams (e.g., $(1, 0, \dots, 1, \dots)$). Because tuples are hashable in Python, they serve directly as dictionary keys in $O(k)$ time per word.

#### Execution Walkthrough

Let us trace `strs = ["eat", "tea", "tan", "ate", "nat", "bat"]` using the sorted string signature:

| Step | Word | Sorted Key | Action Taken | Hash Map State (`groups`) |
| :---: | :---: | :---: | :--- | :--- |
| **1** | `"eat"` | `"aet"` | Add `"eat"` to `"aet"` bucket | `{"aet": ["eat"]}` |
| **2** | `"tea"` | `"aet"` | Add `"tea"` to `"aet"` bucket | `{"aet": ["eat", "tea"]}` |
| **3** | `"tan"` | `"ant"` | Create `"ant"` bucket | `{"aet": ["eat", "tea"], "ant": ["tan"]}` |
| **4** | `"ate"` | `"aet"` | Add `"ate"` to `"aet"` bucket | `{"aet": ["eat", "tea", "ate"], "ant": ["tan"]}` |
| **5** | `"nat"` | `"ant"` | Add `"nat"` to `"ant"` bucket | `{"aet": ["eat", "tea", "ate"], "ant": ["tan", "nat"]}` |
| **6** | `"bat"` | `"abt"` | Create `"abt"` bucket | `{"aet": ["eat", "tea", "ate"], "ant": ["tan", "nat"], "abt": ["bat"]}` |

---

### Step-by-Step Algorithm

1. **Initialize Bucket Map:** Create a dictionary `groups = defaultdict(list)` to store word clusters indexed by canonical keys.
2. **Compute Canonical Signature:** For each word in `strs`:
   - Sort the characters lexicographically: `key = "".join(sorted(word))`.
   - Append `word` to `groups[key]`.
3. **Extract Groups:** Return `list(groups.values())` containing all grouped anagram lists.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Sorted String Key" default>

```python
from collections import defaultdict

class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        groups: dict[str, list[str]] = defaultdict(list)
        
        for word in strs:
            key = "".join(sorted(word))
            groups[key].append(word)
            
        return list(groups.values())
```

  </TabItem>
  <TabItem value="count" label="Alternative: Frequency Tuple Key">

```python
from collections import defaultdict

class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        groups: dict[tuple[int, ...], list[str]] = defaultdict(list)
        
        for word in strs:
            count = [0] * 26
            for char in word:
                count[ord(char) - ord("a")] += 1
            groups[tuple(count)].append(word)
            
        return list(groups.values())
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

Let $n$ be the number of strings and $k$ be the maximum length of a string.

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Sorted String Key** | $O(n \cdot k \log k)$ | $O(n \cdot k)$ | Sorts each word to construct string keys. Minimal code overhead and highly performant for short words. |
| **Frequency Tuple Key** | $O(n \cdot k)$ | $O(n \cdot k)$ | Tallies 26 character frequencies into an immutable tuple key. Optimal linear scaling for large string lengths $k$. |

---

### Common Pitfall: Unhashable Mutable Keys in Python

In Python, list objects are mutable and therefore unhashable. Attempting to use a 26-element list directly as a dictionary key (`groups[count].append(word)`) raises a `TypeError: unhashable type: 'list'`. When using character counts as hash keys, always convert the array to an immutable tuple via `tuple(count)` before indexing into the map.

---

### Concise Interview Takeaway

For **Group Anagrams**, map each string to an invariant canonical representation. Sorting characters yields an $O(n \cdot k \log k)$ string key that is clean and idiomatic. If string length $k$ is large, construct an immutable 26-slot frequency tuple in $O(n \cdot k)$ linear time. Group elements under their common key using a hash map.
