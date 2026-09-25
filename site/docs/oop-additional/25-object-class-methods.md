---
id: 25-object-class-methods
title: "The Object Class and Its Core Methods"
description: "A comprehensive review of the 11 methods in java.lang.Object, the 5 contracts of equals(), hashCode() mechanics, and getClass() vs instanceof."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Every class in Java inherits from `java.lang.Object`. What are its 11 core methods? What are the strict mathematical contracts for `equals()` and `hashCode()`, why is `hashCode()` NOT guaranteed to be a unique memory address, and how do you choose between `getClass()` and `instanceof` in `equals()`?"

### The Quick Answer

`java.lang.Object` is the root of the Java class hierarchy, exposing 11 methods covering equality (`equals`, `hashCode`), representation (`toString`), lifecycle (`clone`, `finalize`, `getClass`), and thread concurrency (`wait` with three overloads, `notify`, `notifyAll`). Overriding `equals()` requires adhering to five formal properties (reflexive, symmetric, transitive, consistent, non-null) and strictly maintaining the `hashCode()` contract where equal objects MUST yield identical hash codes. While `instanceof` allows symmetric equality across subclasses that add behavior without state, `getClass()` is strictly required when subclasses introduce new state fields to prevent breaking symmetry and transitivity.

---

### The 11 Methods of `java.lang.Object`

In the Java type hierarchy, `java.lang.Object` sits at the root. Every class, including arrays, inherits its 11 methods directly:

| Method Signature | Overridable? | Purpose |
| :--- | :---: | :--- |
| `public boolean equals(Object obj)` | **Yes** | Logical equality comparison (default implementation uses `==` reference identity). |
| `public native int hashCode()` | **Yes** | Computes a 32-bit integer hash code for hashing data structures like `HashMap`. |
| `public String toString()` | **Yes** | Human-readable string representation (`ClassName@HexHashCode`). |
| `protected native Object clone()` | **Yes** | Creates a field-by-field shallow copy (requires implementing `Cloneable`). |
| `public final native Class<?> getClass()` | **No (`final`)** | Returns the runtime `Class` descriptor for reflection and type checks. |
| `public final native void notify()` | **No (`final`)** | Wakes up a single thread waiting on this object's monitor lock. |
| `public final native void notifyAll()` | **No (`final`)** | Wakes up all threads waiting on this object's monitor lock. |
| `public final void wait()` | **No (`final`)** | Releases monitor lock and suspends calling thread indefinitely. |
| `public final native void wait(long timeoutMillis)` | **No (`final`)** | Releases monitor lock with timeout in milliseconds. |
| `public final void wait(long timeout, int nanos)` | **No (`final`)** | Releases monitor lock with high-precision timeout in nanoseconds. |
| `protected void finalize()` | **Yes** | Deprecated in Java 9, condemned in Java 18. Destructor hook prior to GC. |

---

### The 5 Strict Mathematical Contracts of `equals()`

When overriding `equals()`, Section 17.7 of the Java Language Specification mandates five formal properties:

1. **Reflexive:** For any non-null reference `x`, `x.equals(x)` must return `true`.
2. **Symmetric:** For any non-null references `x` and `y`, `x.equals(y)` must return `true` if and only if `y.equals(x)` returns `true`.
3. **Transitive:** For any non-null references `x`, `y`, and `z`, if `x.equals(y)` returns `true` and `y.equals(z)` returns `true`, then `x.equals(z)` must return `true`.
4. **Consistent:** Multiple invocations of `x.equals(y)` must consistently return the same boolean result, provided no fields used in comparisons are modified.
5. **Non-nullity:** For any non-null reference `x`, `x.equals(null)` must return `false` (and never throw `NullPointerException`).

---

### The `equals()` & `hashCode()` Contract & The Memory Address Myth

> **Common Misconception Debunked:** `hashCode()` is **NOT** a guaranteed unique memory address!

#### 1. Why `hashCode()` is NOT a Memory Address
- **Pigeonhole Principle:** A modern 64-bit JVM operates over an address space of up to `2^64` bytes (16 exabytes). In contrast, an `int` is a signed 32-bit integer representing only `2^32` (~4.29 billion) distinct values. Hash collisions are mathematically unavoidable.
- **Dynamic Heap Relocation:** Modern garbage collectors (G1, ZGC, Shenandoah) dynamically compact the heap by physically relocating live objects to new memory addresses. An object's physical address changes over time, but its `hashCode()` must remain invariant.
- **Mark Word Storage:** HotSpot generates the default identity hash code using a pseudo-random number generator or thread state on first call and lazily caches it inside the **Mark Word** of the object's 64-bit header.

#### 2. The Golden Contract
- **Rule 1 (Mandatory):** If `x.equals(y) == true`, then `x.hashCode() == y.hashCode()` **must always hold**.
- **Rule 2:** If `x.hashCode() == y.hashCode()`, `x.equals(y)` does **NOT** need to be `true` (hash collision).
- **The Consequence:** If you override `equals()` but fail to override `hashCode()`, your objects will vanish inside `HashMap` and `HashSet`. Two logically identical objects will hash to different buckets, preventing `map.get(key)` from ever locating the stored value.

---

### Comparison: `getClass()` vs. `instanceof` in `equals()`

A staff-level interview question asks how to choose between `getClass()` and `instanceof` when writing `equals()`:

