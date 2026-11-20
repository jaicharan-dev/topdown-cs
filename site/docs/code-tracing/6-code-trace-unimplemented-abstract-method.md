---
id: 6-code-trace-unimplemented-abstract-method
title: "Code Trace: Unimplemented Abstract Method and Contracts"
description: "Two shapes print and the third raises, and the whole value of abc.ABC is that it moves the same failure from the third loop iteration to the moment the object is made"

sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact output of this Python code? Explain what occurs on the third iteration and why. How does Python's modern `abc.ABC` module transform this runtime failure into an instantiation-time guard, and how does this compare to Java and C++ compile-time enforcement?"

```python
class Shape:
    def area(self):
        raise NotImplementedError("Subclass must implement area()")

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius
    def area(self):
        return 3.14 * self.radius ** 2

class Square(Shape):
    def __init__(self, side):
        self.side = side
    def area(self):
        return self.side ** 2

class Triangle(Shape):
    def __init__(self, base, height):
        self.base = base
        self.height = height

shapes = [Circle(5), Square(4), Triangle(3, 6)]
for shape in shapes:
    print(shape.area())
```

**Before you scroll.** `Triangle` never defines `area`. Two questions: how much output appears before anything goes wrong, and at which line does the program actually fail, given that `Triangle(3, 6)` is constructed on the line *before* the loop.

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
78.5
16
```

then `NotImplementedError: Subclass must implement area()`.

Two values print before the failure, and the crucial detail is that **`Triangle(3, 6)` succeeded**. The broken object was built, stored in a list, and carried past two successful iterations before anything complained.

</details>

---

### Picture it

A hiring process that checks whether someone can do the job on their first day with a customer.

The candidate is interviewed, offered the post, signs the contract, and is added to the rota. **Every one of those steps succeeds.** The gap in their skills is real from the moment they are hired, and nothing in the hiring process is looking for it.

Then the rota reaches them, in front of a customer, and the gap becomes everyone's problem. The failure is loud and it is in the wrong place: the person who has to deal with it is the customer, the stack trace points at the service desk, and the actual mistake was made weeks earlier by whoever did the hiring.

That displacement is the entire subject of this question. **The defect is created at construction and reported at use**, and between those two moments the broken object looks exactly like a working one. It can be put in a list, passed between functions, serialised, counted, and logged. Two other shapes are served perfectly well before the problem appears, so the failure arrives after a stretch of apparently correct behaviour.

So the improvement is not better error messages or more tests around the call. **The improvement is to move the check to the hiring.** Ask at the point of hiring whether this candidate can do the things the job requires, and refuse to hire them if not. The gap is then reported by the line that caused it, by name, with nobody inconvenienced and nothing half-built in a list.

And that reframes what the base class is for. A `Shape` whose `area` raises is a **note in the file saying the job requires this skill**, discovered only when the work arrives. A `Shape` that cannot be subclassed without `area` is **a condition of employment**. Both document the same requirement; only one of them enforces it, and the question is asking whether you know which mechanism does which.

---

### The proper terms

#### What this code actually builds

`Shape.area` raising `NotImplementedError` is the **convention-based** abstract method. It is an ordinary method with an ordinary body, and the base class is an ordinary class: `Shape()` is perfectly constructible, and so is any subclass, complete or not.

So the requirement is expressed as a **runtime trap** rather than a constraint. Three consequences follow, and all three are visible in this trace:

**The base class is instantiable.** Nothing stops `Shape()`.

**An incomplete subclass is instantiable.** `Triangle(3, 6)` succeeds.

**The failure is deferred to the call**, so its distance from the mistake is unbounded. Here it is two iterations; in a real system it can be a different request on a different day.

**`NotImplementedError`** is a subclass of `RuntimeError`, which is worth knowing because it means `except RuntimeError` catches it and a broad `except Exception` certainly does. It is not a special language construct; the name is a convention and the enforcement is nil.

#### What `abc` changes

The **`abc`** module provides **`ABCMeta`**, a metaclass, and **`ABC`**, a convenience base class that uses it. Decorating a method with **`@abstractmethod`** records its name in the class's **`__abstractmethods__`** frozenset.

The enforcement lives in **`object.__new__`**, which refuses to allocate an instance of a class whose `__abstractmethods__` is non-empty:

```text
TypeError: Can't instantiate abstract class Triangle with abstract method area
```

Three properties worth stating precisely, because each is asked about:

**The check is at instantiation, not at class definition.** `class Triangle(Shape)` with no `area` is a perfectly legal class statement. It is `Triangle(3, 6)` that raises. So the guard is earlier than the call but **later than compilation**, which is the gap that separates Python from Java here.

**A class with unimplemented abstract methods is still useful as a base.** That is the point: `Shape` itself cannot be instantiated and can still be subclassed.

**`@abstractmethod` alone does nothing.** Without `ABCMeta` as the metaclass, the decorator sets a flag that nobody reads, and the class instantiates happily. Inheriting from plain `object` and decorating methods is a common and silent mistake.

#### How Java and C++ do it

Java's **`abstract`** keyword is a compile-time constraint. A concrete class that fails to implement an inherited abstract method does not compile:

```text
error: Triangle is not abstract and does not override abstract method area() in Shape
```

C++ uses a **pure virtual** function, `virtual double area() = 0;`, making the class **abstract**. Any attempt to instantiate a class with an unoverridden pure virtual is a compile error. C++ additionally allows a pure virtual function to have a body, which subclasses may call explicitly as a shared default.

The axis that orders all four mechanisms is **when the requirement is checked**:

| Mechanism | Checked | What is reported | Distance from the mistake |
| :--- | :--- | :--- | :--- |
| `NotImplementedError` | **first call** | the method is missing | unbounded |
| `abc.ABC` | **construction** | the class is abstract, named | the constructing line |
| Java `abstract` | **compile** | the class does not override | the class declaration |
| C++ pure virtual | **compile** | the type is abstract | the instantiating line |

Moving up that table makes the diagnostic more specific and the moment of discovery earlier. **Nothing is traded away except the ability to construct a deliberately incomplete object**, which is occasionally wanted and is what `NotImplementedError` is genuinely for.

#### The distinction that matters at interview

**Duck typing** asks whether the object has the method when you call it. Nominal typing asks whether the class declared the method when you defined it. `NotImplementedError` is duck typing with a note attached; `abc` is nominal typing enforced one step later than Java enforces it; **`typing.Protocol`** is a third option, giving static checking with no runtime cost and no inheritance requirement.

---

### Why it does that, step by step

| Step | Statement | What happens | Output |
| :---: | :--- | :--- | :--- |
| 1 | `Circle(5)` | `__init__` sets `radius`; no check of `area` | |
| 2 | `Square(4)` | `__init__` sets `side` | |
| 3 | `Triangle(3, 6)` | `__init__` sets `base` and `height`, **and succeeds** | |
| 4 | the list is built | three objects, one of them broken, indistinguishable | |
| 5 | `Circle.area()` | `3.14 * 25` | `78.5` |
| 6 | `Square.area()` | `4 ** 2` | `16` |
| 7 | `Triangle.area()` | not found on `Triangle`, so the MRO reaches `Shape.area`, which raises | **`NotImplementedError`** |

**Step 3 is the step to point at.** The broken object is constructed without complaint, and from that moment it is a normal member of the list. Steps 5 and 6 then produce correct output, so by the time the failure arrives the program has been behaving correctly for a while.

Step 7 is worth being precise about: `Triangle` does not define `area`, so attribute lookup walks the MRO, `[Triangle, Shape, object]`, finds `Shape.area`, and calls it. **The inherited method is found and executed**; it simply raises. There is no "missing method" error, which is why the traceback points inside `Shape` rather than at `Triangle`.

#### The `abc` version

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        ...

class Triangle(Shape):
    def __init__(self, base, height):
        self.base, self.height = base, height

t = Triangle(3, 6)
```

