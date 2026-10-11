---
id: 10-composition-vs-inheritance
title: "Composition vs. Inheritance"
description: "Discover why composition is often favored over inheritance to build flexible, loosely-coupled systems."

sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import {
  InheritanceVsCompositionFigure,
  HasASpectrumFigure,
} from '@site/src/components/Figures/CompositionVsInheritance';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the fundamental difference between composition and inheritance? Why is the industry consensus to 'favor composition over inheritance', and how do Association, Aggregation, and Composition differ?"

There are two ways to build a class out of other things: say it **IS** that thing, or say it **HAS** that thing.

A `SavingsAccount` IS a `BankAccount` (inheritance). A `Car` HAS an `Engine` (composition). Both let you reuse code, but they reuse it very differently.

### The quick answer

Inheritance builds an **IS-A** relationship: a subclass picks up a parent class's fields and methods at compile time. Composition builds a **HAS-A** relationship: a class is assembled from other independent objects at runtime, usually handed to it rather than created by it. Most modern codebases lean toward composition, because it's easier to change later and harder to break by accident.

<InheritanceVsCompositionFigure />

### Core comparison

| | Inheritance (IS-A) | Composition (HAS-A) |
|---|---|---|
| **Relationship** | `SavingsAccount` is a `BankAccount` | `Car` has an `Engine` |
| **Coupling** | Tight: the subclass depends on the parent's internals | Loose: talks to the other object only through its public methods |
| **When it's fixed** | Compile-time; the hierarchy can't change while running | Runtime; you can swap one component for another on the fly |
| **How polymorphism shows up** | Through the class hierarchy (subtyping) | Through interfaces or injected parameters |

### Why composition usually wins

1. **It's easy to test.** If a class *has* a dependency instead of extending it, you can hand it a fake version in tests. A `PaymentService` that receives a `PaymentGateway` through its constructor can be given a real `StripeGateway` in production and a `MockGateway` in tests, with no production code changes.
2. **It avoids the fragile base class problem.** In a deep inheritance chain, a small, reasonable-looking change to a `protected` method in the base class can quietly break every subclass that depended on the old behavior. Composition keeps that risk contained, because each piece only talks to the others through a stable interface.
3. **It doesn't box you in.** Java and most OOP languages only let you `extend` one class. Composition has no such limit: a class can hold as many independent collaborators as it needs: a `Logger`, a `DatabasePool`, a `CacheClient`, all at once.

### Association, aggregation, composition: the three flavors of "HAS-A"

These three terms describe the same idea (one object holding a reference to another) but differ in how tightly their lifetimes are tied together.

<HasASpectrumFigure />

1. **Association ("uses-a"):** the loosest link. Two classes just interact: a `Customer` places an `Order`. Neither owns the other, and neither one's lifetime depends on the other.
2. **Aggregation (weak HAS-A):** a whole/part relationship where the part can live on its own. If a `Department` shuts down, its `Professor` objects don't vanish - they still exist in memory, just unattached.
3. **Composition (strong HAS-A):** real ownership. The part's lifetime is tied to the whole. If a `House` object is destroyed, its `Room` objects go with it.

### So is inheritance ever the right call?

Yes - just not as the default. Reach for inheritance when:
* The relationship is a genuine, stable IS-A fit in the real domain (not one you're forcing for convenience).
* It fully satisfies the **Liskov Substitution Principle**: any subclass instance can stand in for the parent anywhere the parent is expected, without surprising the caller or breaking its assumptions.

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
