---
id: 29-stringbuilder-vs-stringbuffer
title: "StringBuilder vs. StringBuffer"
description: "Understand the thread-safety trade-offs between StringBuilder and StringBuffer for text manipulation."
sidebar_position: 10
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "We always hear that you shouldn't concatenate strings in a loop. Why is that, and how do `StringBuilder` and `StringBuffer` solve the problem differently?"

### The Quick Answer

"`String` objects are immutable in Java. Concatenating them in a loop using the `+` operator allocates a new `String` object and copies the accumulated characters on every single iteration, degrading runtime performance to `O(N^2)` time complexity and causing severe Garbage Collection (GC) churn. `StringBuilder` and `StringBuffer` solve this by wrapping a mutable internal buffer (`byte[]` in modern Java, `char[]` historically) that appends data in amortized `O(1)` time. The difference is concurrency: `StringBuilder` is unsynchronized and faster (the modern default for single-threaded operations), whereas `StringBuffer` is thread-safe because its mutating methods are `synchronized`, introducing synchronization lock overhead."

---

### The ELI5 Analogy: The Lego Tower

Imagine you are building a tall Lego tower.

- **`String` in a loop:** You play with a bizarre rule: every time you want to add a single block to the top of your tower, you are forced to throw your entire existing tower into the trash, walk to the store, buy a brand-new set of blocks, and rebuild the entire tower from scratch with the new block on top. Doing this 10,000 times will exhaust you, waste enormous time, and fill your trash can to overflowing (forcing the Garbage Collector to clean up your mess).
- **`StringBuilder`:** Removes that rule. You snap the new block directly onto the top of your existing tower in-place. It is fast, effortless, and creates zero trash.
- **`StringBuffer`:** Exactly the same as `StringBuilder`, but it puts a padlock on the room. It ensures only one person can enter and snap a block onto the tower at a time so nobody bumps elbows and corrupts the structure. The padlock makes it safe for concurrent groups, but waiting for the key slows everyone down.

---

### Core Comparison: String vs. StringBuilder vs. StringBuffer

| Dimension | `String` | `StringBuilder` | `StringBuffer` |
| :--- | :--- | :--- | :--- |
| **Mutability** | **Immutable** (State cannot change after creation) | **Mutable** (In-place buffer modification) | **Mutable** (In-place buffer modification) |
| **Thread Safety** | **Thread-Safe** (Immutable state is inherently thread-safe) | **Not Thread-Safe** (No synchronization) | **Thread-Safe** (Methods are `synchronized`) |
| **Synchronization Overhead** | None | None | High (Acquires/releases intrinsic monitor locks) |
| **Performance (Single-Thread)** | Very slow for repeated mutations (`O(N^2)` in loops) | **Fastest** (Zero lock contention overhead) | Slower than `StringBuilder` due to lock checks |
| **Memory Allocation in Loops** | Allocates `N` intermediate objects on heap | Single expandable internal buffer | Single expandable internal buffer |
| **Internal Storage** | `byte[]` (Java 9+ Compact Strings) / `char[]` | `byte[]` / `char[]` resizable buffer | `byte[]` / `char[]` resizable buffer |
| **Introduced In** | Java 1.0 | Java 5 (J2SE 5.0) | Java 1.0 |
| **Default Recommendation** | Constants, dictionary keys, entity fields | Local string building, loops, formatters | Shared cross-thread buffer (rare in modern code) |

---

### Technical Breakdown: Immutability and Memory Churn

In Java, `String` is an immutable class backed by a `final byte[]` (Java 9+) or `final char[]` (Java 8 and earlier). When you perform repeated concatenation in a loop:

```java
String result = "";
for (int i = 0; i < n; i++) {
    result += i; // Catastrophic antipattern!
}
```

The runtime executes the following sequence on **every iteration**:
1. Allocates a new array on the heap of size `length(oldString) + length(newContent)`.
2. Copies all characters from the old string into the new array using `System.arraycopy`.
3. Appends the new character sequence.
4. Wraps the array in a new `String` object.
5. Abandons the previous `String` object on the heap.

If the loop runs `N` times, the total characters copied is:

`1 + 2 + 3 + ... + N = N * (N + 1) / 2 = O(N^2)`

Furthermore, `N` intermediate string objects are orphaned on the heap, triggering frequent Minor Garbage Collection pauses and degrading overall application throughput.

#### The Mutable Resizable Buffer Solution

`StringBuilder` and `StringBuffer` extend `AbstractStringBuilder`, which encapsulates an internal expandable buffer:

