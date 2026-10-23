---
id: 8-letter-combinations-of-a-phone-number
title: "17. Letter Combinations of a Phone Number"
description: "One digit per position, and every letter on that key is a branch"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">State Space Tree</span>

> **Problem Statement:** Given a string of digits from `2` to `9`, return every letter combination the number could spell on an old telephone keypad.

```text
Input:  digits = "23"
Output: ["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"]
```

---

### Picture it

Each digit contributes exactly one letter to the answer, and the choice is which of that key's letters to use.

The `2` key offers `a`, `b` or `c`. The `3` key offers `d`, `e` or `f`. So there are `3 × 3 = 9` combinations, which is the length of the expected output.

As a tree, each level is one digit and each branch is one of that key's letters:

```text
            ""
     a/     b|     \c
    "a"     "b"    "c"
   d/|\e,f  ...     ...
 "ad" "ae" "af"
```

Walk to the bottom and every leaf is a combination.

---

### How to think about it

Keep a map from digit to its letters, then recurse over the positions of the input.

**When the partial string is as long as the digits**, it is complete, so record it.

**Otherwise**, look up the letters for the current digit and try each in turn: append it, recurse to the next digit, remove it.

Two things to notice about how this differs from the other problems in this block.

**There is no pruning.** Every branch leads to a valid answer, because any letter from any key is allowed. That makes it the purest example of the shape: a plain walk of the decision tree with nothing rejected.

**The branching factor is not the input size.** Each level offers three or four options, set by the key rather than by how many digits there are. So the tree is wide and shallow rather than growing with `n` in both directions.

The one case to handle explicitly is an **empty input**, which should give an empty list rather than a list containing the empty string. Without a guard the recursion immediately records `""` and returns the wrong thing.

---

### Walking through the example

Take `digits = "23"`.

1. **First digit is `2`**, offering `a`, `b`, `c`.
2. **Take `a`.** Move to the second digit, `3`, offering `d`, `e`, `f`.
   - Take `d` for `"ad"`, then back up and take `e` for `"ae"`, then `f` for `"af"`.
3. **Back up to the first digit and take `b`.** The same three branches give `"bd"`, `"be"`, `"bf"`.
4. **Take `c`** for `"cd"`, `"ce"`, `"cf"`.

Nine combinations, in the order shown in the expected output.

---

### The code

```python
class Solution:
    def letterCombinations(self, digits: str) -> list[str]:
        if not digits:
            return []   # not a list holding the empty string

        keys = {
            "2": "abc", "3": "def", "4": "ghi", "5": "jkl",
            "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz",
        }

        out = []
        partial = []

        def build(i: int) -> None:
            if i == len(digits):
                out.append("".join(partial))
                return

            # every letter on this key is a branch, and none can be pruned
            for ch in keys[digits[i]]:
                partial.append(ch)
                build(i + 1)
                partial.pop()

        build(0)
        return out
```

---

### Time and space complexity

#### Time: $O(4^n \cdot n)$

Where `n` is the number of digits. Each digit multiplies the number of combinations by three or four, and joining each finished combination costs `n`.

As with Subsets and Permutations, the output is that large, so no method avoids it.

#### Space: $O(n)$ beyond the answer

The recursion depth and the partial string, both one entry per digit.

---

### Remember this

One digit per level, one branch per letter on that key, and nothing to prune because every path is valid. Record when the partial string matches the input length. Guard the empty input explicitly, or the recursion returns a list containing an empty string instead of an empty list. $O(4^n \cdot n)$ time, $O(n)$ extra space.
