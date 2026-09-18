---
id: 2-code-trace-this-super-chaining
title: "Code trace: `this()` and `super()` chaining together"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the exact output, in order? Trace how `this()` and `super()` interact here  -  which one actually reaches the parent class, and why doesn't `Car()` call `super()` directly itself?
>
> ```java
> class Vehicle  {
>     Vehicle()  {
>         System.out.println("Vehicle no-arg");
>     }
>     Vehicle(String type)  {
>         System.out.println("Vehicle: " + type);
>     }
> }
> class Car extends Vehicle  {
>     Car()  {
>         this("Sedan");
>         System.out.println("Car no-arg");
>     }
>     Car(String model)  {
>         super("Car - " + model);
>         System.out.println("Car: " + model);
>     }
>     public static void main(String[] args)  {
>         new Car();
>     }
> }
> ```

### The Interview Quick-Hit

"The output prints the parent's parameterized constructor first, then the child's parameterized constructor, and finally the child's no-arg constructor. Java enforces a strict rule: a constructor's very first line must be either `this()` OR `super()`, never both. When the `Car()` no-arg constructor uses `this()` to delegate to its sibling, it intentionally hands off the responsibility of calling `super()` to that sibling to prevent the parent object from being built twice."

### Execution Trace & Output

```text
Vehicle: Car - Sedan
Car: Sedan
Car no-arg
```

### Step-by-step breakdown:
1.  **The Trigger:** `new Car();` calls the child's no-arg constructor `Car()`.
2.  **The Hand-off (`this`):** The very first line is `this("Sedan");`. This pauses the current constructor and immediately jumps to the sibling constructor: `Car(String model)`.
3.  **Reaching the Parent (`super`):** Inside `Car(String model)`, the first line is `super("Car - Sedan");`. This pauses the child completely and jumps up to the parent's parameterized constructor: `Vehicle(String type)`.
4.  **The Execution (Top-Down):** The `Vehicle` constructor finishes its setup and prints: `"Vehicle: Car - Sedan"`.
5.  Control returns to where it left off in `Car(String model)`, which prints: `"Car: Sedan"`.
6.  Control finally returns to the original `Car()` constructor, which prints: `"Car no-arg"`.

### The Core Concept: Why doesn't `Car()` call `super()` directly?
If an interviewer asks you to explain the underlying mechanics, it comes down to memory safety and preventing double-initialization.

Every object in Java must have its parent's foundation poured before it can build its own walls. If you don't explicitly write `super()`, the Java compiler silently inserts an invisible `super();` (no-arg) on line 1 for you.

However, if you explicitly write `this()`, the compiler deletes that invisible `super()`.

Why? Because if `Car()` called `super()` to build the parent, and then called `this()` to jump to the sibling, the sibling also has a `super()` call. The JVM would attempt to build the `Vehicle` foundation twice for a single car, completely corrupting the object in memory.

By enforcing the rule that you can only choose one, Java ensures that the parent constructor is only ever triggered exactly once per object creation.

---

### Crucial Nuance: Catching the `StackOverflowError` in `this()` Chaining

A classic "gotcha" in advanced interviews involves asking what happens if two constructors call each other using `this()`. For example, if `Car()` calls `this("Sedan")`, and `Car(String model)` calls `this()`. 

Unlike a standard recursive method that will compile fine and crash at runtime with a `StackOverflowError`, Java's compiler is actually smart enough to catch constructor recursion at compile time. It will immediately throw a compilation error: "Recursive constructor invocation." Interviewers love this nuance because it demonstrates your knowledge of the compiler's strict safety checks regarding object initialization.
