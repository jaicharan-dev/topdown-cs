---
id: 4-code-trace-diamond-shaped-multiple-inheritance
title: "Code Trace: Diamond-Shaped Multiple Inheritance & MRO"
description: "Master Python's Method Resolution Order (MRO), step-by-step C3 Linearization merge algorithm, super() delegation traps, and cooperative multiple inheritance."
sidebar_position: 4
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the exact output of this Python code, in order? Explain why `super()` inside class `B` jumps 'sideways' to class `C`, manually derive the MRO using the C3 Linearization merge algorithm, and explain how to safely pass arguments in cooperative multiple inheritance."
>
> ```python
> class A:
>     def __init__(self):
>         print("A")
> 
> class B(A):
>     def __init__(self):
>         print("B")
>         super().__init__()
> 
> class C(A):
>     def __init__(self):
>         print("C")
>         super().__init__()
> 
> class D(B, C):
>     def __init__(self):
>         print("D")
>         super().__init__()
> 
> d = D()
> ```

---

`D` inherits from both `B` and `C`, and both of those inherit from `A` — a diamond shape. The question is what order `super()` walks through it in, and the answer surprises most people: it does not mean "call my parent class." It means "call the next class in the Method Resolution Order (MRO) of the actual object," and that order can jump sideways between sibling classes.

---

### Exact Output

```text
D
B
C
A
```

---

### Step-by-Step Execution Trace

The class hierarchy is a diamond: `B` and `C` both inherit from `A`, and `D` inherits from both.

<Diagram>
<Tree root={
<Box title="A" accent="#818cf8"><Field icon="🔹" code="def __init__(self): print('A')" variant="neutral" /></Box>
}>
<Box title="B(A)" accent="#60a5fa"><Field icon="↳" code="print('B'); super().__init__()" variant="neutral" /></Box>
<Box title="C(A)" accent="#60a5fa"><Field icon="↳" code="print('C'); super().__init__()" variant="neutral" /></Box>
</Tree>
</Diagram>

Python resolves this into a single line, the MRO: `D → B → C → A → object`. Each `super().__init__()` call just moves one step right along that line:

<Diagram>
<Row>
<Box title="D()" accent="#818cf8"><Field icon="1️⃣" code="prints 'D'" variant="neutral" /></Box>
<Arrow label="super()" />
<Box title="B.__init__" accent="#60a5fa"><Field icon="2️⃣" code="prints 'B'" variant="neutral" /></Box>
<Arrow label="super() — jumps sideways, not up to A" />
<Box title="C.__init__" accent="#fb7185"><Field icon="3️⃣" code="prints 'C'" hint="B inherits from A, but the MRO says C comes next, not A" variant="neutral" /></Box>
<Arrow label="super()" />
<Box title="A.__init__" accent="#34d399"><Field icon="4️⃣" code="prints 'A'" hint="no super() call here — chain ends" variant="neutral" /></Box>
</Row>
</Diagram>

The trap is step 2 to 3: `B` inherits from `A`, so it's natural to assume `B`'s `super()` calls `A`. It doesn't — the object is a `D`, and in `D`'s MRO, the class right after `B` is `C`. Control jumps sideways to `C` first, and only reaches `A` after that.

---

### Deriving the MRO: the C3 Linearization Algorithm

Python 2.3+ determines MRO using the **C3 Linearization** algorithm (originally created for the Dylan language).

C3 satisfies three fundamental properties:
1. **Children precede parents:** A subclass is always checked before its base classes.
2. **Local Precedence Order:** The order of parents listed in the class definition `class D(B, C)` is strictly preserved ($B$ must precede $C$).
3. **Monotonicity:** If class $X$ precedes class $Y$ in the MRO of any parent, $X$ must precede $Y$ in the MRO of all derived subclasses.

#### The C3 Merge Formula:
The linearization $L(C)$ of a class $C$ with parents $P_1, P_2, \dots, P_n$ is:
$$L(C) = [C] + \text{merge}(L(P_1), L(P_2), \dots, L(P_n), [P_1, P_2, \dots, P_n])$$

#### Merge Rules:
- Look at the first element (the "head") of the first list.
- If this head does not appear in the "tail" (everything except the head) of any other list, extract it, append it to the result, and remove it from all lists.
- Otherwise, check the head of the next list. Repeat until all lists are exhausted.
- If no valid head can be extracted, Python rejects the hierarchy with a `TypeError`.

#### Step-by-Step Manual Derivation for `class D(B, C)`:

