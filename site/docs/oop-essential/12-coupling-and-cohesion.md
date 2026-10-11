---
id: 12-coupling-and-cohesion
title: "Coupling and Cohesion: Designing for Maintainability"
description: "Learn the difference between coupling and cohesion, their spectrum levels, and why aiming for low coupling and high cohesion is critical."

sidebar_position: 12
sidebar_class_name: sidebar-easy
---

import { SpectrumsFigure, TrainWreckFigure } from '@site/src/components/Figures/CouplingCohesion';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "How do you define coupling and cohesion? What are their highest and lowest forms, why is 'high cohesion, low coupling' the golden standard, and what is the Law of Demeter?"

Think of a restaurant kitchen. A dedicated fry cook, grill master, and cashier each do one job well - that's **high cohesion**: everything inside a role is focused and related. The cashier hands the kitchen a printed ticket instead of grabbing the grill master's arm to flip a patty - that's **low (loose) coupling**: the two sides only interact through a simple, stable interface.

### The quick answer

**Cohesion** is about the inside of a class: how focused and related its responsibilities are. **Coupling** is about the outside: how much one module depends on another's internals. The goal everyone aims for is **high cohesion, low coupling** - classes that each do one clear thing, and talk to each other through narrow, stable contracts. That way a change in one place doesn't ripple everywhere.

### The spectrum of cohesion - best to worst

1. **Functional (best):** everything in the class works toward one clear task - e.g., a `CryptoKeyGenerator` that only generates keys.
2. **Sequential / communicational:** steps operate on the same data, each one's output feeding the next.
3. **Temporal:** things are grouped only because they happen to run at the same time - e.g., an `AppInitializer` that sets up logging, the database, and the cache, just because they all happen at startup.
4. **Coincidental (worst):** no real relationship at all - a "junk drawer" class like `CommonUtils` holding string formatting, email validation, and tax math, with nothing connecting them except that nobody knew where else to put them.

<SpectrumsFigure />

### The spectrum of coupling - best to worst

1. **Data / message (best):** modules talk only through simple parameters or a clean interface.
2. **Control:** one module passes a flag (`isSpecialCase`) that tells another module how to behave internally - which means the caller has to know about the callee's internal logic.
3. **Common:** modules share and mutate the same global state or singleton - change it in one place, and who knows what else breaks.
4. **Content (worst):** one module reaches in and directly pokes another module's internal variables, ignoring encapsulation entirely.

### The practical smell: the Law of Demeter

The Law of Demeter - also called the Principle of Least Knowledge - is the simplest rule for avoiding tight coupling: *talk only to your immediate neighbors, not to their neighbors' neighbors.*

The classic violation is the "train wreck":

```java
// Train wreck - reaches four levels deep into another object's structure
String zip = order.getCustomer().getProfile().getAddress().getZipCode();
```

This is fragile because the caller now knows the entire internal shape of `Customer`, `Profile`, and `Address`. If any one of those changes, this line breaks. The fix is "tell, don't ask" - let the object answer the real question directly:

```java
String zip = order.getDeliveryZipCode();
```

<TrainWreckFigure />

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
