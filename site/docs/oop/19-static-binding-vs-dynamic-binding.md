---
id: 19-static-binding-vs-dynamic-binding
title: "Static vs. Dynamic Binding: Early vs. Late Resolution"
description: "Grasp the distinction between early static binding at compile time and late dynamic binding at runtime."

sidebar_position: 19
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the core difference between static and dynamic binding? Tell me exactly how the compiler and the JVM decide which method implementation to execute."

### ELI5: The Translator vs. The Mind Reader
Imagine you are handed a script for a play where one character is labeled "The Hero."

Static Binding is like a rigid casting director. Before the play even begins (compile time), the director says, "John is playing The Hero. Every time the script says 'The Hero speaks,' John speaks." The decision is locked in based on the label on the script.

Dynamic Binding is like an improv show. The script still says "The Hero speaks," but you don't know who is actually standing on stage in the hero costume until that exact scene happens (runtime). Whoever happens to be wearing the costume at that exact moment is the one who delivers the line.

### The Proper Answer: Reference Type vs. Object Type
The fundamental difference lies in when the compiler/interpreter decides which specific method implementation to execute, and what information it uses to make that decision.

### Static Binding (Early Binding)
*   **When:** Resolved at compile-time.
*   **How it decides:** The compiler uses the type of the reference variable to determine which method to call. It doesn't care what actual object is stored in memory; it only cares what type of pointer is holding it.
*   **Where it applies:** It applies to methods that cannot be overridden. This includes:
    *   private methods (invisible to child classes).
    *   inal methods (explicitly blocked from overriding).
    *   static methods (belong to the class, not the instance).
    *   Method Overloading (compile-time polymorphism - the compiler picks the method based on the number and type of arguments passed).
*   **Advantage:** Performance. The binding is done before the program even runs, resulting in faster execution.

### Dynamic Binding (Late Binding)
*   **When:** Resolved at runtime.
*   **How it decides:** The system ignores the reference type and looks at the actual object type occupying memory at that exact moment.
*   **Where it applies:** It applies exclusively to Method Overriding (runtime polymorphism). When a parent class and a child class have the exact same method signature, the JVM (or equivalent runtime environment) waits until execution to see which object it is actually dealing with.
*   **Mechanism:** Under the hood, languages like Java and C++ manage this using a Virtual Method Table (v-table). The runtime looks up the v-table for the specific object instance to find the correct memory address of the overridden method.
*   **Advantage:** Extensibility. It allows you to write highly flexible code that can handle new object types without modifying the core logic.

### See It In Action
This interactive widget demonstrates how the compiler looks at code structure under static binding versus how it resolves calls at runtime under dynamic binding.

### Interview Summary
To ace this specific question, make sure you clearly distinguish the reference type from the actual object:
1.  **Timing:** Static binding happens at compile-time; Dynamic binding happens at runtime.
2.  **The Deciding Factor (Crucial):** Static binding resolves based on the reference variable type. Dynamic binding resolves based on the actual object type.
3.  **Polymorphism Mapping:** Static binding powers Method Overloading; Dynamic binding powers Method Overriding.
4.  **The "Why":** Static binding is faster and provides strict compile-time checks, while dynamic binding enables flexibility and loose coupling.

---

### Crucial Nuance: Variable Hiding is Always Static

A common trap interviewers set involves polymorphism with variables (fields) instead of methods. They will create a parent and child class that both have an `int speed` variable, and ask which one is accessed at runtime.

Dynamic binding **only** applies to overridden methods. Variables cannot be overridden; they can only be "hidden." Because of this, variable resolution is always resolved via static binding at compile time. The JVM will look exclusively at the reference type (the left side of the equals sign) to decide which variable to use, completely ignoring the actual object type in memory.
