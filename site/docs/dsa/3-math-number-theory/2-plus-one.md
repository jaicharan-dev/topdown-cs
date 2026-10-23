---
id: 2-plus-one
title: "66. Plus One"
description: "Only a nine can carry, so the first smaller digit ends the work"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Carry Propagation</span>

> **Problem Statement:** You are given a number written out as an array of its digits, most significant first. Add one to that number and return the new array of digits.

```text
Input:  digits = [1, 2, 3]
Output: [1, 2, 4]
```

---

### Picture it

This is the odometer in a car.

You add one to the rightmost wheel. If that wheel was showing anything from `0` to `8`, it clicks up by one and the rest of the dashboard never moves. Done.

If it was showing `9`, it rolls around to `0` and gives the wheel to its left a nudge. That wheel now faces the same question, and so on leftward for as long as it keeps meeting nines.

If every single wheel was a `9`, the nudging runs off the left-hand end, and the number gains a whole new digit: `999` becomes `1000`.

---

### How to think about it

Walk the digits from the right.

**If the digit is less than nine**, add one to it and return the array immediately. There is no carry, so nothing to the left of it can possibly change. Stopping right there is not an optimisation, it is just the truth about addition.

**If the digit is nine**, it becomes `0` and the walk continues leftward with the carry still in hand.

**If the walk runs out of digits**, every digit was a nine and every one of them is now a `0`. The answer is a `1` followed by all those zeros, which is one digit longer than the input.

That last case is the only one that needs new memory, and it is the one people forget. Inputs like `[9]` and `[9, 9, 9]` are what an interviewer reaches for first.

---

### Walking through the example

Take `digits = [1, 2, 3]`.

1. **The rightmost digit is `3`**, which is less than nine. It becomes `4`, and the array `[1, 2, 4]` is returned on the spot. The `1` and the `2` are never even looked at.

Now take `digits = [9, 9]`:

1. **Rightmost is `9`.** It becomes `0`, carry continues. The array is `[9, 0]`.
2. **Next is `9`.** It becomes `0`, carry continues. The array is `[0, 0]`.
3. **The walk ends** with the carry still unplaced, so a `1` goes on the front: `[1, 0, 0]`, which is `100`.

---

### The code

```python
class Solution:
    def plusOne(self, digits: list[int]) -> list[int]:
        for i in range(len(digits) - 1, -1, -1):
            # anything below nine absorbs the carry and ends the job
            if digits[i] < 9:
                digits[i] += 1
                return digits

            digits[i] = 0

        # every digit was a nine, so the number gains a place
        return [1] + digits
```

---

### Time and space complexity

#### Time: $O(n)$

The worst case is an array of nothing but nines, where the carry travels the whole way and every digit is touched. That is $O(n)$.

Almost every other input finishes in a single step, because nine out of ten random last digits absorb the carry straight away. The worst case is what gets quoted, but the typical case is constant.

#### Space: $O(1)$, except for the all-nines case

Ordinarily the digits are changed in place and nothing new is allocated. The all-nines case is the exception, because the answer genuinely has one more digit than the input, so a new array of size `n + 1` has to be built. No approach can avoid that, since the result does not fit in the space provided.

---

### Remember this

Walk from the right. The first digit below nine takes the increment and you return immediately, because a carry cannot pass it. Nines turn into zeros and pass the carry along. If the walk falls off the left end, every digit was a nine, so return a `1` in front of all the zeros. $O(n)$ time in the worst case, usually one step.
