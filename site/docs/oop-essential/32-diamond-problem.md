---
id: 32-diamond-problem
title: "The Diamond Problem: Multiple Inheritance in Java"
description: "Learn how Java avoids the multiple inheritance diamond problem through its class and interface design, and compare with C++ and Python."

sidebar_position: 20
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Why does Java strictly forbid multiple inheritance for classes while permitting it for interfaces? Walk me through the Diamond Problem of state vs behavior, and explain how C++ and Python resolve it."

### The Quick Answer

"Java bans multiple class inheritance to prevent the **Diamond Problem**, which introduces two fatal ambiguities: **ambiguity of behavior** (which method implementation to call) and **duplication of state** (multiple copies of base class instance fields in memory). Interfaces traditionally avoided this because they possessed no state and no method bodies. In Java 8+, default method collisions are resolved by requiring explicit developer override."

---

### The Diamond Problem Explained

The name comes from the shape of the inheritance graph:

```
        ┌─────────────┐
        │   Device    │  (Grandparent: declares turnOn() and int serialNumber)
        └──────┬──────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│   Camera    │ │    Phone    │  (Parents: override turnOn() differently)
└──────┬──────┘ └──────┬──────┘
       │               │
       └───────┬───────┘
               ▼
        ┌─────────────┐
        │ SmartPhone  │  (Child: extends Camera, Phone)
        └─────────────┘
```

1. **Ambiguity of Behavior:** If `Camera` and `Phone` both provide conflicting implementations of `turnOn()`, which code does `new SmartPhone().turnOn()` execute?
2. **Duplication of State (The C++ Trap):** If `Device` has an instance variable `int serialNumber`, an instance of `SmartPhone` would physically inherit **two separate copies of `serialNumber`** in heap memory, creating ambiguity over which field `this.serialNumber` references.

---

### How Java Resolves the Diamond Problem

* **Classes:** Java forbids `class SmartPhone extends Camera, Phone`. Single inheritance eliminates both behavior ambiguity and duplicated state.
* **Interfaces (Pre-Java 8):** Multiple interfaces are allowed (`implements Camera, Phone`) because interfaces had zero instance state and only abstract method signatures; the child class provided the single definitive implementation.
* **Interfaces (Java 8+ Default Methods):** If two implemented interfaces provide identical default method signatures, the compiler triggers a compilation error:
  `class inherits unrelated defaults for method() from types Camera and Phone`
  The developer **must explicitly override** the method in the child class and specify which implementation to use:
  ```java
  @Override
  public void turnOn() {
      Camera.super.turnOn(); // Explicit disambiguation
  }
  ```
* **The "Class Always Wins" Rule:** If a superclass and an interface offer conflicting methods, the superclass concrete method **always takes precedence** over interface defaults.

---

### How Other Languages Solve the Diamond Problem

* **C++ (Virtual Inheritance):** C++ supports multiple class inheritance. It solves the diamond problem of state by using **virtual base classes** (`class Camera : virtual public Device`). This instructs the compiler to allocate only a single, shared instance of `Device` in memory.
* **Python (C3 Linearization / MRO):** Python supports multiple inheritance. It resolves method ambiguity deterministically using **Method Resolution Order (MRO)** via the **C3 Linearization Algorithm**. You can inspect the exact method resolution order by checking `ClassName.__mro__`.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how diamond ambiguity is handled across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
interface Camera {
    default void turnOn() {
        System.out.println("Camera sensor activated.");
    }
}

interface Phone {
    default void turnOn() {
        System.out.println("Cellular modem activated.");
    }
}

// Java resolves multiple interface collision via explicit delegation
class SmartPhone implements Camera, Phone {
    @Override
    public void turnOn() {
        // Disambiguate using InterfaceName.super
        Camera.super.turnOn(); 
        System.out.println("SmartPhone system ready.");
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>

class Device {
public:
    int id = 100;
};

// C++ uses VIRTUAL INHERITANCE to ensure only one shared 'Device' exists
class Camera : virtual public Device {};
class Phone : virtual public Device {};

class SmartPhone : public Camera, public Phone {
public:
    void printId() {
        // Unambiguous because of virtual inheritance
        std::cout << "Device ID: " << id << std::endl;
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
class Device:
    def turn_on(self):
        print("Device booting...")

class Camera(Device):
    def turn_on(self):
        print("Camera ready.")

class Phone(Device):
    def turn_on(self):
        print("Phone ready.")

# Python resolves multiple inheritance deterministically via MRO (Method Resolution Order):
class SmartPhone(Camera, Phone):
    pass

phone = SmartPhone()
phone.turn_on() # Calls Camera.turn_on() because Camera is listed first in MRO!
# print(SmartPhone.__mro__)
```

</TabItem>
</Tabs>
