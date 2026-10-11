---
id: 9-longest-valid-parentheses
title: "32. Longest Valid Parentheses"
description: "Index stack boundary anchors or two-pass counter scan"
sidebar_position: 9
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Index Stack</span>

> **Problem Statement:** Given a string containing just the characters `'('` and `')'`, return the length of the longest valid (well-formed) parentheses substring.

```text
Input:  s = ")()())"
Output: 4
Explanation: The longest valid parentheses substring is "()()".
```

---

### The Intuitive Mental Model

Parentheses validation typically pushes bracket characters onto a stack. However, finding the length of the longest valid contiguous substring requires computing distances rather than just validating balance. Storing indices on the stack provides direct access to boundaries.

#### Brute Force: Substring Validation
A brute force approach enumerates every possible even-length substring and validates it using a standard stack. Generating all substrings takes $O(n^2)$ time, and verifying each substring takes $O(n)$ time, leading to an impractical $O(n^3)$ overall runtime.

#### Optimal Approach: Index Boundary Stack
Think of the stack as holding boundary "walls" that delimit valid segments:
- Before inspecting any characters, seed the stack with index `-1`. This represents the virtual baseline wall immediately before index `0`.
- When encountering an opening bracket `'('`, push its index onto the stack. It represents a potential opener or an unmatched boundary.
- When encountering a closing bracket `')'`, pop the top index off the stack to match the pair.
  - If the stack is now empty, the chain was broken by an unmatched `')'`. This `')'` becomes the new boundary wall, so push its index `i` onto the stack as the new anchor.
  - If the stack remains non-empty, the top of the stack `stack[-1]` is the index of the last unmatched boundary. The length of the valid substring ending at index `i` is simply $i - \text{stack}[-1]$. We update `max_len = max(max_len, i - stack[-1])`.

#### Execution Walkthrough

Let us trace `s = ")()())"`:

| Step | Index `i` | Char | Action Taken | Stack State | Current Length | `max_len` |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| **0** | - | - | Initial seed | `[-1]` | - | `0` |
| **1** | `0` | `')'` | Pop `-1`. Stack empty: push `0` as new wall | `[0]` | - | `0` |
| **2** | `1` | `'('` | Opener: push `1` | `[0, 1]` | - | `0` |
| **3** | `2` | `')'` | Closer: pop `1`. Stack top is `0`. Len = $2 - 0 = 2$ | `[0]` | `2` | `2` |
| **4** | `3` | `'('` | Opener: push `3` | `[0, 3]` | - | `2` |
| **5** | `4` | `')'` | Closer: pop `3`. Stack top is `0`. Len = $4 - 0 = 4$ | `[0]` | `4` | `4` |
| **6** | `5` | `')'` | Closer: pop `0`. Stack empty: push `5` as new wall | `[5]` | - | `4` |

Final maximum length returned: `4`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create a list `stack = [-1]` representing the initial boundary wall, and set `max_len = 0`.
2. **Iterate Characters:** Traverse each index `i` and character `ch` across `enumerate(s)`:
   - If `ch == '('`:
     - Push `i` onto `stack`.
   - If `ch == ')'`:
     - Pop the top index from `stack`.
     - If `not stack`:
       - The popped element was the boundary wall, meaning this `')'` had no matching opener. Push `i` onto `stack` to serve as the new anchor wall.
     - Else:
       - Update `max_len = max(max_len, i - stack[-1])`.
3. **Return Maximum Length:** Return `max_len`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Index Boundary Stack" default>

```python
class Solution:
    def longestValidParentheses(self, s: str) -> int:
        # Stack stores indices. Seed with -1 as the initial boundary anchor.
        stack: list[int] = [-1]
        max_len = 0

        for i, ch in enumerate(s):
            if ch == "(":
                stack.append(i)
            else:
                stack.pop()
                if not stack:
                    # No matching opener existed; this ')' becomes the new anchor
                    stack.append(i)
                else:
                    max_len = max(max_len, i - stack[-1])

        return max_len
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Two-Pass Counter (O(1) Space)">

```python
class Solution:
    def longestValidParentheses(self, s: str) -> int:
        max_len = 0

        # Pass 1: Left to right
        left = right = 0
        for ch in s:
            if ch == "(":
                left += 1
            else:
                right += 1
            if left == right:
                max_len = max(max_len, 2 * right)
            elif right > left:
                left = right = 0

        # Pass 2: Right to left
        left = right = 0
        for ch in reversed(s):
            if ch == "(":
                left += 1
            else:
                right += 1
            if left == right:
                max_len = max(max_len, 2 * left)
            elif left > right:
                left = right = 0

        return max_len
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Substring Check)** | $O(n^3)$ | $O(n)$ | Tests all even substrings for validity. Infeasible for large inputs. |
| **Optimal (Index Boundary Stack)** | $O(n)$ | $O(n)$ | Single pass measuring distance from last unmatched boundary index on the stack. |
| **Two-Pass Counter Scan** | $O(n)$ | $O(1)$ | Scans forward and backward counting balances, eliminating auxiliary stack memory. |

---

### Common Pitfall: Missing Initial Anchor and Asymmetric Openers

Two pitfalls frequently appear in this problem:
1. **Omitting the `-1` anchor:** If the stack is not initialized with `-1`, a valid string starting at index `0` like `"()"` pops its only opener at index `1`, leaving an empty stack. Without an anchor at `-1`, there is no reference index to compute $1 - (-1) = 2$.
2. **One-way counting trap:** In the $O(1)$ space counter approach, scanning only left-to-right fails on cases like `"(()"`. Here, `left` is `2` and `right` is `1`, so `left == right` is never satisfied and the count resets never trigger. A symmetrical right-to-left reverse pass is essential to resolve unbalanced openers.

---

### Concise Interview Takeaway

Store indices on a stack initialized with `-1` as the boundary anchor. When encountering `')'`, pop the top index: if the stack becomes empty, record the current index as the new anchor; otherwise, compute the valid length as `i - stack[-1]`. This achieves optimal $O(n)$ time and $O(n)$ space, with an optional two-pass counter variation achieving $O(1)$ auxiliary memory.
