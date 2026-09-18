---
id: 4-code-trace-diamond-shaped-multiple-inheritance
title: "Code Trace: Diamond-Shaped Multiple Inheritance"
sidebar_position: 4
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** 
> ```python
> class A:
>     def __init__(self):
>         print("A")
> class B(A):
>     def __init__(self):
>         print("B")
>         super().__init__()
> class C(A):
>     def __init__(self):
>         print("C")
>         super().__init__()
> class D(B, C):
>     def __init__(self):
>         print("D")
>         super().__init__()
> d = D()
> ```
> What is the output? And what determines the order?

Here is the exact output, followed by a top-down breakdown of the underlying mechanics. This is a classic "trap" question for senior Python roles because it tests whether you actually understand how `super()` works in multiple inheritance, rather than just assuming it means "go to the parent."

### The Exact Output
```text
D
B
C
A
```

### What determines the order? Method Resolution Order (MRO)

The order is determined by Python's Method Resolution Order (MRO), which uses an algorithm called C3 Linearization.
When you use multiple inheritance, Python builds a linear list of classes to determine the hierarchy of inheritance. It guarantees two things:
1. A child class is always checked before its parents.
2. If a class inherits from multiple parents, they are checked in the order they are listed inside the parentheses (e.g., in `class D(B, C)`, `B` is checked before `C`).

For your class `D`, Python calculates this MRO list: `[D, B, C, A, object]`
(You can actually view this in Python by printing `D.__mro__`).

### Step-by-Step Trace (The Trap)

The most important concept here is that `super()` does **not** mean "call my parent." It means "call the next class in the MRO of the original object."

1. **Instantiation (`d = D()`):** You create a `D` object. The MRO is `[D, B, C, A]`. The interpreter enters `D.__init__`.
2. **Inside D:** 
   * Prints "D".
   * Calls `super().__init__()`. The next class after `D` in the MRO is `B`. Control passes to `B`.
3. **Inside B (The Trap):**
   * Prints "B".
   * Calls `super().__init__()`.
   * **The Trap:** A junior developer assumes this calls `A` because `B` inherits from `A`. But `super()` checks the MRO of the *actual object instantiated* (which is `D`). In `D`'s MRO (`[D, B, C, A]`), the next class after `B` is `C`. So, control passes sideways to `C`.
4. **Inside C:**
   * Prints "C".
   * Calls `super().__init__()`. The next class after `C` in the MRO is `A`. Control passes to `A`.
5. **Inside A:**
   * Prints "A".
   * There is no `super()` call here, so the chain ends, and the initialization is complete.

### Summary for Interviews

If an interviewer asks you to explain this behavior, give them this definitive explanation: "In Python, `super()` delegates to the next class in the Method Resolution Order (MRO) of the instantiated object, not necessarily the direct lexical parent of the current class. Because `D` inherits from `B` and `C`, the MRO forces `super()` inside `B` to jump sideways to `C` before finally moving up to the base class `A`, effectively resolving the diamond inheritance problem without calling `A` twice."

---

### Crucial Nuance: C3 Linearization and Refactoring Risks

An advanced follow-up question revolves around how easily you can break the Method Resolution Order if you are not careful. Because Python uses C3 Linearization to build the MRO, it guarantees that a child class is always checked before its parents. 

If you accidentally change your class definitions such that the inheritance order creates an impossible graph (for example, if class `C` unexpectedly inherited from class `B` but you still wrote `class D(B, C)`), Python will outright refuse to compile it. It will raise a `TypeError: Cannot create a consistent method resolution order (MRO)`. Pointing this out shows you understand that multiple inheritance in Python isn't just "magic"—it relies on strict mathematical consistency that can break during major refactors.
