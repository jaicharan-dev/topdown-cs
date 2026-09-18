---
id: 2-method-overloading-vs-overriding
title: "Method Overloading vs. Overriding"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through method overloading versus overriding. I want a quick example of each, and then I need you to explain what 'dynamic method dispatch' is and why it only applies to overriding."

### Method Overloading vs. Method Overriding
These two concepts are the primary ways object-oriented programming implements polymorphism (the ability of a function to take on multiple forms).

#### 1. Method Overloading (Compile-Time Polymorphism)
**What it is:** Defining multiple methods with the exact same name but different parameters (different number of arguments, different types, or both) within the same class.

**The ELI5 Analogy:** Imagine telling a friend to "paint." If you hand them a wall roller, they paint the room. If you hand them a small brush and a canvas, they paint a portrait. The command ("paint") is the same, but the behavior changes based on the inputs provided.

**Context Note:** In statically typed languages (like Java or C++), this is a built-in feature. In dynamic languages like Python or JavaScript (Node.js), you typically simulate this by using default parameters, `*args`, or checking the type/number of arguments inside a single method, because defining the same method twice just overwrites the first one.

### Example (Pseudo-code):
```java
class MathUtils {
    // Overload 1: Takes one argument
    int calculateArea(int side) {
        return side * side; 
    }

    // Overload 2: Takes two arguments
    int calculateArea(int length, int width) {
        return length * width;
    }
}
```

#### 2. Method Overriding (Run-Time Polymorphism)
**What it is:** When a child class provides its own specific implementation of a method that is already defined in its parent class. The method signature (name and exact parameters) must remain identical.

**The ELI5 Analogy:** The corporate headquarters (Parent Class) has a standard procedure called `processRefund()`. Your specific branch (Child Class) has local regulations, so you write your own `processRefund()` procedure. When a customer at your branch asks for a refund, your specific procedure overrides the corporate default.

### Example (Pseudo-code):
```java
class PaymentProcessor {
    void processPayment() {
        print("Processing standard bank transfer.");
    }
}

class CryptoProcessor extends PaymentProcessor {
    // Overriding the parent method
    void processPayment() {
        print("Processing Bitcoin transaction via blockchain.");
    }
}
```

### Dynamic Method Dispatch
Dynamic method dispatch is the mechanism by which a call to an overridden method is resolved at run-time rather than at compile-time.

To understand this, look at how objects are often instantiated in strict OOP environments: `PaymentProcessor myProcessor = new CryptoProcessor();`

Here, the reference variable (`myProcessor`) is of type `PaymentProcessor`, but the actual object sitting in memory is a `CryptoProcessor`.

If you call `myProcessor.processPayment()`, the system uses dynamic method dispatch to look at the actual object in memory at the exact moment the code is running, and executes the `CryptoProcessor`'s version of the method, not the parent's version.

#### Why Dynamic Dispatch Only Applies to Overriding (Not Overloading)
- **Overloading is resolved early (Static Binding):** Because overloaded methods have different parameter lists, the compiler knows exactly which method you intend to call before the program even runs. If you pass one number, it links the call to the one-parameter method. If you pass two, it links it to the two-parameter method. The decision is made at compile-time.
- **Overriding is resolved late (Dynamic Binding):** Because overridden methods have the exact same signature, the compiler cannot always know which version to call just by looking at the code. If a parent reference is holding a child object, the compiler just says, "Well, the method exists in the parent, so this code is safe to compile." It defers the actual decision to the runtime environment, which must check the object's true identity in memory to dispatch the correct method.

### Summary
"Method overloading is a compile-time concept where methods share a name but have different signatures. Method overriding is a run-time concept where a subclass alters the implementation of an inherited method with the exact same signature. Because the signatures in overriding are identical, the system uses dynamic method dispatch at run-time to determine which object's method to execute."

---

### Crucial Nuance: The Varargs Ambiguity Trap

A common edge-case question involves overloading a method where one version takes a specific type and another takes varargs (e.g., `void print(int x)` vs `void print(int... x)`). If you call `print(5)`, which one wins? Java resolves this at compile-time by heavily favoring the most specific, fixed-arity match. The varargs method is considered an absolute last resort by the compiler. However, if you have two varargs methods (like `int...` vs `Integer...`), calling it without arguments can cause a compile-time ambiguity error, grinding the build to a halt.
