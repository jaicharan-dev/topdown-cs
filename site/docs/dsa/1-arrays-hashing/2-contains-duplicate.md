---
id: 2-contains-duplicate
title: "217. Contains Duplicate"
description: "Carry a bag of what you have seen and stop at the first repeat"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Set</span>

> **Problem Statement:** You are given an array of integers `nums`. Return `true` if any value appears more than once, and `false` if every value is different.

```text
Input:  nums = [1, 2, 3, 1]
Output: true
```

---

### Picture it

You are reading the numbers one at a time, and you carry a bag. Every number you read goes into the bag. Before each one goes in, you check whether it is already in there.

The first time a number is already in the bag, you have your answer and you can stop reading. You do not care which number repeated, or how many times, or where. One repeat is enough.

---

### How to think about it

Comparing every number with every other number answers the question, but it does far too much work. It keeps re-reading the earlier part of the array for each new element.

Sorting is another way. Once the array is sorted, duplicates sit next to each other, so a single scan comparing neighbours finds them. That is a real solution and it needs almost no extra memory, but sorting costs $O(n \log n)$, which is more than this problem needs.

The bag is the better fit. A set tells you whether something is inside it instantly, however full it is. So one walk through the array is enough: check, then add. The moment a check succeeds, return `true`. If you reach the end without one, every value was different, so return `false`.

---

### Walking through the example

Take `nums = [1, 2, 3, 1]`.

1. **`1`** is not in the bag. Put it in.
2. **`2`** is not in the bag. Put it in.
3. **`3`** is not in the bag. Put it in.
4. **`1`** is already in the bag. Return `true`.

---

### The code

```python
class Solution:
    def containsDuplicate(self, nums: list[int]) -> bool:
        seen = set()

        for num in nums:
            # the check has to come before the insert
            if num in seen:
                return True
            seen.add(num)

        return False
```

---

### Time and space complexity

#### Time: $O(n)$

Each number is looked at once, and the two things done to it, a membership check and an insert, both take constant time in a set.

Returning early helps in practice. An array that starts with two `5`s is finished after two steps. But complexity describes the worst case, and the worst case is an array with no duplicates at all, where every element has to be read. That is $O(n)$.

#### Space: $O(n)$

The bag can end up holding the whole array. If there are no duplicates, every one of the `n` numbers gets inserted, so the extra memory grows with the input.

If memory mattered more than speed, the sorting approach trades it the other way: $O(1)$ extra space, but $O(n \log n)$ time.

---

### Remember this

A set answers "have I seen this before" in constant time, so one pass is enough. Check before inserting, and return at the first repeat. $O(n)$ time and $O(n)$ space, or sort instead to spend $O(n \log n)$ time and save the memory.
