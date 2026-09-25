---
id: 7-code-trace-autoboxing-overload-resolution
title: "Code Trace: Autoboxing & Overload Resolution Priority"
description: "Master Java's 3-phase method overload resolution algorithm (JLS §15.12.2), widening vs boxing hierarchies, and ambiguous method traps."
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Given the following Java class with overloaded methods:
> ```java
> class Calc {
>     void process(int x) {
>         System.out.println("int version: " + x);
>     }
>     void process(Integer x) {
>         System.out.println("Integer version: " + x);
>     }
>     void process(long x) {
>         System.out.println("long version: " + x);
>     }
>     public static void main(String[] args) {
>         Calc c = new Calc();
>         c.process(5);
>     }
> }
> ```
> Which overload gets called, and why? What happens if `process(int x)` is deleted? Explain the formal 3-phase overload resolution algorithm defined in JLS §15.12.2, why widening beats autoboxing, and the 'ambiguous method call' traps."

---

Method overloading in Java is resolved entirely at **compile time** using static type information. 

While candidates often assume that the compiler searches for the "closest semantic type," the Java Language Specification (JLS §15.12.2) mandates a strict **three-phase algorithm** that prioritizes primitive widening over autoboxing to maintain backward compatibility with Java 1.0.

---

### 1. Exact Output

```text
int version: 5
```

If `process(int x)` is commented out or removed, the code prints:
```text
long version: 5
```

---

### 2. Step-by-Step Resolution Trace

