---
id: 6-access-modifiers
title: "Understanding Access Modifiers"
description: "A straightforward breakdown of public, private, protected, and default access modifiers and their visibility scopes."

sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Walk me through the four access modifiers in Java. What exactly do they control, what happens if you omit one, and what is the tricky catch with 'protected' across packages?"

### The Quick Answer

"Access modifiers are keywords that define the visibility and accessibility scope of classes, constructors, methods, and variables. They serve as the enforcement mechanism for **encapsulation**, strictly controlling which components of a system can access or alter internal state."

---

### The Four Visibility Scopes

| Modifier | Same Class | Same Package | Subclasses (Different Package) | World (Anywhere) |
|---|---|---|---|---|
| **`private`** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **`default` (package-private)** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **`protected`** | ✅ Yes | ✅ Yes | ✅ Yes *(with a catch)* | ❌ No |
| **`public`** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

### The "Protected Across Packages" Trap

This is one of the most common junior-to-mid interview gotchas:

When a subclass in a *different* package inherits a `protected` member, it can **only** access that member through **inheritance on its own instance** (via `this` or inherited syntax). It **cannot** access that protected member through an explicit reference to an instance of the parent class or a sibling class!

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

### The "Trap" Answer: What is the Default?

If you do not specify an access modifier (e.g., `int age = 25;`), Java automatically assigns **default** visibility.

* **Professional Terminology:** Always refer to this as **package-private**. It restricts access solely to classes declared inside the exact same package directory.
* **Top-Level Class Rule:** Top-level classes in Java can **only** be marked `public` or `default` (package-private). They can *never* be `private` or `protected` because those scopes make no architectural sense for root source files.

---

### Access Modifiers in Interfaces

A frequent quick-fire question is how access modifiers operate in interfaces:
* **Fields:** Implicitly `public static final` (constants).
* **Methods:** Implicitly `public abstract`. Since Java 8, `default` and `static` methods are also `public`. Java 9 added `private` and `private static` helper methods. Interfaces **never allow `protected` methods**.

---

### Language Differences: C++ vs. Python

* **C++:** In addition to member access (`public:`, `protected:`, `private:`), C++ allows **access specifiers on inheritance itself** (`class Derived : private Base`). Private inheritance turns inherited public and protected members into private members of the derived class.
* **Python:** Python **does not enforce access modifiers at runtime or compile-time**. It operates entirely by convention:
  * Public: `self.name`
  * Protected (by convention): `self._name` (internal hint to developers).
  * Private (via Name Mangling): `self.__name` (the interpreter automatically renames it to `_ClassName__name` to prevent accidental subclass collisions).

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
