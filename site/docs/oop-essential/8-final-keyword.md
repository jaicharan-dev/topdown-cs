---
id: 8-final-keyword
title: "The final Keyword: Variables, Methods, Classes & Immutability"
description: "Master the final keyword across variables, methods, and classes in Java. Understand reference immutability, final vs. finally vs. finalize(), and thread safety."

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "The 'final' keyword can be applied to variables, methods, and classes. Walk me through what it does in each context, explain 'final' vs 'finally' vs 'finalize()', and how 'final' impacts performance and thread safety."

### The Quick Answer

"In Java, the `final` keyword is a non-access modifier used to enforce immutability and restrict inheritance. It prevents variable reassignment, blocks method overriding, and prohibits subclassing entirely."

---

### The Three Contexts of `final`

#### 1. Final Variables (Immutability & The Reference Trap)
* **Primitive Variables:** Once initialized, the literal value cannot be changed.
* **Reference Variables (The Classic Trap):** Marking an object reference as `final` means the **reference address is permanently bound** to that object in the heap. It cannot be reassigned to a new object. However, **the internal state of the referenced object remains completely mutable**!
  ```java
  final List<String> list = new ArrayList<>();
  list.add("Bitcoin"); // ✅ Valid: Modifying internal state
  // list = new ArrayList<>(); // ❌ Compile Error: Cannot reassign final reference
  ```

#### 2. Final Methods (Preventing Overriding)
* Declares that subclasses cannot override this method.
* **Why Use It?** To protect core business algorithms or security protocols (e.g., password hashing or authentication checks) from being maliciously or inadvertently modified by child classes.

#### 3. Final Classes (Preventing Inheritance)
* Prevents other classes from extending it. All methods inside a `final` class become implicitly final as well.
* **Why Use It?** To create truly immutable classes (like `java.lang.String` or `Integer`). If `String` were not final, a malicious subclass could override string hashing or equality methods, compromising the entire JVM's security model.

---

### The Classic Interview Trio: `final` vs. `finally` vs. `finalize()`

Interviewers routinely test if candidates distinguish these three completely separate mechanisms:

| Keyword / Method | What It Is | Purpose |
|---|---|---|
| **`final`** | Non-access modifier keyword | Restricts mutation on variables, methods, and classes. |
| **`finally`** | Exception handling block | Guarantees code execution (cleanup/resource closing) after `try`/`catch`. |
| **`finalize()`** | Method in `java.lang.Object` | Historically called by the Garbage Collector before reclaiming memory. **Deprecated since Java 9** due to unpredictability and resource leaks. |

---

### Under the Hood: Performance & Thread Safety

1. **JIT Inlining & Devirtualization:**
   Because a `final` method can never be overridden, the JVM's JIT compiler can bypass dynamic method dispatch (vtable lookups) and **inline the method body directly into the caller site**, eliminating stack frame overhead for hot methods.
2. **Safe Publication (Java Memory Model JSR-133):**
   `final` fields provide guaranteed thread safety when objects are properly constructed. The JVM enforces a memory barrier ("freeze action") at the end of the constructor, ensuring that other threads will always see the initialized values of `final` fields without requiring explicit synchronization or locks.

---

### The "Blank Final" Trap

A "blank final" is a `final` instance variable that is declared without an immediate assignment (`private final int id;`). 
* **The Rule:** The compiler strictly mandates that **every single constructor path** must initialize this variable. If even one constructor leaves it unassigned, the file will fail to compile. This is the cornerstone of building immutable domain models.

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
