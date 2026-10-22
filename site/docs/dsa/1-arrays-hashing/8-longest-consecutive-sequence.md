---
id: 8-longest-consecutive-sequence
title: "128. Longest Consecutive Sequence"
description: "Put everything in a set and only count runs from their first number"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Set</span>

> **Problem Statement:** You are given an unsorted array `nums`. Find the longest run of consecutive numbers hiding in it, and return how long that run is. The numbers do not have to sit next to each other in the array. Your solution must run in $O(n)$ time.

```text
Input:  nums = [100, 4, 200, 1, 3, 2]
Output: 4
```

---

### Picture it

The numbers are scattered, and somewhere among them is a run like `1, 2, 3, 4`. Position in the array does not matter at all. Only the values do.

If you could sort the array, this would be easy: the runs would line up and you would just measure them. But sorting costs $O(n \log n)$ and the problem asks for better, so the run has to be found without putting anything in order.

---

### How to think about it

Drop every number into a set. Now "is `57` in there" is a question you can ask instantly, as many times as you like.

With that, you could take each number and count upward from it: does `num + 1` exist, does `num + 2` exist, and so on. The trouble is that counting from every number does the same run over and over. For the run `1, 2, 3, 4` you would count four from `1`, three from `2`, two from `3` and one from `4`.

The fix is a single question asked before counting: **am I the first number of my run?** You are, only if `num - 1` is missing from the set. If `num - 1` is there, somebody to your left will do the counting, so you skip immediately.

That one check is what makes the whole thing linear. Every run is walked exactly once, from its first number, no matter how many numbers it contains.

Looping over the set rather than the array is a small bonus, since duplicates in the input collapse to a single entry and cost nothing.

---

### How it stays linear

The nested `while` loop makes this look quadratic, which is a fair thing for an interviewer to probe.

Count the work instead of the loops. The outer loop runs once per distinct number. The inner loop only ever runs for a number that starts a run, and it walks that run once. Every number belongs to exactly one run, so across the whole input, the inner loop performs at most one step per number in total. That is at most `n` steps of counting spread over the entire outer loop, not `n` steps per element.

---

### Walking through the example

Take `nums = [100, 4, 200, 1, 3, 2]`. The set holds all six values.

1. **`100`:** is `99` in the set? No, so this starts a run. Is `101` there? No. Length `1`.
2. **`4`:** is `3` in the set? Yes, so `4` is in the middle of a run. Skip it.
3. **`200`:** is `199` in the set? No, so this starts a run. Is `201` there? No. Length `1`.
4. **`1`:** is `0` in the set? No, so this starts a run. `2` is there, `3` is there, `4` is there, `5` is not. Length `4`.
5. **`3`** and **`2`:** both have a left neighbour in the set, so both are skipped.

The longest run found is `4`.

---

### The code

```python
class Solution:
    def longestConsecutive(self, nums: list[int]) -> int:
        pool = set(nums)
        best = 0

        for num in pool:
            # somebody to the left will count this run, so leave it to them
            if num - 1 in pool:
                continue

            length = 1
            while num + length in pool:
                length += 1

            best = max(best, length)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

Building the set is one pass. The outer loop is one step per distinct number. The counting done by the inner loop adds up to at most `n` steps across the entire run of the program, for the reason given above. Add those together and the work still tracks the size of the input.

#### Space: $O(n)$

The set holds every distinct value from the array, so in the worst case, where nothing repeats, it is as big as the input. That memory is the price of instant lookups, and it is what buys the improvement over sorting.

---

### Remember this

Put the numbers in a set so membership is instant, then count upward only from numbers that have no left neighbour. That single check stops the same run being counted from every one of its members, which is what keeps it to $O(n)$ time and $O(n)$ space.
