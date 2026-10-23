---
id: 8-sliding-window-maximum
title: "239. Sliding Window Maximum"
description: "Keep a queue of candidates, and let every new value evict the smaller ones waiting behind it"
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Queue</span>

> **Problem Statement:** You are given an array `nums` and a window of width `k` that slides from the left end to the right end, one step at a time. Report the largest value in the window at each of its positions.

```text
Input:  nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3
Output: [3, 3, 5, 5, 6, 7]
```

---

### Picture it

Recomputing the maximum at every position is the obvious approach, and it rereads the same values over and over. The useful question is: which values could ever be the answer in future?

Suppose the window holds `3` and then a `5` arrives to its right. The `3` is now worthless. While the `5` is in the window, the `3` can never be the maximum; and the `5` will outlive the `3`, because it arrived later and therefore leaves later. The `3` has no future at all, so it can be thrown away the moment the `5` turns up.

Apply that rule to everything you hold and you end up with a queue of candidates whose values are always in decreasing order: the current maximum at the front, then the value that takes over when it expires, and so on.

---

### How to think about it

Keep a double-ended queue holding **positions**, not values. Positions are what let you tell when something has slid out of the window.

At each new element, three things happen:

1. **Evict from the back.** While the value at the back of the queue is no larger than the new value, remove it. Those values are the worthless ones from the picture above.
2. **Add the new position** to the back.
3. **Expire from the front.** If the position at the front has fallen outside the window, remove it.

After that, the front of the queue is the maximum of the current window, because everything bigger that is still in range would have evicted it, and everything smaller sits behind it.

Once the window is actually full, meaning you have seen at least `k` elements, record that front value.

Storing positions rather than values is the detail that makes step three possible. With values alone you could not tell whether the maximum you are holding is still inside the window.

---

### Walking through the example

Take `nums = [1, 3, -1, -3, 5, 3, 6, 7]` with `k = 3`. The queue below is shown as values for readability.

1. **`1`** goes in. The queue is `[1]`.
2. **`3`** arrives and evicts the `1`, which can never win again. The queue is `[3]`.
3. **`-1`** is smaller than `3`, so it waits behind it. The queue is `[3, -1]`. The window is full, so record `3`.
4. **`-3`** waits behind too. The queue is `[3, -1, -3]`. Record `3`.
5. **`5`** evicts `-3`, then `-1`, then `3` itself. The queue is `[5]`. Record `5`.
6. **`3`** waits behind. The queue is `[5, 3]`. Record `5`.
7. **`6`** evicts `3` and then `5`. The queue is `[6]`. Record `6`.
8. **`7`** evicts `6`. The queue is `[7]`. Record `7`.

The output is `[3, 3, 5, 5, 6, 7]`.

---

### The code

```python
from collections import deque

class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        candidates = deque()  # positions, with values in decreasing order
        out = []

        for i, value in enumerate(nums):
            # anything no larger than the newcomer can never win again
            while candidates and nums[candidates[-1]] <= value:
                candidates.pop()

            candidates.append(i)

            # the front may have slid out of the window
            if candidates[0] <= i - k:
                candidates.popleft()

            if i >= k - 1:
                out.append(nums[candidates[0]])

        return out
```

---

### Time and space complexity

#### Time: $O(n)$

The eviction loop makes this look quadratic, and again the answer is to count the work rather than the loops. Each position is appended to the queue exactly once and removed exactly once, whether from the back by an eviction or from the front by expiry. That is at most `2n` queue operations across the entire run.

The naive approach of scanning each window is $O(n k)$, which for a large window is dramatically worse.

#### Space: $O(k)$

The queue never holds more than one position per slot in the window, since anything that falls out of range is dropped from the front.

---

### Remember this

A value is worthless the moment a larger one arrives to its right, because the newcomer is both bigger and longer-lived. Keep a queue of positions whose values decrease from front to back: evict smaller values from the back, expire out-of-range positions from the front, and the front is always the window's maximum. $O(n)$ time, $O(k)$ space.
