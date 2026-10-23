---
id: 8-candy
title: "135. Candy"
description: "Two rules pull in opposite directions, so satisfy one in each direction"
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two-Pass Array</span>

> **Problem Statement:** Children stand in a line, each with a rating. Every child gets at least one sweet, and any child rated higher than a neighbour must get more sweets than that neighbour. Return the smallest total number of sweets.

```text
Input:  ratings = [1, 0, 2]
Output: 5
```

---

### Picture it

The difficulty is that each child is constrained from **both sides**, and the two constraints fight each other. Deciding a child's sweets by looking left can break the rule on the right, and fixing that can break the rule on the left again.

The way out is to stop trying to satisfy both at once. Handle them **one direction at a time**:

```text
pass one, left to right:   fix every "higher than the child on my left"
pass two, right to left:   fix every "higher than the child on my right"
```

Then combine. For each child, take the larger of the two demands, because a number that satisfies the bigger requirement automatically satisfies the smaller one.

---

### How to think about it

Give everyone one sweet to start, which satisfies the at-least-one rule.

**Pass one, walking right.** If a child is rated higher than the one on their left, they must get more than that child, so set their count to the left neighbour's plus one. If not, leave them alone: the rule says nothing about equal or lower ratings.

**Pass two, walking left.** If a child is rated higher than the one on their right, they need more than that child too. Now take the **larger** of what they already have and the right neighbour's plus one, rather than overwriting. Overwriting is the classic bug: it would throw away the left-hand requirement that pass one established.

Adding up the final counts gives the answer.

**Why this is minimal**, which is the part an interviewer will press on: every increase made was forced by a rule, so no child ends up with more than some constraint demanded. And no constraint is left unsatisfied, since each pass covers one direction completely and the `max` preserves the other. Forced plus complete means minimal.

Note that equal ratings carry no obligation at all. Two neighbours with the same rating may both hold one sweet, which is a case people often over-constrain.

---

### Walking through the example

Take `ratings = [1, 0, 2]`, starting with `[1, 1, 1]`.

**Pass one, left to right:**

- Child `1` has rating `0`, not higher than the `1` on its left, so it stays at `1`.
- Child `2` has rating `2`, higher than the `0` on its left, so it gets `1 + 1 = 2`.

The counts are `[1, 1, 2]`.

**Pass two, right to left:**

- Child `1` has rating `0`, not higher than the `2` on its right, so it stays at `1`.
- Child `0` has rating `1`, higher than the `0` on its right, so it needs at least `1 + 1 = 2`. It currently holds `1`, so take the larger: `2`.

The counts are `[2, 1, 2]`, totalling `5`.

That is exactly right: the middle child has the lowest rating and holds the fewest sweets, and both neighbours hold more.

---

### The code

```python
class Solution:
    def candy(self, ratings: list[int]) -> int:
        n = len(ratings)
        sweets = [1] * n   # everyone gets at least one

        # left to right: satisfy "higher than my left neighbour"
        for i in range(1, n):
            if ratings[i] > ratings[i - 1]:
                sweets[i] = sweets[i - 1] + 1

        # right to left: satisfy "higher than my right neighbour"
        for i in range(n - 2, -1, -1):
            if ratings[i] > ratings[i + 1]:
                # max, not assignment, or the left-hand rule is undone
                sweets[i] = max(sweets[i], sweets[i + 1] + 1)

        return sum(sweets)
```

---

### Time and space complexity

#### Time: $O(n)$

Three passes: one each way and one to total.

#### Space: $O(n)$

The array of counts. There is a cleverer $O(1)$ solution that counts the lengths of rising and falling runs as it goes, which is worth naming as a follow-up, but it is considerably harder to get right.

---

### Remember this

Two rules pulling in opposite directions become easy once they are handled separately: one left-to-right pass for the left-hand rule, one right-to-left pass for the right-hand rule, combined with `max` so neither undoes the other. Using assignment instead of `max` in the second pass is the standard bug. Every increase is forced and every rule is covered, which is why the total is minimal. $O(n)$ time and space.
