---
id: 3-reverse-integer
title: "7. Reverse Integer"
description: "Move digits from the back of one number to the back of another, checking the range before each push"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Digit Peeling</span>

> **Problem Statement:** You are given a signed 32-bit integer `x`. Return it with its digits reversed. If the reversed value falls outside the 32-bit range, return `0` instead. You cannot use a wider type to hold the intermediate value.

```text
Input:  x = 123
Output: 321
```

---

### Picture it

Reversing a number is moving digits from the back of one pile to the back of another.

```text
x % 10   takes the last digit off x
x // 10  shortens x by that digit
```

Each digit you peel gets pushed onto the end of the result, which means multiplying the result by ten to make room and then adding the digit in. Peel, push, repeat, until nothing is left of `x`.

That part is easy. The actual problem is the second sentence of the question.

---

### How to think about it

You are reversing a 32-bit number, but the reversed version does not have to fit in 32 bits. `1534236469` is a fine input, and its reverse is `9646324351`, which is far too big. The question asks you to detect that and return `0`, without being allowed to store the oversized value anywhere to look at it.

So the check has to happen **before** the push that would break the range, not after.

Before multiplying the result by ten and adding a digit, ask whether there is room:

```text
is result greater than (the largest allowed value minus the digit) divided by ten?
```

If it is, the push would escape the range, so return `0` immediately. If it is not, the push is safe. This way the forbidden value is never actually constructed.

There is also a Python-specific trap. The `%` operator on a negative number does not do what you might expect: `-123 % 10` gives `7`, not `3`, because Python's remainder follows the sign of the divisor. Peeling digits off a negative number directly therefore produces nonsense. Take the sign off at the start, work entirely with the positive value, and put the sign back at the end.

---

### Walking through the example

Take `x = 123`, with the result starting at `0`.

1. **Peel `3`.** There is plenty of room, so push it: the result is `3`, and `x` is now `12`.
2. **Peel `2`.** Push it: the result is `3 * 10 + 2 = 32`, and `x` is now `1`.
3. **Peel `1`.** Push it: the result is `32 * 10 + 1 = 321`, and `x` is now `0`, so the loop ends.

The answer is `321`.

Now picture `x = 1534236469`. The peeling proceeds happily until the result has reached `964632435` and the final digit `1` is waiting to be pushed. The check fires, because ten times that result would clear the 32-bit ceiling, so the function returns `0` without ever building the number.

---

### The code

```python
class Solution:
    def reverse(self, x: int) -> int:
        INT_MAX = 2**31 - 1

        # Python's % follows the sign of the divisor, so strip the sign first
        sign = -1 if x < 0 else 1
        x = abs(x)

        result = 0
        while x:
            digit = x % 10
            x //= 10

            # would this push leave the range? ask before doing it
            if result > (INT_MAX - digit) // 10:
                return 0

            result = result * 10 + digit

        return sign * result
```

The negative end of the 32-bit range is one larger than the positive end, so in principle a negative answer has slightly more room. It never matters here: the only input whose reverse would land in that one-value gap is itself too large to have been a valid input, so checking both signs against the same ceiling is safe.

---

### Time and space complexity

#### Time: $O(\log x)$

One pass of the loop per digit, and the digit count of a number is its logarithm in base ten. A 32-bit integer has at most ten digits, so this is at most ten passes, each one a handful of arithmetic operations.

#### Space: $O(1)$

A sign, a digit and a running result. The reversed value is built up inside a single number rather than collected into a list of digits, so nothing grows with the input.

---

### Remember this

Peel digits off the back of `x` with `% 10` and `// 10`, and push each one onto the back of the result. Because the reversed value can be too large to hold, test for room before every push rather than checking afterwards. In Python, strip the sign first, because the remainder of a negative number does not give you the digit you expect. $O(\log x)$ time, $O(1)$ space.
