---
id: 10-composition-vs-inheritance
title: "Composition vs. Inheritance"
description: "Discover why composition is often favored over inheritance to build flexible, loosely-coupled systems."

sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the fundamental difference between composition and inheritance? Why is the industry consensus to 'favor composition over inheritance', and how do Association, Aggregation, and Composition differ?"

### The Quick Answer

"**Inheritance** establishes an **IS-A** relationship where a subclass acquires the fields and behaviors of a parent class at compile-time. **Composition** establishes a **HAS-A** relationship where a class is assembled from independent component objects at runtime. Modern architecture favors composition because it promotes loose coupling, enables runtime behavior changes (Dependency Injection), and avoids the fragile base class problem."

---

### Core Comparison

| Dimension | Inheritance (IS-A) | Composition (HAS-A) |
|---|---|---|
| **Relationship** | `SavingsAccount` is a `BankAccount`. | `Car` has an `Engine`. |
| **Coupling Level** | **Tight Coupling:** Subclass depends directly on superclass implementation details. | **Loose Coupling:** Interacts strictly through public interface contracts. |
| **Binding Time** | **Static (Compile-Time):** Hierarchy cannot be modified at runtime. | **Dynamic (Run-Time):** Components can be swapped dynamically on the fly. |
| **Polymorphism** | Subtyping polymorphism via class hierarchy. | Interface implementation or parameter injection. |

---

### Why the Industry Favors Composition

1. **Testability & Dependency Injection:**
   With composition, a class receives its dependencies via constructor injection. In production, a `PaymentService` can be injected with a `StripeGateway`. During unit tests, it can be injected with a `MockGateway` without modifying a single line of production code.
2. **Eliminating the Fragile Base Class Problem:**
   In deep inheritance hierarchies, altering a seemingly innocent `protected` method in a base class can silently break invariants in leaf subclasses that relied on the original execution order. Composition avoids this by isolating state behind strict interface contracts.
3. **Escaping Single-Inheritance Constraints:**
   In single-inheritance languages like Java, subclassing consumes your single `extends` slot. Composition allows a class to hold references to as many independent components as needed (`has a Logger`, `has a DatabasePool`, `has a CacheClient`).

---

### The Interview Trap: Association vs. Aggregation vs. Composition

When discussing HAS-A relationships, interviewers will often test whether you understand the lifecycle differences between these three concepts:

```
[ Association (General "Uses-A") ]
               │
               ▼
   [ Aggregation (Weak HAS-A) ]  ───> Independent Lifecycles (Professor exists without Department)
               │
               ▼
   [ Composition (Strong HAS-A) ] ───> Dependent Lifecycles (Room cannot exist without House)
```

1. **Association ("Uses-A"):** A general relationship where two classes interact (e.g., a `Customer` places an `Order`). Neither owns the other.
2. **Aggregation (Weak HAS-A):** A whole-part relationship where the child component **can exist independently** of the parent. If a `Department` closes, its `Professor` objects still exist in memory.
3. **Composition (Strong HAS-A):** A strict ownership relationship where the child component's lifecycle is **permanently bound** to the container. If a `House` object is garbage-collected or destroyed, its internal `Room` objects cease to exist.

---

### When IS Inheritance the Right Choice?

Never say "inheritance is always bad." Use inheritance only when:
* The relationship models a genuine, immutable **IS-A** domain hierarchy.
* It fully satisfies the **Liskov Substitution Principle (LSP)**: any instance of the child class can seamlessly substitute for the parent class without breaking client expectations or violating preconditions.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how composition with dependency injection is implemented across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. Component Contract
interface Engine {
    void start();
}

class ElectricEngine implements Engine {
    @Override
    public void start() {
        System.out.println("Electric motor silently engaged.");
    }
}

// 2. Composition (HAS-A): Car HAS an Engine injected via constructor
class Car {
    private final Engine engine; // Composed dependency

    public Car(Engine engine) {
        this.engine = engine; // Loose coupling via constructor injection
    }

    public void drive() {
        engine.start();
        System.out.println("Car is moving forward.");
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <memory>

// 1. Component Interface
class Engine {
public:
    virtual ~Engine() = default;
    virtual void start() = 0;
};

class ElectricEngine : public Engine {
public:
    void start() override {
        std::cout << "Electric motor silently engaged." << std::endl;
    }
};

// 2. Composition: Car owns an Engine via unique_ptr or receives a shared reference
class Car {
private:
    std::shared_ptr<Engine> engine;

public:
    Car(std::shared_ptr<Engine> eng) : engine(eng) {}

    void drive() {
        engine->start();
        std::cout << "Car is moving forward." << std::endl;
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from abc import ABC, abstractmethod

# 1. Component Interface
class Engine(ABC):
    @abstractmethod
    def start(self) -> None:
        pass

class ElectricEngine(Engine):
    def start(self) -> None:
        print("Electric motor silently engaged.")

# 2. Composition: Car HAS an Engine passed at instantiation
class Car:
    def __init__(self, engine: Engine):
        self._engine = engine  # Injected dependency

    def drive(self) -> None:
        self._engine.start()
        print("Car is moving forward.")

# Usage:
car = Car(ElectricEngine())
car.drive()
```

</TabItem>
</Tabs>
