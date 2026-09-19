---
id: 23-abstract-class-constructors-private
title: "Abstract Class Constructors and Private Constructors"
description: "Find out why abstract classes have constructors even though they cannot be instantiated directly."

sidebar_position: 23
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Since you can't instantiate an abstract class using `new`, can it even have a constructor? And while we're on the topic of constructors, why on earth would you ever make one private?"

### The Interview Quick-Hit

"Yes, an abstract class can (and usually does) have a constructor to initialize its own internal variables, which is triggered by the child class calling `super()`. A private constructor, on the other hand, prevents any outside class from instantiating the object entirely. It is primarily used for Utility classes containing only static methods, or to enforce design patterns like the Singleton or Factory patterns."

### Part 1: Abstract Class Constructors

This is a classic trap question. Interviewers will say, "Wait, if you can never instantiate an abstract class using the `new` keyword, why would it ever need a constructor?"

You cannot create a generic `Animal`, but an `Animal` blueprint still has shared variables (like age or weight) that every specific animal needs.

**The ELI5:** You cannot physically build a generic "Building" (it is an abstract concept). You can only build a specific "House" or "Skyscraper". However, every building needs a foundation. The abstract `Building` constructor is the set of instructions for pouring that foundation. When the `House` is being built, it calls up to the `Building` blueprint (using `super()`) to get that foundation poured before it finishes the rest of the house.

#### The Code Proof:

```java
abstract class Animal {
    String name;

    // The Abstract Constructor
    public Animal(String name) {
        this.name = name;
        System.out.println("1. Animal constructor fired.");
    }
}

class Dog extends Animal {
    public Dog(String name) {
        // Calls the abstract parent's constructor first!
        super(name); 
        System.out.println("2. Dog constructor fired.");
    }
}

// Execution
// new Animal("Generic"); // COMPILER ERROR!
Dog myDog = new Dog("Buddy"); // Works! Prints lines 1 then 2.
```

### Part 2: The Private Constructor

By default, constructors are public. If you change it to private, you are locking the doors. Nobody outside of the exact class file can use the `new` keyword on it.

Here are the three reasons you would actually want to do this in production:

#### 1. The Singleton Pattern

If you want to guarantee only one instance of a class is ever created, you make the constructor private. This forces everyone to ask a "gatekeeper" method for the single instance, rather than building their own.

```java
public class Database {
    private static Database instance;

    // PRIVATE: No one can say 'new Database()'
    private Database() {}

    // The Gatekeeper
    public static Database getInstance() {
        if (instance == null) {
            instance = new Database(); // Only allowed from inside!
        }
        return instance;
    }
}
```

#### 2. Static Utility Classes

Sometimes you have a class that is just a bucket holding a bunch of helper functions, and none of them require state (instance variables). The best example in Java is the `Math` class (`Math.max()`, `Math.abs()`). It makes absolutely no sense to create a new `Math()` object. To prevent junior developers from doing it by mistake, the creators of Java made the `Math` constructor private.

#### 3. Factory Methods (Controlling Creation)

Instead of letting developers blindly use `new`, you hide the constructor and force them to use descriptive static methods to create objects. This makes the code highly readable.

```java
public class User {
    private String role;

    // Locked down
    private User(String role) {
        this.role = role;
    }

    // Highly readable factory methods
    public static User createAdmin() {
        return new User("ADMIN");
    }

    public static User createGuest() {
        return new User("GUEST");
    }
}

// Client code is super clean:
// User u = User.createAdmin();
```

---

### Crucial Nuance: The Reflection API Bypass

While a private constructor stops standard instantiation via `new`, an interviewer might ask, "Is it truly impossible to bypass a private constructor?" The answer is no. Using Java's Reflection API, a developer can access the private constructor, call `setAccessible(true)`, and instantiate the class anyway. This is a common trap! To prevent this in high-security Singleton patterns, developers often throw an exception inside the private constructor if an instance already exists, or they use an `enum` for Singletons, which the JVM strictly protects against Reflection attacks.
