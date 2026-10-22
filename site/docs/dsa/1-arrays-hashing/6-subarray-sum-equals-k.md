---
id: 6-subarray-sum-equals-k
title: "560. Subarray Sum Equals K"
description: "Keep a running total and count how often the total you need appeared before"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Sums</span>

> **Problem Statement:** You are given an array of integers `nums` and a number `k`. Count how many contiguous stretches of the array add up to `k`. A stretch means neighbouring elements, not a selection picked from anywhere.

```text
Input:  nums = [1, 1, 1], k = 2
Output: 2
```

---

### Picture it

Walk the array keeping a running total of everything you have added so far.

Now suppose your running total is `7` right now, and `k` is `2`. If at some earlier point in the walk the running total was `5`, then everything you added between that moment and now came to exactly `2`. That stretch is one of the answers.

```text
sum of a stretch = running total now  -  running total before the stretch started
```

So the only thing worth asking at each step is: how many times have I previously stood at a running total of `running - k`? Each of those earlier moments marks the start of a stretch ending right here.

---

### How to think about it

Testing every stretch means picking a start, picking an end, and adding up what is in between. That is far too much work for a long array.

The running total turns it into one pass, but only if you can answer "how many times have I seen this total before" quickly. That is a dictionary: map each running total to the number of times it has occurred.

At every element: add it to the running total, look up `running - k` in the dictionary and add that count to the answer, then record the current running total.

Two things are worth being careful about.

The dictionary stores **counts**, not just whether a total was seen. If the same running total occurred three times earlier, three different stretches end here, so the count has to be added, not a `1`.

The dictionary also has to start with a running total of `0` already seen once. That stands for the moment before the walk begins, and it is what lets a stretch that starts at the very first element be counted. Without it, an array like `[2]` with `k = 2` would return `0`.

Because this works on running totals rather than on the numbers themselves, it handles negative numbers and zeros without any special cases.

---

### Walking through the example

Take `nums = [1, 1, 1]` with `k = 2`. Start with a running total of `0`, an answer of `0`, and the dictionary holding "total `0`, seen once".

1. **Add `1`.** The running total is `1`. You need an earlier total of `1 - 2 = -1`, which has never occurred, so nothing is added. Record total `1`.
2. **Add `1`.** The running total is `2`. You need an earlier total of `0`, which occurred once, so the answer becomes `1`. Record total `2`.
3. **Add `1`.** The running total is `3`. You need an earlier total of `1`, which occurred once, so the answer becomes `2`. Record total `3`.

The answer is `2`, matching the two stretches of `[1, 1]`.

---

### The code

```python
from collections import defaultdict

class Solution:
    def subarraySum(self, nums: list[int], k: int) -> int:
        # a running total of 0 exists before the walk starts
        seen = defaultdict(int)
        seen[0] = 1

        running = 0
        total = 0

        for num in nums:
            running += num

            # every earlier point with this total starts a stretch ending here
            total += seen[running - k]

            seen[running] += 1

        return total
```

---

### Time and space complexity

#### Time: $O(n)$

One pass over the array. Each element costs an addition, one dictionary lookup and one dictionary update, and none of those get slower as the dictionary fills. So the work tracks the length of the array.

#### Space: $O(n)$

The dictionary holds one entry per distinct running total. If every running total along the way is different, which happens with an array of all positive numbers, it ends up with `n` entries, so the memory grows with the input.

---

### Remember this

A stretch sums to `k` exactly when the running total now, minus `k`, equals the running total at some earlier point. Keep a dictionary counting how often each running total has appeared, seed it with `0` seen once, and add the stored count rather than one. $O(n)$ time, $O(n)$ space, and negatives cause no trouble.
