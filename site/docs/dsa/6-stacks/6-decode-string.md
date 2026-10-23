---
id: 6-decode-string
title: "394. Decode String"
description: "Each open bracket parks the work so far, each close bracket collects it back"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Nested Context Stack</span>

> **Problem Statement:** You are given a string encoded with the rule `k[text]`, meaning the text inside the brackets repeats `k` times. Brackets can be nested. Return the decoded string.

```text
Input:  s = "3[a2[c]]"
Output: "accaccacc"
```

---

### Picture it

Reading left to right, you are always building one piece of text. Then an open bracket appears and interrupts you.

At that moment you have something half-built in your hands, and you are about to start building a completely different piece that will later be repeated and stuck onto the end of what you had. So put your current work down somewhere safe, along with the repeat count that was announced, and start fresh.

When the matching close bracket arrives, the inner piece is finished. Pick your earlier work back up, repeat the inner piece the right number of times, and join them.

Brackets nest, and the interruptions resolve in reverse order, which is what makes this a stack.

---

### How to think about it

Hold three things: the text you are building now, the number you are reading now, and a stack of parked work.

Then every character is one of four cases.

**A digit.** The count might be more than one digit long, as in `12[ab]`, so fold it in with `count = count * 10 + digit` rather than replacing it.

**An open bracket.** Park the pair "text so far" and "count so far" on the stack, then reset both. The reset is what makes the inner section start from nothing.

**A close bracket.** Pop the parked pair. The finished inner text gets repeated that many times and appended to the parked text, and the result becomes your current work again.

**A letter.** Append it to the current text.

Nothing in that list needs to know how deeply nested it is. The stack keeps track for you, which is the point.

---

### Walking through the example

Take `s = "3[a2[c]]"`.

1. **`3`** sets the count to `3`.
2. **`[`** parks the pair `("", 3)`. The current text resets to empty and the count to zero.
3. **`a`** makes the current text `a`.
4. **`2`** sets the count to `2`.
5. **`[`** parks the pair `("a", 2)`. The current text resets to empty again.
6. **`c`** makes the current text `c`.
7. **`]`** pops `("a", 2)`. The inner `c` repeated twice is `cc`, appended to `a`, giving `acc`.
8. **`]`** pops `("", 3)`. The text `acc` repeated three times is `accaccacc`, appended to nothing.

The answer is `accaccacc`.

---

### The code

```python
class Solution:
    def decodeString(self, s: str) -> str:
        stack = []      # parked (text so far, repeat count) for each open bracket
        current = ""
        count = 0

        for ch in s:
            if ch.isdigit():
                count = count * 10 + int(ch)   # counts can have several digits
            elif ch == "[":
                stack.append((current, count))
                current, count = "", 0
            elif ch == "]":
                before, repeat = stack.pop()
                current = before + current * repeat
            else:
                current += ch

        return current
```

---

### Time and space complexity

#### Time: $O(\text{output length})$

Every character of the input is read once, but that is not the real cost. The work is dominated by building the result: a string like `100[a]` reads six characters and produces a hundred. So the honest bound is the size of what comes out, since each character of the output is written at least once.

#### Space: $O(\text{depth} + \text{output length})$

The stack holds one parked pair per open bracket currently unclosed, so its height is the nesting depth. On top of that, the parked texts and the current text together hold what has been built so far.

---

### Remember this

An open bracket interrupts you, so park the text so far and the count and start fresh. A close bracket finishes the inner piece, so pop, repeat, and join it onto what you parked. Build multi-digit counts with `count * 10 + digit`, and let the stack remember the nesting instead of tracking depth yourself.
