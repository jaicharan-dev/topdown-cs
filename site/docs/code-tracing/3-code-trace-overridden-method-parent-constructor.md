---
id: 3-code-trace-overridden-method-parent-constructor
title: "Code Trace: Overridden Method Called from a Parent Constructor"
description: "Master polymorphic method dispatch during object construction across Python, Java, and C++, and analyze the uninitialized field anti-pattern."
sidebar_position: 3
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the exact output of this Python code? Explain why `sound()` prints what it does. What happens if this exact pattern is written in Java or C++, and why is calling overridable methods from constructors considered a dangerous anti-pattern?"
>
> ```python
> class Animal:
>     def __init__(self):
>         print("1. Animal constructor")
>         self.sound()
> 
>     def sound(self):
>         print("2. Generic animal sound")
> 
> class Dog(Animal):
>     def __init__(self):
>         super().__init__()
>         print("3. Dog constructor")
> 
>     def sound(self):
>         print("4. Woof")
> 
> d = Dog()
> ```

---

The code inside `Animal.__init__` calls `self.sound()`. The question is: which `sound()` runs — the one written right there in `Animal`, or `Dog`'s override? Python and Java answer this the same way, and C++ answers it completely differently — and getting that wrong in production code causes real crashes.

---

### Exact Output

```text
1. Animal constructor
4. Woof
3. Dog constructor
```

---

### Step-by-Step

1. `d = Dog()` allocates a `Dog` instance on the heap, and enters `Dog.__init__`.
2. `super().__init__()` hands that same `self` — already a `Dog`, fully — up to `Animal.__init__`.
3. Inside `Animal.__init__`: prints `"1. Animal constructor"`, then calls `self.sound()`.
4. Control returns to `Dog.__init__`, which prints `"3. Dog constructor"`. Done.

The part everyone gets wrong is step 3-to-4:

<Diagram>
<Row>
<Box title="self.sound() — called from inside Animal's code" accent="#60a5fa"><Field icon="❓" code="which sound() runs?" variant="neutral" /></Box>
<Arrow label="self is a Dog, at runtime" />
<Box title="Dog.sound() runs" accent="#fb7185"><Field icon="🐕" code={'prints "4. Woof"'} hint="not Animal.sound(), even though we're inside Animal's code" variant="neutral" /></Box>
</Row>
</Diagram>

The natural assumption is "we're inside `Animal`'s code, so it must call `Animal.sound()`." Wrong — Python (and Java) dispatch on the **runtime type of the object**, not on which class's code happens to be executing. The object is a `Dog`, full stop, so `self.sound()` always lands on `Dog.sound()`.

---

### What Breaks in Java: the Uninitialized Field Trap

If an interviewer asks: *"What goes wrong if you write this exact pattern in Java?"*, you can demonstrate the fatal flaw: **calling methods on partially initialized objects**.

Consider this Java implementation:

```java
class Animal {
    Animal() {
        System.out.println("Animal constructor");
        sound(); // Calling overridable method from constructor!
    }
    void sound() {
        System.out.println("Generic animal sound");
    }
}

class Dog extends Animal {
    // Subclass field initialization
    private String breed = "Golden Retriever";

    Dog() {
        super();
        System.out.println("Dog constructor");
    }

    @Override
    void sound() {
        // FATAL TRAP: 'breed' is still null here!
        System.out.println("Woof! Breed is: " + breed.toUpperCase());
    }
}
```

#### What happens at runtime?
1. `new Dog()` allocates heap memory and zero-initializes fields (`breed = null`).
2. `Dog` constructor immediately invokes `super()`.
3. Inside `Animal()`, `sound()` is called.
4. Java uses virtual method dispatch: it invokes `Dog.sound()`.
5. Inside `Dog.sound()`, it attempts to evaluate `breed.toUpperCase()`.
6. **CRASH:** Because `Dog`'s constructor and field initializers have **not executed yet**, `breed` is still `null`!
7. The JVM throws a **`NullPointerException`** during object creation.

This is why both the Java Language Specification and Effective Java (Item 19) state: **"Constructors must not invoke overridable methods."**

