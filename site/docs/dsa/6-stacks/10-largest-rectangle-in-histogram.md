---
id: 10-largest-rectangle-in-histogram
title: "84. Largest Rectangle in Histogram"
description: "Every bar stretches sideways until a shorter bar stops it"
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Stack</span>

> **Problem Statement:** You are given the heights of bars standing side by side, each one unit wide. Find the area of the largest rectangle that fits inside them.

```text
Input:  heights = [2, 1, 5, 6, 2, 3]
Output: 10
```

---

### Picture it

Every possible rectangle has some bar as its limiting height. So instead of hunting for rectangles, take each bar in turn and ask the only question that matters:

> If the rectangle is exactly as tall as this bar, how wide can it be?

As wide as the bar can stretch in both directions before it runs into something **shorter** than itself. A taller neighbour is no obstacle, since the rectangle only needs this bar's height. A shorter one is a hard stop, because the rectangle cannot stay at this height across it.

```text
area for this bar = its height  x  (distance to the first shorter bar on each side)
```

Do that for every bar and keep the largest. The work is finding those two boundaries without scanning outward each time.

---

### How to think about it

Walk left to right with a stack of bar positions whose heights **increase** from bottom to top.

While the current bar is shorter than the one on top of the stack, that top bar has just found its right-hand boundary: the current position. So pop it and settle it. Its left-hand boundary is whatever is now beneath it on the stack, because that is the nearest earlier bar shorter than it, everything between having been popped already.

The width is then the gap between those two boundaries, exclusive on both ends:

```text
width = current position - position now on top - 1
```

If the stack empties when you pop, there was no shorter bar to the left at all, so the rectangle reaches back to the very start of the histogram. Treating the missing position as `-1` makes that fall out of the same formula.

Finally, bars still on the stack when the walk ends never met anything shorter on the right, so their rectangles extend to the end. Rather than writing a separate loop for them, append a bar of height zero to the input. It is shorter than everything, so it flushes the stack through the normal path.

---

### Walking through the example

Take `heights = [2, 1, 5, 6, 2, 3]`.

1. **Position 0, height 2.** The stack is empty, so push it.
2. **Position 1, height 1.** It is shorter than the `2`, so pop the `2`. The stack is now empty, so its left boundary is the very start, giving a width of `1 - (-1) - 1 = 1` and an area of `2`. Push position 1.
3. **Positions 2 and 3, heights 5 and 6.** Each is taller than the one before, so both just get pushed. The stack holds heights 1, 5, 6.
4. **Position 4, height 2.** It is shorter than `6`, so pop it: its left boundary is the `5` at position 2, width `4 - 2 - 1 = 1`, area `6`. Still shorter than `5`, so pop that too: left boundary is the `1` at position 1, width `4 - 1 - 1 = 2`, area `10`. That is the best so far. Now push position 4.
5. **Position 5, height 3.** Taller than the `2`, so push.
6. **The trailing zero** flushes everything: the `3` gives `3`, the `2` gives `2 * 4 = 8`, and the `1` spans the whole histogram for `1 * 6 = 6`.

The largest is `10`, the rectangle of height `5` across the bars `5` and `6`.

---

### The code

```python
class Solution:
    def largestRectangleArea(self, heights: list[int]) -> int:
        stack = []   # positions, with heights increasing from bottom to top
        best = 0

        # the trailing zero is shorter than everything, so it settles the rest
        for i, h in enumerate(heights + [0]):
            while stack and heights[stack[-1]] >= h:
                height = heights[stack.pop()]
                left = stack[-1] if stack else -1
                best = max(best, height * (i - left - 1))

            stack.append(i)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

Each position is pushed once and popped once, so the stack work totals at most `2n` operations however deep the inner loop occasionally runs.

Checking every pair of boundaries directly would be $O(n^2)$, and this problem is the standard example of a monotonic stack turning that into a single pass.

#### Space: $O(n)$

The stack. Bars that rise the whole way across, like `[1, 2, 3, 4, 5]`, are all pushed before anything is settled.

---

### Remember this

Fix the height to each bar in turn and ask how wide it can stretch before meeting something shorter. Keep a stack of increasing heights: when a shorter bar arrives, pop and settle, taking the right boundary as the current position and the left as whatever now sits beneath on the stack, with `-1` standing in for an empty stack. Append a zero height to flush the leftovers. $O(n)$ time, $O(n)$ space.
