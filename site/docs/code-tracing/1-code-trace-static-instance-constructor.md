---
id: 1-code-trace-static-instance-constructor
title: "Code Trace: Static Block vs Instance Block vs Constructor Execution Order"
description: "Master Java's initialization order across class loading, inheritance hierarchies, initializer blocks, and constructors with step-by-step bytecode analysis."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the following Java code involving inheritance, static initializer blocks, instance initializer blocks, and constructors, what is the exact output in order? Explain why static blocks run when they do, and how the JVM compiler synthesizes `<clinit>` and `<init>` methods."
>
> ```java
> class Parent {
>     static {
>         System.out.println("1. Parent Static Block");
>     }
>     {
>         System.out.println("3. Parent Instance Block");
>     }
>     Parent() {
>         System.out.println("4. Parent Constructor");
>     }
> }
> 
> class Child extends Parent {
>     static {
>         System.out.println("2. Child Static Block");
>     }
>     {
>         System.out.println("5. Child Instance Block");
>     }
>     Child() {
>         System.out.println("6. Child Constructor");
>     }
>     public static void main(String[] args) {
>         System.out.println("--- Main Starts ---");
>         new Child();
>         System.out.println("--- Second Instantiation ---");
>         new Child();
>     }
> }
> ```

---

Most candidates know "static blocks run before constructors." The actual test here is whether you know *why* — the JVM runs two genuinely separate phases: loading the class (`<clinit>`) and creating an instance of it (`<init>`), and the rules are different for each.

---

### Exact Output

```text
1. Parent Static Block
2. Child Static Block
--- Main Starts ---
3. Parent Instance Block
4. Parent Constructor
5. Child Instance Block
6. Child Constructor
--- Second Instantiation ---
3. Parent Instance Block
4. Parent Constructor
5. Child Instance Block
6. Child Constructor
```

---

### Step-by-Step Execution Trace

<Diagram>
<Row>
<Box title="Phase 1: Class Loading (<clinit>)" accent="#818cf8">
<Field icon="1️⃣" code="Parent static block" variant="neutral" />
<Field icon="2️⃣" code="Child static block" variant="neutral" />
</Box>
<Arrow label="class now loaded" />
<Box title="Phase 2: main() runs" accent="#60a5fa">
<Field icon="▶️" code="prints '--- Main Starts ---'" variant="neutral" />
</Box>
<Arrow label="new Child() #1" />
<Box title="Phase 3: First instantiation (<init>)" accent="#34d399">
<Field icon="3️⃣" code="Parent instance block" variant="neutral" />
<Field icon="4️⃣" code="Parent constructor" variant="neutral" />
<Field icon="5️⃣" code="Child instance block" variant="neutral" />
<Field icon="6️⃣" code="Child constructor" variant="neutral" />
</Box>
<Arrow label="new Child() #2" />
<Box title="Phase 4: Second instantiation" accent="#f59e0b">
<Field icon="🔁" code="repeats steps 3–6 only" hint="static blocks are skipped — class is already loaded" variant="neutral" />
</Box>
</Row>
</Diagram>

#### Detailed Breakdown of Critical Inflection Points:

1. **Why do static blocks run before `main starts`?**
   Before the JVM can invoke the `main` method of `Child`, it must load, link, and initialize `Child.class`. Since `Child extends Parent`, the JVM specification mandates that all superclasses must be fully initialized before a subclass can be initialized. Thus, `Parent`'s static initializers execute first, followed immediately by `Child`'s static initializers, all **before line 1 of `main()` begins**.

2. **The Inheritance Trap: Child Static vs. Parent Instance:**
   Candidates often guess that `Parent Instance Block` runs before `Child Static Block`. This is false. **All static initializers across the entire class hierarchy execute during class loading**, which finishes entirely before any object instantiation begins.

3. **Why do static blocks not run on the second `new Child()`?**
   Static blocks are compiled into a synthetic static method called `<clinit>` (Class Initializer). The JVM ClassLoader executes `<clinit>` exactly once when the class is first loaded into memory (JVM Metaspace). Subsequent object instantiations skip class loading entirely.

