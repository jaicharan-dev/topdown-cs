---
id: 3-maximum-subarray
title: "53. Maximum Subarray"
description: "A running total that has gone negative is worth less than starting again"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Kadane's Algorithm</span>

> **Problem Statement:** Given an array of numbers, find the stretch of neighbouring elements with the largest total, and return that total. The stretch must hold at least one number.

```text
Input:  nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
```

---

### Picture it

Walk the array keeping a running total of the stretch you are currently in. At each new number there is exactly one decision:

> Do I extend the stretch I am in, or throw it away and start a new one here?

And the decision needs no deliberation. If the running total so far is **negative**, it is dragging you down. Whatever comes next is better off without it, so start fresh at the current number. If the running total is positive, keep it, since it can only help.

```text
running total is negative  ->  abandon it, start here
running total is positive  ->  carry it forward
```

Record the best total you ever hold. That is the answer.

---

### How to think about it

This is Kadane's algorithm, and the single sentence that captures it is: **a negative prefix never helps**.

It does not matter how long the stretch you are abandoning was, or what was in it. If its total is below zero then any stretch that includes it would be larger without it, so there is never a reason to carry it.

Two variables are enough: the running total of the current stretch and the best total seen anywhere.

The part to be careful about is the **all-negative array**. The problem insists the stretch holds at least one number, so the answer for `[-3, -1, -2]` is `-1`, not `0`. Starting the best total at zero would wrongly report an empty stretch. Start it at negative infinity, or at the first element, so a genuine value always wins.

Writing the update as "the current number, or the current number plus the running total, whichever is larger" expresses the choice directly and handles the restart without an `if`.

---

### Walking through the example

Take `nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`.

1. **`-2`.** The stretch is just `-2`. Best so far is `-2`.
2. **`1`.** The running total is `-2`, which is negative, so start fresh at `1`. Best is now `1`.
3. **`-3`.** Extending gives `1 - 3 = -2`. Best stays `1`.
4. **`4`.** The running total is `-2`, negative, so start fresh at `4`. Best is `4`.
5. **`-1`.** Extending gives `3`. Best stays `4`.
6. **`2`.** Extending gives `5`. Best is `5`.
7. **`1`.** Extending gives `6`. Best is `6`.
8. **`-5`.** Extending gives `1`. Best stays `6`.
9. **`4`.** The running total is `1`, positive, so extend to `5`. Best stays `6`.

The answer is `6`, the stretch `[4, -1, 2, 1]`.

Note step 9: the running total was only `1`, but keeping it was still right, because positive is positive.

---

### The code

```python
class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        running = nums[0]
        best = nums[0]   # not 0, since the stretch must hold a number

        for value in nums[1:]:
            # extend, or abandon a negative prefix and start here
            running = max(value, running + value)
            best = max(best, running)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, two comparisons per element. Trying every stretch would be $O(n^2)$, or $O(n^3)$ if the sums were recomputed each time.

#### Space: $O(1)$

Two numbers.

---

### Remember this

At each number, extend the current stretch or start again, and the rule is simply that a negative running total never helps whatever follows. Track the running total and the best ever seen. Start the best at the first element rather than zero, or an all-negative array wrongly answers `0` instead of its largest value. $O(n)$ time, $O(1)$ space.
