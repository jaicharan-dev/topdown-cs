---
id: 6-two-sum-ii
title: "167. Two Sum II - Input Array Is Sorted"
description: "Sorted input means the sum tells you which end to move"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Opposite Ends</span>

> **Problem Statement:** You are given a sorted array `numbers` and a `target`. Find the two values that add up to the target and return their positions, counting from one rather than zero. You must use only a constant amount of extra memory.

```text
Input:  numbers = [2, 7, 11, 15], target = 9
Output: [1, 2]
```

---

### Picture it

The array is sorted, and that changes everything. In the original Two Sum the array is in no order, so a dictionary is needed to remember what has been seen. Here the order itself does the remembering.

Start with one finger on the smallest value and one on the largest. That pair is the widest possible sum you can make from the two ends. Now add them up and compare with the target:

- **Too small?** The only way to get more is to let go of the smallest value. Move the left finger right.
- **Too big?** The only way to get less is to let go of the largest value. Move the right finger left.
- **Exactly right?** You are done.

Each step rules something out and nothing else, which is why this never needs to backtrack.

---

### How to think about it

The step that deserves a moment's thought is why discarding is safe.

Suppose the sum is too small. The left finger is on the smallest remaining value, and it is currently paired with the **largest** remaining value. That is the best this value can ever do. Every other partner still available is smaller, so every other pair involving it is smaller still, and all of them fall short of the target too. The value cannot be part of any answer, so dropping it loses nothing.

The same argument runs the other way for a sum that is too big.

Because each pass discards exactly one value, and a value is never revisited, the fingers march toward each other and meet after at most `n` steps.

The problem also asks for constant memory, which is a direct hint away from the dictionary approach. The dictionary version would be $O(n)$ space and would work fine, but it ignores the sortedness you were handed.

Watch the indexing. This problem counts positions from one, so both answers need a `+ 1`.

---

### Walking through the example

Take `numbers = [2, 7, 11, 15]` with `target = 9`.

1. **`2 + 15 = 17`**, too big. The `15` cannot help, so the right finger moves to `11`.
2. **`2 + 11 = 13`**, still too big. The `11` goes too, so the right finger moves to `7`.
3. **`2 + 7 = 9`**, exactly the target. The positions are `0` and `1`, so the answer is `[1, 2]` once converted to counting from one.

---

### The code

```python
class Solution:
    def twoSum(self, numbers: list[int], target: int) -> list[int]:
        left, right = 0, len(numbers) - 1

        while left < right:
            total = numbers[left] + numbers[right]

            if total == target:
                return [left + 1, right + 1]  # positions count from one here

            if total < target:
                left += 1   # only a larger small-end value can help
            else:
                right -= 1  # only a smaller large-end value can help

        return []
```

---

### Time and space complexity

#### Time: $O(n)$

Every pass of the loop moves one finger inward and never moves either one back. The gap between them starts at `n` and shrinks by one each time, so the loop runs at most `n` times.

#### Space: $O(1)$

Two indices and a sum. No dictionary, which is what the constant-memory requirement was asking for.

---

### Remember this

Sorted input means the sum itself tells you which end to give up. Too small, raise the bottom; too big, lower the top. Discarding is safe because the value you drop was already paired with the best partner it will ever have. $O(n)$ time, $O(1)$ space, and remember the answer counts from one.
