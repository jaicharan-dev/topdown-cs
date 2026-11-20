---
id: 3-code-trace-overridden-method-parent-constructor
title: "Code Trace: Overridden Method Called from a Parent Constructor"
description: "The same source shape gives different output in Python and C++, and the language that agrees with Python is the one where it does real damage"

sidebar_position: 3
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the exact output of this Python code? Explain why `sound()` prints what it does. What happens if this exact pattern is written in Java or C++, and why is calling overridable methods from constructors considered a dangerous anti-pattern?"

```python
class Animal:
    def __init__(self):
        print("1. Animal constructor")
        self.sound()

    def sound(self):
        print("2. Generic animal sound")

class Dog(Animal):
    def __init__(self):
        super().__init__()
        print("3. Dog constructor")

    def sound(self):
        print("4. Woof")

d = Dog()
```

**Before you scroll.** Three lines print. The one that decides whether you have understood it is the middle one: at the moment `Animal.__init__` calls `self.sound()`, `Dog.__init__` has not reached its own body yet. Does the call reach `Animal.sound` or `Dog.sound`, and is the answer the same in C++?

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
1. Animal constructor
4. Woof
3. Dog constructor
```

Label 2 never prints, and label 4 prints **before** label 3. The same program shape in C++ prints `2. Generic animal sound` instead, which is the heart of the question.

</details>

---

### Picture it

A building inspector who signs off the foundations by testing the roof.

The base contractor is halfway through its own work and calls for an inspection of the finished building. **The inspection is carried out against the final plans**, including every change the upper-floor contractor intends to make, because the plans are complete from the moment the project starts. But the upper floors are not built yet. So you get an inspection that reads from the right drawing and looks at the wrong building.

That is the whole defect, and it is worth separating into the two independent facts that make it.

**The first fact is about which drawing is consulted.** The object knows its own real type from the instant it exists, before any constructor body has run. So a call made through the object during base construction is answered by the **most-derived** implementation, not the base's own. Nothing about being inside a constructor makes dispatch behave differently.

**The second fact is about what state exists.** Constructors run from the base upward, so when the base constructor is running, every field the derived class adds is **unset**. In Python the attribute does not exist yet; in Java it holds its default of `null` or `0`.

Each fact on its own is unremarkable. Together they produce the trap: **the most-derived method runs at the one moment its own object is least ready to run it.** The override is called with every assumption its author made about initialisation not yet true.

And then the part that makes this a genuinely good interview question rather than a gotcha. **C++ gives a different answer**, and not because its designers disagreed about dispatch. They changed the first fact: during base construction a C++ object's dynamic type **is** the base, so the call resolves to the base's own method. That makes the output safe and, in exchange, means you cannot use virtual dispatch from a constructor at all. Two languages, two defensible choices, and knowing which one you are in tells you whether this pattern is a latent bug or an impossibility.

---

### The proper terms

#### Why the override is reached

In Python, method lookup on `self` is **dynamic** and happens at call time, walking the **MRO** of `type(self)`. Inside `Animal.__init__`, `type(self)` is already `Dog`, because the object was created by `Dog`'s metaclass machinery before any `__init__` ran. So `self.sound()` finds `Dog.sound` first.

There is no "constructor mode" in which dispatch is suppressed. `__init__` is an ordinary method; it is not what creates the object. `__new__` allocates, `__init__` merely initialises, and by the time either runs the object already knows its type.

Java behaves the same way for the same reason: JLS §12.5 has the superclass constructor run before the subclass's field initializers and body, while **virtual dispatch uses the object's actual class throughout**. The combination is what makes the Java version the dangerous one.

#### The state that is missing

**Partial initialization** is the condition the override observes: the object exists, its type is final, and the fields its own class declares have not been assigned.

In Python the attribute is simply absent, so touching it raises `AttributeError`. That is loud and immediate.

In Java the field holds its default value, `null` for references and `0` or `false` for primitives. That is silent, and a `final` field can be observed holding `0` before it is assigned, which otherwise looks impossible. This is why the Java version of this bug typically surfaces as a `NullPointerException` in a method that cannot possibly be called with a null field, or as a plausible-looking wrong number.

#### Why C++ differs

In C++, the **dynamic type of an object changes during construction**. While the base constructor runs, the object is of the base type, and the virtual table pointer points at the base's table. So a virtual call from a base constructor resolves to the **base's** override, even if a derived override exists.

This is specified, not an accident: ISO C++ [class.cdtor] states that a virtual call from a constructor or destructor dispatches to the class of the constructor, and that calling a **pure virtual** function from a constructor is **undefined behaviour**.

The trade is explicit. C++ chose to make the state consistent with the dispatch, at the cost of making virtual dispatch from constructors useless. Python and Java chose consistent dispatch and accepted inconsistent state.

#### Names for the defect

The pattern is usually called **calling an overridable method from a constructor**, and it is listed as an anti-pattern in *Effective Java*, Item 19: "design and document for inheritance or else prohibit it", which states the rule plainly as **constructors must not invoke overridable methods**.

It is one case of the broader **partially constructed object** hazard, whose other members are publishing `this` from a constructor, registering a half-built object with a listener registry, and starting a thread that touches the object from inside its own constructor.

---

### Why it does that, step by step

#### The Python trace

| Step | What runs | State of the object | Output |
| :---: | :--- | :--- | :--- |
| 1 | `Dog()` allocates via `__new__`; `type(obj)` is already `Dog` | no attributes set | |
| 2 | `Dog.__init__` begins, first statement `super().__init__()` | no attributes set | |
| 3 | `Animal.__init__` begins | no attributes set | `1. Animal constructor` |
| 4 | `self.sound()` looks up `sound` on `type(self)`, which is `Dog` | no attributes set | |
| 5 | **`Dog.sound` runs**, not `Animal.sound` | **`Dog.__init__` has not run its body** | `4. Woof` |
| 6 | `Animal.__init__` returns | | |
| 7 | `Dog.__init__` resumes its own body | | `3. Dog constructor` |

**Step 5 is the whole question.** The override runs, and it runs before step 7, which is the only place `Dog` gets to set anything up. Here `Dog.sound` happens not to touch any state, which is why the code prints rather than crashing, and it is exactly that harmlessness that makes the pattern survive code review.

#### What happens when the override does touch state

Change `Dog` so its method uses a field, which is the realistic case:

```python
class Dog(Animal):
    def __init__(self):
        super().__init__()        # calls self.sound() ...
        self.name = "Rex"         # ... but this has not run yet

    def sound(self):
        print(f"4. Woof from {self.name}")
