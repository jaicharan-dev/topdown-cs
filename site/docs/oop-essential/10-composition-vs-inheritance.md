---
id: 10-composition-vs-inheritance
title: "Composition vs. Inheritance"
description: "What a thing is against what a thing has, and why the second is usually safer"

sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the fundamental difference between composition and inheritance? Why is the industry consensus to 'favor composition over inheritance', and how do Association, Aggregation, and Composition differ?"

---

### Picture it

Two ways to give an object the ability to do something.

**Inheritance is inheriting a trade.** You join the family business and are given everything the family already does. It is one decision, made once, and you cannot change your mind later. You also get the whole lot, including parts of the trade you have no use for, and if the family changes how something works, your version changes underneath you.

**Composition is hiring a specialist.** You do not know how to do accounts, so you employ an accountant. You can employ a different one tomorrow. You can employ several people with different skills. And the accountant's private methods stay private, because all you ever do is ask them for results.

Inheritance says a car **is a** vehicle. Composition says a car **has an** engine. The first is about identity, the second about parts.

---

### The proper terms

#### The two relationships

**Inheritance** models an **IS-A** relationship. A subclass **extends** a superclass, receiving its fields and methods. It is decided at **compile time** and cannot be changed while the program runs.

**Composition** models a **HAS-A** relationship. One class holds another as a field and **delegates** work to it. Because that field is an ordinary reference, it can be swapped at **runtime**, which is what makes composition flexible.

#### Why composition is usually preferred

**Encapsulation is preserved.** A subclass can reach `protected` members and depends on how the parent is built, not only on what it promises. A composing class sees only the other object's public surface, so the two stay genuinely separate.

**The fragile base class problem.** When a parent changes internally, every subclass is exposed to that change, even though none of them were edited. The classic demonstration is subclassing a collection to count additions: if the parent's bulk-add method happens to call the single-add method internally, every item gets counted twice. Composition avoids it because the wrapper decides exactly what it forwards.

**One parent only.** A class extends one superclass, so inheritance is a budget you can spend only once. A class can hold as many collaborators as it needs.

**Behaviour can change at runtime.** Swapping a strategy object changes behaviour while running. Swapping a superclass is impossible.

The principle is **favour composition over inheritance**. Reach for inheritance when the subtype is genuinely substitutable for the supertype, which is what the **Liskov Substitution Principle** requires, and when you control both sides of the relationship.

#### Association, aggregation, composition

These three are UML terms for how strongly objects are linked, and interviewers like them because the distinction is about **lifecycle ownership**.

**Association** is the loosest: two objects know about each other, with no ownership at all. A teacher and a student, where each exists independently.

**Aggregation** is a HAS-A where the part can outlive the whole. A department has professors, but deleting the department does not delete the people. In code, the object is usually passed in from outside.

**Composition** here means the strict form: the part cannot exist without the whole, and dies with it. A house has rooms, and demolishing the house removes them. In code, the owner usually creates the part itself and never exposes it.

The test is simple: if the contained object is still meaningful after the container is destroyed, it is aggregation; if not, it is composition.

---

### In code

```java
// Inheritance: Stack IS-A Vector, inherited wholesale
// java.util.Stack does this, and it is a textbook mistake: a stack
// ends up with get(index) and insertElementAt(), which break its contract.

// Composition: Stack HAS-A list, and exposes only stack operations
class SafeStack<T> {
    private final java.util.List<T> items = new java.util.ArrayList<>();

    void push(T item) { items.add(item); }              // delegation

    T pop() {
        if (items.isEmpty()) throw new IllegalStateException("empty");
        return items.remove(items.size() - 1);
    }

    int size() { return items.size(); }                 // chosen, not inherited
}

// Composition also lets behaviour be swapped while running
interface PaymentMethod { void pay(double amount); }

class Order {
    private PaymentMethod method;                       // a collaborator, not a parent

    Order(PaymentMethod method) { this.method = method; }

    void setMethod(PaymentMethod method) {              // impossible with inheritance
        this.method = method;
    }

    void checkout(double total) { method.pay(total); }
}
```

`SafeStack` is the argument in miniature. Inheriting from a list would have handed callers `get(5)` and `insertElementAt`, which contradict what a stack is. Composition exposes three methods and nothing else.

---

### What they ask next

**"Is inheritance ever the right choice?"**
Yes, when the IS-A relationship genuinely holds and the subtype is substitutable, and especially when you own both classes. Template method designs, where a base defines an algorithm and subclasses fill in steps, are a legitimate use.

**"What is the fragile base class problem, concretely?"**
A subclass overrides a method, the parent calls that method internally as part of another operation, and the override now runs in a context it was never written for. Counting additions in a subclassed collection and getting double counts is the standard example.

**"How is composition different from aggregation in code?"**
Mainly in who creates the part and whether it is exposed. Composition usually means the owner constructs it and never hands it out, so its lifetime matches the owner's. Aggregation usually means the object arrives through the constructor and outlives the container.

**"Does composition mean more boilerplate?"**
Yes, you write delegating methods that inheritance would have given free. That verbosity is the price of controlling exactly what is exposed, and it is usually judged worth paying.

**The common wrong answer** is "composition is better because inheritance is slow". Performance is not the issue. Coupling and the fragile base class problem are.

---

### Say this in the interview

*"Inheritance models an IS-A relationship: a subclass extends a superclass and receives its members, fixed at compile time. Composition models a HAS-A relationship: a class holds another as a field and delegates to it, and because that is an ordinary reference it can be swapped at runtime.*

*Composition is usually preferred for three reasons. It preserves encapsulation, since the composing class sees only the public surface rather than protected internals. It avoids the fragile base class problem, where a change inside a parent silently alters subclass behaviour, the classic case being a subclassed collection that double-counts because the parent's bulk method calls the single-item one. And a class can hold many collaborators but extend only one superclass. The principle is favour composition over inheritance, and inheritance is still right when the subtype is genuinely substitutable, which the Liskov Substitution Principle requires.*

*Association, aggregation and composition describe how strongly objects are linked, and the test is lifecycle ownership. Association is mutual awareness with no ownership. Aggregation is a HAS-A where the part outlives the whole, like a department and its professors. Composition is the strict form where the part dies with the whole, like a house and its rooms."*
