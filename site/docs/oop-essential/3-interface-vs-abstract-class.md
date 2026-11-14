---
id: 3-interface-vs-abstract-class
title: "Interfaces vs. Abstract Classes"
description: "A contract anyone can sign against a half-built family member, and why the half-built one still has a constructor"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What's the actual difference between an abstract class and an interface? How do you decide which one to use, and why does an abstract class get a constructor if you can never instantiate it directly?"

---

### Picture it

Two ways to say "things of this sort must be able to do these jobs".

**A certificate anyone can earn.** "Can be driven" is a capability. A car has it, a tractor has it, and so does a go-kart. They share nothing else: no common parts, no shared history, no family resemblance. The certificate only lists what the holder must be able to do, and says nothing about what they are made of.

**A half-built family model.** "Vehicle" is not a capability, it is a kind of thing. Every vehicle in the range has a chassis and a registration number, already built and shared. What is left unfinished is the engine, because each model fits its own. You cannot drive the half-built model off the lot, but everything built from it starts with the finished parts already in place.

The certificate is an interface. The half-built model is an abstract class. One describes what you can do, the other describes what you partly are.

---

### The proper terms

#### Interface

An **interface** is a **contract**: a list of method signatures that any class claiming it must provide. A class that takes it on **implements** the interface, and a class may implement **any number** of them.

Because it only names operations, an interface traditionally holds no **state**. Fields declared in one are implicitly `public static final`, which makes them shared constants, not per-object data.

The relationship it models is **CAN-DO**, or a capability. `Driveable`, `Comparable` and `Serializable` all read as things an object is able to do rather than things it is.

#### Abstract class

An **abstract class** is a partially built base. It can hold ordinary fields, **concrete methods** with bodies, and **abstract methods** that are declared without a body for subclasses to fill in. A class joins it by using **extends**, and it may extend only **one** class.

That single-parent limit is not arbitrary. Allowing several parents, each with its own fields, raises the question of which copy of the state a child should get, which is the **diamond problem**. Java sidesteps it by permitting many interfaces and only one superclass.

The relationship it models is **IS-A**, the same as ordinary inheritance.

#### Why an abstract class has a constructor

This part trips people up because "cannot be instantiated" sounds like "never runs".

An abstract class cannot be instantiated on its own, but it still owns fields, and those fields have to be initialised before any subclass code can rely on them. When you create a subclass, its constructor implicitly calls the parent's constructor first through **constructor chaining**. The abstract class's constructor runs as part of building the subclass instance.

So the constructor exists not to create an object of that class, but to initialise the part of a subclass object that this class contributes.

#### Choosing between them

Reach for an interface when unrelated classes need the same capability, when you expect a class to need several such capabilities, or when you want to keep implementations free to choose their own base class.

Reach for an abstract class when the implementations genuinely are a family, and when there is real shared state or shared code worth writing once.

---

### In code

```java
// Interface: a capability, with no state and no implementation
interface Driveable {
    void drive();
    void stop();
}

// Abstract class: a family with shared state and a shared constructor
abstract class Vehicle {
    private final String registration;   // real state, owned here
    private int odometer;

    protected Vehicle(String registration) {
        this.registration = registration;   // runs when a subclass is built
        this.odometer = 0;
    }

    public String getRegistration() {       // concrete: written once, shared
        return registration;
    }

    protected void addDistance(int km) {
        odometer += km;
    }

    public abstract void startEngine();     // abstract: each model differs
}

// One superclass, any number of interfaces
class Car extends Vehicle implements Driveable {
    Car(String registration) {
        super(registration);                // constructor chaining upward
    }

    @Override
    public void startEngine() {
        System.out.println("turn the key");
    }

    @Override
    public void drive() {
        addDistance(10);
    }

    @Override
    public void stop() { }
}

// Shares the capability without sharing the family
class GoKart implements Driveable {
    @Override
    public void drive() { }

    @Override
    public void stop() { }
}
```

`GoKart` is the argument for interfaces in a single class. It is driveable, but it has no registration and no odometer, so forcing it under `Vehicle` would hand it state that means nothing.

---

### What they ask next

**"Can an abstract class have no abstract methods at all?"**
Yes. Marking a class abstract only prevents instantiation. It is a legitimate way to say "this exists to be extended", even when every method already has a body.

**"Can an interface have a constructor?"**
No. Constructors initialise state, and an interface has none to initialise. There is also nothing to chain to, since an interface is never part of an object's construction.

**"If a class implements two interfaces that declare the same method, is that a conflict?"**
Not for plain abstract methods. The class provides one implementation and it satisfies both contracts, since the signatures are identical and neither carries a body. Conflicts only appear once interfaces can supply implementations, which is the Java 8 story.

**"Why can a class implement many interfaces but extend only one class?"**
Because interfaces traditionally carry no state. Multiple inheritance of state forces a choice about which copy a child gets, and Java avoids that by allowing multiple inheritance of type only.

**The common wrong answer** is "an interface is just an abstract class with no implementations". That stopped being true in Java 8, and it never explained the single-inheritance rule. State is the real dividing line.

---

### Say this in the interview

*"An interface is a contract of method signatures that models a CAN-DO capability. A class implements it, and may implement any number of interfaces. It traditionally holds no state, since its fields are implicitly public static final constants.*

*An abstract class is a partially built base that models an IS-A relationship. It can hold fields, concrete methods and abstract methods, and a class extends exactly one of them. The single-parent limit exists because multiple inheritance of state leads to the diamond problem, so Java allows many interfaces but one superclass.*

*An abstract class has a constructor because it owns fields that need initialising. It is never instantiated alone, but when a subclass is created, constructor chaining runs the abstract class's constructor to set up the part of the object it contributes.*

*I choose an interface when unrelated classes need the same capability, and an abstract class when the implementations are a genuine family with shared state or shared code."*
