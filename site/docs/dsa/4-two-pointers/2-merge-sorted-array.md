---
id: 2-merge-sorted-array
title: "88. Merge Sorted Array"
description: "Fill from the back, where the space is already empty"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Reverse Three Pointers</span>

> **Problem Statement:** You are given two sorted arrays. The first one, `nums1`, holds `m` real values followed by exactly enough spare room for the `n` values in `nums2`. Merge them into `nums1` so it ends up sorted. Do it in place.

```text
Input:  nums1 = [1, 2, 3, 0, 0, 0], m = 3, nums2 = [2, 5, 6], n = 3
Output: [1, 2, 2, 3, 5, 6]
```

---

### Picture it

Merging two sorted piles is familiar: look at the top card of each, take the smaller one, repeat.

The trouble here is where to put the card you take. The answer has to go into `nums1`, and `nums1` is already holding its own values at the front. Writing the first merged value into position `0` would destroy the `1` living there before it has been merged.

But look at the shape of `nums1`. The front is occupied and the **back is empty**. So fill from the back.

The largest value of the whole merge belongs in the very last slot, which is spare room. The next largest belongs in the second to last, also spare. By the time the writing position catches up with the values still waiting to be read, every one of those has already been copied somewhere safer.

---

### How to think about it

Three positions, all moving backwards:

- **`i`** reads the last unmerged value of `nums1`, starting at `m - 1`.
- **`j`** reads the last unmerged value of `nums2`, starting at `n - 1`.
- **`write`** is where the next value goes, starting at the final slot, `m + n - 1`.

Each pass compares what `i` and `j` point at, writes the larger one to `write`, and steps that reader back along with the writer.

The loop only needs to run **while `j` still has values**. If `nums2` empties first, everything left in `nums1` is already sitting in the right place, so there is nothing to do. If `nums1` empties first, the rest of `nums2` still has to be copied over, and the loop handles that because `i` falling below zero makes the comparison fall to the `nums2` side every time.

Writing can never clobber an unread value. At any moment the writer has placed exactly as many values as the two readers have consumed, so it is always at least as far right as either of them.

---

### Walking through the example

Take `nums1 = [1, 2, 3, 0, 0, 0]` with `m = 3`, and `nums2 = [2, 5, 6]` with `n = 3`.

1. **`3` against `6`.** Six wins, so it goes into the last slot: `[1, 2, 3, 0, 0, 6]`.
2. **`3` against `5`.** Five wins: `[1, 2, 3, 0, 5, 6]`.
3. **`3` against `2`.** Three wins: `[1, 2, 3, 3, 5, 6]`. Note the `3` has now been copied rightward, and its old slot is free.
4. **`2` against `2`.** Neither is larger, so the one from `nums2` is taken: `[1, 2, 2, 3, 5, 6]`.
5. **`nums2` is empty**, so the loop stops. The `1` and `2` still at the front were never moved, and they are exactly where they belong.

---

### The code

```python
class Solution:
    def merge(self, nums1: list[int], m: int, nums2: list[int], n: int) -> None:
        i, j, write = m - 1, n - 1, m + n - 1

        while j >= 0:
            # i running out means the rest of nums2 goes straight in
            if i >= 0 and nums1[i] > nums2[j]:
                nums1[write] = nums1[i]
                i -= 1
            else:
                nums1[write] = nums2[j]
                j -= 1

            write -= 1
```

---

### Time and space complexity

#### Time: $O(m + n)$

Every pass of the loop places exactly one value and never revisits it. There are `m + n` values in total, so that is the number of passes.

#### Space: $O(1)$

Three indices. The merge happens inside the array you were given, using the spare room it already came with.

Merging forwards into a temporary array and copying back would also be $O(m + n)$ time, but it would cost $O(m + n)$ extra memory, which is exactly what the back-to-front trick avoids.

---

### Remember this

Filling from the front overwrites values that have not been merged yet. Filling from the back writes into the spare room first, and the writer can never catch up with either reader. Run the loop while `nums2` still has values, since anything left in `nums1` is already in place. $O(m + n)$ time, $O(1)$ space.
