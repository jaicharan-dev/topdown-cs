---
id: 8-basic-calculator-ii
title: "227. Basic Calculator II"
description: "Addition can wait on a stack, multiplication cannot wait at all"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Operator Precedence</span>

> **Problem Statement:** You are given a string holding an arithmetic expression with non-negative numbers, the four operators and some spaces. Work out its value. Division cuts toward zero, and you cannot use a built-in evaluator.

```text
Input:  s = "3+2*2"
Output: 7
```

---

### Picture it

The difficulty is precedence. Reading `3+2*2` left to right, you meet the `+` before you know that a `*` is coming, and the `*` has to happen first.

The way out is to notice that the two kinds of operator behave very differently.

**Multiplication and division are urgent.** When you reach `*`, both of its operands are already known: the number just before it and the number just after. You can do it the moment the second number is complete, and nothing later can change the result.

**Addition and subtraction can wait.** You cannot finish `3 + something` until you know what that something turns out to be, and the something might involve multiplication.

So collect the additions as a pile of pending numbers, and perform the multiplications straight away by reaching back into the pile. Add up the pile at the end.

---

### How to think about it

Keep a stack of numbers that are waiting to be added, the number currently being read, and the operator that came **before** that number.

When a number is complete, deal with it according to that previous operator:

- **`+`** pushes the number onto the stack, waiting.
- **`-`** pushes its negative, which turns every subtraction into an addition and saves a separate case at the end.
- **`*`** pops the last pending number, multiplies, and pushes the result back. The pile shrinks and regrows by one.
- **`/`** does the same with division.

At the end, the answer is simply the sum of the pile.

Two parsing details. Numbers can have several digits, so build them with `num = num * 10 + digit`. And a number is complete either when an operator appears **or** when the string ends, so the final number needs the same treatment, which is easiest to handle by checking for the last character inside the same loop.

As in Reverse Polish Notation, division must cut toward zero, so use `int(a / b)` rather than `//`.

---

### Walking through the example

Take `s = "3+2*2"`, with the pending operator starting as `+`.

1. **`3`** is read. The next character is `+`, so the number is complete. The pending operator is `+`, so push `3`. The pile is `3`. The pending operator becomes `+`.
2. **`2`** is read. The next character is `*`, so the number is complete. The pending operator is `+`, so push `2`. The pile is `3, 2`. The pending operator becomes `*`.
3. **`2`** is read and the string ends, so the number is complete. The pending operator is `*`, so pop the `2` from the pile, multiply by this `2`, and push `4`. The pile is `3, 4`.

The sum of the pile is `7`.

Notice that the `*` reached back and changed a number already on the pile. That reaching back is precedence being handled.

---

### The code

```python
class Solution:
    def calculate(self, s: str) -> int:
        stack = []
        num = 0
        op = "+"       # the operator sitting in front of the number being read

        for i, ch in enumerate(s):
            if ch.isdigit():
                num = num * 10 + int(ch)   # numbers can be several digits long

            # a number is finished at an operator, or at the end of the string
            if (not ch.isdigit() and ch != " ") or i == len(s) - 1:
                if op == "+":
                    stack.append(num)
                elif op == "-":
                    stack.append(-num)
                elif op == "*":
                    stack.append(stack.pop() * num)
                else:
                    stack.append(int(stack.pop() / num))

                op = ch
                num = 0

        return sum(stack)
```

---

### Time and space complexity

#### Time: $O(n)$

One pass over the string. Each character costs a digit fold, or a push and sometimes a pop. The final sum walks the pile once, and the pile is never longer than the count of numbers in the expression.

#### Space: $O(n)$

The pile of pending additions. An expression made entirely of `+` keeps every number waiting until the end, so it holds one entry per number.

---

### Remember this

Multiplication and division are urgent because both their operands are known the moment the second number ends. Addition and subtraction can wait, so stack them, pushing a negative for subtraction so there is only ever one operation at the end. Multiplication reaches back and rewrites the last pending number, and that reaching back is what precedence means here. $O(n)$ time, $O(n)$ space.
