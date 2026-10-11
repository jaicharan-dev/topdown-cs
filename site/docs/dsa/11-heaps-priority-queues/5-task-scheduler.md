---
id: 5-task-scheduler
title: "621. Task Scheduler"
description: "Greedy max-heap cooldown simulation vs idle slot frame math"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Greedy / Max-Heap Simulation</span>

> **Problem Statement:** Given a character array `tasks` representing CPU tasks and a non-negative integer cooldown interval `n`, return the minimum number of CPU time units required to finish all tasks. Identical tasks must be separated by at least `n` units of time (filled by executing other tasks or staying idle).

```text
Input:  tasks = ["A", "A", "A", "B", "B", "B"], n = 2
Output: 8
Explanation: A possible sequence is A -> B -> idle -> A -> B -> idle -> A -> B.
This requires 8 intervals of CPU time.
```

---

### The Intuitive Mental Model

The bottleneck of CPU scheduling is always dictated by the most frequent task. If you have 10 instances of task `'A'` and only 1 instance of task `'B'`, you must prioritize scheduling `'A'` immediately. If you delay `'A'`, you burn through alternative tasks early, leaving an unavoidable sequence of idle gaps at the end.

Two complementary approaches solve this:

```
tasks = ["A", "A", "A", "B", "B", "B"], n = 2
max_freq = 3, num_max_freq = 2 ('A' and 'B')

Frame 1:  [ A | B | idle ]    (size n + 1 = 3)
Frame 2:  [ A | B | idle ]    (size n + 1 = 3)
Final:    [ A | B ]           (num_max_freq = 2)

Total Time = (max_freq - 1) * (n + 1) + num_max_freq
           = (3 - 1) * 3 + 2 = 8
```

#### Brute Force: Max-Heap Simulation with Cooldown Queue

A Max-Heap stores tasks currently available to execute, ordered by remaining frequency. A waiting queue tracks tasks cooling down, storing `[remaining_count, time_available]`.

At each clock cycle:
1. Pop the most frequent task from the heap, decrement its count, and if remaining instances exist, enqueue it with `ready_time = current_time + n`.
2. If the task at the head of the queue finishes cooling down, release it back into the heap.
3. If no task is ready, the CPU sits idle.

While intuitive, simulation requires ticking time cycle by cycle.

#### Optimal Approach: Idle Slot Frame Math

Visualize the schedule as structured chunks determined by the most frequent task:
- Let `max_freq` be the highest occurrence count among all tasks.
- There are `max_freq - 1` complete frames between the first and last execution of that task.
- Each frame has length `n + 1` (1 unit for the task itself plus `n` cooling slots).
- The final group executes all tasks that share the maximum frequency (`num_max_freq`).

If there are so many distinct tasks that all idle slots are filled without leftover cooling gaps, the CPU runs continuously with zero idle cycles. In that scenario, total time is simply `len(tasks)`.

Therefore, the formula is:

$$\text{Minimum Time} = \max(\text{len}(tasks), (\text{max\_freq} - 1) \cdot (n + 1) + \text{num\_max\_freq})$$

#### Execution Walkthrough

Let `tasks = ["A", "A", "A", "B", "B", "B"]` with cooldown $n = 2$:

| Time Slot | Scheduled Action | Remaining Counts | Cooldown Queue State (`(task, ready_time)`) | Available in Heap |
| :---: | :---: | :--- | :--- | :--- |
| **1** | Execute `'A'` | `{'A': 2, 'B': 3}` | `[('A', 4)]` | `['B']` |
| **2** | Execute `'B'` | `{'A': 2, 'B': 2}` | `[('A', 4), ('B', 5)]` | `[]` |
| **3** | CPU Idle | `{'A': 2, 'B': 2}` | `[('A', 4), ('B', 5)]` | `[]` |
| **4** | Execute `'A'` | `{'A': 1, 'B': 2}` | `[('B', 5), ('A', 7)]` | `[]` |
| **5** | Execute `'B'` | `{'A': 1, 'B': 1}` | `[('A', 7), ('B', 8)]` | `[]` |
| **6** | CPU Idle | `{'A': 1, 'B': 1}` | `[('A', 7), ('B', 8)]` | `[]` |
| **7** | Execute `'A'` | `{'A': 0, 'B': 1}` | `[('B', 8)]` | `[]` |
| **8** | Execute `'B'` | `{'A': 0, 'B': 0}` | `[]` | `[]` |

---

### Step-by-Step Algorithm

1. **Count Frequencies:** Count occurrences of each task using `Counter(tasks)`.
2. **Find Maximum Frequency:** Compute `max_freq = max(counts.values())`.
3. **Count Maximum Frequency Ties:** Determine how many tasks appear with `max_freq`: `num_max_freq = sum(1 for c in counts.values() if c == max_freq)`.
4. **Calculate Minimum Intervals:** Compute `min_intervals = (max_freq - 1) * (n + 1) + num_max_freq`.
5. **Return Result:** Return `max(len(tasks), min_intervals)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Idle Slot Math" default>

```python
from collections import Counter


class Solution:
    def leastInterval(self, tasks: list[str], n: int) -> int:
        counts = Counter(tasks)
        max_freq = max(counts.values())
        num_max_freq = sum(1 for count in counts.values() if count == max_freq)

        # Total slots dictated by the most frequent tasks
        min_intervals = (max_freq - 1) * (n + 1) + num_max_freq

        # If there are more tasks than empty slots, no idle time is needed
        return max(len(tasks), min_intervals)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Max-Heap Simulation">

```python
from collections import Counter, deque
import heapq


class Solution:
    def leastInterval(self, tasks: list[str], n: int) -> int:
        counts = Counter(tasks)
        # Max-heap storing negated frequencies
        max_heap = [-cnt for cnt in counts.values()]
        heapq.heapify(max_heap)

        time = 0
        cooldown_queue: deque[tuple[int, int]] = deque()  # (remaining_count, available_time)

        while max_heap or cooldown_queue:
            time += 1

            if max_heap:
                cnt = 1 + heapq.heappop(max_heap)  # Increment negative count towards 0
                if cnt != 0:
                    cooldown_queue.append((cnt, time + n))

            if cooldown_queue and cooldown_queue[0][1] == time:
                heapq.heappush(max_heap, cooldown_queue.popleft()[0])

        return time
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Max-Heap Simulation** | $O(N \cdot n)$ | $O(1)$ | Simulates execution cycle by cycle. Handles dynamic online task queues, but executes loop cycles for every single clock tick. |
| **Idle Slot Math** | $O(N)$ | $O(1)$ | Counts frequencies and evaluates the closed-form geometry equation in strict $O(N)$ time and constant memory. |

---

### Common Pitfall: Overlooking the Case Where len(tasks) Exceeds Calculated Slots

When the task set contains many varied tasks with low frequencies, other tasks completely fill all cooling gaps between the most frequent tasks without needing any idle cycles. In that scenario, `(max_freq - 1) * (n + 1) + num_max_freq` can evaluate to a value smaller than `len(tasks)`. Omitting `max(len(tasks), min_intervals)` leads to undercounting the true minimum time.

---

### Concise Interview Takeaway

The most frequent tasks dictate schedule geometry. Frame boundaries require `(max_freq - 1) * (n + 1) + num_max_freq` slots. Taking the maximum of this formula and `len(tasks)` guarantees the correct answer in $O(N)$ time and $O(1)$ space.
