---
id: 5-code-trace-class-vs-instance-attribute-shadowing
title: "Code Trace: Class Attribute vs Instance Attribute Shadowing"
description: "Master Python's attribute lookup protocol (__dict__), variable shadowing mechanics, the dangerous += mutation trap, and mutable class-level state in Python."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What does each print statement output, and why? Explain how Python resolves attribute lookups through `__dict__`, why assigning to `self` creates variable shadowing, and what happens when using the in-place `+=` operator on class attributes."
>
> ```python
> class Counter:
>     count = 0
> 
>     def __init__(self):
>         Counter.count += 1
> 
>     def reset(self):
>         self.count = 0
> 
> c1 = Counter()
> c2 = Counter()
> print(Counter.count)
> c1.reset()
> print(c1.count)
> print(Counter.count)
> print(c2.count)
> ```

---

This question is a favorite in Python system design and architecture interviews. While beginners assume variable resolution in Python works like C++ or Java static members, senior engineers understand that Python attribute access is governed by **runtime namespace dictionary searches** (`__dict__`).

---

### 1. Exact Output

```text
2
0
2
2
```

---

### 2. Step-by-Step Namespace Trace (`__dict__`)

To understand why this output occurs, inspect the underlying `__dict__` namespaces of the class and instances at each stage:

```text
+-----------------------------------------------------------------------------------+
| 1. AFTER INSTANTIATION: c1 = Counter(); c2 = Counter()                            |
|    Counter.__dict__ contains: {'count': 2, ...}                                   |
|    c1.__dict__ is: {} (EMPTY!)                                                    |
|    c2.__dict__ is: {} (EMPTY!)                                                    |
+-----------------------------------------------------------------------------------+
| 2. FIRST PRINT: print(Counter.count)                                              |
|    Direct lookup in Counter.__dict__['count'] -> PRINTS: 2                        |
+-----------------------------------------------------------------------------------+
| 3. INVOCATION: c1.reset()                                                         |
|    Executes: self.count = 0                                                       |
|    THE TRAP: Assignment targets c1's local namespace!                             |
|    c1.__dict__ becomes: {'count': 0}                                              |
|    Counter.__dict__ is UNTOUCHED: {'count': 2, ...}                               |
+-----------------------------------------------------------------------------------+
| 4. SECOND PRINT: print(c1.count)                                                  |
|    Lookup finds 'count' directly in c1.__dict__ -> PRINTS: 0 (Shadowed!)          |
+-----------------------------------------------------------------------------------+
| 5. THIRD PRINT: print(Counter.count)                                              |
|    Direct lookup in Counter.__dict__['count'] -> PRINTS: 2                        |
+-----------------------------------------------------------------------------------+
| 6. FOURTH PRINT: print(c2.count)                                                  |
|    c2.__dict__ is empty -> Falls back to Counter.__dict__ -> PRINTS: 2            |
+-----------------------------------------------------------------------------------+
```

---

### 3. Python's 5-Tier Attribute Lookup Protocol

When code evaluates an expression like `obj.attribute`, the Python interpreter searches through namespaces in a strict order:

1. **Data Descriptors:** Checked on the class of `obj` and its MRO (any class attribute defining both `__get__` and `__set__`, such as a `@property`).
2. **Instance Dictionary (`obj.__dict__`):** If the attribute is found in the instance's own dictionary, its value is immediately returned.
3. **Non-Data Descriptors & Class Attributes:** If not in `obj.__dict__`, Python checks `type(obj).__dict__` (methods, class attributes, `@classmethod`).
4. **Base Classes (MRO):** Traverses the superclasses in C3 Linearization order.
5. **Fallback (`__getattr__`):** If all lookups fail, Python calls `obj.__getattr__("attribute")` if defined, or raises an `AttributeError`.

#### The Asymmetry Between Reading and Writing:
- **Reading (`print(obj.count)`):** Searches `c1.__dict__` first; if missing, falls back to `Counter.__dict__`.
- **Writing (`self.count = 0`):** Always writes directly to `self.__dict__`. It **never** writes to `Counter.__dict__`. This creates a local instance attribute that permanently "shadows" (masks) the class attribute for that specific instance.

---

### 4. The Dangerous `+=` Shadowing Trap

A notorious bug in production Python services involves modifying class-level counters using `self`:

```python
class Worker:
    tasks_processed = 0

    def process(self):
        # SUBTLE TRAP: What does this do?
        self.tasks_processed += 1
```

