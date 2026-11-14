---
id: 1-four-pillars-of-oop
title: "The Four Pillars of OOP: Abstraction vs. Encapsulation"
description: "All four pillars through one bank account, and where abstraction ends and encapsulation begins"

sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the four pillars of OOP? More specifically, I hear people mix up abstraction and encapsulation all the time. How do you draw the line between them?"

---

### Picture it

Think about your bank account. One example is enough to see all four ideas.

**You use an ATM.** You press Withdraw, type an amount, and cash comes out. Behind the screen there are fraud checks and database updates, and you never see any of them. The screen gives you a short menu of things you can do, and keeps everything else out of your way.

**The bank guards your balance.** Your balance is not a number anyone can reach in and change. The only way to change it is to deposit or withdraw, and both of those check the rules first. No negative deposits. No taking out more than you are allowed.

**There are different kinds of account.** A savings account and a current account are both still accounts. Both hold a balance and both accept deposits. They differ in one rule: savings can never go below zero, while current may dip into an overdraft.

**The same request gets different results.** Ask both accounts to withdraw 100 when each holds 50. The savings account refuses. The current account allows it. You asked the same thing both times, and each account answered by its own rules.

Those four paragraphs are the four pillars. The rest of this page gives each one its proper name.

---

### The proper terms

#### Abstraction

The ATM menu is **abstraction**: showing the caller only the essential operations and hiding the **implementation details** behind them. It answers the question "what can this object do?"

In code, the menu is written as an **interface** or an **abstract class**. It lists the operations, such as `deposit`, `withdraw` and `getBalance`, and says nothing about how they work.

#### Encapsulation

The guarded balance is **encapsulation**: bundling the data together with the methods that operate on it, and restricting direct access to that data. It answers the question "who is allowed to touch this?"

The restricting is done with **access modifiers**. The field is marked `private`, so outside code cannot reach it, and the `public` methods are the only way in. Keeping the data out of reach like this is what textbooks call **data hiding**. The payoff is that the object can never be pushed into an invalid state, like a negative savings balance, because every change has to pass through a method that checks the rules.

#### The line between the two

Both are described as "hiding", which is why they get mixed up. They hide different things for different reasons.

Abstraction hides **complexity**. It is a design decision about what to show the caller, and it exists to make the object simple to use. Encapsulation hides **data**. It is an implementation decision about how the object's state is protected, and it exists to keep the object valid.

Put shortly: abstraction hides what you don't need to see, and encapsulation hides what you are not allowed to touch.

#### Inheritance

The two kinds of account are **inheritance**: a **subclass** takes on the fields and methods of a **superclass** and changes only what is different. `SavingsAccount` and `CurrentAccount` both extend one shared account class.

Two phrases go with it. The relationship it models is called **IS-A**, since a savings account is an account. The benefit it gives is **code reuse**, since deposit and balance logic is written once and shared.

Inheritance is easy to overuse. If two classes are not a true IS-A fit, forcing them into parent and child makes the code fragile. [Composition vs. Inheritance](/docs/oop-essential/10-composition-vs-inheritance) covers when to choose which.

#### Polymorphism

One request with different results is **polymorphism**: the same method call behaves differently depending on the object it is called on. The word means "many forms". It comes in two kinds, and interviewers expect both names.

**Method overloading** is several methods with the same name and different parameter lists, such as `deposit(amount)` and `deposit(amount, note)`. The compiler picks one by looking at the arguments, so this is decided at **compile time**.

**Method overriding** is a subclass replacing a method it inherited with its own version, as both account types do with `withdraw`. Which version runs depends on the actual object, so this is decided at **runtime**.

---

### In code

The same bank account in Java, with each pillar marked where it appears.

```java
import java.util.List;

// Abstraction: the caller sees these three operations and nothing else
interface Account {
    void deposit(double amount);
    void withdraw(double amount);
    double getBalance();
}

// Encapsulation: balance is private, and every change passes through a check
abstract class BaseAccount implements Account {
    private double balance;

    @Override
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit must be positive");
        }
        balance += amount;
    }

    @Override
    public double getBalance() {
        return balance;
    }

    // the only way a subclass can take money out, and it cannot skip the limit
    protected void debit(double amount, double lowestAllowed) {
        if (balance - amount < lowestAllowed) {
            throw new IllegalStateException("Insufficient funds");
        }
        balance -= amount;
    }
}

// Inheritance: both reuse deposit() and getBalance(), and only withdraw() differs
class SavingsAccount extends BaseAccount {
    @Override
    public void withdraw(double amount) {
        debit(amount, 0);                 // may never go below zero
    }
}

class CurrentAccount extends BaseAccount {
    private final double overdraftLimit = 500;

    @Override
    public void withdraw(double amount) {
        debit(amount, -overdraftLimit);   // may dip into the overdraft
    }
}

// Polymorphism: one call, and each object runs its own withdraw()
public class Demo {
    public static void main(String[] args) {
        List<Account> accounts = List.of(new SavingsAccount(), new CurrentAccount());

        for (Account account : accounts) {
            account.deposit(50);
            try {
                account.withdraw(100);    // Savings refuses, Current allows it
            } catch (IllegalStateException e) {
                System.out.println("Refused: " + e.getMessage());
            }
        }
    }
}
```

Notice that even the subclasses cannot touch `balance` directly. They have to go through `debit`, which checks the limit. That is encapsulation holding inside the class hierarchy, not just against outside code.

---

### What they ask next

**"If every field has a getter and a setter, is the class encapsulated?"**
No. A setter that assigns whatever it is given is a public field with extra typing. Encapsulation means the object controls its own changes, so the methods have to enforce the rules. The account above has no `setBalance` at all, and that is deliberate.

**"Can you have one without the other?"**
Yes, which is the best proof they are different things. A class with private fields and no interface has encapsulation without abstraction. An interface whose implementing class leaves its fields public has abstraction without encapsulation.

**"Is overloading really polymorphism?"**
It is the compile-time form, and some people call it static binding. Overriding is the runtime form, and the mechanism that picks the right method while the program runs is called dynamic dispatch. When an interviewer says "polymorphism" with no qualifier, they almost always mean overriding.

**The common wrong answer** is "abstraction and encapsulation both hide things", left at that. Always finish the sentence: say what each one hides, and why.

---

### Say this in the interview

*"OOP rests on four pillars. Abstraction exposes only the essential operations of an object, usually through an interface or an abstract class, and hides the implementation details. Encapsulation bundles data with the methods that operate on it and uses access modifiers to restrict direct access, which is data hiding. Inheritance lets a subclass reuse and extend a superclass. It models an IS-A relationship and gives code reuse. Polymorphism lets the same call behave differently depending on the object: method overloading is resolved at compile time, and method overriding at runtime.*

*The line between the first two is this. Abstraction hides complexity, and it is about what an object does. Encapsulation hides data, and it is about how the object's state is protected."*
