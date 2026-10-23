---
id: 1-subsets
title: "78. Subsets"
description: "Every element faces one question: are you in or out?"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Decision Tree DFS</span>

> **Problem Statement:** Given an array of distinct numbers, return every possible subset, including the empty one and the whole array. Any order is fine.

```text
Input:  nums = [1, 2, 3]
Output: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
```

---

### Picture it

Go through the elements one at a time and ask each the same question: **are you in this subset or not?**

Two answers per element, and the answers are independent, so three elements give `2 × 2 × 2 = 8` subsets. That is why the output has eight entries, and why the count is always two to the power of the array length.

Drawing those decisions out gives a tree. Each level is one element, each branch is in or out, and each leaf is a finished subset.

```text
                 []
          1 in /    \ 1 out
            [1]      []
        2/    \2    /    \
     [1,2]  [1]  [2]     []
```

Backtracking is simply walking that tree: take a branch, explore everything below it, then undo the choice and take the other branch.

---

### How to think about it

Carry a partial subset as you walk, and at each step decide about one element.

**Choose, explore, un-choose** is the rhythm, and it is the core of every problem in this block:

1. Add the current element to the partial subset.
2. Recurse to decide the remaining elements.
3. Remove it again, so the next branch starts from a clean state.
4. Recurse again, this time without it.

That third step is the backtracking. Without it the partial subset keeps everything ever added and all the later answers are wrong.

Record a **copy** of the partial subset when it is complete. Appending the list itself stores a reference to something that keeps changing, so every entry in the answer would end up identical and empty.

An alternative framing starts the recursion at an index and loops over the remaining elements, recording at every node rather than only at the leaves. It produces the same set and is the version that generalises most easily to the combination problems later in this block.

---

### Walking through the example

Take `nums = [1, 2, 3]`.

1. **Include 1.** Then **include 2**. Then include `3` to get `[1, 2, 3]`, and exclude it to get `[1, 2]`.
2. **Back up**, exclude `2`. Then include `3` for `[1, 3]`, exclude it for `[1]`.
3. **Back up to the start**, exclude `1`. Then include `2` and branch on `3` for `[2, 3]` and `[2]`.
4. **Exclude 2 as well.** Branch on `3` for `[3]` and `[]`.

Eight leaves, eight subsets.

---

### The code

```python
class Solution:
    def subsets(self, nums: list[int]) -> list[list[int]]:
        out = []
        partial = []

        def decide(i: int) -> None:
            if i == len(nums):
                out.append(partial[:])   # a copy: partial keeps changing
                return

            # branch one: this element is in
            partial.append(nums[i])
            decide(i + 1)

            # undo, then branch two: this element is out
            partial.pop()
            decide(i + 1)

        decide(0)
        return out
```

---

### Time and space complexity

#### Time: $O(n \cdot 2^n)$

There are `2^n` subsets, and copying each one into the answer costs up to `n`. No approach can do better, because the output itself is that large.

#### Space: $O(n)$ beyond the answer

The recursion goes `n` levels deep, one per element, and the partial subset holds at most `n` values. The answer list is the output rather than working memory.

---

### Remember this

Every element gets one yes-or-no decision, which makes a binary tree of depth `n` with `2^n` leaves. Walk it with choose, explore, un-choose, and the un-choose is what keeps the partial state honest. Append a copy of the partial subset, never the list itself. $O(n \cdot 2^n)$ time, $O(n)$ extra space.
