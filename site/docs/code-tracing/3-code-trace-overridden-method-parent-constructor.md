---
id: 3-code-trace-overridden-method-parent-constructor
title: "Code Trace: Overridden Method Called from a Parent Constructor"
description: "A detailed breakdown of why calling an overridden method from a parent class constructor is dangerous in Java."

sidebar_position: 3
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** Tell me exactly what gets printed, line by line, and explain why. 
> ```python
> class Animal:
>     def __init__(self):
>         print("Animal constructor")
>         self.sound()
>     def sound(self):
>         print("Generic animal sound")
> class Dog(Animal):
>     def __init__(self):
>         super().__init__()
>         print("Dog constructor")
>     def sound(self):
>         print("Woof")
> d = Dog()
> ```
> What is the output? Take your time, trace it step by step.

Here is the exact output, followed by a step-by-step top-down trace. This is a brilliant interview question because it tests your understanding of dynamic method dispatch (polymorphism) specifically within the context of object initialization.

### The Exact Output
```text
Animal constructor
Woof
Dog constructor
```

### Step-by-Step Trace (The "Why")

1. **Instantiation:** You execute `d = Dog()`. The Python interpreter looks for the `__init__` method in the `Dog` class and enters it.
2. **The Super Call:** The very first line inside `Dog.__init__` is `super().__init__()`. This halts the execution of the `Dog` constructor and immediately transfers control up to the parent `Animal` constructor.
3. **Animal Constructor - Line 1:** Inside `Animal.__init__`, the first line is `print("Animal constructor")`. This prints to the console.
4. **The Trap (Polymorphism in Action):** The next line is `self.sound()`.
   * **The Trap:** A junior developer will look at this and say, "We are inside the `Animal` class, so it calls `Animal`'s `sound()` method and prints 'Generic animal sound'."
   * **The Reality:** In Python, `self` always refers to the actual object in memory. The object you instantiated is a `Dog`. Because `Dog` has provided its own overriding implementation of `sound()`, the interpreter dynamically dispatches the call to the `Dog`'s version of the method. It prints "Woof".
5. **Returning to the Child:** The `Animal` constructor finishes its work. Control flows back down to where it left off in the `Dog` constructor.
6. **Dog Constructor - Line 2:** The final line of the `Dog` constructor is `print("Dog constructor")`, which prints to the console, completing the initialization.

### The Interview Takeaway

If an interviewer asks you to summarize why this happens, you can give them this one-liner: "Because `self` represents the instance in memory, not the class where the code is written, calling an overridden method from a parent's constructor will always execute the child's implementation."

---

### Crucial Nuance: The Uninitialized State Danger (The Java Parallel)

If this same question is asked in Java or C++, the underlying polymorphic principle is exactly the same, but the danger is significantly higher. 

When the parent constructor fires the overridden method in the child class, the child's constructor *has not finished running yet*. In Python, variables can be created dynamically, but in languages like Java, if the child's `sound()` method relies on an instance variable that gets initialized in the `Dog` constructor (e.g., `this.barkVolume`), that variable will still be completely uninitialized (often `null` or `0`). This leads to bizarre, hard-to-trace `NullPointerException`s during object creation. This is why calling overridable methods from constructors is widely considered an anti-pattern across OOP languages.