4. **Instance Blocks execute inside the Constructor (`<init>`):**
   Java does not have an independent bytecode concept for "instance initializer blocks." The Java compiler (`javac`) physically extracts all instance variable assignments and `{ ... }` instance initializer blocks and **inlines them directly into every constructor** (`<init>`), positioned immediately after the `super(...)` call and before the constructor's own body.

---

### What javac Actually Generates: `<clinit>` vs `<init>`

Understanding how `javac` transforms source code into bytecode demystifies the execution order:

| Source Construct | Synthesized JVM Method | Invocation Trigger | Execution Frequency |
| :--- | :--- | :--- | :--- |
| `static { ... }` and `static T x = val;` | `<clinit>` (Class Initializer) | First active use of class (e.g. `main()`, static access, `new`) | Exactly once per ClassLoader lifecycle |
| `{ ... }` and instance `T y = val;` | Inlined inside `<init>` (Constructor) | After `super(...)` returns, before constructor body | Once per `new` instantiation |
| Class constructor `Class() { ... }` | `<init>` (Instance Initializer) | Explicit `new Class()` call | Once per `new` instantiation |

```text
// Simplified Java Bytecode representation for Child.<init>
Method Child.<init>() {
    aload_0
    invokespecial Parent.<init>()  // 1. Invoke Superclass Constructor
    
    // Inlined Child Instance Initializer Block:
    getstatic java/lang/System.out
    ldc "5. Child Instance Block"
    invokevirtual PrintStream.println()
    
    // Child Constructor Body:
    getstatic java/lang/System.out
    ldc "6. Child Constructor"
    invokevirtual PrintStream.println()
    
    return
}
```

---

### The Follow-Up Trap: What If a Static Block Throws?

Interviewers frequently follow up with: *"What happens if a static block throws an uncaught exception?"*

If an uncaught exception (such as `NullPointerException` or `ArithmeticException`) occurs inside a static block:
1. The JVM wraps it in an **`ExceptionInInitializerError`** and aborts class initialization.
2. The class enters an erroneous state in the ClassLoader registry.
3. If code subsequently attempts to catch the exception and instantiate the class again, the JVM **will not re-run the static block**. Instead, it immediately throws a **`NoClassDefFoundError`**:

```java
public class BrokenClass {
    static {
        int x = 10 / 0; // Throws ArithmeticException wrapped in ExceptionInInitializerError
    }
}

// In client code:
try {
    new BrokenClass();
} catch (Throwable t) {
    System.out.println(t); // java.lang.ExceptionInInitializerError
}

// Subsequent attempt:
new BrokenClass(); // CRASHES IMMEDIATELY with java.lang.NoClassDefFoundError!
```

---

### Java: Runnable Verification

This standalone Java program verifies the entire execution lifecycle:

```java
/**
 * Standalone verification for Java class initialization ordering.
 * Run with: javac ExecutionOrderDemo.java && java ExecutionOrderDemo
 */
public class ExecutionOrderDemo {

    static class Parent {
        static {
            System.out.println("1. Parent Static Block");
        }
        {
            System.out.println("3. Parent Instance Block");
        }
        Parent() {
            System.out.println("4. Parent Constructor");
        }
    }

    static class Child extends Parent {
        static {
            System.out.println("2. Child Static Block");
        }
        {
            System.out.println("5. Child Instance Block");
        }
        Child() {
            System.out.println("6. Child Constructor");
        }
    }

    public static void main(String[] args) {
        System.out.println("--- Main Starts ---");
        System.out.println("First instantiation:");
        new Child();

        System.out.println("\nSecond instantiation:");
        new Child();
    }
}
```

---

### Say this in the interview

*"Two separate phases: class loading (`<clinit>`) runs once, superclass before subclass, entirely before `main()` starts. Instance creation (`<init>`) runs on every `new` — it calls `super()` first, which triggers the parent's instance blocks then its constructor, before coming back to run the child's instance blocks and constructor. Static blocks never run again after the first load; only `<init>` repeats on later instantiations."*
