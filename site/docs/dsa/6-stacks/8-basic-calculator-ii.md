---
id: 8-basic-calculator-ii
title: "227. Basic Calculator II"
description: "Operator precedence resolution with a deferred-addition stack"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Operator Precedence</span>

> **Problem Statement:** Given a string `s` representing an arithmetic expression containing non-negative integers, `+`, `-`, `*`, `/`, and empty spaces, evaluate this expression and return its value. Integer division must truncate toward zero. You may not use any built-in `eval()` function.

```text
Input:  s = "3+2*2"
Output: 7
Explanation: Multiplication takes precedence over addition: 3 + (2 * 2) = 7.
```

---

### The Intuitive Mental Model

In arithmetic expressions without parentheses, operator precedence governs evaluation order:
- Multiplication and division (`*`, `/`) have high precedence and must execute immediately.
- Addition and subtraction (`+`, `-`) have low precedence and can be deferred.

Think of a stack as an accumulator tray of signed numbers waiting to be summed together at the end. When we encounter `+` or `-`, we defer the operation by placing the signed value onto the stack. When we encounter `*` or `/`, we do not defer: we immediately pop the top number, execute the multiplication or division with the current number, and push the combined result back onto the tray.

#### Brute Force: Two-Pass Tokenization and Reduction
A naive approach tokenizes the string into an array of numbers and operator symbols. A first pass scans from left to right looking for `*` and `/`. For each found, it computes the operation with its left and right operands, replaces the 3 tokens with the single result, and shrinks the array. A second pass then scans left to right to evaluate all `+` and `-` operations. Because deleting elements from a list takes $O(n)$ time, repeated array modifications result in $O(n^2)$ time.

#### Optimal Approach: Single-Pass Operator Precedence Stack
Because an operator sits between its two operands, when reading from left to right, we encounter the operator before we know the right-hand operand. We maintain a `pending_op` variable initialized to `'+'`. 

As we scan characters:
1. Digits accumulate into `curr_num`.
2. When we hit a new operator or the end of the string, the number `curr_num` is complete, and we apply `pending_op` to it:
   - If `pending_op == '+'`: push `curr_num`.
   - If `pending_op == '-'`: push `-curr_num`.
   - If `pending_op == '*'`: pop top, push `stack.pop() * curr_num`.
   - If `pending_op == '/'`: pop top, push `int(stack.pop() / curr_num)`.
3. Update `pending_op` to the newly encountered character and reset `curr_num = 0`.
4. When the entire string is processed, every multiplication and division has been evaluated, and the final answer is simply `sum(stack)`.

#### Execution Walkthrough

Let us trace `s = "3 + 2 * 2"`:

| Step | Char | `curr_num` | `pending_op` | Trigger Evaluation? | Stack State |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `'3'` | `3` | `'+'` | No | `[]` |
| **2** | `'+'` | `3` | `'+'` | Yes: push `3`, `pending_op = '+'` | `[3]` |
| **3** | `'2'` | `2` | `'+'` | No | `[3]` |
| **4** | `'*'` | `2` | `'+'` | Yes: push `2`, `pending_op = '*'` | `[3, 2]` |
| **5** | `'2'` | `2` | `'*'` | End of string: pop `2`, compute $2 \times 2 = 4$, push `4` | `[3, 4]` |

Final sum: `sum([3, 4]) = 7`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create an empty list `stack = []`, an integer `curr_num = 0`, and a character `pending_op = '+'`.
2. **Scan Expression:** Iterate through each character `ch` and index `i` across `enumerate(s)`:
   - If `ch.isdigit()`: accumulate `curr_num = curr_num * 10 + int(ch)`.
   - If `ch in "+-*/"` or `i == len(s) - 1` (excluding whitespace):
     - If `pending_op == '+'`: push `curr_num` to `stack`.
     - If `pending_op == '-'`: push `-curr_num` to `stack`.
     - If `pending_op == '*'`: pop top, push `stack.pop() * curr_num`.
     - If `pending_op == '/'`: pop top, push `int(stack.pop() / curr_num)`.
     - Update `pending_op = ch`.
     - Reset `curr_num = 0`.
3. **Return Total:** Return `sum(stack)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Operator Precedence Stack" default>

```python
class Solution:
    def calculate(self, s: str) -> int:
        stack: list[int] = []
        curr_num = 0
        pending_op = '+'

        for i, ch in enumerate(s):
            if ch.isdigit():
                curr_num = curr_num * 10 + int(ch)

            # Evaluate when encountering an operator or the last character
            if (not ch.isdigit() and ch != ' ') or i == len(s) - 1:
                if pending_op == '+':
                    stack.append(curr_num)
                elif pending_op == '-':
                    stack.append(-curr_num)
                elif pending_op == '*':
                    stack.append(stack.pop() * curr_num)
                elif pending_op == '/':
                    # int() truncates division toward zero
                    stack.append(int(stack.pop() / curr_num))

                pending_op = ch
                curr_num = 0

        return sum(stack)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: O(1) Space Running Total">

```python
class Solution:
    def calculate(self, s: str) -> int:
        total = 0
        last_term = 0
        curr_num = 0
        pending_op = '+'

        for i, ch in enumerate(s):
            if ch.isdigit():
                curr_num = curr_num * 10 + int(ch)

            if (not ch.isdigit() and ch != ' ') or i == len(s) - 1:
                if pending_op == '+':
                    total += last_term
                    last_term = curr_num
                elif pending_op == '-':
                    total += last_term
                    last_term = -curr_num
                elif pending_op == '*':
                    last_term = last_term * curr_num
                elif pending_op == '/':
                    last_term = int(last_term / curr_num)

                pending_op = ch
                curr_num = 0

        return total + last_term
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Operator Precedence Stack** | $O(n)$ | $O(n)$ | Single pass over the expression, deferring additions onto a stack and resolving multiplications immediately. |
| **Running Total (O(1) Space)** | $O(n)$ | $O(1)$ | Maintains `last_term` and `total` directly, eliminating auxiliary stack memory. |

---

### Common Pitfall: Final Operand Trigger and Negative Division

Two common bugs occur when implementing this parser:
1. **Missing the last number:** Because operations are evaluated when the *next* operator arrives, the final number in the string has no subsequent operator to trigger its evaluation. Checking `i == len(s) - 1` ensures the final accumulated number is processed.
2. **Floor division on negative values:** In Python, `-3 // 2` equals `-2` because `//` rounds toward negative infinity. The problem specifies truncation toward zero, where $-3 / 2$ must evaluate to `-1`. Using `int(stack.pop() / curr_num)` performs float division first, truncating toward zero correctly.

---

### Concise Interview Takeaway

Because operators lag behind their operands, store the pending operator and execute it once the full operand is parsed. Evaluate high-precedence multiplication and division immediately by popping the top element of the stack, and defer addition and subtraction by pushing signed numbers onto the stack. A final `sum(stack)` produces the result in linear $O(n)$ time and $O(n)$ space.
