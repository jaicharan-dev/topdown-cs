---
id: 2-min-stack
title: "155. Min Stack"
description: "Store the minimum alongside each value, so popping rewinds it for free"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Auxiliary Min Stack</span>

> **Problem Statement:** Build a stack that can push, pop, read its top, and report its smallest value, with every one of those taking constant time.

```text
push(-2), push(0), push(-3)
getMin() -> -3
pop()
top()    -> 0
getMin() -> -2
```

---

### Picture it

Push, pop and top are already constant time on an ordinary stack. The whole problem is `getMin`.

Keeping a single `minimum` variable almost works. Pushing is easy: compare and update. But popping ruins it. If you pop the smallest value, the new smallest is some earlier value you no longer have any record of, and finding it means scanning the entire stack.

So the real question is how to **rewind** the minimum when a value leaves.

The answer is to stop treating the minimum as one fact about the stack, and start treating it as a fact about each entry. When a value is pushed, record the smallest value in the stack *at that moment*, and store the two together. Pop removes both, and the entry underneath already carries the correct answer for the smaller stack.

---

### How to think about it

Every entry is a pair: the value itself, and the minimum of everything from the bottom up to and including it.

**Push:** the new minimum is the smaller of the incoming value and the minimum currently on top. On an empty stack it is just the value.

**Pop:** remove the pair. Nothing else to do, because the entry now on top already knows the minimum for the stack as it stands.

**Top:** the value half of the top pair.

**getMin:** the minimum half of the top pair.

No scanning, no recomputation. The history of minimums is carried along with the history of values, and the two unwind together.

A common variant keeps a second, separate stack for the minimums, pushing only when a new value ties or beats the current minimum. It saves memory when the data has few new minimums, but it needs care with duplicate minimum values. Storing pairs is simpler and harder to get wrong, which is why it is the version to write under pressure.

---

### Walking through the example

Push `-2`, then `0`, then `-3`.

1. **Push `-2`** onto an empty stack. The pair is `(-2, -2)`.
2. **Push `0`.** The minimum on top is `-2`, which is smaller than `0`, so the pair is `(0, -2)`.
3. **Push `-3`.** The minimum on top is `-2`, but `-3` beats it, so the pair is `(-3, -3)`.
4. **getMin** reads the minimum half of the top pair: `-3`.
5. **Pop** removes `(-3, -3)`. The top is now `(0, -2)`.
6. **top** reads the value half: `0`.
7. **getMin** reads the minimum half: `-2`. It rewound correctly without anything being recalculated.

---

### The code

```python
class MinStack:
    def __init__(self):
        # each entry is (value, smallest value at or below it)
        self.stack = []

    def push(self, val: int) -> None:
        smallest = val if not self.stack else min(val, self.stack[-1][1])
        self.stack.append((val, smallest))

    def pop(self) -> None:
        self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]

    def getMin(self) -> int:
        return self.stack[-1][1]
```

---

### Time and space complexity

#### Time: $O(1)$ for every operation

Push does one comparison and one append. Pop, top and getMin each touch only the top entry. Nothing walks the stack, which is exactly what the problem demands.

#### Space: $O(n)$

Two numbers per entry instead of one. That is still $O(n)$, since doubling a constant amount per element does not change the growth, but it is a genuine doubling of memory and worth saying out loud if asked.

---

### Remember this

A single minimum variable cannot survive a pop, because the previous minimum is unrecoverable. Store the minimum-so-far next to each value instead, so the history unwinds automatically and every operation stays constant time. $O(1)$ per operation, $O(n)$ space.
