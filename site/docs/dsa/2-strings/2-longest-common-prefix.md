---
id: 2-longest-common-prefix
title: "14. Longest Common Prefix"
description: "Stack the words up and read down the columns until one disagrees"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Strings</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Vertical Scanning</span>

> **Problem Statement:** You are given a list of words `strs`. Return the longest piece of text that every word starts with. If the words share no common start, return an empty string.

```text
Input:  strs = ["flower", "flow", "flight"]
Output: "fl"
```

---

### Picture it

Write the words one under another, lined up at the left:

```text
f l o w e r
f l o w
f l i g h t
```

Now read down the columns instead of along the rows. The first column is `f` three times, so `f` is shared. The second is `l` three times, so `l` is shared too. The third column is `o`, `o`, `i`, which is a disagreement, and the moment one word disagrees the common prefix cannot go any further.

The answer is everything above that break: `fl`.

---

### How to think about it

Reading down the columns is the whole method, and it has one property worth noticing: it stops as early as it possibly can. The instant a column disagrees, you are finished, no matter how long the words are after that point.

Use the first word as the ruler. For each of its characters, check the same position in every other word. Two things can end the scan:

- **A word disagrees** at that position.
- **A word runs out.** A word shorter than the prefix so far caps it, because the answer can never be longer than the shortest word.

Both cases mean the same thing, so they can be the same check, and the answer is the part of the first word you had already cleared.

If the loop finishes without either happening, the first word is itself the common prefix, which is what you get from a list like `["ab", "abc"]` reordered, or from a list where every word is identical.

A different approach is to sort the list and compare only the first and last words, since those two are the most different at the front. It is clever and short, but sorting costs more than the straight scan, so it is not worth it here.

---

### Walking through the example

Take `strs = ["flower", "flow", "flight"]`, using `"flower"` as the ruler.

1. **Position `0`** is `f` in the ruler. `"flow"` has `f`, `"flight"` has `f`. Agreed.
2. **Position `1`** is `l`. Both others have `l`. Agreed.
3. **Position `2`** is `o`. `"flow"` has `o`, but `"flight"` has `i`. That is the break, so return the first two characters: `"fl"`.

Nothing past position `2` is ever looked at, in any of the words.

---

### The code

```python
class Solution:
    def longestCommonPrefix(self, strs: list[str]) -> str:
        if not strs:
            return ""

        ruler = strs[0]

        for i, ch in enumerate(ruler):
            for word in strs[1:]:
                # this word ended, or it disagrees here
                if i == len(word) or word[i] != ch:
                    return ruler[:i]

        return ruler
```

---

### Time and space complexity

#### Time: $O(S)$ in the worst case

Let `S` be the total number of characters across all the words. The worst case is a list where every word is identical, because then nothing ever breaks early and every character of every word gets compared. That is $O(S)$.

In practice it is usually far less, because the scan stops at the first disagreeing column. For `["flower", "flow", "flight"]` it reads nine characters out of sixteen. A list like `["apple", "banana"]` stops after comparing the very first column.

#### Space: $O(1)$

Two loop variables, and a slice of the first word produced only at the moment of returning. Nothing is accumulated as the scan runs.

---

### Remember this

Stack the words and read down the columns, using the first word as the ruler. Stop at the first column where a word disagrees or runs out, and return everything above the break. $O(S)$ time in the worst case where all words match, usually much less, and $O(1)$ space.
