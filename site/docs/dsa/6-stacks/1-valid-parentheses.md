---
id: 1-valid-parentheses
title: "20. Valid Parentheses"
description: "Push the closer you expect, and check it when a closer arrives"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Matching Pairs</span>

> **Problem Statement:** You are given a string of brackets, round, square and curly. Decide whether they are balanced: every bracket closed by one of the same type, and closed in the opposite order to how they were opened.

```text
Input:  s = "()[]{}"
Output: true
```

---

### Picture it

Brackets close in the reverse of the order they open. The most recent thing you opened is always the first thing that has to close.

That is exactly how a stack behaves, so use one to hold **what you are still waiting for**. Every time you meet an opening bracket, push the closer it will eventually need. Every time you meet a closing bracket, it has to be the one sitting on top. Anything else means the brackets are tangled.

Pushing the expected closer rather than the opener itself is a small choice that makes the comparison a direct equality check, with no lookup table at the moment of comparison.

---

### How to think about it

Walk the string once.

**An opening bracket** means a new promise, so push its matching closer onto the stack.

**A closing bracket** has to settle the most recent promise. Two things can go wrong. The stack might be empty, meaning this bracket closes something that was never opened. Or the top might be a different closer, meaning the types are crossed, like `([)]`.

**At the end**, the stack must be empty. Anything still sitting there was opened and never closed, which catches a string like `(((`.

That last check is the one people forget. Without it, `"((("` walks the whole string without ever failing a comparison and wrongly reports `true`.

---

### Walking through the example

Take `s = "()[]{}"`.

1. **`(`** pushes the expectation `)`. The stack is `)`.
2. **`)`** matches the top, so pop it. The stack is empty.
3. **`[`** pushes `]`. The stack is `]`.
4. **`]`** matches, pop. Empty again.
5. **`{`** pushes `}`, and **`}`** matches and pops.

The stack ends empty, so the answer is `true`.

Now take the crossed `"([)]"`. The `(` pushes `)` and the `[` pushes `]`, so the stack reads `)` then `]` with `]` on top. The `)` arrives and does not match `]`, so the answer is `false`.

---

### The code

```python
class Solution:
    def isValid(self, s: str) -> bool:
        closer = {"(": ")", "[": "]", "{": "}"}
        expected = []

        for ch in s:
            if ch in closer:
                expected.append(closer[ch])
            elif not expected or expected.pop() != ch:
                return False

        # anything still waiting was opened and never closed
        return not expected
```

---

### Time and space complexity

#### Time: $O(n)$

One pass over the string, and each character causes at most one push or one pop, both of which are constant time.

#### Space: $O(n)$

The stack. A string of nothing but opening brackets pushes an expectation for every character before anything is ever popped, so in the worst case it holds `n` entries.

---

### Remember this

Push the closer you expect, not the bracket you saw, so the check at a closing bracket is a plain equality against the top. Fail if the stack is empty when a closer arrives, fail if the top disagrees, and fail at the end if anything is left over. $O(n)$ time, $O(n)$ space.
