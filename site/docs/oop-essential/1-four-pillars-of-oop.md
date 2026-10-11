---
id: 1-four-pillars-of-oop
title: "The Four Pillars of OOP: Abstraction vs. Encapsulation"
description: "Clearly differentiate between Abstraction and Encapsulation with real-world analogies that make the four pillars easy to explain."

sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import {
  AbstractionFigure,
  EncapsulationFigure,
  InheritanceFigure,
  PolymorphismFigure,
} from '@site/src/components/Figures/FourPillars';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the four pillars of OOP? More specifically, I hear people mix up abstraction and encapsulation all the time. How do you draw the line between them?"

Abstraction and encapsulation sound similar, so people mix them up. Here's a simple way to tell all four pillars apart, using one example: **your bank account.**

---

### 1. Abstraction - show the "what", hide the "how"

Think about an ATM. You press **Withdraw**, type an amount, and get cash. You don't see the fraud checks or the database updates happening behind the screen - you don't need to. The screen shows a simple menu. Everything else stays hidden.

<AbstractionFigure />

That's abstraction: **show only the actions someone needs (`deposit`, `withdraw`, `getBalance`), and hide how they work.** In code, this is why we write an `interface` or `abstract class` - it's the menu a caller is allowed to see.

### 2. Encapsulation - lock the data, control the door

Now look at the bank's side. Your balance isn't an open number that anyone can change directly - it's locked inside the account. The only way to change it is through `deposit()` and `withdraw()`, and both check the rules first: no negative deposits, no withdrawing more than you have.

<EncapsulationFigure />

That's encapsulation: **keep the data (`balance`) together with the methods allowed to touch it, and lock out everything else.** This keeps the object from ever reaching an invalid state, like a negative balance.

#### So what's actually different?

| | Abstraction | Encapsulation |
|---|---|---|
| **Question it answers** | "What can the caller do?" | "Who's allowed to touch the data?" |
| **What it hides** | How the operation works internally (the logic) | The raw data itself (the variables) |
| **Main goal** | Keep things simple for whoever is *using* the class | Keep the object's data safe and valid |
| **Built with** | Interfaces, abstract classes | `private`/`protected` fields, getters/setters |

**One-liner to say out loud in an interview:**
*"Abstraction hides the complexity you don't need to see. Encapsulation hides the data you're not allowed to touch."*

### 3. Inheritance - share a blueprint, specialize from it

`SavingsAccount` and `CurrentAccount` are both still "an account" - both have a balance, both can report it. They share one base blueprint, `Account`, and each adds its own rule: Savings blocks the balance from going below zero. Current allows it to dip into an overdraft limit.

<InheritanceFigure />

That's inheritance: **a child class reuses a parent class's fields and methods, and only changes what's different.** This is called an "IS-A" relationship - a `SavingsAccount` *is an* `Account`.

> 💡 **Going deeper:** Inheritance can be overused. If two classes aren't truly an "IS-A" fit, forcing one into a parent/child shape makes the code fragile. See [Composition vs. Inheritance](/docs/oop-essential/10-composition-vs-inheritance) for when to use one over the other.

### 4. Polymorphism - same call, different behavior

Say your app has a list of accounts - some `SavingsAccount`, some `CurrentAccount`, each holding ₹50. It calls `.withdraw(100)` on every one of them, the same line of code, without ever checking the type:

<PolymorphismFigure />

That's polymorphism: **the same method call produces different behavior depending on the actual object it's called on.** Two forms show up in interviews:
- **Overloading** (compile-time): same method name, different parameters, chosen by the compiler - e.g. `deposit(amount)` vs `deposit(amount, note)`.
- **Overriding** (runtime): a child class replaces a parent's method with its own version, chosen automatically based on the real object - what `SavingsAccount.withdraw()` and `CurrentAccount.withdraw()` do above.

---

### Putting it all together

- **Abstraction**: the ATM screen only shows `deposit`, `withdraw`, `getBalance` - nothing about how they work.
- **Encapsulation**: the balance is private; only those three methods can touch it.
- **Inheritance**: `SavingsAccount` and `CurrentAccount` both reuse the same `Account` blueprint.
- **Polymorphism**: calling `.withdraw()` on either one runs different logic automatically.

One bank account. Four pillars.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here's the full picture - interface, private state, two subclasses, and a polymorphic call - in one place:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. ABSTRACTION: the menu of actions a caller is allowed to see.
interface Account {
    void deposit(double amount);
    void withdraw(double amount);
    double getBalance();
}

// 2. ENCAPSULATION + the shared blueprint used by inheritance.
abstract class BaseAccount implements Account {
    private double balance; // locked away - only this class can touch it directly

    protected BaseAccount(double initialBalance) {
        this.balance = Math.max(initialBalance, 0);
    }

    @Override
    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Deposit must be positive.");
        balance += amount;
    }

    @Override
    public double getBalance() {
        return balance;
    }

    protected void setBalance(double newBalance) {
        this.balance = newBalance;
    }
}

