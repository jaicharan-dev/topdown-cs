---
id: 7-partition-labels
title: "763. Partition Labels"
description: "Partition string into maximal parts where each character appears in at most one part"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Interval Expansion / Two-Pass</span>

> **Problem Statement:** Given a string `s` of lowercase English letters, partition the string into as many parts as possible such that each letter appears in at most one part. Return a list of integers representing the size of each partition in order from left to right.

```text
Input:  s = "ababcbacadefegdehijhklij"
Output: [9, 7, 8]
Explanation:
The partition is "ababcbaca", "defegde", "hijhklij".
This is a partition so that each letter appears in at most one part.
A partition like "ababcbacadefegde", "hijhklij" is invalid because it has fewer parts.
```

---

### The Intuitive Mental Model

If you encounter the character `'a'` at index 0 and its final occurrence anywhere in the string occurs at index 8, every partition that includes index 0 is forced to extend to at least index 8. There is no escaping this constraint because all `'a'`s must reside within the exact same partition.

#### Brute Force: Interval Merging

We could treat each character's first and last occurrence as a contiguous range $[first, last]$. Across 26 possible unique lowercase letters, we generate up to 26 intervals. Finding the non-overlapping groupings would require sorting these intervals and running a standard interval-merging algorithm. While this takes $O(n + k \log k)$ time where $k \le 26$, it introduces extra data structures and sorting overhead.

#### Optimal Approach: Greedy Horizon Expansion

Instead of creating and sorting explicit interval objects, we can solve this in a single streaming scan after recording the last known occurrence of each character:
1. Maintain an active partition horizon `end`.
2. As you scan from left to right, each character `ch` demands that the partition extend to at least its final index. Thus, update `end = max(end, last_occurrence[ch])`.
3. The exact moment your scanning index `i` catches up to the furthest boundary you have been chasing (`i == end`), you have successfully enclosed every single occurrence of every character encountered since the start of the current chunk. You can safely cut the partition, record its length `end - start + 1`, and reset your starting pointer to `i + 1`.

#### Execution Walkthrough

Let us trace the first partition of `s = "ababcbacadefegdehijhklij"`:

Precomputed last occurrences for characters: `{'a': 8, 'b': 5, 'c': 7, 'd': 14, 'e': 15, 'f': 11, ...}`.

| Index ($i$) | Character (`ch`) | Last Occurrence (`last_occurrence[ch]`) | Current Horizon (`end`) | Reached Horizon? (`i == end`) | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | `a` | 8 | $\max(0, 8) = 8$ | No | Expand horizon to 8 |
| **1** | `b` | 5 | $\max(8, 5) = 8$ | No | Horizon remains 8 |
| **2** | `a` | 8 | $\max(8, 8) = 8$ | No | Horizon remains 8 |
| **3** | `b` | 5 | $\max(8, 5) = 8$ | No | Horizon remains 8 |
| **4** | `c` | 7 | $\max(8, 7) = 8$ | No | Horizon remains 8 |
| **5** | `b` | 5 | $\max(8, 5) = 8$ | No | Horizon remains 8 |
| **6** | `a` | 8 | $\max(8, 8) = 8$ | No | Horizon remains 8 |
| **7** | `c` | 7 | $\max(8, 7) = 8$ | No | Horizon remains 8 |
| **8** | `a` | 8 | $\max(8, 8) = 8$ | **Yes** ($i == end$) | Cut partition! Length = $8 - 0 + 1 = 9$. Reset `start = 9`. |

---

### Step-by-Step Algorithm

1. **Precompute Last Indices:** Traverse string `s` to record the last index of each character in a dictionary `last_occurrence`.
2. **Initialize Pointers:**
   - `start = 0`: The beginning index of the current partition.
   - `end = 0`: The furthest boundary among all characters seen in the current partition.
   - `partitions = []`: Output list storing the length of each partition.
3. **Scan and Cut:**
   - Iterate through `s` using `enumerate(s)` to track index `i` and character `ch`.
   - Update `end = max(end, last_occurrence[ch])`.
   - When `i == end`, a valid minimal partition has completed:
     - Append `end - start + 1` to `partitions`.
     - Advance `start = i + 1`.
4. **Return:** Return `partitions`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Greedy Horizon Scan" default>

```python
class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        # Precompute the last index at which each character appears
        last_occurrence = {ch: i for i, ch in enumerate(s)}
        partitions: list[int] = []

        start = 0
        end = 0

        # Scan through s, expanding the boundary to envelop all character occurrences
        for i, ch in enumerate(s):
            end = max(end, last_occurrence[ch])

            # Once the scan index reaches the furthest required character boundary
            if i == end:
                partitions.append(end - start + 1)
                start = i + 1

        return partitions
```

  </TabItem>
  <TabItem value="intervals" label="Alternative: Interval Merging">

```python
class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        first: dict[str, int] = {}
        last: dict[str, int] = {}

        for i, ch in enumerate(s):
            if ch not in first:
                first[ch] = i
            last[ch] = i

        intervals = sorted([[first[ch], last[ch]] for ch in first])
        merged: list[list[int]] = []

        for interval in intervals:
            if not merged or merged[-1][1] < interval[0]:
                merged.append(interval)
            else:
                merged[-1][1] = max(merged[-1][1], interval[1])

        return [iv[1] - iv[0] + 1 for iv in merged]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Interval Merging** | $O(n + k \log k)$ | $O(k)$ | Builds $[first, last]$ intervals for unique characters and merges them. Involves sort overhead. |
| **Greedy Horizon Scan** | $O(n)$ | $O(k)$ | Uses precomputed indices to expand boundaries on the fly. Requires two passes and zero sorting. |

*Note: Here $k$ is the alphabet size ($k \le 26$), making $O(k)$ equivalent to $O(1)$ auxiliary space.*

---

### Common Pitfall: Confusing Maximum Partitions with Minimum Partitions

The problem asks for *as many parts as possible* (maximizing the count of partitions). A single partition containing the entire string trivially satisfies the constraint that every character appears in at most one part, but it produces only 1 partition.

Cutting the partition greedily at the exact earliest moment where `i == end` guarantees that each slice is as short as possible, yielding the maximum number of partitions.

---

### Concise Interview Takeaway

For Partition Labels, first record the last occurrence index of each character in a dictionary. Then iterate through the string, dynamically expanding the required boundary `end = max(end, last_occurrence[ch])`. The exact moment `i == end`, cut the partition and record its length `end - start + 1`. Because the character set is bounded by 26 English letters, this algorithm runs in optimal $O(n)$ time and $O(1)$ auxiliary space.
