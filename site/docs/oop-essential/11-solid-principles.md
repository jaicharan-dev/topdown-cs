---
id: 11-solid-principles
title: "SOLID Principles: The Five Rules of Clean Architecture"
description: "A practical, easy-to-grasp walkthrough of all five SOLID principles essential for clean architecture."

sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import { SolidOverviewFigure } from '@site/src/components/Figures/SolidPrinciples';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Can you walk me through the SOLID principles with practical examples? How is LSP formally violated in the classic Rectangle vs. Square problem, and how do you distinguish DIP from DI and IoC?"

SOLID is five separate rules that all point at the same goal: code that's easy to change later without breaking something else. Each letter is its own idea - here's each one in plain terms, with a quick analogy and the code smell that tells you it's being broken.

<SolidOverviewFigure />

### S - Single Responsibility: one class, one job

**The idea:** a class should have one reason to change.

**The smell:** a "Swiss army knife" class. If your `Invoice` class calculates totals, formats PDFs, *and* saves rows to SQL, it has three unrelated reasons to change - and a change to one risks breaking the others.

**The fix:** split it along those reasons: `InvoiceCalculator`, `InvoicePdfGenerator`, `InvoiceRepository`. Each one only cares about its own job.

*Analogy:* a chef who only cooks shouldn't also be the one doing the restaurant's accounting.

### O - Open/Closed: add new behavior without editing old code

**The idea:** you should be able to extend what a system does without touching its existing, tested code.

**The smell:** every time a new case shows up, someone adds another `if/else` branch inside an existing class.

**The fix:** program to an interface. Adding a `CryptoPayment` option means writing a new class that implements `PaymentGateway` - not editing `PaymentProcessor`'s internals.

*Analogy:* a power strip lets you plug in a new device without rewiring the wall.

### L - Liskov Substitution: a subclass must not break the parent's promises

**The idea:** if `S` is a subtype of `T`, you should be able to swap any `T` for an `S` and nothing should break.

**The classic trap - Rectangle and Square:** mathematically, a square is a rectangle. But model it as `Square extends Rectangle` and you're in trouble. A `Rectangle` lets you set width and height independently - set width to 5, height to 10, and the area is 50. A `Square` can't allow that: setting width to 5 must force height to 5 too, or it stops being a square. So code that expects a `Rectangle`, sets width to 5 and height to 10, and expects an area of 50 - silently gets 100 instead when handed a `Square`. The subtype broke the parent's contract.

**The rule, more precisely:**
1. A subtype can't demand stricter inputs than its parent (no strengthening preconditions).
2. A subtype can't promise less than its parent did (no weakening postconditions).
3. Whatever invariants the parent guaranteed must still hold.

*Analogy:* if a toy claims to work with any AA battery, swapping in a brand-name AA battery shouldn't suddenly make it stop working.

### I - Interface Segregation: don't force classes to implement methods they don't need

**The idea:** clients shouldn't be forced to depend on methods they never use.

**The smell:** a fat interface like `Worker { work(); eat(); sleep(); }`. Now write a `RobotWorker` - it has to implement `eat()` and `sleep()` with empty, meaningless bodies just to compile.

**The fix:** split it into smaller, role-specific interfaces - `Workable`, `Feedable` - and only implement the ones that actually apply.

*Analogy:* a job application shouldn't ask every candidate to also prove they can swim, just because some roles need it.

### D - Dependency Inversion: depend on the interface, not the implementation

**The idea:** high-level business logic shouldn't depend directly on low-level details like database drivers or network clients. Both should depend on an abstraction (an interface) sitting between them.

*Analogy:* a wall socket is the abstraction. Your lamp doesn't care whether the power behind it comes from solar, a generator, or the grid - it just plugs into the same socket.

---

### The interview trap: DIP vs. DI vs. IoC

These three get mixed up constantly. They're related, but they're not the same thing:

| Term | What it is | What it does |
|---|---|---|
| **DIP** (principle) | A design rule | Says depend on interfaces, not concrete classes |
| **DI** (pattern) | A technique | Satisfies DIP by handing a class its dependencies (usually via constructor) instead of letting it create them itself |
| **IoC** (paradigm) | A way of structuring control flow | Flips who calls whom - normally your code calls a library; under IoC (like Spring or React), the framework calls your code |

### Don't over-apply this on day one

Using all five principles aggressively before you understand the problem produces what people call "ravioli code" - hundreds of tiny, over-abstracted files where you can no longer see the actual business logic for all the wrapping.

Sandi Metz's rule is the right instinct: *duplication is cheaper than the wrong abstraction.* Write the straightforward version first. Introduce an abstraction when the pain of not having one actually shows up - not before.

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
