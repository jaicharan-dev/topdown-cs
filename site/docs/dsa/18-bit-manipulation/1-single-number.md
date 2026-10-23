---
id: 1-single-number
title: "136. Single Number"
description: "XOR cancels a number against its twin, so the loner is what survives"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Bit Manipulation</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">XOR Cancellation</span>

> **Problem Statement:** Every value in the array appears twice except one. Find it, in linear time and constant extra memory.

```text
Input:  nums = [4, 1, 2, 1, 2]
Output: 4
```

---

### Picture it

A set or a count would find the loner easily, and both cost memory the problem forbids. What is needed is an operation that makes pairs **disappear**.

That operation is XOR, written `^`, which compares two numbers bit by bit and keeps a `1` only where the bits differ. Three facts about it do all the work:

```text
x ^ x = 0        a number cancels itself
x ^ 0 = x        zero leaves a number alone
order does not matter
```

Put those together and XOR-ing the whole array collapses it. Every value that appears twice cancels against its twin, whatever the order they appear in, leaving zeros. Those zeros do nothing to the loner, which is therefore what remains.

---

### How to think about it

Start a running total at `0` and XOR every value into it.

The reason order does not matter is worth being able to state: XOR is commutative and associative, so the array can be mentally rearranged to put each pair together. Each pair collapses to `0`, those zeros collapse into each other, and the lone value passes through untouched.

No comparisons, no bookkeeping, one pass.

Worth knowing that this generalises in two directions, which is where follow-ups go. If every value appeared **three** times except one, XOR would not help, since three copies leave one behind; that variant counts the `1`s at each bit position modulo three. And if **two** numbers were single, XOR-ing everything gives the XOR of those two, which can then be split apart using any bit where they differ.

---

### Walking through the example

Take `nums = [4, 1, 2, 1, 2]`, with a running total of `0`.

1. **XOR 4.** The total is `4`.
2. **XOR 1.** The total is `5`.
3. **XOR 2.** The total is `7`.
4. **XOR 1.** The `1` cancels the earlier `1`, so the total is back to `6`.
5. **XOR 2.** The `2` cancels the earlier `2`, so the total is `4`.

The answer is `4`.

Reading it as cancellation rather than arithmetic: the two `1`s cancel each other, the two `2`s cancel each other, and `4` is left.

---

### The code

```python
class Solution:
    def singleNumber(self, nums: list[int]) -> int:
        total = 0

        # pairs cancel, whatever order they appear in
        for value in nums:
            total ^= value

        return total
```

---

### Time and space complexity

#### Time: $O(n)$

One XOR per value, which is a single machine instruction.

#### Space: $O(1)$

One running total. A set or a counter would be $O(n)$, which the problem rules out.

---

### Remember this

XOR cancels a number against itself and leaves anything else alone, so XOR-ing the whole array wipes out every pair and leaves the loner. Order does not matter, which is what lets a single pass work without sorting or grouping. For the three-times variant, count bits modulo three instead; for two loners, split the combined result on a bit where they differ. $O(n)$ time, $O(1)$ space.
