---
id: 9-generate-parentheses
title: "22. Generate Parentheses"
description: "Two counters decide what may be added next, so nothing invalid is ever built"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Guided Pruning</span>

> **Problem Statement:** Given `n` pairs of brackets, generate every well-formed arrangement of them.

```text
Input:  n = 3
Output: ["((()))", "(()())", "(())()", "()(())", "()()()"]
```

---

### Picture it

The obvious plan is to generate every string of `n` opening and `n` closing brackets and keep the valid ones. For `n = 3` that means building 20 strings to keep 5, and the waste grows quickly with `n`.

Better: never build an invalid one. At every step there are only two possible characters, and simple rules say whether each is allowed.

**An opening bracket** is allowed whenever fewer than `n` have been used. There is no other way for it to be wrong, since a bracket opened now can always be closed later.

**A closing bracket** is allowed only when it would close something already open, which means fewer closing brackets used so far than opening ones.

Those two counters are all the state needed, and together they make every string built valid by construction.

---

### How to think about it

Carry two numbers: how many opening brackets have been used, and how many closing ones.

**When both reach `n`**, the string is complete, so record it.

**Otherwise**, try each allowed character:

- If `opened` is below `n`, add an opening bracket and recurse.
- If `closed` is below `opened`, add a closing bracket and recurse.

Remove the character afterwards, as always.

The second condition deserves attention. Comparing closing against **opening**, rather than against `n`, is what enforces well-formedness: a closing bracket can only appear when something is waiting to be closed. It is the same balance rule as in Valid Parentheses, applied while building instead of while checking.

This is the clearest example of **pruning as prevention** in the block. Nothing is generated and rejected; invalid branches simply do not exist, which is why the walk visits only valid strings and a few partial ones.

---

### Walking through the example

Take `n = 3`, following the first branch down.

1. **Add `(`.** Opened `1`, closed `0`. A closing bracket is now allowed, as is another opening one.
2. **Add `(`.** Opened `2`.
3. **Add `(`.** Opened `3`, which is `n`, so no more opening brackets are allowed.
4. **Only closing brackets remain possible.** Add three of them to reach `((()))`, which is recorded.
5. **Back up to opened `2`, closed `0`.** Add `)` instead, giving `(()`, then continue, eventually reaching `(()())` and `(())()`.
6. **Back up further to opened `1`, closed `0`.** Add `)` for `()`, which leads to `()(())` and `()()()`.

Five strings, and at no point was an invalid one constructed. Note that a closing bracket was never even attempted at the very start, because `closed` was not below `opened`.

---

### The code

```python
class Solution:
    def generateParenthesis(self, n: int) -> list[str]:
        out = []
        partial = []

        def build(opened: int, closed: int) -> None:
            if opened == n and closed == n:
                out.append("".join(partial))
                return

            # an opening bracket is fine until all n are used
            if opened < n:
                partial.append("(")
                build(opened + 1, closed)
                partial.pop()

            # a closing bracket needs something open to close
            if closed < opened:
                partial.append(")")
                build(opened, closed + 1)
                partial.pop()

        build(0, 0)
        return out
```

---

### Time and space complexity

#### Time: $O(4^n / \sqrt{n})$

That expression is the `n`-th Catalan number, which counts exactly how many well-formed arrangements exist. Since every string the walk completes is one of them and none are discarded, the work is proportional to the size of the output.

In plain terms: `n = 3` gives 5 strings, `n = 5` gives 42, and `n = 10` gives 16,796. It grows fast, but far slower than the `2^(2n)` strings the generate-and-filter approach would build.

#### Space: $O(n)$ beyond the answer

The recursion goes `2n` levels deep, one per character, and the partial string holds at most `2n` characters.

---

### Remember this

Do not generate and filter. Two counters decide what is legal next: an opening bracket while fewer than `n` are used, a closing bracket only while fewer closings than openings have been used. That second comparison is the well-formedness rule, and it means every string the walk finishes is already valid.
