---
id: 8-letter-combinations-of-a-phone-number
title: "17. Letter Combinations of a Phone Number"
description: "Digit-to-letter keypad mapping expansion via recursive backtracking"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">State Space Tree</span>

> **Problem Statement:** Given a string containing digits from `2` to `9` inclusive, return all possible letter combinations that the number could represent using the traditional telephone keypad mapping. Return the answer in any order.

```text
Input:  digits = "23"
Output: ["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"]
Explanation: Digit '2' maps to "abc" and digit '3' maps to "def". All pairwise combinations are formed.
```

---

### The Intuitive Mental Model

Imagine texting on a vintage mobile phone with a 12-key numeric keypad:
- Pressing button `'2'` gives access to letters `'a'`, `'b'`, `'c'`.
- Pressing button `'3'` gives access to letters `'d'`, `'e'`, `'f'`.

If the user enters `"23"`, you must explore every combination formed by picking one letter from the first button followed by one letter from the second button:
- Choose `'a'`, then pick from `('d', 'e', 'f')`: `"ad"`, `"ae"`, `"af"`.
- Choose `'b'`, then pick from `('d', 'e', 'f')`: `"bd"`, `"be"`, `"bf"`.
- Choose `'c'`, then pick from `('d', 'e', 'f')`: `"cd"`, `"ce"`, `"cf"`.

The depth of our decision tree corresponds directly to the length of `digits`. Every leaf node at depth `len(digits)` represents one complete, valid word combination.

#### Brute Force: Iterative Cartesian Product
Start with a list containing `[""]`. For each digit in `digits`, create a new list by appending each mapped letter to all current string prefixes. While simple, creating brand-new intermediate string lists at each step consumes extra heap memory.

#### Optimal Approach: Depth-First Search Backtracking
Maintain a single mutable character list `path` and advance through `digits` index by index. At each depth, iterate over the mapped characters for `digits[index]`, append the character to `path`, recurse to `index + 1`, and pop upon return. When `index == len(digits)`, join `path` into a string and store it in `result`. This limits auxiliary space strictly to $O(n)$ for the recursion stack.

#### Execution Walkthrough

Let us trace `digits = "23"`:

| Step | Digit Index | Keypad Letters | Candidate Chosen | Path State (`path`) | Action Taken | Result Collected |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` (`'2'`) | `"abc"` | `'a'` | `['a']` | Recurse to `index = 1` | `[]` |
| **2** | `1` (`'3'`) | `"def"` | `'d'` | `['a', 'd']` | Recurse to `index = 2` | `[]` |
| **3** | `2` | - | - | `['a', 'd']` | Base case: collect `"ad"` | `["ad"]` |
| **4** | `1` (`'3'`) | `"def"` | `'e'` | `['a', 'e']` | Recurse to `index = 2` | `["ad"]` |
| **5** | `2` | - | - | `['a', 'e']` | Base case: collect `"ae"` | `["ad", "ae"]` |
| **6** | `1` (`'3'`) | `"def"` | `'f'` | `['a', 'f']` | Recurse to `index = 2` | `["ad", "ae"]` |
| **7** | `2` | - | - | `['a', 'f']` | Base case: collect `"af"` | `["ad", "ae", "af"]` |
| **8** | `0` (`'2'`) | `"abc"` | `'b'` | `['b']` | Recurse to `index = 1` | `["ad", "ae", "af"]` |

---

### Step-by-Step Algorithm

1. **Handle Empty Input:** If `not digits`, return `[]` immediately.
2. **Define Keypad Map:** Map each digit character `'2'` through `'9'` to its corresponding string of letters in a dictionary `keyboard`.
3. **Initialize Containers:** Create `result = []` and `path = []`.
4. **Define Backtrack Helper:** Define `backtrack(index)` where `index` is the current position in `digits`.
5. **Check Base Case:** If `index == len(digits)`, append `"".join(path)` to `result` and return.
6. **Iterate Mapped Letters:** Look up `keyboard[digits[index]]`. For each `letter`:
   - Append `letter` to `path`.
   - Recurse: `backtrack(index + 1)`.
   - Backtrack: pop from `path`.
7. **Trigger and Return:** Call `backtrack(0)` and return `result`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Recursive Backtracking" default>

```python
class Solution:
    def letterCombinations(self, digits: str) -> list[str]:
        if not digits:
            return []

        keyboard = {
            "2": "abc",
            "3": "def",
            "4": "ghi",
            "5": "jkl",
            "6": "mno",
            "7": "pqrs",
            "8": "tuv",
            "9": "wxyz",
        }

        result: list[str] = []
        path: list[str] = []

        def backtrack(index: int) -> None:
            # Reached full word length
            if index == len(digits):
                result.append("".join(path))
                return

            # Explore all candidate letters mapped to current digit
            for letter in keyboard[digits[index]]:
                path.append(letter)
                backtrack(index + 1)
                path.pop()  # Backtrack

        backtrack(0)
        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Iterative BFS Expansion">

```python
class Solution:
    def letterCombinations(self, digits: str) -> list[str]:
        if not digits:
            return []

        keyboard = {
            "2": "abc",
            "3": "def",
            "4": "ghi",
            "5": "jkl",
            "6": "mno",
            "7": "pqrs",
            "8": "tuv",
            "9": "wxyz",
        }

        result: list[str] = [""]
        for digit in digits:
            result = [
                prefix + char
                for prefix in result
                for char in keyboard[digit]
            ]

        return result
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Iterative BFS Expansion** | $O(4^n \cdot n)$ | $O(4^n \cdot n)$ | Expands strings iteratively level-by-level. Allocates new intermediate lists for every digit. |
| **Recursive Backtracking** | $O(4^n \cdot n)$ | $O(n)$ | Reuses a single mutable list buffer across calls. Uses minimal $O(n)$ auxiliary recursion memory. |

*(Where $n$ is the number of digits. Digits 7 and 9 have 4 corresponding letters, creating a maximum branching factor of 4. Building each string of length $n$ at the leaves takes $O(n)$ time. The output stores up to $4^n$ strings.)*

---

### Common Pitfall: Handling the Empty String Edge Case

When `digits = ""`, returning `[""]` instead of `[]` is a frequent bug. An empty string contains zero digits and represents zero telephone button presses, so it must return an empty list `[]`. Always handle `if not digits: return []` as a guard condition before initializing your search.

---

### Concise Interview Takeaway

For **Letter Combinations of a Phone Number**, map digits to keypad character strings and traverse depth-first. At each digit index, iterate through its assigned letters, append to a shared path buffer, recurse to `index + 1`, and pop during backtrack. This bounds auxiliary memory strictly to the recursion stack depth of $O(n)$.