```

This raises `AttributeError: 'Dog' object has no attribute 'name'`, from inside a method whose author could reasonably assume `self.name` exists, because every normal call path sets it first. **The failure is in `Dog.sound` and the cause is in `Animal.__init__`**, a file the `Dog` author may never have opened.

#### The same shape in Java

```java
class Animal {
    Animal() {
        System.out.println("1. Animal constructor");
        sound();                       // virtual dispatch, reaches Dog.sound
    }
    void sound() { System.out.println("2. Generic animal sound"); }
}

class Dog extends Animal {
    private final String name = "Rex";       // not yet assigned
    Dog() {
        super();
        System.out.println("3. Dog constructor");
    }
    @Override void sound() {
        System.out.println("4. Woof from " + name);   // prints "null"
    }
}
```

The printed order matches Python, **and the failure mode is worse**: `name` is a `final` field that prints as `null`, because `super()` completes before `Dog`'s field initializers run under §12.5. No exception is thrown. A `final` field, which the language otherwise guarantees is assigned exactly once before use, is observably `null`, and the program carries on with wrong data.

#### The same shape in C++, which disagrees

```cpp
struct Animal {
    Animal() {
        std::cout << "1. Animal constructor" << std::endl;
        sound();                      // dispatches to Animal::sound
    }
    virtual void sound() {
        std::cout << "2. Generic animal sound" << std::endl;
    }
    virtual ~Animal() = default;
};

struct Dog : Animal {
    Dog() : Animal() {
        std::cout << "3. Dog constructor" << std::endl;
    }
    void sound() override {
        std::cout << "4. Woof" << std::endl;
    }
};

