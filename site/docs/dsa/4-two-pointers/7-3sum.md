---
id: 7-3sum
title: "15. 3Sum"
description: "Sort, hold one number still, and solve the pair with two pointers"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Opposite Ends</span>

> **Problem Statement:** You are given an array `nums`. Find every group of three different positions whose values add up to zero. The same triplet of values must not appear twice in your answer.

```text
Input:  nums = [-1, 0, 1, 2, -1, -4]
Output: [[-1, -1, 2], [-1, 0, 1]]
```

---

### Picture it

Three numbers is one more than you know how to handle, so pin one of them down.

Hold the first number still. Whatever it is, the other two have to add up to exactly the negative of it. That is a pair problem now, and a pair problem on a sorted array is the two-finger walk from Two Sum II.

So: sort the array, then take each value in turn as the fixed one, and walk two fingers through everything to its right looking for the pair that finishes the job.

Sorting costs a little, and it pays for itself twice: it makes the two-finger walk possible, and it puts equal values next to each other, which is what makes the duplicates manageable.

---

### How to think about it

The skeleton is a loop inside a loop. The outer loop picks the fixed number, the inner walk is two fingers closing in.

For the inner walk, add all three up and compare against zero. Too small, move the left finger right. Too big, move the right finger left. Zero, record the triplet and move **both** fingers, because with the fixed number decided, neither of the two values just used can appear in another pair.

The hard part of this problem is not finding triplets. It is not finding the same one twice. Duplicates get in at two different points, and both need handling.

**A repeated fixed number.** If the array holds two `-1` values and you anchor on each in turn, the second one re-finds everything the first one found. So skip an anchor that is equal to the one before it. The check has to be against the previous value, not the next one, or you will skip the first of a pair and lose real answers.

**A repeated pair.** After recording a triplet, the next value along might be identical to the one just used, which would record the same triplet again. So after moving both fingers, walk each of them past any repeats of the value it just left.

One early exit is worth having: once the fixed number is positive, every value from there on is positive too, because the array is sorted. Three positive numbers cannot add to zero, so the whole loop can stop.

---

### Walking through the example

Take `nums = [-1, 0, 1, 2, -1, -4]`, which sorts to `[-4, -1, -1, 0, 1, 2]`.

1. **Anchor `-4`.** The pair needs to make `4`. The fingers walk from `-1` and `2` inward without ever reaching `4`, since the largest available pair is `1 + 2 = 3`. Nothing found.
2. **Anchor the first `-1`.** The pair needs to make `1`. The fingers start at `-1` and `2`, which is exactly `1`, so record `[-1, -1, 2]`. Both fingers move in, landing on `0` and `1`, which is also `1`, so record `[-1, 0, 1]`. The fingers meet and the walk ends.
3. **Anchor the second `-1`.** It is the same value as the previous anchor, so skip it entirely. This is what stops `[-1, -1, 2]` appearing twice.
4. **Anchor `0`.** The pair needs to make `0`, but only `1` and `2` are left and they add to `3`. Nothing found.
5. **Anchor `1`.** It is positive, so stop everything.

The answer is `[[-1, -1, 2], [-1, 0, 1]]`.

---

### The code

```python
class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        nums.sort()
        out = []

        for i in range(len(nums) - 2):
            # sorted, so from here on everything is positive
            if nums[i] > 0:
                break

            # this anchor would re-find the previous anchor's triplets
            if i > 0 and nums[i] == nums[i - 1]:
                continue

            left, right = i + 1, len(nums) - 1

            while left < right:
                total = nums[i] + nums[left] + nums[right]

                if total < 0:
                    left += 1
                elif total > 0:
                    right -= 1
                else:
                    out.append([nums[i], nums[left], nums[right]])
                    left += 1
                    right -= 1

                    # step over repeats of the two values just used
                    while left < right and nums[left] == nums[left - 1]:
                        left += 1
                    while left < right and nums[right] == nums[right + 1]:
                        right -= 1

        return out
```

---

### Time and space complexity

#### Time: $O(n^2)$

Sorting costs $O(n \log n)$. Then every value gets a turn as the anchor, which is `n` turns, and each turn runs a two-finger walk that covers the rest of the array once, which is at most `n` steps. That makes $O(n^2)$, and it swallows the sorting cost entirely.

Testing every possible triplet directly would be $O(n^3)$, so sorting buys a whole factor of `n`.

#### Space: $O(1)$ beyond the answer

Only a handful of indices are kept. The list of triplets is the output rather than working memory. The sort itself may use some stack space depending on the language, which is $O(\log n)$ in Python.

---

### Remember this

Pin one number down and the rest is Two Sum II on a sorted array. Sorting also lines the duplicates up, which is the only reason they can be skipped cheaply. Skip an anchor equal to the previous anchor, and after recording a triplet walk both fingers past repeats of the values they just used. Stop the moment the anchor turns positive. $O(n^2)$ time, $O(1)$ extra space.
