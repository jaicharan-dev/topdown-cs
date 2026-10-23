---
id: 3-evaluate-reverse-polish-notation
title: "150. Evaluate Reverse Polish Notation"
description: "Numbers wait on a stack, and an operator takes the two most recent"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Operand Stack</span>

> **Problem Statement:** You are given an arithmetic expression written in postfix form, where each operator comes after the two values it applies to. Work out what it evaluates to. Division should cut toward zero.

```text
Input:  tokens = ["2", "1", "+", "3", "*"]
Output: 9
```

---

### Picture it

Postfix writing exists to remove brackets and precedence entirely. `2 1 +` means "add those two", and `3 *` then means "multiply the result by three". There is never any question about what happens first, because the order is written into the arrangement.

That makes evaluating it almost mechanical. Numbers have to wait around until an operator calls for them, and the operator always wants the two most recent ones. Waiting values with the most recent needed first is a stack.

So: push numbers as you meet them. On an operator, pop two, combine them, push the result back. When the tokens run out, the single value left on the stack is the answer.

---

### How to think about it

The mechanics are straightforward, and there are exactly two details that catch people.

**The operands come back in reverse.** The first value you pop is the one that was pushed most recently, which is the **right** operand. The second pop is the left. For addition and multiplication it makes no difference, but for subtraction and division it is the whole answer. Getting this backwards turns `5 1 -` into `-4` instead of `4`.

**Division has to cut toward zero.** In Python, `//` rounds toward negative infinity, so `-7 // 2` gives `-4` when the problem wants `-3`. Dividing normally and converting with `int` does the right thing, because that conversion discards the fractional part rather than rounding down.

A valid postfix expression always leaves exactly one value behind, so there is no need to check anything at the end.

---

### Walking through the example

Take `tokens = ["2", "1", "+", "3", "*"]`.

1. **`2`** is a number, so push it. The stack is `2`.
2. **`1`** is a number, so push it. The stack is `2, 1`.
3. **`+`** pops `1` as the right operand and `2` as the left. The sum `3` goes back on. The stack is `3`.
4. **`3`** is a number, so push it. The stack is `3, 3`.
5. **`*`** pops `3` and `3`, multiplies to `9`, and pushes it back.

One value is left, so the answer is `9`.

---

### The code

```python
class Solution:
    def evalRPN(self, tokens: list[str]) -> int:
        stack = []

        for token in tokens:
            if token not in ("+", "-", "*", "/"):
                stack.append(int(token))
                continue

            right = stack.pop()
            left = stack.pop()   # popped second, so this is the left operand

            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            else:
                # // rounds toward minus infinity; this cuts toward zero
                stack.append(int(left / right))

        return stack[0]
```

The check is "is this token **not** an operator" rather than "does it look like a number", because negative values arrive as tokens like `"-4"`, and testing for digits would misread the minus sign.

---

### Time and space complexity

#### Time: $O(n)$

Every token is handled once. A number costs a push, an operator costs two pops, one arithmetic operation and a push. All constant.

#### Space: $O(n)$

The stack. An expression that lists many numbers before any operator, which is perfectly legal, holds all of them at once.

---

### Remember this

Push numbers, and on an operator pop two and push the result. The first pop is the **right** operand, which only matters for subtraction and division, and that is exactly where it is easy to get wrong. Use `int(left / right)` rather than `//`, because the problem wants division cut toward zero. $O(n)$ time, $O(n)$ space.