raises immediately:

```text
TypeError: Can't instantiate abstract class Triangle with abstract method area
```

Nothing prints, because nothing ran. Four things improved at once:

**The failure moved from step 7 to step 3**, so the loop never starts.

**The message names the class and the method.** `Can't instantiate abstract class Triangle with abstract method area` identifies both the culprit and the requirement, where `NotImplementedError: Subclass must implement area()` identifies neither.

**The traceback points at the construction site**, which is the line that is actually wrong.

**No broken object exists**, so nothing can be stored, passed or logged in an invalid state.

And `Shape()` is now refused as well, which the convention version allowed.

#### What `abc` does not do

```python
class Triangle(Shape):           # a perfectly legal class statement
    def __init__(self, base, height):
        self.base, self.height = base, height
```

**This class definition does not raise.** The class object is created, can be inspected, subclassed and referenced. Only instantiation fails. So `abc` is earlier than the call and later than compilation, and a class that is never instantiated never reports its problem.

That is the honest limit relative to Java, where the equivalent is a build failure found by the compiler whether anything constructs it or not.

#### The silent mistake

```python
from abc import abstractmethod

class Shape:                     # plain object, NOT ABC
    @abstractmethod
    def area(self): ...

class Triangle(Shape):
    pass

t = Triangle()                   # succeeds, with no error at all
t.area()                         # returns None
```

