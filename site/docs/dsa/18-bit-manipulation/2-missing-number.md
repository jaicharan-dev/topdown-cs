---
id: 2-missing-number
title: "268. Missing Number"
description: "Pair every index with its value, and the one left unpaired is the answer"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">XOR Cancellation</span>

> **Problem Statement:** An array holds `n` distinct numbers taken from the range `0` to `n`. Return the one missing from it.

```text
Input:  nums = [3, 0, 1]
Output: 2
```

---

### Picture it

The array has `n` slots, and the numbers that should be present run from `0` to `n`, which is `n + 1` values. So the indices `0` to `n - 1` and the values almost pair up, with two leftovers: the index `n`, which has no slot, and the missing value.

XOR everything together, both every index and every value:

```text
indices:  0  1  2        and n itself
values:   3  0  1
```

Every number that appears as **both** an index and a value cancels itself out, exactly as in Single Number. What survives is the one value that never appeared, which is the answer.

Starting the running total at `n` is what supplies the index that the loop cannot reach.

---

### How to think about it

Set the total to `n`, then walk the array XOR-ing in each index and each value.

**Why this works:** every number from `0` to `n` enters the XOR exactly twice, once from the index side and once from the value side, except the missing one, which only ever appears as an index. Twice means cancelled; once means it survives.

**The summation alternative** is just as good and often easier to explain: the numbers `0` to `n` add up to `n(n + 1) / 2`, so subtract the actual total and the difference is the missing value. It is one line and obviously correct.

The reason to know the XOR version anyway is **overflow**. In a fixed-width language, that sum can exceed the integer range for a large `n`, while XOR never grows beyond the values themselves. Python has no such limit, so there the choice is stylistic, and saying why you would pick each is more valuable than either.

---

### Walking through the example

Take `nums = [3, 0, 1]`, so `n = 3`. The total starts at `3`.

1. **Index 0, value 3.** XOR both: the `3` cancels the starting `3`, and the `0` changes nothing. The total is `0`.
2. **Index 1, value 0.** XOR both: the total becomes `1`.
3. **Index 2, value 1.** XOR both: the `1` cancels, and the `2` enters. The total is `2`.

The answer is `2`.

Counting the appearances confirms it: `0` appears as an index and as a value, `1` likewise, `3` appears as a value and as the seeded index, and `2` appears only as an index. Only `2` is unpaired.

---

### The code

```python
class Solution:
    def missingNumber(self, nums: list[int]) -> int:
        total = len(nums)   # the index the loop cannot reach

        for i, value in enumerate(nums):
            total ^= i ^ value   # every paired number cancels itself

        return total
```

---

### Time and space complexity

#### Time: $O(n)$

Two XOR operations per element.

#### Space: $O(1)$

One running total.

---

### Remember this

Every number from `0` to `n` shows up as both an index and a value, except the missing one, so XOR-ing all the indices and all the values leaves it alone. Seed the total with `n`, since no slot has that index. The sum formula works equally well and reads more plainly; prefer XOR when overflow is a concern in a fixed-width language. $O(n)$ time, $O(1)$ space.
