---
id: 15-equals-hashcode-contract
title: "The equals() and hashCode() Contract"
sidebar_position: 15
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly is the contract between equals() and hashCode()? If I override equals() in a custom class but forget to override hashCode(), what is going to silently break in my application?"

Here is the top-down breakdown for one of the most frequently asked questions in Java interviews. Interviewers use this to test if you understand memory management (the heap) and how data structures like `HashMap` work under the hood.

### The Interview Quick-Hit

"`==` is an operator that checks if two references point to the exact same memory location, while `.equals()` is a method designed to check if two objects are logically equivalent in their state. Furthermore, if you override `.equals()`, you must override `hashCode()` to maintain the contract: if two objects are equal, their hash codes must be identical, ensuring they function correctly in hash-based collections."

### Part 1: `==` vs `.equals()`

| Feature | `==` Operator | `.equals()` Method |
| --- | --- | --- |
| Type | Built-in operator. | Method defined in the `Object` class. |
| Default Behavior | Checks Reference Equality (Do they share the exact same memory address?). | Checks Logical Equality (Do they hold the same data?). |
| Primitives | Works beautifully (e.g., `5 == 5` is true). | Cannot be used on primitives (they aren't objects). |
| Overriding | Cannot be overridden. | Can and should be overridden by custom classes. |

*(Note: If a class does not override `.equals()`, it inherits the default `Object` class implementation, which actually just uses `==` under the hood!)*

### The Interview Trap: The String Pool

Interviewers will almost always test your knowledge of `==` using Strings.

```java
String a = new String("hello");
String b = new String("hello");
System.out.println(a == b);      // FALSE (Different memory addresses)
System.out.println(a.equals(b)); // TRUE (Same logical text)

// The Trap:
String x = "hello";
String y = "hello";
System.out.println(x == y);      // TRUE 
```

Why is `x == y` true? Because Java optimizes memory using a String Pool. When you create a string literal (without the `new` keyword), Java checks if `"hello"` already exists in the pool. If it does, it points `y` to the exact same memory address as `x`.

### Part 2: The equals() and hashCode() Contract

`hashCode()` is a method that returns an integer representation of an object. It is used heavily by hash-based collections like `HashMap` and `HashSet` to figure out which "bucket" to put your object in for lightning-fast retrieval.

#### The Golden Contract

The Java specification dictates a strict contract between these two methods:
1. If `obj1.equals(obj2)` is true, then `obj1.hashCode() == obj2.hashCode()` **MUST** be true.
2. If `obj1.hashCode() == obj2.hashCode()` is true, then `obj1.equals(obj2)` does **NOT** have to be true. (This is called a hash collision - two different objects mathematically hashing to the same bucket).

#### Why You Must Always Override Both (The HashMap Trap)

If you override `.equals()` in a custom `User` class to say "two users are equal if they have the same ID," but you forget to override `hashCode()`, your application will break subtly when using HashMaps.

### The Scenario:
```java
User u1 = new User(99, "Alice");
User u2 = new User(99, "Alice");

HashMap<User, String> map = new HashMap<>();
map.put(u1, "Active"); 

// Later, you try to look up Alice's status using a new, logically identical object:
System.out.println(map.get(u2)); // Returns NULL!
```

Why did it return null? When you passed `u2` to the `HashMap`, the map called `u2.hashCode()` to find the correct bucket. Because you didn't override `hashCode()`, it used the default memory-address-based hash. `u1` and `u2` are at different memory addresses, so they generated completely different hash codes. The `HashMap` looked in the wrong bucket, came up empty, and never even bothered to call your perfectly written `.equals()` method.

### Summary for Interviews

When asked to summarize the contract: "If two objects are logically equal according to `.equals()`, they must produce the same hash code. If you violate this by overriding `.equals()` without overriding `hashCode()`, your objects will be placed in the wrong buckets in hash-based collections, making them impossible to retrieve even if they logically exist in the map."

---

### Crucial Nuance: The Mutable HashCode Trap

One of the deadliest bugs in Java is calculating a `hashCode()` based on *mutable* fields. Imagine you use a `User`'s `email` to calculate their hash code. You insert the `User` into a `HashSet`. The set hashes the email and places the object in Bucket 5. 

Later in the code, the user updates their email. The object's internal state changes, meaning its `hashCode()` output has now changed to point to Bucket 12. However, the `HashSet` does not know this; the object is physically still sitting in Bucket 5. If you call `set.contains(user)`, the set will check Bucket 12, find nothing, and return `false`, even though the object is absolutely in the set! This effectively strands the object in memory forever, creating a silent and nearly impossible-to-debug memory leak. **Always calculate `hashCode()` using immutable fields.**
