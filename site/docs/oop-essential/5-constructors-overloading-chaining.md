---
id: 5-constructors-overloading-chaining
title: "Constructors, Overloading, and Chaining"
description: "Dive into object initialization rules, constructor overloading, and the mechanics of constructor chaining."

sidebar_position: 5
sidebar_class_name: sidebar-easy
---

import { ChainingFigure, InitOrderFigure } from '@site/src/components/Figures/ConstructorChaining';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What's a constructor, and how does overloading work for it? Walk me through chaining with `this()` and `super()`, the disappearing default constructor, and the exact order things get initialized in."

### The short version

A constructor is the block of code that runs when an object gets created - its job is to leave the object in a valid starting state. Like any method, it can be overloaded with different parameter lists.

**Constructor chaining** means one constructor calls another instead of repeating setup code: `this()` calls another constructor in the same class, and `super()` calls the parent class's constructor so its state is ready before the child adds anything on top.

---

### The rules a constructor has to follow

A constructor looks like a method, but it isn't one - and it plays by different rules:
1. **Its name must match the class name**, exactly.
2. **It has no return type** - not even `void`. (Adding `void` silently turns it into a regular method - a classic bug.)
3. **It can't be `final`, `static`, or `abstract`:**
   * Not `final` - constructors aren't inherited, so there's nothing to override.
   * Not `static` - a constructor belongs to the instance being built, not the class itself.
   * Not `abstract` - it has to actually build something.

---

### The trap: the default constructor that disappears

This shows up in almost every screening round:
* **If you declare no constructors at all**, the compiler quietly adds a no-argument one for you: `public MyClass() { super(); }`.
* **The moment you write any constructor** - even a parameterized one like `MyClass(String name)` - that free default constructor is gone for good.
* If something else in your code (or a framework) expects `new MyClass()` to work, it will fail to compile unless you write that no-argument constructor yourself.

---

### Chaining: `this()` vs. `super()`

Chaining exists so you don't repeat the same setup logic in multiple constructors.

**`this()` - chaining inside the same class.** Smaller, overloaded constructors forward their arguments (plus some sensible defaults) to one "master" constructor that does the real work.
*Rule:* `this(...)` must be the very first line of the constructor.

**`super()` - chaining up to the parent class.** A child object can't set up its own fields until the parent's state is ready, so the parent constructor has to run first. If you don't call `this()` or `super()` yourself, the compiler silently inserts `super()` for you at the top. But if the parent only has parameterized constructors, you must call `super(args)` explicitly.
*Rule:* `super(...)` must also be the very first line. Since both rules claim the first line, **a constructor can never call both `this()` and `super()`.**

<ChainingFigure />

---

### What actually happens, in order, when you write `new Child()`

1. **Static initializers** - the parent's static fields and blocks run first, then the child's (only once, the first time the class loads).
2. **Parent's instance fields** get initialized.
3. **Parent's constructor body** runs, via `super()`.
4. **Child's instance fields** get initialized.
5. **Child's constructor body** runs.

<InitOrderFigure />

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how constructor chaining and parent initialization are implemented across different languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. PARENT CLASS
class Employee {
    protected String company;

    public Employee(String company) {
        this.company = company;
    }
}

// 2. CHILD CLASS with both this() and super() chaining
class SoftwareEngineer extends Employee {
    private String name;
    private String primaryLanguage;

    // "Master" Constructor: Chains up to parent via super()
    public SoftwareEngineer(String company, String name, String primaryLanguage) {
        super(company); // Must be the first statement
        this.name = name;
        this.primaryLanguage = primaryLanguage;
    }

    // Overloaded Constructor: Chains locally via this() with default language
    public SoftwareEngineer(String company, String name) {
        this(company, name, "Java"); // Chains to the master constructor
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>

// 1. PARENT CLASS
class Employee {
protected:
    std::string company;

public:
    Employee(std::string comp) : company(comp) {}
};

// 2. CHILD CLASS with Delegating Constructor & Base Initialization
class SoftwareEngineer : public Employee {
private:
    std::string name;
    std::string primaryLanguage;

public:
    // Master Constructor: Chains to parent constructor via initializer list
    SoftwareEngineer(std::string comp, std::string empName, std::string lang)
        : Employee(comp), name(empName), primaryLanguage(lang) {}

    // Delegating Constructor (C++11): Chains to master constructor with default value
    SoftwareEngineer(std::string comp, std::string empName)
        : SoftwareEngineer(comp, empName, "C++") {}
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
# 1. PARENT CLASS
class Employee:
    def __init__(self, company: str):
        self.company = company

# 2. CHILD CLASS with super() initialization & default parameters
# In Python, constructor overloading is achieved cleanly via default arguments:
class SoftwareEngineer(Employee):
    def __init__(self, company: str, name: str, primary_language: str = "Python"):
        # Explicitly invokes parent constructor to initialize base state
        super().__init__(company)
        self.name = name
        self.primary_language = primary_language
```

</TabItem>
</Tabs>

---

### One more thing: copy constructors vs. `Cloneable`

A common follow-up: how do you safely duplicate an object?

**Copy constructor** - a constructor that takes an existing object of the same class and copies its fields:
```java
public User(User other) {
    this.name = other.name;
    this.role = other.role;
}
```

*Effective Java* (Item 13) recommends copy constructors or static factory methods over implementing `Cloneable`. `Cloneable` is widely considered a design mistake - it doesn't even have a public `clone()` method on the interface itself, it bypasses your normal constructor, and it's easy to end up with shallow-copy bugs on mutable fields.

**Private constructors** show up intentionally in two places: the **Singleton pattern** (to guarantee only one instance ever exists) and **utility classes** like `java.lang.Math`, where everything is static and instantiating the class wouldn't mean anything.
