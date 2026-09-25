---
id: 12-coupling-and-cohesion
title: "Coupling and Cohesion: Designing for Maintainability"
description: "Learn the difference between coupling and cohesion, their spectrum levels, and why aiming for low coupling and high cohesion is critical."

sidebar_position: 12
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "How do you define coupling and cohesion? What are their highest and lowest forms, why is 'high cohesion, low coupling' the golden standard, and what is the Law of Demeter?"

### The Quick Answer

"**Cohesion** measures how focused and closely related the responsibilities are within a single class or module (the inside view). **Coupling** measures how strictly independent modules rely on each other (the outside view). The universal software engineering ideal is **High Cohesion and Low (Loose) Coupling**, ensuring changes are localized and do not cause ripple effects across the system."

---

### The Spectrum: From Best to Worst

Interviewers at top tech firms often ask candidates to rank the degrees of cohesion and coupling:

#### Degrees of Cohesion (Goal: Maximize)
1. **Functional Cohesion (Highest / Best):** All elements in the class work toward a single, well-defined task (e.g., `CryptoKeyGenerator`).
2. **Sequential / Communicational Cohesion:** Elements operate on the same input data or output from one step feeds directly into the next.
3. **Temporal Cohesion:** Elements are grouped merely because they execute at the same time (e.g., an `AppInitializer` initializing logs, database, and cache).
4. **Coincidental Cohesion (Lowest / Worst):** Elements have no meaningful relationship; the class is a generic "junk drawer" (e.g., `CommonUtils` containing string formatting, email validation, and tax math).

#### Degrees of Coupling (Goal: Minimize)
1. **Data / Message Coupling (Lowest / Best):** Modules interact strictly through simple parameters or clean interface contracts.
2. **Control Coupling:** One module passes flags (e.g., `boolean isSpecialCase`) to explicitly control the internal logic flow of another.
3. **Common Coupling:** Modules share and mutate the same shared global state or singleton cache.
4. **Content Coupling (Highest / Worst):** One module directly modifies or accesses the internal variables of another module, violating encapsulation entirely.

---

### The Practical Code Smell: The Law of Demeter

The **Law of Demeter (LoD)**, or the *Principle of Least Knowledge*, is the primary guideline for preventing tight coupling:

> *"Each unit should have only limited knowledge about other units: only units 'closely' related to the current unit."*

#### The "Train Wreck" Anti-Pattern:
```java
// Severe Tight Coupling (Violates Law of Demeter):
String zip = order.getCustomer().getProfile().getAddress().getZipCode();
```
* **Why it's bad:** If the `Address` structure changes, this code breaks. The caller knows intimate navigation paths four levels deep into another domain model.
* **The Fix:** Tell, Don't Ask. Delegate the query: `order.getDeliveryZipCode();`.

---

### The Restaurant Analogy

* **High Cohesion:** The kitchen has a dedicated Fry Cook, Grill Master, and Cashier. The Fry Cook focuses solely on frying food. If the fry recipe changes, only the Fry Cook cares.
* **Low Cohesion:** A single employee takes orders, runs to flip burgers, fixes the plumbing, and writes marketing flyers.
* **Loose Coupling:** The Cashier sends a printed ticket (standard interface) to the kitchen. The Cashier does not need to know what brand of spatula the Grill Master uses.
* **Tight Coupling:** The Cashier must physically hold the Grill Master's arm to flip a patty. Any change in the grill setup grinds the cash register to a halt.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how loose coupling and high cohesion are achieved via dependency injection across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. HIGH COHESION: Independent components dedicated to a single operational concern
interface PaymentGateway {
    void process(double amount);
}

class StripeGateway implements PaymentGateway {
    @Override
    public void process(double amount) {
        System.out.println("Processing $" + amount + " via Stripe.");
    }
}

// 2. LOOSE COUPLING: OrderService communicates via interface contract
class OrderService {
    private final PaymentGateway gateway; // Loosely coupled dependency

    public OrderService(PaymentGateway gateway) {
        this.gateway = gateway; // Injected
    }

    public void checkout(double total) {
        gateway.process(total); // High functional cohesion
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <memory>

// High Cohesion: Interface dedicated to payment operations
class PaymentGateway {
public:
    virtual ~PaymentGateway() = default;
    virtual void process(double amount) = 0;
};

class StripeGateway : public PaymentGateway {
public:
    void process(double amount) override {
        std::cout << "Processing $" << amount << " via Stripe." << std::endl;
    }
};

// Loose Coupling: OrderService depends only on the PaymentGateway contract
class OrderService {
private:
    std::shared_ptr<PaymentGateway> gateway;

public:
    OrderService(std::shared_ptr<PaymentGateway> gw) : gateway(gw) {}

    void checkout(double total) {
        gateway->process(total);
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from abc import ABC, abstractmethod

# High Cohesion: Focused payment abstraction
class PaymentGateway(ABC):
    @abstractmethod
    def process(self, amount: float) -> None:
        pass

class StripeGateway(PaymentGateway):
    def process(self, amount: float) -> None:
        print(f"Processing ${amount} via Stripe.")

# Loose Coupling: OrderService accepts any payment implementation
class OrderService:
    def __init__(self, gateway: PaymentGateway):
        self._gateway = gateway

    def checkout(self, total: float) -> None:
        self._gateway.process(total)
```

</TabItem>
</Tabs>
