---
id: 33-exceptions-checked-unchecked
title: "Exceptions: Checked vs. Unchecked"
description: "Understand the architectural differences, resource management patterns, and use cases for checked versus unchecked exceptions."

sidebar_position: 21
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you distinguish between checked and unchecked exceptions? Why have modern languages largely abandoned checked exceptions, how does try-with-resources improve resource safety, and what is the Spring transaction rollback trap?"

### The Quick Answer

"**Checked exceptions** are subclasses of `Exception` (excluding `RuntimeException`) that the Java compiler forces you to handle at compile-time via `try-catch` or declare in the method signature via `throws`. They represent recoverable external failure scenarios (e.g., missing files, network drops). **Unchecked exceptions** are subclasses of `RuntimeException` that represent logic errors or unrecoverable bugs (e.g., `NullPointerException`, `IndexOutOfBoundsException`); the compiler does not mandate handling them."

---

### Core Comparison

| Feature | Checked Exceptions | Unchecked Exceptions |
|---|---|---|
| **Checked When?** | **Compile-Time** (Compiler verifies handling). | **Run-Time** (Encountered during execution). |
| **Class Hierarchy** | Extends `java.lang.Exception` (not `RuntimeException`). | Extends `java.lang.RuntimeException`. |
| **Handling Rule** | **Mandatory:** Must catch or declare via `throws`. | **Optional:** Compiler does not enforce handling. |
| **Typical Cause** | External environment conditions outside app control. | Flawed programming logic or invalid caller inputs. |
| **Examples** | `IOException`, `SQLException`, `FileNotFoundException`. | `NullPointerException`, `IllegalArgumentException`. |

---

### The ELI5 Analogy: The Road Trip

* **Checked Exception (The Snow Forecast):** You are driving to a mountain pass in winter. Weather forecasts predict snow. The highway patrol (the compiler) mandates you carry snow chains (`try-catch`) in your trunk before entering the pass. You might not hit snow, but you are required to anticipate the external risk.
* **Unchecked Exception (Running a Red Light):** You get distracted and run a red light. The law did not force you to carry a contingency device for running red lights, because the expectation is simply that your driving logic should not fail. It is a bug in your execution.

---

### The Interview Trap: What About `Error`?

The root of Java's exception model is `java.lang.Throwable`, which splits into two main branches:
1. **`Exception`:** Conditions that a reasonable application might want to catch and recover from.
2. **`Error`:** Catastrophic, JVM-level conditions that the application **should never attempt to catch or recover from** (e.g., `OutOfMemoryError`, `StackOverflowError`). If an `Error` occurs, the JVM infrastructure has failed or memory is exhausted.

---

### The Senior Perspective: Why Modern Languages Omitted Checked Exceptions

Java is virtually the only modern language with checked exceptions. Modern languages (Kotlin, C#, Python, Go, Rust) intentionally eliminated them:
* **Encapsulation Leakage:** If a low-level repository throws `SQLException`, every intermediate service and API controller layer must either declare `throws SQLException` (leaking implementation details) or clutter the codebase with boilerplate translation code.
* **The Industry Consensus:** In modern production Java, teams commonly convert checked exceptions into unchecked domain exceptions:
  ```java
  try {
      database.connect();
  } catch (SQLException e) {
      throw new DatabaseAccessException("Failed to connect", e); // Wrapped as unchecked
  }
  ```

---

### Resource Safety: `try-with-resources` (Java 7+)

Historically, developers closed resources in `finally` blocks. This was hazardous because if both the `try` block and the `finally` block threw exceptions, the `finally` exception completely **swallowed and masked the root cause**.

Modern Java mandates **`try-with-resources`** for anything implementing `java.lang.AutoCloseable`:
* Automatically closes resources in reverse order of declaration.
* If both the try block and close operation fail, the root exception is preserved, and the closing error is attached as a **suppressed exception** (`e.getSuppressed()`).

---

### Crucial Nuance: The Spring Boot Transaction Trap

In modern backend development, distinguishing between checked and unchecked exceptions is critical for database transactions:

* By default, Spring's `@Transactional` **only rolls back on unchecked exceptions** (`RuntimeException` and `Error`).
* If a method throws a **Checked Exception** (like `IOException`), Spring commits the database transaction by default!
* **The Fix:** If you want transactions to roll back on checked exceptions, you must explicitly specify:
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
