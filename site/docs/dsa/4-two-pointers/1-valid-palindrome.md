---
id: 1-valid-palindrome
title: "125. Valid Palindrome"
description: "Compare from both ends, stepping over anything that is not a letter or digit"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Opposite Ends</span>

> **Problem Statement:** You are given a string `s`. Ignoring capitals, spaces and punctuation, decide whether it reads the same forwards and backwards. Only letters and digits count.

```text
Input:  s = "A man, a plan, a canal: Panama"
Output: true
```

---

### Picture it

Put one finger on the first character and another on the last. Compare them, then step both fingers inward. Keep going until they meet in the middle. If every comparison matched, the string is a palindrome.

The punctuation is the only wrinkle. When a finger lands on a comma or a space, that character does not take part in the reading at all, so the finger just keeps moving until it finds something that does.

---

### How to think about it

The obvious first move is to clean the string: strip the punctuation, lowercase everything, then compare the result with its own reverse. That works and it is short, and it is a perfectly good thing to mention. The cost is a second copy of the string, which is $O(n)$ extra memory.

Two fingers do the same job with no copy at all, by cleaning on the fly instead of up front.

The loop has three moves in it:

- **Skip from the left** while the left finger is on something that is not a letter or digit.
- **Skip from the right** in the same way.
- **Compare**, after lowercasing both, and step both fingers inward.

A mismatch ends everything immediately with `false`. If the fingers meet without ever disagreeing, the answer is `true`.

The skip loops need the same "fingers have not met" guard as the outer loop. Without it a string made entirely of punctuation walks a finger straight off the end of the string.

---

### Walking through the example

Take `s = "A man, a plan, a canal: Panama"`.

1. **`A` and `a`.** Both are letters. Lowercased they match, so step inward.
2. **Space and `m`.** The left finger is on a space, so it skips forward to `m`. Both are `m`, so they match.
3. **`a` and `a`**, then `n` and `n`, and so on.
4. When the left finger reaches the comma after `man`, it steps over it without comparing anything. The same happens at the colon on the way in from the right.

Every comparison matches, the fingers meet in the middle, and the answer is `true`.

---

### The code

```python
class Solution:
    def isPalindrome(self, s: str) -> bool:
        left, right = 0, len(s) - 1

        while left < right:
            # step over anything that is not a letter or a digit
            while left < right and not s[left].isalnum():
                left += 1
            while left < right and not s[right].isalnum():
                right -= 1

            if s[left].lower() != s[right].lower():
                return False

            left += 1
            right -= 1

        return True
```

---

### Time and space complexity

#### Time: $O(n)$

Each finger only ever moves inward, and together they cover the string exactly once. The skip loops look like they could add extra work, but a character skipped is a character neither finger will visit again, so the total number of steps is still bounded by the length of the string.

#### Space: $O(1)$

Two indices. Nothing is copied, which is the whole reason to prefer this over cleaning the string first. That version would be $O(n)$ because the cleaned copy is as long as the input.

---

### Remember this

Walk one finger in from each end, stepping over anything that is not a letter or digit, and compare the lowercased characters where they land. Guard the skip loops with the same meeting condition as the outer loop, or a string of pure punctuation runs off the end. $O(n)$ time and $O(1)$ space, where cleaning the string first would cost $O(n)$ memory.
