---
id: 7-course-schedule
title: "207. Course Schedule"
description: "Repeatedly take whatever has no prerequisites left, and see if anything is stuck"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Topological Sort / Kahn's</span>

> **Problem Statement:** You have a number of courses and a list of prerequisite pairs, where `[a, b]` means `b` must be taken before `a`. Say whether every course can be completed.

```text
Input:  numCourses = 4, prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]
Output: true
```

---

### Picture it

Think about what actually makes a schedule impossible. Not having many prerequisites, and not having a long chain of them. The only thing that blocks you is a **cycle**: course `A` needs `B`, which needs `C`, which needs `A`. Nobody can go first.

So the question is really "does this set of prerequisites contain a cycle?"

Here is the way to find out without hunting for cycles directly. Count how many prerequisites each course still has outstanding. Any course with zero can be taken right now. Take it, and every course that was waiting on it has one fewer prerequisite. Some of those may now drop to zero, so take them next.

Keep going until nothing is takeable. If every course has been taken, the schedule works. If some are left, each of them is still waiting on something, and following those waits in a circle is the cycle.

---

### How to think about it

This is Kahn's algorithm, and it needs two structures from one pass over the prerequisites:

- **A count** for each course of how many prerequisites it is still waiting on.
- **A list** for each course of which courses are waiting on **it**, so that finishing it can notify them.

Getting the direction of that list right is the main source of bugs. The pair `[a, b]` means `b` unlocks `a`, so `a` goes in `b`'s list and `a`'s count goes up.

Then queue every course with a count of zero, and process:

1. Take a course from the queue and mark it done.
2. For each course waiting on it, reduce that course's count by one.
3. If a count reaches zero, queue it.

At the end, compare the number taken with the total. Equal means success, fewer means a cycle.

There is no need to identify the cycle, only to notice that something never became takeable. That is what makes counting simpler than a depth-first search tracking the current path.

---

### Walking through the example

Four courses. Course `0` unlocks `1` and `2`; courses `1` and `2` both unlock `3`.

The counts start as: `0` waits on nothing, `1` waits on one, `2` waits on one, `3` waits on two.

1. **Course 0 is queued**, since its count is zero. Take it. Taken: `1`.
2. **Courses 1 and 2** each drop to zero and are queued. Take both. Taken: `3`.
3. **Course 3** drops to one when `1` is taken, then to zero when `2` is taken, so it is queued. Take it. Taken: `4`.

All four were taken, so the answer is `true`.

Now add the pair `[0, 3]`, so course `3` unlocks `0`. Course `0` now waits on one, and nothing starts with a count of zero. The queue is empty from the beginning, nothing is ever taken, and the answer is `false`.

---

### The code

```python
from collections import deque

class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        waiting_on = [0] * numCourses        # prerequisites still outstanding
        unlocks = [[] for _ in range(numCourses)]

        for course, prereq in prerequisites:
            unlocks[prereq].append(course)   # finishing prereq frees course
            waiting_on[course] += 1

        queue = deque(c for c in range(numCourses) if waiting_on[c] == 0)
        taken = 0

        while queue:
            course = queue.popleft()
            taken += 1

            for next_course in unlocks[course]:
                waiting_on[next_course] -= 1
                if waiting_on[next_course] == 0:
                    queue.append(next_course)

        # anything left over is still waiting on something, which is a cycle
        return taken == numCourses
```

---

### Time and space complexity

#### Time: $O(V + E)$

Each course is queued and taken once, and each prerequisite pair is read once when building the structures and once when the unlocking course is taken.

#### Space: $O(V + E)$

The counts, the unlock lists, and the queue.

---

### Remember this

The only thing that makes a schedule impossible is a cycle, so look for one indirectly: count outstanding prerequisites, take anything at zero, and reduce the counts of whatever it unlocks. If the number taken falls short of the total, the leftovers are waiting on each other. Remember that `[a, b]` means `b` unlocks `a`, which is the direction people reverse. $O(V + E)$ time.
