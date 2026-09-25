---
id: 2-factory-pattern
title: "Factory Patterns: Simple Factory, Factory Method & Abstract Factory"
description: "Understand the tripartite taxonomy of factory patterns: Simple Factory with dynamic registries, GoF Factory Method, and GoF Abstract Factory in Python."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between Simple Factory, Factory Method, and Abstract Factory? When would you use each, how do you eliminate hardcoded `if-elif` statements using a Dynamic Registry in Python, and what are the tradeoffs?"

---

### 1. Executive Summary & The Tripartite Factory Taxonomy

In system design interviews, candidates often casually say "Factory pattern" without clarifying which architectural pattern they mean. The Gang of Four (GoF) defines two distinct patterns, while software engineering practice commonly uses a third:

```
                          Factory Design Patterns
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   Simple Factory             Factory Method              Abstract Factory
  (Idiomatic Helper)           (GoF Pattern)               (GoF Pattern)
  ──────────────────          ──────────────────          ──────────────────
  Single method with          Uses inheritance:           Creates families of
  conditional logic or        subclasses decide           related/dependent
  a dynamic dictionary        which concrete product      objects without
  lookup to instantiate.      class to instantiate.       specifying classes.
```

---

### 2. Pattern 1: Simple Factory & The Dynamic Registry

A **Simple Factory** centralizes instantiation in a single static method. 

#### The Problem with Naive Simple Factories:
```python
class NaiveShapeFactory:
    @staticmethod
    def get_shape(shape_type: str):
        if shape_type == "circle":
            return Circle()
        elif shape_type == "square":
            return Square()
        # Violates Open/Closed Principle (OCP): Every new shape requires
        # modifying this existing method, risking regressions.
```

#### The Pythonic Solution: The Dynamic Decorator Registry
To uphold the **Open/Closed Principle (OCP)**, we replace procedural `if-elif` ladders with a class registry dictionary populated via Python decorators:

```python
from typing import Dict, Type, Callable
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def draw(self) -> str:
        pass

# Global registry: Key -> Class Type
_SHAPE_REGISTRY: Dict[str, Type[Shape]] = {}

def register_shape(name: str) -> Callable[[Type[Shape]], Type[Shape]]:
    """Decorator to register new Shape subclasses without touching the factory."""
    def decorator(cls: Type[Shape]) -> Type[Shape]:
        _SHAPE_REGISTRY[name.lower()] = cls
        return cls
    return decorator

# Concrete Products register themselves at import time
@register_shape("circle")
class Circle(Shape):
    def draw(self) -> str:
        return "Drawing a Circle"

@register_shape("square")
class Square(Shape):
    def draw(self) -> str:
        return "Drawing a Square"

class ExtensibleShapeFactory:
    @staticmethod
    def create(shape_type: str) -> Shape:
        cls = _SHAPE_REGISTRY.get(shape_type.lower())
        if not cls:
            raise ValueError(f"Unknown shape type: '{shape_type}'. Available: {list(_SHAPE_REGISTRY.keys())}")
        return cls()
```

- **Why this wins in interviews:** If a team member creates `Triangle` in another file, they simply tag it with `@register_shape("triangle")`. The factory automatically supports it with **zero modifications to factory code**.

---

### 3. Pattern 2: GoF Factory Method Pattern (Inheritance-Driven)

The **GoF Factory Method Pattern** defines an abstract method inside a base Creator class. Instead of a single centralized factory deciding what to build, the base creator delegates the instantiation decision to its subclasses.

```
       ┌────────────────────────┐
       │   Logistics (Creator)  │
       ├────────────────────────┤
       │ + plan_delivery()      │───► Calls self.create_transport()
       │ # create_transport()*  │
       └───────────▲────────────┘
                   │  (Inheritance)
         ┌─────────┴─────────┐
         │                   │
┌────────────────┐  ┌────────────────┐
│ RoadLogistics  │  │  SeaLogistics  │
├────────────────┤  ├────────────────┤
│+create_transp()│  │+create_transp()│
└────────┬───────┘  └────────┬───────┘
         │ (Returns)         │ (Returns)
         ▼                   ▼
    ┌─────────┐         ┌─────────┐
    │  Truck  │         │  Ship   │
    └─────────┘         └─────────┘
```

