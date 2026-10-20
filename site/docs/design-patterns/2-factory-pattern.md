---
id: 2-factory-pattern
title: "Factory Patterns: Simple Factory, Factory Method & Abstract Factory"
description: "Understand the tripartite taxonomy of factory patterns: Simple Factory with dynamic registries, GoF Factory Method, and GoF Abstract Factory in Python."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between Simple Factory, Factory Method, and Abstract Factory? When would you use each, how do you eliminate hardcoded `if-elif` statements using a Dynamic Registry in Python, and what are the tradeoffs?"

"Factory pattern" actually means three different things, and interviewers notice when you conflate them. All three solve the same basic problem — code that needs an object, without hardcoding exactly which class to build — but at increasing levels of structure:

<Diagram>
<Row>
<Box title="Simple Factory" accent="#60a5fa"><Field icon="🔀" code="one method, a lookup table" hint="not a GoF pattern — just a useful habit" variant="neutral" /></Box>
<Box title="Factory Method" accent="#34d399"><Field icon="🧬" code="subclasses decide what to build" hint="GoF pattern — uses inheritance" variant="neutral" /></Box>
<Box title="Abstract Factory" accent="#f59e0b"><Field icon="👪" code="builds a whole matching family" hint="GoF pattern — one factory per family" variant="neutral" /></Box>
</Row>
</Diagram>

---

### Simple Factory & the Dynamic Registry

The simplest version isn't even an official GoF pattern — it's just: one method, hand it a string, get back the right object.

```python
class NaiveShapeFactory:
    @staticmethod
    def get_shape(shape_type: str):
        if shape_type == "circle":
            return Circle()
        elif shape_type == "square":
            return Square()
        # Every new shape means editing this method — fragile, and it
        # violates the Open/Closed Principle (open to extension, closed to modification).
```

The problem is obvious the moment someone adds a `Triangle`: now they have to go find and edit this exact function. The fix is a **registry** — a dictionary that maps names to classes, and lets new classes register *themselves*:

```python
from typing import Dict, Type, Callable
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def draw(self) -> str:
        pass

_SHAPE_REGISTRY: Dict[str, Type[Shape]] = {}

def register_shape(name: str) -> Callable[[Type[Shape]], Type[Shape]]:
    """Decorator to register new Shape subclasses without touching the factory."""
    def decorator(cls: Type[Shape]) -> Type[Shape]:
        _SHAPE_REGISTRY[name.lower()] = cls
        return cls
    return decorator

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

Now a teammate adding `Triangle` just tags it with `@register_shape("triangle")` in their own file. The factory supports it automatically — **zero changes to the factory itself.**

---

### Factory Method: Let Subclasses Decide

Factory Method flips the responsibility: instead of one central function deciding what to build, you define an abstract "build me a thing" method on a base class, and let each **subclass** decide what that thing actually is.

<Diagram>
<Tree root={
<Box title="Logistics (abstract)" accent="#818cf8">
<Field icon="📋" code="plan_delivery()" hint="calls self.create_transport() — doesn't know what that returns" variant="neutral" />
</Box>
}>
<Box title="RoadLogistics" accent="#34d399"><Field icon="↳" code="create_transport() → Truck" variant="neutral" /></Box>
<Box title="SeaLogistics" accent="#34d399"><Field icon="↳" code="create_transport() → Ship" variant="neutral" /></Box>
</Tree>
</Diagram>

```python
from abc import ABC, abstractmethod

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

class Logistics(ABC):
    @abstractmethod
    def create_transport(self) -> Transport:
        """The Factory Method — subclasses override this to pick the concrete transport."""
        pass

    def plan_delivery(self) -> str:
        # The shared workflow only talks to the abstraction, never the concrete class
        transport = self.create_transport()
        return f"Logistics Plan: {transport.deliver()}"

class RoadLogistics(Logistics):
    def create_transport(self) -> Transport:
        return Truck()

class SeaLogistics(Logistics):
    def create_transport(self) -> Transport:
        return Ship()
