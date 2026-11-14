---
id: 7-this-keyword
title: "The this Keyword: Variable Shadowing, Chaining & Inner Classes"
description: "A reference to the object currently running the method, and the cases where you cannot do without it"

sidebar_position: 7
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What exactly is `this`? Give me cases where you're actually forced to use it, and tell me what happens in static methods and inner classes."

---

### Picture it

Imagine a form that a clerk fills in while serving one particular customer.

Most of the time the clerk writes "the balance" and everyone knows whose balance is meant, because there is one customer in front of them. The word "my" is unnecessary.

It becomes necessary the moment a second thing shares the name. If the customer hands over a slip also labelled "balance", the clerk has to distinguish **my balance** from **the one you just gave me**. Same word, two meanings, and only one of them belongs to the account.

`this` is that word "my". It is almost always optional, and the interesting cases are the ones where leaving it out changes the meaning or loses information.

---

### The proper terms

#### What it refers to

**`this`** is a reference to **the object on which the current method was invoked**, the **current instance**. Every **instance method** and every constructor receives it implicitly.

Because it is a reference to an instance, it does not exist in a **static** context. A `static` method belongs to the class and runs without any object, so using `this` inside one is a compile error.

#### Where it is genuinely required

**Resolving shadowing.** When a parameter or local variable has the same name as a field, the nearer declaration wins, which is called **variable shadowing**. Inside that scope the plain name refers to the parameter, so `this.name` is the only way to reach the field. This is why constructors and setters so often use it.

**Constructor chaining.** `this(...)` as the first statement calls another constructor in the same class. This is a different use of the keyword, not a reference but a delegation.

**Passing the current object.** Registering a listener with `register(this)`, or returning the current object, both need an explicit reference. There is no implicit way to hand yourself over.

**Method chaining.** Returning `this` from a setter lets calls be strung together, which is the **fluent interface** or builder style.

**Reaching the outer instance.** Inside an **inner class**, plain `this` refers to the inner object. To reach the enclosing one you write **`Outer.this`**, which is called a **qualified this**.

#### Inner classes and the hidden reference

A non-static **inner class** silently holds a reference to the instance of the enclosing class that created it. That is what makes `Outer.this` possible, and it has a consequence worth stating: as long as the inner object is alive, the outer one cannot be garbage collected. A long-lived inner object can therefore keep a large outer object in memory, which is a classic leak.

A **static nested class** has no such reference, which is why it is the default choice unless the link to the enclosing instance is actually needed.

#### Lambdas behave differently

Inside a **lambda expression**, `this` refers to the **enclosing instance**, not to the lambda. Lambdas do not introduce a new scope for it. An **anonymous inner class** does the opposite: `this` there refers to the anonymous object itself. This difference catches people converting one to the other.

---

### In code

```java
class Account {
    private String owner;
    private double balance;

    Account(String owner) {
        this(owner, 0);                  // chaining: delegate to the fuller one
    }

    Account(String owner, double balance) {
        this.owner = owner;              // required: parameter shadows the field
        this.balance = balance;
    }

    Account deposit(double amount) {
        this.balance += amount;          // optional here: nothing shadows it
        return this;                     // required: fluent chaining
    }

    void audit(Auditor auditor) {
        auditor.record(this);            // required: hand over the current object
    }

    class Statement {                    // inner class: holds the outer reference
        String line() {
            return Account.this.owner;   // qualified this reaches the enclosing object
        }
    }

    static Account empty() {
        // return this;                  // compile error: no instance in a static method
        return new Account("none");
    }
}

interface Auditor { void record(Account a); }
```

The chained form reads `new Account("Ada").deposit(50).deposit(25)`, and only works because `deposit` returns `this`.

---

### What they ask next

**"Can you assign to `this`?"**
No. It is a final reference, so `this = somethingElse` will not compile. It names the current object and cannot be redirected.

**"What does `this` mean inside a lambda?"**
The enclosing instance, because a lambda does not create a new `this` scope. Inside an anonymous inner class it refers to the anonymous object instead, which is the difference to watch when converting between the two.

**"Why does leaving out `this` in a setter break it?"**
Writing `name = name` assigns the parameter to itself, since the parameter shadows the field. The field is never touched and the compiler usually warns, but it compiles.

**"How does an inner class cause a memory leak?"**
It holds an implicit reference to the enclosing instance. If the inner object outlives its natural scope, by being registered as a listener for example, the outer object stays reachable and cannot be collected. Using a static nested class removes the reference.

**"Is `this` passed as a real argument?"**
Effectively yes. Instance methods receive it as a hidden first parameter, which is what `invokevirtual` uses to find the object's class and dispatch the call.

**The common wrong answer** is "`this` refers to the current class". It refers to the current **object**. That distinction is exactly why it is unavailable in static methods.

---

### Say this in the interview

*"`this` is a reference to the current instance, the object the method was invoked on. It is implicitly available in every instance method and constructor, and does not exist in a static context, since a static method belongs to the class and runs without an object.*

*It is required in a few cases. It resolves variable shadowing, where a parameter has the same name as a field, which is the usual constructor and setter case. As this(...) in the first statement it performs constructor chaining. It is needed to pass the current object to something else, and to return the current object for a fluent interface.*

*Inside an inner class, plain this is the inner object, so reaching the enclosing one uses a qualified this, written Outer.this. A non-static inner class holds an implicit reference to its enclosing instance, which can keep that instance from being garbage collected, so a static nested class is preferred unless the link is needed. In a lambda expression, this refers to the enclosing instance rather than the lambda, which differs from an anonymous inner class."*