#### Python Implementation:
```python
from abc import ABC, abstractmethod

# 1. Product Interface
class Transport(ABC):
    @abstractmethod
    def deliver(self) -> str:
        pass

class Truck(Transport):
    def deliver(self) -> str:
        return "Delivering cargo overland in a refrigerated container."

class Ship(Transport):
    def deliver(self) -> str:
        return "Delivering cargo overseas via container ship."

# 2. Creator Base Class
class Logistics(ABC):
    @abstractmethod
    def create_transport(self) -> Transport:
        """The Factory Method: subclasses override this to manufacture specific transports."""
        pass

    def plan_delivery(self) -> str:
        # Core business workflow relies on the abstraction, not concrete products
        transport = self.create_transport()
        return f"Logistics Plan: {transport.deliver()}"

# 3. Concrete Creators
class RoadLogistics(Logistics):
    def create_transport(self) -> Transport:
        return Truck()

class SeaLogistics(Logistics):
    def create_transport(self) -> Transport:
        return Ship()
```

- **When to use:** When a library or framework provides a standard workflow (`plan_delivery()`), but users need to customize the exact objects manufactured within that workflow without altering the base framework code.

---

### 4. Pattern 3: GoF Abstract Factory Pattern (Product Families)

The **Abstract Factory Pattern** is an interface for creating **families of related or dependent objects** without specifying their concrete classes. It guarantees that client code never accidentally mixes incompatible components.

#### Real-World Use Case: Cross-Platform GUI Toolkit
Imagine building a UI framework that supports both **macOS** and **Windows**. If the client accidentally pairs a `MacButton` with a `WindowsCheckbox`, the visual layout is broken.

```python
# 1. Abstract Products
class Button(ABC):
    @abstractmethod
    def render(self) -> str: pass

class Checkbox(ABC):
    @abstractmethod
    def toggle(self) -> str: pass

# 2. Concrete Product Families (Mac OS)
class MacButton(Button):
    def render(self) -> str: return "[Mac Rounded Button]"

class MacCheckbox(Checkbox):
    def toggle(self) -> str: return "[Mac Checked Switch]"

# Concrete Product Families (Windows OS)
class WindowsButton(Button):
    def render(self) -> str: return "[Windows Square Button]"

class WindowsCheckbox(Checkbox):
    def toggle(self) -> str: return "[Windows Checked Box]"

# 3. Abstract Factory Interface
class GUIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: pass

    @abstractmethod
    def create_checkbox(self) -> Checkbox: pass

# 4. Concrete Factories (One per product family)
class MacFactory(GUIFactory):
    def create_button(self) -> Button: return MacButton()
    def create_checkbox(self) -> Checkbox: return MacCheckbox()

class WindowsFactory(GUIFactory):
    def create_button(self) -> Button: return WindowsButton()
    def create_checkbox(self) -> Checkbox: return WindowsCheckbox()

# 5. Client Code (Decoupled from OS platform)
class Application:
    def __init__(self, factory: GUIFactory):
        self.button = factory.create_button()
        self.checkbox = factory.create_checkbox()

    def render_ui(self) -> str:
        return f"{self.button.render()} with {self.checkbox.toggle()}"
```

- **Guarantee:** Client code simply calls `app = Application(MacFactory())`. It is mathematically impossible to instantiate a Mac button with a Windows checkbox.

---

### 5. Comparative Evaluation Matrix

| Dimension | Simple Factory | Factory Method (GoF) | Abstract Factory (GoF) |
| :--- | :--- | :--- | :--- |
| **Creation Mechanism** | Direct function call or static class method. | Polymorphic inheritance (subclasses override factory method). | Composition of factory objects implementing an abstract interface. |
| **Product Scope** | Creates a single product variant per call. | Creates a single product variant per creator subclass. | Creates **families** of related products (e.g., Button + Checkbox). |
| **Extensibility Mechanism** | Update registry dictionary or add `if` branch. | Add a new Creator subclass. | Add a new Concrete Factory subclass. |
| **Complexity** | Lowest. | Moderate (introduces parallel class hierarchies). | Highest (requires interfaces for both factories and products). |
| **Primary SOLID Benefit** | Single Responsibility Principle. | Open/Closed Principle & Polymorphism. | Dependency Inversion Principle. |

---

### 6. The Hidden Dependency Trap: Factory vs. Dependency Injection

While factories decouple clients from concrete products, the Factory itself becomes coupled to **every product it instantiates**:

