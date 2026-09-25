---
id: 6-code-trace-unimplemented-abstract-method
title: "Code Trace: Unimplemented Abstract Method & Contracts"
description: "Master abstract contract enforcement, contrast NotImplementedError runtime crashes with abc.ABC instantiation guards, and explore metaclass internals in Python."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact output of this Python code? Explain what occurs on the third iteration and why. How does Python's modern `abc.ABC` module transform this runtime failure into an instantiation-time guard, and how does this compare to Java and C++ compile-time enforcement?"
>
> ```python
> class Shape:
>     def area(self):
>         raise NotImplementedError("Subclass must implement area()")
> 
> class Circle(Shape):
>     def __init__(self, radius):
>         self.radius = radius
>     def area(self):
>         return 3.14 * self.radius ** 2
> 
> class Square(Shape):
>     def __init__(self, side):
>         self.side = side
>     def area(self):
>         return self.side ** 2
> 
> class Triangle(Shape):
>     def __init__(self, base, height):
>         self.base = base
>         self.height = height
> 
> shapes = [Circle(5), Square(4), Triangle(3, 6)]
> for shape in shapes:
>     print(shape.area())
> ```

---

In technical interviews, this problem serves as a springboard for assessing a candidate's grasp of **software contract enforcement**, the **Fail-Fast architectural principle**, and how dynamic languages implement abstract types under the hood.

---

### 1. Exact Output

```text
78.5
16
Traceback (most recent call last):
  File "trace.py", line 22, in <module>
    print(shape.area())
  File "trace.py", line 3, in area
    raise NotImplementedError("Subclass must implement area()")
NotImplementedError: Subclass must implement area()
```

---

### 2. Step-by-Step Top-Down Execution Trace

1. **Iteration 1 (`Circle(5)`):**
   - The loop retrieves the `Circle` instance.
   - Python inspects `Circle.__dict__` for `area()`, finds the overridden method, calculates $3.14 \times 5^2$, and prints **`78.5`**.
2. **Iteration 2 (`Square(4)`):**
   - The loop retrieves the `Square` instance.
   - Python finds `Square.area()`, calculates $4^2$, and prints **`16`**.
3. **Iteration 3 (`Triangle(3, 6)` - The Crash):**
   - The loop retrieves `Triangle(3, 6)` and invokes `shape.area()`.
   - Python searches `Triangle.__dict__` for `area()`. It is **not found**.
   - Following the Method Resolution Order (MRO), Python checks the parent class `Shape` and finds `Shape.area()`.
   - The interpreter executes `Shape.area()`, which immediately raises `NotImplementedError("Subclass must implement area()")`.
   - Execution halts with an unhandled exception.

---

### 3. The Production Flaw: "The Ticking Time Bomb"

While raising `NotImplementedError` is a common idiom in older Python codebases, it violates the **Fail-Fast** engineering principle:

- The invalid `Triangle(3, 6)` object was **successfully instantiated** without any warnings or errors.
- In a production backend, this malformed object could pass validation, sit inside a Redis task queue or database for hours, and only crash when a consumer worker thread processes it days later.
- If a method is rarely called (e.g., an error-handling cleanup hook), the missing implementation can lurk undetected in production for months.

---

### 4. The Modern Solution: `abc.ABC` & Instantiation Guards

To eliminate runtime ticking time bombs, modern Python provides the `abc` (Abstract Base Classes) module:

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

class Triangle(Shape):
    def __init__(self, base, height):
        self.base = base
        self.height = height
