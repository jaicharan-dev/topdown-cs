---
id: 5-task-scheduler
title: "621. Task Scheduler"
description: "The most common task sets the skeleton, and everything else fills its gaps"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy / Max-Heap Simulation</span>

> **Problem Statement:** You are given a list of tasks and a cooldown `n`. Two runs of the same task must be at least `n` time units apart, and the processor can idle. Return the shortest total time to run them all.

```text
Input:  tasks = ["A", "A", "A", "B", "B", "B"], n = 2
Output: 8
```

---

### Picture it

The task that appears most often is the bottleneck, because it is the one most constrained by the cooldown. Lay that task out first and it builds a skeleton:

```text
A _ _ A _ _ A        with cooldown 2, the As need two gaps between them
```

With the most common task appearing `m` times, there are `m - 1` gaps, each `n` slots wide. Everything else then drops into those gaps, and only if the gaps run out does the schedule need to grow.

So the total time is either:

- **The skeleton**, if the gaps are big enough to hold every other task, counting any leftover space as idling, or
- **The number of tasks**, if there is so much other work that the gaps overflow. Once the gaps are full there is never an idle moment, so the answer is simply the count of tasks.

The answer is the larger of those two.

---

### How to think about it

Count how often each task appears, and take `m`, the largest count.

The skeleton has `m - 1` gaps, each of length `n`, plus the `m` runs of the busiest task themselves:

```text
(m - 1) * (n + 1) + (number of tasks tied at the top count)
```

The last term handles ties. If two tasks both appear `m` times, each row of the skeleton ends with both of them, so each row is one slot longer.

Then take the larger of that number and the total number of tasks. The second case covers a schedule packed so densely that no idling is ever needed, where the cooldown stops binding at all.

**Why the larger of the two is always right:** the skeleton is a genuine lower bound, since the busiest task's runs cannot be squeezed closer than the cooldown allows. And the task count is a lower bound too, since every task needs a slot. Whichever is bigger is achievable, because the remaining tasks can always be spread round-robin into the gaps without breaking any cooldown.

**The heap simulation** is the other standard answer: repeatedly take the available task with the highest remaining count, run it, and put it on a cooldown list until it becomes available again. It produces the same number and shows the actual schedule, which is useful if an interviewer asks for the order rather than just the length. It is $O(\text{total time} \cdot \log 26)$, more work for the same result.

---

### Walking through the example

Take `["A", "A", "A", "B", "B", "B"]` with `n = 2`.

1. **Counts:** `A` three times and `B` three times, so `m` is `3` and two tasks are tied at the top.
2. **Skeleton:** `(3 - 1) * (2 + 1) + 2 = 6 + 2 = 8`.
3. **Task count:** `6`.
4. **The larger** is `8`.

The schedule that achieves it is `A B idle A B idle A B`: three rows, the first two of length `n + 1`, and a final row holding the last `A` and `B`.

Now add four `C` tasks. The counts become `A` and `B` at three and `C` at four, so `m` is `4` with one task at the top: the skeleton gives `(4 - 1) * 3 + 1 = 10`, and the task count is `10`, so the answer is `10` and there is no idling.

---

### The code

```python
from collections import Counter

class Solution:
    def leastInterval(self, tasks: list[str], n: int) -> int:
        counts = Counter(tasks)
        busiest = max(counts.values())

        # how many tasks are tied at that top count
        tied = sum(1 for c in counts.values() if c == busiest)

        # the skeleton: gaps between the busiest task's runs, plus its own slots
        skeleton = (busiest - 1) * (n + 1) + tied

        # if there is enough other work, the gaps fill and nothing idles
        return max(skeleton, len(tasks))
```

---

### Time and space complexity

#### Time: $O(n)$

One pass to count the tasks, then a constant amount of arithmetic. The heap simulation would instead cost about the length of the schedule it produces.

#### Space: $O(1)$

The counter holds at most one entry per distinct task, which is bounded by the alphabet rather than by the input size.

---

### Remember this

The most frequent task sets the skeleton, `(m - 1) * (n + 1)`, plus one slot for each task tied at that top count. Compare it with the total number of tasks and take the larger: the skeleton wins when there is idling, the task count wins when the gaps are already full. Name the max-heap simulation as the way to produce the actual order. $O(n)$ time, $O(1)$ space.
