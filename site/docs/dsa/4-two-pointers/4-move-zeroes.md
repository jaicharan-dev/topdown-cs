---
id: 4-move-zeroes
title: "283. Move Zeroes"
description: "Swap each non-zero forward and the zeros pile up at the back by themselves"
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Slow & Fast Pointers</span>

> **Problem Statement:** You are given an array `nums`. Move every `0` to the end while keeping the non-zero values in their original order. Do it in place, without making a copy.

```text
Input:  nums = [0, 1, 0, 3, 12]
Output: [1, 3, 12, 0, 0]
```

---

### Picture it

Stop thinking about moving the zeros. Think about gathering the non-zeros.

If you pull every non-zero value to the front, in the order you meet them, then the zeros have nowhere to be except the back. They end up in the right place without ever being handled directly.

So one finger reads across the array looking for non-zeros, and another marks the slot where the next non-zero belongs. Every time the reader finds one, the two swap.

---

### How to think about it

The **writer** starts at `0` and marks the front of the unfilled region. The **reader** sweeps the whole array.

When the reader is on a zero, nothing happens and it moves on. When the reader is on a non-zero, that value is swapped into the writer's slot and the writer steps forward.

The swap is what makes this a single pass. Whatever was sitting at the writer's slot is either a zero or the same element the reader is already on, so sending it to the reader's position is always safe. Zeros get pushed backwards, one swap at a time, and they stay in the only place left for them.

Order is preserved for free. Non-zeros are written in exactly the order the reader meets them, and the reader never goes backwards.

The alternative is to copy the non-zeros forward and then fill the rest with zeros, which is two passes instead of one. Both are fine; the swap version is tidier and does the same work in one sweep.

---

### Walking through the example

Take `nums = [0, 1, 0, 3, 12]`, with the writer at `0`.

1. **Reader at `0` sees `0`.** Skip it. The writer stays at `0`.
2. **Reader at `1` sees `1`.** Swap positions `0` and `1`: `[1, 0, 0, 3, 12]`. The writer moves to `1`.
3. **Reader at `2` sees `0`.** Skip.
4. **Reader at `3` sees `3`.** Swap positions `1` and `3`: `[1, 3, 0, 0, 12]`. The writer moves to `2`.
5. **Reader at `4` sees `12`.** Swap positions `2` and `4`: `[1, 3, 12, 0, 0]`. The writer moves to `3`.

The sweep ends with `[1, 3, 12, 0, 0]`, and the zeros were never explicitly moved anywhere.

---

### The code

```python
class Solution:
    def moveZeroes(self, nums: list[int]) -> None:
        write = 0

        for read in range(len(nums)):
            if nums[read] != 0:
                # whatever sits at write is a zero, or this same element
                nums[write], nums[read] = nums[read], nums[write]
                write += 1
```

---

### Time and space complexity

#### Time: $O(n)$

One sweep. Each element is examined once, and at most one swap happens per element.

#### Space: $O(1)$

Two indices, and every move is a swap inside the original array. Building a filtered copy and padding it with zeros would be easier to write but would need $O(n)$ extra memory, which the problem forbids.

---

### Remember this

Do not move the zeros, gather the non-zeros. A writer marks where the next non-zero belongs, a reader sweeps the array, and every non-zero swaps into the writer's slot. The zeros are left at the back automatically, and the relative order survives because the reader never goes back. $O(n)$ time, $O(1)$ space.
