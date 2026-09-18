---
id: 20-method-hiding-vs-overriding
title: "Method Hiding vs. Method Overriding: Static vs. Instance Resolution"
sidebar_position: 20
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "We briefly touched on this earlier, but I want to dig deeper: what is the actual, mechanical difference between method overriding and method hiding under the hood?"

"Method overriding occurs when a child class redefines an instance method of its parent, and the call is resolved at run-time based on the actual object in memory. Method hiding occurs when a child class redefines a static method of its parent, and the call is resolved at compile-time based strictly on the reference type."

### The Core Differences
To ace this explanation, frame it around how the JVM makes its decisions.

| Feature | Method Overriding | Method Hiding |
|---|---|---|
| **Method Type** | Applies to **Instance** methods (non-static). | Applies to **Static** methods. |
| **Binding Mechanism** | **Dynamic Binding:** Resolved at run-time (Dynamic Method Dispatch). | **Static Binding:** Resolved early at compile-time. |
| **Decision Factor** | Based on the **actual object** instantiated in memory. | Based on the **reference variable type** declared in the code. |
| **Annotation Support** | The `@Override` annotation is highly recommended and valid. | The `@Override` annotation will cause a compiler error. |

### The Code Proof (How to explain it on a whiteboard)
The best way to prove you understand this is to show what happens when the reference type and the object type do not match.

### 1. The Setup:
```java
class Parent {
    // Static method (Will be hidden)
    static void staticMethod() {
        System.out.println("Parent's Static Method");
    }

    // Instance method (Will be overridden)
    void instanceMethod() {
        System.out.println("Parent's Instance Method");
    }
}

class Child extends Parent {
    // Hiding the parent's static method
    static void staticMethod() {
        System.out.println("Child's Static Method");
    }

    // Overriding the parent's instance method
    @Override
    void instanceMethod() {
        System.out.println("Child's Instance Method");
    }
}
```

### 2. The Execution (The Trap):
```java
public class Main {
    public static void main(String[] args) {
        // Reference is Parent, Object is Child
        Parent myRef = new Child();
        
        // Testing Hiding vs Overriding
        myRef.staticMethod();   // Which one runs?
        myRef.instanceMethod(); // Which one runs?
    }
}
```

### 3. The Output & Explanation:
- `myRef.staticMethod();` outputs: `"Parent's Static Method"`
  - *Why? (Method Hiding):* Because the method is static, the compiler does not care what object was created with `new Child()`. It only looks at the reference variable `Parent myRef`. It binds the call to the `Parent` class at compile-time. The child's static method is effectively "hidden" in this context.
- `myRef.instanceMethod();` outputs: `"Child's Instance Method"`
  - *Why? (Method Overriding):* Because the method is an instance method, the compiler says, "This is safe to compile, but I'll let the JVM figure out the rest later." At run-time, the JVM looks at the heap, sees that the actual object is a `Child`, and dynamically dispatches the call to the overridden `Child` method.

### Summary
"Overriding is polymorphism in action - the behavior changes based on the object you create. Hiding is simply shadowing - the behavior is locked to the reference type you declare, bypassing polymorphism entirely."

---

### Crucial Nuance: Variable Hiding vs Method Overriding

While methods can be overridden to achieve polymorphism, **instance variables are never overridden in Java**; they are only hidden. If a child class defines a variable with the exact same name as a parent class variable, the child's variable simply hides the parent's. Just like static method hiding, the variable accessed is determined strictly by the reference type at compile-time, not the actual object at runtime. This leads to wildly confusing bugs if you try to use polymorphism with state instead of behavior!
