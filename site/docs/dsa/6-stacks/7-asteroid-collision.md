---
id: 7-asteroid-collision
title: "735. Asteroid Collision"
description: "Stack-based simulation of head-on directional asteroid collisions"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stack Simulation</span>

> **Problem Statement:** We are given an array `asteroids` of integers representing asteroids in a row. For each asteroid, the absolute value represents its size, and the sign represents its direction (`+` means right, `-` means left). Each asteroid moves at the same speed. Find the state of the asteroids after all collisions. If two asteroids collide, the smaller one explodes; if both are the same size, both explode. Two asteroids moving in the same direction or away from each other never meet.

```text
Input:  asteroids = [5, 10, -5]
Output: [5, 10]
Explanation: The 10 and -5 collide, resulting in 10 because 10 is larger. The 5 and 10 never collide because they both move right.
```

---

### The Intuitive Mental Model

Consider the kinematics of objects moving in one dimension:
- Both moving right (`[5, 10]`): traveling in parallel, never collide.
- Both moving left (`[-5, -10]`): traveling in parallel, never collide.
- Moving away from each other (`[-5, 10]`): the left asteroid moves west, the right moves east, never collide.
- Right followed by left (`[10, -5]`): head-on collision course!

A collision occurs if and only if the most recent survivor on the stack is moving right (`stack[-1] > 0`) and the incoming asteroid is moving left (`asteroid < 0`).

#### Brute Force: Array Rescanning Simulation
A direct simulation searches the list for adjacent colliding pairs where element $i > 0$ and element $i+1 < 0$. When found, it resolves the collision, removes the destroyed element(s), and rescans from the beginning. In the worst case (e.g., `[1, 2, 3, 4, -5]`), resolving collisions one by one and shifting array elements takes $O(n^2)$ time.

#### Optimal Approach: Stack Simulation
By simulating survivor history on a LIFO stack, we can resolve collisions in a single pass:
- When a new asteroid arrives, it only interacts with the top of the stack.
- As long as the stack is non-empty, the top asteroid is moving right, and the incoming asteroid is moving left, a collision must be resolved:
  - If the top asteroid is smaller, it explodes and gets popped from the stack. The incoming asteroid continues flying left to challenge the next asteroid.
  - If both asteroids are of equal size, both explode. Pop the top asteroid and destroy the incoming asteroid.
  - If the top asteroid is larger, the incoming asteroid explodes immediately.
- If the incoming asteroid survives all collisions (or was never on a collision course), push it onto the stack.

#### Execution Walkthrough

Let us trace `asteroids = [10, 2, -5]`:

| Step | Asteroid | Top of Stack | Direction Check | Action Taken | Stack State |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `10` | None | Initial | Push `10` | `[10]` |
| **2** | `2` | `10` | Both moving right | Push `2` | `[10, 2]` |
| **3** | `-5` | `2` | Head-on collision | `abs(-5) > 2`: `2` explodes, pop `2` | `[10]` |
| **-** | `-5` | `10` | Head-on collision | `abs(-5) < 10`: `-5` explodes, stop | `[10]` |

Final survivors on stack: `[10]`.

---

### Step-by-Step Algorithm

1. **Initialize Stack:** Create an empty list `stack = []` to hold surviving asteroids.
2. **Iterate Asteroids:** For each asteroid `a` in `asteroids`:
   - Initialize a boolean flag `alive = True`.
   - **Collision Loop:** While `alive` is `True`, `a < 0`, `stack` is non-empty, and `stack[-1] > 0`:
     - If `stack[-1] < abs(a)`: pop the top asteroid because it was smaller and destroyed; loop continues.
     - Else if `stack[-1] == abs(a)`: both explode. Pop the top asteroid, set `alive = False`, and break.
     - Else (`stack[-1] > abs(a)`): the incoming asteroid explodes. Set `alive = False`, and break.
   - If `alive` is `True`, push `a` onto `stack`.
3. **Return Survivors:** Return `stack`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Stack Simulation" default>

```python
class Solution:
    def asteroidCollision(self, asteroids: list[int]) -> list[int]:
        stack: list[int] = []

        for a in asteroids:
            alive = True

            # Collision only occurs when top moves right (+) and incoming moves left (-)
            while alive and a < 0 and stack and stack[-1] > 0:
                if stack[-1] < abs(a):
                    # Top asteroid is smaller: it explodes, incoming continues
                    stack.pop()
                elif stack[-1] == abs(a):
                    # Equal size: mutual annihilation
                    stack.pop()
                    alive = False
                else:
                    # Top asteroid is larger: incoming explodes
                    alive = False

            # If asteroid survived all impacts, it joins the survivors
            if alive:
                stack.append(a)

        return stack
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Adjacent Reduction">

```python
class Solution:
    def asteroidCollision(self, asteroids: list[int]) -> list[int]:
        res = list(asteroids)
        changed = True

        while changed:
            changed = False
            for i in range(len(res) - 1):
                if res[i] > 0 and res[i + 1] < 0:
                    if abs(res[i]) == abs(res[i + 1]):
                        res.pop(i + 1)
                        res.pop(i)
                    elif abs(res[i]) < abs(res[i + 1]):
                        res.pop(i)
                    else:
                        res.pop(i + 1)
                    changed = True
                    break

        return res
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Adjacent Reduction)** | $O(n^2)$ | $O(n)$ | Scans repeatedly and deletes elements from arrays, causing $O(n)$ memory shifts per collision. |
| **Optimal (Stack Simulation)** | $O(n)$ | $O(n)$ | Each asteroid is pushed onto the stack at most once and popped at most once, bounding runtime to $2n$ steps. |

---

### Common Pitfall: Directional Symmetry and Equal Size Destruction

Two bugs commonly arise in collision checks:
1. **Opposite signs do not always collide:** A negative asteroid preceding a positive asteroid (such as `[-5, 5]`) never collides because they are moving away from each other. Collisions occur strictly when `stack[-1] > 0` and `a < 0`.
2. **Mutual annihilation:** When both asteroids have equal size, both must explode. Forgetting to set `alive = False` when popping the equal top asteroid would incorrectly push `a` onto the stack afterward.

---

### Concise Interview Takeaway

Collisions occur exclusively when a right-moving asteroid (`+`) meets an incoming left-moving asteroid (`-`). Model surviving asteroids using a LIFO stack. Resolve collisions in a while loop comparing absolute sizes: pop smaller destroyed asteroids, destroy both on equal size, and only append surviving asteroids. Each asteroid enters and leaves the stack at most once, providing optimal linear $O(n)$ time and $O(n)$ space.
