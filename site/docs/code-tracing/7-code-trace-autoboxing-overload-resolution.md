---
id: 7-code-trace-autoboxing-overload-resolution
title: "Code Trace: Autoboxing & Overload Resolution Priority"
description: "Master Java's 3-phase method overload resolution algorithm (JLS §15.12.2), widening vs boxing hierarchies, and ambiguous method traps."
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

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

Java picks an overload entirely at compile time, before the program ever runs — and it does it in a strict order of preference: an exact match first, then widening a primitive to a bigger primitive, and only as a last resort, boxing it into a wrapper object like `Integer`. That order is the whole puzzle here.

---

### Exact Output

```text
int version: 5
```

If `process(int x)` is commented out or removed, the code prints:
```text
long version: 5
```

---

### Step-by-Step Resolution Trace

1. **With all three overloads present:** `5` is a primitive `int`, and `process(int x)` is an exact match. Java binds to it immediately — `int version: 5`.
2. **With `process(int x)` deleted:** the candidates are `process(Integer x)` and `process(long x)`. The natural guess is "5 is an int, so it boxes to `Integer`" — but that's wrong. Java picks `process(long x)` — `long version: 5`.

---

### The 3-Phase Resolution Algorithm (JLS §15.12.2)

Java tries three phases, in order, and stops at the first one that finds a match:

<Diagram>
<Row>
<Box title="Phase 1: no boxing, no varargs" accent="#34d399"><Field icon="1️⃣" code="exact match, or widen the primitive (int → long)" hint="int → long succeeds here, so the search stops" variant="neutral" /></Box>
<Arrow label="only checked if Phase 1 finds nothing" />
<Box title="Phase 2: boxing allowed" accent="#f59e0b"><Field icon="2️⃣" code="autobox (int → Integer)" hint="never reached in this example" variant="neutral" /></Box>
<Arrow label="only checked if Phase 2 finds nothing" />
<Box title="Phase 3: varargs allowed" accent="#94a3b8"><Field icon="3️⃣" code="match a T... parameter" hint="last resort" variant="neutral" /></Box>
</Row>
</Diagram>

That's the whole reason `long` beats `Integer`: primitive widening is found in Phase 1, so the compiler locks it in and never even looks at Phase 2's autoboxing option.

---

### Compiler Rules Worth Knowing

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

### Classic Ambiguity Traps

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

### Java: Runnable Verification

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

### Say this in the interview

*"With all three overloads present, c.process(5) binds to process(int x) — an exact match. Remove that overload, and Java picks process(long x), not process(Integer x), because overload resolution runs in three phases and stops at the first one that finds a match: Phase 1 allows widening a primitive (int to long), Phase 2 allows autoboxing, Phase 3 allows varargs. Since widening to long succeeds in Phase 1, the compiler locks that in and never even considers autoboxing in Phase 2. That's why widening always beats boxing — it's not about which type is 'closer' semantically, it's purely about which phase finds a match first."*
