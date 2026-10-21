---
id: 8-container-with-most-water
title: "11. Container With Most Water"
description: "Start at both ends and always move the shorter wall inward"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import { BestContainerFigure, WhichWallFigure } from '@site/src/components/Figures/ContainerWithMostWater';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** You are given an array `height`. Each number is the height of a vertical line standing on the x-axis. Pick two lines so that the water held between them is as much as possible, and return that amount of water.

```text
Input:  height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
Output: 49
```

---

### Picture it

Think of each number as a wall. Pick any two walls and pour water between them.

Two things decide how much water you get:

- **How far apart the walls are.** That is the width of your container.
- **The shorter of the two walls.** Water spills over the shorter one, so whatever the taller wall has above that point is wasted.

So for any two walls:

$$
\text{water} = \text{distance between them} \times \text{height of the shorter wall}
$$

We need the pair that gives the biggest value.

---

### How to think about it

The obvious idea is to try every pair of walls. It works, but with a hundred thousand walls there are far too many pairs and it is much too slow. We want to look at each wall only once.

So start with the widest container possible: the very first wall and the very last wall. This is the one pair we know has the maximum width.

Now we have to move inward, and this is the whole idea of the problem: **every move makes the container narrower.** We lose width on every single step. The only way to end up with more water is if we get a taller shorter-wall in exchange.

Which of the two walls should we move, then?

- If we move the **taller** wall, the shorter wall stays exactly where it is, still capping the water. We lost width and gained no height, so the result can only get worse. Pointless.
- If we move the **shorter** wall, we throw away the wall that was holding us back. We still lose width, but now there is at least a chance of finding a taller wall and holding more water.

<WhichWallFigure />

:::tip The whole trick

Always move the shorter wall inward. Keep the most water you have seen, and stop when the two walls meet.

:::

And we are not skipping the answer by doing this. The shorter wall has just been measured against the farthest wall it had. Any other partner for it would be closer *and* still capped by the same short height, so it could never do better. Once it has been measured, it is safe to drop.

---

### Walking through the example

Take `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`.

1. **Start at the two ends.** The first wall is `1` and the last is `7`. They are `8` apart and the shorter one is `1`, so this holds `8`. The left wall is the shorter one, so it steps right.
2. **Now the walls are `8` and `7`.** They are `7` apart and the shorter one is `7`, so this holds **49**. Best so far.
3. **After that, nothing improves.** The right wall is the shorter one every time, so the right side keeps stepping inward and the container only gets narrower.

<BestContainerFigure />

---

### The code

```python title="Two pointers, one pass" showLineNumbers
class Solution:
    def maxArea(self, height: list[int]) -> int:
        left = 0
        right = len(height) - 1
        best = 0

        while left < right:
            # the shorter wall decides the water level
            water = (right - left) * min(height[left], height[right])
            best = max(best, water)

            # drop the shorter wall and move inward
            if height[left] < height[right]:
                left += 1
            else:
                right -= 1

        return best
```

---

### Time and space complexity

There are two questions to ask about any solution: how much **work** does it do, and how much **extra memory** does it use. Both are answered in terms of `n`, the number of walls in the input.

#### Time: $O(n)$

Look at the loop. On every pass we move either `left` or `right` one step inward, and we stop the moment they meet. So between them the two pointers walk across the array exactly once.

Nine walls means eight steps, because the pointers start eight apart and close the gap by one each time. A million walls means about a million steps. Double the input and you double the work, and that straight-line relationship is what $O(n)$ means.

Compare that with checking every pair. For `n` walls there are about $n^2 / 2$ pairs, so a million walls would be roughly five hundred billion checks. Same answer, but it would never finish.

#### Space: $O(1)$

Count what we store: `left`, `right`, `best`. Three numbers. Not three per wall. Three in total, whether the input has nine walls or nine million. We never build a new list and we never copy the array.

Memory that stays the same size no matter how big the input gets is called $O(1)$, or constant space. The input array itself does not count here; we only count what *we* add on top of it.

---

### Remember this

Start wide, at both ends. Every step costs you width, so the only wall worth moving is the shorter one, because moving the taller one can never help. Keep the best water you have seen and stop when the pointers meet. One walk across the array and three variables: $O(n)$ time, $O(1)$ space.
