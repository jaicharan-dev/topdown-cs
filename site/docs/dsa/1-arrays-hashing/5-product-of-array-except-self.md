---
id: 5-product-of-array-except-self
title: "238. Product of Array Except Self"
description: "Everything on my left times everything on my right, built in two sweeps"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Product</span>

> **Problem Statement:** You are given an array `nums`. Return an array where each position holds the product of every number in `nums` except the one at that position. You must do it in $O(n)$ time, and you are not allowed to use division.

```text
Input:  nums = [1, 2, 3, 4]
Output: [24, 12, 8, 6]
```

---

### Picture it

Stand on one position in the array and look both ways. Everything to your left multiplied together, and everything to your right multiplied together. Multiply those two numbers and you have the answer for where you are standing, because between them they cover the whole array except you.

```text
answer at position i = product of the left side  x  product of the right side
```

That is the entire problem. The only question left is how to get both sides for every position without recomputing them each time.

---

### How to think about it

The tempting shortcut is to multiply everything once and then divide by each number. The problem bans it, and for good reason: a single zero in the array breaks it, and two zeros break it further.

Doing it honestly, position by position, means walking the rest of the array for every element, which is far too slow.

The trick is that the left products are related to each other. The left product for position `3` is the left product for position `2` multiplied by the number at position `2`. So one sweep from left to right can fill in every left product, carrying a running value as it goes. The right products work the same way, sweeping from right to left.

That gives two sweeps instead of one sweep per element.

You also do not need two separate arrays to hold them. Use the output array for the left products on the first sweep, then on the second sweep multiply each entry by the running right product as you pass it. The two halves meet in the output array, and no extra storage is needed.

---

### Walking through the example

Take `nums = [1, 2, 3, 4]`.

1. **Sweep left to right**, writing the product of everything before each position. Nothing is before position `0`, so it gets `1`. The result so far is `[1, 1, 2, 6]`.
2. **Sweep right to left**, carrying a running product of everything after each position. It starts at `1` for the last position.
   - Position `3`: `6 x 1 = 6`. The running product becomes `4`.
   - Position `2`: `2 x 4 = 8`. The running product becomes `12`.
   - Position `1`: `1 x 12 = 12`. The running product becomes `24`.
   - Position `0`: `1 x 24 = 24`.

The output is `[24, 12, 8, 6]`.

---

### The code

```python
class Solution:
    def productExceptSelf(self, nums: list[int]) -> list[int]:
        n = len(nums)
        answer = [1] * n

        # first sweep: everything to the left of i
        prefix = 1
        for i in range(n):
            answer[i] = prefix
            prefix *= nums[i]

        # second sweep: multiply in everything to the right of i
        suffix = 1
        for i in range(n - 1, -1, -1):
            answer[i] *= suffix
            suffix *= nums[i]

        return answer
```

Notice the order inside each loop. The running product is applied to the current position **before** the current number is folded into it, which is what keeps the element itself out of its own answer.

---

### Time and space complexity

#### Time: $O(n)$

Two sweeps, each visiting every position once, each doing one multiplication and one assignment. Two passes over `n` elements is $2n$ steps, and constant multiples do not change the shape of the growth, so this is $O(n)$.

#### Space: $O(1)$

The only extra variables are `prefix` and `suffix`. Two numbers, whatever the size of the input.

The output array does not count here. The problem asks you to return an array of that size, so it is the answer rather than working memory. This distinction is a common interview follow-up, and the reason this version keeps everything in the output array instead of building separate left and right arrays, which would have been $O(n)$ extra.

---

### Remember this

The answer at each position is the product of its left side times the product of its right side. Both sides can be built with a running value, so one sweep each way is enough. Write the left products into the output array, then multiply the right products in on the way back. $O(n)$ time, $O(1)$ extra space, and no division.
