---
id: 5-code-trace-class-vs-instance-attribute-shadowing
title: "Code Trace: Class Attribute vs Instance Attribute Shadowing"
description: "Master Python's attribute lookup protocol (__dict__), variable shadowing mechanics, the dangerous += mutation trap, and mutable class-level state in Python."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

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

Python attributes don't work like static members in C++ or Java. Every object keeps its own small dictionary of attributes (`__dict__`), and reading or writing `obj.attr` is really just a dictionary lookup — reading checks the instance's dictionary first and falls back to the class's, but writing always goes straight into the instance's own dictionary. That asymmetry is the whole trick behind this trace.

---

### Exact Output

```text
2
0
2
2
```

---

### Step-by-Step Namespace Trace (`__dict__`)

After `c1 = Counter()` and `c2 = Counter()` run, `Counter.__init__` has bumped the shared class attribute twice, but neither instance has written anything of its own yet:

<Diagram>
<Row>
<Box title="Counter.__dict__" accent="#818cf8"><Field icon="🏛️" code="{'count': 2}" variant="neutral" /></Box>
<Box title="c1.__dict__" accent="#94a3b8"><Field icon="📦" code="{}" hint="empty — nothing written yet" variant="neutral" /></Box>
<Box title="c2.__dict__" accent="#94a3b8"><Field icon="📦" code="{}" hint="empty — nothing written yet" variant="neutral" /></Box>
</Row>
</Diagram>

1. `print(Counter.count)` reads straight from `Counter.__dict__` → prints `2`.
2. `c1.reset()` runs `self.count = 0`. This is a **write**, and writes always land in the instance's own dictionary — never the class's:

<Diagram>
<Row>
<Box title="Counter.__dict__" accent="#818cf8"><Field icon="🏛️" code="{'count': 2}" hint="untouched" variant="neutral" /></Box>
<Box title="c1.__dict__" accent="#fb7185"><Field icon="📦" code="{'count': 0}" hint="now shadows the class attribute" variant="neutral" /></Box>
<Box title="c2.__dict__" accent="#94a3b8"><Field icon="📦" code="{}" hint="still empty" variant="neutral" /></Box>
</Row>
</Diagram>

3. `print(c1.count)` finds `'count'` directly in `c1.__dict__` → prints `0`.
4. `print(Counter.count)` still reads `Counter.__dict__` directly → prints `2`.
5. `print(c2.count)` — `c2.__dict__` is empty, so the lookup falls back to `Counter.__dict__` → prints `2`.

---

### Python's Attribute Lookup Protocol

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

### The Dangerous `+=` Shadowing Trap

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

### Mutable Class Attributes: a Different Trap

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

### Python: Runnable Verification

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

### Say this in the interview

*"The output is 2, 0, 2, 2. Class attributes live in `Counter.__dict__`; instance attributes live in `self.__dict__`. Reading falls back from the instance's dictionary to the class's if the instance doesn't have it, but writing always goes straight into the instance's own dictionary — it never touches the class. So `c1.reset()`'s `self.count = 0` creates a local `count` that shadows the class attribute for `c1` only; `Counter.count` and `c2.count` are untouched. The same asymmetry causes a real production bug: `self.count += 1` reads the class attribute, adds one, then writes that result as a new instance attribute — so the shared counter never actually increments. Mutating a class attribute safely requires naming the class explicitly, like `Counter.count = 0` or `type(self).count = 0`."*
