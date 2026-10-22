---
id: 7-next-permutation
title: "31. Next Permutation"
description: "Find where the order breaks from the right, swap it up, reverse the tail"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Permutations</span>

> **Problem Statement:** Treat the array as one arrangement of its numbers. Rearrange it into the next bigger arrangement, in the order you would get by listing every arrangement from smallest to largest. If it is already the biggest, turn it into the smallest. Do it in place, without extra memory.

```text
Input:  nums = [1, 2, 3]
Output: [1, 3, 2]
```

---

### Picture it

Think of the array as a number written digit by digit, and you want the next number up that uses exactly these digits.

To nudge a number up by as little as possible, you change it as far to the right as you can. Changing a digit near the front sends the value up by a lot. Changing one near the back barely moves it.

So the work is at the tail. The question is how far into the tail you can go and still find something to change.

---

### How to think about it

Look at the array from the right and find where the numbers stop climbing.

If a stretch at the end is falling the whole way, say `5, 3, 1`, then those digits are already in their largest possible arrangement. Nothing you do inside that stretch alone makes it bigger. So you keep walking left until you find a position whose value is smaller than the one just after it. That position is the **pivot**, and it is the rightmost place where an increase is possible.

Now make the increase as small as you can:

1. **Swap the pivot** with the smallest value to its right that is still bigger than it. Scanning from the far right and taking the first value that beats the pivot finds exactly that, because the tail is falling.
2. **Reverse the tail** after the pivot. The pivot just went up, so everything after it should be as small as possible, and a falling stretch reversed becomes a rising one, which is its smallest arrangement.

If no pivot exists, the whole array is falling, so it is the largest arrangement. The problem says to wrap around to the smallest, and reversing the whole array does exactly that.

---

### Walking through the example

Take `nums = [1, 2, 3]`.

1. **Find the pivot.** From the right, `2` is smaller than `3`, so the pivot is the `2` at position `1`.
2. **Swap it.** Scanning from the right for the first value bigger than `2` lands on `3`. Swap them to get `[1, 3, 2]`.
3. **Reverse the tail** after position `1`. That is just `[2]` on its own, so nothing changes.

The answer is `[1, 3, 2]`.

For contrast, `[3, 2, 1]` has no pivot at all, because the array falls the whole way. Reversing it gives `[1, 2, 3]`, the smallest arrangement.

---

### The code

```python
class Solution:
    def nextPermutation(self, nums: list[int]) -> None:
        n = len(nums)

        # 1. walk left while the numbers are falling
        pivot = n - 2
        while pivot >= 0 and nums[pivot] >= nums[pivot + 1]:
            pivot -= 1

        # 2. swap the pivot with the smallest value to its right that beats it
        if pivot >= 0:
            swap = n - 1
            while nums[swap] <= nums[pivot]:
                swap -= 1
            nums[pivot], nums[swap] = nums[swap], nums[pivot]

        # 3. the tail is falling, so reversing makes it the smallest it can be
        left, right = pivot + 1, n - 1
        while left < right:
            nums[left], nums[right] = nums[right], nums[left]
            left += 1
            right -= 1
```

When no pivot is found, `pivot` ends at `-1`, so step three reverses from position `0`, which handles the wrap-around case without a separate branch.

---

### Time and space complexity

#### Time: $O(n)$

Three walks, and none of them is nested inside another. Finding the pivot walks part of the array from the right. Finding the swap partner walks part of it again. Reversing the tail touches each element in the tail once. In the worst case each walk covers the whole array, which is three passes, so the growth is linear.

#### Space: $O(1)$

Everything happens by swapping elements inside the array. The only extra storage is a handful of index variables, which is what the problem means by constant extra memory.

---

### Remember this

Find the rightmost position where the array stops falling, which is the pivot. Swap it with the smallest value to its right that still beats it, then reverse everything after it. No pivot means the array was the largest arrangement, so reverse the lot. $O(n)$ time, $O(1)$ space.