#### What happens under the hood?
The in-place operator `self.tasks_processed += 1` expands to:
$$\text{self.tasks\_processed} = \text{self.tasks\_processed} + 1$$

1. **Right-Hand Side (`self.tasks_processed + 1`):** Python reads `self.tasks_processed`. Since `self.__dict__` is empty, it reads `Worker.tasks_processed` ($0$). $0 + 1 = 1$.
2. **Left-Hand Side (`self.tasks_processed = 1`):** Python executes an assignment to `self`!
3. **The Result:** It creates a brand-new instance attribute `tasks_processed = 1` inside `self.__dict__`.
4. `Worker.tasks_processed` remains stuck at `0` forever! Every worker object now maintains an isolated instance counter instead of updating the shared telemetry metric.

#### The Proper Fix:
To mutate a class attribute, either reference the class directly or use `type(self)`:
```python
Counter.count = 0        # Explicit class reference
type(self).count = 0     # Polymorphic class reference
self.__class__.count = 0 # Alternative
```

---

### 5. Mutable Class Attributes: The Silent In-Place Mutation Trap

While assigning an immutable integer (`self.count = 0`) creates a shadowing variable, modifying a **mutable object** (like a `list` or `dict`) exhibits the complete opposite behavior:

```python
class Service:
    shared_cache = []  # Mutable Class Attribute

    def add_data(self, item):
        # Does this shadow?
        self.shared_cache.append(item)
```

- When calling `self.shared_cache.append(item)`, there is **no assignment operator (`=`)**.
- Python reads `self.shared_cache`, finds the shared list in `Service.__dict__`, and mutates that exact memory buffer in place.
- `self.__dict__` remains completely empty.
- Every single instance of `Service` now sees the appended data! This is why mutable default values in classes and functions are considered a major anti-pattern.

---

### 6. Runnable Python Verification Code

```python
"""
Standalone Python verification for Class vs Instance Attribute Shadowing.
Run with: python attribute_shadowing_trace.py
"""


class Counter:
    count = 0

    def __init__(self):
        Counter.count += 1

    def reset(self):
        self.count = 0


if __name__ == "__main__":
    c1 = Counter()
    c2 = Counter()

    # Step 1: Initial state
    print("Initial Class Count:", Counter.count)
    print("c1.__dict__:", c1.__dict__)
    print("c2.__dict__:", c2.__dict__)
    assert Counter.count == 2
    assert c1.__dict__ == {}

    # Step 2: c1 resets (Shadowing occurs)
    c1.reset()
    print("\nAfter c1.reset():")
    print("c1.count:       ", c1.count)
    print("Counter.count:  ", Counter.count)
    print("c2.count:       ", c2.count)
    print("c1.__dict__:    ", c1.__dict__)
    print("c2.__dict__:    ", c2.__dict__)

    assert c1.count == 0
    assert Counter.count == 2
    assert c2.count == 2
    assert c1.__dict__ == {"count": 0}
    assert c2.__dict__ == {}

    # Step 3: Demonstrating the += trap
    class TrapDemo:
        val = 10

        def bad_increment(self):
            self.val += 1

    t = TrapDemo()
    t.bad_increment()
    print("\n+= Trap Demonstration:")
    print("TrapDemo.val (Class):", TrapDemo.val)
    print("t.val (Instance):    ", t.val)
    assert TrapDemo.val == 10  # Class attribute was NOT incremented!
    assert t.val == 11          # Instance attribute shadowed it!
    print("Verification passed successfully.")
```

---

### 7. Concise Staff-Level Interview Answer

> "The output is `2`, `0`, `2`, and `2`.
>
> In Python, class attributes live in the class's namespace (`Counter.__dict__`), while instance attributes reside in the object's instance dictionary (`self.__dict__`). 
>
> After instantiating `c1` and `c2`, `Counter.count` equals 2, while both instance dictionaries are completely empty. When `c1.reset()` executes `self.count = 0`, Python performs an assignment targeting `c1`'s local namespace. This injects `'count': 0` into `c1.__dict__`, shadowing the class attribute for `c1` while leaving `Counter.__dict__['count']` untouched at 2.
>
> When reading `c1.count`, Python finds the local instance attribute (0). When reading `c2.count`, because `c2.__dict__` is empty, Python falls back to the class blueprint and retrieves the shared class attribute (2). 
>
> To modify a shared class attribute safely from an instance method, you must explicitly qualify it via `Counter.count = 0` or `type(self).count = 0` to prevent creating an unintentional shadowing attribute."
