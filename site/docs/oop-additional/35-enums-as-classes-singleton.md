---
id: 35-enums-as-classes-singleton
title: "Enums as Classes and the Enum Singleton Idiom"
description: "Explore the power of Java Enums, their class-like features, and why they make the perfect Singleton."
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Unlike in C/C++, Java enums are fully-fledged classes. How do constructors, fields, and methods work in Java enums, and why does Joshua Bloch famously advocate the Enum Singleton idiom over traditional Double-Checked Locking (DCL) or Bill Pugh holder singletons?"

### The short version

In Java, `enum` isn't just a list of named integers like in C. Under the hood it's a real class - each constant (`SUCCESS`, `FAILED`, ...) is a `public static final` object of that class, created once when the class loads. Because it's a real object, it can have fields, a constructor, and its own methods, just like any other class.

That same property makes enums the cleanest way to write a Singleton. A single-constant enum gets thread safety, protection from reflection, and safe serialization for free - all three of which you'd otherwise have to hand-roll yourself.

---

### Part 1: enums can hold real state, not just names

If an enum were just a label, you'd end up writing scattered `switch` statements everywhere to decide what each value "means." Instead, you can give each constant its own fields and behavior directly:

```java
public enum TransactionStatus {
    // Each constant calls the constructor once, when the class loads
    SUCCESS(200, "Payment cleared successfully") {
        @Override
        public boolean isTerminal() {
            return true;
        }
    },
    FAILED(400, "Insufficient funds or declined") {
        @Override
        public boolean isTerminal() {
            return true;
        }
    },
    PENDING(202, "Awaiting banking network confirmation") {
        @Override
        public boolean isTerminal() {
            return false;
        }
    };

    private final int statusCode;
    private final String description;

    // constructors on enums are implicitly private - you can't call this yourself
    TransactionStatus(int statusCode, String description) {
        this.statusCode = statusCode;
        this.description = description;
    }

    public int getStatusCode() {
        return this.statusCode;
    }

    public String getDescription() {
        return this.description;
    }

    // each constant overrides this with its own answer
    public abstract boolean isTerminal();
}
```

```java
TransactionStatus status = TransactionStatus.PENDING;
System.out.println("HTTP Code: " + status.getStatusCode()); // 202
System.out.println("Terminal?  " + status.isTerminal());    // false
```

---

### Part 2: why an enum makes the best Singleton

Before this idiom, people built singletons two ways:

1. **Double-Checked Locking (DCL)** - a `volatile` field plus `synchronized` blocks, to stop two threads from both creating an instance at once.
2. **Bill Pugh / static holder** - a nested static class that the JVM's class-loading rules happen to initialize lazily and safely.

Both work, but both have the same two holes:

- **Reflection** can call the private constructor directly via `setAccessible(true)` and spin up a second instance.
- **Serialization** can reconstruct a second instance on deserialize, unless you remember to write a `readResolve()` method.

A single-constant enum closes both holes automatically, because the JVM treats enum construction and enum deserialization as special cases:

<Diagram>
<Row>
<Box title="Traditional singleton" accent="#fb7185">
<Field icon="🔓" code="Constructor.newInstance()" hint="reflection can call this directly" variant="neutral" />
<Field icon="📦" code="deserialize(bytes)" hint="creates a new object unless you write readResolve()" variant="neutral" />
</Box>
<Box title="Enum singleton" accent="#34d399">
<Field icon="🔒" code="Constructor.newInstance()" hint="JVM throws IllegalArgumentException - blocked" variant="neutral" />
<Field icon="✅" code="deserialize(bytes)" hint="JVM looks up the existing constant by name - no new object" variant="neutral" />
</Box>
</Row>
</Diagram>

Joshua Bloch (*Effective Java*, Item 3) puts it simply: *"A single-element enum type is the best way to implement a singleton."*