1. **Initial Call (`c.process(5)`):**
   - The literal `5` is a primitive `int` (32-bit signed two's complement integer).
   - The compiler searches candidate methods and finds an exact primitive signature match: `process(int x)`.
   - It binds directly to `process(int)` $\implies$ Output: **`int version: 5`**.

2. **The Follow-Up Trap (Deleting `process(int)`):**
   - Remaining candidates: `process(Integer x)` and `process(long x)`.
   - **The Common Misconception:** "5 is an integer, so Java will box it into an `Integer` object."
   - **The Reality:** Java selects `process(long x)` $\implies$ Output: **`long version: 5`**.

---

### 3. The Formal 3-Phase Resolution Algorithm (JLS §15.12.2)

To preserve backward compatibility when Autoboxing and Varargs were introduced in Java 5, the Java Language Specification formalized overload resolution into three sequential phases:

```text
CALL: c.process(5)  [Argument type: primitive int]
                       |
                       v
+-------------------------------------------------------------+
| PHASE 1: Subtyping WITHOUT Boxing or Varargs                |
|   1. Exact match? (int -> int)             [FOUND if present|
|   2. Primitive widening? (int -> long)     [FOUND if no int]|
|      byte -> short -> int -> long -> float -> double        |
|   3. Reference widening? (Sub -> Super)                     |
+-------------------------------------------------------------+
                       |
     Found in Phase 1? +---> YES ---> TERMINATE & BIND METHOD!
                       |              (Phase 2 is NEVER reached!)
                       v NO
+-------------------------------------------------------------+
| PHASE 2: Subtyping WITH Boxing/Unboxing, NO Varargs         |
|   1. Autoboxing: (int -> Integer)                           |
|   2. Boxing + Reference Widening: (int -> Integer -> Number)|
+-------------------------------------------------------------+
                       |
     Found in Phase 2? +---> YES ---> TERMINATE & BIND METHOD!
                       v NO
+-------------------------------------------------------------+
| PHASE 3: Variable Arity (Varargs)                           |
|   1. Varargs matching: (int... x or Object... x)            |
+-------------------------------------------------------------+
```

#### Why Widening Beats Autoboxing:
Because `process(long x)` is identified during **Phase 1** (primitive widening), the compiler immediately selects it and **terminates the search**. The compiler does not even evaluate Phase 2 (Autoboxing), which is why `long` always defeats `Integer`.

---

### 4. Critical Compiler Rules & Constraints

#### Rule 1: You Cannot Widen and Then Autobox
Can a `short` primitive be passed to a method expecting an `Integer`?
```java
void test(Integer x) { ... }

short s = 5;
test(s); // COMPILE ERROR!
```
**Why?** In method invocation context, Java allows:
- Primitive widening (`short -> int`).
- Autoboxing (`short -> Short`).
- Autoboxing followed by reference widening (`short -> Short -> Number`).

However, Java strictly **forbids primitive widening followed by autoboxing** (`short -> int -> Integer`). The wrapper type must match the primitive type exactly before boxing.

#### Rule 2: You Can Autobox and Then Widen Reference Types
An `int` primitive can be passed to a method expecting `Number` or `Object`:
```java
void test(Number n) { ... }

test(5); // VALID! Boxes int -> Integer, then widens Integer -> Number
```

---

### 5. Classic Ambiguity Compilation Traps

#### Trap A: Cross-Boxing Ambiguity
What happens if two overloaded methods mix primitive and wrapper types?
```java
class AmbiguityDemo {
    static void compute(int a, Integer b) { System.out.println("1"); }
    static void compute(Integer a, int b) { System.out.println("2"); }

    public static void main(String[] args) {
        compute(5, 5); // COMPILE ERROR!
    }
}
```
**The Error:** `reference to compute is ambiguous`.
In Phase 2, both methods require boxing one argument and passing the other as a primitive. Neither method is more specific than the other, causing a compile-time failure.

#### Trap B: The Ambiguous `null` Trap
When passing literal `null`, which overload runs?
```java
class NullOverload {
    static void show(Object o) { System.out.println("Object"); }
    static void show(String s) { System.out.println("String"); }

    public static void main(String[] args) {
        show(null); // Prints "String"!
    }
}
```
- Both `Object` and `String` can accept `null`.
- The compiler applies the **"Most Specific Method"** rule (JLS §15.12.2.5). Because `String` is a subtype of `Object`, `String` is strictly more specific. It outputs **`String`**.

#### Trap C: The Conflicting `null` Failure
```java
class ConflictingNull {
    static void show(Integer i) { System.out.println("Integer"); }
    static void show(String s)  { System.out.println("String"); }

    public static void main(String[] args) {
        show(null); // COMPILE ERROR: reference to show is ambiguous!
    }
}
```
Because neither `Integer` nor `String` is a subtype of the other, the compiler cannot determine a most-specific method and rejects the invocation.

---

### 6. Runnable Java Verification Code

```java
/**
 * Standalone Java verification for 3-Phase Method Overload Resolution.
 * Run with: javac OverloadPriorityDemo.java && java OverloadPriorityDemo
 */
public class OverloadPriorityDemo {

    static class Engine {
        // Phase 1: Exact match
        void process(int x) {
            System.out.println("Phase 1 (Exact): int " + x);
        }

        // Phase 1: Widening
        void process(long x) {
            System.out.println("Phase 1 (Widening): long " + x);
        }

        // Phase 2: Autoboxing
        void process(Integer x) {
            System.out.println("Phase 2 (Autoboxing): Integer " + x);
        }

        // Phase 3: Varargs
        void process(int... x) {
            System.out.println("Phase 3 (Varargs): int... (length " + x.length + ")");
        }
    }

    public static void main(String[] args) {
        Engine e = new Engine();

        System.out.println("Test with exact match present:");
        e.process(5); // Calls process(int)

        System.out.println("\nTesting 'most specific' null resolution:");
        testNull((String) null); // Calls String overload
    }

    static void testNull(Object o) { System.out.println("Object version"); }
    static void testNull(String s) { System.out.println("String version"); }
}
```

---

### 7. Concise Staff-Level Interview Answer

> "With all three methods present, `c.process(5)` invokes `process(int x)` because `5` is a primitive `int`, resulting in an exact match.
>
> If `process(int x)` is removed, the compiler selects `process(long x)`, NOT `process(Integer x)`.
>
> This behavior is mandated by the formal 3-phase overload resolution algorithm in JLS §15.12.2:
> 1. **Phase 1** checks subtyping without boxing or varargs (exact matches, primitive widening, and reference widening).
> 2. **Phase 2** permits autoboxing and unboxing.
> 3. **Phase 3** permits varargs.
>
> Because primitive widening from `int` (32-bit) to `long` (64-bit) succeeds in Phase 1, the compiler immediately terminates and selects `process(long)`. It never enters Phase 2, meaning primitive widening always takes precedence over autoboxing. This design guarantees backward compatibility with pre-Java 5 code and minimizes heap allocation overhead."
