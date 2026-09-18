---
id: 3-strategy-pattern
title: "Strategy Pattern"
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the Strategy pattern, why would you use it, and show me a Python implementation. Use a payment processing system as your example.

The Strategy pattern is a behavioral design pattern that allows you to define a family of algorithms, encapsulate each one into its own separate class, and make their objects interchangeable at runtime. It lets the algorithm vary independently from the client that uses it, entirely eliminating massive if-else chains for determining how a task should be executed.

### Why would you use it? (The ELI5)

**The ELI5 Analogy:** You are navigating to the airport. Your overarching goal (the context) is to reach the terminal. However, your strategy for getting there can change based on the situation: you might take a taxi (if in a hurry), ride the bus (if on a budget), or drive yourself. The airport doesn't care how you arrived; it just processes your arrival.

**The Technical Reality (Razorpay Context):** When a user hits "Pay ₹500", Razorpay has to process that money. The user might choose UPI, a Credit Card, or NetBanking.

**The Bad Way:** You have one massive `Checkout` class with a `process_payment()` method containing hundreds of lines of `if type == "UPI": ... elif type == "CreditCard": ...`. This is a nightmare to maintain.

**The Strategy Way:** You extract the specific logic for UPI into a `UPIStrategy` class and Credit Card into a `CreditCardStrategy` class. The main `Checkout` class simply holds a reference to whatever strategy the user selected and calls `.pay()`.

### The Python Implementation

Because you are targeting fintech placements, this exact structure is what an interviewer at a payment gateway company expects to see when discussing payment routing.

```python
from abc import ABC, abstractmethod

# ==========================================
# 1. THE STRATEGY INTERFACE (The Contract)
# ==========================================
class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> str:
        pass

# ==========================================
# 2. CONCRETE STRATEGIES (The Algorithms)
# ==========================================
class UPIPayment(PaymentStrategy):
    def __init__(self, upi_id: str):
        self.upi_id = upi_id

    def pay(self, amount: float) -> str:
        # Complex API calls to NPCI/Bank would go here
        return f"✅ Successfully processed ₹{amount} via UPI ({self.upi_id})"

class CreditCardPayment(PaymentStrategy):
    def __init__(self, card_number: str, cvv: str):
        self.card_number = card_number
        self.cvv = cvv

    def pay(self, amount: float) -> str:
        # Complex API calls to Visa/Mastercard would go here
        masked_card = f"****-****-****-{self.card_number[-4:]}"
        return f"✅ Successfully charged ₹{amount} to Credit Card {masked_card}"

# ==========================================
# 3. THE CONTEXT (The Client / Checkout System)
# ==========================================
class PaymentGateway:
    # We inject the strategy through the constructor
    def __init__(self, strategy: PaymentStrategy):
        self._strategy = strategy

    # We can swap the strategy at runtime if needed
    def set_strategy(self, strategy: PaymentStrategy):
        self._strategy = strategy

    # The core business logic
    def execute_payment(self, amount: float):
        print("Initiating transaction security checks...")
        # The gateway doesn't care HOW the payment happens, just that it does.
        result = self._strategy.pay(amount)
        print(result)

# ==========================================
# 4. THE EXECUTION TRACE
# ==========================================

cart_total = 1500.00

# User selects UPI
user_upi = UPIPayment("student@okhdfc")
checkout = PaymentGateway(user_upi)
checkout.execute_payment(cart_total)

print("-" * 40)

# User's UPI fails, they switch to a Credit Card AT RUNTIME
user_card = CreditCardPayment("1234567890124444", "123")
checkout.set_strategy(user_card)  # Dynamic swap!
checkout.execute_payment(cart_total)
```

### Tying it to SOLID for the Interview

Notice how perfectly this connects to the principles mastered in the Factory pattern:
- **Open/Closed Principle (OCP):** If a "Buy Now, Pay Later" (BNPL) feature is introduced tomorrow, you write a new `BNPLStrategy` class. You do not touch a single line of code inside the core `PaymentGateway`. It is closed for modification but open for extension.
- **Dependency Inversion Principle (DIP):** The `PaymentGateway` does not depend on the low-level `UPIPayment` or `CreditCardPayment` classes. It depends purely on the abstract `PaymentStrategy` interface.
- **Encapsulation:** The complex, messy API logic for connecting to Visa or Mastercard is hidden completely inside the `CreditCardPayment` class, keeping the main gateway clean and focused strictly on routing.

---

### Crucial Nuance: State vs. Strategy

Interviewers frequently ask for the difference between the State pattern and the Strategy pattern, as their class diagrams are nearly identical. The difference is entirely in the **intent**. In the Strategy pattern, the *client* dictates which algorithm to use (e.g., the user clicks "Pay with UPI"). In the State pattern, the *context itself* dynamically transitions between states based on internal logic without the client's direct intervention.
