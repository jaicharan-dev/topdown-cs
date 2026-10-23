---
id: 6-minimum-size-subarray-sum
title: "209. Minimum Size Subarray Sum"
description: "Grow until the sum is enough, then squeeze from the left while it still is"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** You are given an array of positive numbers and a `target`. Find the shortest stretch of the array whose sum reaches the target or goes past it. If no stretch does, return `0`.

```text
Input:  target = 7, nums = [2, 3, 1, 2, 4, 3]
Output: 2
```

---

### Picture it

This window has two moods, and they alternate.

**Hungry:** the sum is not yet enough, so the right edge reaches forward and swallows the next number.

**Greedy:** the sum is enough, so the answer might be shorter than what you are holding. Record the length, then give back the number at the left edge and check whether it is still enough.

Grow until you qualify, squeeze while you still qualify, repeat. The smallest length seen during any squeeze is the answer.

---

### How to think about it

The whole method depends on one promise in the problem: **every number is positive**.

That is what makes the window behave predictably. Adding a number always makes the sum bigger, and removing one always makes it smaller. So "keep shrinking while the sum is still enough" is guaranteed to find the tightest left edge for the current right edge, and it can never accidentally need to grow back.

If the array could contain negatives or zeros, this falls apart completely. Removing a negative number would *increase* the sum, so shrinking would no longer be a one-way move and the window logic would be wrong. That version of the problem needs prefix sums and a deque instead, which is worth saying out loud if an interviewer asks what changes.

Start the best length at something impossible, like the array length plus one. At the end, if it was never beaten, no stretch ever reached the target, so return `0`.

---

### Walking through the example

Take `target = 7` and `nums = [2, 3, 1, 2, 4, 3]`.

1. **Swallow `2`, `3`, `1`.** The sum is `6`, not enough yet.
2. **Swallow `2`.** The sum is `8`, which qualifies. The window is `[2, 3, 1, 2]`, length `4`. Best so far.
3. **Squeeze:** drop the `2` on the left. The sum is `6`, no longer enough, so stop squeezing.
4. **Swallow `4`.** The sum is `10`, qualifies. The window is `[3, 1, 2, 4]`, length `4`, which does not beat `4`.
5. **Squeeze:** drop `3`, leaving `7`, which still qualifies. The window is `[1, 2, 4]`, length `3`. New best. Drop `1`, leaving `6`, too small, so stop.
6. **Swallow `3`.** The sum is `9`, qualifies. The window is `[2, 4, 3]`, length `3`.
7. **Squeeze:** drop `2`, leaving `7`, still qualifies. The window is `[4, 3]`, length `2`. New best. Drop `4`, leaving `3`, too small, so stop.

The shortest qualifying stretch was `[4, 3]`, so the answer is `2`.

---

### The code

```python
class Solution:
    def minSubArrayLen(self, target: int, nums: list[int]) -> int:
        left = 0
        total = 0
        best = len(nums) + 1

        for right, value in enumerate(nums):
            total += value

            # every number is positive, so removing one always shrinks the sum
            while total >= target:
                best = min(best, right - left + 1)
                total -= nums[left]
                left += 1

        return best if best <= len(nums) else 0
```

---

### Time and space complexity

#### Time: $O(n)$

Every index is swallowed by the right edge exactly once and given back by the left edge at most once. That caps the total movement at `2n` steps, however the two edges interleave.

The nested `while` is what makes people call this $O(n^2)$ at a glance. It is not, because the left edge never resets and never moves backward. Counting pointer movements rather than loops is the way to see it.

#### Space: $O(1)$

Two indices, a running sum and a best length.

---

### Remember this

Grow the window until the sum qualifies, then shrink from the left for as long as it still does, recording the length each time. This works only because the numbers are positive, which makes adding and removing move the sum in predictable directions. Start the best at an impossible value so "never qualified" is easy to detect. $O(n)$ time, $O(1)$ space.
