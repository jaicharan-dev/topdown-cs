---
id: 14-pass-by-value-vs-reference
title: "Pass by Value vs. Pass by Reference: The Java Object Trap"
description: "Settle the debate: learn exactly why Java is strictly pass-by-value, even when handling object references."

sidebar_position: 14
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Explain the difference between pass-by-value and pass-by-reference. If passing an object into a Java method allows me to modify its fields, doesn't that mean Java is pass-by-reference? How does this differ from C++?"

### The Quick Answer

"Java is **strictly pass-by-value** at all times. There is no pass-by-reference in Java. When you pass a primitive, you pass a copy of the primitive's bit value. When you pass an object, you pass a **copy of the reference pointer** (memory address) by value. Because both pointers reference the same object on the heap, you can mutate the object's internal state, but you **cannot reassign the caller's variable** to point to a new object."

---

### The Stack vs. Heap Memory Breakdown

To prove this to an interviewer, walk them through the memory layout:

```
[ CALLER STACK FRAME ]                 [ HEAP ]
   myDog ───> [ 0x1A2B ] ─────────┐
                                  ▼
[ CALLEE STACK FRAME ]     ┌──────────────┐
   param ───> [ 0x1A2B ] ──>│ Dog: "Spot"  │
                           └──────────────┘
```

1. **Step 1:** In `main()`, `myDog` sits on the stack holding reference address `0x1A2B`, which points to a `Dog` on the heap.
2. **Step 2:** When calling `modify(myDog)`, Java pushes a new stack frame for `modify()` and **copies the address value** (`0x1A2B`) into `param`.
3. **Step 3 (Mutating Fields):** Calling `param.name = "Max"` follows the pointer `0x1A2B` to the heap and changes the name. Because both stack frames point to `0x1A2B`, the caller sees the change.
4. **Step 4 (Reassigning the Reference):** Calling `param = new Dog("Buster")` allocates a new object at `0x9999` and updates `param` on the callee stack. **The caller stack frame still holds `0x1A2B`**. When the method returns and its stack frame pops, `myDog` in `main()` still points to `0x1A2B` ("Max").

---

### Contrast with True Pass-by-Reference (C++)

Candidates often fail to grasp this because they haven't seen true pass-by-reference:
* **In Java (Pass-by-Value):** Reassigning `param = new Dog()` has zero effect on the caller's variable.
* **In C++ (True Pass-by-Reference):** Using `void modify(Dog& d)` creates an alias for the caller's variable. Executing `d = Dog("Buster")` **actually overwrites the caller's variable in the caller frame**.

---

### The Immutability Illusion (`String` & Wrappers)

Interviewers frequently ask: *"If objects pass copies of their references, why does passing a `String` or `Integer` into a method feel like passing a primitive?"*

```java
void modify(String s) { s = s + " World"; }
```
* **Why it doesn't change:** `String` and boxed wrappers (like `Integer`) are **immutable**. The `+` operator or reassignment does not mutate the existing string in the heap; it creates a brand new `String` object and updates the local copy of the reference pointer. The caller's reference remains pointed to the original string.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how argument passing evaluates across Java, C++, and Python:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
class Dog {
    String name;
    Dog(String name) { this.name = name; }
}

public class Main {
    public static void main(String[] args) {
        Dog myDog = new Dog("Spot");

        modifyDog(myDog);

        // myDog.name is "Max" (mutated via shared pointer)
        // myDog is NOT "Buster" (pointer reassignment did not affect caller)
        System.out.println("Final Name: " + myDog.name); // Prints "Max"
    }

    public static void modifyDog(Dog d) {
        d.name = "Max";       // 1. Mutates heap object state
        d = new Dog("Buster");// 2. Reassigns local pointer copy only!
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>

class Dog {
public:
    std::string name;
    Dog(std::string n) : name(n) {}
};

// True Pass-by-Reference via '&': 'd' is an alias for caller's variable
void modifyByReference(Dog& d) {
    d = Dog("Buster"); // Overwrites the caller's original object!
}

// Pass-by-Value: creates a copy
void modifyByValue(Dog d) {
    d.name = "Max"; // Only affects local copy
}

int main() {
    Dog myDog("Spot");
    modifyByReference(myDog);
    std::cout << "Name: " << myDog.name << std::endl; // Prints "Buster"!
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
class Dog:
    def __init__(self, name: str):
        self.name = name

def modify_dog(d: Dog) -> None:
    d.name = "Max"      # Mutates object state via shared reference
    d = Dog("Buster")   # Rebinds local variable name 'd' only

my_dog = Dog("Spot")
modify_dog(my_dog)
print(my_dog.name)      # Prints "Max" (Buster had no effect on caller)
```

</TabItem>
</Tabs>
