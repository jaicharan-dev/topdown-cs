---
id: 3-majority-element
title: "169. Majority Element"
description: "Cancel one majority vote against one other vote and see what survives"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Boyer-Moore Voting</span>

> **Problem Statement:** You are given an array `nums` of length `n`. One value appears more than `n / 2` times. Return that value. You may assume such a value always exists.

```text
Input:  nums = [2, 2, 1, 1, 1, 2, 2]
Output: 2
```

---

### Picture it

Think of the array as a room full of people, and each number is the party someone votes for. One party has more than half the room.

Now pair people off: one supporter of party A standing against one supporter of anything else, and both leave. Keep doing that until nobody is left who can be paired with an opponent.

Because the majority party holds more than half the room, it cannot be wiped out. Even if every single one of its supporters is paired against an opponent, the opponents run out first, and the people still standing at the end all belong to the majority.

---

### How to think about it

The straightforward solution counts. Walk the array, keep a dictionary of how many times each value appeared, then return the value with the biggest count. That is correct and easy to write, and it costs memory proportional to the number of distinct values.

The pairing idea gets the same answer with two variables and no dictionary.

Keep a `candidate` and a `count`:

- If `count` is zero, you have nobody standing, so adopt the current number as the new candidate and set the count to one.
- If the current number equals the candidate, it is a supporter, so the count goes up.
- Otherwise it is an opponent, so it cancels one supporter and the count goes down.

The count is not the number of times the candidate appeared. It is how many supporters are left standing after all the cancelling so far. That is why you can throw the candidate away the moment the count hits zero: everything up to that point has cancelled out exactly, so the majority of the whole array is still the majority of what remains.

Because the problem promises a majority exists, whoever is holding the candidate slot at the end is the answer.

---

### Walking through the example

Take `nums = [2, 2, 1, 1, 1, 2, 2]`.

1. **`2`** with the count at zero, so `2` becomes the candidate, count `1`.
2. **`2`** matches the candidate, count `2`.
3. **`1`** does not match, count `1`.
4. **`1`** does not match, count `0`. Everything so far has cancelled out.
5. **`1`** with the count at zero, so `1` becomes the candidate, count `1`.
6. **`2`** does not match, count `0`.
7. **`2`** with the count at zero, so `2` becomes the candidate, count `1`.

The candidate at the end is `2`, which appears four times out of seven.

---

### The code

```python
class Solution:
    def majorityElement(self, nums: list[int]) -> int:
        candidate = None
        count = 0

        for num in nums:
            # nobody left standing, so this number takes over
            if count == 0:
                candidate = num

            count += 1 if num == candidate else -1

        return candidate
```

---

### Time and space complexity

#### Time: $O(n)$

One pass, and the body of the loop is a comparison and an addition. No sorting, no second pass, no lookups. The work is one step per element.

#### Space: $O(1)$

Two variables, `candidate` and `count`. That is the whole cost, and it does not change whether the array holds seven numbers or seven million. Counting with a dictionary instead would need memory proportional to how many distinct values the array contains.

---

### Remember this

Pair each majority vote off against one other vote. A value holding more than half the array cannot be cancelled out, so it is the last one standing. Keep a candidate and a count, reset the candidate whenever the count reaches zero, and return the candidate. $O(n)$ time, $O(1)$ space.
