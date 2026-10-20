---
id: 23-abstract-class-constructors-private
title: "Abstract Class Constructors & Private Constructors"
description: "Why abstract classes still have constructors even though you can't 'new' them, the object initialization order, and why private constructors exist."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Can an abstract class have a constructor if it cannot be instantiated directly with `new`? What is the complete object initialization lifecycle, what catastrophic bug occurs if a constructor invokes an overridable method, and why would you ever declare a private constructor?"

### The analogy

- **Abstract class constructor — the foundation.** You can't live in a bare concrete foundation on its own, so you'd never "build" just the foundation. But when you build an actual house on top of it, the crew still has to pour and cure that foundation first, before the walls go up. The foundation's own "constructor" still runs — it just never runs by itself.
- **Private constructor — the door with no handle outside.** Nobody can just walk in and call `new`. The only way in is through a staff member inside who lets you through — that's a static factory method like `getInstance()`.

---

### Why abstract classes have constructors at all

The question answers itself once you see it: an abstract class can't be instantiated on its own, but it's still **part of** every object built from a concrete subclass. Its constructor runs as part of building that subclass — it just never runs in isolation.

- Abstract classes often hold private fields or set up invariants that only they can initialize.
- A subclass can't reach into its parent's private fields directly — it has to ask the parent to do it, via `super(...)`.
- If you don't write a constructor at all, Java quietly adds a no-arg one for you: `public AbstractClass() { super(); }`.

<Diagram>
<Row>
<Box title="Object" accent="#a1a1aa"><Field icon="①" code="super()" hint="always runs first" variant="neutral" /></Box>
<Arrow />
<Box title="Animal (abstract)" accent="#818cf8"><Field icon="②" code="super(name)" hint="initializes inherited state" variant="neutral" /></Box>
<Arrow />
<Box title="Dog (concrete)" accent="#34d399"><Field icon="③" code="new Dog(...)" hint="runs last, finishes construction" variant="neutral" /></Box>
</Row>
</Diagram>

---

### Comparison

| | Abstract Class Constructor | Private Constructor | Normal Public Constructor |
| :--- | :--- | :--- | :--- |
| **Visibility** | Usually `protected` or `public` | Internal to its own class only | `public` |
| **Can you `new` it directly?** | No | No, not from outside the class | Yes |
| **Can subclasses call it (`super()`)?** | Yes — this is the whole point | No — blocks subclassing | Yes |
| **Used for** | Initializing shared/inherited state | Utility classes, singletons, factory methods | Normal object creation |

---

### The order things actually initialize in

When you call `new Child()`, here's the exact order:

1. **Once per class load:** parent's static fields/blocks run, then the child's.
2. **Every time you call `new`:** parent's instance fields and instance blocks run, then the parent's constructor body, *then* the child's instance fields and instance blocks, then the child's constructor body.

The short version: everything about the parent finishes before the child's own fields are even touched.

---

### The trap: calling an overridable method from a constructor

This is a famous warning from Joshua Bloch's *Effective Java*: never call an overridable method from a constructor. Here's why it's dangerous:

```java
abstract class Parent {
    public Parent() {
        init(); // dangerous: calls an overridable method
    }
    public abstract void init();
}

class Child extends Parent {
    private String resource;

    public Child() {
        this.resource = "CRITICAL_DATABASE_CONNECTION";
    }

    @Override
    public void init() {
        // this runs DURING Parent's constructor, before Child's constructor has run!
        System.out.println("Resource length: " + resource.length()); // throws NullPointerException!
    }
}
```

Walk through it: `new Child()` calls `super()` first, which runs `Parent()`. Inside that, `init()` is called — and because it's overridden, dynamic dispatch routes it to `Child.init()`. But `Child`'s own constructor hasn't run yet, so `resource` is still `null`. Boom — `NullPointerException`, triggered before the object even finished being built.

---

### Why you'd ever want a private constructor

Making a constructor `private` blocks `new` from outside the class. Four real reasons to do this:

**1. Stop a static utility class from being instantiated at all** (think `Math`, `Collections`):
```java
public final class MathUtils {
    private MathUtils() {
        throw new AssertionError("Utility class; cannot be instantiated.");
    }
    public static int add(int a, int b) { return a + b; }
}
```

**2. Singletons** — guarantee exactly one instance exists:
```java
public class CacheManager {
    private static final CacheManager INSTANCE = new CacheManager();
    private CacheManager() {} // closed door
    public static CacheManager getInstance() { return INSTANCE; }
}
```

**3. Static factory methods** — hide the constructor behind readable names like `User.createAdmin()` instead of a raw `new User(...)`.

**4. Sealing a class off from subclassing** — if every constructor is private, no outside class can extend it at all (nested inner classes aside). This was the common trick before Java 17's `sealed` classes existed.

---

### Private constructors can still be broken — via reflection

```java
Constructor<Singleton> c = Singleton.class.getDeclaredConstructor();
c.setAccessible(true); // bypasses private!
Singleton rogueInstance = c.newInstance();
```

Two real defenses:
1. Check `if (instance != null) throw new IllegalStateException(...)` inside the constructor itself.
2. Use an `enum` instead — the JVM guarantees enum singletons and explicitly blocks reflection from creating extra instances.

---

### Say this in the interview

*"Yes, abstract classes can and do have constructors — you just can't call them directly with `new`. Subclasses call them through `super()` to initialize inherited state. Initialization always runs top-down: parent statics, child statics, then parent instance state and constructor, then child instance state and constructor. The classic trap is calling an overridable method from a constructor — dynamic dispatch routes it to the child's override before the child's fields are set, so you get a NullPointerException. Private constructors show up for utility classes, singletons, and static factories — and while reflection can bypass them with setAccessible, enum singletons are immune."*

---

### Code: proving the initialization order and the trap

```java
public class ConstructorLifecycleDemo {

    static abstract class BaseEntity {
        private final long id;

        public BaseEntity(long id) {
            System.out.println("1. BaseEntity constructor called with ID: " + id);
            this.id = id;
            // Anti-pattern: calling an overridable method from a constructor!
            validate();
        }

        public abstract void validate();

        public long getId() { return id; }
    }

    static class UserAccount extends BaseEntity {
        // not yet initialized when BaseEntity's constructor runs!
        private String username = "default_user";

        public UserAccount(long id, String username) {
            super(id);
            System.out.println("2. UserAccount constructor called.");
            this.username = username;
        }

        @Override
        public void validate() {
            // when BaseEntity calls this, username is still null!
            System.out.println("   [Validate Hook] Validating username: " + username);
            if (username == null) {
                System.out.println("   [WARNING] Detected UNINITIALIZED child state during parent constructor!");
            }
        }
    }

    // static utility class with a private constructor
    public static final class SecurityUtils {
        private SecurityUtils() {
            throw new AssertionError("Non-instantiable utility class.");
        }
        public static String hash(String input) { return "hashed:" + input; }
    }

    public static void main(String[] args) {
        System.out.println("--- Instantiating subclass ---");
        UserAccount account = new UserAccount(101, "alice_admin");

        System.out.println("\n--- Construction complete ---");
        System.out.println("Final Username: " + account.username);
        System.out.println("Security Hash: " + SecurityUtils.hash("secret"));
    }
}
```