**The decorator sets a flag that nobody reads.** Enforcement lives in `ABCMeta`, so without it `@abstractmethod` is documentation. Worse than the `NotImplementedError` version, because `area()` now returns `None` and the program carries on with a wrong value instead of raising.

The lesson for the interview: **`@abstractmethod` is inert without `ABCMeta`**, and if you only remember one fact about `abc`, remember that the metaclass is where the enforcement is.

---

### What they ask next

**"What is the exact output?"**
`78.5`, then `16`, then a `NotImplementedError`. Two values print before the failure. The detail that matters more than the numbers is that **`Triangle(3, 6)` succeeded**: the broken object was constructed, stored in a list, and carried past two correct iterations before anything complained.

**"What happens on the third iteration, precisely?"**
`Triangle` does not define `area`, so attribute lookup walks its MRO, `[Triangle, Shape, object]`, finds **`Shape.area`**, and calls it. The inherited method is found and executed, and it raises. **There is no "method not found" error**, which is why the traceback points inside `Shape` rather than at `Triangle` or at the construction site.

**"What does `abc.ABC` change?"**
It moves the same failure from the call to the construction. `@abstractmethod` records the name in **`__abstractmethods__`**, and **`object.__new__`** refuses to allocate an instance while that set is non-empty, raising `TypeError: Can't instantiate abstract class Triangle with abstract method area`. Four improvements at once: the loop never starts, the message names the class and the method, the traceback points at the line that is wrong, and **no broken object ever exists** to be stored or passed.

**"When exactly is the `abc` check performed?"**
At **instantiation**, not at class definition. `class Triangle(Shape)` with no `area` is a legal class statement that creates a usable class object, and only `Triangle(3, 6)` raises. So the guard is earlier than the call and **later than compilation**, which is precisely the gap between Python and Java, and it means a class nobody instantiates never reports the problem.

**"Does `@abstractmethod` work on a plain class?"**
No, and this is the trap. Without `ABCMeta` as the metaclass the decorator just sets a flag nobody reads, so the class instantiates happily and the un-overridden method **returns `None`**. That is worse than the `NotImplementedError` version, because the program continues with a wrong value instead of raising. **Enforcement lives in the metaclass**, so inheriting from `ABC` or setting `metaclass=ABCMeta` is what makes the decorator mean anything.

**"How does Java compare?"**
Java's `abstract` is checked by the **compiler**: a concrete class that fails to implement an inherited abstract method does not build, with `error: Triangle is not abstract and does not override abstract method area() in Shape`. The requirement is therefore enforced whether or not anything ever constructs a `Triangle`, which `abc` cannot promise.

**"And C++?"**
A **pure virtual** function, `virtual double area() = 0;`, makes the class abstract, and instantiating a class with an unoverridden pure virtual is a compile error. C++ also permits a pure virtual function to have a body that subclasses may call explicitly as a shared default, which has no direct equivalent in either Python or Java.

**"Is `NotImplementedError` ever the right choice?"**
Yes, in two cases. When you genuinely want an **optional hook** that most subclasses do not implement and callers are expected to handle, and when a method is unimplemented for a particular subtype as a legitimate state rather than a defect, which is how parts of the standard library signal an unsupported operation. **Its weakness is only a weakness when you meant it as a requirement**, and worth noting it subclasses `RuntimeError`, so a broad `except RuntimeError` swallows it.

**"What about `typing.Protocol`?"**
A third point on the spectrum: **static** checking with no runtime cost and no inheritance relationship, since a class satisfies a protocol structurally by having the right methods. It catches the error at type-check time, earlier than `abc`, and catches nothing at all if nobody runs the checker. `abc` gives a runtime guarantee, `Protocol` gives a static one, and using both is reasonable.

