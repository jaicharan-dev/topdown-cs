---
id: 29-stringbuilder-vs-stringbuffer
title: "StringBuilder vs. StringBuffer"
description: "Understand the thread-safety trade-offs between StringBuilder and StringBuffer for text manipulation."

sidebar_position: 29
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "We always hear that you shouldn't concatenate strings in a loop. Why is that, and how do `StringBuilder` and `StringBuffer` solve the problem differently?"

### ELI5: The Lego Tower
Imagine you are building a tall Lego tower.

Using a standard String in a loop is like playing with a weird rule: every time you want to add a single block to the top, you are forced to throw your entire tower in the trash, walk to the store, buy a brand-new set of blocks, and rebuild the tower from scratch with the new block on top. Doing this 10,000 times will exhaust you (and fill your trash can).

StringBuilder removes that rule. You just snap the new block onto the top of your existing tower. It is fast, easy, and creates no trash.

StringBuffer is exactly the same as StringBuilder, but it puts a padlock on the room. It ensures only one person can add a block at a time so nobody bumps elbows and breaks the tower. The padlock makes it safer for groups, but slightly slower to use.

### The Proper Answer: Immutability and Memory Churn
In languages like Java and C#, String objects are immutable. Once created in memory, their state cannot be changed.

When you use the + or += operator in a loop (str += "a"), the program doesn't just append a character to the existing memory space. Instead, it:
1.  Allocates a completely new block of memory.
2.  Copies the contents of the old string into the new block.
3.  Appends the new character.
4.  Abandons the old string object.

If you loop 10,000 times, you create 10,000 abandoned string objects. This forces the Garbage Collector to work overtime to clean up the heap, and it degrades the time complexity of the concatenation to O(N<sup>2</sup>).

### The Solution: Mutable Alternatives
To solve this, we use mutable classes backed by a resizable array, which append data in O(1) amortized time.

*   **StringBuilder (The Default Choice):** It modifies the underlying array in place. However, it is not thread-safe. If two threads try to append to it simultaneously, the data can become corrupted. Because it doesn't bother with thread synchronization, it is extremely fast and should be used 99% of the time.
*   **StringBuffer (The Legacy/Thread-Safe Choice):** It does the exact same thing as StringBuilder, but almost all of its methods are marked with the synchronized keyword. This guarantees thread safety, meaning multiple threads can write to it without data race conditions. However, acquiring and releasing these locks adds performance overhead.

### See It In Action
This widget simulates the massive difference in memory allocation and performance when concatenating strings in a loop.

### Interview Summary
This is an easy question, so you want to answer it quickly and decisively using the correct vocabulary:
1.  **The Problem:** Strings are immutable. Concatenating them in a loop forces the program to constantly create and abandon new objects, leading to O(N<sup>2</sup>) time complexity and massive Garbage Collection overhead.
2.  **The Difference:** Both StringBuilder and StringBuffer solve this by being mutable.
3.  **The Deciding Factor:** StringBuilder is faster but not thread-safe. StringBuffer is thread-safe (synchronized) but carries a performance penalty. Default to StringBuilder unless you have multiple threads actively sharing the exact same string instance.

---

### Crucial Nuance: The Java 9+ `StringConcatFactory` Optimization

A common trap in modern Java interviews is assuming that *every* string concatenation using the `+` operator is fundamentally slow and must be replaced by `StringBuilder`. While this is true for loops, it's a misconception for simple, inline string concatenations (e.g., `String result = "Hello " + name + "!";`). 

Starting in Java 9, the compiler uses `invokedynamic` and `StringConcatFactory` to optimize inline concatenations at runtime. This means the JVM can aggressively optimize and even out-perform a manual `StringBuilder` for simple, single-statement concatenations. You should still absolutely use `StringBuilder` inside loops where memory churn is a real threat, but for simple one-liners, rely on the `+` operator for readability—the JVM has your back!
