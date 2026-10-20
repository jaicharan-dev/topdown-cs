---
id: 3-strategy-pattern
title: "Strategy Pattern: Dynamic Algorithm Selection & Functional Alternatives"
description: "Master the Strategy pattern in Python: fintech payment routing, dynamic runtime swapping, functional callables, and comparisons with State and Template Method."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Strategy pattern, why would you use it, and how does it uphold the Open/Closed and Dependency Inversion principles? Demonstrate a production payment gateway with runtime algorithm swapping in Python, and contrast Strategy with the State and Template Method patterns."

A checkout page can pay by UPI, card, or crypto — same `checkout()` call every time, completely different logic underneath, and swappable at runtime if one fails. That's **Strategy**: pull each algorithm out into its own interchangeable object, instead of hardcoding the choice.

<Diagram>
<Tree root={
<Box title="PaymentGateway (Context)" accent="#818cf8">
<Field icon="🔀" code="delegates to self._strategy.pay()" hint="doesn't know or care which one" variant="neutral" />
</Box>
}>
<Box title="UPIPayment" accent="#34d399"><Field icon="↳" code="pay() → routes via NPCI" variant="neutral" /></Box>
<Box title="CreditCardPayment" accent="#34d399"><Field icon="↳" code="pay() → routes via card network" variant="neutral" /></Box>
</Tree>
</Diagram>

---

### The Anti-Pattern: Procedural Conditional Explosion

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

### A Real Implementation: Fintech Payment Router

This is roughly how payment aggregators like Stripe or Razorpay structure multi-rail routing with runtime fallback:

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

### The Pythonic Shortcut: Just Pass a Function

Java or C++ forces you to build a class hierarchy for this. Python doesn't — functions are first-class values, so if a strategy has no internal state to track (a discount calculation, a pricing rule, a sort comparator), a whole class with one method is just boilerplate. Pass the function directly:

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

**The rule of thumb:** if the strategy has no internal state to hold onto, a plain function or lambda satisfies the whole pattern — no class needed.

---

### Strategy vs. State vs. Template Method

These three get confused constantly because the class diagrams look similar:

- **Strategy vs. State:** both have a Context delegating to swappable implementations — but in Strategy, *the caller* picks the algorithm, and each strategy is isolated, unaware of the others. In State, the *Context itself* drives the transitions (an `Order` moving `Pending → Paid → Shipped`), and states often know about each other to trigger the next one.
- **Strategy vs. Template Method:** Strategy uses composition — the algorithm lives in a separate, swappable object. Template Method uses inheritance — the algorithm's skeleton is baked into a base class, and subclasses only override specific steps, fixed at compile time.

---

### Comparing the Three

| Dimension | Strategy Pattern | State Pattern | Template Method Pattern |
| :--- | :--- | :--- | :--- |
| **Coupling Type** | Composition (has-a strategy). | Composition (has-a state). | Inheritance (is-a subclass). |
| **Who Changes It?** | Client injects or swaps algorithm. | Context transitions state internally. | Fixed at compile time by subclass. |
| **Runtime Swapping?** | Yes, fully dynamic. | Yes, event-driven transitions. | No, fixed per class definition. |
| **Knowledge of Peers** | Strategies are completely isolated. | States frequently trigger transitions to peer states. | Subclasses don't know about peer subclasses. |
| **Primary Use Case** | Interchangeable business algorithms (payment, compression, routing). | Finite State Machines (order workflow, TCP connection states). | Framework algorithm skeletons with customizable steps. |

---

### Say this in the interview

*"Strategy pulls an algorithm out into its own swappable object, so you can add a new one without touching existing code — that's Open/Closed in action. It's composition-based: the context holds a reference to a strategy interface and delegates to it, and the caller decides which one to use. In Python, if the strategy has no state, a plain function does the job — no class needed. The usual confusion is with State (where the context drives its own transitions) and Template Method (which uses inheritance, not composition, and fixes the algorithm at compile time)."*

---

### Python: Verification Script

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
