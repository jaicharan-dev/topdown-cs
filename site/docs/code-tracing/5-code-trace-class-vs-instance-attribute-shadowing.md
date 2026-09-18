---
id: 5-code-trace-class-vs-instance-attribute-shadowing
title: "Code Trace: Class Attribute vs Instance Attribute Shadowing"
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:**
> ```python
> class Counter:
>     count = 0
>     def __init__(self):
>         Counter.count += 1
>     def reset(self):
>         self.count = 0
> c1 = Counter()
> c2 = Counter()
> print(Counter.count)
> c1.reset()
> print(c1.count)
> print(Counter.count)
> print(c2.count)
> ```
> What does each print statement output, and why?

Here is the exact output, followed by a top-down trace. This is a classic interview question designed to test if you understand the difference between class attributes and instance attributes in Python, and specifically how variable shadowing works.

### The Exact Output
```text
2
0
2
2
```

### The Interview Quick-Hit (The Trap)

"In Python, if you assign a value to `self.attribute_name`, it creates a local instance attribute, even if a class attribute with the exact same name already exists. This new instance attribute 'shadows' the class attribute for that specific object, while leaving the shared class attribute entirely untouched."

### Step-by-Step Trace (The "Why")

1. **Class Definition:** You define `count = 0` directly under the `Counter` class. This makes it a **Class Attribute**. It belongs to the blueprint itself and is shared by all instances.
2. **Instantiation (`c1 = Counter()` and `c2 = Counter()`):**
   * When `c1` is created, the `__init__` method runs `Counter.count += 1`. The shared class attribute becomes 1.
   * When `c2` is created, it runs `Counter.count += 1` again. The shared class attribute becomes 2.
3. **First Print:** `print(Counter.count)` outputs `2`.
4. **The Trap (`c1.reset()`):**
   * You call `c1.reset()`, which executes `self.count = 0`.
   * **The Trap:** A junior developer might think this resets the class attribute to 0. But because you used `self`, Python says, "I am going to create a brand new **Instance Attribute** called `count` that lives only inside `c1`, and assign it 0." The class attribute `Counter.count` remains completely unaffected.
5. **The Resolution:**
   * **Second Print:** `print(c1.count)`. Python looks at the `c1` object. It finds the newly created instance attribute `count` and outputs `0`.
   * **Third Print:** `print(Counter.count)`. This is the shared class attribute. It was never modified by the `reset` method, so it outputs `2`.
   * **Fourth Print (The Double Trap):** `print(c2.count)`. Python looks at the `c2` object for an instance attribute named `count`. It doesn't find one (because `reset()` was never called on `c2`). When Python can't find an instance attribute, it falls back and looks at the class blueprint. It finds the class attribute `Counter.count` (which is 2) and outputs `2`.

### Summary for Interviews

If you want to seal the deal on this explanation: "To actually modify a class attribute from within an instance method, you must reference the class explicitly (e.g., `Counter.count = 0`) or use the `__class__` attribute (`self.__class__.count = 0`). Assigning directly to `self.count` will always just create a shadowing instance variable."

---

### Crucial Nuance: The Mutable Class Attribute Nightmare

While shadowing is straightforward with immutable types (like integers and strings), things become significantly more dangerous when the class attribute is a mutable object, such as a list or a dictionary. 

If you have a class attribute `items = []`, and inside an instance method you run `self.items.append(new_item)`, Python does **not** create a shadowing instance attribute. Because you are modifying the object in place rather than reassigning it with the `=` operator, you will permanently modify the shared class attribute for *all* instances. This is a massive source of bugs in Python backends, particularly when setting default arguments in constructors or defining shared configuration dictionaries at the class level.
