---
id: 18-garbage-collection-stack-heap
title: "Garbage Collection: Stack vs. Heap Memory"
description: "Differentiate between Stack memory and Heap memory, and understand how the Garbage Collector reclaims space using the Generational Hypothesis."

sidebar_position: 18
sidebar_class_name: sidebar-hard
---

import { GenerationalHeapFigure } from '@site/src/components/Figures/GarbageCollection';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Walk me through how Garbage Collection works in Java. What are GC Roots, how does the Generational Hypothesis divide heap memory, and how do Stack and Heap differ?"

Every thread gets its own **stack**: a small, private workspace for whatever method it's currently running: local variables, method parameters, and pointers to objects. When a method returns, its slice of the stack just pops off. No cleanup needed, no garbage collector involved: it's automatic and instant.

The **heap** is different: one shared space, used by every thread, holding every object you create with `new`. Nothing on the heap cleans itself up automatically, so Java runs a background process, the **Garbage Collector (GC)**, that figures out which objects are still in use and frees the rest.

### Stack vs. Heap

| Feature | The Stack | The Heap |
|---|---|---|
| **What It Stores** | Primitives, method call frames, pointers to objects. | The actual objects (anything made with `new`). |
| **Scope & Concurrency** | Private to each thread. | Shared by every thread. |
| **Memory Reclamation** | Automatic, instant: pops when the frame pops. | Non-deterministic: reclaimed later by the GC. |
| **Failure Mode** | `StackOverflowError` (recursion too deep). | `OutOfMemoryError` (heap full). |

### How the GC decides what's garbage: GC Roots

Java doesn't just count references (that approach breaks the moment two objects point at each other in a cycle). Instead it asks: **can this object still be reached from somewhere that's definitely alive?**

Those "definitely alive" starting points are called **GC Roots**: things like local variables on a running thread's stack, active threads themselves, static fields, and a few native-code pointers. The GC walks outward from every root, following references. Anything it never reaches is garbage: nobody can get to it anymore, so it's safe to free.

### Why the heap is split into generations

Most objects die young: a loop variable, a temporary string, a short-lived request object. Production garbage collectors (G1, ZGC, Parallel) lean into this pattern, called the **Weak Generational Hypothesis**, by splitting the heap into generations instead of scanning the entire thing every time:

<GenerationalHeapFigure />

- **Young Generation:** New objects land in **Eden**. When Eden fills up, a quick **Minor GC** runs. Whatever survives moves into one of the two **Survivor spaces** (S0 and S1, alternating each cycle), and each survivor gets an age counter bumped up.
- **Old Generation:** Once an object survives enough Minor GC cycles (15, by default in HotSpot), it gets promoted here - it's clearly a long-lived object, not worth re-checking every cycle. Cleaning the Old Generation is a **Major GC**, and it's slower: it often needs a **Stop-The-World pause**, where every application thread briefly freezes.

This split matters because Minor GCs - the common case - only need to scan the small Young Generation, not the whole heap. That keeps garbage collection cheap most of the time.

### Does everything really go on the heap?

Not always. The JIT compiler can perform **Escape Analysis**: if it can prove an object never leaves the method it was created in - never gets returned, stored somewhere external, or handed to another thread - it doesn't need heap allocation at all. It can:

- **Allocate it on the stack instead**, so it disappears the instant the method returns, with zero GC involvement.
- **Scalar-replace it** - break the object apart into its individual fields as plain local variables, skipping allocation entirely.

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
