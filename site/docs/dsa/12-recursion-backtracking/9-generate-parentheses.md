---
id: 9-generate-parentheses
title: "22. Generate Parentheses"
description: "Guided backtracking with opening and closing bracket balance invariants"
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Guided Pruning</span>

> **Problem Statement:** Given `n` pairs of parentheses, write a function to generate all combinations of well-formed (valid) parentheses.

```text
Input:  n = 3
Output: ["((()))", "(()())", "(())()", "()(())", "()()()"]
Explanation: All 5 valid combinations of 3 balanced pairs of parentheses are generated.
```

---

### The Intuitive Mental Model

Imagine constructing an archway of matching brackets. Every opening bracket `'('` creates a debt that must eventually be repaid by a closing bracket `')'`.

Instead of generating arbitrary strings and validating them after the fact, we use **Guided Backtracking**: we never place a character that violates well-formedness rules. Every valid placement follows two rules:
1. **Rule 1 (Add `(`):** You can add an opening bracket at any time as long as you have not exhausted your quota: `open_count < n`.
2. **Rule 2 (Add `)`):** You can only add a closing bracket if there is an unmatched opening bracket currently waiting for it: `close_count < open_count`. If `close_count >= open_count`, placing `')'` would close a bracket that was never opened, permanently ruining the string.

When the path length reaches $2n$, both counts have reached $n$, and the resulting string is guaranteed to be well-formed.

#### Brute Force: Generate All Sequences and Validate
Generate all $2^{2n}$ possible strings of length $2n$ using `'('` and `')'`, then validate each candidate using a balance counter. This wastes exponential time constructing invalid prefixes like `"))(("`.

#### Optimal Approach: Guided Backtracking Invariants
Branch only when an invariant is satisfied. By never exploring invalid prefixes, every single path that reaches length $2n$ is guaranteed to be a valid, well-formed combination.

#### Execution Walkthrough

Let us trace `n = 2`:

| Step | `open_count` | `close_count` | Condition Met | Action / Added | Path State (`path`) | Result Collected |
| :---: | :---: | :---: | :---: | :--- | :---: | :--- |
| **1** | `0` | `0` | `open < 2` | Add `'('` | `['(']` | `[]` |
| **2** | `1` | `0` | `open < 2` | Add `'('` | `['(', '(']` | `[]` |
| **3** | `2` | `0` | `close < open` | Add `')'` | `['(', '(', ')']` | `[]` |
| **4** | `2` | `1` | `close < open` | Add `')'` | `['(', '(', ')', ')']` | `[]` |
| **5** | `2` | `2` | Base case ($2n = 4$) | Collect `"(())"` | `['(', '(', ')', ')']` | `["(())"]` |
| **6** | `1` | `0` | `close < open` | Add `')'` | `['(', ')']` | `["(())"]` |
| **7** | `1` | `1` | `open < 2` | Add `'('` | `['(', ')', '(']` | `["(())"]` |
| **8** | `2` | `1` | `close < open` | Add `')'` | `['(', ')', '(', ')']` | `["(())"]` |
| **9** | `2` | `2` | Base case ($2n = 4$) | Collect `"()()"` | `['(', ')', '(', ')']` | `["(())", "()()"]` |

---

### Step-by-Step Algorithm

1. **Initialize Containers:** Create `result = []` and `path = []`.
2. **Define Backtrack Helper:** Define `backtrack(open_cnt, close_cnt)` to track counts of opening and closing parentheses placed so far.
3. **Base Case Check:** If `len(path) == 2 * n`, all $n$ pairs are placed. Append `"".join(path)` to `result` and return.
4. **Branch Open:** If `open_cnt < n`:
   - Append `'('` to `path`.
   - Recurse: `backtrack(open_cnt + 1, close_cnt)`.
   - Backtrack: pop from `path`.
5. **Branch Close:** If `close_cnt < open_cnt`:
   - Append `')'` to `path`.
   - Recurse: `backtrack(open_cnt, close_cnt + 1)`.
   - Backtrack: pop from `path`.
6. **Trigger and Return:** Call `backtrack(0, 0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Guided Backtracking" default>

```python
class Solution:
    def generateParenthesis(self, n: int) -> list[str]:
        result: list[str] = []
        path: list[str] = []

        def backtrack(open_cnt: int, close_cnt: int) -> None:
            # All n pairs placed
            if len(path) == 2 * n:
                result.append("".join(path))
                return

            # Can place '(' as long as open quota remains
            if open_cnt < n:
                path.append("(")
                backtrack(open_cnt + 1, close_cnt)
                path.pop()  # Backtrack

            # Can only place ')' if there is an unmatched '('
            if close_cnt < open_cnt:
                path.append(")")
                backtrack(open_cnt, close_cnt + 1)
                path.pop()  # Backtrack

        backtrack(0, 0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Brute Force with Validation">

```python
class Solution:
    def generateParenthesis(self, n: int) -> list[str]:
        result: list[str] = []

        def is_valid(s: str) -> bool:
            balance = 0
            for char in s:
                if char == "(":
                    balance += 1
                else:
                    balance -= 1
                if balance < 0:
                    return False
            return balance == 0

        def generate(current: list[str]) -> None:
            if len(current) == 2 * n:
                candidate = "".join(current)
                if is_valid(candidate):
                    result.append(candidate)
                return

            current.append("(")
            generate(current)
            current.pop()

            current.append(")")
            generate(current)
            current.pop()

        generate([])
        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force with Validation** | $O(2^{2n} \cdot n)$ | $O(n)$ | Generates all $2^{2n}$ binary combinations and tests validity in $O(n)$. Explores vast numbers of invalid branches. |
| **Guided Backtracking** | $O\left(\frac{4^n}{\sqrt{n}}\right)$ | $O(n)$ | Generates only valid sequences directly using balance invariants. Matches the $n$-th Catalan number $C_n$. |

*(The number of valid parentheses sequences of length $2n$ is given by the $n$-th Catalan number $C_n = \frac{1}{n + 1} \binom{2n}{n} \approx \frac{4^n}{n \sqrt{\pi n}}$. Constructing each sequence takes $O(n)$ time.)*

---

### Common Pitfall: Allowing Closing Brackets Exceeding Opening Brackets

A common bug is writing `if close_cnt < n` instead of `if close_cnt < open_cnt`. Allowing a closing bracket when `close_cnt >= open_cnt` immediately ruins bracket balance, producing illegal strings like `")("`. A closing bracket must only be placed when there is an active, open bracket waiting to be matched.

---

### Concise Interview Takeaway

For **Generate Parentheses**, guide the backtracking search with two invariants: place an opening bracket `'('` whenever `open_count < n`, and place a closing bracket `')'` only when `close_count < open_count`. This prevents invalid strings from ever being formed, generating all valid combinations in optimal Catalan time.
