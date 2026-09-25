---
id: 18-garbage-collection-stack-heap
title: "Garbage Collection: Stack vs. Heap Memory"
description: "Differentiate between Stack memory and Heap memory, and understand how the Garbage Collector reclaims space using the Generational Hypothesis."

sidebar_position: 18
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Walk me through how Garbage Collection works in Java. What are GC Roots, how does the Generational Hypothesis divide heap memory, and how do Stack and Heap differ?"

### The Quick Answer

"The **Stack** is thread-private, short-lived memory that manages primitive variables and object reference pointers during method execution; it cleans up automatically when stack frames pop. The **Heap** is global, shared memory where all instantiated objects reside. Java’s **Garbage Collector (GC)** runs in the background, performing reachability analysis starting from **GC Roots** to reclaim unreachable heap objects, organized around the **Weak Generational Hypothesis**."

---

### Stack vs. Heap Memory

| Feature | The Stack | The Heap |
|---|---|---|
| **What It Stores** | Primitive variables, method call frames, reference pointers. | Actual object instances (anything created via `new`). |
| **Scope & Concurrency** | **Thread-private.** Each thread has its own isolated stack. | **Globally shared.** All threads read and write to the same heap. |
| **Memory Reclamation** | **Automatic & Instantaneous.** Pops with the stack frame ($O(1)$). | **Non-deterministic.** Reclaimed by GC background passes. |
| **Failure Mode** | `StackOverflowError` (deep recursion). | `OutOfMemoryError` (heap exhaustion). |

---

### How the JVM Decides What to Collect: GC Roots

The JVM does not use naive reference counting (which fails on circular references). It uses **Reachability Analysis**:
1. It identifies **GC Roots**—unquestionably alive root references:
   * Local variables and method parameters on active thread call stacks.
   * Active, running Java threads.
   * Static fields belonging to loaded classes.
   * JNI (Java Native Interface) C/C++ global and local pointers.
2. The GC traces all pointer graphs outwards from these roots. Any object in the heap that cannot be reached from any GC root is considered **garbage**.

---

### The Generational Memory Architecture

Modern production garbage collectors (G1, ZGC, Parallel) organize the heap around the **Weak Generational Hypothesis**: *"The vast majority of objects die shortly after creation."*

```
┌─────────────────────────────────────── Heap ───────────────────────────────────────┐
│              Young Generation              │            Old / Tenured             │
│  ┌──────────────────┬───────────┬──────────┐  │  ┌────────────────────────────────────┐  │
│  │   Eden Space     │ S0 (From) │ S1 (To)  │  │  │   Long-Lived Objects               │  │
│  │ (New Allocations)│           │          │  │  │   (Promoted after surviving)       │  │
│  └──────────────────┴───────────┴──────────┘  │  └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

1. **Young Generation (Minor GC):**
   * **Eden Space:** All newly created objects start here. When Eden fills, a fast **Minor GC** triggers.
   * **Survivor Spaces (S0 & S1):** Objects surviving Eden are copied to one of the survivor spaces, and an **age counter** is incremented. Surviving objects alternate between S0 and S1 during each Minor GC.
2. **Old / Tenured Generation (Major / Full GC):**
   * When an object survives a designated number of GC cycles (the **tenuring threshold**, default `15` in HotSpot), it is promoted to the Old Generation.
   * Sweeping Old Gen triggers a **Major GC**, which often incurs longer **Stop-The-World (STW)** pauses where application threads are briefly paused.

---

### Crucial Nuance: Escape Analysis and Scalar Replacement

* **Question:** *"Are all Java objects strictly allocated on the Heap?"*
* **Answer:** Textbook answer is yes, but the real-world JIT answer is **no**.
* Through **Escape Analysis**, the JIT compiler analyzes the scope of an object. If the object never "escapes" the method where it is created (it is not returned, stored in an external field, or passed to other threads), the JVM may bypass the heap entirely:
  * **Stack Allocation:** Allocates the object directly on the stack frame so it is destroyed instantly on method return without GC overhead.
  * **Scalar Replacement:** Disassembles the object into individual primitive registers/variables.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how memory lifecycle and deallocation behave across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
public class MemoryDemo {
    public static void main(String[] args) {
        // 'dog' is on the Stack; new Dog() is in the Heap (Eden Space)
        Dog dog = new Dog("Buddy");

        // Severing the GC Root reference:
        // The Dog object is now unreachable and eligible for Minor GC
        dog = null; 
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <memory>

class Dog {
public:
    Dog() { std::cout << "Allocated\n"; }
    ~Dog() { std::cout << "Destroyed deterministically via RAII\n"; }
};

int main() {
    // In C++, RAII (Resource Acquisition Is Initialization) deallocates instantly:
    {
        std::unique_ptr<Dog> dog = std::make_unique<Dog>();
    } // Out of scope: Dog is destroyed immediately here without any GC pause!
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import sys

class Dog:
    pass

# Python uses Reference Counting combined with a Generational Cyclic Collector
d1 = Dog()
print(sys.getrefcount(d1)) # 2 (d1 and getrefcount parameter)

d2 = d1 # Reference count increments
del d1  # Reference count decrements
del d2  # Reference count hits 0: memory freed immediately!
```

</TabItem>
</Tabs>
