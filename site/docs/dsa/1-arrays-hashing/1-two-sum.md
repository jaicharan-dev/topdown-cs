---
id: 1-two-sum
title: "1. Two Sum"
description: "For each number, ask whether the partner it needs has already been seen"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Map</span>

> **Problem Statement:** You are given an array of integers `nums` and a number `target`. Find the two numbers that add up to `target` and return their positions. There is exactly one answer, and you cannot use the same element twice.

```text
Input:  nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
```

---

### Picture it

You are looking for a pair. The thing to notice is that once you fix one number, the other one is no longer a choice. If the target is `9` and you are standing on `2`, the only number that can finish the job is `7`.

So the question changes shape. Instead of "which two numbers add up to the target", it becomes "for this number, have I already walked past the partner it needs?"

---

### How to think about it

The obvious approach is to take every number and test it against every other number. That works, but on a long array it is far too slow, because the number of pairs grows with the square of the length.

The fix is to remember what you have already seen. Walk the array once, carrying a notebook. For each number, work out the partner it needs:

```text
partner = target - current number
```

Then ask the notebook whether that partner has turned up earlier. If it has, you have both halves of the answer and you are done. If it has not, write the current number into the notebook along with its position, and move on.

A dictionary is the right notebook because looking something up in it is instant, no matter how much is already written down. That is what keeps the whole thing to a single pass.

One detail matters. Ask the notebook **before** you write the current number into it. If you write first, a number whose partner is itself would find its own entry and return the same position twice, which the problem forbids.

---

### Walking through the example

Take `nums = [2, 7, 11, 15]` with `target = 9`.

1. **The number is `2`.** It needs `7`. The notebook is empty, so there is no match. Write down that `2` sits at index `0`.
2. **The number is `7`.** It needs `2`. The notebook has `2`, at index `0`. That is the pair, so return `[0, 1]`.

The array is never finished, because the answer appeared on the second step.

---

### The code

```python
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}  # number -> the index it was found at

        for i, num in enumerate(nums):
            partner = target - num

            # ask before writing, so a number cannot pair with itself
            if partner in seen:
                return [seen[partner], i]

            seen[num] = i

        return []
```

---

### Time and space complexity

#### Time: $O(n)$

The loop runs once per element and never goes back. Everything inside it is cheap: one subtraction, one dictionary lookup, one dictionary write. Dictionary operations do not get slower as the dictionary fills up, so the work per element stays flat.

That means the total work tracks the length of the array. Ten thousand numbers, ten thousand steps. Compare it with testing every pair, which on ten thousand numbers is about fifty million checks.

#### Space: $O(n)$

The notebook is the cost. In the worst case the answer is the last pair, so by then almost every number has been written down. The dictionary grows with the input, which is $O(n)$ extra memory.

This is the trade being made: spend memory on the notebook to avoid rescanning the array for every element.

---

### Remember this

For each number, the partner it needs is fixed at `target - num`, so the only question is whether you have seen that partner already. A dictionary answers that instantly, which turns a pairwise search into one pass. Check the dictionary before inserting, or an element will match itself. $O(n)$ time, $O(n)$ space.
