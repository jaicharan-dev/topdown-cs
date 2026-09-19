---
id: 6-code-trace-unimplemented-abstract-method
title: "Code Trace: Unimplemented Abstract Method"
description: "Learn the compilation rules and runtime behaviors when an abstract method is left unimplemented in a subclass."

sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** 
> ```python
> class Shape:
>     def area(self):
>         raise NotImplementedError("Subclass must implement area()")
> class Circle(Shape):
>     def __init__(self, radius):
>         self.radius = radius
>     def area(self):
>         return 3.14 * self.radius ** 2
> class Square(Shape):
>     def __init__(self, side):
>         self.side = side
>     def area(self):
>         return self.side ** 2
> class Triangle(Shape):
>     def __init__(self, base, height):
>         self.base = base
>         self.height = height
> shapes = [Circle(5), Square(4), Triangle(3, 6)]
> for shape in shapes:
>     print(shape.area())
> ```
> Two questions  -  what is the output, and what happens on the third iteration and why?

Here is the exact output, followed by a top-down trace. This question tests your understanding of inheritance, method resolution, and how Python traditionally simulates abstract contracts.

### The Exact Output
```text
78.5
16
Traceback (most recent call last):
  ...
    raise NotImplementedError("Subclass must implement area()")
NotImplementedError: Subclass must implement area()
```

### Step-by-Step Trace (The "Why")

1. **Iteration 1 (Circle):** The loop grabs `Circle(5)`. The interpreter looks for an `area()` method inside the `Circle` class. It finds it, calculates `3.14 * 5 ** 2`, and prints `78.5`.
2. **Iteration 2 (Square):** The loop grabs `Square(4)`. The interpreter looks for an `area()` method inside the `Square` class. It finds it, calculates `4 ** 2`, and prints `16`.
3. **Iteration 3 (The Trap):** The loop grabs `Triangle(3, 6)` and attempts to call `shape.area()`.
   * **What happens:** Python looks inside the `Triangle` class for an `area()` method. It does not find one.
   * **Why it happens:** Because `Triangle` inherits from `Shape`, Python follows the Method Resolution Order (MRO) up to the parent class to see if the method exists there. It finds `area()` inside `Shape`. It executes that method, which immediately executes `raise NotImplementedError("Subclass must implement area()")`. The program crashes and halts execution.

### The Interview Takeaway

If an interviewer presents this, they are looking to see if you understand how to enforce contracts in object-oriented design.

Here is the exact phrasing to use to impress them: "This code demonstrates the traditional Pythonic way to simulate an interface or abstract class. By raising a `NotImplementedError` in the base class, the parent is enforcing a strict contract: any child class must provide its own implementation. However, as a best practice, I would point out the flaw in this approach: it fails at run-time when the method is actually called. A safer approach for a modern backend system is to use Python's built-in `abc` (Abstract Base Classes) module. If `Shape` were a true ABC with an `@abstractmethod`, the program would have crashed the moment we tried to instantiate `Triangle(3, 6)`, rather than acting as a ticking time bomb that blows up during iteration."

---

### Crucial Nuance: The Interface Segregation Principle (ISP)

When discussing abstract contracts in interviews, it's a great opportunity to bring up the **Interface Segregation Principle** (the 'I' in SOLID). 

If a base class or interface forces a subclass to implement a method it doesn't actually need, that is a violation of ISP. For example, if our `Shape` class had a mandatory `calculateVolume()` method, 2D shapes like `Square` and `Circle` would be forced to implement it, likely by just returning 0 or throwing a `NotImplementedError`. By highlighting this, you show the interviewer that you don't just understand *how* to implement abstract methods, but you also understand *when* to break them apart into smaller, more focused contracts (e.g., `TwoDimensionalShape` vs `ThreeDimensionalShape`).
