---
id: 10-composition-vs-inheritance
title: "Composition vs. Inheritance"
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the fundamental difference between composition and inheritance? More importantly, why do we constantly hear that you should favor composition?"

"Inheritance represents an 'IS-A' relationship, where a child class inherits the structure and behavior of a parent class. Composition represents a 'HAS-A' relationship, where a class is built by combining smaller, independent objects. In modern software engineering, the golden rule is to 'favor composition over inheritance' because it promotes loose coupling, high flexibility, and easier testing."

### The Core Difference

| Feature | Inheritance (IS-A) | Composition (HAS-A) |
|---|---|---|
| **Relationship** | A `SavingsAccount` is a `BankAccount`. | A `User` has a `PaymentProfile`. |
| **Coupling** | **Tight Coupling:** The child is permanently bound to the parent's implementation. | **Loose Coupling:** Components are independent and can be swapped out easily. |
| **Flexibility** | **Static** (resolved at compile-time). You cannot change a child's parent at runtime. | **Dynamic** (resolved at runtime). You can inject different components on the fly. |
| **Code Reuse** | Reuses code by deriving it from a single base class. | Reuses code by calling methods on the contained objects. |

### The ELI5 Analogy: Building a Car
- **Inheritance (IS-A):** You want to build a `SportsCar`, so you inherit from the `Car` blueprint. You get everything a `Car` has. But later, you want to build a `Motorcycle`. You can't inherit from `Car` because a motorcycle is not a car (it has two wheels, not four). The blueprint becomes rigid and useless for your new need.
- **Composition (HAS-A):** Instead of inheriting a whole vehicle, you build separate, smaller components: an `Engine`, `Wheels`, and a `SteeringSystem`.
  - To build a `Car`, you assemble it with 1 `Engine`, 4 `Wheels`, and a `SteeringWheel`.
  - To build a `Motorcycle`, you assemble it with 1 `Engine`, 2 `Wheels`, and `Handlebars`. You reuse the `Engine` component perfectly without forcing the motorcycle to carry around the baggage of a four-door car chassis.

### Why Composition is Generally Preferred
### 1. It Avoids the "God Object" Anti-Pattern
If you rely on inheritance, your base classes tend to grow massive. If a `Transaction` class has 50 methods, and you create a `CryptoTransaction` that inherits from it, the crypto transaction carries around 50 methods - even if it only needs 5. With composition, the `CryptoTransaction` just holds a `WalletValidator` component and an `ExchangeRouter` component, keeping the codebase lean and modular.

### 2. Plug-and-Play Flexibility (Dependency Injection)
Composition allows you to change the behavior of an object at runtime. Imagine you have a `PaymentService`. If you use composition, you can pass it a standard `StripeProcessor` object in production, but during testing, you can swap that out and pass it a `MockProcessor` object. The `PaymentService` doesn't care; it just uses whatever processor it has. Inheritance does not allow this runtime swapping.

### 3. Escaping the Single Inheritance Trap
In languages like Java or single-inheritance environments, a class can only extend one parent. If your `User` class inherits from `DatabaseEntity`, it can no longer inherit from `AuthenticationSubject`. Composition solves this: your `User` class simply has a `DatabaseConnector` and has an `AuthToken`, sidestepping the limitation entirely.

### Summary
"I always start with composition. It keeps components decoupled and makes unit testing much easier because I can mock out the individual parts. I only use inheritance when two classes genuinely share a pure 'IS-A' relationship and a strict, shared identity is absolutely required by the domain logic."

---

### Crucial Nuance: The Fragile Base Class Problem

One of the most dangerous traps of deep inheritance trees—and a primary reason senior engineers avoid them—is the **Fragile Base Class Problem**. Because inheritance creates incredibly tight coupling, a seemingly innocent change to a base class (like optimizing how an internal `protected` method works) can completely break the behavior of downstream child classes that implicitly relied on the original implementation details. 

In a composition-based architecture, you interact with components via strict interfaces or public contracts. You don't care *how* the component does its job, only that it fulfills the contract. With inheritance, child classes are intimately tangled with the parent's internal state and execution flow, meaning a modification at the top of the hierarchy can send a shockwave of regressions down to the leaves.
