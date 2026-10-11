---
id: 1-top-k-frequent-elements
title: "347. Top K Frequent Elements"
description: "Linear-time bucket sort by frequency and min-heap extraction"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bucket Sort / Min-Heap</span>

> **Problem Statement:** Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.

```text
Input:  nums = [1, 1, 1, 2, 2, 3], k = 2
Output: [1, 2]
Explanation: Element 1 has a frequency of 3, element 2 has a frequency of 2, and element 3 has a frequency of 1. The 2 most frequent elements are [1, 2].
```

---

### The Intuitive Mental Model

Imagine tallying votes in an election. First, count the votes each candidate receives using a hash map: `{candidate: vote_count}`.

To extract the top $k$ candidates, we can explore two distinct approaches depending on whether we use comparison-based structures or count-indexed structures.

```
nums = [1, 1, 1, 2, 2, 3],  k = 2
Frequencies: {1: 3, 2: 2, 3: 1}

Bucket Array (index = frequency):
Index:   0    1      2      3    4   5   6
Values: []  [[3]]  [[2]]  [[1]] []  []  []

Scan backwards:
Bucket 3 -> add 1  (collected: [1])
Bucket 2 -> add 2  (collected: [1, 2] -> reached k = 2, STOP!)
Output: [1, 2]
```

#### Brute Force: Sorting Unique Frequencies

The most direct solution counts occurrences with a hash map, extracts all unique key-value pairs, and sorts them by frequency in descending order. When the array contains $u$ unique elements, sorting takes $O(u \log u)$ time. In the worst case where every element is distinct ($u = n$), this runs in $O(n \log n)$ time.

#### Optimal Approach: Bucket Sort by Frequency

Can we beat comparison sorting? Notice that the frequency of any element is naturally bounded between $1$ and $n$, where $n$ is the total length of `nums`.

Because frequencies are bounded integers, we can create an array of $n + 1$ buckets where the index represents the frequency itself:
- `buckets[1]` stores numbers appearing once.
- `buckets[2]` stores numbers appearing twice.
- `buckets[n]` stores any number appearing in every position.

Scanning the buckets backwards from index $n$ down to $1$ gathers the most frequent numbers first, completing in strict $O(n)$ linear time. Alternatively, a min-heap capped at size $k$ offers a robust $O(n \log k)$ online streaming approach.

#### Execution Walkthrough

Let `nums = [1, 1, 1, 2, 2, 3]` and $k = 2$. Frequency map is `{1: 3, 2: 2, 3: 1}`:

| Step | Bucket Index (Frequency) | Bucket Contents | Action Taken | Collected Elements | Status |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | Index 6 to 4 | `[]` | No elements have frequency 4, 5, or 6 | `[]` | Need 2 elements |
| **2** | Index 3 | `[1]` | Append `1` to result | `[1]` | Need 1 element |
| **3** | Index 2 | `[2]` | Append `2` to result | `[1, 2]` | Reached $k = 2$; terminate |
| **4** | Index 1 | `[3]` | Skipped because target count $k$ is fulfilled | `[1, 2]` | Complete |

---

### Step-by-Step Algorithm

1. **Count Frequencies:** Build a frequency dictionary `count` mapping each distinct number to its total occurrences using `Counter(nums)`.
2. **Initialize Buckets:** Construct an array of empty lists `buckets` of length $n + 1$, where indices range from $0$ to $n$.
3. **Populate Buckets:** For each `(num, freq)` pair in `count.items()`, append `num` to `buckets[freq]`.
4. **Collect Top K:**
   - Initialize an empty list `result`.
   - Traverse `freq` from $n$ down to $1$:
     - For each number in `buckets[freq]`, append it to `result`.
     - If `len(result) == k`, immediately return `result`.
5. **Return Result:** Return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Bucket Sort" default>

```python
from collections import Counter


class Solution:
    def topKFrequent(self, nums: list[int], k: int) -> list[int]:
        # Count frequency of each number
        count = Counter(nums)

        # Create buckets where index = frequency
        # Maximum possible frequency is len(nums)
        buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]

        for num, freq in count.items():
            buckets[freq].append(num)

        # Iterate backwards from highest frequency to lowest
        result: list[int] = []
        for freq in range(len(nums), 0, -1):
            for num in buckets[freq]:
                result.append(num)
                if len(result) == k:
                    return result

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Min-Heap of Size K">

```python
from collections import Counter
import heapq


class Solution:
    def topKFrequent(self, nums: list[int], k: int) -> list[int]:
        count = Counter(nums)

        # Maintain a min-heap of size k storing (freq, num)
        heap: list[tuple[int, int]] = []

        for num, freq in count.items():
            heapq.heappush(heap, (freq, num))
            if len(heap) > k:
                heapq.heappop(heap)

        return [num for freq, num in heap]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Frequency Sorting** | $O(n \log n)$ | $O(n)$ | Straightforward to implement, but sorting all unique keys introduces unnecessary logarithmic comparison overhead. |
| **Min-Heap (Size K)** | $O(n \log k)$ | $O(n)$ | Ideal for streaming data scenarios where the full dataset size is not known in advance. Evicts lowest frequency elements. |
| **Bucket Sort** | $O(n)$ | $O(n)$ | Optimal linear runtime. Uses frequency as an array index, bypassing comparisons entirely. |

---

### Common Pitfall: Sizing the Bucket Array to Size N Instead of N + 1

A common off-by-one bug is initializing `buckets = [[] for _ in range(len(nums))]`. If all elements in `nums` are identical, the frequency of that element is `len(nums)`. Indexing `buckets[len(nums)]` on an array of length `len(nums)` raises an `IndexError`. Always allocate $n + 1$ buckets so that frequencies from $0$ to $n$ are valid indices.

---

### Concise Interview Takeaway

Because element frequencies cannot exceed the array length $n$, bucket sort by frequency delivers optimal $O(n)$ time. For online streaming where $n$ is unbounded, a min-heap capped at size $k$ provides an efficient $O(n \log k)$ solution.
