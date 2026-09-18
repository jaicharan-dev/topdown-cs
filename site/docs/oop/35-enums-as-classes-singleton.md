---
id: 35-enums-as-classes-singleton
title: "Enums as Classes and the Enum Singleton Idiom"
sidebar_position: 35
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Unlike in C, Java enums are fully-fledged classes. How can we leverage their constructors and methods in practice? And while we're at it, why do so many senior engineers insist on using enums to build Singletons?"

### The Interview Quick-Hit

"Unlike other languages where enums are just labels for integers, a Java enum is a fully functional class that pre-instantiates a strict, fixed set of objects. It can have private fields, custom methods, and constructors. The 'Enum Singleton' is the industry-standard way to create a Singleton pattern because the JVM internally guarantees that an enum value is instantiated exactly once, natively preventing multithreading bugs and reflection attacks."

### Part 1: Enums as Rich Objects (The Money Tracker Example)

In a typical backend system, you don't just want a label; you want data attached to that label.

Imagine you are logging a payment. You need a `TransactionStatus`. If an enum were just a label, you would have to write messy if/else blocks everywhere to figure out the HTTP status code or user message for a "FAILED" transaction.

Because Java enums are classes, you can bake that data directly into the enum itself. The JVM calls the private constructor for you exactly once when the program starts.

```java
public enum TransactionStatus {
    // 1. These are actually pre-built objects!
    SUCCESS(200, "Payment cleared successfully"),
    FAILED(400, "Insufficient funds"),
    PENDING(202, "Awaiting bank confirmation");

    // 2. Enums can have fields
    private final int statusCode;
    private final String description;

    // 3. Enums can have constructors (Implicitly private)
    TransactionStatus(int statusCode, String description) {
        this.statusCode = statusCode;
        this.description = description;
    }

    // 4. Enums can have methods
    public int getStatusCode() { 
        return this.statusCode; 
    }
}

// Execution in your backend route:
// System.out.println(TransactionStatus.FAILED.getStatusCode()); // Prints 400
```

### Part 2: The Enum Singleton (The Ultimate Fix)

Earlier, we looked at a traditional Singleton for a Database Connection using a private constructor and a `getInstance()` method.

Here is the dirty secret of traditional Singletons: they are fragile.
*   If two threads call `getInstance()` at the exact same millisecond, they can accidentally create two separate database connections (breaking the pattern).
*   A malicious user can use Java's "Reflection" API to hack into the private constructor and force it to build a second instance anyway.

**The Fix:** Joshua Bloch (author of *Effective Java*) introduced the Enum Singleton. You just declare your Singleton as an enum with a single value.

```java
public enum DatabaseConnection {
    // This is the ONE and ONLY instance. 
    INSTANCE; 

    // You can add your normal class variables here
    private String connectionUrl = "jdbc:postgresql://localhost:5432/wallet";

    // You can add normal methods here
    public void executeQuery(String sql) {
        System.out.println("Executing: " + sql);
    }
}

// Client code simply calls:
// DatabaseConnection.INSTANCE.executeQuery("SELECT * FROM users");
```

### Why is this the gold standard for production code?
*   **Thread-Safe by Default:** The JVM strictly locks enum initialization. It is mathematically impossible for two threads to create a duplicate `INSTANCE`.
*   **Reflection-Proof:** The Java source code physically prevents the Reflection API from instantiating an enum.
*   **Serialization-Safe:** If you send this object across a network, Java guarantees it won't accidentally spawn a duplicate object when reassembled.

---

### Crucial Nuance: The Enum Extensibility Trap

While Enum Singletons and rich Enum classes are incredibly powerful, they come with one absolute restriction that interviewers love to test: **Enums cannot extend other classes.** 

Because every enum in Java implicitly extends `java.lang.Enum`, and Java does not support multiple inheritance, you cannot have your `TransactionStatus` enum extend a custom base class (like `BaseStatus`). However, enums *can* implement interfaces. If you need to group different enums under a common type or enforce a contract across multiple distinct enums, you must use interfaces. Mentioning this limitation shows a deep understanding of Java's underlying type system and class hierarchy.