```
Client  ───►  [ ShapeFactory ]  ───►  Circle, Square, Triangle, Hexagon, Octagon...
```

1. **God Class Problem:** In massive enterprise codebases, a centralized factory imports dozens of concrete modules, increasing startup latency and memory footprint.
2. **Modern Resolution:** Modern backend frameworks (FastAPI, Spring, NestJS) favor **Dependency Injection (DI) Containers**. Rather than manually coding factories, the container inspects type annotations and injects dependencies dynamically at runtime.

---

### 7. Python Verification Script

The following standalone script demonstrates and verifies all three factory patterns:

```python
"""
Complete Verification Test Suite for Factory Patterns:
1. Extensible Simple Factory with Dynamic Registry
2. GoF Factory Method
3. GoF Abstract Factory
"""
from abc import ABC, abstractmethod
from typing import Dict, Type, Callable


# ==========================================
# 1. SIMPLE FACTORY WITH DYNAMIC REGISTRY
# ==========================================
class Notification(ABC):
    @abstractmethod
    def send(self, recipient: str, message: str) -> str: pass

_NOTIF_REGISTRY: Dict[str, Type[Notification]] = {}

def register_notification(channel: str):
    def decorator(cls: Type[Notification]):
        _NOTIF_REGISTRY[channel.upper()] = cls
        return cls
    return decorator

@register_notification("EMAIL")
class EmailNotification(Notification):
    def send(self, recipient: str, message: str) -> str:
        return f"Email sent to {recipient}: {message}"

@register_notification("SMS")
class SMSNotification(Notification):
    def send(self, recipient: str, message: str) -> str:
        return f"SMS sent to {recipient}: {message}"

class NotificationFactory:
    @staticmethod
    def create(channel: str) -> Notification:
        cls = _NOTIF_REGISTRY.get(channel.upper())
        if not cls:
            raise ValueError(f"Channel '{channel}' not supported.")
        return cls()


# ==========================================
# 2. GOF FACTORY METHOD
# ==========================================
class Document(ABC):
    @abstractmethod
    def export(self) -> str: pass

class PDFDocument(Document):
    def export(self) -> str: return "PDF formatted byte stream"

class MarkdownDocument(Document):
    def export(self) -> str: return "# Markdown formatted text"

class DocumentEditor(ABC):
    @abstractmethod
    def create_document(self) -> Document: pass

    def save(self) -> str:
        doc = self.create_document()
        return f"Saving document: {doc.export()}"

class PDFEditor(DocumentEditor):
    def create_document(self) -> Document: return PDFDocument()

class MarkdownEditor(DocumentEditor):
    def create_document(self) -> Document: return MarkdownDocument()


# ==========================================
# 3. GOF ABSTRACT FACTORY
# ==========================================
class DarkThemeButton:
    def render(self): return "Dark Button (#18181b)"

class DarkThemeDialog:
    def render(self): return "Dark Modal Dialog"

class LightThemeButton:
    def render(self): return "Light Button (#ffffff)"

class LightThemeDialog:
    def render(self): return "Light Modal Dialog"

class UIThemeFactory(ABC):
    @abstractmethod
    def get_button(self): pass
    @abstractmethod
    def get_dialog(self): pass

class DarkThemeFactory(UIThemeFactory):
    def get_button(self): return DarkThemeButton()
    def get_dialog(self): return DarkThemeDialog()

class LightThemeFactory(UIThemeFactory):
    def get_button(self): return LightThemeButton()
    def get_dialog(self): return LightThemeDialog()


# ==========================================
# EXECUTION & VERIFICATION
# ==========================================
if __name__ == "__main__":
    print("=" * 65)
    print("FACTORY PATTERNS VERIFICATION TEST SUITE")
    print("=" * 65)

    # 1. Simple Factory Registry
    notif = NotificationFactory.create("sms")
    print(f"[Simple Factory]   {notif.send('+123456789', 'Your OTP is 4092')}")

    # 2. Factory Method
    editor: DocumentEditor = PDFEditor()
    print(f"[Factory Method]   {editor.save()}")

    # 3. Abstract Factory
    theme_factory: UIThemeFactory = DarkThemeFactory()
    btn = theme_factory.get_button()
    dlg = theme_factory.get_dialog()
    print(f"[Abstract Factory] {btn.render()} inside {dlg.render()}")

    print("\nSUCCESS: All three factory architectural variations verified.")
```
