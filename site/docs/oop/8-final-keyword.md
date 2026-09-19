---
id: 8-final-keyword
title: "The Final Keyword"
description: "Learn how the final keyword restricts variable mutation, method overriding, and class inheritance."

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "The 'final' keyword can be applied to variables, methods, and classes. Walk me through what it does in each of those three contexts."

"In Java, the `final` keyword is a non-access modifier used to enforce immutability or restriction. It can be applied to variables, methods, and classes. Essentially, it means 'once defined, this cannot be changed or overridden.'"

### The Three Contexts of final

#### 1. Final Variables (Creating Constants)
When you apply `final` to a variable, its value cannot be reassigned once initialized.
- **Primitive Variables:** The actual data value is locked.
  ```java
  final int MAX_CONNECTIONS = 5;
  // MAX_CONNECTIONS = 10; // Compiler Error
  ```
- **Reference Variables (The Trap):** If you make an object reference `final`, the reference is locked to that memory address - you cannot reassign it to a new object. However, the object itself remains mutable. You can still modify the internal states of that object.
  ```java
  final ArrayList<String> list = new ArrayList<>();
  list.add("Bitcoin"); // Works fine! The internal state can change.
  // list = new ArrayList<>(); // Compiler Error! Cannot reassign the reference variable.
  ```

#### 2. Final Methods (Preventing Overriding)
When you apply `final` to a class method, it means that subclasses cannot override this method.
*Why use it?* You do this for security or core API consistency. If your parent class has a sensitive authentication method like `verifySecureToken()`, you don't want a junior developer or a malicious subclass to override it and bypass security checks.
```java
class SecurityGateway {
    final void authenticateUser() {
        // Core, unchangeable security check logic
    }
}
```

#### 3. Final Classes (Preventing Inheritance)
When you apply `final` to an entire class, that class cannot be extended (inherited from). Consequently, every single method inside a `final` class is implicitly `final` as well.
*Why use it?* It is used to create immutable classes or to protect standard system utilities. For example, Java's built-in `String` class is declared as `public final class String`. If it weren't final, a subclass could override basic string operations and break the stability of the entire Java Virtual Machine.
```java
final class ImmutableConfiguration {
    // No other class can say "extends ImmutableConfiguration"
}
```

### Summary
"I use `final` on variables to create constants and prevent accidental state reassignment. I apply it to methods to lock down critical business or security logic from being modified via overriding, and I apply it to classes when I want to explicitly prevent inheritance, ensuring the object's implementation remains exactly as designed."

---

### Crucial Nuance: The "Blank Final" Initialization Trap

A "blank final" variable is a `final` instance variable that is declared but not immediately initialized (e.g., `final int id;`). Interviewers will ask if this compiles. The answer is yes, *but* with a strict condition: the compiler will mandate that every single constructor in your class initializes that blank final variable before the constructor finishes execution. If even one constructor path forgets to set it, the code will fail to compile. This is highly useful for creating immutable objects where the state is locked in at creation but dynamically provided via constructor arguments.
