---
id: 5-sort-colors
title: "75. Sort Colors"
description: "Three boundaries, one sweep, and a value swapped back from the end that still needs checking"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dutch National Flag</span>

> **Problem Statement:** You are given an array holding only the values `0`, `1` and `2`. Sort it in place so all the `0`s come first, then the `1`s, then the `2`s. Do it in a single pass, without calling a sorting function.

```text
Input:  nums = [2, 0, 2, 1, 1, 0]
Output: [0, 0, 1, 1, 2, 2]
```

---

### Picture it

With only three possible values, the finished array is three blocks: zeros, then ones, then twos.

So the array can be thought of as four regions while the work is going on:

```text
[ settled zeros | settled ones | not looked at yet | settled twos ]
```

Three markers hold those regions apart. `low` is the first slot after the zeros. `high` is the last slot before the twos. `i` is the scanner, walking through the unexamined middle.

Every value the scanner meets gets sent to one of the three blocks, and the unexamined middle shrinks from both sides. When it disappears, the array is sorted.

---

### How to think about it

The scanner looks at `nums[i]` and does one of three things.

- **It is a `0`.** It belongs at the front, so swap it with whatever is at `low`, then move `low` and `i` both forward.
- **It is a `1`.** It is already in the middle block where it belongs, so just move `i` forward.
- **It is a `2`.** It belongs at the back, so swap it with whatever is at `high` and move `high` backwards.

Look carefully at that last case. **`i` does not move.** The value that just arrived from the back has never been examined, so the scanner has to look at it next. Advancing past it is the single most common way to get this wrong, and it silently leaves stray values in the middle.

The zero case is different, and it is fair to ask why `i` can safely move there. Everything to the left of `i` has already been examined, so the value swapped up from `low` is something the scanner has seen before, and it can only be a `1`. Moving over it loses nothing.

The loop runs while `i` has not passed `high`. Once it does, there is no unexamined region left.

---

### Walking through the example

Take `nums = [2, 0, 2, 1, 1, 0]`, with `low = 0`, `i = 0`, `high = 5`.

1. **`nums[0]` is `2`.** Swap with position `5`: `[0, 0, 2, 1, 1, 2]`. Now `high = 4`, and `i` stays at `0`.
2. **`nums[0]` is `0`.** Swap with position `0`, which changes nothing. Now `low = 1`, `i = 1`.
3. **`nums[1]` is `0`.** Again a self-swap. Now `low = 2`, `i = 2`.
4. **`nums[2]` is `2`.** Swap with position `4`: `[0, 0, 1, 1, 2, 2]`. Now `high = 3`, and `i` stays at `2`.
5. **`nums[2]` is `1`.** Leave it, `i = 3`.
6. **`nums[3]` is `1`.** Leave it, `i = 4`. That is past `high`, so the sweep ends.

The array is `[0, 0, 1, 1, 2, 2]`.

---

### The code

```python
class Solution:
    def sortColors(self, nums: list[int]) -> None:
        low, i, high = 0, 0, len(nums) - 1

        while i <= high:
            if nums[i] == 0:
                nums[low], nums[i] = nums[i], nums[low]
                low += 1
                i += 1
            elif nums[i] == 2:
                nums[high], nums[i] = nums[i], nums[high]
                high -= 1
                # i stays put: the value from the back has not been examined
            else:
                i += 1
```

---

### Time and space complexity

#### Time: $O(n)$

Each pass of the loop either moves `i` forward or moves `high` backward, so the gap between them shrinks every single time. It starts at `n` and the loop ends when it closes, which caps the number of passes at `n`.

That is what "single pass" means here, even though `i` sometimes stands still.

#### Space: $O(1)$

Three indices, and every move is a swap inside the array.

Counting the three values and then rewriting the array from those counts is the other classic answer. It is simple and also $O(n)$, but it reads the array twice, which this problem explicitly rules out.

---

### Remember this

Three markers: zeros settle below `low`, twos settle above `high`, and `i` scans the middle. Swap a `0` down and advance both, leave a `1` alone, swap a `2` up and **do not advance `i`**, because the value that came back from the end has not been looked at yet. $O(n)$ time, $O(1)$ space, one pass.