// 3. INHERITANCE: reuses deposit()/getBalance(), only customizes withdraw().
class SavingsAccount extends BaseAccount {
    public SavingsAccount(double initialBalance) { super(initialBalance); }

    @Override
    public void withdraw(double amount) {
        if (amount > getBalance()) throw new IllegalStateException("Insufficient funds.");
        setBalance(getBalance() - amount);
    }
}

class CurrentAccount extends BaseAccount {
    private final double overdraftLimit;

    public CurrentAccount(double initialBalance, double overdraftLimit) {
        super(initialBalance);
        this.overdraftLimit = overdraftLimit;
    }

    @Override
    public void withdraw(double amount) {
        if (getBalance() - amount < -overdraftLimit) throw new IllegalStateException("Over overdraft limit.");
        setBalance(getBalance() - amount);
    }
}

// 4. POLYMORPHISM: same method call, different behavior per actual object.
public class Demo {
    public static void main(String[] args) {
        List<Account> allAccounts = List.of(
            new SavingsAccount(200),
            new CurrentAccount(200, 500)
        );
        for (Account acc : allAccounts) {
            acc.withdraw(100); // each object runs its own withdraw() rules
        }
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <vector>
#include <memory>
#include <stdexcept>

// 1. ABSTRACTION: pure virtual interface - the menu of actions.
class Account {
public:
    virtual ~Account() = default;
    virtual void deposit(double amount) = 0;
    virtual void withdraw(double amount) = 0;
    virtual double getBalance() const = 0;
};

// 2. ENCAPSULATION + shared blueprint for inheritance.
class BaseAccount : public Account {
protected:
    double balance; // protected, not public - still guarded by the methods below

public:
    explicit BaseAccount(double initialBalance) : balance(initialBalance > 0 ? initialBalance : 0) {}

    void deposit(double amount) override {
        if (amount <= 0) throw std::invalid_argument("Deposit must be positive.");
        balance += amount;
    }

    double getBalance() const override { return balance; }
};

// 3. INHERITANCE: each subclass only overrides withdraw().
class SavingsAccount : public BaseAccount {
public:
    explicit SavingsAccount(double initialBalance) : BaseAccount(initialBalance) {}

    void withdraw(double amount) override {
        if (amount > balance) throw std::runtime_error("Insufficient funds.");
        balance -= amount;
    }
};

class CurrentAccount : public BaseAccount {
    double overdraftLimit;
public:
    CurrentAccount(double initialBalance, double overdraftLimit)
        : BaseAccount(initialBalance), overdraftLimit(overdraftLimit) {}

    void withdraw(double amount) override {
        if (balance - amount < -overdraftLimit) throw std::runtime_error("Over overdraft limit.");
        balance -= amount;
    }
};

// 4. POLYMORPHISM: same call, different behavior via virtual dispatch.
int main() {
    std::vector<std::unique_ptr<Account>> allAccounts;
    allAccounts.push_back(std::make_unique<SavingsAccount>(200));
    allAccounts.push_back(std::make_unique<CurrentAccount>(200, 500));

    for (auto& acc : allAccounts) {
        acc->withdraw(100); // each object runs its own withdraw() rules
    }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from abc import ABC, abstractmethod

# 1. ABSTRACTION: the menu of actions a caller is allowed to see.
class Account(ABC):
    @abstractmethod
    def deposit(self, amount: float) -> None: ...

    @abstractmethod
    def withdraw(self, amount: float) -> None: ...

    @abstractmethod
    def get_balance(self) -> float: ...

# 2. ENCAPSULATION + shared blueprint for inheritance.
class BaseAccount(Account):
    def __init__(self, initial_balance: float = 0.0):
        self._balance = max(initial_balance, 0)  # "_" signals: internal, don't touch directly

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Deposit must be positive.")
        self._balance += amount

    def get_balance(self) -> float:
        return self._balance

# 3. INHERITANCE: each subclass only customizes withdraw().
class SavingsAccount(BaseAccount):
    def withdraw(self, amount: float) -> None:
        if amount > self._balance:
            raise ValueError("Insufficient funds.")
        self._balance -= amount

class CurrentAccount(BaseAccount):
    def __init__(self, initial_balance: float, overdraft_limit: float):
        super().__init__(initial_balance)
        self._overdraft_limit = overdraft_limit

    def withdraw(self, amount: float) -> None:
        if self._balance - amount < -self._overdraft_limit:
            raise ValueError("Over overdraft limit.")
        self._balance -= amount

# 4. POLYMORPHISM: same call, different behavior depending on the real object.
all_accounts = [SavingsAccount(200), CurrentAccount(200, overdraft_limit=500)]
for acc in all_accounts:
    acc.withdraw(100)  # each object runs its own withdraw() rules
```

</TabItem>
</Tabs>
