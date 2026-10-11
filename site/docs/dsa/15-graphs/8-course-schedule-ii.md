---
id: 8-course-schedule-ii
title: "210. Course Schedule II"
description: "Construct a valid topological ordering of courses using Kahn's algorithm"
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Topological Sort / Kahn's</span>

> **Problem Statement:** There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first before taking course `a`. Return the ordering of courses you should take to finish all courses. If there are multiple valid answers, return any of them. If it is impossible to finish all courses, return an empty array.

```text
Input:  numCourses = 4, prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]
Output: [0, 1, 2, 3]
Explanation: Course 0 must be taken first. Courses 1 and 2 can follow in either order, followed by course 3. Both [0, 1, 2, 3] and [0, 2, 1, 3] are valid answers.
```

---

### The Intuitive Mental Model

While *Course Schedule I* simply asks for a boolean flag checking whether an ordering is possible, *Course Schedule II* requires outputting an actual valid schedule: a **Topological Sort**.

#### Brute Force: Generating All Permutations
A naive approach would generate all $n!$ possible permutations of course orderings and verify each permutation against the list of prerequisite constraints. This takes $O(n! \cdot (V + E))$ factorial time, which becomes completely infeasible even for modest values such as $n = 12$.

#### Optimal Approach: Kahn's Algorithm (BFS In-Degree Peeling)
Kahn's algorithm naturally builds the schedule from front to back:
1. **Identify Available Courses:** Compute the in-degree (number of unmet prerequisites) for each course. Any course with `in_degree == 0` has no prerequisites and is ready to take immediately.
2. **Collect Sequence:** Initialize an empty list `order`.
3. **Peel Dependencies Layer by Layer:**
   - Pop a ready course `curr` from the queue and append it to `order`.
   - For every downstream course `next_course` that requires `curr`, decrement its in-degree by 1.
   - If `next_course` reaches an in-degree of 0, all its prerequisites are now satisfied; enqueue it.
4. **Cycle Validation:**
   - If `len(order) == numCourses`, all courses were successfully scheduled in valid order. Return `order`.
   - If `len(order) < numCourses`, circular dependencies formed a deadlock, leaving some courses stuck. Return `[]`.

#### Execution Walkthrough

Consider `numCourses = 4` with `prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]`:

| Step | Course Popped | Action Taken | In-Degree Updates | Queue State | Order Accumulated |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **0** | Initial State | Seed queue with in-degree 0 nodes | `in_degree = [0, 1, 1, 2]` | `[0]` | `[]` |
| **1** | `0` | Pop `0`, append to order, decrement `1` and `2` | `in_degree[1] = 0`, `in_degree[2] = 0` | `[1, 2]` | `[0]` |
| **2** | `1` | Pop `1`, append to order, decrement `3` | `in_degree[3] = 1` | `[2]` | `[0, 1]` |
| **3** | `2` | Pop `2`, append to order, decrement `3` | `in_degree[3] = 0` | `[3]` | `[0, 1, 2]` |
| **4** | `3` | Pop `3`, append to order, no outgoing edges | None | `[]` | `[0, 1, 2, 3]` |

Since `len(order) == 4 == numCourses`, return `[0, 1, 2, 3]`.

---

### Step-by-Step Algorithm

1. **Construct Graph Representation:**
   - Build an adjacency list `adj: list[list[int]] = [[] for _ in range(numCourses)]`.
   - Initialize an array `in_degree = [0] * numCourses`.
   - For each `course, prereq` in `prerequisites`:
     - Append `course` to `adj[prereq]`.
     - Increment `in_degree[course] += 1`.
2. **Initialize Queue and Order List:**
   - Seed `queue` with all courses where `in_degree[i] == 0`.
   - Create an empty list `order: list[int] = []`.
3. **Execute Kahn's Processing Loop:**
   - While `queue` has items:
     - Pop `curr = queue.popleft()`.
     - Append `curr` to `order`.
     - For each `next_course` in `adj[curr]`:
       - Decrement `in_degree[next_course] -= 1`.
       - If `in_degree[next_course] == 0`:
         - Enqueue `next_course`.
4. **Validate and Return:**
   - Return `order` if `len(order) == numCourses` else `[]`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Kahn's Algorithm (BFS)" default>

```python
from collections import deque

class Solution:
    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:
        adj: list[list[int]] = [[] for _ in range(numCourses)]
        in_degree = [0] * numCourses

        # Build directed graph: prereq -> course
        for course, prereq in prerequisites:
            adj[prereq].append(course)
            in_degree[course] += 1

        # Seed queue with all courses having 0 prerequisites
        queue: deque[int] = deque([i for i in range(numCourses) if in_degree[i] == 0])
        order: list[int] = []

        # Process courses in valid topological order
        while queue:
            curr = queue.popleft()
            order.append(curr)

            for next_course in adj[curr]:
                in_degree[next_course] -= 1
                if in_degree[next_course] == 0:
                    queue.append(next_course)

        # Return sequence if complete, else empty array on cycle detection
        return order if len(order) == numCourses else []
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Post-Order DFS with Cycle Detection">

```python
class Solution:
    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:
        adj: list[list[int]] = [[] for _ in range(numCourses)]
        for course, prereq in prerequisites:
            adj[prereq].append(course)

        # 0 = unvisited, 1 = visiting (in active call stack), 2 = visited
        state = [0] * numCourses
        order: list[int] = []
        has_cycle = False

        def dfs(node: int) -> None:
            nonlocal has_cycle
            if has_cycle:
                return

            state[node] = 1
            for neighbor in adj[node]:
                if state[neighbor] == 1:
                    has_cycle = True
                    return
                elif state[neighbor] == 0:
                    dfs(neighbor)

            state[node] = 2
            order.append(node)

        for i in range(numCourses):
            if state[i] == 0:
                dfs(i)

        if has_cycle:
            return []

        # Reverse post-order to obtain valid prerequisite ordering
        order.reverse()
        return order
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Kahn's Algorithm (BFS)** | $O(V + E)$ | $O(V + E)$ | Builds the topological order in natural forward order. Detects cycles without needing recursion. |
| **Post-Order DFS** | $O(V + E)$ | $O(V + E)$ | Collects nodes in post-order and reverses at the end. Requires recursion stack space of $O(V)$. |

---

### Common Pitfall: Returning a Partial Ordering when Cycles Exist

When a cycle exists, Kahn's algorithm will still process and append any nodes that occurred before the cycle to `order`. If you forget to check `len(order) == numCourses` and return `order` directly, you will return an incomplete schedule instead of the required empty array `[]`. Always verify that every course was scheduled before returning the array.

---

### Concise Interview Takeaway

Extend Kahn's algorithm by appending each popped vertex to an output list as its dependencies are cleared. If the length of the result list equals `numCourses`, return the collected sequence as a valid topological ordering; otherwise, return an empty list to indicate an unresolvable cycle deadlock.
