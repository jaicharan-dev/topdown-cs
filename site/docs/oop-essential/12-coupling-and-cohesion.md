---
id: 12-coupling-and-cohesion
title: "Coupling and Cohesion: Designing for Maintainability"
description: "How tightly modules are tied together, how well each one hangs together, and why you want opposite answers"

sidebar_position: 12
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "How do you define coupling and cohesion? What are their highest and lowest forms, why is 'high cohesion, low coupling' the golden standard, and what is the Law of Demeter?"

---

### Picture it

Think of departments in a company.

**Cohesion is how much a single department's work belongs together.** A good accounts department does accounting: invoices, payments, ledgers. A bad one does accounting, catering and IT support, so nobody can describe what it is for without using the word "and" several times.

**Coupling is how much departments depend on each other.** Low coupling is sending accounts a request form and getting a result back. High coupling is walking into their office, opening their filing cabinet, and editing a document yourself. The moment they reorganise their cabinet, your routine breaks.

You want each department to make sense on its own, and you want the connections between them to be thin and formal. Those are the two goals, and they are separate measures rather than two ends of one scale.

---

### The proper terms

#### Cohesion

**Cohesion** measures how closely the responsibilities inside a single module belong together. **High cohesion** is the goal and means the module does one well-defined job.

The classic scale runs from worst to best:

**Coincidental** cohesion is the worst: elements grouped for no reason at all, the `Utils` class everything gets dumped into. **Logical** groups things that sound similar but are unrelated in practice, like one class handling every kind of input device. **Temporal** groups things because they happen at the same time, such as a startup routine. **Procedural** and **communicational** group by sequence and by shared data respectively. **Functional** cohesion is the best: every element contributes to one single, well-defined task.

High cohesion is what the **Single Responsibility Principle** asks for, stated as a design measure rather than a rule.

#### Coupling

**Coupling** measures how strongly one module depends on another. **Low coupling**, also called loose coupling, is the goal.

Worst to best:

**Content** coupling is the worst: one module reaches inside another and modifies its internals directly. **Common** coupling is several modules sharing global mutable state, so any of them can disturb the others. **External** coupling is a shared imposed format or protocol. **Control** coupling is passing a flag that tells the other module which branch to take, which means the caller knows about the callee's internal structure. **Stamp** coupling is passing a whole object when only one field is needed. **Data** coupling is the best: passing exactly the simple parameters required.

The link to the rest of the course: depending on an interface rather than a concrete class is how coupling is lowered in practice, which is the Dependency Inversion Principle again.

#### Why you want both

They pull in the same direction. Splitting a class that does three jobs raises cohesion, and each resulting class ends up with a narrower interface to the others, which lowers coupling. The combined goal, **high cohesion and low coupling**, means a module can be understood, tested and replaced on its own, so a change stays local instead of rippling outward.

#### The Law of Demeter

The **Law of Demeter**, also called the **principle of least knowledge**, says a method should only talk to its immediate collaborators. Specifically, it may call methods on itself, on its own fields, on its parameters, and on objects it creates, but not on objects obtained from those.

The symptom is a chain like `order.getCustomer().getAddress().getCity()`, sometimes called a **train wreck**. The problem is not the typing, it is that the caller now depends on the shape of three classes, so a change in any of them breaks it. The fix is **Tell, Don't Ask**: give `Order` a `getCustomerCity()` method and let it do the walking.

It is a guideline rather than a law. Fluent builders and stream pipelines chain calls deliberately, and they are not violations, because each call returns the same conceptual object rather than exposing a deeper one.

---

### In code

```java
// High coupling and low cohesion: reaches through three objects, and
// the class doing it also has nothing to do with addresses
class ShippingLabelBad {
    String cityFor(Order order) {
        return order.getCustomer().getAddress().getCity();   // train wreck
    }
}

// Lower coupling: Order answers the question itself, so callers
// never learn that Customer or Address exist
class Order {
    private final Customer customer;

    Order(Customer customer) { this.customer = customer; }

    String customerCity() {              // Tell, Don't Ask
        return customer.city();
    }
}

class Customer {
    private final Address address;

    Customer(Address address) { this.address = address; }

    String city() { return address.city(); }
}

class Address {
    private final String city;

    Address(String city) { this.city = city; }

    String city() { return city; }
}
```

```java
// Control coupling: the flag means the caller knows the callee's branches
void report(boolean asPdf) { }

// Better: two intention-revealing methods, no flag
void reportAsPdf() { }
void reportAsCsv() { }
```

---

### What they ask next

**"Can coupling ever be zero?"**
No, and it should not be. Modules that never interact cannot form a system. The aim is for the dependencies that exist to be few, explicit and through stable abstractions.

**"Are high cohesion and low coupling ever in tension?"**
Occasionally. Splitting aggressively for cohesion can produce many small classes that must talk constantly, raising coupling. The judgement is to split along genuine responsibility lines rather than to hit a size target.

**"Is a fluent builder a Law of Demeter violation?"**
Not in spirit. Each call returns the same builder rather than exposing a deeper object, so the caller still knows about only one thing. Streams are the same case.

**"How do you spot high coupling in a code review?"**
Chained getters through several types, flag parameters that pick a branch, shared mutable statics, and classes that import a large number of unrelated packages.

**The common wrong answer** is treating them as opposites, as if cohesion is just the inverse of coupling. They are independent measures: one is about what is inside a module, the other about what crosses its boundary.

---

### Say this in the interview

*"Cohesion measures how well the responsibilities inside one module belong together, and high cohesion is the goal. The scale runs from coincidental cohesion, which is an unrelated dump of code, through logical, temporal, procedural and communicational, up to functional cohesion where everything serves one task. That is the Single Responsibility Principle expressed as a measure.*

*Coupling measures how strongly modules depend on each other, and low coupling is the goal. From worst to best it runs content coupling, where one module edits another's internals, then common coupling through shared global state, external, control coupling via a flag that selects a branch, stamp coupling where a whole object is passed for one field, and finally data coupling, passing just the parameters needed.*

*High cohesion and low coupling together mean a module can be understood, tested and replaced in isolation, so changes stay local.*

*The Law of Demeter, or principle of least knowledge, says a method should only call methods on itself, its fields, its parameters and objects it creates. A chain like order.getCustomer().getAddress().getCity() is a train wreck, because the caller depends on three classes at once. The fix is Tell, Don't Ask: ask the order for the city and let it do the walking."*
