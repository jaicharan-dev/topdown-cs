---
id: 33-exceptions-checked-unchecked
title: "Exceptions: Checked vs. Unchecked"
description: "Understand the architectural differences, resource management patterns, and use cases for checked versus unchecked exceptions."

sidebar_position: 21
sidebar_class_name: sidebar-medium
---

import { ThrowableTreeFigure } from '@site/src/components/Figures/ExceptionHierarchy';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you distinguish between checked and unchecked exceptions? Why have modern languages largely abandoned checked exceptions, how does try-with-resources improve resource safety, and what is the Spring transaction rollback trap?"

Think of it as two different kinds of risk. A **checked exception** is a risk you should have seen coming - the file might not exist, the network might drop - so the compiler won't even let you compile the code until you deal with it, either by catching it or by declaring `throws`. An **unchecked exception** is a bug - a null you forgot to check, an index you got wrong. Nothing forces you to plan for it ahead of time, because the real fix is to not write the bug in the first place.

Here's the road trip version: a snow forecast is a checked exception. The highway patrol makes you carry chains before you drive the pass - you might not need them, but the risk was known in advance, so you're required to prepare. Running a red light is an unchecked exception. Nobody makes you carry a "ran a red light" contingency kit, because the expectation is simply: don't do that. It's a failure of your own logic, not an external risk.

### Comparing the two

| Feature | Checked Exceptions | Unchecked Exceptions |
|---|---|---|
| **Checked When?** | At compile time - the compiler verifies you handled it. | At run time - you find out when it happens. |
| **Class Hierarchy** | Extends `java.lang.Exception` (not `RuntimeException`). | Extends `java.lang.RuntimeException`. |
| **Handling Rule** | Mandatory - catch it or declare `throws`. | Optional - the compiler won't stop you either way. |
| **Typical Cause** | Something external went wrong. | A bug in your own code or bad input from a caller. |
| **Examples** | `IOException`, `SQLException`, `FileNotFoundException`. | `NullPointerException`, `IllegalArgumentException`. |

### What about `Error`?

Java's exception tree starts at `Throwable`, which splits into two branches. `Exception` is for things your code might reasonably recover from. `Error` is different - it means something has gone catastrophically wrong at the JVM level (`OutOfMemoryError`, `StackOverflowError`), and you should never try to catch or recover from it. If you're seeing an `Error`, the platform itself is in trouble, not just your code.

<ThrowableTreeFigure />

### Why most modern languages dropped checked exceptions

Java is pretty much alone among modern languages in having checked exceptions - Kotlin, C#, Python, Go, and Rust all skip them. The problem is leakage: if some low-level repository throws `SQLException`, every layer above it - every service, every controller - now has to either declare `throws SQLException` too (exposing a database detail nobody above should care about) or wrap it. In practice, most production Java codebases end up converting checked exceptions into unchecked ones on purpose:

```java
try {
    database.connect();
} catch (SQLException e) {
    throw new DatabaseAccessException("Failed to connect", e); // Wrapped as unchecked
}
```

### Closing resources safely: `try-with-resources`

Older code closed resources in a `finally` block. That's fragile - if the `try` block throws, and then the `finally` block *also* throws while closing, the second exception replaces the first, and you lose the real cause of the failure.

`try-with-resources` (Java 7+) fixes this for anything that implements `AutoCloseable`. It closes resources automatically, in reverse order of declaration, and if both the body and the close both fail, it keeps the original exception and attaches the close failure as a suppressed exception (`e.getSuppressed()`) instead of throwing the original away.

### A trap worth knowing: Spring and checked exceptions

Spring's `@Transactional` only rolls back the database transaction on unchecked exceptions by default. Throw a checked exception - like `IOException` - out of a `@Transactional` method, and Spring commits the transaction anyway, as if nothing went wrong. If you want checked exceptions to trigger a rollback too, you have to say so explicitly:

```java
@Transactional(rollbackFor = Exception.class)
```

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how exception handling and safe resource management evaluate across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class ExceptionDemo {
    // 1. try-with-resources: Automatically closes BufferedReader via AutoCloseable
    public static void readFile(String path) {
        try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
            System.out.println(reader.readLine());
        } catch (IOException e) { // 2. Handling Checked Exception
            System.err.println("Handled I/O failure: " + e.getMessage());
            // 3. Modern pattern: wrap checked into unchecked domain exception
            throw new RuntimeException("Service failed reading file", e);
        }
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <fstream>
#include <stdexcept>
#include <string>

// In C++, all exceptions are unchecked. Resource cleanup relies on RAII:
void readFile(const std::string& path) {
    std::ifstream file(path); // File stream automatically closes when going out of scope
    if (!file.is_open()) {
        throw std::runtime_error("File could not be opened: " + path);
    }

    std::string line;
    if (std::getline(file, line)) {
        std::cout << line << std::endl;
    }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
# In Python, all exceptions are unchecked.
# Resource cleanup uses the 'with' context manager (similar to try-with-resources):

def read_file(path: str) -> None:
    try:
        with open(path, "r") as file:
            print(file.readline())
    except FileNotFoundError as e:
        print(f"Handled error: {e}")
        # Re-raise or wrap into custom exception
        raise RuntimeError("Service failure") from e
```

</TabItem>
</Tabs>
