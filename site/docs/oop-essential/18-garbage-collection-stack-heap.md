---
id: 18-garbage-collection-stack-heap
title: "Garbage Collection: Stack vs. Heap Memory"
description: "Reachability rather than reference counting, and why the heap is split by age"

sidebar_position: 18
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Walk me through how Garbage Collection works in Java. What are GC Roots, how does the Generational Hypothesis divide heap memory, and how do Stack and Heap differ?"

---

### Picture it

Think of a warehouse with a reception desk.

**The reception desk is a stack of job sheets.** A visitor arrives, you put their sheet on top; they leave, you take it off. Sheets are added and removed in strict order, the desk is small and fast to work with, and nobody has to decide when to clear a sheet away: it goes the moment that visit ends.

**The warehouse floor holds the actual goods.** Items are placed anywhere there is space, they outlive the visit that ordered them, and the floor is large.

**Clearing the floor is the hard part.** You cannot ask each item whether it is still wanted, because items refer to each other and a cluster of them can happily insist they are all needed while nobody outside wants any of them.

So the warehouse does not ask. It starts from the **doors into the building** and walks every route inward, marking whatever it reaches. Anything unmarked after that walk is unreachable from outside, and goes, whatever it claims about itself.

Those doors are the GC roots, and that walk is the whole idea.

---

### The proper terms

#### Stack and heap

The **stack** holds one **stack frame** per method call, containing local variables and partial results. It is per-thread, allocated and freed in **LIFO** order, and deallocation is automatic when a method returns. It is fast, small, and overflowing it raises **StackOverflowError**, typically from unbounded recursion.

The **heap** holds all objects and arrays. It is shared across threads, objects live until collected, and exhausting it raises **OutOfMemoryError**.

The connection is that a local variable on the stack holds a **reference**, while the object it names lives on the heap. Primitives declared locally live entirely on the stack.

#### GC roots and reachability

Java uses **reachability**, not **reference counting**. Counting references cannot reclaim a **cyclic reference**, where two objects point at each other and nothing else points at either, since both counts stay above zero forever.

Instead the collector starts from the **GC roots** and marks everything reachable. The roots include local variables in every active stack frame, static fields, JNI references, and live threads themselves.

Anything not reached is garbage, by definition, which handles cycles naturally: a cycle with no route from a root is simply never marked.

#### The generational hypothesis

The **weak generational hypothesis** is the observation that **most objects die young**. A small fraction survive long, and references from old objects to young ones are rare.

The heap is therefore split. The **Young Generation** holds new objects and is divided into **Eden** and two **survivor spaces**, S0 and S1. The **Old Generation**, or tenured space, holds objects that have survived several collections.

Allocation happens in Eden. When Eden fills, a **Minor GC** runs: live objects are copied into a survivor space and everything else is discarded wholesale, which is cheap precisely because so little survives. Objects that survive enough rounds, governed by a **tenuring threshold**, are **promoted** to the Old Generation.

A **Major GC**, or Full GC, collects the Old Generation. It is far more expensive and causes longer **stop-the-world** pauses, where application threads are suspended.

Since Java 8, class metadata sits in **Metaspace** in native memory, replacing the fixed-size **PermGen**.

#### Algorithms

**Mark and sweep** marks reachable objects then frees the rest, leaving **fragmentation**. **Mark-compact** adds a step that slides survivors together, removing fragmentation at the cost of more work. **Copying** collectors move live objects to a fresh space, which is what the young generation does.

Common collectors: Serial, Parallel (throughput-oriented), **G1**, the default since Java 9, which divides the heap into regions and targets a pause goal, and **ZGC** and **Shenandoah**, which aim for pauses under a few milliseconds on very large heaps.

#### What you cannot control

`System.gc()` is a **request**, not a command, and the JVM may ignore it. Calling it is discouraged because it usually triggers a Full GC at the worst moment.

Memory leaks still happen in Java, not from forgotten frees but from unintended reachability: objects still referenced from a static collection, a cache without eviction, an unremoved listener, or a non-static inner class pinning its enclosing instance.

---

### In code

```java
import java.util.ArrayList;
import java.util.List;

public class Demo {

    private static final List<byte[]> CACHE = new ArrayList<>();   // a GC root

    static void allocate() {
        byte[] local = new byte[1024];      // reference on the stack, array on the heap
        // 'local' dies when this method returns, so the array becomes unreachable
    }

    static void leak() {
        CACHE.add(new byte[1024 * 1024]);   // reachable from a static field forever
    }

    static class Node { Node partner; }

    static void cycle() {
        Node a = new Node();
        Node b = new Node();
        a.partner = b;
        b.partner = a;                      // they reference each other
        // Once a and b leave scope, no route from any root reaches them,
        // so reachability collects both. Reference counting could not.
    }

    public static void main(String[] args) {
        allocate();
        cycle();
        leak();                             // this one is never reclaimed
    }
}
```

`cycle` and `leak` are the contrast worth remembering. A reference cycle is not a leak under a reachability collector. A live static collection is, even though nothing is circular about it.

---

### What they ask next

**"Why not use reference counting?"**
It cannot reclaim cycles, and maintaining counts on every assignment is costly. Its advantage is immediate reclamation, which is why languages like Swift and Python use it, with Python adding a cycle detector.

**"Can you force garbage collection?"**
No. `System.gc()` is advisory. If you need deterministic cleanup, use try-with-resources and `AutoCloseable` rather than relying on the collector.

**"What replaced `finalize()`?"**
It is deprecated and removed. The replacements are try-with-resources for scoped resources and `java.lang.ref.Cleaner` for a safety net, since finalizers ran unpredictably and could resurrect objects.

**"Why are survivor spaces in a pair?"**
Copying collection needs a destination. Each minor GC copies live objects from Eden and the occupied survivor space into the empty one, then swaps their roles, which compacts automatically and leaves no fragmentation.

**"Where do local primitives live?"**
On the stack, inside the frame. Only objects and arrays are on the heap, and escape analysis may even allocate a non-escaping object on the stack.

**The common wrong answer** is "the GC frees objects with no references". It frees objects **not reachable from a root**, which is what makes cycles collectable.

---

### Say this in the interview

*"The stack holds a stack frame per method call with local variables, is per-thread, is freed in LIFO order when a method returns, and overflowing it gives StackOverflowError. The heap holds all objects and arrays, is shared between threads, and exhausting it gives OutOfMemoryError. A local variable on the stack holds a reference to an object on the heap.*

*Java collects by reachability rather than reference counting, because reference counting cannot reclaim a cyclic reference. The collector starts from the GC roots, which are local variables in active stack frames, static fields, JNI references and live threads, and marks everything reachable. Whatever is unmarked is garbage, which handles cycles naturally.*

*The weak generational hypothesis is that most objects die young, so the heap is split. The Young Generation has Eden and two survivor spaces; allocation happens in Eden, and a Minor GC copies the few survivors into a survivor space, which is cheap because so little lives. Objects surviving past the tenuring threshold are promoted to the Old Generation, collected by a more expensive Major GC with longer stop-the-world pauses. Class metadata moved to Metaspace in Java 8, replacing PermGen.*

*Algorithms include mark and sweep, which leaves fragmentation, mark-compact, which removes it, and copying collectors for the young generation. G1 has been the default since Java 9, with ZGC and Shenandoah for low pause times.*

*System.gc() is only a request. Leaks in Java come from unintended reachability, such as static collections, unbounded caches and unremoved listeners."*