int main() { Dog d; d.sound(); }
```

Compiled and run, this prints:

```text
1. Animal constructor
2. Generic animal sound
3. Dog constructor
4. Woof
```

**Line 2, not line 4.** During `Animal`'s constructor the object's dynamic type is `Animal`, so the virtual call resolves to `Animal::sound`. The derived override becomes reachable only once construction finishes, which the fourth line demonstrates by making the same call from outside.

#### The three languages side by side

| | Dispatch during base construction | Derived state during base construction | This program prints |
| :--- | :--- | :--- | :--- |
| **Python** | most-derived override | attribute **absent**, so `AttributeError` if touched | `1`, **`4`**, `3` |
| **Java** | most-derived override | field at **default**, silently `null` or `0` | `1`, **`4`**, `3` |
| **C++** | the **base's** own method | irrelevant, the override is unreachable | `1`, **`2`**, `3` |

The ranking that matters: **Java is the most dangerous** because the state is wrong and silent; **Python is dangerous but loud**, failing with an `AttributeError` that names the problem; **C++ is safe here** and pays for it by making a legitimate use of virtual dispatch from a constructor impossible.

#### The fixes, in order of preference

**Do not call overridable methods from a constructor.** This is the rule, and the other items are what to do when you want the behaviour the call was reaching for.

**Make the method non-overridable**: `final` in Java, `@final` by convention or name-mangling with a double underscore in Python. A call to a method nobody can override cannot reach a subclass.

**Move the work out of construction** into an explicit `start()` or `init()` the caller invokes after the object exists. This is the usual answer for anything involving registration, threads or callbacks.

**Use a factory method** that constructs the object fully and then calls the overridable method, so the call happens after every constructor has returned.

**Pass the value instead of fetching it.** If the base constructor wants a subclass-specific value, take it as a constructor parameter rather than calling a method to obtain it. This is the cleanest fix and it is usually available.

---

### What they ask next

**"Why does `Dog.sound` run rather than `Animal.sound`?"**
Because method lookup on `self` is dynamic and uses `type(self)`, which is already `Dog` before any `__init__` body executes. **`__init__` does not create the object**; `__new__` allocates it and the type is fixed from that moment. There is no mode in which being inside a constructor suppresses dispatch, in Python or in Java.

**"Why does `4. Woof` print before `3. Dog constructor`?"**
Because `Dog.__init__` delegates to `super().__init__()` as its first statement, so `Animal.__init__` runs to completion, including the `self.sound()` call, before `Dog.__init__` reaches its own body. **The override runs at the one moment its own class has set nothing up.**

**"The code prints fine. Where is the bug?"**
In what the override is allowed to assume. `Dog.sound` happens to touch no state, which is exactly why the pattern survives review. Give it one field and it breaks: in Python `AttributeError: 'Dog' object has no attribute 'name'`, raised inside `Dog.sound`, caused by a line in `Animal.__init__` that the `Dog` author may never have read.

**"What does Java do differently?"**
The same order, with a worse failure mode. Under **§12.5** the superclass constructor completes before the subclass's field initializers run, so the override sees fields at their **defaults**. A `final String name = "Rex"` prints as `null`, silently, and no exception is thrown. **A `final` field observably holding `null` is otherwise impossible**, which is what makes this bug so disorienting to debug.

**"And C++?"**
It prints the **base's** version, because the object's dynamic type changes during construction: while the base constructor runs, the vtable pointer is the base's, so a virtual call resolves to the base's method. **ISO C++ [class.cdtor]** specifies this, and additionally makes calling a **pure virtual** function from a constructor undefined behaviour. The derived override becomes reachable only after construction completes.

**"Which design is better?"**
They are both defensible and they trade different things. C++ keeps **dispatch consistent with state**, so you can never observe a half-built derived object, and pays by making virtual dispatch from constructors useless. Python and Java keep **dispatch consistent with type**, which is simpler to reason about in every other context, and accept that a constructor can observe a partially initialized object. **Knowing which rule your language follows is what tells you whether this pattern is a latent bug or an impossibility.**

**"What is the general category?"**
The **partially constructed object** hazard. Its other forms are publishing `this` from a constructor, registering a half-built object with a listener or cache, and starting a thread from inside a constructor that touches the object. All share the shape that **something gains a reference to the object before the object is finished**, and the override call is just the version where the something is the object itself.

**"How do you fix it?"**
In order: do not call overridable methods from constructors at all, which is *Effective Java* Item 19; make the method `final` or name-mangled so it cannot be overridden; move the work into an explicit `start()` the caller invokes after construction; use a factory that constructs fully and then calls; or best of all, **pass the value as a constructor parameter** instead of calling a method to obtain it, which removes the dependency rather than sequencing around it.

**"Is there any legitimate use?"**
Only with a method that is documented as part of the construction protocol and explicitly permitted to see an incomplete object, which is a heavy contract to impose on every future subclass author. *Effective Java* Item 19's title is the honest summary: design and document for inheritance, or else prohibit it. A class that calls its own overridable methods from a constructor and does not say so has prohibited nothing and documented nothing.

**The common wrong answer** is `2. Generic animal sound`, reasoning that inside `Animal`'s constructor you are "in `Animal`" so its own method runs. That is the C++ answer, and it is correct for C++ and wrong for Python and Java. Next is getting the order wrong by putting `3. Dog constructor` before `4. Woof`, which misses that the `super()` call completes first. Third is calling the code fine because it prints without error, when the defect is in what the override may assume. And last is describing the Java behaviour as identical to Python's without noting that Java's silent `null` on a `final` field is strictly worse than Python's immediate `AttributeError`.

---

### Say this in the interview

*"The output is Animal's constructor line, then Woof, then Dog's constructor line. Label two never prints and label four prints before label three.*

*Two independent facts produce that, and it is worth separating them because together they are the trap. The first is about dispatch: method lookup on self is dynamic and walks the MRO of type of self, which is already Dog before any init body runs, because init does not create the object. New allocates it and the type is fixed from that instant. So self dot sound inside Animal's init finds Dog's sound. There is no mode where being inside a constructor suppresses dispatch.*

*The second fact is about state: constructors run base-first, so when Animal's init is running, nothing Dog adds has been set. So the most-derived method runs at the exact moment its own object is least ready to run it. The override is called with every assumption its author made about initialisation not yet true.*

*And the reason this code prints rather than crashing is that Dog's sound happens to touch no state. That harmlessness is precisely why the pattern survives code review. Give the method one field and it breaks: in Python you get AttributeError, Dog object has no attribute name, raised inside Dog's sound, caused by a line in Animal's init that the Dog author may never have opened.*

*Java does the same thing with a worse failure mode. Under JLS 12.5 the superclass constructor completes before the subclass's field initializers run, so the override sees fields at their defaults. A final String name equals "Rex" prints as null, silently, with no exception. A final field observably holding null is otherwise impossible in Java, which is what makes this so disorienting to debug.*

*C++ gives a different answer, and this is the part I think makes it a good question rather than a gotcha. In C++ the dynamic type of the object changes during construction: while the base constructor runs the object is of the base type and the vtable pointer is the base's, so the virtual call resolves to Animal's own sound. So C++ prints label two where Python and Java print label four. That is specified in class dot cdtor, which also makes calling a pure virtual function from a constructor undefined behaviour. So C++ chose to keep dispatch consistent with state, and pays by making virtual dispatch from a constructor useless; Python and Java chose to keep dispatch consistent with type and accepted that a constructor can observe a half-built object. Both defensible, and knowing which rule you are under tells you whether this pattern is a latent bug or an impossibility.*

*As for why it is an anti-pattern: it is Effective Java Item 19, constructors must not invoke overridable methods, and it is one case of the broader partially constructed object hazard, along with publishing this from a constructor, registering a half-built object with a listener registry, and starting a thread from a constructor that touches the object. They all share the shape that something gains a reference to the object before the object is finished.*

*For fixes, in order of preference: do not call overridable methods from constructors; make the method final, or name-mangle it in Python, so nobody can override it; move the work into an explicit start or init that the caller invokes after construction, which is the usual answer when registration or threads are involved; use a factory that constructs fully and then calls; or best of all, pass the value as a constructor parameter instead of calling a method to obtain it, which removes the dependency rather than sequencing around it."*
