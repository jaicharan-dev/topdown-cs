---
id: 25-object-class-methods
title: "The Object Class and Its Core Methods"
description: "A plain-English tour of the 11 methods every Java class inherits, the equals()/hashCode() rules, and when to use getClass() vs instanceof."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Every class in Java inherits from `java.lang.Object`. What are its 11 core methods? What are the strict mathematical contracts for `equals()` and `hashCode()`, why is `hashCode()` NOT guaranteed to be a unique memory address, and how do you choose between `getClass()` and `instanceof` in `equals()`?"

Every class in Java — including arrays — inherits 11 methods from `java.lang.Object`, whether you write `extends Object` or not. Most interview questions about it boil down to two things: the rules for `equals()`/`hashCode()`, and the myth that `hashCode()` is a memory address.

---

### The 11 methods

| Method | Overridable? | What it's for |
| :--- | :---: | :--- |
| `equals(Object obj)` | Yes | Logical equality (default is just `==`, reference identity) |
| `hashCode()` | Yes | A 32-bit integer hash, used by `HashMap`/`HashSet` |
| `toString()` | Yes | Human-readable text (`ClassName@HexHashCode` by default) |
| `clone()` | Yes | Shallow, field-by-field copy (needs `Cloneable`) |
| `getClass()` | No | Returns the runtime type, for reflection/type checks |
| `notify()` | No | Wakes one thread waiting on this object's lock |
| `notifyAll()` | No | Wakes all threads waiting on this object's lock |
| `wait()` / `wait(long)` / `wait(long, int)` | No | Releases the lock and pauses the thread, with optional timeout |
| `finalize()` | Yes | Deprecated since Java 9 — a pre-GC cleanup hook, don't rely on it |

---

### The 5 rules `equals()` has to follow

If you override `equals()`, it has to satisfy all five of these, for any non-null `x`, `y`, `z`:

1. **Reflexive** — `x.equals(x)` is always `true`.
2. **Symmetric** — `x.equals(y)` and `y.equals(x)` always agree.
3. **Transitive** — if `x.equals(y)` and `y.equals(z)`, then `x.equals(z)`.
4. **Consistent** — calling it repeatedly gives the same answer, as long as nothing changed.
5. **Never true for null** — `x.equals(null)` is always `false`, and never throws.

---

### The real rule connecting `equals()` and `hashCode()`

The myth to debunk up front: **`hashCode()` is not a memory address.** A 64-bit JVM has far more possible addresses than a 32-bit int can represent, and modern garbage collectors physically move objects around in memory while their hash code has to stay the same. So HotSpot generates a hash once (pseudo-randomly) and caches it in the object's header — it just doesn't reflect where the object actually lives.

The contract that actually matters:

- **If `x.equals(y)` is true, `x.hashCode()` must equal `y.hashCode()`.** Non-negotiable.
- **If `x.hashCode()` equals `y.hashCode()`, `x.equals(y)` doesn't have to be true.** That's just a hash collision, which is normal.
- **Break rule 1 and your objects vanish inside a `HashMap`.** Two "equal" objects land in different hash buckets, so `map.get(key)` can't find the value you stored.

---

### `getClass()` vs. `instanceof` in `equals()`

| | `getClass()` | `instanceof` |
| :--- | :--- | :--- |
| **Checks** | Exact same concrete class | "Is a" compatibility |
| **If a subclass adds new fields** | Safe — `Point` and `ColorPoint` are just never equal | Breaks symmetry/transitivity — see below |
| **Liskov Substitution** | Technically violates it if the subclass only adds behavior | Honors it |
| **Null safety** | You must check for `null` yourself first | Safe automatically — `null instanceof X` is `false` |
| **Use when** | Subclasses can add new state | Subclasses never add new state |

**Option A — `getClass()`:**
```java
if (obj == null || getClass() != obj.getClass()) return false;
```
Two objects are only equal if they're the exact same class. A `Point` and a `ColorPoint` can never be equal, so symmetry and transitivity are automatically safe.

**Option B — `instanceof`:**
```java
if (!(obj instanceof Point)) return false;
```
Lets a subclass instance be equal to a superclass instance. The catch (Joshua Bloch calls this out in *Effective Java*): if `ColorPoint` adds a `color` field, you can't satisfy both symmetry and transitivity at once. If `Point.equals()` ignores color, then `point.equals(colorPoint)` is true but `colorPoint.equals(point)` is false if it checks color — that breaks symmetry. There's no clean fix once a subclass adds state, which is exactly why `getClass()` is the safer default in that situation.

---

### Say this in the interview

*"Every class inherits 11 methods from Object: equals, hashCode, and toString for identity and display; clone for copying; getClass for reflection; finalize, which is deprecated; and five thread-coordination methods — wait with three overloads, notify, and notifyAll. equals() has to be reflexive, symmetric, transitive, consistent, and false on null. The rule that actually bites people: if two objects are equal, their hashCode must match too, or they'll disappear inside a HashMap. And hashCode isn't a memory address — it's cached once because GCs move objects around but a hash code can't change. For equals(), getClass() is safer once subclasses add new fields; instanceof only works cleanly when they don't."*

---

### Code: a correct `equals()`/`hashCode()` pair vs. a broken one

<Tabs>
<TabItem value="java" label="ObjectMethodsDemo.java" default>

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class ObjectMethodsDemo {

    // Correct: honors both the equals() and hashCode() contracts
    static final class User {
        private final long id;
        private final String email;

        public User(long id, String email) {
            this.id = id;
            this.email = email;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            User user = (User) o;
            return id == user.id && Objects.equals(email, user.email);
        }

        @Override
        public int hashCode() {
            // kept consistent with equals()
            return Objects.hash(id, email);
        }

        @Override
        public String toString() {
            return "User{id=" + id + ", email='" + email + "'}";
        }
    }

    // Broken: overrides equals() but NOT hashCode()
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
        // hashCode() intentionally left out!
    }

    public static void main(String[] args) {
        System.out.println("--- 1. A well-behaved User in a HashMap ---");
        Map<User, String> userMap = new HashMap<>();
        User u1 = new User(101, "dev@example.com");
        User u2 = new User(101, "dev@example.com");

        userMap.put(u1, "Senior Engineer");
        System.out.println("u1.equals(u2): " + u1.equals(u2));
        System.out.println("u1.hashCode() == u2.hashCode(): " + (u1.hashCode() == u2.hashCode()));
        System.out.println("Map lookup with u2: " + userMap.get(u2)); // finds it!

        System.out.println("\n--- 2. BrokenUser in a HashMap ---");
        Map<BrokenUser, String> brokenMap = new HashMap<>();
        BrokenUser b1 = new BrokenUser(202);
        BrokenUser b2 = new BrokenUser(202);

        brokenMap.put(b1, "Database Admin");
        System.out.println("b1.equals(b2): " + b1.equals(b2)); // true
        System.out.println("b1.hashCode() == b2.hashCode(): " + (b1.hashCode() == b2.hashCode())); // false!
        System.out.println("Map lookup with b2: " + brokenMap.get(b2)); // null! object is lost
    }
}
```

</TabItem>
</Tabs>
