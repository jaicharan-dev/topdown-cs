---
id: 6-access-modifiers
title: "Understanding Access Modifiers"
description: "A straightforward breakdown of public, private, protected, and default access modifiers and their visibility scopes."

sidebar_position: 6
sidebar_class_name: sidebar-easy
---

import { VisibilityRingsFigure } from '@site/src/components/Figures/AccessModifiers';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Walk me through the four access modifiers in Java. What do they actually control, what happens if you leave one off, and what's the catch with `protected` across packages?"

### The short version

Access modifiers are keywords that control who's allowed to see or touch a class, constructor, method, or variable. They're the actual enforcement mechanism behind **encapsulation** - without them, "private" would just be a suggestion.

---

### The four visibility levels

| Modifier | Same class | Same package | Subclass in another package | Anywhere |
|---|---|---|---|---|
| **`private`** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **`default` (package-private)** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **`protected`** | ✅ Yes | ✅ Yes | ✅ Yes *(with a catch)* | ❌ No |
| **`public`** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

<VisibilityRingsFigure />

---

### The "protected across packages" catch

This is one of the most common gotchas at the junior-to-mid level.

When a subclass lives in a *different* package from its parent, it can only reach an inherited `protected` member through its own instance - through `this`, basically. It **cannot** reach that member through a reference to the parent class, or to a sibling class, even though both are technically "the same type."

```java
// Package: com.bank.parent
public class Account {
    protected double balance;
}

// Package: com.bank.child (DIFFERENT PACKAGE)
public class SavingsAccount extends Account {
    public void test() {
        this.balance = 100.0;     // ✅ Allowed (access via inheritance)
        
        Account acc = new Account();
        acc.balance = 100.0;      // ❌ COMPILE ERROR! Not accessible through parent reference
    }
}
```

---

### What happens if you leave the modifier off?

If you don't write an access modifier at all - `int age = 25;` - Java silently gives it **default** visibility.

* Call this **package-private**, not just "default" - that's the term people expect in an interview. It means only classes in the exact same package can see it.
* A top-level class can only ever be `public` or package-private. It can never be `private` or `protected` - those scopes just don't make sense for a file that stands on its own.

---

### How this plays out in interfaces

* **Fields** are implicitly `public static final` - they're constants, not real state.
* **Methods** are implicitly `public abstract`. Since Java 8, `default` and `static` methods are public too. Java 9 added `private` and `private static` helpers for internal use. Interfaces never allow `protected` methods - there's no subclass relationship for it to apply to.

---

### How other languages handle this

**C++** lets you put an access specifier on inheritance itself, not just on members - `class Derived : private Base`. Private inheritance takes everything the base class exposed as public or protected and makes it private in the derived class.

**Python doesn't enforce any of this.** It's all convention:
* Public: `self.name`
* "Protected" by convention only: `self._name` - just a hint to other developers, not enforced.
* "Private" via name mangling: `self.__name` - Python renames it internally to `_ClassName__name`, mostly to avoid accidental name clashes in subclasses, not to actually lock it down.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how access control and visibility conventions are declared across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
package com.example;

public class Employee {
    // 1. Private: Accessible ONLY within this class
    private double salary;

    // 2. Package-Private (Default): Accessible within com.example
    String department;

    // 3. Protected: Accessible within com.example AND subclasses globally
    protected String employeeId;

    // 4. Public: Accessible anywhere in the entire application
    public String fullName;

    public Employee(double salary, String department, String id, String name) {
        this.salary = salary;
        this.department = department;
        this.employeeId = id;
        this.fullName = name;
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <string>

class Employee {
private:
    // Accessible only within Employee member functions
    double salary;

protected:
    // Accessible within Employee and derived subclasses
    std::string employeeId;

public:
    // Accessible anywhere
    std::string fullName;

    Employee(double sal, std::string id, std::string name)
        : salary(sal), employeeId(id), fullName(name) {}
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
class Employee:
    def __init__(self, salary: float, department: str, emp_id: str, name: str):
        # 1. Public: Accessible freely from outside
        self.full_name = name

        # 2. Protected (Convention): Signals internal use, but not strictly blocked
        self._department = department

        # 3. Private (Name Mangling): Python mangles this to _Employee__salary
        self.__salary = salary

# Usage demo:
emp = Employee(100000, "Engineering", "E101", "Alice")
print(emp.full_name)        # "Alice"
print(emp._department)      # "Engineering" (discouraged, but works)
# print(emp.__salary)       # AttributeError!
print(emp._Employee__salary) # 100000 (mangled name accessible)
```

</TabItem>
</Tabs>
