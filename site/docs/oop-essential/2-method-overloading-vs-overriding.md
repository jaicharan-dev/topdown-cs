---
id: 2-method-overloading-vs-overriding
title: "Method Overloading vs. Overriding"
description: "Same name twice in one class, or replaced once in a subclass, and who decides which runs"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through method overloading versus overriding. What's 'dynamic method dispatch,' and how does the runtime actually resolve it?"

---

### Picture it

Two different situations wear the same clothes, so hold them apart from the start.

**A print shop counter.** You can hand over a document on its own, or a document with a number of copies, or a document with copies and a paper size. You say "print" every time. The clerk decides which job this is by looking at what you put on the counter. Everything they need is in front of them the moment you hand it over.

**A bank's withdraw request.** You have two kinds of account, savings and current, and each handles a withdrawal by its own rules. You hold an account and ask it to withdraw. Nobody can tell which set of rules will run until they look at the account you are actually holding.

The first is one name with several forms, sorted out at the counter. The second is one name with several behaviours, sorted out only when the real object turns up.

---

### The proper terms

#### Method overloading

Several methods in the same class sharing a name but differing in their parameter lists is **method overloading**. The compiler picks one by matching the arguments you passed against each candidate, which is called **overload resolution**.

Because the compiler can finish that work by reading the source, overloading is settled before the program ever runs. That is **compile-time polymorphism**, also called **static binding** or **early binding**.

What counts as the difference matters. The compiler compares the **method signature**, which is the name plus the parameter types in order. The **return type is not part of the signature**, so two methods differing only in return type will not compile.

#### Method overriding

A subclass replacing an inherited method with its own version is **method overriding**. Here the signature must match exactly, because the point is to substitute one behaviour for another.

Which version runs depends on the object's real type, not on the type of the variable holding it, so it cannot be settled until the program runs. That is **runtime polymorphism**, also called **dynamic binding** or **late binding**. The act of choosing the right version at runtime is **dynamic method dispatch**.

Overriding has rules the compiler enforces. The parameter list must be identical. The return type must be the same or a subtype, which is a **covariant return type**. Access cannot be narrower, so a `public` method cannot be overridden as `protected`. The override cannot declare broader checked exceptions than the method it replaces.

#### How dispatch actually works

Each class gets a **virtual method table**, usually shortened to **vtable**: a list of pointers to the method bodies that class will actually run. Every object carries a header pointing at its class, and therefore at that class's vtable.

When the JVM executes an **invokevirtual** instruction, it follows the object to its class, looks the method up in that vtable, and calls what it finds. That is why the variable's declared type is irrelevant. The lookup starts from the object.

#### What cannot be overridden

Three kinds of method are resolved from the reference type instead, so they never take part in dynamic dispatch. **Private** methods are not visible to the subclass at all. **Final** methods are explicitly closed to replacement. **Static** methods belong to the class rather than to any object.

Declaring a static method in a subclass with the same signature compiles, but it is **method hiding**, not overriding, and which one runs depends on the reference type.

---

### In code

```java
class Printer {
    // Overloading: three forms of one name, chosen by the compiler
    void print(String doc) { }
    void print(String doc, int copies) { }
    void print(String doc, int copies, String size) { }

    // Will not compile: the return type is not part of the signature
    // int print(String doc) { return 0; }
}

class Account {
    void withdraw(double amount) {
        System.out.println("generic withdrawal");
    }

    static void describe() {
        System.out.println("an account");
    }
}

class SavingsAccount extends Account {
    // Overriding: identical signature, replaces the parent's behaviour
    @Override
    void withdraw(double amount) {
        System.out.println("savings rules applied");
    }

    // Not overriding: static methods are hidden, not replaced
    static void describe() {
        System.out.println("a savings account");
    }
}

public class Demo {
    public static void main(String[] args) {
        Account account = new SavingsAccount();

        account.withdraw(100);   // "savings rules applied": the object decides
        Account.describe();      // "an account": the reference type decides
    }
}
```

The two calls at the end are the whole lesson. The same variable gives a subclass answer for the overridden method and a parent answer for the hidden one.

The `@Override` annotation is worth using every time. It does nothing at runtime, but if the signature drifts and you accidentally overload instead of override, the compiler catches it.

---

### What they ask next

**"Can two methods differ only by return type?"**
No. The signature is the name and the parameter types, so the compiler sees two identical methods and rejects the class. This holds even though the return types are incompatible, because overload resolution never looks at them.

**"What happens if a subclass declares a static method with the same signature?"**
That is method hiding. Both methods exist, and the one that runs is chosen from the reference type at compile time. Calling it through an instance variable compiles but is misleading, which is why it is usually flagged by linters.

**"Can you overload by changing only the exceptions thrown, or only the access modifier?"**
No. Neither is part of the signature, so both attempts are duplicate methods.

**"Does overloading work across a parent and child class?"**
Yes. The subclass inherits the parent's methods, so a differently shaped method in the subclass joins the same overload set rather than replacing anything.

**The common wrong answer** is calling overloading "runtime polymorphism" because both involve one name. Anchor it on who decides: the compiler for overloading, the object for overriding.

---

### Say this in the interview

*"Method overloading is several methods in one class that share a name but differ in their parameter lists. The compiler performs overload resolution using the method signature, which is the name and parameter types, so it is compile-time polymorphism, also called static binding or early binding. The return type is not part of the signature, so it cannot be used to overload.*

*Method overriding is a subclass replacing an inherited method using an identical signature, with a covariant return type permitted and access that cannot be narrower. The version that runs is chosen from the object's real type at runtime, which is runtime polymorphism, also called dynamic binding or late binding, and the selection itself is dynamic method dispatch. Mechanically, each class has a virtual method table, or vtable, and invokevirtual follows the object to its class and looks the method up there.*

*Private, final and static methods are excluded. Redeclaring a static method in a subclass is method hiding, resolved from the reference type rather than the object."*