- **Default Initial Capacity:** 16 characters (or `str.length() + 16` if initialized with a string).
- **Growth Algorithm:** When the buffer fills, capacity is expanded via `(oldCapacity << 1) + 2` (doubling plus 2).
- **In-Place Append:** Appending a character or string simply writes into the pre-allocated buffer and increments an internal `count` pointer. Memory reallocation and array copying occur only logarithmically during buffer growth, yielding **amortized `O(1)`** append time.

---

### Code Examples: Performance & Concurrency

<Tabs groupId="programming-language">
<TabItem value="loop-comparison" label="Loop Concatenation" default>

```java
// Antipattern: O(N^2) time complexity and massive GC churn
public String buildCsvBad(List<String> items) {
    String csv = "";
    for (String item : items) {
        csv += item + ","; // Creates a new String object on every single iteration!
    }
    return csv;
}

// Recommended: O(N) time complexity and minimal heap allocations
public String buildCsvGood(List<String> items) {
    // Pre-sizing initial capacity avoids intermediate buffer resizing
    StringBuilder sb = new StringBuilder(items.size() * 16);
    for (String item : items) {
        sb.append(item).append(",");
    }
    return sb.toString();
}
```

</TabItem>
<TabItem value="concurrency-demo" label="Thread Safety Demonstration">

```java
import java.util.concurrent.*;

public class ConcurrencyDemo {
    public static void main(String[] args) throws InterruptedException {
        int threads = 10;
        int appendsPerThread = 1000;
        int expectedLength = threads * appendsPerThread;

        // 1. StringBuilder: Race condition causes data loss or ArrayIndexOutOfBoundsException
        StringBuilder unsafeSb = new StringBuilder();
        ExecutorService pool1 = Executors.newFixedThreadPool(threads);
        for (int i = 0; i < threads; i++) {
            pool1.submit(() -> {
                for (int j = 0; j < appendsPerThread; j++) {
                    unsafeSb.append("A"); // count++ is NOT thread-safe!
                }
            });
        }
        pool1.shutdown();
        pool1.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("StringBuilder length: " + unsafeSb.length() + " (Expected: " + expectedLength + ")");

        // 2. StringBuffer: Synchronized methods guarantee safe concurrent writes
        StringBuffer safeSb = new StringBuffer();
        ExecutorService pool2 = Executors.newFixedThreadPool(threads);
        for (int i = 0; i < threads; i++) {
            pool2.submit(() -> {
                for (int j = 0; j < appendsPerThread; j++) {
                    safeSb.append("A"); // synchronized append guarantees safety
                }
            });
        }
        pool2.shutdown();
        pool2.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("StringBuffer length: " + safeSb.length() + " (Expected: " + expectedLength + ")");
    }
}
```

</TabItem>
</Tabs>

---

### Crucial Nuance: The Java 9+ `StringConcatFactory` Optimization

A common interview trap is assuming that *every* string concatenation using the `+` operator is fundamentally slow and must be manually replaced with `StringBuilder`. While this is strictly true for loops, it is **unnecessary for simple, single-statement expressions**.

Consider:
```java
String fullName = firstName + " " + lastName;
```

#### Historical Behavior (Java 5 through Java 8)
The compiler translated the line above into:
```java
String fullName = new StringBuilder().append(firstName).append(" ").append(lastName).toString();
```

#### Modern Behavior (Java 9+ via JEP 280)
The compiler emits an `invokedynamic` bytecode instruction targeting `StringConcatFactory.makeConcatWithConstants`. At runtime, the JVM analyzes the arguments, calculates the exact byte length needed up front, allocates a single byte array, and constructs the resulting string with zero intermediate `StringBuilder` overhead.

> **The Loop Exception:** The compiler **cannot** optimize concatenation across loop iterations because the accumulation spans distinct loop cycles. Inside loops, manual `StringBuilder` usage remains strictly mandatory.

---

### Concise Interview Answer

1. **The Problem:** `String` is immutable. Concatenating in a loop using `+` reallocates the string and copies existing characters on every cycle, causing `O(N^2)` time complexity and heavy Garbage Collection pressure.
2. **The Mechanism:** `StringBuilder` and `StringBuffer` wrap a mutable, auto-resizing buffer that executes append operations in amortized `O(1)` time.
3. **The Concurrency Rule:** `StringBuilder` is unsynchronized, faster, and the default choice for 99% of single-threaded code. `StringBuffer` is synchronized and thread-safe, but incurs lock acquisition overhead.
4. **Modern Nuance:** Single-statement string concatenation is optimized at runtime via Java 9 `invokedynamic` (`StringConcatFactory`), but loops still require explicit `StringBuilder` instances.
