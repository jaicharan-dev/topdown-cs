---
id: 3-interface-vs-abstract-class
title: "Interfaces vs. Abstract Classes"
description: "Learn the core conceptual differences between interfaces and abstract classes, and when to use each in system design."

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import { InterfaceVsAbstractFigure } from '@site/src/components/Figures/InterfaceVsAbstractClass';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the actual difference between an abstract class and an interface? How do you decide which one to use, and why does an abstract class get a constructor if you can never instantiate it directly?"

### The short version

An **abstract class** answers "what *is* this thing?": it models a strict family relationship (**IS-A**) and can share real state and logic between close relatives.

An **interface** answers "what can this thing *do*?": it's a capability contract (**CAN-DO**) that unrelated classes can all promise to satisfy, with no shared lineage at all.

### A simple way to picture it

Think of `Mammal` as an abstract class. A `Dog` is a mammal. A `Whale` is a mammal. They share real biology (warm blood, a heartbeat), so `Mammal` can hold that shared state and logic. You can never have a plain, generic "Mammal" walking around; it has to be some specific species.

Now think of `Swimmer` as an interface, more like a certification than a bloodline. A `Human` can swim, a `Whale` can swim, and a `Submarine` can swim. They share zero biology or lineage, but they all satisfy one contract: they all implement `swim()`.

<InterfaceVsAbstractFigure />

That's the real split: an abstract class is about identity and shared code; an interface is about a promise, with nothing shared underneath it.

---

### Side by side

| Feature | Abstract Class | Interface |
|---|---|---|
| **What it's for** | Code reuse, shared state, strict "IS-A" hierarchy | A behavior contract, loosely coupling unrelated classes |
| **State / fields** | Can have real instance variables with any access level | No real state - fields are just `public static final` constants |
| **Constructors** | ✅ Yes - used to set up shared state before a subclass runs | ❌ No - there's no instance state to set up |
| **Inheritance** | A class can only `extends` one abstract class | A class can `implements` many interfaces at once |
| **Method access** | Methods can be `public`, `protected`, or `private`. Abstract methods can't be `private` | Methods are `public` by default (can be `private` since Java 9 for internal helpers). Never `protected` |
| **Dispatch** | Called via `invokevirtual` (a direct vtable slot) | Called via `invokeinterface` (a dynamic lookup, JIT-optimized) |

---

### Why does an abstract class even have a constructor?

A common trap question: *"If you can never write `new AbstractClass()`, why does it have - or sometimes require - a constructor?"*

Because its subclasses still need its fields initialized. An abstract class often holds `private` or `protected` state that has to be set up correctly before anything else runs. When you call `new Child()`, the child's constructor calls `super(...)` as its very first line - that runs the parent's constructor, which sets up the parent's fields and checks any base rules, before the child adds anything of its own.

---

### Choosing between them

**Reach for an abstract class when:**
* You want to share state and setup logic across closely related classes.
* You need non-public helper methods for subclasses to use internally.
* You're writing a template method - a base algorithm that calls out to steps the subclass fills in.

**Reach for an interface when:**
* You're defining a contract across classes that have nothing else in common (`Comparable`, `Serializable`, `AutoCloseable`).
* A class needs to satisfy more than one independent role at once.
* You're designing a public API and want callers decoupled from the concrete implementation - easier to mock, easier to test.

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