---

### The C++ Contrast: Virtual Dispatch Is Disabled in Constructors

This is the ultimate staff-level differentiator. In C++, the exact same code behaves in the **complete opposite manner**:

```cpp
#include <iostream>

class Animal {
public:
    Animal() {
        std::cout << "Animal constructor\n";
        sound(); // In C++, this calls Animal::sound()!
    }
    virtual void sound() {
        std::cout << "Generic animal sound\n";
    }
};

class Dog : public Animal {
public:
    Dog() : Animal() {
        std::cout << "Dog constructor\n";
    }
    void sound() override {
        std::cout << "Woof\n";
    }
};

int main() {
    Dog d; // What prints?
}
```

#### C++ Output:
```text
Animal constructor
Generic animal sound
Dog constructor
```

#### Why does C++ behave differently from Python and Java?
In C++, **virtual dispatch is explicitly disabled during constructor execution**:
- When `Animal`'s constructor executes, the object's virtual table pointer (`vptr`) points to `Animal`'s `vtable`.
- C++ treats the object as having type `Animal`, not `Dog`, until `Dog`'s constructor begins.
- Bjarne Stroustrup designed C++ this way specifically to prevent the Java bug: derived class members are not constructed yet, so calling derived methods would access uninitialized raw memory.

---

### Comparing Across Languages

| Language | Virtual Dispatch in Constructor? | Target Method Executed | Safety Risk |
| :--- | :--- | :--- | :--- |
| **Python** | Yes (Dynamic dispatch via `self`) | Subclass method (`Dog.sound`) | Accesses attributes before subclass `__init__` defines them |
| **Java** | Yes (Polymorphic virtual call) | Subclass method (`Dog.sound`) | `NullPointerException` on uninitialized subclass fields |
| **C#** | Yes (Virtual call) | Subclass method (`Dog.sound`) | Uninitialized subclass fields |
| **C++** | **No** (Directly bound to current class) | Base class method (`Animal::sound`) | Safe from uninitialized derived state; surprise for Java devs |

---

### The Fix: Two-Phase Initialization

Don't call overridable methods from a constructor at all. Finish building the object first, *then* call the method that might get overridden — a small static factory method enforces this order:

```python
class Animal:
    def __init__(self):
        print("1. Animal constructor")

    def initialize(self):
        """Phase 2: Called only after the complete object is fully constructed."""
        self.sound()

    def sound(self):
        print("2. Generic animal sound")

class Dog(Animal):
    def __init__(self):
        super().__init__()
        self.breed = "Golden Retriever" # Safely initialized!
        print("3. Dog constructor")

    def sound(self):
        print(f"4. Woof! Breed: {self.breed}")

    @classmethod
    def create(cls):
        """Factory method ensuring safe construction before dynamic dispatch."""
        instance = cls()
        instance.initialize()
        return instance

# Safe client usage:
d = Dog.create()
```

---

### Python: Runnable Verification

```python
"""
Verification of polymorphic dispatch during constructor execution.
Run with: python overridden_constructor_trace.py
"""


class Animal:
    def __init__(self):
        print("1. Animal constructor")
        # Polymorphic call: binds to runtime type of self
        self.sound()

    def sound(self):
        print("2. Generic animal sound")


class Dog(Animal):
    def __init__(self):
        super().__init__()
        print("3. Dog constructor")

    def sound(self):
        print("4. Woof")


if __name__ == "__main__":
    print("--- Instantiating Dog ---")
    d = Dog()
    print("--- Instantiation Complete ---")
```

---

### Say this in the interview

*"Python and Java dispatch on the object's actual runtime type, not on which class's code happens to be executing — so `self.sound()` called from `Animal.__init__` still lands on `Dog.sound()`, even mid-construction. That's dangerous in Java specifically, because the subclass's own fields haven't been initialized yet — accessing them from the overridden method throws a NullPointerException. C++ avoids this entirely: virtual dispatch is disabled during construction, so the base class's own method runs instead. The safe fix in any language is to never call overridable methods from a constructor — finish building the object first, with a factory method if needed."*