```text
Let O = object

1. Base classes:
   L(O) = [O]
   L(A) = [A, O]

2. Intermediate classes:
   L(B) = [B] + merge(L(A), [A])
        = [B] + merge([A, O], [A])
        = [B, A, O]

   L(C) = [C] + merge(L(A), [A])
        = [C] + merge([A, O], [A])
        = [C, A, O]

3. Target class D:
   L(D) = [D] + merge(L(B), L(C), [B, C])
        = [D] + merge([B, A, O], [C, A, O], [B, C])

   Step 3.1: Candidate 'B' (head of list 1)
     - Is 'B' in the tail of [C, A, O]? No.
     - Is 'B' in the tail of [B, C]? No ('B' is head, tail is [C]).
     -> Extract 'B'!
     L(D) = [D, B] + merge([A, O], [C, A, O], [C])

   Step 3.2: Candidate 'A' (head of list 1)
     - Is 'A' in the tail of [C, A, O]? YES! ('A' is behind 'C').
     -> 'A' is NOT a good head. Skip to next list head: 'C'.

   Step 3.3: Candidate 'C' (head of list 2)
     - Is 'C' in the tail of [A, O]? No.
     - Is 'C' in the tail of [C]? No.
     -> Extract 'C'!
     L(D) = [D, B, C] + merge([A, O], [A, O])

   Step 3.4: Candidate 'A' (head of list 1)
     - Is 'A' in the tail of [A, O]? No.
     -> Extract 'A'!
     L(D) = [D, B, C, A] + merge([O], [O])

   Step 3.5: Extract 'O'
     L(D) = [D, B, C, A, O]
```

This mathematical proof demonstrates why Python **must** evaluate `D -> B -> C -> A`, ensuring `A` is executed exactly once without duplicating base class initialization.

---

### Cooperative Multiple Inheritance with `**kwargs`

In production architectures, constructors often accept distinct arguments. If `B` takes `b_param` and `C` takes `c_param`, naive positional arguments will throw:
`TypeError: __init__() takes 2 positional arguments but 3 were given`

To make multiple inheritance cooperative, classes must accept `**kwargs` and pass remaining keyword arguments up the MRO chain:

```python
class A:
    def __init__(self, **kwargs):
        print("A initialized")
        super().__init__(**kwargs)

class B(A):
    def __init__(self, b_val=None, **kwargs):
        print(f"B received b_val={b_val}")
        super().__init__(**kwargs)
        self.b_val = b_val

class C(A):
    def __init__(self, c_val=None, **kwargs):
        print(f"C received c_val={c_val}")
        super().__init__(**kwargs)
        self.c_val = c_val

class D(B, C):
    def __init__(self, d_val=None, **kwargs):
        print(f"D received d_val={d_val}")
        super().__init__(**kwargs)
        self.d_val = d_val

# Clean execution with cooperative keyword routing:
d = D(d_val=10, b_val="hello", c_val=True)
```

---

### C++ Comparison: Virtual Base Classes

How does C++ solve this same diamond problem?

In standard C++, `class D : public B, public C` creates **two distinct sub-objects of `A`** in memory! Accessing members of `A` through `D` is a compile error due to ambiguity (`d.A::member`).

To fix this, C++ uses **Virtual Inheritance**:
```cpp
class B : virtual public A { ... };
class C : virtual public A { ... };
class D : public B, public C { ... };
```
With `virtual public A`, the compiler ensures only a single shared instance of `A` is allocated at the base of `D`'s memory layout, and the most derived class (`D`) is made responsible for directly invoking `A`'s constructor.

---

### The Inconsistent MRO Trap

What happens if an engineer introduces a circular or contradictory inheritance hierarchy?

```python
class X: pass
class Y(X): pass
class Z(X, Y): pass # TRAP: X precedes Y in definition, but Y inherits from X!
```

Python runs C3 Linearization at class definition time. Because `Z` demands that `X` precede `Y` (by local precedence order) while `Y` demands that `Y` precede `X` (subclasses precede parents), no monotonic sequence exists.

Python immediately halts module loading with:
```text
TypeError: Cannot create a consistent method resolution order (MRO) for bases X, Y
```

---

### Python: Runnable Verification

```python
"""
Standalone Python verification for Diamond Inheritance and MRO.
Run with: python diamond_inheritance_trace.py
"""


class A:
    def __init__(self):
        print("A")


class B(A):
    def __init__(self):
        print("B")
        super().__init__()


class C(A):
    def __init__(self):
        print("C")
        super().__init__()


class D(B, C):
    def __init__(self):
        print("D")
        super().__init__()


if __name__ == "__main__":
    print("--- Instantiating D ---")
    d = D()

    print("\n--- Verifying MRO tuple ---")
    mro_names = [cls.__name__ for cls in D.__mro__]
    print(f"D.__mro__: {mro_names}")
    assert mro_names == ["D", "B", "C", "A", "object"]
    print("MRO verification passed successfully!")
```

---

### Say this in the interview

*"The output is D, B, C, A. `super()` doesn't call your lexical parent class — it calls the next class in the Method Resolution Order of the actual object, which Python computes with C3 Linearization into `[D, B, C, A, object]`. That's why `B`'s `super()` jumps sideways to `C` instead of up to `A`: in `D`'s MRO, `C` comes right after `B`. This guarantees `A` is initialized exactly once, no matter how many classes sit between it and `D`. In production, that only works cleanly if every class forwards `**kwargs` through `super().__init__()` instead of hardcoding positional arguments."*
