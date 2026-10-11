---
id: 6-decode-string
title: "394. Decode String"
description: "Stack-based nested context switching for bracketed string expansion"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Nested Context Stack</span>

> **Problem Statement:** Given an encoded string `s`, return its decoded string. The encoding rule is `k[encoded_string]`, where the `encoded_string` inside the square brackets is being repeated exactly `k` times. You may assume that the input string is always valid with no extra spaces, square brackets are well-formed, and digits are only for repeat numbers `k`.

```text
Input:  s = "3[a2[c]]"
Output: "accaccacc"
Explanation: "2[c]" becomes "cc". "a" + "cc" is "acc". "3[acc]" becomes "accaccacc".
```

---

### The Intuitive Mental Model

Bracketed string expansion involves arbitrary nesting depths. In an expression like `"3[a2[c]]"`, the outer multiplier `3` cannot expand until the inner segment `"2[c]"` resolves into `"cc"`, which then prepends `"a"` to form `"acc"`. 

#### Brute Force: Recursive Substring Search
A recursive approach searches for matching brackets: whenever an opening bracket `[` is found, locate its corresponding closing bracket `]`, recursively call the decoding function on the enclosed substring, repeat the returned result `k` times, and concatenate it with the outer string. While conceptually clean, scanning repeatedly for matching bracket indices and slicing substrings repeatedly creates unnecessary string allocations and recursive call overhead.

#### Optimal Approach: Stack Context Switching
Instead of repeatedly scanning for matching brackets, we can process the string in a single linear pass using a LIFO stack to remember parent contexts:
- Maintain two active accumulators: `curr_str` (the string being built in the current scope) and `curr_num` (the upcoming repeat multiplier).
- When a digit arrives, accumulate it: `curr_num = curr_num * 10 + int(ch)` to support multi-digit multipliers like `12[ab]`.
- When an opening bracket `[` is encountered, save the current context `(curr_str, curr_num)` onto the stack and reset both accumulators to start fresh inside the new inner scope.
- When regular characters arrive, append them directly to `curr_str`.
- When a closing bracket `]` arrives, pop the parent context `(prev_str, repeat_count)` off the stack. Expand the inner string and attach it to the parent string: `curr_str = prev_str + curr_str * repeat_count`.

#### Execution Walkthrough

Let us trace `s = "3[a2[c]]"`:

| Step | Char | Action Taken | Stack State | `curr_str` | `curr_num` |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **1** | `'3'` | Digit: accumulate | `[]` | `""` | `3` |
| **2** | `'['` | Push `("", 3)` to stack, reset | `[("", 3)]` | `""` | `0` |
| **3** | `'a'` | Append char | `[("", 3)]` | `"a"` | `0` |
| **4** | `'2'` | Digit: accumulate | `[("", 3)]` | `"a"` | `2` |
| **5** | `'['` | Push `("a", 2)` to stack, reset | `[("", 3), ("a", 2)]` | `""` | `0` |
| **6** | `'c'` | Append char | `[("", 3), ("a", 2)]` | `"c"` | `0` |
| **7** | `']'` | Pop `("a", 2)`: `"a" + "c" * 2 = "acc"` | `[("", 3)]` | `"acc"` | `0` |
| **8** | `']'` | Pop `("", 3)`: `"" + "acc" * 3 = "accaccacc"` | `[]` | `"accaccacc"` | `0` |

Final decoded result: `"accaccacc"`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create an empty list `stack = []` to store `(prev_str, repeat_count)` tuples. Initialize `curr_str = ""` and `curr_num = 0`.
2. **Iterate Characters:** Traverse each character `ch` in `s`:
   - If `ch.isdigit()`: update `curr_num = curr_num * 10 + int(ch)`.
   - If `ch == '['`:
     - Push `(curr_str, curr_num)` onto `stack`.
     - Reset `curr_str = ""` and `curr_num = 0`.
   - If `ch == ']'`:
     - Pop `prev_str, repeat_count = stack.pop()`.
     - Update `curr_str = prev_str + curr_str * repeat_count`.
   - Otherwise (`ch` is an alphabetical character):
     - Append `ch` to `curr_str`.
3. **Return Result:** Return `curr_str`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Stack Context Switching" default>

```python
class Solution:
    def decodeString(self, s: str) -> str:
        stack: list[tuple[str, int]] = []
        curr_str = ""
        curr_num = 0

        for ch in s:
            if ch.isdigit():
                # Accumulate multi-digit numbers (e.g., '100[leetcode]')
                curr_num = curr_num * 10 + int(ch)
            elif ch == '[':
                # Save parent context onto stack and enter new inner scope
                stack.append((curr_str, curr_num))
                curr_str = ""
                curr_num = 0
            elif ch == ']':
                # Exit scope: pop parent context, expand, and stitch
                prev_str, repeat_count = stack.pop()
                curr_str = prev_str + curr_str * repeat_count
            else:
                curr_str += ch

        return curr_str
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Recursive Parsing">

```python
class Solution:
    def decodeString(self, s: str) -> str:
        def decode(index: int) -> tuple[str, int]:
            res = ""
            k = 0
            
            while index < len(s):
                ch = s[index]
                if ch.isdigit():
                    k = k * 10 + int(ch)
                    index += 1
                elif ch == '[':
                    # Recurse into nested scope
                    sub_str, index = decode(index + 1)
                    res += sub_str * k
                    k = 0
                elif ch == ']':
                    # Return accumulated string and advanced index
                    return res, index + 1
                else:
                    res += ch
                    index += 1
                    
            return res, index

        return decode(0)[0]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Recursive Parsing** | $O(L)$ | $O(d + L)$ | Uses the call stack to handle nesting. Extra overhead from recursion depth $d$, where $L$ is the length of decoded output. |
| **Optimal (Stack Context Switching)** | $O(L)$ | $O(d + L)$ | Processes string linearly in a single pass using an explicit stack for parent state, avoiding call stack overhead. |

---

### Common Pitfall: Multi-Digit Multipliers and Concatenation Order

Two subtle bugs frequently occur:
1. **Multi-digit numbers:** Assuming that repeat counts are always single digits (`curr_num = int(ch)`) fails on inputs like `"100[leetcode]"`. Multiplying the accumulated number by 10 (`curr_num = curr_num * 10 + int(ch)`) properly handles arbitrary digit lengths.
2. **Concatenation order:** When expanding on `]`, the parent string must appear before the repeated inner string (`prev_str + curr_str * repeat_count`), not the other way around.

---

### Concise Interview Takeaway

Manage nested scopes with a LIFO stack of `(prev_string, repeat_count)` tuples. When seeing `[`, save current state and reset; when seeing `]`, pop parent context and compute `prev_str + curr_str * count`. Accumulate digits with `curr_num * 10 + int(ch)` to evaluate the decoded string in $O(L)$ time where $L$ is the final string length.
