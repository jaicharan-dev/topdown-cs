---
id: 7-maximum-product-subarray
title: "152. Maximum Product Subarray"
description: "A negative flips the order, so the most negative running product is worth keeping too"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Dual-State Tracking</span>

> **Problem Statement:** Given an array of numbers, find the stretch of neighbouring elements with the largest product and return that product.

```text
Input:  nums = [2, 3, -2, 4]
Output: 6
```

---

### Picture it

Maximum Subarray worked because a running **sum** behaves predictably: adding to a bigger total gives a bigger total, so only the best running sum was worth carrying.

Products do not behave. Multiplying by a negative **reverses** the order, so the worst running product suddenly becomes the best:

```text
running products:  2   and  -8
multiply by -1:   -2   and   8     the worst one has become the best
```

So carrying only the best is not enough. A large negative product is a prize waiting for the next negative number, and throwing it away loses answers like `[-2, 3, -4]`, whose product is `24`.

The fix is to carry **two** running products: the largest and the smallest.

---

### How to think about it

At each number, three candidates exist for the new largest: the number alone, the number times the previous largest, or the number times the previous smallest. The same three are the candidates for the new smallest.

Take the maximum of the three for one and the minimum for the other. Including the number alone is what lets a stretch restart, which is the same idea as abandoning a negative prefix in Maximum Subarray.

**Compute both from the old values.** Overwriting the largest and then using it to compute the smallest is the standard bug: the smallest would be derived from a value that has already moved on. Compute both before assigning either.

Zeros look like they need special handling and do not. A zero makes all three candidates zero, which resets both running products, and the next number starts afresh from itself.

Track the best ever seen separately, since the running largest can fall at any step.

---

### Walking through the example

Take `nums = [2, 3, -2, 4]`.

1. **`2`.** Both running products are `2`. Best is `2`.
2. **`3`.** Candidates are `3`, `6`, `6`. Largest `6`, smallest `3`. Best is `6`.
3. **`-2`.** Candidates are `-2`, `6 × -2 = -12`, `3 × -2 = -6`. Largest `-2`, smallest `-12`. Best stays `6`.
4. **`4`.** Candidates are `4`, `-2 × 4 = -8`, `-12 × 4 = -48`. Largest `4`, smallest `-48`. Best stays `6`.

The answer is `6`.

The value of keeping the smallest shows in `[-2, 3, -4]`: after `3` the smallest is `-6`, and multiplying by `-4` turns it into `24`, which is the answer. Carrying only the largest would have missed it entirely.

---

### The code

```python
class Solution:
    def maxProduct(self, nums: list[int]) -> int:
        largest = smallest = best = nums[0]

        for value in nums[1:]:
            # both must come from the OLD pair, so compute before assigning
            candidates = (value, largest * value, smallest * value)

            largest, smallest = max(candidates), min(candidates)
            best = max(best, largest)

        return best
```

---

### Time and space complexity

#### Time: $O(n)$

One pass with a constant amount of comparison per element.

#### Space: $O(1)$

Three numbers.

---

### Remember this

Sums let you carry only the best running total; products do not, because a negative swaps best and worst. Carry both the largest and the smallest running product, and build each new one from the number alone or from either old value. Compute both before assigning either, or the second uses a value that has already changed. Zeros reset both with no special case. $O(n)$ time, $O(1)$ space.
