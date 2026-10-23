---
id: 8-koko-eating-bananas
title: "875. Koko Eating Bananas"
description: "Binary search the speed itself, because faster never hurts"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Answer Space</span>

> **Problem Statement:** There are piles of bananas and `h` hours before the guards come back. Koko picks one eating speed and sticks to it. Each hour she eats up to that many bananas from a single pile, and if the pile runs out she waits for the next hour rather than starting another. Find the slowest speed that still clears every pile in time.

```text
Input:  piles = [3, 6, 7, 11], h = 8
Output: 4
```

---

### Picture it

There is no array to search here. The array of piles is just data, and the thing you are looking for is a **speed**, which does not appear in the input at all.

But think about what speeds look like laid out in a row:

```text
speed:   1   2   3   4   5   6   ...
works?   no  no  no  yes yes yes ...
```

Every speed is either fast enough or it is not, and once a speed works, every faster speed works too. Eating faster can never make her slower. So that row of yes and no answers has exactly one boundary in it, and the answer is the first `yes`.

Finding a boundary in a row that goes no, no, no, yes, yes is precisely what binary search does. The search space is the range of possible speeds rather than the input.

---

### How to think about it

Two pieces are needed.

**A test.** Given a speed, how many hours does it take? For each pile, she needs the pile size divided by the speed, rounded **up**, because a leftover of one banana still occupies a whole hour. Add those up and compare with `h`.

**A range.** The slowest sensible speed is `1`. The fastest worth considering is the largest pile, because at that speed every pile already takes exactly one hour and going faster changes nothing.

Then binary search between them for the first speed that passes the test. The shape is the lower-bound search: when a speed works, keep it as a candidate with `high = mid`; when it does not, rule it out with `low = mid + 1`. The markers meet on the answer.

Use integer arithmetic for the rounding up. Writing `(pile + speed - 1) // speed` keeps everything in integers, whereas dividing with floats and rounding can give a wrong answer when the pile sizes are large enough to lose precision.

---

### Walking through the example

Take `piles = [3, 6, 7, 11]` and `h = 8`. The range of speeds runs from `1` to `11`.

1. **Try speed 6.** The hours are `1 + 1 + 2 + 2 = 6`, which is within `8`. It works, so keep it as a candidate and look for something slower. The range becomes `1` to `6`.
2. **Try speed 3.** The hours are `1 + 2 + 3 + 4 = 10`, which is over `8`. Too slow, so rule it out. The range becomes `4` to `6`.
3. **Try speed 5.** The hours are `1 + 2 + 2 + 3 = 8`, exactly `8`. It works. The range becomes `4` to `5`.
4. **Try speed 4.** The hours are `1 + 2 + 2 + 3 = 8`, also exactly `8`. It works. The range becomes `4` to `4`.

The markers meet at `4`, which is the answer. Speed `3` was already shown to take ten hours.

---

### The code

```python
class Solution:
    def minEatingSpeed(self, piles: list[int], h: int) -> int:
        def hours_needed(speed: int) -> int:
            # round up without floats: a leftover banana still costs an hour
            return sum((pile + speed - 1) // speed for pile in piles)

        low, high = 1, max(piles)

        while low < high:
            mid = (low + high) // 2

            if hours_needed(mid) <= h:
                high = mid      # fast enough, so this might be the answer
            else:
                low = mid + 1   # too slow, rule it out

        return low
```

---

### Time and space complexity

#### Time: $O(n \log m)$

Here `n` is the number of piles and `m` is the largest pile. The binary search runs about $\log m$ times, and each test walks all the piles once, which is `n` work.

With piles up to a billion that is about thirty tests, each one a single sweep of the piles.

#### Space: $O(1)$

A few numbers. The generator inside the sum does not build a list.

---

### Remember this

When the answer is a number rather than an element, search the range of possible answers. It works whenever the property is one-way: here, if a speed is fast enough then every faster speed is too, so the yes and no answers form a single boundary. Test each candidate speed by totalling the hours with rounding up, and keep the first speed that passes. $O(n \log m)$ time, $O(1)$ space.
