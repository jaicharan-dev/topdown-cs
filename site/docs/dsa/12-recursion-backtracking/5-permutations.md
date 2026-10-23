---
id: 5-permutations
title: "46. Permutations"
description: "Order matters here, so every unused element is a candidate at every position"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Permutations</span>

> **Problem Statement:** Given an array of distinct numbers, return every possible ordering of them.

```text
Input:  nums = [1, 2, 3]
Output: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
```

---

### Picture it

Everything else in this block has been about **combinations**, where order does not matter and the recursion only ever moves forward to stop reorderings appearing twice.

Permutations are the opposite. Here `[1, 2, 3]` and `[2, 1, 3]` are different answers, so moving forward only would be wrong: it would produce just one ordering instead of all of them.

So the rule flips. At each position, any element that has **not already been used** is a candidate, whether it sits before or after the previous choice. The only thing being tracked is what is already in the partial arrangement.

That gives `3` choices for the first slot, `2` for the second and `1` for the last, which is `3 × 2 × 1 = 6` arrangements, matching the output.

---

### How to think about it

Build the arrangement one position at a time.

**When the partial arrangement is as long as the input**, it is complete, so record a copy.

**Otherwise**, loop over every element and skip the ones already used. For each available one: mark it used, add it, recurse, then unmark and remove it.

Tracking "used" is the new ingredient. A set of used values is the clearest way when the values are distinct, as they are here. A parallel array of booleans indexed by position is the version that still works when values repeat.

There is also a swap-based version that avoids the extra tracking entirely: at each position, swap each remaining element into place, recurse, then swap it back. It uses no extra memory beyond the recursion, which is worth naming, but it scrambles the order the answers come out in and is easier to get wrong.

---

### Walking through the example

Take `nums = [1, 2, 3]`.

1. **First slot takes `1`.**
   - **Second slot takes `2`**, since `1` is used. Third slot can only take `3`, giving `[1, 2, 3]`.
   - **Back up. Second slot takes `3`.** Third takes `2`, giving `[1, 3, 2]`.
2. **Back to the start. First slot takes `2`.** Note this reaches back to an element that comes *before* nothing, which combination problems forbade and this one requires.
   - Second takes `1`, third takes `3`: `[2, 1, 3]`.
   - Second takes `3`, third takes `1`: `[2, 3, 1]`.
3. **First slot takes `3`**, producing `[3, 1, 2]` and `[3, 2, 1]` the same way.

Six arrangements.

---

### The code

```python
class Solution:
    def permute(self, nums: list[int]) -> list[list[int]]:
        out = []
        partial = []
        used = set()

        def build() -> None:
            if len(partial) == len(nums):
                out.append(partial[:])
                return

            # every unused element is a candidate, in either direction
            for value in nums:
                if value in used:
                    continue

                used.add(value)
                partial.append(value)

                build()

                partial.pop()
                used.remove(value)

        build()
        return out
```

---

### Time and space complexity

#### Time: $O(n \cdot n!)$

There are `n!` arrangements, and copying each into the answer costs `n`. As with Subsets, the output itself is this large, so nothing can do better.

The factorial is worth a moment of respect: ten elements give about 3.6 million arrangements, and thirteen give over six billion. Any problem whose answer is every permutation is only tractable for small inputs.

#### Space: $O(n)$ beyond the answer

Recursion depth, the partial arrangement and the used set, all bounded by `n`.

---

### Remember this

Order matters, so the forward-only rule from the combination problems is dropped and every unused element is a candidate at every position. Track what is used, and unmark on the way out as part of the un-choose step. $O(n \cdot n!)$ time, which grows fast enough that only small inputs are realistic.
