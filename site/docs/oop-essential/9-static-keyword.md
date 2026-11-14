---
id: 9-static-keyword
title: "The static Keyword: Class vs. Instance Memory & Method Hiding"
description: "Belonging to the class rather than to any object, and why that rules out overriding"

sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What does the 'static' keyword actually mean, where are static members stored in memory, and why can't you override a static method? Also, why should you prefer static nested classes over inner classes?"

---

### Picture it

Think of a chain of coffee shops.

**Each shop has its own till.** Open a new branch and it gets its own till with its own takings. That is an ordinary field: every object has a separate copy.

**The chain has one price list.** There is exactly one, held centrally. Every branch reads the same one, and a change there changes it for all of them at once. That is a static field: one copy, owned by the class.

**A question about the price list does not need a branch.** "What does a flat white cost?" is answerable from head office, with no branch involved. That is a static method: callable without any object.

And now the part that matters for overriding. A branch can have its own house rule for serving customers, and which rule applies depends on the branch you walk into. But the price list is not something a branch owns, so a branch cannot have its own version of it. There is nothing to choose between at the door.

---

### The proper terms

#### What static means

**`static`** means the member belongs to the **class** rather than to any **instance**. There is exactly one copy, shared by every object, and it exists whether or not any object has been created.

A **static field**, sometimes called a **class variable**, is that single shared copy. A plain field is an **instance variable**, with one copy per object.

A **static method** can be called on the class itself. Because no instance is involved, it has no `this`, and therefore cannot access instance fields or call instance methods directly.

#### Where they live

Since Java 8, static fields are stored in the **Metaspace**, the native-memory area holding class metadata. The objects they point at still live on the **heap** like any other object; only the variable slot itself sits with the class.

Before Java 8 this area was the **PermGen** space, which had a fixed size and produced the familiar `OutOfMemoryError: PermGen space`. Metaspace grows into native memory instead, which is the headline change worth naming.

**Static initialiser blocks** run once, when the class is first loaded by the **class loader**, before any instance exists.

#### Why a static method cannot be overridden

**Overriding** is resolved by **dynamic dispatch**: the JVM follows the object to its class and looks the method up there. A static method is not reached through an object, so there is nothing to follow. The call is bound at **compile time** from the **reference type**.

Declaring a static method in a subclass with the same signature is legal, but it is **method hiding**, not overriding. Both methods exist, and which one runs depends on the declared type of the reference, not the object it holds. This is why calling a static method through an instance variable is discouraged and usually flagged by linters.

#### Static nested classes versus inner classes

A **static nested class** is a class declared `static` inside another. It is simply a class that happens to be namespaced inside its enclosing one, with no link to any instance.

A non-static **inner class** holds an implicit reference to the **enclosing instance** that created it. That reference is what allows `Outer.this`, and it is also the problem: while the inner object is reachable, the outer one cannot be **garbage collected**. An inner object that outlives its intended scope therefore pins the whole enclosing object in memory, which is a common **memory leak**.

So the preference is: make a nested class static unless it genuinely needs access to the enclosing instance's state.

---

### In code

```java
class Branch {
    private static int branchCount = 0;      // one copy for the whole class
    private static final String CHAIN = "Beans";

    private double tillTotal = 0;            // one copy per object

    static {                                 // runs once, at class loading
        System.out.println("chain opening");
    }

    Branch() {
        branchCount++;                       // every branch updates the shared count
    }

    static int howManyBranches() {           // no instance needed
        // return tillTotal;                 // compile error: no instance, no this
        return branchCount;
    }

    static String chain() { return CHAIN; }

    // Static nested: no reference to any Branch instance
    static class PriceList {
        double priceOf(String item) { return 2.80; }
    }

    // Inner: silently holds a reference to the Branch that created it
    class DailyReport {
        double total() { return tillTotal; } // can reach instance state
    }
}

class CityBranch extends Branch {
    static String chain() { return "Beans City"; }   // hiding, not overriding
}

public class Demo {
    public static void main(String[] args) {
        Branch b = new CityBranch();
        System.out.println(Branch.chain());      // "Beans": reference type decides
        System.out.println(CityBranch.chain());  // "Beans City"

        Branch.PriceList list = new Branch.PriceList();      // no instance needed
        Branch.DailyReport report = new Branch().new DailyReport();  // needs one
    }
}
```

The two constructions at the end show the difference plainly. The static nested class is built on its own; the inner class can only be built from an existing `Branch`, because it has to capture one.

---

### What they ask next

**"Can a static method access an instance variable?"**
Not directly, because there is no `this`. It can if it is handed an object, since then it has a specific instance to read from.

**"Can you overload a static method?"**
Yes. Overloading is resolved by signature at compile time, which is exactly how static calls are resolved anyway.

**"Is a static field thread-safe?"**
No. One shared copy across all threads is if anything more exposed, since every thread touches the same variable. It needs the same synchronisation, `volatile`, or atomic types as any shared mutable state.

**"Why is `main` static?"**
Because the JVM has to call it before any object exists. Requiring an instance would raise the question of who creates it and with what arguments.

**"What is the difference between a static nested class and an inner class, in one line?"**
The inner class holds a reference to the enclosing instance and the static nested class does not, which is why the static one is the default choice.

**The common wrong answer** is "static methods can't be overridden because they're final". They are not final. They are excluded because dispatch needs an object and there isn't one.

---

### Say this in the interview

*"Static means the member belongs to the class rather than to any instance. A static field, or class variable, is a single copy shared by every object, as against an instance variable which exists once per object. A static method is callable on the class, has no this, and therefore cannot touch instance state directly.*

*Since Java 8 static fields live in Metaspace, the native-memory area for class metadata, replacing the old fixed-size PermGen. The objects they reference still sit on the heap. Static initialiser blocks run once when the class loader first loads the class.*

*A static method cannot be overridden because overriding relies on dynamic dispatch through an object, and a static call has no object to dispatch on. It is bound at compile time from the reference type. Declaring the same signature in a subclass is method hiding, not overriding, and the reference type decides which runs.*

*A static nested class has no link to an enclosing instance, while an inner class holds an implicit reference to one. That reference keeps the enclosing object from being garbage collected, which is a common memory leak, so I make nested classes static unless they need the enclosing instance."*