```

#### What happens now when running `t = Triangle(3, 6)`?
The failure occurs **immediately at the point of instantiation**:

```text
TypeError: Can't instantiate abstract class Triangle without an implementation for abstract method 'area'
```

The invalid object is rejected before it can ever enter application memory, eliminating downstream runtime crashes.

---

### 5. Metaclass Internals: How `abc.ABC` Enforces the Contract

How does Python prevent object instantiation when an `@abstractmethod` is missing?

1. **Class Creation Time:** When a class inheriting from `ABC` is defined, its metaclass (`ABCMeta.__new__`) scans the class and its parents for functions marked with `__isabstractmethod__ = True`.
2. **Frozenset Registration:** All unimplemented abstract method names are collected into a hidden attribute on the class called `cls.__abstractmethods__` (a `frozenset`).
3. **Instantiation Time (`__call__`):** When you execute `Triangle(3, 6)`, the metaclass's `__call__` method intercepts the call:
   ```python
   # Conceptual implementation inside ABCMeta.__call__
   def __call__(cls, *args, **kwargs):
       if cls.__abstractmethods__:
           raise TypeError(
               f"Can't instantiate abstract class {cls.__name__} "
               f"without an implementation for abstract method {set(cls.__abstractmethods__)}"
           )
       return super().__call__(*args, **kwargs)
   ```
4. Only when a subclass provides concrete implementations for **every single** abstract method does `__abstractmethods__` become empty, allowing instantiation.

---

### 6. Contract Enforcement Across Languages

| Language | Enforcement Mechanism | Failure Detection Point | Architectural Behavior |
| :--- | :--- | :--- | :--- |
| **Python (Legacy)** | `raise NotImplementedError` | Method Call Time (Runtime) | Ticking time bomb; malformed object is instantiated |
| **Python (Modern)** | `abc.ABC` + `@abstractmethod` | Instantiation Time (Runtime) | Fails immediately when `Class()` is evaluated |
| **Java** | `abstract class` or `interface` | Compilation Time (`javac`) | Program fails to compile; zero runtime cost |
| **C++** | Pure Virtual Function (`= 0`) | Compilation Time (`clang`/`gcc`) | Compiler rejects instantiation of abstract class |
| **TypeScript** | `abstract class` or `interface` | Transpilation Time (`tsc`) | Type-checker fails before JavaScript emission |

---

### 7. Combining Decorators: `@property` with `@abstractmethod`

In enterprise Python architectures, abstract contracts frequently mandate properties rather than methods. The decorators must be stacked in the correct order:

```python
from abc import ABC, abstractmethod

class DatabaseConnector(ABC):
    @property
    @abstractmethod
    def connection_string(self) -> str:
        """Subclasses must expose a connection_string property."""
        pass

class PostgresConnector(DatabaseConnector):
    def __init__(self, host: str):
        self._host = host

    @property
    def connection_string(self) -> str:
        return f"postgresql://{self._host}:5432/main"
```

*(Note: Always place `@property` as the outermost decorator and `@abstractmethod` as the innermost).*

---

### 8. Runnable Python Verification Code

```python
"""
Standalone Python verification for Abstract Contracts and ABCMeta.
Run with: python abstract_method_trace.py
"""
from abc import ABC, abstractmethod


# 1. Legacy Approach (Runtime Failure)
class LegacyShape:
    def area(self):
        raise NotImplementedError("Subclass must implement area()")


class LegacyTriangle(LegacyShape):
    def __init__(self, base, height):
        self.base = base
        self.height = height


# 2. Modern Approach (Instantiation Guard)
class ModernShape(ABC):
    @abstractmethod
    def area(self):
        pass


class ModernTriangle(ModernShape):
    def __init__(self, base, height):
        self.base = base
        self.height = height


if __name__ == "__main__":
    # Test 1: Legacy allows instantiation, crashes on method call
    t_legacy = LegacyTriangle(3, 6)
    print("LegacyTriangle instantiated successfully:", t_legacy)
    try:
        t_legacy.area()
    except NotImplementedError as e:
        print("Legacy area() raised as expected:", e)

    # Test 2: Inspect ModernTriangle.__abstractmethods__
    print("\nModernTriangle abstract methods:", ModernTriangle.__abstractmethods__)
    assert "area" in ModernTriangle.__abstractmethods__

    # Test 3: Modern blocks instantiation
    try:
        t_modern = ModernTriangle(3, 6)
    except TypeError as e:
        print("ModernTriangle instantiation blocked as expected:")
        print(" ", e)
    print("\nVerification passed successfully.")
```

---

### 9. Concise Staff-Level Interview Answer

> "The first two iterations print `78.5` and `16`. On the third iteration, `Triangle` does not override `area()`, so Python follows the MRO up to `Shape.area()`, which raises `NotImplementedError` and crashes the program.
>
> While `raise NotImplementedError` is a common legacy pattern to simulate abstract methods, it is an architectural anti-pattern because it violates the Fail-Fast principle: the invalid `Triangle` object is instantiated cleanly, creating a runtime defect that only triggers when the method is eventually called.
>
> In production Python, contracts should be enforced using `from abc import ABC, abstractmethod`. Under the hood, `ABCMeta` registers all abstract methods into a `frozenset` called `__abstractmethods__`. If this set is non-empty when `Triangle()` is called, `ABCMeta.__call__` immediately raises a `TypeError`, preventing the invalid object from ever entering application memory."
