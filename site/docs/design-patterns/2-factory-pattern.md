---
id: 2-factory-pattern
title: "Factory Pattern"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the Factory pattern, why would you use it, and show me a simple Python implementation  -  use a shape factory as your example.

The Factory pattern is a creational design pattern that delegates the instantiation of objects to a centralized 'factory' class or method. Instead of calling a class constructor directly in your business logic, you pass a parameter to the factory, and it determines which specific object to create and return. This decouples the client code from the specific classes it needs to instantiate.

### Why would you use it?

**The ELI5 Analogy:** Imagine you are at a restaurant. You don't walk into the kitchen, gather flour, tomatoes, and cheese, and bake a pizza yourself (calling the constructor directly). Instead, you simply tell the waiter, "I want a pizza" (passing a parameter to the factory). The kitchen handles the complex assembly and simply hands you the finished product.

**The Technical Reality:** If your application needs to create different types of notifications (Email, SMS, Push), hardcoding new `EmailNotification()` or new `SMSNotification()` all over your codebase creates tight coupling. If the initialization logic for an SMS ever changes, you have to hunt down every place you instantiated it. A Factory centralizes this. You just call `NotificationFactory.create("SMS")`, and if the logic changes, you only update it in one single place.

### Key Benefits (Tying it to SOLID):
* **Single Responsibility Principle:** Moves the object creation code out of your core business logic into one dedicated place.
* **Open/Closed Principle:** You can introduce new types of objects into the program without breaking existing client code.

### The Python Implementation (Shape Factory)

```python
from abc import ABC, abstractmethod

# 1. The Interface / Abstract Base Class
class Shape(ABC):
    @abstractmethod
    def draw(self):
        pass

# 2. Concrete Implementations
class Circle(Shape):
    def draw(self):
        return "Drawing a Circle 🔵"

class Square(Shape):
    def draw(self):
        return "Drawing a Square 🟦"

class Triangle(Shape):
    def draw(self):
        return "Drawing a Triangle 🔺"

# 3. The Factory Class
class ShapeFactory:
    @staticmethod
    def get_shape(shape_type: str) -> Shape:
        """
        The factory method that encapsulates the creation logic.
        """
        shape_type = shape_type.lower()
        
        if shape_type == "circle":
            return Circle()
        elif shape_type == "square":
            return Square()
        elif shape_type == "triangle":
            return Triangle()
        else:
            raise ValueError(f"Unknown shape type requested: {shape_type}")

# --- Execution Trace ---

factory = ShapeFactory()

shape1 = factory.get_shape("circle")
print(shape1.draw())  # Output: Drawing a Circle 🔵

shape2 = factory.get_shape("square")
print(shape2.draw())  # Output: Drawing a Square 🟦
```

## Follow-up: The Dynamic Registry vs. Abstract Factory

> **Question:** In complex environments, how do we eliminate hardcoded `if` statements using a Dynamic Registry or Abstract Factory?

The standard `if-elif-else` Factory pattern has a major flaw: it violates the Open/Closed Principle. Every time you invent a new shape, you have to open the `ShapeFactory` class and physically write a new `elif` statement. There are two ways to fix this:

### 1. The Dynamic Registry (The "Pythonic" Way)

Instead of using `if` statements, we use a dictionary as a "phonebook" (a registry). The keys are the string names (`"circle"`), and the values are the actual class blueprints (`Circle`).

```python
from typing import Callable, Dict, Type

_shape_registry: Dict[str, Type] = {}

def register_shape(name: str) -> Callable:
    def inner_wrapper(wrapped_class: Type) -> Type:
        _shape_registry[name] = wrapped_class
        return wrapped_class
    return inner_wrapper

# --- Defining and Registering Shapes ---

@register_shape("circle")
class Circle:
    def draw(self):
        return "Drawing a Circle 🔵"

@register_shape("square")
class Square:
    def draw(self):
        return "Drawing a Square 🟦"

# --- The New Factory ---

class ShapeFactory:
    @staticmethod
    def get_shape(shape_type: str):
        shape_class = _shape_registry.get(shape_type.lower())
        
        if not shape_class:
            raise ValueError(f"Unknown shape type: {shape_type}")
            
        return shape_class() # Instantiate and return

# --- Execution ---
factory = ShapeFactory()
print(factory.get_shape("circle").draw())
```

If a developer wants to add a `Hexagon`, they write their class in a completely separate file and slap `@register_shape("hexagon")` on top of it. The factory automatically knows how to build it without anyone touching the factory's code. Adding a new shape is just registering it in the dictionary  -  zero modification to factory logic. The client depends on the abstraction, not concrete classes, successfully mapping abstract theory to concrete code.

### 2. The Abstract Factory (The "Enterprise" Way)

The Abstract Factory pattern goes a level deeper. It is defined as a "Factory of Factories." You use this when you need to create families of related objects, and you want to ensure the system doesn't accidentally mix and match incompatible parts.

**The ELI5 Analogy:** Imagine you are writing software for a furniture store. You have two styles: Modern and Victorian. If a customer orders a Modern Chair, you must ensure they also get a Modern Sofa. If your factory accidentally spits out a Victorian Sofa, the living room is ruined. An Abstract Factory solves this by giving you a specialized factory for each family.

```python
from abc import ABC, abstractmethod

# 1. Abstract Products
class Chair(ABC): pass
class Sofa(ABC): pass

# 2. Concrete Products (The Families)
class ModernChair(Chair): pass
class ModernSofa(Sofa): pass

class VictorianChair(Chair): pass
class VictorianSofa(Sofa): pass

# 3. The ABSTRACT Factory Interface
class FurnitureFactory(ABC):
    @abstractmethod
    def create_chair(self) -> Chair: pass
    
    @abstractmethod
    def create_sofa(self) -> Sofa: pass

# 4. The CONCRETE Factories
class ModernFurnitureFactory(FurnitureFactory):
    def create_chair(self) -> Chair:
        return ModernChair()
    def create_sofa(self) -> Sofa:
        return ModernSofa()

class VictorianFurnitureFactory(FurnitureFactory):
    def create_chair(self) -> Chair:
        return VictorianChair()
    def create_sofa(self) -> Sofa:
        return VictorianSofa()
```

When your application starts, it reads a configuration file. If the config says "Theme = Modern", the application instantiates the `ModernFurnitureFactory` and passes it to the core business logic. From that point on, the business logic just calls `factory.create_chair()`. It doesn't need an `if` statement to check what style to build, because the factory it was handed only knows how to build Modern furniture.

### Summary for Interviews:
"I use a Dynamic Registry in Python to avoid hardcoded `if` statements when I want to easily add new, standalone classes to a factory without violating the Open/Closed principle. I step up to the Abstract Factory pattern when my system is dealing with strict families of related objects, and I need to enforce that incompatible objects are never instantiated together."

---

### Crucial Nuance: The Hidden Dependency Trap

While the Factory pattern decouples client code from concrete implementations, the Factory itself often becomes heavily coupled to every single concrete class it instantiates. This centralizes the dependency burden into one "God Class." In massive systems, this can bloat the Factory's import list and initialization time. This is why modern enterprise applications often abandon manual Factories altogether, relying instead on Dependency Injection (DI) containers to handle dynamic instantiation entirely at runtime.

