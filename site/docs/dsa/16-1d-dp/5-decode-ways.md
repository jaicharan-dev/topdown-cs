---
id: 5-decode-ways
title: "91. Decode Ways"
description: "Climbing Stairs where some of the steps are not allowed"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">1D Dynamic Programming</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Conditional Transitions</span>

> **Problem Statement:** Letters are encoded as numbers, `A` as `1` through `Z` as `26`. Given a string of digits, count the ways it can be split back into letters. A group starting with `0` is invalid.

```text
Input:  s = "226"
Output: 3
```

---

### Picture it

Stand at a position in the string and look back, exactly as in Climbing Stairs. You arrived here by decoding either:

- **One digit**, if that digit is not `0`, or
- **Two digits**, if the pair reads between `10` and `26`.

So the count at this position is the count from one back plus the count from two back, but only counting the moves that are actually legal:

```text
ways(i) = ways(i - 1)  if the single digit works
        + ways(i - 2)  if the pair works
```

That is the same formula as Climbing Stairs with two conditions attached. If neither move is legal, the count is zero, and that zero spreads forward and correctly kills the whole string.

---

### How to think about it

Two variables again, since the formula reaches back two places.

**The single-digit move** is legal unless the digit is `0`. Zero is never a letter on its own, and a `0` can only ever appear as the second half of `10` or `20`.

**The two-digit move** is legal when the pair is at least `10` and at most `26`. The lower bound rules out pairs starting with `0`, like `06`, which the problem explicitly forbids.

The starting value is the one to think about. Before any digits are read there is exactly **one** way to decode nothing, the empty decoding, and that `1` is what lets the first valid digit come out as `1` rather than `0`. Setting it to zero makes everything zero.

A string beginning with `0` cannot be decoded at all, which falls out naturally: the first digit fails the single-digit test, there is no pair yet, so the count becomes zero and stays there.

---

### Walking through the example

Take `s = "226"`, with "ways to decode nothing" as `1` and the previous position also `1`.

1. **Digit `2`.** The single digit is fine, so it inherits `1` way. There is no pair yet. Count `1`, matching the only reading `B`.
2. **Digit `2`.** The single digit is fine, contributing the previous count of `1`. The pair `22` is between `10` and `26`, contributing the count from two back, `1`. Total `2`: `BB` and `V`.
3. **Digit `6`.** The single digit is fine, contributing `2`. The pair `26` is in range, contributing the count from two back, `1`. Total `3`.

The answer is `3`: `BBF`, `VF` and `BZ`.

Now take `"06"`. The first digit is `0`, so the single-digit move is illegal, no pair exists, and the count becomes `0` immediately.

---

### The code

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        # one way to decode nothing, which seeds the first real digit
        two_back, one_back = 1, 1

        for i in range(len(s)):
            current = 0

            # one digit, unless it is a zero
            if s[i] != "0":
                current += one_back

            # two digits, if they read between 10 and 26
            if i > 0 and "10" <= s[i - 1:i + 1] <= "26":
                current += two_back

            two_back, one_back = one_back, current

        return one_back
```

Comparing the two-character slice as a string works because both halves are digits of equal length, so the ordering matches the numeric one.

---

### Time and space complexity

#### Time: $O(n)$

One pass with a couple of comparisons per digit.

#### Space: $O(1)$

Two counts. The array version is $O(n)$ and is the natural first draft.

---

### Remember this

This is Climbing Stairs with the steps conditional: come from one digit back when that digit is not `0`, and from two back when the pair reads `10` to `26`. Seed the count with `1` for the empty decoding, or the first digit contributes nothing. A count of zero propagates forward and correctly rules out an undecodable string. $O(n)$ time, $O(1)$ space.
