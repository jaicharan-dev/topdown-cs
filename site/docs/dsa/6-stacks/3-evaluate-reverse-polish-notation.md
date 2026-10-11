---
id: 3-evaluate-reverse-polish-notation
title: "150. Evaluate Reverse Polish Notation"
description: "Operand stack evaluation with operand ordering and truncating division"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Operand Stack</span>

> **Problem Statement:** You are given an array of strings `tokens` that represents an arithmetic expression in Reverse Polish Notation (postfix). Evaluate the expression and return an integer representing its value. Division between two integers should truncate toward zero.

```text
Input:  tokens = ["2", "1", "+", "3", "*"]
Output: 9
Explanation: ((2 + 1) * 3) = 9
```

---

### The Intuitive Mental Model

In standard arithmetic (infix notation), operators sit between numbers, requiring parentheses and operator precedence rules (`(2 + 1) * 3`). In Reverse Polish Notation (postfix), operands appear first, followed immediately by their operator (`"2"`, `"1"`, `"+"`, `"3"`, `"*"`). Postfix expressions are unambiguous and require no parentheses.

#### Brute Force: In-Place Array Reduction
A naive method repeatedly searches the list from left to right for the first operator. Once found, it retrieves the two preceding numbers, evaluates the sub-expression, replaces the three items in the array with the single result, and repeats. Because deleting two elements and shifting an array takes $O(n)$ time, performing this across $O(n)$ operators degrades total runtime to $O(n^2)$.

#### Optimal Approach: Operand Stack
Instead of scanning repeatedly and shifting array elements, we process tokens sequentially in a single pass using a LIFO operand stack:
- Every time a number is encountered, push it onto the stack.
- Whenever an arithmetic operator arrives (`+`, `-`, `*`, `/`), pop the top two numbers from the stack.
- The first popped element is the right operand ($b$), and the second popped element is the left operand ($a$).
- Compute the result, push it back onto the stack, and continue.
- After all tokens are processed, the single remaining element on the stack is the final answer.

#### Execution Walkthrough

Let us trace `tokens = ["2", "1", "+", "3", "*"]`:

| Step | Token | Type | Action Taken | Stack State |
| :---: | :---: | :---: | :--- | :--- |
| **1** | `"2"` | Number | Push `2` | `[2]` |
| **2** | `"1"` | Number | Push `1` | `[2, 1]` |
| **3** | `"+"` | Operator | Pop `b = 1`, pop `a = 2`. Compute $2 + 1 = 3$. Push `3` | `[3]` |
| **4** | `"3"` | Number | Push `3` | `[3, 3]` |
| **5** | `"*"` | Operator | Pop `b = 3`, pop `a = 3`. Compute $3 \times 3 = 9$. Push `9` | `[9]` |

Final result returned: `9`.

---

### Step-by-Step Algorithm

1. **Initialize Stack:** Create an empty list `stack = []` to store evaluated numerical operands.
2. **Iterate Tokens:** Traverse each string `token` in `tokens`:
   - If `token` is an operator (`+`, `-`, `*`, `/`):
     - Pop the right operand: `b = stack.pop()`.
     - Pop the left operand: `a = stack.pop()`.
     - Evaluate the operation:
       - For `+`: push `a + b`.
       - For `-`: push `a - b`.
       - For `*`: push `a * b`.
       - For `/`: push `int(a / b)` to truncate division toward zero.
   - Otherwise, `token` represents an integer:
     - Convert the string to an integer `int(token)` and push it onto `stack`.
3. **Return Result:** Return `stack[0]`, the sole remaining value representing the complete evaluated expression.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Operand Stack" default>

```python
class Solution:
    def evalRPN(self, tokens: list[str]) -> int:
        stack: list[int] = []

        for token in tokens:
            if token == "+":
                stack.append(stack.pop() + stack.pop())
            elif token == "*":
                stack.append(stack.pop() * stack.pop())
            elif token == "-":
                b = stack.pop()  # Right operand
                a = stack.pop()  # Left operand
                stack.append(a - b)
            elif token == "/":
                b = stack.pop()  # Right operand
                a = stack.pop()  # Left operand
                # int(a / b) truncates toward zero in Python
                stack.append(int(a / b))
            else:
                stack.append(int(token))

        return stack[0]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Lambda Dispatch Table">

```python
class Solution:
    def evalRPN(self, tokens: list[str]) -> int:
        stack: list[int] = []
        operations = {
            "+": lambda a, b: a + b,
            "-": lambda a, b: a - b,
            "*": lambda a, b: a * b,
            "/": lambda a, b: int(a / b)
        }

        for token in tokens:
            if token in operations:
                b = stack.pop()
                a = stack.pop()
                stack.append(operations[token](a, b))
            else:
                stack.append(int(token))

        return stack[0]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (In-Place Array Reduction)** | $O(n^2)$ | $O(1)$ extra space | Deleting elements and shifting array memory takes linear time per operator. |
| **Optimal (Operand Stack)** | $O(n)$ | $O(n)$ | Evaluates the expression in a single pass with $O(1)$ push and pop operations per token. |

---

### Common Pitfall: Operand Ordering and Python Floor Division

Two major bugs commonly occur in this problem:
1. **Asymmetric Operand Order:** Because the stack is LIFO, the first popped element is the right operand ($b$) and the second popped element is the left operand ($a$). Computing $b - a$ or $b / a$ reverses the operation and gives incorrect answers.
2. **Floor Division vs Truncation:** Python's integer division operator `//` rounds toward negative infinity (`6 // -132` produces `-1`). The problem specification requires truncation toward zero (`6 / -132` must evaluate to `0`). Using `int(a / b)` performs true float division before truncating the decimal part, correctly matching integer truncation rules.

---

### Concise Interview Takeaway

Evaluate Reverse Polish Notation using a single LIFO operand stack. Push numbers as encountered, and upon reaching an operator, pop the top two numbers where the first is the right operand and the second is the left operand. Always use `int(a / b)` in Python to truncate toward zero, processing all tokens in linear $O(n)$ time and $O(n)$ space.
