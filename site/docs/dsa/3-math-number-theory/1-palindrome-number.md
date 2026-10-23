---
id: 1-palindrome-number
title: "9. Palindrome Number"
description: "Peel digits off the back and rebuild only half the number"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Digit Extraction</span>

> **Problem Statement:** You are given an integer `x`. Return `true` if it reads the same forwards and backwards. You are not allowed to turn it into a string.

```text
Input:  x = 1221
Output: true
```

---

### Picture it

Without strings, you still have two tools for getting at digits, and between them they do everything:

```text
x % 10   gives you the last digit
x // 10  throws the last digit away
```

So you can peel digits off the back of a number one at a time. Peel one off `1221` and you have the digit `1` in your hand and `122` left over.

To check a palindrome you want to compare the front against the back. Peeling gives you the back. The number that remains is the front. That is the whole mechanism.

---

### How to think about it

The tempting move is to reverse the entire number and compare it with the original. That works, but it builds a value as large as the input, which can overflow in a language with fixed-width integers. The problem is nudging you away from it.

Reversing only **half** avoids that completely. Peel digits off the back and use them to build up a reversed tail, while the original number shrinks from the right. The two meet in the middle.

How do you know when you have reached the middle? When the shrinking front is no longer bigger than the growing tail. That single condition handles both lengths:

- **Even number of digits,** like `1221`. The two halves end up equal, so compare them directly.
- **Odd number of digits,** like `12321`. The middle digit ends up stuck on the tail, so throw it away with one more division before comparing.

Two cases can be rejected before any of that starts. **Negative numbers** are never palindromes, because the minus sign sits at the front and nothing matches it at the back. **Numbers ending in zero** cannot be palindromes either, because they would have to start with a zero, and no number is written that way. The single exception is `0` itself.

---

### Walking through the example

Take `x = 1221`, starting with an empty tail of `0`.

1. **Peel `1`.** The tail becomes `1`, the front is now `122`.
2. **Peel `2`.** The tail becomes `12`, the front is now `12`.
3. The front is no longer bigger than the tail, so stop. Both are `12`, so the answer is `true`.

Now take the odd-length `x = 12321`:

1. **Peel `1`.** Tail `1`, front `1232`.
2. **Peel `2`.** Tail `12`, front `123`.
3. **Peel `3`.** Tail `123`, front `12`.
4. The front is smaller now, so stop. The tail carries the middle digit `3` on its end, so drop it with one division to get `12`, which matches the front. The answer is `true`.

---

### The code

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        # a minus sign at the front has nothing to match at the back,
        # and a trailing zero would need a leading zero
        if x < 0 or (x % 10 == 0 and x != 0):
            return False

        tail = 0
        while x > tail:
            tail = tail * 10 + x % 10
            x //= 10

        # even length: the halves match outright
        # odd length: the middle digit is stuck on the tail, so drop it
        return x == tail or x == tail // 10
```

---

### Time and space complexity

#### Time: $O(\log x)$

Each pass of the loop removes one digit, and the loop stops halfway, so it runs about half as many times as the number has digits. The digit count of a number is roughly its logarithm in base ten, which is why this is written as $O(\log x)$ rather than $O(n)$.

In human terms it is tiny. A ten-digit number takes five passes.

#### Space: $O(1)$

Two numbers, `x` and `tail`. Nothing is built that grows with the input, which is the advantage of reversing half rather than reversing the whole value into a new one.

---

### Remember this

Use `% 10` to read the last digit and `// 10` to drop it. Build the reversed tail while the front shrinks, and stop when the front is no longer the bigger of the two. Compare them directly for an even number of digits, or drop the tail's last digit first for an odd one. Reject negatives and trailing zeros up front. $O(\log x)$ time, $O(1)$ space.
