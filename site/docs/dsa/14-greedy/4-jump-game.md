---
id: 4-jump-game
title: "55. Jump Game"
description: "Track the furthest point still reachable, and fail the moment you stand beyond it"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Goalpost Shifting / Farthest Reach</span>

> **Problem Statement:** Each number in the array says how far you may jump forward from that position. Starting at the first position, say whether the last one can be reached.

```text
Input:  nums = [2, 3, 1, 1, 4]
Output: true
```

---

### Picture it

Forget about which jumps to take. Trying combinations of jumps explodes quickly and none of it is necessary.

Carry one number instead: **the furthest position reachable so far**.

Walk forward. At each position, if you can get here at all, then this position's value extends your reach to `position + value`, so keep whichever reach is larger. If you ever stand on a position that lies **beyond** your reach, there is no way to have arrived, and the answer is `false`.

If you make it to the end of the walk without that happening, the last position was reachable.

---

### How to think about it

The greedy insight is that **the order of jumps never matters, only the furthest point reached**. If a position is reachable, every position before it is reachable too, because a jump can be shortened freely. So reachability is one continuous stretch from the start, and its right-hand edge is the only thing worth tracking.

That turns a search over jump sequences into a single pass with one variable.

The failure test must come **before** the reach is updated. Standing on an unreachable position means your reach stopped short, and reading that position's value would wrongly extend a reach you never had.

An equivalent and slightly neater version walks the loop while the index stays within the reach, then checks at the end whether the reach covers the last position. Either shape is fine as long as the unreachable case is detected rather than ignored.

A zero in the array is only fatal if the reach is exactly at it. A zero you can jump straight over costs nothing.

---

### Walking through the example

Take `nums = [2, 3, 1, 1, 4]`, with the reach starting at `0`.

1. **Position 0.** It is within reach. Its value `2` extends the reach to `0 + 2 = 2`.
2. **Position 1.** Within reach, since the reach is `2`. Its value `3` extends the reach to `1 + 3 = 4`.
3. **Position 2.** Within reach. Its value `1` gives `3`, which does not beat `4`, so the reach stays.
4. **Positions 3 and 4.** Both within reach, since `4` covers the last index.

The walk completes, so the answer is `true`.

Now take `[3, 2, 1, 0, 4]`. Positions `0` through `3` push the reach to `3`, but position `3` holds `0`, so the reach stays at `3`. Position `4` is beyond it, so the answer is `false`.

---

### The code

```python
class Solution:
    def canJump(self, nums: list[int]) -> bool:
        reach = 0

        for i, value in enumerate(nums):
            # standing beyond the reach means there was no way to get here
            if i > reach:
                return False

            reach = max(reach, i + value)

        return True
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, with a comparison and an update per position, and an early exit the moment a gap appears.

#### Space: $O(1)$

A single number. The recursive or memoised versions of this problem cost $O(n)$ or worse for the same answer.

---

### Remember this

Do not search over jump sequences. Reachable positions form one continuous stretch from the start, so the only thing worth tracking is its right-hand edge. Extend the reach at each position and fail as soon as you stand beyond it, checking that **before** reading the position's value. $O(n)$ time, $O(1)$ space.
