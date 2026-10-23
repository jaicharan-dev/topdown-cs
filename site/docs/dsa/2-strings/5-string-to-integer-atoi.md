---
id: 5-string-to-integer-atoi
title: "8. String to Integer (atoi)"
description: "Four stages in order: spaces, sign, digits, clamp"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Simulation & Parsing</span>

> **Problem Statement:** Convert a string to a 32-bit signed integer by hand. Skip any spaces at the front, take an optional `+` or `-`, then read digits until something that is not a digit appears. Anything that does not fit the 32-bit range gets pulled back to the nearest end of it. Return `0` if there are no digits to read.

```text
Input:  s = "   -042"
Output: -42
```

---

### Picture it

This is less of a puzzle and more of a machine with four stations, and the string passes through them in a fixed order:

```text
skip spaces  ->  take a sign  ->  read digits  ->  clamp to range
```

Each station gets one go, and once the string has moved past a station it never returns. That single rule settles almost every tricky input on its own.

Take `"+-12"`. The sign station runs once, takes the `+`, and is finished. The digit station then meets `-`, which is not a digit, so it reads nothing and the answer is `0`. There is no rule to look up and no special case to write. The machine simply cannot visit the sign station twice.

Take `"words and 987"`. The space station skips nothing, the sign station sees `w` and takes nothing, the digit station sees `w` and stops immediately. The answer is `0`, even though there are digits further along, because the machine never goes backwards.

---

### How to think about it

Walk an index through the string, one station at a time.

1. **Spaces.** Move the index past every space at the front. Only spaces count here, not other whitespace.
2. **Sign.** If the current character is `+` or `-`, remember it and step past. At most one.
3. **Digits.** While the current character is a digit, fold it into the running value: multiply what you have by ten and add the new digit. Stop at the first character that is not a digit. Leading zeros need no attention, because multiplying zero by ten keeps it at zero.
4. **Clamp.** Apply the sign, then pull the value back inside the 32-bit range if it has escaped.

The clamping step is not optional in Python, and this catches people out. Python integers grow as large as they need to, so nothing ever overflows on its own. A string of forty digits will parse into a perfectly valid, enormous number, and only an explicit range check brings it back to the required answer.

In C++ or Java the opposite problem exists. There the value would silently wrap around mid-loop, so the check has to happen on every digit, before the multiplication that would break it, rather than once at the end.

---

### Walking through the example

Take `s = "   -042"`.

1. **Spaces:** three of them, so the index moves to position `3`.
2. **Sign:** the character there is `-`, so the sign becomes negative and the index moves to `4`.
3. **Digits:** `0` gives a running value of `0`. Then `4` gives `0 * 10 + 4 = 4`. Then `2` gives `4 * 10 + 2 = 42`. The string ends, so the reading stops.
4. **Clamp:** apply the sign for `-42`, which sits comfortably inside the range.

The answer is `-42`.

---

### The code

```python
class Solution:
    def myAtoi(self, s: str) -> int:
        INT_MIN, INT_MAX = -2**31, 2**31 - 1
        i, n = 0, len(s)

        # 1. spaces at the front
        while i < n and s[i] == " ":
            i += 1

        # 2. one optional sign
        sign = 1
        if i < n and s[i] in "+-":
            if s[i] == "-":
                sign = -1
            i += 1

        # 3. digits, stopping at the first character that is not one
        value = 0
        while i < n and s[i] in "0123456789":
            value = value * 10 + int(s[i])
            i += 1

        value *= sign

        # 4. Python integers never overflow, so the range has to be forced
        if value < INT_MIN:
            return INT_MIN
        if value > INT_MAX:
            return INT_MAX

        return value
```

Testing membership in `"0123456789"` is deliberate. Python's `isdigit` also accepts characters such as superscript digits, which then blow up when converted, so spelling out the ten characters you actually want is the safer check.

---

### Time and space complexity

#### Time: $O(n)$

The index only ever moves forward, and each of the four stages advances it without ever stepping back. In the worst case the string is read once from end to end, so the work tracks its length.

#### Space: $O(1)$

An index, a sign, and a running value. Nothing is stored that grows with the input, since the digits are folded into a single number as they are read rather than collected into a list first.

---

### Remember this

Four stages in a fixed order, each one visited once: skip spaces, take at most one sign, read digits until something else appears, then clamp. That ordering is what makes inputs like `"+-12"` and `"words and 987"` return `0` without any special handling. In Python the clamp is mandatory because integers never overflow; in a fixed-width language you must check before each multiplication instead. $O(n)$ time, $O(1)$ space.
