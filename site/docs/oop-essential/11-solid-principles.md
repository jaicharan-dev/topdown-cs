---
id: 11-solid-principles
title: "SOLID Principles: The Five Rules of Clean Architecture"
description: "A practical, easy-to-grasp walkthrough of all five SOLID principles essential for clean architecture."

sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Can you walk me through the SOLID principles with practical examples? How is LSP formally violated in the classic Rectangle vs. Square problem, and how do you distinguish DIP from DI and IoC?"

### The Quick Summary

"SOLID is an acronym for five foundational design principles that guide maintainable, loosely coupled, and testable object-oriented software:
* **S (SRP):** A class should have one reason to change.
* **O (OCP):** Open for extension, closed for modification.
* **L (LSP):** Subtypes must be substitutable for their base types.
* **I (ISP):** Prefer small, role-specific interfaces over fat ones.
* **D (DIP):** Depend on abstractions, not concrete implementations."

---

### The Five Principles Explained

#### 1. S — Single Responsibility Principle (SRP)
* **Definition:** A class should have one, and only one, reason to change (meaning it is responsible to only one actor or business concern).
* **Code Smell:** A "Swiss Army Knife" class. If an `Invoice` class calculates totals, formats PDFs, and saves records to SQL, it has three separate reasons to change.
* **The Fix:** Split it into three cohesive classes: `InvoiceCalculator`, `InvoicePdfGenerator`, and `InvoiceRepository`.

#### 2. O — Open/Closed Principle (OCP)
* **Definition:** Software entities should be open for extension, but closed for modification. You should be able to introduce new behavior without altering existing, tested source code.
* **The Fix:** Program to interfaces. When adding a new `CryptoPayment` gateway, create a class implementing `PaymentGateway` rather than adding another `if/else` block inside your existing `PaymentProcessor`.

#### 3. L — Liskov Substitution Principle (LSP)
* **Definition:** If $S$ is a subtype of $T$, objects of type $T$ may be replaced with objects of type $S$ without altering any desirable properties of the program (correctness, task performed, etc.).
* **The Classic Rectangle vs. Square Violation:**
  * In geometry, a square is a rectangle. But in OOP, modeling `class Square extends Rectangle` violates LSP!
  * A `Rectangle` allows independent resizing: setting width to 5 and height to 10 yields an area of 50.
  * In `Square`, setting width to 5 must force height to 5 to remain square. If client code expecting a `Rectangle` sets width to 5 and height to 10, the area unexpectedly becomes 100 instead of 50.
* **LSP Subtyping Rules:**
  1. **Preconditions cannot be strengthened** in a subtype (cannot demand stricter inputs).
  2. **Postconditions cannot be weakened** (cannot guarantee less output).
  3. **Invariants must be preserved.**

#### 4. I — Interface Segregation Principle (ISP)
* **Definition:** Clients should not be forced to depend on methods they do not use.
* **Code Smell:** A "fat interface" like `Worker { void work(); void eat(); void sleep(); }`. When implementing a `RobotWorker`, the developer is forced to supply empty dummy implementations for `eat()` and `sleep()`.
* **The Fix:** Break the fat interface into smaller role interfaces: `Workable`, `Feedable`.

#### 5. D — Dependency Inversion Principle (DIP)
* **Definition:** High-level modules (business rules) should not depend on low-level modules (database drivers, network clients). Both should depend on abstractions (interfaces). Furthermore, abstractions should not depend on details; details should depend on abstractions.

---

### The Interview Distinction: DIP vs. DI vs. IoC

Candidates frequently conflate these three related terms:

| Term | What It Is | Role |
|---|---|---|
| **DIP (Principle)** | High-level architectural rule | States *what* the system structure should be: depend on interfaces, not concrete classes. |
| **DI (Pattern)** | Design pattern / technique | A mechanism to satisfy DIP: passing dependencies into an object (via constructor) rather than letting the object instantiate them. |
| **IoC (Paradigm)** | Architectural framework concept | Inverts the control flow of a program. In a standard program, your code calls the library. In IoC (like Spring or React), the framework calls your code. |

---

### Crucial Nuance: Pragmatic SOLID vs. "Ravioli Code"

Dogmatically applying all five principles on Day 1 is an antipattern. Over-abstracting every variable into single-method interfaces before requirements stabilize produces "Ravioli Code"—hundreds of tiny, fragmented files that obscure business logic.

Senior engineers follow Sandi Metz’s rule: *"Duplication is far cheaper than the wrong abstraction."* Build the straightforward implementation first, and introduce abstractions reactively when you encounter the "pain of change."

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how the Open/Closed Principle (OCP) and Dependency Inversion Principle (DIP) work together across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. ABSTRACTION (DIP): High-level logic depends on this contract
interface NotificationSender {
    void send(String message);
}

// 2. CONCRETION (OCP): New channels can be added without modifying existing code
class EmailSender implements NotificationSender {
    @Override
    public void send(String message) {
        System.out.println("Email: " + message);
    }
}

class SmsSender implements NotificationSender {
    @Override
    public void send(String message) {
        System.out.println("SMS: " + message);
    }
}

// 3. HIGH-LEVEL MODULE: Injected with abstraction (Dependency Injection)
class AlertService {
    private final NotificationSender sender;

    public AlertService(NotificationSender sender) {
        this.sender = sender;
    }

    public void triggerAlert(String text) {
        sender.send(text);
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <memory>
#include <string>

// 1. ABSTRACTION (DIP)
class NotificationSender {
public:
    virtual ~NotificationSender() = default;
    virtual void send(const std::string& message) = 0;
};

// 2. CONCRETION (OCP)
class EmailSender : public NotificationSender {
public:
    void send(const std::string& message) override {
        std::cout << "Email: " << message << std::endl;
    }
};

// 3. HIGH-LEVEL MODULE
class AlertService {
private:
    std::shared_ptr<NotificationSender> sender;

public:
    AlertService(std::shared_ptr<NotificationSender> s) : sender(s) {}

    void triggerAlert(const std::string& text) {
        sender->send(text);
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from abc import ABC, abstractmethod

# 1. ABSTRACTION (DIP)
class NotificationSender(ABC):
    @abstractmethod
    def send(self, message: str) -> None:
        pass

# 2. CONCRETION (OCP)
class EmailSender(NotificationSender):
    def send(self, message: str) -> None:
        print(f"Email: {message}")

# 3. HIGH-LEVEL MODULE
class AlertService:
    def __init__(self, sender: NotificationSender):
        self._sender = sender

    def trigger_alert(self, text: str) -> None:
        self._sender.send(text)
```

</TabItem>
</Tabs>
