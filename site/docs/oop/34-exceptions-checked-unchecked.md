---
id: exceptions-checked-unchecked
title: "Exceptions: Checked vs Unchecked"
sidebar_position: 34
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is an exception? What is the difference between checked and unchecked exceptions in Java?

Here is the top-down breakdown for exceptions. In an interview, explaining this clearly shows you understand how to build resilient, fault-tolerant applications rather than just writing "happy path" code.

### The Interview Quick-Hit

"An exception is an unwanted or unexpected event that disrupts the normal flow of a program during execution. The core difference is that checked exceptions are anticipated by the compiler and force you to handle them at compile-time, whereas unchecked exceptions are logic errors or unpredictable states that occur at run-time and are not enforced by the compiler."

### 1. What is an Exception?

In Java, an exception is an object that represents an error or a specific condition that prevents a method from completing its normal execution. When this happens, Java creates an `Exception` object and "throws" it. If you do not "catch" it, the program will crash and print a stack trace.

### 2. Checked vs. Unchecked Exceptions

To ace this explanation, frame it around when the check happens and who is responsible.

| Feature | Checked Exceptions | Unchecked Exceptions |
| --- | --- | --- |
| When is it checked? | Compile-Time (The compiler verifies it). | Run-Time (The JVM encounters it while executing). |
| Hierarchy | Extends `Exception` (but not `RuntimeException`). | Extends `RuntimeException`. |
| Handling Requirement | Mandatory: You must use a `try-catch` block or declare it using the `throws` keyword. | Optional: You are not forced to handle it (though you should fix the underlying bug). |
| Common Causes | External factors outside the program's control (e.g., File I/O, Network, Database). | Programming mistakes or bad logic (e.g., passing null, dividing by zero). |
| Examples | `IOException`, `SQLException`, `FileNotFoundException`. | `NullPointerException`, `ArithmeticException`, `IndexOutOfBoundsException`. |

### The ELI5 Analogy: The Road Trip

* **Checked Exception (The Weather Forecast):** You are planning a road trip to the mountains. The weather forecast says there is a high chance of a snowstorm. Because this is a known external risk, the law (the Java Compiler) forces you to put snow chains in your trunk before you are legally allowed to start the car. You might not actually hit snow, but you are forced to prepare for it (`try-catch`).
**Code equivalent:** Reading a file from a hard drive. The compiler knows the file might have been deleted by the user, so it forces you to handle `FileNotFoundException`.

* **Unchecked Exception (The Distracted Driver):** You are driving perfectly fine, but you get distracted, run a red light, and crash your car. The law didn't force you to write a specific contingency plan for "running a red light" before you started the car, because the expectation is that you simply shouldn't do it. It was a failure of your driving logic.
**Code equivalent:** Calling a method on a null object (`NullPointerException`). The compiler assumes your logic is sound, but at runtime, your logic fails.

### The "Trap" Question: What about Error?

Interviewers will often follow up by asking where `Error` fits into this.

Java's overarching hierarchy starts with the `Throwable` class, which splits into two main branches:
1. **Exception:** The stuff we just talked about. These are recoverable. You can catch them and keep the application running.
2. **Error:** These are catastrophic, system-level failures that your application cannot and should not try to recover from.
**Examples:** `OutOfMemoryError` (the JVM ran out of RAM) or `StackOverflowError` (an infinite recursive loop blew up the memory stack). You don't try to catch these; you let the application die and fix the infrastructure or the fatal code flaw.

### Summary for Interviews

If you want a strong closing statement: "I view checked exceptions as a way to handle expected but unavoidable external failures, like network drops or missing files. I view unchecked exceptions as a signal that there is a bug in my code, like a `NullPointerException` or out-of-bounds index, which I should fix at the source rather than trying to swallow with a `try-catch` block."

---

### Crucial Nuance: The Spring Boot Transaction Trap

In modern backend development, distinguishing between checked and unchecked exceptions is critical for database transactions. 

Frameworks like Spring Boot automatically roll back database transactions if an Unchecked Exception (`RuntimeException`) is thrown. However, by default, they *do not* roll back transactions for Checked Exceptions (like an `IOException`). If you aren't aware of this, a checked exception halfway through a business flow could leave your database in an inconsistent, partially updated state. You must explicitly configure the `@Transactional(rollbackFor = Exception.class)` annotation to ensure total safety.
