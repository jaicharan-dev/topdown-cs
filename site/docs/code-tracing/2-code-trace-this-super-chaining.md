---
id: 2-code-trace-this-super-chaining
title: "Code Trace: this() and super() Constructor Chaining"
description: "Trace Java constructor delegation with this() and super(), master bytecode rules for instance initializers during chaining, and prevent circular recursion errors."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

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

Constructor chaining decides which constructor actually runs first — and when instance initializer blocks get mixed in, most people guess wrong about exactly where they fire.

---

### Exact Output

```text
1. Vehicle: Car - Sedan
2. Car instance initializer
3. Car parameterized: Sedan
4. Car no-arg constructor
```

---

### Step-by-Step: How the Call Stack Builds Up

Before anything prints, the stack has to grow all the way down to `Vehicle` — none of these constructors run their own body until the delegation chain bottoms out:

<Diagram>
<Row>
<Box title="Car()" accent="#60a5fa"><Field icon="📞" code={'this("Sedan")'} hint="delegates before running its own body" variant="neutral" /></Box>
<Arrow label="pushes" />
<Box title="Car(String)" accent="#34d399"><Field icon="📞" code={'super("Car - Sedan")'} hint="delegates before running its own body" variant="neutral" /></Box>
<Arrow label="pushes" />
<Box title="Vehicle(String)" accent="#f59e0b"><Field icon="▶️" code="runs first" hint="bottom of the chain — nothing left to delegate to" variant="neutral" /></Box>
</Row>
</Diagram>

Now it unwinds, each frame finishing and popping in reverse:

1. **`Vehicle("Car - Sedan")` runs and pops** → prints `"1. Vehicle: Car - Sedan"`, returns to `Car(String)`.
2. **Back in `Car(String)`** — this is the constructor that called `super()`, so the compiler inlines the instance initializer right here → prints `"2. Car instance initializer"`, then `"3. Car parameterized: Sedan"`. Pops, returns to `Car()`.
3. **Back in `Car()`** → prints `"4. Car no-arg constructor"`. Pops — object construction complete.

---

### Why You Can Never Write Both `this()` and `super()`

Java Language Specification (JLS §8.8.7) dictates a strict architectural invariant:
> *If a constructor body begins with an explicit constructor invocation, that invocation must be either an alternate constructor invocation (`this(...)`) or a superclass constructor invocation (`super(...)`), but never both.*

#### The Mechanics:
1. **The Invisible `super()`:** If you do not write an explicit `this(...)` or `super(...)` on the first line, `javac` automatically synthesizes an implicit `super();` (no-arg) call.
2. **The Delegation Hand-Off:** If you explicitly write `this(...)`, the compiler **suppresses the implicit `super();`**.
3. **The Double-Initialization Danger:** An object in memory must have its superclass state initialized **exactly once**. If `Car()` could call `super()` and then call `this("Sedan")`, `Car("Sedan")` would also call `super()`. The JVM would attempt to construct the `Vehicle` base sub-object twice on the same memory block, corrupting state and breaking object immutability.

---

### The Nuance: Where Exactly Do Instance Initializers Run?

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

### Two Classic Traps

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

### Java: Runnable Verification

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

### Say this in the interview

*"A constructor delegates fully before running its own body — `this()` and `super()` both push a new frame and wait. You can never write both, because Java guarantees the superclass gets initialized exactly once per object; `this()` suppresses the implicit `super()` and hands that responsibility to the target constructor instead. Instance initializers only get inlined into whichever constructor actually calls `super()` — not into ones that delegate via `this()` — so they run exactly once, no matter how long the delegation chain is."*
