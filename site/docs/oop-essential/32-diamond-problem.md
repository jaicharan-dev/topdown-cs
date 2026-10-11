---
id: 32-diamond-problem
title: "The Diamond Problem: Multiple Inheritance in Java"
description: "Learn how Java avoids the multiple inheritance diamond problem through its class and interface design, and compare with C++ and Python."

sidebar_position: 20
sidebar_class_name: sidebar-hard
---

import { DiamondProblemFigure } from '@site/src/components/Figures/DiamondProblem';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Why does Java strictly forbid multiple inheritance for classes while permitting it for interfaces? Walk me through the Diamond Problem of state vs behavior, and explain how C++ and Python resolve it."

Imagine a `Device` class with a `turnOn()` method and a `serialNumber` field. Both `Camera` and `Phone` extend it and override `turnOn()` with their own version. Now `SmartPhone` tries to extend *both* `Camera` and `Phone`. Draw that out and the shape literally looks like a diamond: one class at the top, two in the middle, one at the bottom pulling from both.

<DiamondProblemFigure />

`SmartPhone` would extend both `Camera` and `Phone`, and that's where it breaks, two different ways:

1. **Which `turnOn()` runs?** `Camera` and `Phone` each have their own implementation. When `SmartPhone` calls `turnOn()`, there's no obvious answer for which one should win.
2. **How many `serialNumber`s exist?** If `Device` holds that field, does `SmartPhone` end up with one copy of it, or two (one inherited through `Camera`, one through `Phone`)? In a language that copies fields down the inheritance chain, you'd genuinely get two separate copies in memory, and `this.serialNumber` becomes ambiguous.

### How Java sidesteps it

- **Classes:** Java simply doesn't allow `class SmartPhone extends Camera, Phone`. No multiple class inheritance, no diamond, no ambiguity - problem avoided by not allowing the shape at all.
- **Interfaces, before Java 8:** Multiple interfaces were always fine (`implements Camera, Phone`) because interfaces held no state and no method bodies - just signatures. The child class had to write the one real implementation itself, so there was never a question of "which one runs."
- **Interfaces with default methods, Java 8+:** Now interfaces *can* carry a method body. If `Camera` and `Phone` both supply a default `turnOn()`, the compiler refuses to guess - it's a compile error: `class inherits unrelated defaults for method() from types Camera and Phone`. You're forced to override it yourself and say explicitly which one you mean:

  ```java
  @Override
  public void turnOn() {
      Camera.super.turnOn(); // Explicit disambiguation
  }
  ```

- **One more rule:** if a parent *class* has a concrete method and an interface also offers a default with the same name, the class method always wins. A real implementation always beats a default.

### How other languages handle it

- **C++** allows multiple class inheritance and solves the state-duplication half of the problem with **virtual inheritance** (`class Camera : virtual public Device`). That tells the compiler: only keep one shared copy of `Device` in memory, no matter how many paths lead to it.
- **Python** allows multiple inheritance too, and resolves the behavior-ambiguity half with a deterministic ordering called **MRO (Method Resolution Order)**, computed by the **C3 Linearization** algorithm. You can see the exact order Python will search by checking `ClassName.__mro__`.

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
