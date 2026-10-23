---
id: 7-search-in-rotated-sorted-array
title: "33. Search in Rotated Sorted Array"
description: "One half is always properly sorted, so decide whether the target lives in it"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Rotated Array</span>

> **Problem Statement:** A sorted array of distinct numbers has been rotated at some unknown point. Given a `target`, return its position or `-1`, in $O(\log n)$ time.

```text
Input:  nums = [4, 5, 6, 7, 0, 1, 2], target = 0
Output: 4
```

---

### Picture it

Cut a rotated array anywhere and look at the two pieces. Because there is only **one** drop in the whole array, that drop can only land in one of the pieces. The other piece has no drop in it at all, which means it is plainly sorted.

```text
4, 5, 6, 7, | 0, 1, 2      cut in the middle
~~~~~~~~~~    ~~~~~~~
sorted        sorted (this time both are, but at least one always is)
```

That is the lever. At every step, one half is ordinary sorted data, and in a sorted half you can tell instantly whether the target could be inside it, just by checking it against the two ends. If it could be, search there. If it could not, search the other half.

---

### How to think about it

Each step, check the middle for the target first and return if it matches. Otherwise work out which half is the sorted one.

**If the first element of the range is not greater than the middle**, the left half is sorted. Then ask whether the target sits between those two values. If it does, keep the left half, otherwise keep the right.

**Otherwise the right half is sorted.** Ask whether the target sits between the middle and the last element of the range. If it does, keep the right half, otherwise keep the left.

Note what the comparison is doing. The sorted half is where you can be **certain**, so the decision is always phrased as "is the target definitely inside this sorted stretch". The messy half, the one containing the drop, is never reasoned about directly. It is simply where you go when the clean answer is no.

The boundary comparisons have to be the right strictness. The middle has already been checked and rejected, so it is excluded on whichever side it falls, while the outer end of the range is still a live candidate and is included.

---

### Walking through the example

Take `nums = [4, 5, 6, 7, 0, 1, 2]` with `target = 0`.

1. **The middle is position 3, holding `7`.** Not the target. The first element in range is `4`, which is not greater than `7`, so the left half `4, 5, 6, 7` is the sorted one. Is `0` between `4` and `7`? No. So discard the left half and keep positions `4` to `6`.
2. **The middle is position 5, holding `1`.** Not the target. The first element in range is `0`, which is not greater than `1`, so the left half is sorted again. Is `0` between `0` and `1`, including the lower end? Yes. Keep positions `4` to `4`.
3. **The middle is position 4, holding `0`.** That is the target, so return `4`.

---

### The code

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        low, high = 0, len(nums) - 1

        while low <= high:
            mid = (low + high) // 2

            if nums[mid] == target:
                return mid

            # the left half has no drop in it, so it is plain sorted data
            if nums[low] <= nums[mid]:
                if nums[low] <= target < nums[mid]:
                    high = mid - 1
                else:
                    low = mid + 1
            # otherwise the right half is the sorted one
            else:
                if nums[mid] < target <= nums[high]:
                    low = mid + 1
                else:
                    high = mid - 1

        return -1
```

---

### Time and space complexity

#### Time: $O(\log n)$

Every step rejects half the range, exactly as in a plain binary search. Working out which half is sorted costs a couple of comparisons, which does not change the count of steps.

#### Space: $O(1)$

Three numbers.

---

### Remember this

A single rotation means a single drop, so after any cut at least one half is cleanly sorted. Identify that half, ask whether the target lies between its two ends, and go there if it does or to the other half if it does not. Always reason about the sorted half, never the one holding the drop. $O(\log n)$ time, $O(1)$ space.