**"So which should you use?"**
`abc` for a class hierarchy you own where subclasses must implement something, because the guarantee is enforced at runtime and the error names the problem. `Protocol` for accepting objects you do not own, since it needs no inheritance. **`NotImplementedError` only when an unimplemented method is a legitimate outcome**, not as a way of writing an abstract method.

**The common wrong answer** is saying the program fails on construction of `Triangle`, which is what the `abc` version does and not what this code does. Next is giving no output at all before the error, which misses that two shapes are served correctly first. Third is describing the third iteration as a missing-method error, when the method is found on `Shape` and executed and simply raises. And last is claiming `@abstractmethod` prevents instantiation on its own, when without `ABCMeta` it is inert and the method silently returns `None`.

---

### Say this in the interview

*"The output is 78.5, then 16, then a NotImplementedError on the third iteration.*

*The detail I would lead with is not the numbers, it is that Triangle of three, six succeeded. The broken object was constructed without complaint, stored in a list, and carried past two perfectly correct iterations before anything went wrong. So the defect is created at construction and reported at use, and between those two moments the broken object is indistinguishable from a working one: it can be put in a list, passed around, serialised, counted and logged.*

*On the third iteration specifically: Triangle does not define area, so attribute lookup walks its MRO, which is Triangle, Shape, object, finds Shape's area, and calls it. The inherited method is found and executed, and it raises. There is no method-not-found error, which is why the traceback points inside Shape rather than at Triangle or at the line that actually built the bad object.*

*So what this code builds is a convention-based abstract method: an ordinary method with an ordinary body on an ordinary class. Shape itself is perfectly constructible, an incomplete subclass is perfectly constructible, and the requirement is expressed as a runtime trap rather than a constraint. Worth adding that NotImplementedError subclasses RuntimeError, so a broad except RuntimeError swallows it.*

*What abc changes is when the check happens. Decorating with `@abstractmethod` records the name in the class's `__abstractmethods__` frozenset, and `object.__new__` refuses to allocate an instance while that set is non-empty, raising TypeError, can't instantiate abstract class Triangle with abstract method area. That improves four things at once: the loop never starts, the message names both the class and the missing method where the old one named neither, the traceback points at the construction site which is the line that is actually wrong, and no broken object ever exists to be stored or passed. And Shape itself becomes non-instantiable, which the convention version allowed.*

*I would be precise about abc's limit, though, because it is the interesting part of the comparison. The check is at instantiation, not at class definition. Writing class Triangle of Shape with no area is a perfectly legal class statement that creates a usable class object; only Triangle of three, six raises. So abc is earlier than the call and later than compilation, and a class nobody ever instantiates never reports its problem. Java closes that gap: abstract is checked by the compiler, so a concrete class that fails to implement an inherited abstract method does not build at all, whether or not anything constructs it. C++ does the same with a pure virtual function, area equals zero, making the class abstract, and it additionally allows a pure virtual to have a body that subclasses can call explicitly as a shared default, which neither Python nor Java has.*

*The underlying distinction is duck typing against nominal typing: duck typing asks whether the object has the method when you call it, where nominal typing asks whether the class declared it when you defined it. The axis that orders all four mechanisms is simply when the requirement is checked: NotImplementedError at first call, abc at construction, Java and C++ at compile time. Moving up that list makes the diagnostic more specific and the discovery earlier, and nothing is traded away except the ability to construct a deliberately incomplete object, which is occasionally what you want and is what NotImplementedError is genuinely for.*

*One trap I would volunteer, because it is silent: `@abstractmethod` on a plain class does nothing. Without ABCMeta as the metaclass the decorator sets a flag nobody reads, so the class instantiates happily and the un-overridden method returns None, so the program carries on with a wrong value instead of raising. That is strictly worse than the NotImplementedError version. If I remember one fact about abc it is that the enforcement lives in the metaclass.*

*And if they want the modern alternative: typing.Protocol is a third point on the spectrum, giving static checking with no runtime cost and no inheritance requirement, since a class satisfies a protocol structurally. It catches the problem earlier than abc if someone runs the checker, and catches nothing if nobody does. So abc for a hierarchy I own where subclasses must implement something, Protocol for accepting objects I do not own, and NotImplementedError only when an unimplemented method is a legitimate outcome rather than a defect."*
