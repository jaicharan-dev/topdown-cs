---
id: 9-static-keyword
title: "The static Keyword: Class vs. Instance Memory & Method Hiding"
description: "Understand the static keyword in Java: Metaspace storage, single-copy sharing across instances, why static methods cannot be overridden, and static blocks."

sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import { SharedCopyFigure } from '@site/src/components/Figures/StaticKeyword';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What does the 'static' keyword actually mean, where are static members stored in memory, and why can't you override a static method? Also, why should you prefer static nested classes over inner classes?"

Every normal field and method in a class belongs to one object. Each object gets its own copy. `static` breaks that rule: a static member belongs to the **class itself**, not to any one object. There's only one copy, shared by every instance, loaded once when the class is loaded.

Think of a school: each student has their own name and marks (instance data). But the school's name is one value, shared by every student - that's the static field.

<SharedCopyFigure />

### The quick answer

The `static` keyword means a member belongs to the class, not an object. All instances share the exact same copy. You call it through the class name (`ClassName.doSomething()`), not through an object.

### Static vs. instance members

| | Instance Member | Static Member |
|---|---|---|
| **Belongs to** | One specific object | The class itself |
| **Called as** | `object.doSomething()` | `ClassName.doSomething()` |
| **Can access** | Both instance and static fields | Only static fields - no `this` |
| **Resolved** | At runtime, based on the real object | At compile-time, based on the declared type |

### Where does `static` actually live in memory?

This trips people up because the answer changed across Java versions:
* **Java 7 and earlier:** static variables and class metadata lived in **PermGen**, a region of the JVM heap.
* **Java 8+:** PermGen was removed. Class metadata and bytecode now live in **Metaspace**, which sits in native memory, outside the heap.
* **The catch:** the static **variables** themselves (and the `Class` object) still live on the regular Java heap, and can be garbage collected if their class loader is unloaded.

### Can you override a static method?

No. This is the one answer to memorize.

Overriding depends on the runtime looking at the real object and picking the right method - that's late binding. Static methods skip all of that: the compiler locks in which method gets called based on the *declared type* of the variable, before the program even runs. That's early binding, and it happens whether or not an object exists.

So if a subclass defines a static method with the same signature as the parent's, it doesn't override anything - it just **hides** it:

```java
Parent p = new Child();
p.printRules(); // Prints "Parent Rules" - because p is declared as Parent, and static calls don't look at the real object
```

### Static nested class vs. inner class

Joshua Bloch's *Effective Java* says: "favor static member classes over non-static." Here's why that matters.

A regular (non-static) inner class secretly keeps a hidden reference back to the outer object that created it. If that inner object outlives the outer one - say it's sitting in a background thread or an event queue - the outer object can never be garbage collected. That's a memory leak hiding in plain sight.

A **static** nested class holds no such reference. It behaves like any ordinary top-level class: no hidden link, no leak risk.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how static variables, methods, and blocks are declared across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
public class Bank {
    // 1. Static Variable: Shared by all bank accounts
    public static double baseInterestRate;

    // 2. Static Initializer Block: Runs once when class is loaded
    static {
        baseInterestRate = 0.045; // 4.5%
    }

    // 3. Static Utility Method: No access to instance state
    public static double calculateInterest(double principal) {
        return principal * baseInterestRate;
    }

    // 4. Static Nested Class: Does not leak outer instance reference
    public static class TransactionLog {
        public void log(String message) {
            System.out.println("Log: " + message);
        }
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>

class Bank {
public:
    // In C++17, 'inline static' allows in-class initialization
    inline static double baseInterestRate = 0.045;

    // Static member function
    static double calculateInterest(double principal) {
        return principal * baseInterestRate;
    }
};

int main() {
    // Invoked using Scope Resolution Operator (::) without instantiating Bank
    double interest = Bank::calculateInterest(1000.0);
    std::cout << "Interest: " << interest << std::endl;
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
class Bank:
    # 1. Class Variable (Static): Shared across all instances
    base_interest_rate: float = 0.045

    # 2. @staticmethod: Independent utility function; receives neither self nor cls
    @staticmethod
    def calculate_interest(principal: float) -> float:
        return principal * Bank.base_interest_rate

    # 3. @classmethod: Receives the class object (cls) as first argument
    @classmethod
    def update_rate(cls, new_rate: float) -> None:
        cls.base_interest_rate = new_rate

# Usage:
print(Bank.calculate_interest(1000.0))  # 45.0
```

</TabItem>
</Tabs>
