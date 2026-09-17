---
id: garbage-collection-stack-heap
title: "Garbage Collection, Stack vs Heap"
sidebar_position: 32
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** What is garbage collection in Java? How does the JVM decide what to collect, and what is the difference between stack and heap memory?

### The Interview Quick-Hit

"Garbage Collection (GC) is Java's automatic memory management system. It runs in the background, looking for objects in the Heap memory that no longer have any active references pointing to them. Once an object is 'unreachable,' the GC destroys it and reclaims the memory, saving the developer from having to manually allocate and free memory (like you must do in C or C++)."

### Part 1: Stack vs. Heap Memory (The Foundation)

To understand Garbage Collection, you first have to understand where things live in memory. The JVM divides memory into two main areas: the **Stack** and the **Heap**.

Think back to the Remote Control and the TV analogy.
- The **Stack** is where you hold the Remote Controls (reference variables) and small scratchpad data.
- The **Heap** is the massive warehouse where the actual TVs (the objects themselves) are stored.

| Feature | The Stack | The Heap |
| --- | --- | --- |
| **What it stores** | Primitive variables (`int`, `boolean`), Method calls, and References to objects. | The actual Objects (anything created with the `new` keyword). |
| **Lifecycle** | Extremely short. It is automatically cleared the exact millisecond a method finishes executing. | Long-lived. Objects stay here until the Garbage Collector destroys them. |
| **Scope** | Private. Every single thread gets its own isolated Stack. | Global. All threads share the exact same Heap memory. |
| **Errors** | Throws `StackOverflowError` (usually from infinite recursion). | Throws `OutOfMemoryError` (when the warehouse is completely full). |

### Part 2: How the JVM Decides What to Collect

Garbage Collection only operates on the Heap. The Stack cleans up after itself automatically.
So, how does the JVM know which objects in the Heap are safe to destroy? It uses a process called **Reachability Analysis**.

#### The ELI5 Analogy: The Kites and the Strings

Imagine the objects in the Heap are Kites flying in the sky. The reference variables in the Stack are people standing on the ground holding the Strings.
As long as a person on the ground is holding the string, the kite is anchored. It is "reachable." If the person lets go of the string (or if the person leaves the field entirely), the kite is instantly lost to the wind. The Garbage Collector is a street sweeper that drives around picking up any kites that are no longer connected to a string.

#### The Technical Process (Mark and Sweep)

1. **Identify the GC Roots:** The JVM starts at the ground floor (the active Stack frames, active threads, and static variables). These are the anchors.
2. **The Mark Phase:** The JVM traces every single reference pointer from those roots out into the Heap. Every object it can successfully reach gets "marked" as alive.
3. **The Sweep Phase:** The JVM scans the entire Heap. Any object that was not marked as alive during step 2 is considered garbage. Its memory is immediately wiped clean and reclaimed.

#### How to "Cut the String" in Code

You cannot force the Garbage Collector to run (though you can politely request it with `System.gc()`, the JVM usually ignores it). But you can cut the string to make an object eligible for collection:

```java
// 1. We create a new TV (Heap) and a remote (Stack)
Dog myDog = new Dog("Spot"); 

// 2. We explicitly cut the string. 
// myDog now points to nothing. The Dog object "Spot" is orphaned.
myDog = null; 

// 3. Reassigning the remote (also cuts the string to the old TV)
// The original "Spot" TV is now orphaned because the remote points to Buster.
myDog = new Dog("Buster"); 
```

### The Interview Takeaway

If you want to seal the deal, explicitly mention the performance trade-off: "While Garbage Collection prevents massive memory leaks and dangling pointers, it comes at a cost. When a major Garbage Collection cycle runs, it triggers a 'Stop-the-World' event, briefly pausing all application threads to safely sweep the memory. In high-frequency trading or low-latency fintech systems, minimizing these GC pauses is a major architectural priority."

---

### Crucial Nuance: Escape Analysis and Stack Allocation

A hyper-advanced interview question is: "Are all objects in Java allocated on the Heap?" The textbook answer is yes, but the real-world answer is no. 

Modern JVMs use a performance optimization technique called Escape Analysis. Before running the code, the JVM analyzes a method. If it determines that an object is created and used entirely within that single method (it never "escapes" to another thread or method), the JVM may silently allocate that object directly on the Stack instead of the Heap. This is a massive performance boost because the object is instantly destroyed when the method finishes, requiring absolutely zero Garbage Collection overhead.
