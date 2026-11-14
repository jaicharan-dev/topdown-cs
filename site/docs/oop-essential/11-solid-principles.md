---
id: 11-solid-principles
title: "SOLID Principles: The Five Rules of Clean Architecture"
description: "Five habits that keep classes small and swappable, and the square that is not a rectangle"

sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Can you walk me through the SOLID principles with practical examples? How is LSP formally violated in the classic Rectangle vs. Square problem, and how do you distinguish DIP from DI and IoC?"

---

### Picture it

Think of running a restaurant kitchen.

**One job per station.** The person on the grill grills. If they also take bookings and do the accounts, then a change to the booking system drags the grill cook away from the grill. Give each station one reason to be interrupted.

**Add dishes without rewriting the kitchen.** A new dish should mean a new recipe card, not reopening and editing every existing card. Extend by adding, not by cutting into what already works.

**A substitute must actually be able to do the job.** If you hire a cover for the grill, they must handle everything the regular grill cook handles. A cover who panics at half the orders is worse than no cover, because the rota promised they would cope.

**Do not hand someone a job sheet full of tasks they never do.** The dishwasher's sheet should not list wine pairing. Small, focused sheets beat one enormous one.

**Depend on the role, not the person.** The rota says "a grill cook", not "Marco". Then Marco can be ill and the kitchen still runs.

Those five are SOLID, in order.

---

### The proper terms

#### S: Single Responsibility Principle

The **Single Responsibility Principle** says a class should have **one reason to change**. The emphasis is on reasons, not on counting methods: a class is doing too much when two unrelated forces, say a report's format and the database it reads from, can each force an edit.

#### O: Open/Closed Principle

The **Open/Closed Principle** says software should be **open for extension, closed for modification**. New behaviour should arrive as new code rather than as edits to tested code. In practice this means a growing `if`/`else` or `switch` over types is a signal to introduce **polymorphism**, so a new case becomes a new class.

#### L: Liskov Substitution Principle

The **Liskov Substitution Principle** says a subtype must be usable anywhere its supertype is expected, without the caller noticing. It constrains behaviour, not just signatures, which is why the compiler cannot check it for you.

The classic violation is **Rectangle and Square**. A square is a rectangle in mathematics, so inheritance looks right. But `Rectangle` offers `setWidth` and `setHeight` independently, while a square must keep them equal, so `Square` has to make each setter change both. Now this test, written against `Rectangle`, passes for rectangles and fails for squares:

```text
r.setWidth(5); r.setHeight(4); assert r.area() == 20;
```

With a `Square` the area is 16. The subtype strengthened a **precondition** and broke an invariant the caller relied on, which is exactly what the principle forbids. The formal conditions are that a subtype may weaken preconditions but not strengthen them, may strengthen postconditions but not weaken them, and must preserve the supertype's invariants.

The lesson is that IS-A in language is not IS-A in behaviour. Here the fix is to drop the inheritance, since mutable squares and mutable rectangles are not substitutable.

#### I: Interface Segregation Principle

The **Interface Segregation Principle** says no client should be forced to depend on methods it does not use. A fat interface forces implementations to supply stubs or throw `UnsupportedOperationException`, which is a sign it should be split into several focused **role interfaces**.

#### D: Dependency Inversion Principle

The **Dependency Inversion Principle** says high-level modules should not depend on low-level modules, and both should depend on **abstractions**. It also says abstractions should not depend on details; details should depend on abstractions.

Concretely, an order service should depend on a `PaymentGateway` interface rather than on `StripeClient`. The word "inversion" refers to the direction of the dependency arrow: without it, policy points at detail; with it, both point at the interface, which is usually owned by the policy side.

#### DIP, DI and IoC

These three get used interchangeably and are not the same.

**Dependency Inversion** is the **principle**: depend on abstractions.

**Dependency Injection** is a **technique**: an object receives its collaborators from outside instead of constructing them. It is one way to achieve the principle.

**Inversion of Control** is the broad **pattern** where a framework drives your code rather than your code driving the library, sometimes called the Hollywood principle, "don't call us, we'll call you". Dependency injection is one specific form of it.

So: a principle, a technique that serves it, and the wider pattern that technique belongs to.

---

### In code

```java
// Violates OCP: every new type means editing this method
double priceBad(String type, double base) {
    if (type.equals("standard")) return base;
    else if (type.equals("member")) return base * 0.9;
    else if (type.equals("staff")) return base * 0.7;   // and again, and again
    return base;
}

// Follows OCP: a new discount is a new class, this code never changes
interface Discount { double apply(double base); }

class Standard implements Discount { public double apply(double b) { return b; } }
class Member   implements Discount { public double apply(double b) { return b * 0.9; } }

// Follows DIP: depends on the abstraction, not on a concrete gateway
interface PaymentGateway { void charge(double amount); }

class OrderService {
    private final PaymentGateway gateway;        // the role, not the person

    OrderService(PaymentGateway gateway) {       // dependency injection
        this.gateway = gateway;
    }

    void checkout(double total, Discount discount) {
        gateway.charge(discount.apply(total));
    }
}
```

`OrderService` shows the last two together: it depends on an abstraction, which is the principle, and receives it through its constructor, which is the technique.

---

### What they ask next

**"Doesn't Single Responsibility just mean small classes?"**
No. It means one reason to change. A large class serving one coherent purpose can satisfy it, while a three-method class mixing formatting with persistence does not.

**"How would you fix Rectangle and Square?"**
Remove the inheritance. Either make both immutable, so there are no setters to contradict, or let them implement a common `Shape` interface exposing `area()` without mutable width and height.

**"Can you give an Interface Segregation violation from the standard library?"**
`java.util.List` is often cited. An immutable list must implement `add` and `remove` and throw `UnsupportedOperationException`, because the interface assumes mutability that not every implementation has.

**"Is Dependency Injection the same as a DI framework?"**
No. Passing a collaborator into a constructor by hand is dependency injection. Spring and Guice automate it, but the technique exists without them.

**The common wrong answer** is reciting five names with no example. Interviewers almost always follow up on L and D, so have the rectangle case and the DIP/DI/IoC distinction ready.

---

### Say this in the interview

*"The Single Responsibility Principle says a class should have one reason to change. The Open/Closed Principle says code should be open for extension, closed for modification, usually by replacing a type switch with polymorphism. The Liskov Substitution Principle says a subtype must be usable wherever its supertype is expected. The Interface Segregation Principle says clients should not depend on methods they do not use, so fat interfaces become role interfaces. The Dependency Inversion Principle says high-level and low-level modules should both depend on abstractions.*

*The classic Liskov violation is Rectangle and Square. Rectangle lets width and height be set independently, so Square must make each setter change both, and a test that sets width to 5 and height to 4 and expects an area of 20 gets 16. The subtype strengthened a precondition and broke an invariant the caller relied on. Formally a subtype may weaken preconditions but not strengthen them, may strengthen postconditions but not weaken them, and must preserve invariants.*

*Dependency Inversion is the principle, depend on abstractions. Dependency Injection is a technique for achieving it, supplying collaborators from outside. Inversion of Control is the broader pattern where a framework calls your code rather than the reverse, and dependency injection is one form of it."*
