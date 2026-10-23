---
id: 3-house-robber-ii
title: "213. House Robber II"
description: "A circle is two straight lines: one without the first house, one without the last"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Circular Array Decomposition</span>

> **Problem Statement:** The same robbery, except the houses now stand in a circle, so the first and last are neighbours. Return the most money you can take.

```text
Input:  nums = [2, 3, 2]
Output: 3
```

---

### Picture it

The circle adds exactly one new rule: the first and last houses cannot **both** be robbed.

Rather than reworking the algorithm to understand circles, use that rule to split the problem in two. Whatever the best plan is, one of these must be true:

- **It does not include the first house.** Then the houses from the second to the last form a plain row, with no wrap-around to worry about.
- **It does not include the last house.** Then the houses from the first to the second-last form a plain row.

Run the original straight-line solution on each of those and take the larger answer.

The two cases overlap, since a plan using neither end appears in both, and that is harmless: it is considered twice and the maximum is unaffected.

---

### How to think about it

Write the straight-line robber as a helper, then call it twice on two slices.

What makes this valid is that the troublesome pair is **broken** in each slice. Neither slice contains both the first and last house, so the wrap-around constraint cannot be violated, and the ordinary neighbour rule inside each slice is already handled.

The one case needing care is a **single house**. Both slices are then empty, and the helper returns zero, which is wrong: a lone house can be robbed, since it is not its own neighbour. Check for a length of one before slicing.

Two houses need no special treatment. The slices hold one house each, and the larger of them is the answer.

This decomposition is worth recognising on sight, because it recurs. When a circular constraint links the two ends of a line, fixing a decision about one end usually turns it back into a line, and running the line solution twice is cheaper than inventing a circular one.

---

### Walking through the example

Take `nums = [2, 3, 2]`.

**First slice, dropping the first house:** `[3, 2]`. The best is `3`.

**Second slice, dropping the last house:** `[2, 3]`. The best is `3`.

The larger is `3`, which is the answer. Robbing both `2`s would give `4`, but they are neighbours in the circle, so it is not allowed, and that is exactly what the slicing prevented.

---

### The code

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        # a lone house is not its own neighbour, so it can be robbed
        if len(nums) == 1:
            return nums[0]

        def rob_line(houses: list[int]) -> int:
            two_back, one_back = 0, 0

            for money in houses:
                two_back, one_back = one_back, max(money + two_back, one_back)

            return one_back

        # neither slice contains both the first and the last house
        return max(rob_line(nums[1:]), rob_line(nums[:-1]))
```

---

### Time and space complexity

#### Time: $O(n)$

Two passes over roughly the whole array, which is still linear.

#### Space: $O(n)$ as written, or $O(1)$ with index ranges

The slices copy the array. Passing start and end indices to the helper instead avoids the copies and brings the extra memory down to a few variables, which is the version to mention if asked.

---

### Remember this

A circular constraint on the two ends becomes two straight-line problems: solve once without the first house, once without the last, and take the larger. The overlap between the two cases is harmless. Guard the single-house input, where both slices come out empty. $O(n)$ time.
