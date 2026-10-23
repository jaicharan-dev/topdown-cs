---
id: 9-capacity-to-ship-packages-within-d-days
title: "1011. Capacity To Ship Packages Within D Days"
description: "Search the capacity, and test each one by filling ships greedily"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Answer Space</span>

> **Problem Statement:** Packages come off a belt in a fixed order and must all ship within a given number of days. Each day one ship takes the next packages in order, up to its weight capacity. Find the smallest capacity that gets everything shipped in time.

```text
Input:  weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days = 5
Output: 15
```

---

### Picture it

This is **Koko Eating Bananas** wearing different clothes. Speed has become capacity, hours have become days, and the question is still "what is the smallest number that gets the job done in time".

The same one-way property holds. A bigger ship can carry anything a smaller ship could, so if some capacity finishes in time, every larger capacity does too:

```text
capacity:  ... 13  14  15  16  17 ...
in time?       no  no  yes yes yes
```

One boundary, and the answer is the first `yes`. Binary search over capacities.

---

### How to think about it

**The test.** Given a capacity, how many days does it take? Walk the packages in order, adding each to the current ship. When the next package would push the ship over its capacity, that ship sails and a new day begins with that package as its first item. Count the days.

Being greedy is correct here, and it is worth knowing why. The packages must go in the given order, so the only decision ever available is where to end each day. Loading every ship as full as it will go can never cost you a day, because stopping earlier only pushes more weight onto the days that follow.

**The range.** The smallest conceivable capacity is the **heaviest single package**, since no ship smaller than that could ever carry it, and no amount of extra days helps. The largest worth considering is the **total of all weights**, which ships everything in one day.

Then binary search between them for the first capacity that passes.

Starting the range at the heaviest package rather than at `1` is not just an optimisation. A capacity below it makes the test loop forever or report nonsense, because a package that cannot fit on any ship has nowhere to go.

---

### Walking through the example

Take `weights = [1, 2, ..., 10]` and `days = 5`. The heaviest package is `10` and the total is `55`, so capacities from `10` to `55` are in play.

1. **Try capacity 32.** Filling greedily: `1+2+3+4+5+6` is 21, adding 7 gives 28, adding 8 gives 36 which is over, so day one carries up to 7. Day two takes 8, 9, 10. That is 2 days, within 5. It works, so look lower. The range becomes `10` to `32`.
2. **Try capacity 21.** Day one carries 1 through 6, totalling 21. Day two carries 7 and 8, totalling 15, since adding 9 would reach 24. Day three carries 9 and 10. That is 3 days, which works. The range becomes `10` to `21`.
3. **Try capacity 15.** Day one carries 1 through 5, totalling 15. Day two carries 6 and 7. Day three carries 8. Day four carries 9. Day five carries 10. That is 5 days, exactly in time. It works, so the range narrows further.
4. **Lower capacities fail.** At `14`, day one stops after 1 through 4, and the extra day pushes the total past 5.

The markers settle on `15`.

---

### The code

```python
class Solution:
    def shipWithinDays(self, weights: list[int], days: int) -> int:
        def days_needed(capacity: int) -> int:
            used, load = 1, 0

            for w in weights:
                # this one does not fit, so the ship sails and a new day starts
                if load + w > capacity:
                    used += 1
                    load = 0
                load += w

            return used

        # no ship smaller than the heaviest package could ever work
        low, high = max(weights), sum(weights)

        while low < high:
            mid = (low + high) // 2

            if days_needed(mid) <= days:
                high = mid      # in time, so this might be the answer
            else:
                low = mid + 1   # too small, rule it out

        return low
```

---

### Time and space complexity

#### Time: $O(n \log S)$

`n` is the number of packages and `S` is their total weight. The binary search runs about $\log S$ times, and each test walks the packages once.

#### Space: $O(1)$

A handful of counters.

---

### Remember this

Same shape as Koko: the answer is a number, bigger always works, so binary search the range of capacities. The lower end of that range is the heaviest single package, not `1`, because nothing smaller can carry it. Test a capacity by filling each ship as full as the order allows, which is optimal precisely because the order is fixed. $O(n \log S)$ time, $O(1)$ space.
