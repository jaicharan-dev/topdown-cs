---
id: 7-asteroid-collision
title: "735. Asteroid Collision"
description: "Only a right-mover already standing can be hit by a left-mover arriving"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stack Simulation</span>

> **Problem Statement:** You are given a row of asteroids. The size of each number is the asteroid's size, and its sign is its direction, positive for right and negative for left. They all move at the same speed. When two meet, the smaller explodes, and if they are the same size both explode. Return what survives.

```text
Input:  asteroids = [5, 10, -5]
Output: [5, 10]
```

---

### Picture it

Work out when a collision can actually happen, because it is a narrower situation than it first appears.

Two asteroids only meet if the one on the **left is moving right** and the one on the **right is moving left**. They are closing on each other. Every other pairing is harmless: both moving right, both moving left, or moving apart.

So as you read the row from left to right, keep the survivors so far. A new asteroid moving **right** can never hit any of them, since they are all to its left, so it just joins the pile. A new asteroid moving **left** has to fight its way backwards through the survivors, one at a time, for as long as it keeps meeting right-movers.

That is a stack: the fighting always happens against the most recent survivor.

---

### How to think about it

For each asteroid, there is a fight only when the arriving one is negative **and** the top of the stack is positive. While that holds, compare sizes:

- **The one on the stack is smaller.** It explodes, so pop it, and the arriving asteroid keeps fighting whatever is now on top.
- **They are the same size.** Both explode, so pop it and stop; the arriving one does not survive either.
- **The one on the stack is bigger.** The arriving asteroid explodes and the loop ends.

If the arriving asteroid is still alive when the fighting stops, it joins the stack. That covers three different cases at once: it was moving right all along, the stack is empty, or the top is another left-mover that it can never catch.

The flag for "is it still alive" is the part to be careful with. It is tempting to write this with a `break` and then forget that the same-size case must not push.

---

### Walking through the example

Take `asteroids = [5, 10, -5]`.

1. **`5`** moves right. Nothing can hit it, so it joins the pile: `5`.
2. **`10`** moves right too. Right-movers never collide with each other, so it joins: `5, 10`.
3. **`-5`** moves left and the top of the pile is `10` moving right, so they meet. The `10` is bigger, so the `-5` explodes and nothing is pushed.

The survivors are `[5, 10]`.

Now take `[8, -8]`. The `8` joins the pile, then the `-8` meets it, they are the same size, so both explode and the answer is empty.

---

### The code

```python
class Solution:
    def asteroidCollision(self, asteroids: list[int]) -> list[int]:
        survivors = []

        for a in asteroids:
            alive = True

            # a fight needs a right-mover on top and a left-mover arriving
            while alive and a < 0 and survivors and survivors[-1] > 0:
                top = survivors[-1]

                if top < -a:
                    survivors.pop()      # the one standing loses, keep fighting
                elif top == -a:
                    survivors.pop()      # both explode
                    alive = False
                else:
                    alive = False        # the arriving one explodes

            if alive:
                survivors.append(a)

        return survivors
```

---

### Time and space complexity

#### Time: $O(n)$

Every asteroid is pushed at most once and popped at most once. The inner loop can run several times for a single large left-mover, but each of those turns destroys a survivor permanently, so the total across the whole run is bounded by the number of asteroids.

#### Space: $O(n)$

The stack. A row where nothing ever collides, such as all asteroids moving right, leaves every one of them standing.

---

### Remember this

A collision needs a right-mover on the left and a left-mover on the right, so the only fights are between an arriving negative asteroid and the positive one on top of the stack. Pop while the stander is smaller, pop and stop when sizes match, stop when the stander is bigger, and push only if the newcomer survived. $O(n)$ time, $O(n)$ space.
