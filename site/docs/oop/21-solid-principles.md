---
id: solid-principles
title: "SOLID Principles"
sidebar_position: 21
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the SOLID principle? Just walk me through what each letter stands for and give me a one-liner for each.

"SOLID is an acronym for five design principles intended to make object-oriented designs more understandable, flexible, and maintainable. They are the standard guidelines for writing clean architecture and avoiding technical debt."

### The SOLID Principles

**S - Single Responsibility Principle (SRP)**
- **The One-Liner:** A class should have one, and only one, reason to change - meaning it should only have one job.
- **Interview Context:** If an `Invoice` class calculates the total cost, formats the bill as a PDF, and saves the data to the database, it violates SRP. Break it into three separate classes: `InvoiceCalculator`, `InvoicePrinter`, and `InvoiceRepository`.

**O - Open/Closed Principle (OCP)**
- **The One-Liner:** Software entities (classes, modules, functions) should be open for extension, but closed for modification.
- **Interview Context:** You should be able to add new functionality without touching existing, tested code. If you want to add a new `CryptoPayment` method, you shouldn't have to modify the core `PaymentProcessor` class; you should just create a new class that extends a base interface.

**L - Liskov Substitution Principle (LSP)**
- **The One-Liner:** Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.
- **Interview Context:** If a `Bird` parent class has a `fly()` method, and you create a `Penguin` subclass that throws an exception when `fly()` is called, you have violated LSP. The child must perfectly honor the contract of the parent.

**I - Interface Segregation Principle (ISP)**
- **The One-Liner:** Do not force a class to implement interfaces or methods it does not use.
- **Interview Context:** Instead of one massive `Worker` interface with `work()`, `eat()`, and `sleep()` methods, create smaller ones like `Workable` and `Eatable`. This way, a `RobotWorker` class isn't forced to implement an `eat()` method with blank or dummy code.

**D - Dependency Inversion Principle (DIP)**
- **The One-Liner:** High-level modules should not depend on low-level modules; both should depend on abstractions (interfaces).
- **Interview Context:** Your core business logic (high-level) shouldn't be hardcoded to a specific `MySQLDatabase` class (low-level). Instead, it should rely on a generic `DatabaseInterface`. This allows you to swap out MySQL for MongoDB later without touching your core business logic.

---

### Crucial Nuance: The "Ravioli Code" Trap

While SOLID is the gold standard for object-oriented design, dogmatically applying all five principles from day one is a common junior engineer mistake. Over-applying Interface Segregation and Dependency Inversion before a domain's bounds are fully understood leads to "Ravioli Code"—a system bloated with hundreds of single-method interfaces and tiny, fragmented classes that make the codebase impossible to navigate. 

Senior engineers advocate for *pragmatic* SOLID. You should build simple code first, and apply SOLID principles reactively as soon as you feel the "pain of change" (e.g., when a new feature requires modifying three existing files). As Sandi Metz famously says: "Duplication is far cheaper than the wrong abstraction."
