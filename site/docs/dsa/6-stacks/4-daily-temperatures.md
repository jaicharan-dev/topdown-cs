---
id: 4-daily-temperatures
title: "739. Daily Temperatures"
description: "Days queue up waiting for warmth, and one warm day settles all of them at once"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Stack</span>

> **Problem Statement:** You are given the temperature for each day. For every day, say how many days you have to wait before it gets warmer. If it never does, the answer for that day is `0`.

```text
Input:  temperatures = [73, 74, 75, 71, 69, 72, 76, 73]
Output: [1, 1, 4, 2, 1, 1, 0, 0]
```

---

### Picture it

Turn the question around. Instead of asking each day to go looking for its warmer day, let each day **wait**, and let the warm day do the work when it arrives.

Keep a line of days that are still waiting. When a new day turns up, it settles every waiting day it is warmer than, handing each one the gap between them. Then it joins the back of the line itself, because it too is waiting for something warmer.

The line is always in decreasing temperature order from front to back, and that is not a rule you impose, it just happens. Any waiting day that a newcomer beats leaves immediately, so nothing cooler than the newcomer is ever left behind it.

---

### How to think about it

Hold the waiting days in a stack of **positions**, not temperatures, because the answer is a gap between days and you need the index arithmetic.

For each new day, pop every waiting day whose temperature is lower, and for each one fill in the answer as the difference between the two positions. Then push the new day.

Days still in the stack when the walk ends never found anything warmer. Their answers stay `0`, which is why starting the output filled with zeros saves a final cleanup pass.

The nested `while` is the thing to be ready to defend. It never makes this quadratic, because each day is pushed exactly once and popped at most once, so the total number of pops across the whole run is at most `n`. Count the pushes and pops, not the loop nesting.

---

### Walking through the example

Take `temperatures = [73, 74, 75, 71, 69, 72, 76, 73]`.

1. **Day 0 at 73** waits. The line is day 0.
2. **Day 1 at 74** beats day 0, so day 0 gets `1 - 0 = 1`. Day 1 waits.
3. **Day 2 at 75** beats day 1, so day 1 gets `1`. Day 2 waits.
4. **Day 3 at 71** beats nobody, since 75 is warmer. It joins the line behind day 2.
5. **Day 4 at 69** beats nobody either. The line is days 2, 3, 4 at 75, 71, 69.
6. **Day 5 at 72** beats day 4 at 69, which gets `1`, and day 3 at 71, which gets `2`. It stops at day 2, since 75 is still warmer. Day 5 waits.
7. **Day 6 at 76** beats day 5, which gets `1`, and then day 2, which gets `6 - 2 = 4`. Day 6 waits.
8. **Day 7 at 73** beats nobody and waits.

Days 6 and 7 are still in line at the end, so both keep `0`. The result is `[1, 1, 4, 2, 1, 1, 0, 0]`.

---

### The code

```python
class Solution:
    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:
        answer = [0] * len(temperatures)
        waiting = []  # positions of days still looking for something warmer

        for day, temp in enumerate(temperatures):
            # this day settles every cooler day still in the line
            while waiting and temperatures[waiting[-1]] < temp:
                earlier = waiting.pop()
                answer[earlier] = day - earlier

            waiting.append(day)

        return answer
```

---

### Time and space complexity

#### Time: $O(n)$

Each day enters the stack once and leaves at most once, so there are at most `2n` stack operations across the entire run, however deeply the inner loop sometimes goes.

Checking each day against every later day would be $O(n^2)$, which is what the stack is buying you.

#### Space: $O(n)$

The stack. A run of temperatures that falls the whole way never settles anything, so every day ends up waiting at once.

---

### Remember this

Let days wait rather than search. Hold their positions in a stack, and when a warmer day arrives let it settle everything cooler that is still waiting, paying each one the gap in days. Anything left waiting at the end keeps its `0`. $O(n)$ time, because each day is pushed and popped at most once, and $O(n)$ space.
