---
id: 34-throw-vs-throws-finally-return
title: "throw vs throws, does finally run if try has a return"
description: "Navigate complex exception handling flows, including the behavior of finally blocks during early returns."
sidebar_position: 13
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "`throw` vs `throws`, and does a `finally` block execute if the `try` block contains an early `return` statement?"

### The short version

`throw` and `throws` are not two versions of the same thing - they happen in different places and do different jobs:

- **`throws`** sits on a method's signature. It's a warning label: *"this method might hand you a checked exception, so be ready to catch it."*
- **`throw`** sits inside a method body. It's the actual act of raising an exception, right now, at this line.

And yes - **`finally` always runs**, even if `try` already hit a `return`. The JVM holds onto the return value, runs `finally`, and only then actually returns. The one trap: if `finally` *itself* has a `return`, it silently throws away whatever `try` was about to return - and even swallows an exception that was in flight.

---

### The analogies

**`throws` is the warning label on a crate.** It sits on the outside, telling whoever opens it: *"may contain broken glass - wear gloves before you open this."* **`throw`** is the moment the glass actually breaks and someone gets hit by it.

**`finally` is the bouncer at the exit.** You say "I'm leaving now" (`return`). The bouncer doesn't stop you from leaving - but he stops you *at the door* until you settle your tab (cleanup code), and only then lets you step outside.

---

### `throw` vs. `throws`, side by side

| | `throw` | `throws` |
| :--- | :--- | :--- |
| **Purpose** | Actually raises an exception | Declares exceptions a method might hand off |
| **Where it goes** | Inside the method body | In the method signature |
| **What follows it** | An exception **instance** - `throw new IOException(...)` | Exception **types** - `throws IOException, SQLException` |
| **How many** | One per statement | Can list several, comma-separated |
| **Required for** | Any `Throwable` | Mandatory for checked exceptions, optional for unchecked |
| **Runtime effect** | Immediately unwinds the call stack | None by itself - it's just documentation the compiler enforces |

---

### Does `finally` run if `try` already returned?

Yes. Here's the order of events when a `return` sits inside `try`:

1. The return expression is evaluated.
2. The JVM holds that value on the stack - it doesn't hand it back yet.
3. Control jumps to `finally`.
4. `finally` runs to completion.
5. Only now does the held value actually get returned to the caller.

```java
public class FinallyExecutionFlow {
    public static int compute() {
        try {
            System.out.println("1. Inside try block");
            return 100; // value is held, not returned yet
        } finally {
            System.out.println("2. Inside finally block"); // runs BEFORE caller gets 100
        }
    }

    public static void main(String[] args) {
        int result = compute();
        System.out.println("3. Returned result: " + result);
    }
}
```

```text
1. Inside try block
2. Inside finally block
3. Returned result: 100
```

---

### The trap: putting `return` inside `finally`

If `finally` has its own `return`, it hijacks the whole return sequence.

<Tabs groupId="exception-traps">
<TabItem value="return-override" label="1. It overwrites the return value" default>

```java
public static int overrideDemo() {
    try {
        return 10; // held, waiting to be returned
    } finally {
        return 20; // overwrites it. Caller gets 20, not 10.
    }
}
```

`finally`'s `return` starts its own return sequence and throws away whatever `try` was holding.

</TabItem>
<TabItem value="exception-swallow" label="2. It swallows exceptions">

```java
public static int swallowDemo() {
    try {
        throw new RuntimeException("Fatal Database Connection Failure");
    } finally {
        return 42; // the exception above is gone. No trace, no log.
    }
}
```

If `try` throws and `finally` returns, the exception is discarded completely - the method just returns `42` as if nothing happened. This is one of the nastiest silent bugs you can write in Java, because nothing ever gets logged.

</TabItem>
</Tabs>

---

### The few cases where `finally` genuinely doesn't run

`finally` is reliable - except for these five:

1. **`System.exit()` or `Runtime.getRuntime().halt()`** called inside `try`/`catch` - this kills the JVM immediately.
2. **The JVM itself crashes** (a segfault) or the OS kills the process (`kill -9`, End Process).
3. **The hardware dies** - power loss, kernel panic.
4. **An infinite loop or deadlock** inside `try` - execution never reaches the end of the block, so `finally` never gets a turn.
5. **A daemon thread gets cut off** - if it's still running `finally` when every non-daemon thread has exited, the JVM shuts down without waiting for it.

---

### A cleaner fix: try-with-resources

Before Java 7, closing a resource in `finally` could silently hide the real error:

```java
// Legacy pattern - the read error below gets lost if close() also throws
InputStream in = null;
try {
    in = new FileInputStream("file.txt");
    in.read(); // say this throws IOException("Read Failed")
} finally {
    if (in != null) {
        in.close(); // if THIS throws too, the read error disappears
    }
}
```

**`try-with-resources`** (Java 7+, works with anything implementing `AutoCloseable`) fixes this: the original exception from `try` is kept as the primary one, and the exception from closing is attached to it as a "suppressed" exception (`Throwable.getSuppressed()`) instead of replacing it.

---

### Say this in the interview

*"`throw` raises an exception at a specific line; `throws` is a declaration on the method signature saying what checked exceptions might come out of it. A `finally` block always runs, even after a `try` hits a `return` - the JVM holds the return value, runs `finally`, then returns it. The one thing to never do is put a `return` inside `finally`: it silently overwrites the pending return value and can swallow an exception that was already in flight."*
