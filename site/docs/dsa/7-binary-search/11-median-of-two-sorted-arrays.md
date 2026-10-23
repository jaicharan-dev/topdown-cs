---
id: 11-median-of-two-sorted-arrays
title: "4. Median of Two Sorted Arrays"
description: "Search for the cut that puts the right half of everything on the left"
sidebar_position: 11
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Partition Cut</span>

> **Problem Statement:** You are given two sorted arrays. Return the median of all their values combined, in $O(\log(m + n))$ time.

```text
Input:  nums1 = [1, 3], nums2 = [2]
Output: 2.0
```

---

### Picture it

Merging the two arrays and taking the middle is correct, and it is $O(m + n)$. The required bound rules it out, which means the merged array can never actually be built.

So think about what the median really is. It is the point where the combined data splits into two halves of equal size, with every value on the left no bigger than every value on the right. The median is then read off the values closest to that split.

You do not need the merged array to describe that split. A cut in each array is enough:

```text
nums1:  a a a | b b b
nums2:  c c   | d d d d
        ~~~~~   ~~~~~~
        left     right
```

Choosing where to cut the first array **forces** where to cut the second, because the two left pieces together must hold exactly half of everything. So there is only one thing to search for: the cut in the first array.

---

### How to think about it

A cut is correct when both of these hold:

```text
the last value left of cut 1  <=  the first value right of cut 2
the last value left of cut 2  <=  the first value right of cut 1
```

Those two checks are the whole correctness condition. Within each array sortedness already guarantees the rest, so only the cross-comparisons can go wrong.

If the first check fails, the first array contributed something too large, meaning you took too many from it, so move the cut left. If the second fails, you took too few, so move the cut right. That is a binary search over the cut position, from `0` to the length of the first array.

Three details make this work in practice.

**Always cut the smaller array.** Swap them first if necessary. It keeps the search range small and, more importantly, stops the forced cut in the other array from falling outside it.

**Use infinities at the edges.** A cut at position `0` has nothing on its left, and a cut at the end has nothing on its right. Treating the missing values as negative and positive infinity means those cases satisfy the comparisons automatically, with no special branches.

**Round the half up.** Computing the left-hand size as `(m + n + 1) // 2` makes the left side hold the extra element when the total is odd, which means the median is just the largest value on the left. For an even total it is the average of the largest on the left and the smallest on the right.

---

### Walking through the example

Take `nums1 = [1, 3]` and `nums2 = [2]`. The first array is longer, so swap: now `nums1 = [2]` and `nums2 = [1, 3]`. The left side must hold `(1 + 2 + 1) // 2 = 2` values.

1. **Try cut 1 at position 0**, taking nothing from `nums1`. Then cut 2 must take `2` values, the whole of `nums2`. The last value left of cut 2 is `3`, and the first value right of cut 1 is `2`. Is `3` at most `2`? No, so too few were taken from the first array. Move the cut right.
2. **Try cut 1 at position 1**, taking the `2`. Then cut 2 takes `1` value, the `1`. The last left of cut 1 is `2`, the first right of cut 2 is `3`, so `2` is at most `3`. The last left of cut 2 is `1`, the first right of cut 1 is infinity, so that holds as well. The cut is correct.

The total is odd, so the median is the largest value on the left: the larger of `2` and `1`, which is `2.0`.

---

### The code

```python
class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        # always cut the smaller array, so the forced cut stays in range
        if len(nums1) > len(nums2):
            nums1, nums2 = nums2, nums1

        m, n = len(nums1), len(nums2)
        half = (m + n + 1) // 2   # rounded up, so the left holds any extra

        low, high = 0, m

        while low <= high:
            cut1 = (low + high) // 2
            cut2 = half - cut1    # choosing one cut forces the other

            # infinities stand in for "nothing on this side"
            left1 = nums1[cut1 - 1] if cut1 > 0 else float("-inf")
            right1 = nums1[cut1] if cut1 < m else float("inf")
            left2 = nums2[cut2 - 1] if cut2 > 0 else float("-inf")
            right2 = nums2[cut2] if cut2 < n else float("inf")

            if left1 <= right2 and left2 <= right1:
                if (m + n) % 2:
                    return float(max(left1, left2))
                return (max(left1, left2) + min(right1, right2)) / 2

            if left1 > right2:
                high = cut1 - 1   # took too many from the first array
            else:
                low = cut1 + 1    # took too few

        return 0.0
```

---

### Time and space complexity

#### Time: $O(\log(\min(m, n)))$

The search runs over cut positions in the smaller array only, halving that range each step. That is comfortably inside the $O(\log(m + n))$ the problem asks for, and it is why swapping the arrays at the start is worth doing.

#### Space: $O(1)$

Six values per step. Nothing is merged or copied, which is the entire point.

---

### Remember this

The median is defined by a split, not by a merged array, so search for the split. Cutting the first array forces the cut in the second, since the left side must hold half of everything. A cut is right when each array's last left value is no bigger than the other's first right value. Cut the smaller array, use infinities at the edges, and round the half up so an odd total is just the largest value on the left. $O(\log(\min(m, n)))$ time, $O(1)$ space.
