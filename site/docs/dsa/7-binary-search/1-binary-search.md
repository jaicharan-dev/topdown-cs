---
id: 1-binary-search
title: "704. Binary Search"
description: "Halve the range every step by asking which side the target can be on"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Standard Bisect</span>

> **Problem Statement:** You are given a sorted array `nums` and a `target`. Return the position of the target, or `-1` if it is not there. It has to run in $O(\log n)$ time.

```text
Input:  nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
```

---

### Picture it

Looking up a word in a dictionary, nobody starts at page one. You open somewhere near the middle, see whether your word comes before or after, and throw away the half it cannot be in. Then you do the same with what is left.

Each look halves the search. That is why a dictionary of a hundred thousand words takes about seventeen looks rather than fifty thousand.

The array being sorted is what makes the throwing away legal. One comparison against the middle tells you about **every** element on one side at once.

---

### How to think about it

Hold a range with two markers, `low` and `high`, that starts as the whole array and shrinks. Everything outside the range has already been ruled out.

Each step, look at the middle of the range:

- **It is the target.** Done, return its position.
- **It is too small.** The target cannot be at the middle or anywhere left of it, so move `low` to just past the middle.
- **It is too big.** The target cannot be at the middle or right of it, so move `high` to just before the middle.

Two details are what make this terminate correctly, and both are where buggy binary searches come from.

**The `+ 1` and `- 1`.** The middle has just been checked, so it must be excluded from the new range. Writing `low = mid` instead of `low = mid + 1` leaves the range the same size when it gets down to two elements, and the loop spins forever.

**The `low <= high`, not `low < high`.** When the range narrows to a single element, `low` and `high` are equal. That element still has to be checked, and a strict comparison would skip it and wrongly return `-1`.

---

### Walking through the example

Take `nums = [-1, 0, 3, 5, 9, 12]` with `target = 9`. The range starts as the whole array, positions `0` to `5`.

1. **The middle is position 2, holding `3`.** Too small, so the target is somewhere to the right. The range becomes positions `3` to `5`.
2. **The middle is position 4, holding `9`.** That is the target, so return `4`.

Six elements, two looks.

---

### The code

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        low, high = 0, len(nums) - 1

        while low <= high:
            mid = (low + high) // 2

            if nums[mid] == target:
                return mid

            if nums[mid] < target:
                low = mid + 1    # everything from mid leftward is too small
            else:
                high = mid - 1   # everything from mid rightward is too big

        return -1
```

---

### Time and space complexity

#### Time: $O(\log n)$

The range halves every step, so the question is how many times `n` can be halved before nothing is left. That count is the logarithm of `n` in base two.

The numbers are worth holding on to. A thousand elements take about ten steps. A million take twenty. A billion take thirty. Each time the data gets a thousand times bigger, the work goes up by ten steps.

#### Space: $O(1)$

Three numbers. Writing it recursively instead costs $O(\log n)$ stack frames, so the loop is the better answer when memory is being discussed.

---

### Remember this

Hold a range, check its middle, and throw away the half the target cannot be in. Always exclude the middle from the new range with `mid + 1` or `mid - 1`, or the loop can stop shrinking, and use `low <= high` so a range of one element still gets checked. $O(\log n)$ time, $O(1)$ space.
