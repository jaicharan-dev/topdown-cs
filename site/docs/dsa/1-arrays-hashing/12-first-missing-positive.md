---
id: 12-first-missing-positive
title: "41. First Missing Positive"
description: "Send every number to the slot it belongs in, then find the slot that disagrees"
sidebar_position: 12
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">In-Place Array Hashing</span>

> **Problem Statement:** You are given an unsorted array `nums`, which may contain negatives, zeros and duplicates. Return the smallest positive number that is missing from it. Your solution must run in $O(n)$ time and use only a constant amount of extra memory.

```text
Input:  nums = [3, 4, -1, 1]
Output: 2
```

---

### Picture it

Start with the one observation that makes this problem tractable.

The array has `n` slots. So it can hold at most `n` different positive numbers. If it happened to contain exactly `1, 2, 3, ..., n`, the smallest missing positive would be `n + 1`. In every other case something in the range `1` to `n` is missing, and the answer is that.

```text
the answer is always somewhere between 1 and n + 1
```

That means anything negative, anything zero, and anything bigger than `n` is irrelevant. You never have to think about those values again, which shrinks the problem to a fixed, small range.

---

### How to think about it

If extra memory were allowed, this would be straightforward: put everything in a set, then try `1`, `2`, `3` and so on until one is missing. That is $O(n)$ time but $O(n)$ space, and the problem forbids it.

So the array has to be its own lookup table. Decide that the number `v` belongs in slot `v - 1`. Then `1` lives at the front, `2` next to it, and so on. Once every number that can be placed has been placed, the first slot holding the wrong number tells you immediately which value never turned up.

The placement is done by swapping. Walk the array, and at each position keep swapping the value there to its home slot until the value in your hand is useless. A value is useless when it is out of the range `1` to `n`, or when its home slot already contains that same value, which happens with duplicates.

It has to be a `while`, not an `if`. Swapping a number home hands you back whatever was living there, and that number may need placing too. Keep going until the value in hand has nowhere to go.

After that, one final scan: the first position where the slot does not hold the number that belongs there names the answer. If every slot agrees, the array held `1` through `n` and the answer is `n + 1`.

---

### Why the nested loop is still linear

The `while` inside the `for` looks like it could be quadratic, and this is the point an interviewer will press on.

Count swaps rather than loop iterations. Every swap that happens puts at least one number into its permanent home, and a number never leaves home once it is there. There are only `n` slots, so across the entire run there can be at most `n` swaps in total. The outer loop contributes `n` steps of its own, so the whole thing is bounded by a constant number of passes.

---

### Walking through the example

Take `nums = [3, 4, -1, 1]`, where `n = 4`.

1. **Position `0` holds `3`.** Its home is slot `2`, which holds `-1`, so swap. The array becomes `[-1, 4, 3, 1]` and you now hold `-1`, which is out of range, so stop.
2. **Position `1` holds `4`.** Its home is slot `3`, which holds `1`, so swap. The array becomes `[-1, 1, 3, 4]` and you now hold `1`. Its home is slot `0`, which holds `-1`, so swap again. The array becomes `[1, -1, 3, 4]` and you hold `-1`, so stop.
3. **Position `2` holds `3`**, which is already home. **Position `3` holds `4`**, also home.

Now scan: slot `0` holds `1`, correct. Slot `1` holds `-1`, but it should hold `2`. The answer is `2`.

---

### The code

```python
class Solution:
    def firstMissingPositive(self, nums: list[int]) -> int:
        n = len(nums)

        # send every number in 1..n to the slot it belongs in
        for i in range(n):
            while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
                home = nums[i] - 1
                nums[i], nums[home] = nums[home], nums[i]

        # the first slot holding the wrong number names the answer
        for i in range(n):
            if nums[i] != i + 1:
                return i + 1

        return n + 1
```

The `home` variable is doing real work. Writing the swap as one line that mentions `nums[nums[i] - 1]` on both sides is a classic bug in Python, because the left-hand side is evaluated after `nums[i]` has already been reassigned, and the wrong slot gets written.

The condition `nums[nums[i] - 1] != nums[i]` is what stops duplicates looping forever. If the home slot already holds the same value, there is nothing to gain by swapping, so the loop ends.

---

### Time and space complexity

#### Time: $O(n)$

The placement phase performs at most `n` swaps in total, for the reason given above, and the outer loop walks the array once. The final scan is another single pass. Add them and the work still tracks the length of the array.

#### Space: $O(1)$

Everything happens by swapping inside the array that was handed in. The only extra storage is `n`, `i` and `home`. No set, no copy, no counting array.

---

### Remember this

The answer can only be between `1` and `n + 1`, so everything outside that range can be ignored. Turn the array into its own lookup table by swapping each value `v` into slot `v - 1`, stopping when the value in hand is out of range or already home. Then the first slot that disagrees with its index gives the answer, and if none do, it is `n + 1`. $O(n)$ time, $O(1)$ space.
