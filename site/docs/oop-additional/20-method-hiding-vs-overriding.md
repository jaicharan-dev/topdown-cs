---
id: 20-method-hiding-vs-overriding
title: "Method Hiding vs. Method Overriding"
description: "Why static methods are hidden rather than overridden, what the bytecode actually does, and what happens if you mix static and instance methods across a hierarchy."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact mechanical difference between method overriding and method hiding? Why can't a static method be overridden, what does the JVM bytecode reveal, and what happens if a child class tries to redefine an instance method as static?"

### The analogy

- **Overriding — the local branch's policy.** Headquarters has a default refund policy. The Tokyo branch overrides it with its own version. Because you're physically standing in the Tokyo store, Tokyo's policy is what runs.
- **Hiding — a billboard next to a billboard.** HQ puts up a billboard on the highway. The local branch puts up its own billboard right next to it — it doesn't replace HQ's, it just stands alongside it. If you're looking specifically toward HQ's sign, that's the one you see, no matter what the branch put up.

Both look the same in code — a subclass redefines a method with the same name and signature as its parent's. But under the hood, they resolve completely differently.

<Diagram>
<Row>
<Box title="Overriding (instance methods)" accent="#34d399">
<Field icon="🔄" code="resolved at runtime" hint="depends on the actual object — real polymorphism" variant="neutral" />
</Box>
<Box title="Hiding (static methods)" accent="#a1a1aa">
<Field icon="🔒" code="resolved at compile time" hint="depends on the declared reference type — no polymorphism" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Comparison

| | Method Overriding | Method Hiding |
| :--- | :--- | :--- |
| **Applies to** | Instance methods (non-static, non-private, non-final) | Static methods |
| **Resolved when** | Runtime, via the v-table | Compile time |
| **Decided by** | The actual heap object | The declared reference type |
| **Bytecode** | `invokevirtual` / `invokeinterface` | `invokestatic` |
| **`@Override`** | Valid, and you should use it | Compile error — "does not override" |
| **Real polymorphism?** | Yes | No — it's just shadowing |

---

### Proof: what the bytecode actually does

```java
Parent ref = new Child();
ref.staticMethod();   // calls Parent.staticMethod()
ref.instanceMethod(); // calls Child.instanceMethod()
```

Disassemble this with `javap -c` and you'll see:

```bytecode
// 1. Static method call:
invokestatic  #4 // Method Parent.staticMethod:()V

// 2. Instance method call:
aload_1          // pushes 'ref' (the Child object) onto the stack
invokevirtual #5 // Method Parent.instanceMethod:()V
```

For the static call, the compiler throws away the reference entirely and bakes in `Parent.staticMethod()` directly — calling a static method "on an object" is just syntax sugar. For the instance call, the compiler keeps the actual object reference around so the JVM can look up its real class at runtime.

---

### Three ways people try to mix static and instance, and why they fail

1. **Instance method trying to override a static one:**
   ```java
   class Parent { static void run() {} }
   class Child extends Parent { void run() {} } // COMPILE ERROR
   ```
2. **Static method trying to hide an instance one:**
   ```java
   class Parent { void run() {} }
   class Child extends Parent { static void run() {} } // COMPILE ERROR
   ```
3. **A hidden static method still has to honor the contract** — the child's version can't be less visible than the parent's, and can't throw broader checked exceptions.

---

### Fields work the same way as static methods

Fields are never overridden either — only hidden:

```java
class Super { int score = 100; }
class Sub extends Super { int score = 200; }

Super ref = new Sub();
System.out.println(ref.score); // prints 100!
```

Both `score` fields exist in memory at once. Since field access is resolved statically, `ref.score` reads `Super.score` because that's the declared type. To get `Sub.score`, you'd need to cast.

---

### Say this in the interview

*"Overriding applies to instance methods and is resolved at runtime via the v-table — `invokevirtual`. Hiding applies to static methods and is resolved at compile time via `invokestatic`, because static methods belong to the class, not an instance. The compiler forbids mixing the two — you can't override a static method with an instance one, or vice versa. And fields behave exactly like static methods: they're always hidden, never overridden."*

---

### Code: seeing it all in one place

```java
public class HidingVsOverridingDemo {

    static class Vehicle {
        public String type = "Generic Vehicle";

        // Static method: subject to hiding
        public static void announceClass() {
            System.out.println("[Static] Vehicle: I belong to the Vehicle class.");
        }

        // Instance method: subject to overriding
        public void startEngine() {
            System.out.println("[Instance] Vehicle: Generic engine started.");
        }
    }

    static class SportsCar extends Vehicle {
        public String type = "Sports Car"; // field hiding

        // Hiding the parent's static method
        public static void announceClass() {
            System.out.println("[Static] SportsCar: I belong to the SportsCar class.");
        }

        // Overriding the parent's instance method
        @Override
        public void startEngine() {
            System.out.println("[Instance] SportsCar: Twin-turbo V8 roaring to life!");
        }
    }

    public static void main(String[] args) {
        // Reference = Vehicle, actual object = SportsCar
        Vehicle carRef = new SportsCar();

        System.out.println("--- 1. Field access (hiding) ---");
        // "Generic Vehicle" — statically bound to the declared type
        System.out.println("carRef.type: " + carRef.type);

        System.out.println("\n--- 2. Static method call (hiding) ---");
        // "[Static] Vehicle..." — statically bound, ignores the real object
        carRef.announceClass();

        System.out.println("\n--- 3. Direct static calls (best practice) ---");
        Vehicle.announceClass();
        SportsCar.announceClass();

        System.out.println("\n--- 4. Instance method call (overriding) ---");
        // "[Instance] SportsCar..." — dynamically dispatched via the v-table
        carRef.startEngine();
    }
}
```
