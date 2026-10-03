---
id: 3-interface-vs-abstract-class
title: "Interfaces vs. Abstract Classes"
description: "Learn the core conceptual differences between interfaces and abstract classes, and when to use each in system design."

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the actual difference between an abstract class and an interface? Walk me through your decision process for choosing one over the other in system design, and explain why an abstract class has a constructor if it can't be instantiated."

### The Quick Answer

"An **abstract class** models an **IS-A** relationship, representing core identity and shared mutable state among closely related classes. An **interface** models a **CAN-DO** capability or contract, guaranteeing that a class possesses a specific behavior regardless of its place in the class hierarchy."

---

### The Technical Breakdown

| Feature | Abstract Class | Interface |
|---|---|---|
| **Primary Intent** | Code reuse, shared state, and strict identity hierarchy (**IS-A**). | Behavioral contract and loose coupling (**CAN-DO**). |
| **State & Fields** | Can have instance variables (mutable state) with any access modifier. | Strictly stateless. Fields are implicitly `public static final` (constants). |
| **Constructors** | ✅ **Yes.** Used to initialize base state when a subclass is instantiated. | ❌ **No.** Has no instance state to initialize; cannot have constructors. |
| **Inheritance** | Single inheritance only (`extends` one class). | Multiple inheritance of type (`implements` multiple interfaces). |
| **Method Modifiers** | Methods can be `public`, `protected`, or `private` (concrete). Abstract methods cannot be `private`. | Methods are `public` by default. Can also be `private` (Java 9+ for helper logic). Cannot be `protected`. |
| **Bytecode Dispatch** | Invoked via `invokevirtual` (standard vtable offset). | Invoked via `invokeinterface` (dynamic itable lookup, JIT-optimized). |

---

### The Classic Interview Trap: Why does an Abstract Class have a Constructor?

A favorite interviewer trap is: *"If you can never call `new AbstractClass()`, why are constructors allowed (and often required) in abstract classes?"*

* **The Answer:** An abstract class defines the foundation for its subclasses. It often declares `private` or `protected` instance variables that need initialization. 
* When a child class is instantiated via `new Child()`, the child constructor executes `super(...)` as its very first action. This calls the abstract parent's constructor, ensuring that the parent's fields are safely and correctly initialized and that any base invariants are verified before child-specific logic runs.

---

### The ELI5 Analogy

* **Abstract Class (DNA & Lineage):** Think of an abstract class as a `Mammal`. A `Dog` is a Mammal; a `Whale` is a Mammal. Because they share this strict biological lineage, `Mammal` provides shared internal state (warm blood, heart rate) and concrete shared behaviors (breathing). You cannot manifest a generic, standalone "Mammal" in the wild; it must be a concrete species.
* **Interface (A License or Certification):** Think of an interface as a `Swimmer` certificate. A `Human` can swim, a `Whale` can swim, and an autonomous `Submarine` can swim. They share zero lineage or internal biology, but they all satisfy a contract promising they implement a `swim()` method.

---

### System Design: When to Choose Which

#### 1. Choose an Abstract Class when:
* You want to share state (instance fields) and base initialization logic across closely related classes.
* You need non-public members (e.g., `protected` helper methods for subclasses).
* You want to provide a template method pattern where base algorithms call abstract extension steps.

#### 2. Choose an Interface when:
* You want to define a behavioral contract across completely unrelated classes (e.g., `Comparable`, `Serializable`, `AutoCloseable`).
* You need multiple inheritance of type (a class fulfilling multiple independent roles).
* You are designing public APIs to decouple callers from concrete implementations (enabling easy mocking and unit testing).

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how an abstract class (shared state & identity) and an interface (capability contract) are implemented across different languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. INTERFACE: Capability contract for unrelated classes
interface TaxExportable {
    void exportTaxData();
}

// 2. ABSTRACT CLASS: Core identity with shared state and constructor
abstract class BankAccount {
    protected String accountNumber;
    protected double balance;

    // Abstract class constructor called by subclasses via super()
    public BankAccount(String accountNumber, double balance) {
        this.accountNumber = accountNumber;
        this.balance = balance;
    }

    // Concrete method shared by all account types
    public double getBalance() {
        return this.balance;
    }

    // Abstract method: each subclass must provide its own formula
    public abstract void applyMonthlyFee();
}

// 3. CONCRETE CLASS: Extends base identity AND implements capability
class SavingsAccount extends BankAccount implements TaxExportable {
    public SavingsAccount(String accountNumber, double balance) {
        super(accountNumber, balance); // Chaining to abstract parent constructor
    }

    @Override
    public void applyMonthlyFee() {
        this.balance -= 5.0; // Flat monthly maintenance fee
    }

    @Override
    public void exportTaxData() {
        System.out.println("Exporting interest tax form for account: " + accountNumber);
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>

// 1. INTERFACE: In C++, an interface is a class with only pure virtual functions and no state
class TaxExportable {
public:
    virtual ~TaxExportable() = default;
    virtual void exportTaxData() = 0;
};

// 2. ABSTRACT CLASS: Core identity with shared state and constructor
class BankAccount {
protected:
    std::string accountNumber;
    double balance;

public:
    // Constructor initializes shared base state
    BankAccount(std::string accNum, double initialBal)
        : accountNumber(accNum), balance(initialBal) {}
    virtual ~BankAccount() = default;

    double getBalance() const { return balance; }

    // Pure virtual method makes this class abstract
    virtual void applyMonthlyFee() = 0;
};

// 3. CONCRETE CLASS: Inherits from base class and implements interface
class SavingsAccount : public BankAccount, public TaxExportable {
public:
    SavingsAccount(std::string accNum, double initialBal)
        : BankAccount(accNum, initialBal) {}

    void applyMonthlyFee() override {
        balance -= 5.0;
    }

    void exportTaxData() override {
        std::cout << "Exporting interest tax form for account: " << accountNumber << std::endl;
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from abc import ABC, abstractmethod

# 1. INTERFACE: Stateless capability protocol using ABC
class TaxExportable(ABC):
    @abstractmethod
    def export_tax_data(self) -> None:
        pass

# 2. ABSTRACT CLASS: Core identity with shared state and constructor
class BankAccount(ABC):
    def __init__(self, account_number: str, balance: float):
        self.account_number = account_number
        self._balance = balance

    def get_balance(self) -> float:
        return self._balance

    @abstractmethod
    def apply_monthly_fee(self) -> None:
        pass

# 3. CONCRETE CLASS: Inherits base state and implements capability
class SavingsAccount(BankAccount, TaxExportable):
    def __init__(self, account_number: str, balance: float):
        super().__init__(account_number, balance)

    def apply_monthly_fee(self) -> None:
        self._balance -= 5.0

    def export_tax_data(self) -> None:
        print(f"Exporting interest tax form for account: {self.account_number}")
```

</TabItem>
</Tabs>
