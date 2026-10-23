---
id: 1-top-k-frequent-elements
title: "347. Top K Frequent Elements"
description: "Counts are bounded by the array length, so use them as bucket numbers"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bucket Sort / Min-Heap</span>

> **Problem Statement:** Given an array and a number `k`, return the `k` values that appear most often, in any order.

```text
Input:  nums = [1, 1, 1, 2, 2, 3], k = 2
Output: [1, 2]
```

---

### Picture it

Counting is the easy half: one pass with a dictionary gives every value's frequency.

The second half is picking the `k` largest counts, and sorting them is more than the question needs. Sorting arranges **everything**, when all you want is the top few.

The observation that beats sorting is about the counts themselves. In an array of `n` values, no count can exceed `n`. So the possible counts form a small, known range, and anything with a known small range can be bucketed rather than sorted.

Make a row of buckets numbered `0` to `n`, and drop each value into the bucket matching its count. Then read the buckets from the high end down, collecting values until you have `k`.

```text
counts: 1 appears 3 times, 2 appears twice, 3 once

bucket 3: [1]
bucket 2: [2]
bucket 1: [3]
```

---

### How to think about it

Three passes, each linear.

1. **Count** every value with a dictionary.
2. **Bucket** by count, where bucket `i` holds every value seen exactly `i` times. A bucket must be a list, since several values can share a count.
3. **Read down** from the highest bucket, adding values until `k` of them are collected.

No comparison sorting is involved anywhere, which is how this gets to $O(n)$, below the $O(n \log n)$ a sort would cost.

**The heap alternative** fits the block's name and is worth knowing. Keep a min-heap of size `k` holding the best candidates seen so far, pushing each value with its count and popping the smallest whenever the heap grows past `k`. That is $O(n \log k)$, slightly worse in theory, and it is the right answer when the data arrives as a stream and you cannot build a bucket row ahead of time.

---

### Walking through the example

Take `nums = [1, 1, 1, 2, 2, 3]` with `k = 2`.

1. **Count.** The value `1` appears three times, `2` appears twice, `3` once.
2. **Bucket.** Bucket `3` holds `[1]`. Bucket `2` holds `[2]`. Bucket `1` holds `[3]`. The rest are empty.
3. **Read down.** Start at bucket `6`, which is empty, and keep descending. Bucket `3` yields `1`, so one value is collected. Bucket `2` yields `2`, giving two, which is `k`, so stop.

The answer is `[1, 2]`, and buckets below `2` are never examined.

---

### The code

```python
from collections import Counter

class Solution:
    def topKFrequent(self, nums: list[int], k: int) -> list[int]:
        counts = Counter(nums)

        # no value can appear more than len(nums) times, so the range is known
        buckets = [[] for _ in range(len(nums) + 1)]
        for value, count in counts.items():
            buckets[count].append(value)

        out = []
        for count in range(len(nums), 0, -1):
            for value in buckets[count]:
                out.append(value)
                if len(out) == k:
                    return out

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

Counting is one pass. Filling the buckets is one pass over the distinct values, which is at most `n`. Reading down visits each bucket once and stops as soon as `k` values are collected.

Sorting the counts would be $O(n \log n)$, and the heap version $O(n \log k)$. Bucketing wins because the counts are small integers in a known range, which lets them act as indices rather than things to compare.

#### Space: $O(n)$

The count dictionary plus the bucket row, which has `n + 1` entries.

---

### Remember this

Count first, then notice that no count can exceed the array length, so the counts can be used directly as bucket indices and never sorted. Read the buckets from the top until `k` values are collected. $O(n)$ time and space. Use the size-`k` min-heap instead when the data is a stream, at $O(n \log k)$.
