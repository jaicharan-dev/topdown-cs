---
id: 2-code-trace-this-super-chaining
title: "Code Trace: this() and super() Constructor Chaining"
description: "Trace Java constructor delegation with this() and super(), master bytecode rules for instance initializers during chaining, and prevent circular recursion errors."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact output of this code in order? Explain why a constructor can never call both `this()` and `super()`, how instance initializer blocks behave during delegation, and what happens if constructor chaining forms a cycle."
>
> ```java
> class Vehicle {
>     Vehicle() {
>         System.out.println("1. Vehicle no-arg");
>     }
>     Vehicle(String type) {
>         System.out.println("1. Vehicle: " + type);
>     }
> }
> 
> class Car extends Vehicle {
>     {
>         System.out.println("2. Car instance initializer");
>     }
>     Car() {
>         this("Sedan");
>         System.out.println("4. Car no-arg constructor");
>     }
>     Car(String model) {
>         super("Car - " + model);
>         System.out.println("3. Car parameterized: " + model);
>     }
>     public static void main(String[] args) {
>         new Car();
>     }
> }
> ```

---

Constructor chaining via `this()` and `super()` is fundamental to object-oriented programming. In technical interviews, this problem is commonly extended with **instance initializer blocks** to test whether you know when the compiler injects initialization logic during constructor delegation.

---

### 1. Exact Output

```text
1. Vehicle: Car - Sedan
2. Car instance initializer
3. Car parameterized: Sedan
4. Car no-arg constructor
```

---

### 2. Step-by-Step Call Stack Trace

```text
CALL STACK PROGRESSION:

Step 1: main() executes: new Car()
  [Stack] -> Car()
  
Step 2: Line 1 of Car() is this("Sedan")
  [Stack] -> Car() -> Car("Sedan")

Step 3: Line 1 of Car("Sedan") is super("Car - Sedan")
  [Stack] -> Car() -> Car("Sedan") -> Vehicle("Car - Sedan")

EXECUTION & POPPING:

Step 4: Vehicle("Car - Sedan") executes:
  Prints: "1. Vehicle: Car - Sedan"
  Pops frame -> Returns control to Car("Sedan")

Step 5: Control returns to Car("Sedan"):
  * Compiler inlines instance initializer block!
  Prints: "2. Car instance initializer"
  Prints: "3. Car parameterized: Sedan"
  Pops frame -> Returns control to Car()

Step 6: Control returns to Car():
  Prints: "4. Car no-arg constructor"
  Pops frame -> Object creation complete.
```

---

### 3. The Core Concept: Why Never Both `this()` and `super()`?

Java Language Specification (JLS §8.8.7) dictates a strict architectural invariant:
> *If a constructor body begins with an explicit constructor invocation, that invocation must be either an alternate constructor invocation (`this(...)`) or a superclass constructor invocation (`super(...)`), but never both.*

#### The Mechanics:
1. **The Invisible `super()`:** If you do not write an explicit `this(...)` or `super(...)` on the first line, `javac` automatically synthesizes an implicit `super();` (no-arg) call.
2. **The Delegation Hand-Off:** If you explicitly write `this(...)`, the compiler **suppresses the implicit `super();`**.
3. **The Double-Initialization Danger:** An object in memory must have its superclass state initialized **exactly once**. If `Car()` could call `super()` and then call `this("Sedan")`, `Car("Sedan")` would also call `super()`. The JVM would attempt to construct the `Vehicle` base sub-object twice on the same memory block, corrupting state and breaking object immutability.

---

### 4. The Staff-Level Nuance: Where Do Instance Initializers Run?

Notice that `Car` contains an instance initializer block:
```java
{
    System.out.println("2. Car instance initializer");
}
```

A common interview trap is asking: *"Since `Car()` is the constructor initially called by `new Car()`, does the instance initializer run inside `Car()` or inside `Car(String)`? Does it execute twice?"*

#### The Compiler Inlining Rule:
`javac` inlines instance initializers and field declarations **ONLY into constructors that invoke `super(...)`**, immediately after the `super(...)` call returns.

- Constructors that invoke `this(...)` **NEVER receive inlined instance initializers**.
- If `javac` inlined instance blocks into `Car()` as well as `Car(String)`, the instance initializer would execute twice for a single object instantiation!
- Therefore, the instance block runs **exactly once**, inside `Car(String model)`, immediately after `Vehicle("Car - Sedan")` completes.

---

### 5. Two Classic Interview Traps

#### Trap 1: "Cannot reference `this` before supertype constructor has been called"
Can you write `super(this.defaultModel);` or pass an instance method to `super()`?
```java
class Car extends Vehicle {
    private String defaultModel = "Sedan";

    Car() {
        super(defaultModel); // COMPILE ERROR!
    }
}
```
**Why?** Before `super(...)` returns, the current object's memory representation is strictly uninitialized. The `this` pointer does not yet refer to a valid, fully formed object. The compiler statically rejects any reference to instance fields or methods in the arguments to `super(...)` or `this(...)`. (Static fields and static methods are permitted because they do not depend on object state).

#### Trap 2: Circular Constructor Recursion
What happens if two constructors mutually delegate via `this()`?
```java
class Cycle {
    Cycle() {
        this(10);
    }
    Cycle(int x) {
        this(); // Recursive constructor invocation!
    }
}
```
In regular method recursion, infinite calls compile fine and crash at runtime with a `StackOverflowError`. 

However, Java's compiler statically checks constructor call graphs at compile time. It rejects circular constructor chains with a **compile-time error: `recursive constructor invocation`**.

---

### 6. Runnable Verification Code

```java
/**
 * Standalone verification of this() and super() constructor chaining.
 * Run with: javac ConstructorChainingDemo.java && java ConstructorChainingDemo
 */
public class ConstructorChainingDemo {

    static class Vehicle {
        Vehicle() {
            System.out.println("1. Vehicle no-arg");
        }
        Vehicle(String type) {
            System.out.println("1. Vehicle: " + type);
        }
    }

    static class Car extends Vehicle {
        // Instance initializer block
        {
            System.out.println("2. Car instance initializer");
        }

        Car() {
            this("Sedan"); // Delegates to sibling constructor
            System.out.println("4. Car no-arg constructor");
        }

        Car(String model) {
            super("Car - " + model); // Delegates to parent constructor
            System.out.println("3. Car parameterized: " + model);
        }
    }

    public static void main(String[] args) {
        System.out.println("Starting object construction:");
        new Car();
        System.out.println("Object construction complete.");
    }
}
```

---

### 7. Concise Staff-Level Interview Answer

> "The execution order is: `Vehicle parameterized` first, followed by `Car instance initializer`, `Car parameterized`, and finally `Car no-arg`.
>
> When `new Car()` executes, `Car()` immediately uses `this("Sedan")` to delegate initialization to its sibling constructor, pushing it onto the call stack. `Car("Sedan")` then invokes `super("Car - Sedan")`, which constructs the parent `Vehicle` first.
>
> A constructor can never invoke both `this()` and `super()` because Java guarantees that the superclass state is initialized exactly once per object creation. When `this()` is used, the compiler suppresses the implicit `super()` call and transfers the duty of calling `super()` to the target constructor.
>
> Crucially, `javac` inlines instance initializer blocks and field declarations strictly into the constructor that calls `super()`, immediately after `super()` returns. Therefore, `Car`'s instance initializer block executes exactly once, inside `Car(String)`, before control returns to `Car()` to complete construction."
