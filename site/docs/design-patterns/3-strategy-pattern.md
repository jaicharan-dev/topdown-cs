---
id: 3-strategy-pattern
title: "Strategy Pattern: Dynamic Algorithm Selection & Functional Alternatives"
description: "Master the Strategy pattern in Python: fintech payment routing, dynamic runtime swapping, functional callables, and comparisons with State and Template Method."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Strategy pattern, why would you use it, and how does it uphold the Open/Closed and Dependency Inversion principles? Demonstrate a production payment gateway with runtime algorithm swapping in Python, and contrast Strategy with the State and Template Method patterns."

---

### 1. Executive Summary & Core Intent

The **Strategy Pattern** is a behavioral design pattern that defines a family of algorithms, encapsulates each algorithm into an independent class, and makes their objects interchangeable at runtime.

It decouples the algorithmic execution from the context class using it, eliminating massive, error-prone `if-elif-else` control flow ladders.

```
       ┌────────────────────────┐
       │   PaymentGateway       │  (Context)
       ├────────────────────────┤
       │ - strategy: Strategy   │───┐
       │ + execute_payment()    │   │ (Delegates via composition)
       │ + set_strategy()       │   │
       └────────────────────────┘   │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │               PaymentStrategy (Interface)              │
       ├────────────────────────────────────────────────────────┤
       │ + pay(amount: float) -> PaymentResult                  │
       └────────────────────────────▲───────────────────────────┘
                                    │ (Polymorphic Implementations)
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
┌────────────────────────┐┌────────────────────────┐┌────────────────────────┐
│      UPIStrategy       ││   CreditCardStrategy   ││     CryptoStrategy     │
├────────────────────────┤├────────────────────────┤├────────────────────────┤
│ + pay(amount)          ││ + pay(amount)          ││ + pay(amount)          │
└────────────────────────┘└────────────────────────┘└────────────────────────┘
```

---

### 2. The Anti-Pattern: Procedural Conditional Explosion

Without the Strategy pattern, payment gateways inevitably devolve into rigid code smell:

```python
class NaiveCheckout:
    def process(self, method: str, amount: float):
        if method == "UPI":
            # 50 lines of NPCI / VPA validation and QR routing
            pass
        elif method == "CREDIT_CARD":
            # 80 lines of PCI-DSS encryption, CVV checks, 3D Secure
            pass
        elif method == "CRYPTO":
            # 40 lines of blockchain gas estimation and wallet signature
            pass
        # VIOLATIONS:
        # 1. Open/Closed Principle: Adding ApplePay requires modifying this method.
        # 2. Single Responsibility: One class manages checkout, card encryption, and crypto.
```

---

### 3. Production OOP Implementation: Fintech Payment Router

Here is how payment aggregators (like Stripe or Razorpay) architect multi-rail payment routing with runtime fallback capabilities:

```python
from abc import ABC, abstractmethod
from typing import Dict, Any


# 1. Strategy Interface (Contract)
class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> Dict[str, Any]:
        """Executes the payment transaction and returns transaction metadata."""
        pass


# 2. Concrete Strategy: UPI (Unified Payments Interface)
class UPIPayment(PaymentStrategy):
    def __init__(self, vpa_address: str):
        self.vpa = vpa_address

    def pay(self, amount: float) -> Dict[str, Any]:
        # Validate VPA and simulate NPCI switch
        return {
            "status": "SUCCESS",
            "provider": "NPCI_UPI",
            "amount": amount,
            "vpa": self.vpa,
            "tx_id": f"UPI_TX_{abs(hash(self.vpa)) % 100000}"
        }


# 2. Concrete Strategy: Credit Card (PCI-DSS Compliant)
class CreditCardPayment(PaymentStrategy):
    def __init__(self, card_number: str, cvv: str):
        self.masked_card = f"****-****-****-{card_number[-4:]}"
        self.cvv = cvv

    def pay(self, amount: float) -> Dict[str, Any]:
        # Encrypt CVV and route to Visa/Mastercard gateway
        return {
            "status": "SUCCESS",
            "provider": "CARD_NETWORK",
            "amount": amount,
            "card": self.masked_card,
            "tx_id": f"CC_TX_{abs(hash(self.masked_card)) % 100000}"
        }


# 3. Context Class
class PaymentGateway:
    def __init__(self, initial_strategy: PaymentStrategy):
        self._strategy = initial_strategy

    def set_strategy(self, new_strategy: PaymentStrategy) -> None:
        """Enables dynamic runtime swapping (e.g. UPI fails -> switch to Card)."""
        self._strategy = new_strategy

    def checkout(self, amount: float) -> Dict[str, Any]:
        # Context handles audit logging, metrics, and delegating payment
        print(f"Routing transaction of Rs. {amount:.2f}...")
        result = self._strategy.pay(amount)
        print(f"Transaction completed via {result['provider']}. ID: {result['tx_id']}")
        return result
```

---

### 4. The Pythonic Nuance: First-Class Callable Strategies

In languages like Java or C++, you must instantiate class hierarchies to implement the Strategy pattern. 

In Python, **functions are first-class citizens**. For stateless algorithms (such as discount calculations, pricing engines, or sorting algorithms), defining full classes with one method is unnecessary OOP boilerplate. You can pass plain `Callable` functions directly:

```python
from typing import Callable

# Strategy as a function type
DiscountStrategy = Callable[[float], float]

def regular_discount(price: float) -> float:
    return price * 0.05  # 5% off

def black_friday_discount(price: float) -> float:
    return price * 0.30  # 30% off

def vip_club_discount(price: float) -> float:
    return price * 0.50 if price > 1000 else price * 0.20

class Order:
    def __init__(self, base_price: float, discount_strategy: DiscountStrategy = regular_discount):
        self.base_price = base_price
        self.discount_strategy = discount_strategy

    def final_price(self) -> float:
        discount = self.discount_strategy(self.base_price)
        return self.base_price - discount
```

