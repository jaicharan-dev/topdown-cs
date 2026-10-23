---
id: 4-reverse-words-in-a-string
title: "151. Reverse Words in a String"
description: "Split on whitespace, flip the list, join with single spaces"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>

> **Problem Statement:** You are given a string `s`. Reverse the order of the words in it and return the result. A word is any run of non-space characters. The answer must have exactly one space between words, and none at either end, however messy the spacing in the input was.

```text
Input:  s = "the sky is blue"
Output: "blue is sky the"
```

---

### Picture it

The words themselves are untouched. `blue` is still spelled `blue`. Only their order flips, so this is a reversal of a list of words, not a reversal of characters.

The second half of the problem is tidying. The input may arrive with spaces at the front, spaces at the end, and several spaces between words. All of that has to be flattened to a single space between neighbouring words and nothing on either side.

So there are really two jobs: cut the string into words, ignoring however much whitespace sits between them, then put them back together in the opposite order.

---

### How to think about it

Cutting into words is the part worth being careful about, because the obvious way to do it is subtly wrong. Splitting on the single character `" "` turns two spaces in a row into an empty word, and those empty words become stray spaces when you join everything back up.

Python's `split()` with no argument does the right thing on its own: it treats any run of whitespace as one separator and throws the empties away. `"  the   sky  "` becomes exactly `the`, `sky`, with no blanks in the list and nothing from the ends.

After that, reverse the list and join with a single space. The tidying is already done by the way the split worked, so there is no trimming step at the end.

**If an interviewer asks for the in-place version**, meaning working on a character array with no extra storage, the classic trick is two reversals. Reverse the entire string first, which puts the words in the right order but spells each one backwards. Then reverse each word in place, which fixes the spelling and leaves the order alone. It is worth being able to describe that, but it cannot be done on a Python string, because strings cannot be modified once created.

---

### Walking through the example

Take `s = "the sky is blue"`.

1. **Split on whitespace:** `the`, `sky`, `is`, `blue`.
2. **Reverse the list:** `blue`, `is`, `sky`, `the`.
3. **Join with one space:** `"blue is sky the"`.

Now take the messier `s = "  hello   world  "`. The split still gives exactly `hello`, `world`, because leading, trailing and repeated spaces are all absorbed. Reversing and joining gives `"world hello"`, already correctly spaced.

---

### The code

```python
class Solution:
    def reverseWords(self, s: str) -> str:
        # split() with no argument absorbs every run of whitespace
        return " ".join(reversed(s.split()))
```

---

### Time and space complexity

#### Time: $O(n)$

The split reads the string once. Reversing a list of `w` words is `w` steps, and `w` can never be more than `n`. The join writes each character of the answer once. Every stage is one sweep over the data, so the total is linear in the length of the string.

#### Space: $O(n)$

The list of words holds all the characters of the input, and the joined result is another copy of roughly the same size. Both grow with the input.

That is unavoidable in Python, because strings cannot be changed after they are created, so producing a different string means building a new one. In a language where you are handed a mutable character array, the two-reversal method does the job with $O(1)$ extra space.

---

### Remember this

Split on runs of whitespace, reverse the list, join with a single space. Splitting on the space character instead creates empty words out of repeated spaces, which turn into stray spaces in the answer. For the in-place version on a character array: reverse the whole string, then reverse each word back. $O(n)$ time, $O(n)$ space in Python.
