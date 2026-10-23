---
id: 2-house-robber
title: "198. House Robber"
description: "At each house, take it plus what was safe two back, or skip it and keep the last total"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Space Optimization</span>

> **Problem Statement:** Houses stand in a row, each holding some money. Robbing two neighbouring houses sets off the alarm. Return the most money you can take.

```text
Input:  nums = [2, 7, 9, 3, 1]
Output: 12
```

---

### Picture it

Stand at one house and there are only two things you can do.

**Rob it.** Then the house before it was off limits, so your total is this house's money plus the best you could have done up to **two** houses back.

**Skip it.** Then your total is simply the best you could have done up to the previous house.

Take whichever is larger:

```text
best(i) = max( money[i] + best(i - 2),  best(i - 1) )
```

Working left to right, both of those are already known by the time you need them.

Notice what the choice is **not**: it is not "rob every other house". Alternating is sometimes wrong, as the example shows, because a large house can be worth skipping two neighbours for.

---

### How to think about it

Carry two running totals, the best up to the previous house and the best up to the one before that. Each house produces a new best from the formula, and the two totals shuffle forward.

As in Climbing Stairs, the formula reaches back only two places, so no array is needed. That is why these two problems sit next to each other: the skeleton is identical and only the operation differs, an addition there and a maximum here.

Starting both totals at zero handles the first houses without special cases. For the first house the formula gives the larger of its money and zero, which is its money, and for the second it gives the larger of the two houses.

Negative money is not possible here, so no care is needed about an empty haul being better than a bad one.

---

### Walking through the example

Take `nums = [2, 7, 9, 3, 1]`, with both totals starting at `0`.

1. **House `2`.** Rob it for `2 + 0 = 2`, or skip for `0`. Best is `2`.
2. **House `7`.** Rob it for `7 + 0 = 7`, or skip for `2`. Best is `7`.
3. **House `9`.** Rob it for `9 + 2 = 11`, or skip for `7`. Best is `11`.
4. **House `3`.** Rob it for `3 + 7 = 10`, or skip for `11`. Best is `11`.
5. **House `1`.** Rob it for `1 + 11 = 12`, or skip for `11`. Best is `12`.

The answer is `12`, from houses `2`, `9` and `1`.

Note that this is not every other house from the start, which would be `2 + 9 + 1`. It happens to match here, but at step 4 the better move was to skip a house entirely, leaving a gap of two.

---

### The code

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        two_back, one_back = 0, 0

        for money in nums:
            # rob this one and add what was safe two back, or skip it
            current = max(money + two_back, one_back)
            two_back, one_back = one_back, current

        return one_back
```

---

### Time and space complexity

#### Time: $O(n)$

One comparison and one addition per house.

#### Space: $O(1)$

Two running totals. An array of best-so-far values is the natural first version at $O(n)$, and reducing it is the same observation as in Climbing Stairs.

---

### Remember this

At each house the choice is rob or skip, and robbing means adding to the best total from **two** houses back rather than one. Take the larger of the two options. The formula reaches back only two places, so two variables replace the array. Do not mistake this for alternating houses: leaving a gap of two is sometimes better. $O(n)$ time, $O(1)$ space.