- **Staff-Level Interview Point:** *"In Python, if the strategy holds no internal state, passing a callable function or lambda satisfies the Strategy Pattern with zero class overhead."*

---

### 5. Architectural Comparisons: Strategy vs. State vs. Template Method

Interviewers frequently probe whether you can distinguish Strategy from other behavioral patterns that share similar class structures:

#### 1. Strategy vs. State Pattern:
- **Structure:** Both use a Context delegating to an interface with multiple polymorphic implementations.
- **Key Difference in Intent:**
  - In **Strategy**, the *client* (or configuration) chooses which algorithm to use. Strategies are independent and unaware of each other.
  - In **State**, the *Context itself* automatically transitions between states based on internal events (e.g., an `Order` object moving from `Pending` -> `Paid` -> `Shipped`). Concrete states frequently know about each other to trigger transitions.

#### 2. Strategy vs. Template Method Pattern:
- **Strategy** relies on **Object Composition** ("has-a" relationship). The algorithm is enclosed in a separate object and can be swapped dynamically at runtime.
- **Template Method** relies on **Class Inheritance** ("is-a" relationship). The algorithm skeleton is hardcoded in a base class, and subclasses override specific hook methods at compile time.

---

### 6. Comparative Evaluation Scorecard

| Dimension | Strategy Pattern | State Pattern | Template Method Pattern |
| :--- | :--- | :--- | :--- |
| **Coupling Type** | Composition (has-a strategy). | Composition (has-a state). | Inheritance (is-a subclass). |
| **Who Changes It?** | Client injects or swaps algorithm. | Context transitions state internally. | Fixed at compile time by subclass. |
| **Runtime Swapping?** | Yes, fully dynamic. | Yes, event-driven transitions. | No, fixed per class definition. |
| **Knowledge of Peers** | Strategies are completely isolated. | States frequently trigger transitions to peer states. | Subclasses don't know about peer subclasses. |
| **Primary Use Case** | Interchangeable business algorithms (payment, compression, routing). | Finite State Machines (order workflow, TCP connection states). | Framework algorithm skeletons with customizable steps. |

---

### 7. Python Verification Script

The following standalone script demonstrates runtime strategy swapping (fallback on failure) and functional callable strategies:

```python
"""
Strategy Pattern Verification Test Suite
Demonstrates:
  1. OOP Strategy with dynamic fallback switching
  2. Functional Callable Strategy for pricing engines
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Callable


# ==========================================
# 1. OOP STRATEGY TEST (FINTECH GATEWAY)
# ==========================================
class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> Dict[str, Any]: pass


class UPIPayment(PaymentStrategy):
    def __init__(self, vpa: str, should_fail: bool = False):
        self.vpa = vpa
        self.should_fail = should_fail

    def pay(self, amount: float) -> Dict[str, Any]:
        if self.should_fail:
            return {"status": "FAILED", "reason": "Bank server timeout"}
        return {"status": "SUCCESS", "method": "UPI", "amount": amount, "id": "UPI9988"}


class CardPayment(PaymentStrategy):
    def __init__(self, last_four: str):
        self.last_four = last_four

    def pay(self, amount: float) -> Dict[str, Any]:
        return {"status": "SUCCESS", "method": "CARD", "amount": amount, "id": f"CC{self.last_four}"}


class PaymentContext:
    def __init__(self, strategy: PaymentStrategy):
        self.strategy = strategy

    def set_strategy(self, strategy: PaymentStrategy):
        self.strategy = strategy

    def process(self, amount: float) -> Dict[str, Any]:
        return self.strategy.pay(amount)


# ==========================================
# 2. FUNCTIONAL STRATEGY TEST (PRICING ENGINE)
# ==========================================
PricingStrategy = Callable[[float], float]

def standard_tax(subtotal: float) -> float:
    return subtotal * 1.18  # 18% GST

def export_tax(subtotal: float) -> float:
    return subtotal * 1.00  # 0% tax for foreign exports


if __name__ == "__main__":
    print("=" * 65)
    print("STRATEGY PATTERN VERIFICATION TEST SUITE")
    print("=" * 65)

    # 1. Test runtime fallback switching
    print("--- 1. Testing Fintech Strategy Fallback ---")
    upi_failing = UPIPayment("customer@axis", should_fail=True)
    gateway = PaymentContext(upi_failing)

    res1 = gateway.process(1500.0)
    print(f"Primary Attempt (UPI): {res1['status']} - {res1.get('reason')}")

    if res1["status"] == "FAILED":
        print("  -> Primary failed! Swapping strategy to Backup Credit Card at runtime...")
        card_backup = CardPayment("4321")
        gateway.set_strategy(card_backup)
        res2 = gateway.process(1500.0)
        print(f"Fallback Attempt (Card): {res2['status']} via {res2['method']} (ID: {res2['id']})")
        assert res2["status"] == "SUCCESS"

    # 2. Test Functional Strategy
    print("\n--- 2. Testing Pythonic Functional Strategy ---")
    subtotal = 5000.0
    domestic_total = standard_tax(subtotal)
    export_total = export_tax(subtotal)
    print(f"Domestic Total (18% Tax Strategy): Rs. {domestic_total:.2f}")
    print(f"Export Total   (0% Tax Strategy):  Rs. {export_total:.2f}")

    print("\nSUCCESS: Both OOP and functional Strategy implementations verified.")
```
