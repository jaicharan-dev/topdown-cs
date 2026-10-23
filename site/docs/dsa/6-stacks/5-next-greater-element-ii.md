---
id: 5-next-greater-element-ii
title: "503. Next Greater Element II"
description: "Walk the array twice so the late elements can see the start again"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Stack (Circular)</span>

> **Problem Statement:** You are given an array that wraps around, so the element after the last one is the first one. For each element, find the next element going forwards that is larger than it. If there is none anywhere in the circle, the answer is `-1`.

```text
Input:  nums = [1, 2, 1]
Output: [2, -1, 2]
```

---

### Picture it

This is **Daily Temperatures** with one extra rule: when you run off the end of the array, you keep going from the start.

The waiting-line idea carries over untouched. Each element waits for something bigger; when a bigger value arrives it settles everyone smaller still in the line.

The only thing to solve is the wrapping. The last element has seen nothing to its right, but in a circular array it still gets to look at everything from the beginning.

---

### How to think about it

The trick is to walk the array **twice** rather than complicate the logic.

Run the loop for `2n` steps and read the value at position `i % n`. The first lap behaves exactly like the non-circular version. The second lap sweeps past the same values again, which is the wrap-around, giving the elements still waiting their chance to see the earlier part of the array.

One rule keeps it correct: **only push during the first lap.** The second lap exists to settle leftovers, not to create new waiters. Pushing again would leave duplicate entries in the line that no one ever resolves.

Fill the answers with `-1` up front. Anything still in the line after two full laps has nothing larger anywhere in the circle, and `-1` is already the right answer for it.

Two laps are enough, and a third would add nothing: if an element has not found something bigger after seeing every other element once, it never will.

---

### Walking through the example

Take `nums = [1, 2, 1]`, with answers starting as `[-1, -1, -1]`.

**First lap:**

1. **Position 0, value `1`.** Nobody waiting. It joins the line.
2. **Position 1, value `2`.** It beats the waiting `1`, so position 0 gets `2`. Then `2` joins the line.
3. **Position 2, value `1`.** It beats nobody, since `2` is bigger. It joins the line, which now holds positions 1 and 2.

**Second lap:**

4. **Position 0 again, value `1`.** It does not beat the waiting `1` at position 2, so nothing is settled. Nothing is pushed either, because this is the second lap.
5. **Position 1 again, value `2`.** It beats the `1` waiting at position 2, so position 2 gets `2`. It does not beat the `2` at position 1.
6. **Position 2 again, value `1`.** Beats nothing.

Position 1 is still waiting, so it keeps `-1`. The answer is `[2, -1, 2]`.

---

### The code

```python
class Solution:
    def nextGreaterElements(self, nums: list[int]) -> list[int]:
        n = len(nums)
        answer = [-1] * n
        waiting = []

        # two laps: the second one is the wrap-around
        for i in range(2 * n):
            value = nums[i % n]

            while waiting and nums[waiting[-1]] < value:
                answer[waiting.pop()] = value

            # only the first lap adds new waiters
            if i < n:
                waiting.append(i)

        return answer
```

---

### Time and space complexity

#### Time: $O(n)$

The loop runs `2n` times, and each position is pushed at most once and popped at most once across the whole run. Doubling a linear walk is still linear.

#### Space: $O(n)$

The waiting line, which in the worst case holds every position at once. That happens when the array decreases the whole way, like `[5, 4, 3, 2, 1]`, where nothing gets settled until the second lap.

---

### Remember this

A circular array is the ordinary problem walked twice, using `i % n` to read values. Elements still waiting at the end of the first lap get their second chance during the second. Push only on the first lap, or the line fills with duplicates that never resolve. $O(n)$ time, $O(n)$ space.
