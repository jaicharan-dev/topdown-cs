---
id: 4-group-anagrams
title: "49. Group Anagrams"
description: "Give every word a label that ignores letter order, then bucket by it"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Map</span>

> **Problem Statement:** You are given a list of words `strs`. Put the anagrams together in groups and return those groups in any order. Two words are anagrams when one is a rearrangement of the other, using all the same letters.

```text
Input:  strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
Output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
```

---

### Picture it

Anagrams are the same letters in a different order. `eat`, `tea` and `ate` are three arrangements of one bag of letters: one `a`, one `e`, one `t`.

So give each word a label that throws the order away and keeps only the letters. Any two anagrams will get exactly the same label, and any two words that are not anagrams will get different ones.

Once every word has a label, the grouping does itself. Put each word in the pile named by its label, and the piles are the answer.

---

### How to think about it

Comparing every word against every other word to test for anagram-ness is slow and awkward, and it gets worse as the list grows.

The label is the whole idea, and there are two natural ones:

- **Sort the letters.** `eat`, `tea` and `ate` all sort to `aet`. Simple to write and easy to remember.
- **Count the letters.** Record how many of each letter the word has, and use that count as the label. This avoids sorting, which matters when the words are long.

The sorted label is the one to reach for first, because it is one line and hard to get wrong. Use a dictionary that maps a label to the list of words carrying it. Walk the words once, append each to its list, and return the lists at the end.

A plain dictionary needs you to create the empty list the first time a label appears. `defaultdict(list)` does that for you, which keeps the loop to two lines.

---

### Walking through the example

Take `strs = ["eat", "tea", "tan", "ate", "nat", "bat"]`. The label is the word with its letters sorted.

1. **`eat`** has the label `aet`. No pile yet, so start one: `eat`.
2. **`tea`** has the label `aet`. That pile exists, so join it: `eat`, `tea`.
3. **`tan`** has the label `ant`. Start a new pile: `tan`.
4. **`ate`** has the label `aet`. Join the first pile: `eat`, `tea`, `ate`.
5. **`nat`** has the label `ant`. Join the second pile: `tan`, `nat`.
6. **`bat`** has the label `abt`. Start a third pile: `bat`.

Three piles, which is the answer.

---

### The code

```python
from collections import defaultdict

class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        groups = defaultdict(list)

        for word in strs:
            # same letters give the same label, whatever the order
            label = "".join(sorted(word))
            groups[label].append(word)

        return list(groups.values())
```

---

### Time and space complexity

Two sizes matter here, so give them both names: `n` is how many words there are, and `k` is the length of the longest word.

#### Time: $O(n k \log k)$

Each word is handled once, and the expensive part of handling it is sorting its letters, which costs $k \log k$ for a word of length `k`. Do that `n` times and you get $O(n k \log k)$.

The dictionary work is free by comparison: looking up a label and appending to a list are both constant time.

If the words are long enough for that `log k` to hurt, swap the sorted label for a letter count, which builds the label in $O(k)$ and brings the total to $O(n k)$.

#### Space: $O(n k)$

Every word ends up stored in some pile, and the labels are about the same size as the words again. So the memory grows with the total amount of text handed in, not with anything smaller.

---

### Remember this

Anagrams differ only in order, so build a label that order cannot affect: the sorted letters, or a count of each letter. Bucket the words into a dictionary keyed by that label and return the buckets. $O(n k \log k)$ time with the sorted label, $O(n k)$ space.