```java
public enum DatabaseConnection {
    INSTANCE; // the one and only instance

    private final String connectionUrl;
    private boolean connected;

    // runs exactly once, when the enum class is first loaded
    DatabaseConnection() {
        this.connectionUrl = "jdbc:postgresql://db.prod.internal:5432/wallet";
        this.connected = true;
    }

    public void executeQuery(String sql) {
        if (!connected) throw new IllegalStateException("Database disconnected");
        System.out.println("Executing on " + connectionUrl + ": " + sql);
    }
}
```

```java
DatabaseConnection.INSTANCE.executeQuery("SELECT * FROM users WHERE active = true");
```

---

### Enum Singleton vs. the older approaches

| Dimension | Enum Singleton | DCL Singleton | Bill Pugh Holder |
| :--- | :--- | :--- | :--- |
| **Thread safety** | Guaranteed by the JVM at class load | Manual, via `synchronized` + `volatile` | Guaranteed by the JVM at class load |
| **Lazy loading** | Mostly - loads when the enum is first referenced | Yes, on first `getInstance()` call | Yes, when the holder class is first referenced |
| **Reflection-proof** | Yes - the JVM blocks it outright | No - needs a manual guard in the constructor | No - needs a manual guard in the constructor |
| **Serialization-safe** | Yes - JVM resolves by name automatically | No - needs `readResolve()` | No - needs `readResolve()` |
| **Boilerplate** | Minimal | Significant | Moderate |
| **Can extend a class** | No (can implement interfaces) | Yes | Yes |

---

### Why reflection can't break it

Even if attacker code grabs the enum's constructor and calls `setAccessible(true)`, the JDK has an explicit guard against it:

```java
import java.lang.reflect.Constructor;

public class ReflectionAttackDemo {
    public static void main(String[] args) {
        try {
            Constructor<DatabaseConnection> constructor =
                DatabaseConnection.class.getDeclaredConstructor(String.class, int.class);
            constructor.setAccessible(true);
            DatabaseConnection secondInstance = constructor.newInstance("FAKE_INSTANCE", 1);
        } catch (Exception e) {
            // java.lang.IllegalArgumentException: Cannot reflectively create enum objects
            System.out.println("Reflection blocked! Reason: " + e.getMessage());
        }
    }
}
```

This is baked into the JDK itself (`java.lang.reflect.Constructor`):
```java
if ((clazz.getModifiers() & Modifier.ENUM) != 0)
    throw new IllegalArgumentException("Cannot reflectively create enum objects");
```

And for serialization: a normal `Serializable` class gets reconstructed byte-by-byte on deserialize, which skips the constructor and can produce a second object (`s1 == s2` fails unless you wrote `readResolve()`). Enums skip all of that - only the constant's *name* gets written to the byte stream, and deserializing calls `Enum.valueOf(Class, name)` to fetch the one existing instance back. No new object is ever created.

---

### The one real limitation: no extending a class

Every enum already implicitly extends `java.lang.Enum<E>`, and Java only allows single class inheritance - so an enum can never extend another custom class (`public enum MySingleton extends BaseService` won't compile).

It can still implement interfaces, which covers almost every real use case:

```java
public interface CacheService {
    void put(String key, Object val);
    Object get(String key);
}

public enum RedisCacheService implements CacheService {
    INSTANCE;

    private final Map<String, Object> localStore = new ConcurrentHashMap<>();

    @Override
    public void put(String key, Object val) {
        localStore.put(key, val);
    }

    @Override
    public Object get(String key) {
        return localStore.get(key);
    }
}
```

---

### Say this in the interview

*"Java enums are real classes - each constant is a pre-built `public static final` instance of that class, so enums can carry fields, constructors, and methods just like any other type. That makes a single-constant enum the cleanest way to write a Singleton: the JVM guarantees it's created exactly once, thread-safely, and it's immune to the two usual ways people break singletons - reflection (the JVM explicitly refuses to reflectively construct an enum) and serialization (the JVM reconstructs it by name lookup instead of allocating a new object). The only real trade-off is that an enum can't extend another class, though it can still implement interfaces."*
