---
id: 29-stringbuilder-vs-stringbuffer
title: "StringBuilder vs. StringBuffer"
description: "Understand the thread-safety trade-offs between StringBuilder and StringBuffer for text manipulation."
sidebar_position: 10
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "We always hear that you shouldn't concatenate strings in a loop. Why is that, and how do `StringBuilder` and `StringBuffer` solve the problem differently?"

### The Lego tower analogy

Imagine you're building a tall Lego tower.

- **`String` in a loop:** every time you want to add one block, you're forced to throw out the entire existing tower, buy a whole new set of blocks, and rebuild it from scratch with the new block on top. Do that 10,000 times and you've wasted enormous time and filled the trash can (that's the Garbage Collector cleaning up your mess).
- **`StringBuilder`:** no such rule. You just snap the new block onto the top of the existing tower, in place. Fast, and no trash created.
- **`StringBuffer`:** the same as `StringBuilder`, but with a padlock on the room — only one person can snap a block on at a time, so nobody corrupts the tower by working on it simultaneously. Safe for a crowd, but everyone waits their turn.

<Diagram>
<Row>
<Box title="StringBuilder" accent="#60a5fa"><Field icon="⚡" code="not thread-safe" hint="faster, single-threaded use" variant="neutral" /></Box>
<Box title="StringBuffer" accent="#34d399"><Field icon="🔒" code="thread-safe (synchronized)" hint="slower, safe across threads" variant="neutral" /></Box>
</Row>
</Diagram>

That's really the whole story: both fix the same problem `String` has, and the only difference between them is whether they lock for thread safety.

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

### Why `String` is slow in a loop

`String` is immutable: once created, it never changes. So this looks harmless, but it's an antipattern:

```java
String result = "";
for (int i = 0; i < n; i++) {
    result += i; // Catastrophic antipattern!
}
```

Every single iteration, Java has to:
1. Allocate a brand-new array big enough for the old content plus the new piece.
2. Copy every character from the old string into it.
3. Append the new content.
4. Wrap it all in a new `String` object.
5. Throw away the previous `String` — it's now garbage.

Do that `N` times and the total amount of copying is `1 + 2 + ... + N`, which is `O(N^2)`. You've also left `N` abandoned objects behind for the Garbage Collector to clean up, which adds its own slowdown.

### How `StringBuilder`/`StringBuffer` fix it

Both wrap a resizable internal buffer instead of making a new object every time:

- **Starting size:** 16 characters (or `str.length() + 16` if you start from a string).
- **Growth:** when the buffer fills up, it roughly doubles.
- **Appending:** just writes into the buffer and bumps a counter — no copying, except on the rare occasion the buffer needs to grow. That makes appends **amortized `O(1)`**.

---

### Code: performance and concurrency

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

### The nuance: Java 9+ already optimizes simple concatenation

A common trap is assuming *every* `+` concatenation is slow. That's only true inside loops. A single-statement concatenation like this:

```java
String fullName = firstName + " " + lastName;
```

...used to compile down to a hidden `StringBuilder` (Java 5–8). Since Java 9 (JEP 280), the compiler instead emits an `invokedynamic` call to `StringConcatFactory`, which works out the exact byte length needed and builds the result in one shot — no intermediate `StringBuilder` at all.

The compiler just can't do this trick across loop iterations, since the accumulation spans multiple cycles — so inside a loop, you still need to reach for `StringBuilder` yourself.

---

### Say this in the interview

*"`String` is immutable, so concatenating in a loop with `+` reallocates and copies the whole string every iteration — `O(N^2)` time and heavy GC pressure. `StringBuilder` and `StringBuffer` fix this with a mutable, resizable buffer that appends in amortized `O(1)`. The only difference between them is concurrency: `StringBuilder` is unsynchronized and faster — the right default for single-threaded code — while `StringBuffer` synchronizes its methods, making it thread-safe but slower. One nuance: since Java 9, a single-statement concatenation is already optimized by the compiler via `invokedynamic`, so manual `StringBuilder` use is really only mandatory inside loops."*
