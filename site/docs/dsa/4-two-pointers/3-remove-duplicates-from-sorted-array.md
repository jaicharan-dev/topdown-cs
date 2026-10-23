---
id: 3-remove-duplicates-from-sorted-array
title: "26. Remove Duplicates from Sorted Array"
description: "One finger reads every value, another writes only the new ones"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Slow & Fast Pointers</span>

> **Problem Statement:** You are given a sorted array `nums`. Remove the repeats in place so each value appears once, keeping the original order, and return how many distinct values there are. Whatever sits beyond that count does not matter.

```text
Input:  nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
Output: 5, with nums starting [0, 1, 2, 3, 4, ...]
```

---

### Picture it

The array is sorted, and that is the gift. Equal values have no choice but to sit next to each other, so a repeat is always the value immediately before it. You never have to remember anything from further back.

Now use two fingers moving at different speeds. The **reader** visits every slot in turn. The **writer** stays behind, marking where the next distinct value should be placed. Most of the time the reader sees a repeat and the writer does not move at all. When the reader finds something new, it gets written at the writer's slot and the writer steps forward.

When the reader reaches the end, the writer's position is the count of distinct values, and everything before it is the answer.

---

### How to think about it

Nothing is ever deleted. Deleting from the middle of an array means shifting everything after it, which is slow and entirely unnecessary. Instead the distinct values are compacted toward the front, and the junk left beyond the writer is simply ignored, which is what the problem's "whatever sits beyond that count does not matter" is telling you.

The first value is always distinct, so start the writer at position `1` and the reader at position `1` too.

The comparison worth getting right is **what the reader compares against**. It is not the previous slot in the array, which may already have been overwritten. It is the last value actually kept, which lives at `write - 1`. Comparing against the last kept value is what makes a run of three or four identical numbers collapse correctly.

---

### Walking through the example

Take `nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]`, with the writer at `1`.

1. **Reader at `1` sees `0`.** The last kept value is `0`, so this is a repeat. Nothing happens.
2. **Reader at `2` sees `1`.** New. Write it at position `1`, and the writer moves to `2`. The array starts `[0, 1, ...]`.
3. **Readers at `3` and `4` see `1` again.** Both repeats, both ignored.
4. **Reader at `5` sees `2`.** New. Write at position `2`, writer moves to `3`.
5. **The rest** plays out the same way: `3` is written at position `3`, `4` at position `4`.

The writer finishes at `5`, which is the answer, and the first five slots hold `0, 1, 2, 3, 4`.

---

### The code

```python
class Solution:
    def removeDuplicates(self, nums: list[int]) -> int:
        if not nums:
            return 0

        write = 1

        for read in range(1, len(nums)):
            # compare against the last value kept, not the previous slot
            if nums[read] != nums[write - 1]:
                nums[write] = nums[read]
                write += 1

        return write
```

---

### Time and space complexity

#### Time: $O(n)$

The reader makes one pass and the writer only ever moves forward, never backward and never more than once per step. One comparison and sometimes one assignment per element.

#### Space: $O(1)$

Two indices, and all the moving happens inside the original array. Building a new array of distinct values would be easier to write but would cost $O(n)$ memory, which is what "in place" rules out.

---

### Remember this

Sorted means repeats are neighbours, so a reader and a writer are enough. The reader visits everything, the writer advances only on a value that differs from the last one kept, and the writer's final position is the count. Nothing is deleted; the distinct values are just compacted to the front. $O(n)$ time, $O(1)$ space.
