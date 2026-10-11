---
id: 1-valid-parentheses
title: "20. Valid Parentheses"
description: "LIFO stack matching closing brackets to opening expectations"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Matching Pairs</span>

> **Problem Statement:** Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid. Brackets must close in the exact reverse order of opening, and each close bracket must match an open bracket of the same type.

```text
Input:  s = "()[]{}"
Output: true
Explanation: Every open bracket is closed by the same type of bracket in the correct order.
```

---

### The Intuitive Mental Model

Parentheses matching follows a Last-In, First-Out (LIFO) discipline. Whenever an opening bracket appears, it establishes an expectation for a matching closing bracket. Because nested structures must close from the inside out, the most recently opened bracket must always be the very first one closed.

#### Brute Force: Repeated String Replacement
A naive approach repeatedly searches the string for adjacent matching pairs `"()"`, `"{}"`, and `"[]"` and replaces them with the empty string `""`. We repeat this replacement loop until no more pairs can be found. If the resulting string is empty, the original was valid; otherwise, it was invalid. Because each replacement pass scans the string in $O(n)$ time and can shrink the string by at most 2 characters at a time, this takes $O(n^2)$ time in the worst case (such as `"((((...))))"`), allocating new strings repeatedly.

#### Optimal Approach: LIFO Stack with Bracket Map
Instead of repeatedly scanning and copying strings, we can process the characters in a single pass using a stack. 

Whenever we encounter an opening bracket (`(`, `{`, `[`), we push it onto the stack. When a closing bracket arrives, it acts as a claim ticket: it looks at the top of the stack and demands its corresponding open bracket partner. By storing bracket pairs in a hash map where closing brackets are keys (`{')': '(', '}': '{', ']': '['}`), we can validate each closing bracket in $O(1)$ time:
- If the stack is empty when a closer arrives, a bracket closed without ever opening, so the string is invalid.
- If the top element does not match the closer's required partner, the nesting order is violated, so the string is invalid.
- If the top element matches, we pop it off the stack and continue.

#### Execution Walkthrough

Let us trace `s = "{[]}"`:

| Step | Character | Action | Stack State | Valid So Far? |
| :---: | :---: | :--- | :--- | :---: |
| **1** | `'{'` | Opener: push `'{'` | `['{']` | Yes |
| **2** | `'['` | Opener: push `'['` | `['{', '[']` | Yes |
| **3** | `']'` | Closer: top is `'['` matches `']'`, pop `'['` | `['{']` | Yes |
| **4** | `'}'` | Closer: top is `'{'` matches `'}'`, pop `'{'` | `[]` | Yes |

At the end of iteration, the stack is empty, confirming that every bracket was matched and closed properly.

---

### Step-by-Step Algorithm

1. **Parity Quick Check:** If `len(s) % 2 != 0`, an odd number of brackets can never pair up evenly. Return `False` immediately.
2. **Initialize Lookup Table and Stack:** Create a hash map `bracket_map` mapping each closing bracket to its expected opener: `{')': '(', '}': '{', ']': '['}`. Initialize an empty list `stack = []`.
3. **Iterate Characters:** For each character `char` in `s`:
   - If `char` is in `bracket_map` (it is a closing bracket):
     - Check if `stack` is non-empty. If empty, return `False`.
     - Pop `top = stack.pop()`.
     - If `top != bracket_map[char]`, return `False`.
   - Otherwise, `char` is an opening bracket:
     - Push `char` onto `stack`.
4. **Final Check:** Return `len(stack) == 0`. Any remaining elements represent unclosed opening brackets.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: LIFO Stack" default>

```python
class Solution:
    def isValid(self, s: str) -> bool:
        # Odd-length strings cannot be partitioned into matching pairs
        if len(s) % 2 != 0:
            return False

        bracket_map: dict[str, str] = {
            ')': '(',
            '}': '{',
            ']': '['
        }
        stack: list[str] = []

        for char in s:
            if char in bracket_map:
                # If stack is empty or top does not match expected opener
                if not stack or stack[-1] != bracket_map[char]:
                    return False
                stack.pop()
            else:
                stack.append(char)

        return len(stack) == 0
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: String Replacement">

```python
class Solution:
    def isValid(self, s: str) -> bool:
        if len(s) % 2 != 0:
            return False

        prev_len = -1
        while len(s) != prev_len:
            prev_len = len(s)
            s = s.replace("()", "").replace("{}", "").replace("[]", "")

        return len(s) == 0
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (String Replacement)** | $O(n^2)$ | $O(n)$ | Repeatedly allocates new strings while searching for adjacent pairs. Inefficient for long strings. |
| **Optimal (LIFO Stack)** | $O(n)$ | $O(n)$ | Single scan with $O(1)$ push and pop operations. Requires auxiliary stack memory proportional to depth. |

---

### Common Pitfall: Premature Pop and Lingering Openers

A frequent bug occurs when handling edge cases at both ends of the stack lifecycle. When a closing bracket arrives first (such as `s = "]"`), calling `stack.pop()` without first verifying that the stack is non-empty raises an `IndexError`. Conversely, strings with only opening brackets (such as `s = "((("`) will successfully complete the loop without errors. Forgetting to verify `len(stack) == 0` at the very end would incorrectly return `True` instead of `False`.

---

### Concise Interview Takeaway

Use a LIFO stack paired with a hash map mapping closing brackets to opening brackets. Push openers onto the stack and pop to validate against closers. Filter out odd string lengths in $O(1)$ time up front, and verify that the stack is completely empty at completion to achieve optimal $O(n)$ time and $O(n)$ auxiliary space.
