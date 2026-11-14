---
id: 33-exceptions-checked-unchecked
title: "Exceptions: Checked vs. Unchecked"
description: "Which failures the compiler forces you to acknowledge, and why newer languages stopped forcing any"

sidebar_position: 21
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you distinguish between checked and unchecked exceptions? Why have modern languages largely abandoned checked exceptions, how does try-with-resources improve resource safety, and what is the Spring transaction rollback trap?"

---

### Picture it

Think of two kinds of thing that can go wrong when you post a letter.

**The post office might lose it.** This has nothing to do with you. However carefully you addressed it, it can still happen, so a sensible system makes you say in advance what you will do if it does.

**You might not have written an address.** That is not bad luck, it is a mistake in what you did. The remedy is to fix the letter, not to plan around the failure.

Java draws exactly this line. Failures that are **outside your control** are **checked**: the compiler forces you to acknowledge them. Failures that are **bugs in your code** are **unchecked**: the compiler stays quiet, because the fix is to correct the code.

The argument that followed, for twenty-five years, is about how well that line survives contact with real programs.

---

### The proper terms

#### The hierarchy

Everything throwable descends from **`Throwable`**, which has two branches.

**`Error`** signals that the JVM itself is in trouble, such as `OutOfMemoryError` or `StackOverflowError`. You do not catch these.

**`Exception`** is the application branch. Everything under it is **checked**, except the subtree rooted at **`RuntimeException`**, which is **unchecked**.

#### Checked and unchecked

A **checked exception** must be either caught or declared in the method's **`throws`** clause. The compiler enforces this, which is the **catch or specify** requirement. Examples are `IOException` and `SQLException`, representing conditions a correct program can still meet.

An **unchecked exception** extends `RuntimeException` and needs no declaration. Examples are `NullPointerException`, `IllegalArgumentException` and `IndexOutOfBoundsException`, which generally signal **programming errors**.

The intended rule: use checked for recoverable conditions a caller can reasonably handle, and unchecked for violations of a method's contract.

#### Why modern languages dropped them

Java is almost alone in having them. C#, Kotlin, Scala and Python have none, for three reasons that experience exposed.

**Exception swallowing.** Forced handling produces empty `catch` blocks written to silence the compiler, which hides failures more thoroughly than not checking at all.

**Broken encapsulation.** A `throws` clause is part of the public signature, so changing an implementation from file storage to a network call changes every caller's signature. The abstraction leaks.

**Hostility to lambdas.** Functional interfaces such as `Function` and `Supplier` do not declare checked exceptions, so any lambda body throwing one must wrap it. This friction became obvious once streams arrived in Java 8.

The usual modern practice in Java is to wrap checked exceptions in unchecked ones at the boundary, which is what Spring does with `DataAccessException`.

#### try-with-resources

Before Java 7, releasing a resource meant a `finally` block, which had two problems: it was verbose, and `close()` could itself throw, discarding the original exception and leaving a misleading one.

**try-with-resources** declares resources in the `try` header. Any resource implementing **`AutoCloseable`** is closed automatically when the block exits, in **reverse order** of declaration, whether or not an exception was thrown.

It also fixes the lost-exception problem with **suppressed exceptions**. If the body throws and `close()` also throws, the body's exception propagates and the close failure is attached to it, retrievable through `getSuppressed()`. Nothing is silently lost.

#### The Spring rollback trap

Spring's **`@Transactional`**, by default, rolls back only on **unchecked** exceptions and `Error`. If a method throws a **checked** exception, the transaction **commits**.

This surprises people, since a checked exception usually means something failed. The intent was to follow EJB convention and treat checked exceptions as expected business outcomes rather than system faults.

The fix is to declare it: `@Transactional(rollbackFor = Exception.class)`.

A second, related trap: `@Transactional` is applied through a **proxy**, so calling an annotated method from another method of the same class bypasses the proxy entirely and no transaction starts. This is **self-invocation**.

---

### In code

```java
import java.io.*;

class Loader {

    // Checked: the compiler forces the caller to catch or declare
    String read(String path) throws IOException {
        try (BufferedReader in = new BufferedReader(new FileReader(path))) {
            return in.readLine();           // closed automatically, even on throw
        }                                   // close() failures are suppressed, not lost
    }

    // Unchecked: a contract violation, so no declaration is needed
    int parsePositive(String text) {
        int value = Integer.parseInt(text);
        if (value <= 0) {
            throw new IllegalArgumentException("must be positive: " + value);
        }
        return value;
    }

    void demo() {
        try {
            read("missing.txt");
        } catch (IOException e) {
            // real handling, or wrap it; never leave this empty
            throw new UncheckedIOException(e);
        }
    }
}
```

```java
// Spring: this commits despite the failure, because IOException is checked
@Transactional
public void importFile() throws IOException {
    throw new IOException("boom");
}

// Correct: rollback is requested explicitly
@Transactional(rollbackFor = Exception.class)
public void importFileSafely() throws IOException {
    throw new IOException("boom");
}
```

---

### What they ask next

**"Can you catch `Error`?"**
Syntactically yes, practically no. After an `OutOfMemoryError` the JVM is already compromised, and catching it usually makes diagnosis harder.

**"What happens if `finally` contains a `return`?"**
It discards any exception in flight and overrides the `try` block's return value, so a failure vanishes silently. Returning from `finally` should be avoided.

**"Which happens first, `finally` or the return value evaluation?"**
The return expression is evaluated, then `finally` runs, then the method returns. A `finally` block mutating the returned variable does not change the already-evaluated value for primitives.

**"How do you throw a checked exception from a lambda?"**
Wrap it in an unchecked exception inside the lambda, or define your own functional interface that declares the checked exception.

**"Why does `@Transactional` not roll back on checked exceptions?"**
It follows the EJB convention of treating checked exceptions as expected business outcomes. Override it with `rollbackFor`.

**The common wrong answer** is "checked means it must be caught". It must be caught **or declared**, and declaring it pushes the obligation to the caller.

---

### Say this in the interview

*"Everything throwable extends Throwable, which splits into Error for JVM-level failures you do not catch, and Exception for application failures. Everything under Exception is checked except the RuntimeException subtree, which is unchecked.*

*A checked exception must be caught or declared in the throws clause, which the compiler enforces as catch or specify. The intent is that checked exceptions represent recoverable conditions outside the program's control, like IOException, while unchecked exceptions signal programming errors, like NullPointerException or IllegalArgumentException.*

*Modern languages dropped them for three reasons: they encourage exception swallowing in empty catch blocks, they break encapsulation because the throws clause is part of the signature and leaks implementation choices to callers, and they interact badly with lambdas, since standard functional interfaces do not declare them. Common Java practice now is to wrap checked exceptions in unchecked ones at the boundary.*

*try-with-resources closes anything implementing AutoCloseable automatically, in reverse order of declaration, and if both the body and close throw, the body's exception propagates with the close failure attached through suppressed exceptions rather than replacing it.*

*The Spring trap is that @Transactional rolls back only on unchecked exceptions and Error by default, so a checked exception commits the transaction. The fix is rollbackFor = Exception.class. A related trap is self-invocation: calling an annotated method from within the same class bypasses the proxy, so no transaction starts."*
