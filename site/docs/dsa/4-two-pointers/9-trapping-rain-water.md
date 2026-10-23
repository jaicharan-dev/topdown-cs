---
id: 9-trapping-rain-water
title: "42. Trapping Rain Water"
description: "Water over a bar is set by the tallest wall each side, so settle the shorter side first"
sidebar_position: 9
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dynamic Bottleneck</span>

> **Problem Statement:** You are given an array of bar heights, each bar one unit wide. Rain falls on them. Work out how much water stays trapped between the bars.

```text
Input:  height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
Output: 6
```

---

### Picture it

Forget the whole skyline and stand on one bar. How much water sits on top of **this** bar?

Water sitting above it has to be held in by something on the left and something on the right. The tallest bar to the left and the tallest bar to the right are the two walls, and water fills up to the shorter of those two before spilling over it. Then subtract the bar you are standing on, since it takes up some of that space:

```text
water on this bar = the shorter of (tallest left wall, tallest right wall)  -  this bar's height
```

Add that up over every bar and you have the answer. So the real question is how to know both tallest walls without scanning the whole array for each bar.

---

### How to think about it

The straightforward version precomputes two arrays: the tallest bar to the left of every position, and the tallest to the right. Two sweeps to build them, one to add everything up. It is correct, easy to explain, and costs $O(n)$ extra memory.

Two pointers get the same answer with none of that, and the reason is worth understanding properly.

Walk one pointer in from each end, remembering the tallest bar each one has met so far, as `left_max` and `right_max`. At each step, compare the two bars the pointers are standing on, and **work on the shorter side**.

Say the left bar is the shorter of the two. You do not know the tallest bar on the entire right side, and you do not need to. You know there is a bar over at the right pointer that is **at least as tall as the left bar**, so the true right wall is at least that tall. That means the shorter of the two walls must be `left_max`, and the water on this bar is settled by `left_max` alone. Add it and move on.

That is the trick: the side with the smaller bar can always be resolved with only the information you already have. The taller side waits.

This is the same bargain as **Container With Most Water**, with the outcome reversed. There, the shorter wall is the limit, so you throw it away to look for something better. Here, the shorter side is the one you can settle, so you bank its water and step past it.

---

### Walking through the example

Take `height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]`.

1. **Left is `0`, right is `1`.** Left is shorter. `left_max` becomes `0`, so this bar holds `0 - 0 = 0`. Move left in.
2. **Left is `1`, right is `1`.** Not shorter, so work the right side. `right_max` becomes `1`, and that bar holds `1 - 1 = 0`. Move right in.
3. **Left is `1`, right is `2`.** Left is shorter. `left_max` becomes `1`, holding `1 - 1 = 0`. Move left in.
4. **Left is `0`, right is `2`.** Left is shorter, and `left_max` is still `1`, so this bar holds `1 - 0 = 1`. First water found.

The walk carries on this way, each step settling one bar from whichever side is currently shorter, and the total comes to `6`.

---

### The code

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        left, right = 0, len(height) - 1
        left_max, right_max = 0, 0
        total = 0

        while left < right:
            # the shorter side is the one that can be settled now
            if height[left] < height[right]:
                left_max = max(left_max, height[left])
                total += left_max - height[left]
                left += 1
            else:
                right_max = max(right_max, height[right])
                total += right_max - height[right]
                right -= 1

        return total
```

Updating the running maximum before adding the water is what keeps the result from going negative. If the current bar is the tallest seen so far, it becomes the maximum and contributes zero, which is correct: nothing sits on top of the tallest bar.

---

### Time and space complexity

#### Time: $O(n)$

Each pass moves one pointer inward by one, and neither ever goes back. The gap starts at `n` and closes to nothing, so every bar is settled exactly once.

#### Space: $O(1)$

Two pointers, two running maximums, one total. The precomputed-arrays version does the same work in $O(n)$ memory, so this is the version to reach for when space is being asked about.

---

### Remember this

Water on a bar is the shorter of the two tallest walls either side, minus the bar itself. Walk in from both ends and always settle the shorter side, because a bar at least that tall exists on the other side, so the running maximum you already have is the real limit. $O(n)$ time, $O(1)$ space.
