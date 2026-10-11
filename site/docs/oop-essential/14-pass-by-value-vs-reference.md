---
id: 14-pass-by-value-vs-reference
title: "Pass by Value vs. Pass by Reference: The Java Object Trap"
description: "Settle the debate: learn exactly why Java is strictly pass-by-value, even when handling object references."

sidebar_position: 14
sidebar_class_name: sidebar-hard
---

import { PassByValueFigure } from '@site/src/components/Figures/PassByValue';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Explain the difference between pass-by-value and pass-by-reference. If passing an object into a Java method allows me to modify its fields, doesn't that mean Java is pass-by-reference? How does this differ from C++?"

Picture handing someone a sticky note with your house's address written on it. They can drive to your house and rearrange your furniture: that address really does lead to your real house. But if they scribble a *different* address on their own copy of the sticky note, your original note, still in your pocket, is untouched. You're still pointing at your house.

That's the whole trick behind Java's object passing.

### The quick answer

Java is **strictly pass-by-value**, always: there's no pass-by-reference anywhere in the language. Pass a primitive, and you pass a copy of its raw value. Pass an object, and you pass a copy of the *reference* (the address) by value. Since both copies point at the same object on the heap, you can change that object's fields through either copy. What you can't do is make the caller's variable point somewhere else: reassigning your local copy of the address never touches the original.

### Walking through memory

<PassByValueFigure />

1. In `main()`, `myDog` sits on the stack holding the address `0x1A2B`, which points to a `Dog` on the heap.
2. Calling `modify(myDog)` pushes a new stack frame, and Java copies the address value `0x1A2B` into `param`. Two separate variables now hold the same address.
3. **Mutating fields:** `param.name = "Max"` follows the address to the heap and changes the name there. Both `myDog` and `param` point at `0x1A2B`, so the caller sees the change too.
4. **Reassigning the reference:** `param = new Dog("Buster")` creates a brand-new object at a new address and points `param` at it. This only updates `param`'s own copy: `myDog` back in the caller's frame still holds `0x1A2B`, unaffected. When `modify()` returns, that new object is simply forgotten.

### Compare with real pass-by-reference (C++)

* **Java:** `param = new Dog()` inside the method has zero effect on the caller's variable.
* **C++ with `Dog&`:** the parameter becomes an *alias* for the caller's actual variable, not a copy of its address. `d = Dog("Buster")` inside the method overwrites the caller's variable directly.

### Why does passing a `String` feel like passing a primitive?

```java
void modify(String s) { s = s + " World"; }
```

This doesn't change the caller's string, and the reason is immutability, not some special passing rule. `String` (and boxed types like `Integer`) never change in place. `s + " World"` builds a brand-new `String` object and points the *local copy* of `s` at it - exactly like reassigning `param` to a new `Dog` above. The caller's original reference never moves.

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
