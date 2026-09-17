---
id: static-keyword
title: "Static Keyword"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What does the `static` keyword mean in Java? What's the difference between a static method and an instance method? And here's the trap part  -  can you override a static method?

"The `static` keyword means that a variable or method belongs to the class itself, rather than to any specific object instantiated from that class. There is only one copy of it in memory, shared by all instances."

### Static vs. Instance Methods

| Feature | Instance Method | Static Method |
|---|---|---|
| **Belongs To** | The specific object (the instance). | The blueprint itself (the class). |
| **How to Call It** | `myObject.doSomething()` | `ClassName.doSomething()` |
| **Data Access** | Can access both instance variables and static variables. | Can only access static variables. It cannot see instance variables. |
| **Memory Allocation**| Created every time a new object is instantiated using `new`. | Allocated once in memory when the class is loaded by the JVM. |

**The ELI5 Analogy: The Bank Branch**
- **Instance Method / Variable:** Every individual customer gets their own `BankAccount` object. Your account has an `accountBalance` (instance variable) and a `depositFunds()` method (instance method). My deposit does not affect your balance.
- **Static Method / Variable:** The bank sets a universal `BASE_INTEREST_RATE` (static variable) and has a method `updateBaseRate()` (static method). This does not belong to your specific account; it belongs to the Bank itself. If the Bank changes the rate, it changes for absolutely everyone simultaneously because there is only one central copy of that rate.

### Can you override a static method?
The definitive answer is: **NO**, you cannot override a static method.

- **Overriding relies on objects:** Overriding is a run-time operation where the JVM looks at the actual object in memory to decide which method to call (dynamic binding).
- **Static relies on classes:** Static methods do not belong to objects; they belong to the class. The compiler resolves static method calls at compile-time based strictly on the reference type (static binding).
- **The Result is "Method Hiding":** If a parent class has a static method, and you write a static method with the exact same signature in the child class, the compiler allows it. However, it is not overriding. It is called **Method Hiding**.

**Example:**
```java
class ParentBank {
    static void printRules() {
        System.out.println("Parent Rules");
    }
}

class ChildBranch extends ParentBank {
    static void printRules() {
        System.out.println("Child Rules");
    }
}
```

If you write this code: `ParentBank myBranch = new ChildBranch(); myBranch.printRules();`
Because the reference type is `ParentBank` and the method is static, the compiler resolves this immediately and prints "Parent Rules". It completely ignores the fact that the actual object in memory is a `ChildBranch`. If this were true overriding, dynamic dispatch would have kicked in and printed "Child Rules."

---

### Crucial Nuance: Static Blocks and the Class Loader

Interviewers love asking about initialization order. When does a `static` variable get its value? Before any objects are created! When the JVM's ClassLoader first loads the class into memory, it executes all `static` variable initializations and `static { ... }` initializer blocks sequentially, from top to bottom. If you have complex logic to initialize static data (like loading a config file or initializing a static map), you put it in a static block. But beware: if your static block throws an unhandled runtime exception, the class will fail to load, resulting in a fatal `ExceptionInInitializerError`!
