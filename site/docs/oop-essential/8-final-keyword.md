---
id: 8-final-keyword
title: "The final Keyword: Variables, Methods, Classes & Immutability"
description: "Master the final keyword across variables, methods, and classes in Java. Understand reference immutability, final vs. finally vs. finalize(), and thread safety."

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import { FinalScopesFigure } from '@site/src/components/Figures/FinalKeyword';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "`final` can go on variables, methods, and classes. What does it do in each case? And how is it different from `finally` and `finalize()`?"

### The short version

`final` means "locked" - but what gets locked depends on where you put it. On a variable, it blocks reassignment. On a method, it blocks overriding. On a class, it blocks being extended at all.

### The three places `final` shows up

**1. Final variables - and the trap with references.** For a primitive, it's simple: once set, the value can't change. For an object reference, it's trickier - `final` locks the *reference itself* to that one object, so you can't point it at something else later. But the object it points to can still change internally:
```java
final List<String> list = new ArrayList<>();
list.add("Bitcoin"); // ✅ Valid: modifying internal state
// list = new ArrayList<>(); // ❌ Compile Error: can't reassign a final reference
```

**2. Final methods - can't be overridden.** Useful for locking down core logic you don't want a subclass to accidentally (or maliciously) change - password hashing, authentication checks, that kind of thing.

**3. Final classes - can't be extended at all.** Every method inside automatically becomes final too, since there's nothing left to override it in. This is how you build a truly immutable class, like `String` or `Integer`. If `String` could be subclassed, someone could override its `equals()` or `hashCode()` and quietly break assumptions the entire JVM relies on.

<FinalScopesFigure />

---

### `final` vs. `finally` vs. `finalize()` - three unrelated things that sound alike

| Keyword / Method | What it is | What it's for |
|---|---|---|
| **`final`** | A modifier keyword | Locks a variable, method, or class against change |
| **`finally`** | An exception-handling block | Guarantees cleanup code runs after `try`/`catch` |
| **`finalize()`** | A method on `Object` | Used to be called by the garbage collector before reclaiming memory. Deprecated since Java 9 - too unpredictable, caused resource leaks |

---

### Why `final` helps performance and thread safety

**It lets the JIT compiler skip a step.** Since a `final` method can never be overridden, the JVM doesn't need to look it up dynamically at runtime - it can inline the method body directly at the call site, which is faster for hot code paths.

**It makes safe publication easier.** A `final` field is guaranteed to be fully visible to other threads as soon as the constructor finishes - the JVM enforces a memory barrier at the end of construction. That means a correctly-built object's `final` fields are thread-safe without needing explicit locks.

---

### The "blank final" rule

A "blank final" is a `final` field declared without being assigned right away - `private final int id;`. The compiler is strict about it: **every constructor** has to assign it before it finishes. Miss it in even one constructor path, and the file won't compile. This is the main building block for writing truly immutable objects.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how finality and immutability concepts are declared across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
import java.util.ArrayList;
import java.util.List;

// 1. Final Class: Cannot be extended
public final class ImmutableReport {
    // 2. Blank Final: Must be initialized in constructor
    private final String reportId; 

    // 3. Final Reference: Reference locked, contents mutable
    private final List<String> entries = new ArrayList<>();

    public ImmutableReport(String reportId) {
        this.reportId = reportId; // Required initialization
    }

    // 4. Final Method: Cannot be overridden
    public final void printHeader() {
        System.out.println("Report: " + reportId);
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>

// In C++11, the 'final' specifier prevents subclassing
class ImmutableReport final {
private:
    // 'const' enforces compile-time and runtime immutability
    const std::string reportId;

public:
    // Const members must be initialized via constructor initializer list
    ImmutableReport(std::string id) : reportId(id) {}

    // 'final' on virtual functions blocks further overrides
    virtual void printHeader() final {
        std::cout << "Report: " << reportId << std::endl;
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from typing import Final, final

# In Python 3.8+, @final and Final are provided by typing for static analysis (mypy).
# Python does NOT enforce finality at runtime.

@final # Signals type-checkers that this class cannot be subclassed
class ImmutableReport:
    def __init__(self, report_id: str):
        # 'Final' annotation signals that reassignment should be flagged by linters
        self.report_id: Final[str] = report_id

    @final # Signals that child classes should not override this method
    def print_header(self) -> None:
        print(f"Report: {self.report_id}")
```

</TabItem>
</Tabs>
