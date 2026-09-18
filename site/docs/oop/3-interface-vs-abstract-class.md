---
id: 3-interface-vs-abstract-class
title: "Interfaces vs. Abstract Classes"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the actual difference between an abstract class and an interface? More importantly, talk me through your decision process for choosing one over the other in a real system."

"An abstract class represents an 'is-a' relationship and is used to share core identity and state among closely related classes. An interface represents a 'can-do' contract and is used to guarantee that a class possesses a specific capability, regardless of what the class actually is."

### The Technical Breakdown

| Feature | Abstract Class | Interface |
|---|---|---|
| **State & Variables** | Can hold state (instance variables) and constructors. | Cannot hold state. Can only have constants (`public static final`). |
| **Methods** | Can have both abstract (unimplemented) and concrete (implemented) methods. | Traditionally only abstract methods. (Note: Java 8+ allows default and static implemented methods, but still no state). |
| **Inheritance** | A class can extend only one abstract class (Single Inheritance). | A class can implement multiple interfaces (Multiple Inheritance of Type). |
| **Access Modifiers** | Methods can be public, protected, or private. | Methods are implicitly public. |

### The ELI5 Analogy
- **Abstract Class (DNA & Lineage):** Think of an abstract class as a "Mammal". A Dog is a Mammal. A Whale is a Mammal. Because they share this strict lineage, the Mammal abstract class can provide them with shared internal state (like a heartbeat or warm blood) and shared concrete behaviors (like breathing). But you can't instantiate a generic "Mammal" - it has to be a specific type.
- **Interface (A License or Certification):** Think of an interface as a "Swimmer" certification. A Whale can get the Swimmer certification. A Human can get it. Even a robotic submarine can get it. They share zero lineage or internal state, but they all sign a contract promising they know how to execute a `swim()` method.

### When to Choose Which
#### 1. Choose an Abstract Class when...
You have closely related objects that need to share common code, fields, and a core identity.
*Example:* You are building a banking backend. You create an abstract class `BankAccount`.
- It holds the balance variable and a constructor.
- It has a concrete method `checkBalance()`.
- It has an abstract method `calculateMonthlyInterest()`. Your `SavingsAccount` and `CorporateAccount` classes both extend `BankAccount`. They inherit the balance state automatically but implement the interest calculations in their own specific ways.

#### 2. Choose an Interface when...
You need to define a strict contract of behavior across completely unrelated classes, or when you need a class to inherit multiple behaviors.
*Example:* In that same banking app, you need to generate tax reports. You create a `TaxExportable` interface with a single method: `generateTaxXML()`.
- A `BankAccount` can implement `TaxExportable`.
- An `EmployeePayroll` class can implement `TaxExportable`.
- A `RealEstateAsset` class can implement `TaxExportable`.

These three classes have absolutely nothing to do with each other structurally. They do not belong in the same hierarchy. But by implementing the interface, they guarantee to the rest of the system that they have the capability to export tax data.

