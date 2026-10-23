---
id: 10-split-array-largest-sum
title: "410. Split Array Largest Sum"
description: "Guess the largest allowed piece and count how many pieces that forces"
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Minimax Partition</span>

> **Problem Statement:** You are given an array and a number `k`. Cut the array into `k` neighbouring pieces so that the largest piece sum is as small as possible, and return that sum.

```text
Input:  nums = [7, 2, 5, 10, 8], k = 2
Output: 18
```

---

### Picture it

Trying every way to cut the array is hopeless, and the wording tempts you into it: there is a choice at every gap, and the choices interact.

Turn the question inside out. Instead of asking "where do the cuts go", ask:

> If no piece were allowed to exceed `L`, how many pieces would I be forced into?

That is a much easier question, and it has only one answer for any given `L`. Walk the array, keep adding to the current piece, and start a new piece whenever the next value would push past `L`. Count the pieces.

And the counts behave predictably. A generous limit forces few pieces; a mean one forces many:

```text
limit L:    ... 16  17  18  19  20 ...
pieces:          3   3   2   2   2
```

So "can it be done within `k` pieces" flips from no to yes exactly once as `L` grows, and the answer is the smallest `L` where it is yes. That is a binary search over limits.

This is the same machinery as shipping packages within a number of days. Capacity has become the piece limit, and days have become pieces.

---

### How to think about it

**The test.** For a limit `L`, count the forced pieces greedily. Filling each piece as much as `L` allows is optimal for the same reason as in the shipping problem: the order is fixed, so cutting earlier than necessary only burdens what follows.

**The range.** The limit can never be below the **largest single value**, since that value has to sit in some piece on its own at worst. It never needs to exceed the **total**, which is one piece containing everything.

**The comparison.** The test passes when the forced count is at most `k`, not exactly `k`. If a generous limit needs only two pieces but `k` is four, that is still fine: a piece can always be split further into smaller pieces, and splitting never increases the largest sum. So "at most" is the right test, and it also keeps the yes and no answers in one clean boundary.

---

### Walking through the example

Take `nums = [7, 2, 5, 10, 8]` with `k = 2`. The largest value is `10` and the total is `32`, so limits from `10` to `32` are in play.

1. **Try limit 21.** Pieces: `7 + 2 + 5 = 14`, adding `10` would make `24` so cut; then `10 + 8 = 18`. That is 2 pieces, within `k`. It works, so look lower. The range becomes `10` to `21`.
2. **Try limit 15.** Pieces: `7 + 2 + 5 = 14`, adding `10` overflows so cut; then `10`, adding `8` overflows so cut; then `8`. That is 3 pieces, more than `k`. Too mean. The range becomes `16` to `21`.
3. **Try limit 18.** Pieces: `7 + 2 + 5 = 14`, cut; then `10 + 8 = 18`, which exactly fits. That is 2 pieces. It works. The range becomes `16` to `18`.
4. **Try limit 17.** Pieces: `14`, cut; then `10`, adding `8` gives `18` which overflows, so cut; then `8`. That is 3 pieces. Too mean. The range becomes `18` to `18`.

The markers meet at `18`, from the split `[7, 2, 5]` and `[10, 8]`.

---

### The code

```python
class Solution:
    def splitArray(self, nums: list[int], k: int) -> int:
        def pieces_needed(limit: int) -> int:
            count, running = 1, 0

            for value in nums:
                # adding this would overflow the limit, so start a new piece
                if running + value > limit:
                    count += 1
                    running = 0
                running += value

            return count

        # the limit cannot be below the largest single value
        low, high = max(nums), sum(nums)

        while low < high:
            mid = (low + high) // 2

            # fewer pieces than k is fine, since a piece can always be split
            if pieces_needed(mid) <= k:
                high = mid
            else:
                low = mid + 1

        return low
```

---

### Time and space complexity

#### Time: $O(n \log S)$

`n` is the length of the array and `S` is the sum of its values. The binary search runs about $\log S$ times, and each test is one walk of the array.

The dynamic programming solution to this problem is $O(n^2 k)$, so searching the answer space is dramatically better as well as shorter to write.

#### Space: $O(1)$

Two counters inside the test and a few markers outside it.

---

### Remember this

Do not search for the cuts, search for the limit. For any limit, the number of forced pieces is fixed and easy to count greedily, and that count falls as the limit rises, which gives binary search its single boundary. Range from the largest single value to the total, and accept a count of **at most** `k`, since any piece can be split further without raising the maximum. $O(n \log S)$ time, $O(1)$ space.
