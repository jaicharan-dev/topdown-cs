---
id: 10-partition-equal-subset-sum
title: "416. Partition Equal Subset Sum"
description: "Two equal halves means hitting exactly half the total, so track which sums are reachable"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">0/1 Knapsack</span>

> **Problem Statement:** Given an array of positive numbers, say whether it can be split into two groups with equal totals.

```text
Input:  nums = [1, 5, 11, 5]
Output: true
```

---

### Picture it

Two reductions turn this from vague into mechanical.

**First**, if the two groups are equal then each holds exactly **half the total**. So add everything up: an odd total is immediately impossible, since the numbers are whole.

**Second**, you only have to find **one** group. Whatever it leaves behind is the other group automatically.

So the question becomes: can some selection of the numbers add up to exactly half the total? Each number is either in the selection or out, which is the 0/1 knapsack shape.

Track which sums are reachable. Start with only zero reachable, since picking nothing gives nothing. Each number then makes new sums reachable: everything already reachable, plus that number.

---

### How to think about it

Keep a row of flags, one for every sum from `0` up to the target, saying whether that sum can be made.

For each number, walk the sums and mark `sum` reachable if `sum - number` already was.

**Walk the sums downward**, from the target toward the number, and this is the detail everything hinges on. Going upward would let a number be used several times, because a sum it just made reachable would be read again later in the same pass. Going downward reads only sums from before this number was considered, which keeps each number used at most once.

That is precisely the difference between the 0/1 and the unbounded cases: direction of the inner loop. Coin Change, where coins are reusable, deliberately goes the other way.

Stop early when the target becomes reachable, and return straight away.

---

### Walking through the example

Take `nums = [1, 5, 11, 5]`. The total is `22`, which is even, so the target is `11`.

Reachable sums start as just `0`.

1. **After `1`:** `0, 1`.
2. **After `5`:** `0, 1, 5, 6`.
3. **After `11`:** the previous sums plus `11`, `12`, `16`, `17`. The target `11` is now reachable, so the answer is `true`.

The group making `11` is `[11]` itself, leaving `[1, 5, 5]`, which also totals `11`.

Had the array been `[1, 2, 5]`, the total would be `8` and the target `4`, and the reachable sums would be `0, 1, 2, 3, 5, 6, 7, 8` with no `4`, so the answer would be `false`.

---

### The code

```python
class Solution:
    def canPartition(self, nums: list[int]) -> bool:
        total = sum(nums)

        # an odd total cannot split into two equal whole halves
        if total % 2:
            return False

        target = total // 2
        reachable = [False] * (target + 1)
        reachable[0] = True   # picking nothing makes zero

        for number in nums:
            # downward, so this number cannot be used twice in one pass
            for value in range(target, number - 1, -1):
                if reachable[value - number]:
                    reachable[value] = True

            if reachable[target]:
                return True

        return reachable[target]
```

---

### Time and space complexity

#### Time: $O(n \times \text{target})$

Every number is considered against every sum up to half the total.

This is called pseudo-polynomial: it depends on the **size** of the numbers, not just how many there are. An array of five values summing to a billion would be hopeless, which is a good thing to note since the problem is NP-complete in general.

#### Space: $O(\text{target})$

One row of flags. The textbook version uses a full two-dimensional table of numbers against sums, which is $O(n \times \text{target})$; collapsing it to one row is what the downward walk makes possible.

---

### Remember this

Equal halves means hitting exactly half the total, so an odd total fails immediately and only one group needs finding. Track reachable sums, marking `sum` when `sum - number` was already reachable. Walk the sums **downward**, which is what stops a number being reused and is the single difference from the unbounded coin problems. $O(n \times \text{target})$ time.
