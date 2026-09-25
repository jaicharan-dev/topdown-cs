---
id: 3-code-trace-overridden-method-parent-constructor
title: "Code Trace: Overridden Method Called from a Parent Constructor"
description: "Master polymorphic method dispatch during object construction across Python, Java, and C++, and analyze the uninitialized field anti-pattern."
sidebar_position: 3
sidebar_class_name: sidebar-hard
---

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

This question is a favorite among senior interviewers because it exposes whether a candidate understands the subtle intersection of **polymorphic dynamic dispatch** and **object lifecycle state**. 

While Python and Java allow dynamic dispatch during construction, doing so exposes a catastrophic flaw: the subclass method executes while the subclass object is still partially unconstructed.

---

### 1. Exact Output

```text
1. Animal constructor
4. Woof
3. Dog constructor
```

---

### 2. Step-by-Step Execution Trace

```text
EXECUTION TIMELINE:

Step 1: d = Dog()
  -> Allocates memory for Dog instance in heap.
  -> Enters Dog.__init__(self)

Step 2: super().__init__()
  -> Passes the current 'self' reference (which is of type Dog) up to Animal.__init__(self)

Step 3: Inside Animal.__init__:
  -> Line 1: print("1. Animal constructor") -> PRINTS: "1. Animal constructor"
  -> Line 2: self.sound()

Step 4: The Dynamic Dispatch Trap:
  -> The runtime examines the object bound to 'self'.
  -> 'self' is a Dog instance in heap memory.
  -> Dynamic dispatch searches Dog's method resolution table and finds Dog.sound().
  -> Executes Dog.sound() -> PRINTS: "4. Woof"

Step 5: Control returns to Dog.__init__:
  -> Line 2: print("3. Dog constructor") -> PRINTS: "3. Dog constructor"
  -> Initialization completes.
```

#### The Trap vs. The Reality:
- **The Junior Developer Assumption:** "Since the code executing is inside `Animal`, calling `self.sound()` will invoke `Animal.sound()` and output `Generic animal sound`."
- **The Reality:** In Python (and Java), method dispatch depends on the **runtime type of the receiver object (`self`)**, not the lexical class where the invocation is written. Because the instantiated object is a `Dog`, dynamic dispatch routes the call directly to `Dog.sound()`.

---

### 3. The Java Catastrophe: Uninitialized Field Trap

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

### 4. The C++ Contrast: Virtual Dispatch Disabled in Constructors!

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

### 5. Architectural Comparison Across Languages

| Language | Virtual Dispatch in Constructor? | Target Method Executed | Safety Risk |
| :--- | :--- | :--- | :--- |
| **Python** | Yes (Dynamic dispatch via `self`) | Subclass method (`Dog.sound`) | Accesses attributes before subclass `__init__` defines them |
| **Java** | Yes (Polymorphic virtual call) | Subclass method (`Dog.sound`) | `NullPointerException` on uninitialized subclass fields |
| **C#** | Yes (Virtual call) | Subclass method (`Dog.sound`) | Uninitialized subclass fields |
| **C++** | **No** (Directly bound to current class) | Base class method (`Animal::sound`) | Safe from uninitialized derived state; surprise for Java devs |

---

### 6. The Production Solution: Two-Phase Initialization

To avoid the uninitialized object anti-pattern, production code uses **Two-Phase Initialization** or the **Static Factory Method** pattern:

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

### 7. Runnable Python Verification Code

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

### 8. Concise Staff-Level Interview Answer

> "The output is `Animal constructor`, followed by `Woof`, and finally `Dog constructor`.
>
> When `Dog()` is instantiated, `Dog.__init__` invokes `super().__init__()`, passing the `self` reference to the base class. In Python (and Java), method dispatch is dynamically resolved at runtime based on the actual object type in memory, which is `Dog`. Thus, `self.sound()` in `Animal` dispatches directly to `Dog.sound()`, printing `Woof` before `Dog`'s own constructor body executes.
>
> This pattern is considered a severe anti-pattern in object-oriented architecture. In languages with static field declarations like Java, if the subclass method relies on instance variables initialized in the subclass constructor, those fields are still `null` or `0` when the method is invoked, triggering runtime `NullPointerException`s.
>
> Interestingly, C++ prevents this problem entirely: in C++, virtual dispatch is disabled during construction, and the object's `vptr` points to the base class vtable until the base constructor finishes."
