---
id: 4-interface-vs-abstract-class-java8
title: "Interfaces vs. Abstract Classes: Modern Java Differences"
description: "Interfaces got method bodies in Java 8, and state is what still separates them"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Since Java 8 let interfaces have real implementations, the line between interfaces and abstract classes got blurry. What's actually still different between them?"

---

### Picture it

Before Java 8, the certificate from the previous question listed only what the holder must be able to do. Every line was blank, and every holder filled in all of them.

Java 8 let the certificate come with some lines **already filled in**, as sensible defaults the holder may accept or cross out. That was done for a hard practical reason: Java wanted to add methods like `forEach` to `List`, and every existing class implementing `List` anywhere in the world would have broken overnight. A filled-in default meant old classes kept compiling and gained the new method for free.

So interfaces gained bodies. What they still do not have is a **locker**. The half-built family model owns real parts with real serial numbers that each finished vehicle carries around. The certificate, however many lines it fills in for you, never gives you anything to keep.

---

### The proper terms

#### What interfaces gained

Java 8 added **default methods**, declared with the `default` keyword and carrying a body. An implementing class inherits the body and may override it. These exist primarily for **backwards compatibility**, allowing an interface to grow without breaking every implementation.

Java 8 also added **static methods** on interfaces, for helpers that belong to the contract but are not inherited by implementations.

Java 9 added **private methods** on interfaces, so that several default methods can share logic without that helper leaking into the public contract.

#### What still differs

**State.** This is the real line. An abstract class can hold **instance fields**, which give every object its own data. An interface cannot. Its fields are implicitly `public static final`, so they are shared constants, not per-object state. A default method can only work with what it is handed or what it can call, never with fields of its own.

**Constructors.** An abstract class has one and takes part in **constructor chaining**. An interface has none, because there is no state to initialise.

**Inheritance count.** One superclass, any number of interfaces. The reason is the same: multiple inheritance of **behaviour** is manageable, multiple inheritance of **state** is not.

**Access modifiers.** Interface methods are implicitly `public`, so you cannot declare a `protected` member of a contract. An abstract class can use the full range.

#### When two defaults collide

Once interfaces carry bodies, a class can inherit two different versions of the same method. Java resolves it with three rules, in order.

**A class always wins.** A method inherited from a superclass beats any default method, however specific the interface.

**The more specific interface wins.** If one interface extends the other, the child interface's default is chosen.

**Otherwise it is a compile error.** Two unrelated interfaces offering the same default leave the compiler with no basis to choose, so it refuses. The class must override the method explicitly, and it can delegate to a chosen parent with `Interface.super.method()`.

---

### In code

```java
interface Greeter {
    String name();                       // abstract: implementer must supply

    default String greet() {             // default: a body, overridable
        return prefix() + name();
    }

    private String prefix() {            // Java 9: shared helper, not public
        return "Hello, ";
    }

    static Greeter of(String fixed) {    // static: helper, not inherited
        return () -> fixed;
    }
}

interface Shouter {
    default String greet() {
        return "HELLO";
    }
}

// Two unrelated defaults: this will not compile without an override
class Host implements Greeter, Shouter {
    @Override
    public String name() {
        return "Ada";
    }

    @Override
    public String greet() {
        return Greeter.super.greet();    // pick a parent explicitly
    }
}
```

Note what `Greeter` still cannot do. It can compute a greeting, but it cannot store one. If the greeting needed to be remembered and changed per object, only an abstract class could hold it.

---

### What they ask next

**"If interfaces can have method bodies now, why keep abstract classes at all?"**
State and constructors. The moment a base needs per-object fields, or has to initialise something before subclass code runs, only an abstract class works.

**"Can a default method call an abstract method of the same interface?"**
Yes, and that is the usual design. The default supplies the general algorithm and leans on abstract methods for the parts each implementation defines, which is the template method pattern expressed in an interface.

**"Can a default method override a method from `Object`, like `toString`?"**
No. Java forbids it, because every class already inherits those from `Object`, and the class-wins rule would make the default unreachable anyway.

**"Are default methods a way to get multiple inheritance in Java?"**
Multiple inheritance of behaviour, yes. Multiple inheritance of state, no, and that is the distinction worth drawing, since state is what made multiple inheritance hard in the first place.

**The common wrong answer** is "there is no real difference any more". There is, and naming state and constructors shows you understand why the restriction existed rather than just which keyword to type.

---

### Say this in the interview

*"Java 8 gave interfaces default methods, which carry a body, mainly for backwards compatibility so that interfaces like List could gain methods without breaking existing implementations. It also added static methods, and Java 9 added private methods for sharing logic between defaults.*

*What still separates them is state. An abstract class can hold instance fields and has a constructor that participates in constructor chaining. An interface cannot: its fields are implicitly public static final constants, and it has no constructor because there is no per-object state to initialise. A class extends one superclass but implements any number of interfaces, because multiple inheritance of behaviour is tractable while multiple inheritance of state is not. Interface methods are also implicitly public, so a contract cannot have protected members.*

*When two defaults collide, the rules are: a class always wins over any interface, the more specific interface wins when one extends the other, and otherwise it is a compile error that the class must resolve by overriding, optionally delegating with Interface.super.method()."*
