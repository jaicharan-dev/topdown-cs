---
id: 9-longest-valid-parentheses
title: "32. Longest Valid Parentheses"
description: "Keep the position where the current good run would have to start"
sidebar_position: 9
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Index Stack</span>

> **Problem Statement:** You are given a string of only `(` and `)`. Find the length of the longest stretch of it that is properly balanced.

```text
Input:  s = ")()())"
Output: 4
```

---

### Picture it

Checking whether brackets are balanced is easy. Measuring the longest balanced **stretch** is harder, because you need to know where each good run begins, not just whether one exists.

Think of an unmatched `)` as a wall. Nothing on its left can ever join up with anything on its right, because the `)` itself can never be matched. So every unmatched `)` chops the string into separate territories, and the answer is the longest good run inside one territory.

That gives the thing to keep track of: **the position of the wall behind you**. Once you know that, the length of the run ending at the current position is just the distance back to the wall.

---

### How to think about it

Use a stack of positions, and keep the wall at the bottom of it. Start the stack holding `-1`, standing for an imaginary wall just before the string begins.

Then:

**On a `(`**, push its position. It is an opener waiting to be matched.

**On a `)`**, pop. What happens next depends on what is left:

- **The stack is now empty.** The thing you popped was the wall, which means this `)` had no opener to match. It becomes the new wall, so push its own position.
- **The stack is not empty.** This `)` matched a real opener, so a valid run ends here. Its length is the current position minus whatever position is now on top, because that is either the wall or an opener still waiting, and either way the good run starts just after it.

The subtraction is the elegant part. You never have to count matched pairs: the distance to the top of the stack is the answer automatically, including all the nested pairs inside.

---

### Walking through the example

Take `s = ")()())"`, with the stack starting as `-1`.

1. **Position 0 is `)`.** Pop the `-1`, leaving the stack empty. So this is an unmatched closer: push `0` as the new wall. The stack is `0`.
2. **Position 1 is `(`.** Push it. The stack is `0, 1`.
3. **Position 2 is `)`.** Pop the `1`, leaving `0` on top. A run ends here of length `2 - 0 = 2`. Best so far is `2`.
4. **Position 3 is `(`.** Push it. The stack is `0, 3`.
5. **Position 4 is `)`.** Pop the `3`, leaving `0`. The run length is `4 - 0 = 4`, which correctly counts both pairs, `()()`. Best is now `4`.
6. **Position 5 is `)`.** Pop the `0`, leaving the stack empty, so this is unmatched. Push `5` as the new wall.

The answer is `4`.

---

### The code

```python
class Solution:
    def longestValidParentheses(self, s: str) -> int:
        best = 0
        stack = [-1]   # the position just before the current run

        for i, ch in enumerate(s):
            if ch == "(":
                stack.append(i)
                continue

            stack.pop()

            if not stack:
                stack.append(i)   # unmatched closer, so the run restarts here
            else:
                best = max(best, i - stack[-1])

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, with at most one push and one pop per character.

#### Space: $O(n)$

The stack. A string of nothing but `(` pushes every position before anything is popped.

There is a second well-known solution that sweeps left to right counting openers and closers, then sweeps right to left doing the same, which gets the answer in $O(1)$ space. It is a neat trick, but the reasoning behind why two sweeps are needed is harder to reconstruct under pressure than the wall idea here.

---

### Remember this

An unmatched `)` is a wall that nothing can reach across, so keep its position at the bottom of the stack, seeded with `-1`. Push openers, pop on a closer, and if the stack empties the closer becomes the new wall. Otherwise the run ending here is the distance from the current position back to whatever the stack now shows. $O(n)$ time, $O(n)$ space.