| Dimension | `getClass()` | `instanceof` |
| :--- | :--- | :--- |
| **Type Equality Check** | Exact concrete type match (`this.getClass() == obj.getClass()`). | Type compatibility match (`obj instanceof Superclass`). |
| **Subclass State Extensions** | **Immune to bugs.** `Point` and `ColorPoint` are never equal, preserving symmetry and transitivity. | **Fatal trap.** If a subclass introduces new fields (e.g. `color`), satisfying symmetry and transitivity is mathematically impossible. |
| **Liskov Substitution (LSP)** | Strictly violates LSP if a subclass adds only behavior/methods without new state fields. | Honors LSP for behavioral subtyping across inheritance hierarchies. |
| **Null Safety** | Requires explicit `if (obj == null)` check; otherwise throws `NullPointerException`. | Safe by design: `null instanceof Class` evaluates cleanly to `false`. |
| **Recommended Usage** | Domain entities where identity depends on exact class and subclass state. | Value objects or class hierarchies where subtyping never introduces state. |

#### Option A: Strict Type Equality (`getClass()`)
```java
if (obj == null || getClass() != obj.getClass()) return false;
```
- **Behavior:** Enforces strict type equality. Two objects are only equal if they belong to the exact same concrete class.
- **Advantage:** Completely immune to the **subclass state-extension trap**. If `ColorPoint extends Point`, a `Point` will never equal a `ColorPoint`, maintaining symmetry and transitivity.
- **Trade-off:** Violates the Liskov Substitution Principle if a subclass adds only behavior (no state) and intends to be interoperable with its parent.

#### Option B: Type Compatibility (`instanceof`)
```java
if (!(obj instanceof Point)) return false;
```
- **Behavior:** Allows subclasses to be equal to superclass instances.
- **Advantage:** Honors LSP for behavioral subtyping.
- **Fatal Trap:** If the subclass introduces a new field (e.g., `color`), satisfying both symmetry and transitivity simultaneously is **mathematically impossible** (Joshua Bloch, *Effective Java*, Item 10). If `Point` ignores color, `p.equals(cp)` is `true`, but `cp.equals(p)` checks color and returns `false` (violating symmetry). If `cp.equals(p)` ignores color when comparing with a `Point`, transitivity breaks when comparing two different `ColorPoint` instances with identical `Point` coordinates.

---

### The Interview Answer (60-90 seconds)

> "The `java.lang.Object` class provides 11 foundational methods: `equals`, `hashCode`, and `toString` for identity and representation; `clone` for shallow copying; `getClass` for reflection; `finalize` which is deprecated; and five concurrency primitives (`wait` with three overloads, `notify`, and `notifyAll`) that coordinate threads around an object's internal monitor lock.
>
> The `equals()` method must obey five mathematical contracts: reflexivity, symmetry, transitivity, consistency, and non-nullity. Its relationship with `hashCode()` is critical: if two objects are equal according to `equals()`, their `hashCode()` outputs must be identical. Violating this breaks hash-based collections like `HashMap`.
>
> It is a common myth that `hashCode()` returns the object's physical memory address. Because modern garbage collectors move objects during compaction and 64-bit addresses cannot map uniquely into a 32-bit integer, HotSpot caches a generated hash in the object's Mark Word header.
>
> Finally, when writing `equals()`, using `getClass()` enforces strict type equality, preventing violations of symmetry and transitivity when subclasses add state, whereas `instanceof` is used only when subtyping does not introduce new fields."

---

### Code Demonstration: Bulletproof `equals()`, `hashCode()`, and `HashMap` Contract

The following Java program demonstrates the canonical implementation of `equals()` and `hashCode()` and shows what happens when the contract is broken in a `HashMap`.

<Tabs>
<TabItem value="java" label="ObjectMethodsDemo.java" default>

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class ObjectMethodsDemo {

    // Correct implementation honoring equals and hashCode contracts
    static final class User {
        private final long id;
        private final String email;

        public User(long id, String email) {
            this.id = id;
            this.email = email;
        }

        @Override
        public boolean equals(Object o) {
            // 1. Reflexivity check
            if (this == o) return true;
            // 2. Non-nullity & Strict class equality check
            if (o == null || getClass() != o.getClass()) return false;
            // 3. State comparison
            User user = (User) o;
            return id == user.id && Objects.equals(email, user.email);
        }

        @Override
        public int hashCode() {
            // Consistent with equals()
            return Objects.hash(id, email);
        }

        @Override
        public String toString() {
            return "User{id=" + id + ", email='" + email + "'}";
        }
    }

    // Broken class violating the contract (overrides equals but NOT hashCode)
    static final class BrokenUser {
        private final long id;

        public BrokenUser(long id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            BrokenUser that = (BrokenUser) o;
            return id == that.id;
        }
        // hashCode() intentionally omitted!
    }

    public static void main(String[] args) {
        System.out.println("--- 1. Testing Valid User in HashMap ---");
        Map<User, String> userMap = new HashMap<>();
        User u1 = new User(101, "dev@example.com");
        User u2 = new User(101, "dev@example.com");

        userMap.put(u1, "Senior Engineer");
        System.out.println("u1.equals(u2): " + u1.equals(u2));
        System.out.println("u1.hashCode() == u2.hashCode(): " + (u1.hashCode() == u2.hashCode()));
        System.out.println("Map lookup with u2: " + userMap.get(u2)); // Returns "Senior Engineer"!

        System.out.println("\n--- 2. Testing BrokenUser in HashMap ---");
        Map<BrokenUser, String> brokenMap = new HashMap<>();
        BrokenUser b1 = new BrokenUser(202);
        BrokenUser b2 = new BrokenUser(202);

        brokenMap.put(b1, "Database Admin");
        System.out.println("b1.equals(b2): " + b1.equals(b2)); // true
        System.out.println("b1.hashCode() == b2.hashCode(): " + (b1.hashCode() == b2.hashCode())); // false!
        System.out.println("Map lookup with b2: " + brokenMap.get(b2)); // Returns NULL! Object is lost!
    }
}
```

</TabItem>
</Tabs>
