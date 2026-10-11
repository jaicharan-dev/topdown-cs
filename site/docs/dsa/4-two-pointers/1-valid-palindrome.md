---
id: 1-valid-palindrome
title: "125. Valid Palindrome"
description: "Inward-converging two pointers with in-place punctuation skipping"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Opposite Ends</span>

> **Problem Statement:** A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers. Given a string `s`, return `true` if it is a palindrome, or `false` otherwise.

```text
Input:  s = "A man, a plan, a canal: Panama"
Output: true
Explanation: "amanaplanacanalpanama" is a palindrome.
```

---

### The Intuitive Mental Model

A palindrome is identical read forwards or backwards. If we ignore case and punctuation, every character on the left half must mirror its counterpart on the right half.

#### Brute Force: Filter and Reverse
The most direct approach filters out invalid characters first:
- Traverse `s` and build a clean string containing only lowercase alphanumeric characters.
- Check if this cleaned string equals its reversed version.

While simple and $O(n)$ in time, building a new string or list allocates $O(n)$ auxiliary memory on the heap. When memory is constrained or the string is huge, interviewers will ask for an in-place $O(1)$ space solution.

#### Optimal Approach: Two Pointers from Opposite Ends
Instead of allocating a filtered string, we can validate symmetry directly on the input string using two pointers:
- Place `left` at index `0` and `right` at index `len(s) - 1`.
- Slide `left` forward until it rests on an alphanumeric character.
- Slide `right` backward until it rests on an alphanumeric character.
- Compare `s[left].lower()` with `s[right].lower()`. If they differ, the phrase cannot be a palindrome, so return `False`.
- If they match, advance both pointers inward (`left += 1`, `right -= 1`) and repeat.

Because we only advance pointers and never duplicate the string, auxiliary memory remains strictly $O(1)$.

#### Execution Walkthrough

Let us trace `s = "A man, a plan, a canal: Panama"`:

| Step | `left` Index & Char | `right` Index & Char | Skip Punctuation Action | Validated Characters | Match? | Pointer Movement |
| :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| **1** | `0` (`'A'`) | `29` (`'a'`) | None needed | `'a' == 'a'` | Yes | `left -> 1`, `right -> 28` |
| **2** | `1` (`' '`) | `28` (`'m'`) | Skip `' '` at index 1 -> index 2 (`'m'`) | `'m' == 'm'` | Yes | `left -> 3`, `right -> 27` |
| **3** | `3` (`'a'`) | `27` (`'a'`) | None needed | `'a' == 'a'` | Yes | `left -> 4`, `right -> 26` |
| **4** | `4` (`'n'`) | `26` (`'n'`) | None needed | `'n' == 'n'` | Yes | `left -> 5`, `right -> 25` |
| **...** | ... | ... | Punctuation skipped on the fly | Characters match symmetrically | Yes | Inward convergence |
| **End** | Meets at center | Meets at center | All valid characters processed | Complete symmetry | **True** | Return `True` |

---

### Step-by-Step Algorithm

1. **Initialize Pointers:** Set `left = 0` and `right = len(s) - 1`.
2. **Loop While Pointers Do Not Cross:** Run a loop condition `while left < right`.
3. **Skip Left Non-Alphanumeric:** Increment `left` while `left < right and not s[left].isalnum()`.
4. **Skip Right Non-Alphanumeric:** Decrement `right` while `left < right and not s[right].isalnum()`.
5. **Compare Characters:** Compare `s[left].lower()` to `s[right].lower()`. If they do not match, return `False`.
6. **Advance Both Pointers:** Increment `left += 1` and decrement `right -= 1`.
7. **Return Success:** If pointers meet or cross without any mismatch, return `True`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two Pointers In-Place" default>

```python
class Solution:
    def isPalindrome(self, s: str) -> bool:
        left = 0
        right = len(s) - 1

        while left < right:
            # Skip non-alphanumeric characters from the left
            while left < right and not s[left].isalnum():
                left += 1

            # Skip non-alphanumeric characters from the right
            while left < right and not s[right].isalnum():
                right -= 1

            # Compare characters case-insensitively
            if s[left].lower() != s[right].lower():
                return False

            left += 1
            right -= 1

        return True
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Filter and Reverse">

```python
class Solution:
    def isPalindrome(self, s: str) -> bool:
        # Build filtered list of lowercase alphanumeric characters
        filtered = [ch.lower() for ch in s if ch.isalnum()]
        
        # Check if the list matches its reverse
        return filtered == filtered[::-1]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Filter and Reverse** | $O(n)$ | $O(n)$ | Creates a new list or string of characters, using linear auxiliary memory. |
| **Two Pointers In-Place** | $O(n)$ | $O(1)$ | Inspects each character at most once using two pointer indices without extra memory. |

---

### Common Pitfall: Out-of-Bounds Inner While Loops

When skipping non-alphanumeric characters with inner `while` loops, you must guard the boundary with `left < right` first: `while left < right and not s[left].isalnum()`. If the input string consists entirely of spaces or punctuation like `",. "`, omitting `left < right` causes `left` to increment past the end of the string, raising an `IndexError`. Python short-circuits Boolean expressions from left to right, ensuring `s[left]` is never evaluated if `left < right` is false.

---

### Concise Interview Takeaway

For **Valid Palindrome**, converge two pointers from opposite ends inward. Skip non-alphanumeric characters on the fly and compare matching characters case-insensitively. This achieves optimal $O(n)$ time while keeping auxiliary space at $O(1)$, avoiding the unnecessary string allocations of filter-and-reverse.
