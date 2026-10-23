---
id: 5-jump-game-ii
title: "45. Jump Game II"
description: "Each jump covers a stretch, so count the stretches rather than choosing jumps"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Implicit BFS / Window Expansion</span>

> **Problem Statement:** Each number says how far you may jump forward from that position. Starting at the first position, return the fewest jumps needed to reach the last one. Assume it is always possible.

```text
Input:  nums = [2, 3, 1, 1, 4]
Output: 2
```

---

### Picture it

Think in **stretches** rather than individual jumps.

With zero jumps you can be at position `0` only. With one jump you can be anywhere position `0` can reach. With two jumps you can be anywhere that stretch can reach between them. Each jump count covers a contiguous band of positions:

```text
0 jumps:  [0]
1 jump:   [1 .. 2]        whatever position 0 reaches
2 jumps:  [3 .. 4]        the furthest anything in the previous band reaches
```

The answer is the number of the band containing the last position. So walk forward, and each time you step past the end of the current band, that is one more jump spent, and the new band runs to the furthest point anything in the old band could reach.

This is breadth-first search without a queue: each band is one level, and levels are counted rather than stored.

---

### How to think about it

Carry three numbers: the end of the current band, the furthest point reachable from anything seen so far, and the jump count.

At each position, extend the furthest reach using this position's value. Then, if you have arrived at the end of the current band, spend a jump and let the band stretch out to that furthest reach.

Two details decide whether this is right.

**Stop one position before the end.** Arriving at the last position means you are done, and running the loop over it would count one extra jump for a journey already finished.

**The band boundary is where the count changes**, not every position. That is what keeps the count equal to the number of jumps rather than the number of steps.

Greedy works here because every position in a band is reachable with the same number of jumps, so there is no reason to prefer one over another. Only their combined furthest reach matters, which is why no choice is ever made.

---

### Walking through the example

Take `nums = [2, 3, 1, 1, 4]`, with the band ending at `0`, the furthest reach `0`, and no jumps yet.

1. **Position 0.** The furthest reach becomes `0 + 2 = 2`. This is the end of the current band, so spend a jump, making it `1`, and the band now ends at `2`.
2. **Position 1.** The furthest reach becomes `1 + 3 = 4`. Not at the band end yet.
3. **Position 2.** The furthest reach from here is `3`, which does not beat `4`. This is the band end, so spend a jump, making it `2`, and the band now ends at `4`.
4. **Position 3 would be next**, but the loop stops before the final position.

The answer is `2`: jump from `0` to `1`, then from `1` to `4`.

---

### The code

```python
class Solution:
    def jump(self, nums: list[int]) -> int:
        jumps = 0
        band_end = 0
        furthest = 0

        # stop before the last position: arriving there needs no further jump
        for i in range(len(nums) - 1):
            furthest = max(furthest, i + nums[i])

            # the current band is exhausted, so one more jump is spent
            if i == band_end:
                jumps += 1
                band_end = furthest

        return jumps
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, constant work per position. A real breadth-first search with a queue would visit the same positions but pay for the queue; the dynamic programming version is $O(n^2)$.

#### Space: $O(1)$

Three numbers, where an explicit search would need $O(n)$ for its queue or table.

---

### Remember this

Positions reachable in the same number of jumps form a band, so count bands instead of choosing jumps. Track the end of the current band and the furthest point anything in it reaches; when you arrive at the band end, spend a jump and stretch the band to that furthest point. Stop the loop before the last position, or you count a jump you never needed. $O(n)$ time, $O(1)$ space.