```

**Use this when** a framework provides a fixed workflow (`plan_delivery()`) but needs to let each caller swap out *what* gets built inside that workflow, without touching the framework's own code.

---

### Abstract Factory: Whole Matching Families

Abstract Factory goes one level further: instead of building one product, it builds a **set** of products that all have to match each other. The classic example — a cross-platform UI toolkit, where a Mac button next to a Windows checkbox would look broken:

<Diagram>
<Row>
<Box title="MacFactory" accent="#60a5fa">
<Field icon="🔘" code="MacButton" variant="neutral" />
<Field icon="☑️" code="MacCheckbox" variant="neutral" />
</Box>
<Box title="WindowsFactory" accent="#34d399">
<Field icon="🔘" code="WindowsButton" variant="neutral" />
<Field icon="☑️" code="WindowsCheckbox" variant="neutral" />
</Box>
</Row>
</Diagram>

```python
class Button(ABC):
    @abstractmethod
    def render(self) -> str: pass

class Checkbox(ABC):
    @abstractmethod
    def toggle(self) -> str: pass

class MacButton(Button):
    def render(self) -> str: return "[Mac Rounded Button]"

class MacCheckbox(Checkbox):
    def toggle(self) -> str: return "[Mac Checked Switch]"

class WindowsButton(Button):
    def render(self) -> str: return "[Windows Square Button]"

class WindowsCheckbox(Checkbox):
    def toggle(self) -> str: return "[Windows Checked Box]"

class GUIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: pass

    @abstractmethod
    def create_checkbox(self) -> Checkbox: pass

class MacFactory(GUIFactory):
    def create_button(self) -> Button: return MacButton()
    def create_checkbox(self) -> Checkbox: return MacCheckbox()

class WindowsFactory(GUIFactory):
    def create_button(self) -> Button: return WindowsButton()
    def create_checkbox(self) -> Checkbox: return WindowsCheckbox()

class Application:
    def __init__(self, factory: GUIFactory):
        self.button = factory.create_button()
        self.checkbox = factory.create_checkbox()

    def render_ui(self) -> str:
        return f"{self.button.render()} with {self.checkbox.toggle()}"
```

The guarantee: `Application(MacFactory())` can never end up holding a `WindowsCheckbox`. The factory interface only ever hands out matched sets — mixing families isn't just discouraged, it's not possible to write by accident.

---

### Comparing the Three

| Dimension | Simple Factory | Factory Method (GoF) | Abstract Factory (GoF) |
| :--- | :--- | :--- | :--- |
| **How it builds** | One function/method with a lookup | A subclass overrides a method | A factory object implementing an interface |
| **What it builds** | One product per call | One product per creator subclass | A whole family of related products |
| **To extend it** | Add an entry to the registry | Add a new Creator subclass | Add a new Concrete Factory |
| **Complexity** | Lowest | Moderate — parallel class hierarchies | Highest — interfaces for both factories and products |
| **Mainly buys you** | Single Responsibility | Open/Closed + polymorphism | Dependency Inversion |

---

### The Trap: the Factory Itself Gets Coupled to Everything

Factories decouple the *client* from concrete products — but the factory itself ends up tightly coupled to every single product it knows how to build:

<Diagram>
<Row>
<Box title="Client" accent="#60a5fa"><Field icon="📞" code="asks for a shape" variant="neutral" /></Box>
<Arrow label="depends on" />
<Box title="ShapeFactory" accent="#f59e0b"><Field icon="🏭" code="imports every shape class" hint="Circle, Square, Triangle, Hexagon, Octagon..." variant="neutral" /></Box>
</Row>
</Diagram>

In a large codebase, that one factory ends up importing dozens of modules just to exist — hurting startup time and memory footprint. This is exactly why modern frameworks (FastAPI, Spring, NestJS) often skip hand-written factories altogether and use a **Dependency Injection container** instead: it reads your type annotations and wires up the right object at runtime, without a central file that has to know about everything.

---

### Say this in the interview

*"Simple Factory is one method with a lookup — not a GoF pattern, just a habit, best done as a registry instead of an if-elif ladder. Factory Method uses inheritance: subclasses override one method to decide what gets built, while a shared base class workflow stays untouched. Abstract Factory builds whole families of matching objects — like Mac vs. Windows UI components — so you physically can't mix incompatible pieces."*

---

### Python: Verification Script

This script exercises all three patterns end to end:

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
