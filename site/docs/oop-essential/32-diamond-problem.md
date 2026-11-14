---
id: 32-diamond-problem
title: "The Diamond Problem: Multiple Inheritance in Java"
description: "Inheriting one thing from two parents, and why state is the part Java refuses"

sidebar_position: 20
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Why does Java strictly forbid multiple inheritance for classes while permitting it for interfaces? Walk me through the Diamond Problem of state vs behavior, and explain how C++ and Python resolve it."

---

### Picture it

Imagine a person with two parents who each inherited the same family recipe from the same grandparent, and each adjusted it.

**Ask them to cook it and there is a question.** Whose version do they make, their mother's or their father's? Someone has to decide, and any answer is arbitrary. That is annoying but solvable: pick a rule, write it down.

**Ask what is in their cupboard and the question is worse.** The grandparent's pantry was passed down. Did they inherit **one** pantry, shared through both parents, or **two** separate pantries, one down each line? If two, which one do they reach into when the recipe says "take the flour"? Adding flour to one leaves the other short, and now the same object holds two different truths about itself.

The first question is about **behaviour** and has a tolerable answer. The second is about **state** and does not. Java's whole design on this point is to allow the first and forbid the second.

---

### The proper terms

#### The diamond problem

The **diamond problem** arises when a class inherits from two classes that both inherit from a common ancestor, forming a diamond shape. The ancestor's members arrive by two routes, raising the question of which is inherited and whether duplicated state exists.

It splits in two. **Multiple inheritance of behaviour** is ambiguity over which method implementation to use, and a language can resolve it with precedence rules. **Multiple inheritance of state** is ambiguity over how many copies of a field exist, which has no satisfactory default.

#### What Java does

A class **extends** exactly one superclass, so classes cannot form a diamond and the state question never arises.

A class implements any number of interfaces. Before Java 8 this was entirely safe, since interfaces held no implementations and no state. Any clash was only between identical abstract signatures, satisfied by one method.

Java 8's **default methods** reintroduced multiple inheritance of behaviour, so the resolution rules became necessary. **A class always wins** over any interface default. **The more specific interface wins** when one extends the other. **Otherwise it is a compile error**, and the class must override the method explicitly, optionally delegating with `Interface.super.method()`.

Crucially, interface fields remain implicitly `public static final` **constants**. No instance state can be inherited through an interface, so Java permits multiple inheritance of type and behaviour while still forbidding it for **state**.

#### How C++ resolves it

C++ permits full multiple inheritance and hands the decision to the programmer.

By default, inheriting from two classes with a common base gives **two separate copies** of the base's members, and referring to an inherited member ambiguously is a compile error that must be disambiguated with the scope resolution operator, as in `Parent::field`.

**Virtual inheritance**, declared with `class B : virtual public A`, makes all paths share a **single** copy of the base. The cost is runtime indirection, since objects need a pointer to locate the shared part, and the most derived class becomes responsible for constructing the virtual base.

So C++ offers both answers and makes you choose.

#### How Python resolves it

Python permits multiple inheritance and resolves it with a deterministic order rather than duplication.

The **Method Resolution Order**, or MRO, is computed by the **C3 linearisation** algorithm, producing a single ordered list of classes that is searched left to right. It guarantees that a class precedes its parents, that the order of parents in the declaration is preserved, and that the result is consistent across the hierarchy. If no consistent order exists, the class definition fails immediately with a `TypeError`.

`super()` follows the MRO rather than jumping straight to a named parent, which is what makes cooperative multiple inheritance work. The order is inspectable through `ClassName.__mro__`.

For state, Python stores attributes per instance in `__dict__`, so there is only ever one object's worth of attributes. The duplicate-state question simply does not arise, though attribute names from different parents can still silently collide.

---

### In code

```java
interface Engine {
    default String start() { return "engine starting"; }
}

interface Motor {
    default String start() { return "motor starting"; }
}

// Two unrelated defaults: will not compile without an override
class Hybrid implements Engine, Motor {
    @Override
    public String start() {
        return Engine.super.start();          // choose a parent explicitly
    }
}

interface Electric extends Motor {
    @Override
    default String start() { return "electric starting"; }
}

// No error here: Electric is more specific than Motor, so it wins
class Scooter implements Motor, Electric { }
```

```python
# Python: the same shape, resolved by MRO rather than refused
class Vehicle:
    def start(self): return "vehicle"

class Engine(Vehicle):
    def start(self): return "engine"

class Motor(Vehicle):
    def start(self): return "motor"

class Hybrid(Engine, Motor):
    pass

print(Hybrid().start())          # "engine": first match along the MRO
print([c.__name__ for c in Hybrid.__mro__])
# ['Hybrid', 'Engine', 'Motor', 'Vehicle', 'object']
```

The contrast is the point. Java refuses to guess and makes you write the override. Python guesses, but by a published rule you can inspect.

---

### What they ask next

**"Why is state the hard part, when behaviour is ambiguous too?"**
Because behaviour can be resolved by a precedence rule and the result is still coherent. Duplicate state makes the object internally inconsistent: updating one copy leaves the other stale, and no rule fixes that.

**"Did default methods bring the diamond problem into Java?"**
For behaviour, yes, which is exactly why the three resolution rules were introduced in Java 8. For state, no, because interface fields are still constants.

**"What is the cost of virtual inheritance in C++?"**
Extra indirection to locate the shared base, slightly larger objects, and a shift in construction responsibility to the most derived class, which makes constructors harder to reason about.

**"Can C3 linearisation fail?"**
Yes. If the inheritance declarations impose contradictory orderings, no consistent linearisation exists and Python raises a `TypeError` at class creation rather than at call time.

**"Is `Interface.super.method()` the same as `super.method()`?"**
No. Plain `super` refers to the superclass. The qualified form names which interface default you mean, and is only valid for a direct superinterface.

**The common wrong answer** is "Java forbids multiple inheritance". It forbids multiple inheritance of **state** while allowing it for type and, since Java 8, behaviour.

---

### Say this in the interview

*"The diamond problem happens when a class inherits from two classes sharing a common ancestor, so the ancestor's members arrive by two routes. It splits into multiple inheritance of behaviour, which is ambiguity about which implementation runs and can be settled by precedence rules, and multiple inheritance of state, which is ambiguity about how many copies of a field exist and has no good answer, since updating one copy leaves the other stale.*

*Java allows a class to extend one superclass, so classes cannot form a diamond. It allows any number of interfaces, and since interface fields are implicitly public static final constants, no instance state is ever inherited. Java 8's default methods reintroduced behaviour inheritance, resolved by three rules: a class always wins over an interface default, the more specific interface wins when one extends the other, and otherwise it is a compile error the class must resolve by overriding, optionally delegating with Interface.super.method().*

*C++ allows full multiple inheritance. By default you get two separate copies of the shared base and must disambiguate with the scope resolution operator. Virtual inheritance makes all paths share one copy, at the cost of indirection and construction by the most derived class.*

*Python allows it too and resolves method lookup with the Method Resolution Order, computed by C3 linearisation, which produces a single consistent search order that super() follows. State is not an issue because attributes live in the instance dictionary."*
