---
id: 7-course-schedule
title: "207. Course Schedule"
description: "Detect cycles in directed dependency graph using Kahn's algorithm or 3-state DFS"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Topological Sort / Kahn's</span>

> **Problem Statement:** There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first before you can take course `a`. Return `True` if you can finish all courses, or `False` otherwise.

```text
Input:  numCourses = 4, prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]
Output: true
Explanation: Course 0 has no prerequisites and is taken first. Then courses 1 and 2 can be taken, followed by course 3.
```

---

### The Intuitive Mental Model

Each prerequisite pair `[a, b]` specifies a directed dependency edge: $b \to a$ ($b$ must precede $a$). This forms a directed graph.

Can you successfully finish all courses? You can if and only if the directed graph contains **no directed cycles**. If course 0 requires course 1, and course 1 requires course 0 ($0 \to 1 \to 0$), an unresolvable circular dependency occurs.

A directed graph with no cycles is a **Directed Acyclic Graph (DAG)**. Determining whether a DAG exists, and finding an executable sequence of vertices, is the definition of **Topological Sorting**.

#### Brute Force: Exhaustive Cycle Exploration
A naive method initiates a separate DFS traversal from every single vertex to check whether any path circles back to the source. Without memoization or tri-color state tracking, vertices and paths are re-evaluated repeatedly, leading to exponential time complexity on dense dependency graphs.

#### Optimal Approach: Kahn's Algorithm (BFS via In-Degrees)
Kahn's algorithm detects cycles in linear time by peeling away nodes whose dependencies have been satisfied:
1. **In-Degree Array:** Count how many incoming prerequisites each course requires. For example, if course 3 requires courses 1 and 2, then `in_degree[3] = 2`.
2. **Initial Frontier:** Courses with an in-degree of 0 have no prerequisites. They can be taken immediately on Day 1. Seed the BFS queue with all nodes where `in_degree[i] == 0`.
3. **Resolve Dependencies:**
   - While the queue contains courses, pop `curr`.
   - Increment `completed += 1`.
   - For each course `next_course` that depends on `curr`, decrement its in-degree by 1.
   - If `next_course` reaches an in-degree of 0, all its prerequisites are satisfied; enqueue it.
4. **Cycle Verification:**
   - If `completed == numCourses`, every course was cleared without deadlock.
   - If `completed < numCourses`, remaining courses are trapped in a cycle with in-degrees stuck above 0.

#### Execution Walkthrough

Consider `numCourses = 4` with `prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]`:

| Step | Course Popped | Action Taken | In-Degree Updates | Queue State | Completed Count |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **0** | Initial State | Seed queue with in-degree 0 nodes | `in_degree = [0, 1, 1, 2]` | `[0]` | 0 |
| **1** | `0` | Pop `0`, decrement neighbors `1` and `2` | `in_degree[1] = 0`, `in_degree[2] = 0` | `[1, 2]` | 1 |
| **2** | `1` | Pop `1`, decrement neighbor `3` | `in_degree[3] = 1` | `[2]` | 2 |
| **3** | `2` | Pop `2`, decrement neighbor `3` | `in_degree[3] = 0` | `[3]` | 3 |
| **4** | `3` | Pop `3`, no outgoing neighbors | None | `[]` | 4 |

`completed == numCourses` (`4 == 4`), so the method returns `True`.

---

### Step-by-Step Algorithm

1. **Construct Graph Representation:**
   - Build an adjacency list `adj: list[list[int]] = [[] for _ in range(numCourses)]`.
   - Build an array `in_degree: list[int] = [0] * numCourses`.
   - For each pair `course, prereq` in `prerequisites`:
     - Append `course` to `adj[prereq]`.
     - Increment `in_degree[course] += 1`.
2. **Seed BFS Queue:**
   - Collect all course indices with `in_degree[i] == 0` into a deque.
3. **Execute Kahn's Processing Loop:**
   - Initialize `completed = 0`.
   - While `queue` is not empty:
     - Pop `curr = queue.popleft()`.
     - Increment `completed += 1`.
     - For each `next_course` in `adj[curr]`:
       - Decrement `in_degree[next_course] -= 1`.
       - If `in_degree[next_course] == 0`, enqueue `next_course`.
4. **Validate Total:** Return `completed == numCourses`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Kahn's Algorithm (BFS)" default>

```python
from collections import deque

class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        adj: list[list[int]] = [[] for _ in range(numCourses)]
        in_degree = [0] * numCourses

        # Build directed graph: prereq -> course
        for course, prereq in prerequisites:
            adj[prereq].append(course)
            in_degree[course] += 1

        # Seed queue with all courses having 0 prerequisites
        queue: deque[int] = deque([i for i in range(numCourses) if in_degree[i] == 0])
        completed = 0

        # Process courses whose dependencies are cleared
        while queue:
            curr = queue.popleft()
            completed += 1

            for next_course in adj[curr]:
                in_degree[next_course] -= 1
                if in_degree[next_course] == 0:
                    queue.append(next_course)

        # If all courses were cleared, no cycle exists
        return completed == numCourses
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: 3-State DFS Cycle Detection">

```python
class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        adj: list[list[int]] = [[] for _ in range(numCourses)]
        for course, prereq in prerequisites:
            adj[prereq].append(course)

        # 0 = unvisited, 1 = visiting (in active recursion stack), 2 = fully visited
        state = [0] * numCourses

        def has_cycle(node: int) -> bool:
            if state[node] == 1:
                return True   # Back-edge detected; cycle exists
            if state[node] == 2:
                return False  # Already confirmed cycle-free

            state[node] = 1
            for neighbor in adj[node]:
                if has_cycle(neighbor):
                    return True

            state[node] = 2
            return False

        for i in range(numCourses):
            if state[i] == 0:
                if has_cycle(i):
                    return False

        return True
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Kahn's Algorithm (BFS)** | $O(V + E)$ | $O(V + E)$ | Optimal linear time. Evaluates each node and dependency edge once using an iterative queue. |
| **3-State DFS Cycle Detection** | $O(V + E)$ | $O(V + E)$ | Uses tri-state node marking to identify back-edges. Extra stack frames for recursion. |

---

### Common Pitfall: Reversed Edge Direction

A common error is reversing edge directions when building the adjacency list. The input specifies `[a, b]` where `b` is the prerequisite for `a`. That means the prerequisite relationship flows $b \to a$. The in-degree belongs to $a$ (the course waiting to be taken), and the edge points outward from $b$ (the unlocking course). Swapping this leads to completely backwards topological orderings.

---

### Concise Interview Takeaway

Model course dependencies as a directed graph and apply Kahn's algorithm: compute in-degrees for all vertices, enqueue every vertex with an in-degree of 0, and peel them off layer by layer while decrementing neighbor in-degrees. If the count of completed courses equals `numCourses`, the graph is an acyclic DAG, solvable in optimal $O(V + E)$ time.
