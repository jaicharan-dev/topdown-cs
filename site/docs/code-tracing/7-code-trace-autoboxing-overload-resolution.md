---
id: 7-code-trace-autoboxing-overload-resolution
title: "Code trace: autoboxing and overload resolution priority"
description: "Discover the priority rules Java uses to resolve method overloads when autoboxing and varargs are involved."

sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** Which overload gets called, and why? What does this tell you about the compiler's priority order when resolving overloaded methods?
>
> ```java
> class Calc  {
>     void process(int x)  {
>         System.out.println("int version: " + x);
>     }
>     void process(Integer x)  {
>         System.out.println("Integer version: " + x);
>     }
>     void process(long x)  {
>         System.out.println("long version: " + x);
>     }
>     public static void main(String[] args)  {
>         Calc c = new Calc();
>         c.process(5);
>     }
> }
> ```

### The Interview Quick-Hit

"The code will print `int version: 5`. The compiler always prioritizes an 'exact primitive match' first. This question tests your knowledge of Java's strict method resolution hierarchy, which dictates that the compiler prefers widening a primitive over autoboxing it into a wrapper class."

### Execution Trace & Output

```text
int version: 5
```

### Step-by-step breakdown:
1.  **Exact Match (The first choice):** Because the literal `5` is a primitive `int` by default in Java, the compiler sees `process(int x)` and immediately recognizes it as a 100% perfect match.

### The Interview Trap: The Priority Order
Interviewers rarely stop at the exact match. As soon as you answer correctly, they will verbally erase the `process(int)` method from the whiteboard and ask: "Okay, what if I delete the `int` method? Now it only has `process(Integer)` and `process(long)`. Which one does it call?"

Most students guess `process(Integer)` because they think, "5 is an integer, so it should become an `Integer` object."

They are wrong. The code will print `long version: 5`.

Here is the exact priority order the Java compiler uses to resolve overloaded methods. You should memorize this hierarchy:

1.  **Exact Match (The first choice):** The compiler looks for the exact primitive type. (e.g., `int` to `int`).
2.  **Widening (The fallback):** If the exact primitive isn't found, the compiler looks for a larger primitive that can safely hold the value without losing data. It implicitly widens the `int` (32 bits) into a `long` (64 bits). Why? Because widening is a highly efficient, CPU-level native operation that has existed since Java 1.0.
3.  **Autoboxing (The expensive operation):** If no suitable primitive methods exist at all, the compiler falls back to Autoboxing. It takes the primitive `int`, pauses to allocate memory on the Heap, and creates a brand new `Integer` object. Why is this lower priority? Because allocating memory for an object is significantly slower and more resource-intensive than just padding a primitive with extra zeros (widening).
4.  **Varargs (The last resort):** If none of the above exist, it will look for a variable argument method like `process(int... x)`. This is the absolute lowest priority because it requires the JVM to instantiate a brand new array under the hood just to hold your single value.

### The Backend / Production Reality
Understanding this hierarchy is critical for writing high-performance backend code. If you accidentally write your methods in a way that forces Java to Autobox thousands of integers into `Integer` objects inside a `while` loop, you will flood the Heap memory and trigger a massive Garbage Collection pause, degrading your server's performance.

---

### Crucial Nuance: The Ambiguous Null Trap

When dealing with overloaded methods that accept wrapper classes or reference types (like `process(Integer)` and `process(String)`), passing `null` will cause a compile-time ambiguity error if there isn't a more specific class. Since `null` can be cast to any reference type, the compiler cannot definitively choose between the overloads. You must explicitly cast `null` (e.g., `process((Integer) null)`) to resolve this.
