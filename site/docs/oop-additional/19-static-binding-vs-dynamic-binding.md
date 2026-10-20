---
id: 19-static-binding-vs-dynamic-binding
title: "Static vs. Dynamic Binding: Early vs. Late Resolution"
description: "The difference between compile-time static binding and runtime dynamic binding, plus how the JVM dispatches method calls using v-tables."
sidebar_position: 1
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the core difference between static and dynamic binding? How does the JVM decide which method implementation to execute at runtime, and what are the exact roles of bytecode dispatch instructions and the Virtual Method Table (v-table)?"

### The analogy

Think about two ways a prescription gets filled:

- **Static binding — the pre-printed label.** A pharmacy technician reads the label on the slip and pulls the exact bottle off the shelf, no questions asked. The decision was already locked in before you even walked in.
- **Dynamic binding — the ER doctor.** The clipboard just says "Patient." The doctor looks at the actual person in front of them and decides what to do on the spot.

Binding just means: which piece of code actually runs when you call a method? Static binding decides that in advance, at compile time. Dynamic binding decides it in the moment, at runtime.

<Diagram>
<Row>
<Box title="Static binding" accent="#60a5fa">
<Field icon="🔒" code="resolved at compile time" hint="static, private, final, overloaded methods" variant="neutral" />
</Box>
<Box title="Dynamic binding" accent="#34d399">
<Field icon="🔄" code="resolved at runtime" hint="overridden instance methods, via the real object" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### The core idea

- **Static binding (early binding):** the compiler picks the method based on the **declared reference type** — whatever type you wrote on the left-hand side (`Animal a`). This applies to `static`, `private`, and `final` methods, and to overloaded methods.
- **Dynamic binding (late binding):** the JVM picks the method based on the **actual object** sitting on the heap (`new Dog()`), not the variable's declared type. This is what makes method overriding work.

One thing people often miss: **fields and static methods never get dynamic dispatch.** There's no such thing as a "virtual variable" in Java. More on that below.

---

### Comparison

| | Static Binding (Early) | Dynamic Binding (Late) |
| :--- | :--- | :--- |
| **Resolved when** | Compile time, by `javac` | Runtime, by the JVM |
| **Decided by** | The declared reference type | The actual object on the heap |
| **Applies to** | `static`, `private`, `final`, overloaded methods | Overridden instance methods |
| **Polymorphism type** | Compile-time (overloading) | Runtime (overriding) |
| **Bytecode** | `invokestatic`, `invokespecial` | `invokevirtual`, `invokeinterface` |
| **Cost** | None — direct jump | Small — one v-table lookup |

---

### The bytecode instructions behind it

The JVM spec defines five instructions for invoking a method. Worth knowing by name:

1. **`invokestatic`** — calls a `static` method. Fully resolved at compile time, no object needed.
2. **`invokespecial`** — calls constructors (`<init>`), `private` methods, and `super.method()`. Also resolved statically — none of these can be overridden, so there's nothing to dispatch dynamically.
3. **`invokevirtual`** — the normal case for public/protected instance methods. Looks up the real method through the object's **v-table** at runtime.
4. **`invokeinterface`** — same idea, but for methods called through an interface type. Slightly more work than `invokevirtual` because a class can implement several interfaces at once.
5. **`invokedynamic`** (Java 7+) — used for lambdas and method references. Not something you'll hand-write, just good to recognize.

---

### How the v-table actually works

Every class gets a v-table (virtual method table) built when it's loaded — basically an array of method pointers, one slot per overridable method.

- `Animal` has `makeSound()` at, say, slot 2.
- `Dog extends Animal` and overrides `makeSound()` — so in `Dog`'s v-table, slot 2 now points to `Dog.makeSound()` instead of `Animal.makeSound()`. Same slot, new target.
- Any method `Dog` doesn't override (like `equals()`) just keeps pointing to `Object`'s version.

When you call `animalRef.makeSound()`, the JVM follows the object's header to its class metadata, jumps to slot 2 in that class's v-table, and runs whatever is there. That's an O(1) lookup — fast, and why dynamic dispatch barely costs anything in practice.

---

### The trap: fields and static methods are never dynamic

This one catches people out because it looks just like overriding, but isn't:

```java
class Parent {
    int value = 10;
    static void printType() { System.out.println("Parent Static"); }
}

class Child extends Parent {
    int value = 20; // hides Parent.value, doesn't override it
    static void printType() { System.out.println("Child Static"); } // hides, doesn't override
}

Parent obj = new Child();
System.out.println(obj.value); // prints 10, not 20!
obj.printType();               // prints "Parent Static", not "Child Static"!
```

Fields and static methods are always resolved from the **declared type** (`Parent`), at compile time — never from the real object. There's no v-table involved at all.

---

### Say this in the interview

*"Static binding happens at compile time, based on the declared type — it covers static, private, and final methods. Dynamic binding happens at runtime, based on the actual object, via the v-table — that's what powers overriding. The one trap to mention: fields and static methods are always statically bound, even when accessed through a polymorphic reference — they never participate in dynamic dispatch."*

---

### Code: proving it

```java
public class BindingMechanics {

    static class Superclass {
        // Field (statically bound)
        public String name = "Superclass Field";

        // Static method (statically bound via invokestatic)
        public static void identify() {
            System.out.println("[Static] Superclass.identify()");
        }

        // Instance method (dynamically bound via invokevirtual)
        public void execute() {
            System.out.println("[Virtual] Superclass.execute()");
        }
    }

    static class Subclass extends Superclass {
        // Field hiding
        public String name = "Subclass Field";

        // Method hiding
        public static void identify() {
            System.out.println("[Static] Subclass.identify()");
        }

        // Method overriding
        @Override
        public void execute() {
            System.out.println("[Virtual] Subclass.execute()");
        }
    }

    public static void main(String[] args) {
        // Reference type: Superclass | Actual heap object: Subclass
        Superclass polymorphicRef = new Subclass();

        System.out.println("--- 1. Field access (static binding) ---");
        System.out.println("Accessed Field: " + polymorphicRef.name);
        // Output: "Superclass Field"

        System.out.println("\n--- 2. Static method call (static binding) ---");
        polymorphicRef.identify();
        // Output: "[Static] Superclass.identify()"

        System.out.println("\n--- 3. Overridden method call (dynamic binding) ---");
        polymorphicRef.execute();
        // Output: "[Virtual] Subclass.execute()"
    }
}
```
