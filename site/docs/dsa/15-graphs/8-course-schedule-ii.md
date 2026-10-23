---
id: 8-course-schedule-ii
title: "210. Course Schedule II"
description: "Same algorithm as the yes-or-no version, except you keep the order you took them in"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Topological Sort / Kahn's</span>

> **Problem Statement:** You have a number of courses and a list of prerequisite pairs, where `[a, b]` means `b` must be taken before `a`. Return an order in which all the courses can be taken, or an empty list if that is impossible.

```text
Input:  numCourses = 4, prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]
Output: [0, 1, 2, 3]
```

---

### Picture it

Course Schedule already took the courses in a workable order. It simply threw that order away and counted them.

So this problem needs one change: **keep the list** instead of the count. The order in which courses come out of the queue is already a valid schedule, because a course is only queued once every prerequisite it has is behind it.

That list is a **topological order**, and producing one is what this family of problems is really about. The yes-or-no version was the same machine with its output discarded.

---

### How to think about it

Build the same two structures: how many prerequisites each course is still waiting on, and which courses each one unlocks. Remember that `[a, b]` means `b` unlocks `a`.

Queue everything with nothing outstanding, then repeatedly take a course, **append it to the order**, and reduce the counts of what it unlocks, queueing anything that reaches zero.

At the end, check the length. If the order holds every course, return it. If it is short, the missing ones form a cycle, so return an empty list as the problem requires. Returning a partial order would be wrong, which is why the length check cannot be skipped.

**Several valid answers usually exist.** When more than one course sits in the queue at once, they have no dependency between them and either can go first. Swapping the queue for a stack, or for a priority queue, gives a different valid order, which is a good thing to mention when asked for the lexicographically smallest one: a min-heap in place of the queue does exactly that.

---

### Walking through the example

Course `0` unlocks `1` and `2`; courses `1` and `2` both unlock `3`.

Outstanding counts: `0` waits on nothing, `1` and `2` wait on one each, `3` waits on two.

1. **Queue holds `0`.** Take it, so the order is `[0]`. Courses `1` and `2` drop to zero and are queued.
2. **Take `1`.** The order is `[0, 1]`, and course `3` drops to one.
3. **Take `2`.** The order is `[0, 1, 2]`, and course `3` drops to zero, so it is queued.
4. **Take `3`.** The order is `[0, 1, 2, 3]`.

All four courses are present, so that is the answer. Note that `[0, 2, 1, 3]` is equally valid: courses `1` and `2` were in the queue together and neither depends on the other.

---

### The code

```python
from collections import deque

class Solution:
    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:
        waiting_on = [0] * numCourses
        unlocks = [[] for _ in range(numCourses)]

        for course, prereq in prerequisites:
            unlocks[prereq].append(course)
            waiting_on[course] += 1

        queue = deque(c for c in range(numCourses) if waiting_on[c] == 0)
        order = []

        while queue:
            course = queue.popleft()
            order.append(course)   # the only change: keep the order

            for next_course in unlocks[course]:
                waiting_on[next_course] -= 1
                if waiting_on[next_course] == 0:
                    queue.append(next_course)

        # a short order means a cycle, and a partial answer is not allowed
        return order if len(order) == numCourses else []
```

---

### Time and space complexity

#### Time: $O(V + E)$

Each course enters and leaves the queue once, and each prerequisite pair is read twice: once when building the structures, once when its unlocking course is taken.

#### Space: $O(V + E)$

The counts, the unlock lists, the queue and the order.

---

### Remember this

This is Course Schedule with the order kept rather than counted, which is the actual topological sort. Append each course as it leaves the queue, and check the length at the end: short means a cycle, and the answer must then be empty rather than partial. Several orders are usually valid; swap the queue for a min-heap if the smallest one is wanted. $O(V + E)$ time.
