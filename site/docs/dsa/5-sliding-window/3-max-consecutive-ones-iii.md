---
id: 3-max-consecutive-ones-iii
title: "1004. Max Consecutive Ones III"
description: "The window may hold k zeros, so count zeros and shrink when you overspend"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sliding Window</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Window</span>

> **Problem Statement:** You are given an array of `0`s and `1`s and a budget `k`. You may flip up to `k` zeros into ones. Find the longest run of consecutive ones you can end up with.

```text
Input:  nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k = 2
Output: 6
```

---

### Picture it

Reword the question and it becomes much easier.

"The longest run of ones after flipping at most `k` zeros" is the same thing as "the longest stretch of the array that contains at most `k` zeros". If a stretch holds two zeros and you are allowed two flips, you can turn that whole stretch into ones. The flipping never has to be simulated at all.

So slide a window and keep one number: how many zeros are inside it. That count is your spending. While it is within budget the window is legal, and you want the longest legal window.

---

### How to think about it

Stretch the right edge forward. If the value arriving is a zero, the spending goes up by one.

If the spending has gone over `k`, the window is illegal and has to be repaired by pulling the left edge forward. Each value that leaves is either a one, which refunds nothing, or a zero, which refunds a flip. Keep pulling until the spending is back within budget.

Record the window size at every step, and the largest one is the answer.

Two details worth noticing:

**The shrink is a `while`, not an `if`.** After a zero arrives you may need to discard several ones before reaching the zero that actually refunds your budget.

**You never need to know which zeros you flipped.** Only how many are in the window. That is the whole reason this is a counting problem rather than a search.

---

### Walking through the example

Take `nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0]` with `k = 2`.

1. **The first three ones** cost nothing. The window is length `3`.
2. **A zero arrives.** Spending is `1`, inside budget. Length `4`.
3. **Another zero.** Spending is `2`, exactly the budget. Length `5`.
4. **A third zero.** Spending is `3`, over budget. Pull the left edge in, discarding ones until the first zero leaves and refunds a flip. The window now starts after that zero, and its length is back to `3`.
5. **Four ones arrive in a row.** They cost nothing, so the window grows to length `6`. That is the best seen.
6. **The final zero** pushes the spending over again, and the repair leaves the window smaller.

The answer is `6`.

---

### The code

```python
class Solution:
    def longestOnes(self, nums: list[int], k: int) -> int:
        left = 0
        zeros = 0
        best = 0

        for right, value in enumerate(nums):
            if value == 0:
                zeros += 1

            # over budget, so give flips back from the left
            while zeros > k:
                if nums[left] == 0:
                    zeros -= 1
                left += 1

            best = max(best, right - left + 1)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

The right edge moves `n` times. The left edge only ever moves forward and can never pass the right edge, so across the whole run it also moves at most `n` times. The nested `while` does not make this quadratic, because every step it takes is a step the left edge will never take again.

#### Space: $O(1)$

Two indices and a counter.

---

### Remember this

"Flip at most `k` zeros" is really "the window may contain at most `k` zeros", so nothing has to be flipped. Count zeros in the window, shrink from the left while the count is over budget, and track the widest legal window. $O(n)$ time, $O(1)$ space.
