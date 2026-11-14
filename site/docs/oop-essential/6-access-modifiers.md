---
id: 6-access-modifiers
title: "Understanding Access Modifiers"
description: "Four levels of visibility, what happens when you leave one off, and the catch with protected"

sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Walk me through the four access modifiers in Java. What do they actually control, what happens if you leave one off, and what's the catch with `protected` across packages?"

---

### Picture it

Think of an office building with four kinds of door.

**A private office.** Only the person whose name is on it goes in. Nobody else on the floor, nobody from another department.

**A department floor.** Anyone working on that floor can walk between rooms freely. Someone from a different department cannot, even if they are senior.

**A department floor plus the family.** Everyone on the floor, and additionally anyone who trained under this department and moved elsewhere, but only for their own work, not to wander through a colleague's.

**The lobby.** Anyone at all.

Those four doors are `private`, package-private, `protected` and `public`. The third one has the odd rule, and it is the one interviewers go for.

---

### The proper terms

#### The four levels

An **access modifier** controls the **visibility** of a class, field, method or constructor: which other code is permitted to refer to it.

**`private`** is visible only inside the declaring class. This is the tool that makes **encapsulation** real, since it is what stops outside code reaching the data directly.

**Package-private**, also called **default access**, is what you get when you write no modifier at all. It is visible to any class in the same **package**, and invisible outside it. Note that it is not a keyword: the absence of one is the declaration.

**`protected`** is visible within the package, and additionally to **subclasses in other packages**, with a restriction described below.

**`public`** is visible everywhere.

Ordered from most to least restrictive: `private`, package-private, `protected`, `public`.

#### The protected catch

Inside the same package, `protected` behaves exactly like package-private, so nothing surprising happens. The subtlety only appears across a package boundary.

A subclass in another package may access a protected member **through itself or its own subtype**, but not through a plain reference to the superclass. The rule exists so that a subclass can work with the parts it inherited, without being handed a key to every other object of the parent's type.

In practice: inside `Child`, writing `this.protectedField` is fine, and so is accessing it on another `Child`. Writing `someParent.protectedField`, where the variable's type is the parent, is a compile error.

#### Where these can be applied

Only `public` and package-private may be applied to a **top-level class**. A class cannot be `private` or `protected` at the top level, since there would be no enclosing scope for the restriction to mean anything. Nested classes, being members, may use all four.

Members of an **interface** are implicitly `public`, so the restrictive modifiers have no place in a contract. Interface fields are additionally implicitly `static` and `final`.

Access is also checked at **compile time** and is not a security mechanism. Reflection can reach private members, which is how frameworks and serialisation libraries work.

#### An override cannot narrow access

An overriding method may widen access but never narrow it: a `public` method cannot be overridden as `protected`. This preserves **substitutability**, since a subclass instance must be usable wherever the parent type is expected, and silently removing a method would break that.

---

### In code

```java
package shop;

public class Product {
    private double cost;            // this class only
    double margin;                  // package-private: any class in shop
    protected String sku;           // package, plus subclasses anywhere
    public String name;             // everywhere

    private double internalRate() { return 1.2; }

    protected double priceFor(int qty) {
        return cost * internalRate() * qty;
    }
}
```

```java
package warehouse;                  // a different package

import shop.Product;

public class BulkProduct extends Product {

    void demo(Product plainParent, BulkProduct sibling) {
        this.sku = "BULK-1";        // fine: through itself
        sibling.sku = "BULK-2";     // fine: through its own type

        // plainParent.sku = "X";   // compile error: through the parent type
        // this.cost = 10;          // compile error: private stays private
        // this.margin = 0.3;       // compile error: package-private, wrong package
    }
}
```

The two commented-out `sku` lines are the whole protected rule in one place: same member, allowed through `BulkProduct`, refused through `Product`.

---

### What they ask next

**"What is the difference between no modifier and `public`?"**
No modifier is package-private, which confines the member to its own package. It is a real level, not an absence of policy, and it is the default precisely so that things are not exposed by accident.

**"Is `protected` weaker or stronger than package-private?"**
Weaker, meaning more permissive. It includes everything package-private allows and adds subclasses in other packages.

**"Can a top-level class be `private`?"**
No. Only `public` or package-private. A private top-level class would be visible to nothing, so the language forbids it.

**"Does `private` mean another instance of the same class cannot see the field?"**
It can. Access is per class, not per object, so a method of `Product` can read `other.cost` on a different `Product`. This is what makes `equals` and copy constructors straightforward to write.

**"Can an overriding method reduce visibility?"**
No. It may widen but never narrow, because a subclass has to remain usable wherever the parent type is expected.

**The common wrong answer** is "protected means subclasses can access it", stated without the restriction. The cross-package rule is the part being tested.

---

### Say this in the interview

*"An access modifier controls visibility, and there are four levels. Private is the declaring class only, and it is what makes encapsulation real. Package-private, also called default access, is what you get when no modifier is written, and it limits access to the same package. Protected is package access plus subclasses in other packages. Public is everywhere.*

*The catch with protected is across package boundaries: a subclass may access the member through itself or its own subtype, but not through a reference typed as the superclass. The intent is that a subclass can use what it inherited without gaining access to every other instance of the parent.*

*Only public and package-private may apply to a top-level class. Interface members are implicitly public, and their fields are also static and final. Access is enforced at compile time and is not a security boundary, since reflection can bypass it. An overriding method may widen access but never narrow it, because that would break substitutability."*
