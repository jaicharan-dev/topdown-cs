---
id: 2-code-trace-this-super-chaining
title: "Code Trace: this() and super() Constructor Chaining"
description: "The instance initializer runs exactly once, in whichever constructor called super(), which is almost never the one the caller invoked"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact output of this code in order? Explain why a constructor can never call both `this()` and `super()`, how instance initializer blocks behave during delegation, and what happens if constructor chaining forms a cycle."

```java
class Vehicle {
    Vehicle() {
        System.out.println("1. Vehicle no-arg");
    }
    Vehicle(String type) {
        System.out.println("1. Vehicle: " + type);
    }
}

class Car extends Vehicle {
    {
        System.out.println("2. Car instance initializer");
    }
    Car() {
        this("Sedan");
        System.out.println("4. Car no-arg constructor");
    }
    Car(String model) {
        super("Car - " + model);
        System.out.println("3. Car parameterized: " + model);
    }
    public static void main(String[] args) {
        new Car();
    }
}
```

**Before you scroll.** Four lines print. Two questions decide the whole answer: which of `Vehicle`'s two constructors runs, and **how many times** does the instance initializer block run, given that two `Car` constructors are involved in building one object.

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
1. Vehicle: Car - Sedan
2. Car instance initializer
3. Car parameterized: Sedan
4. Car no-arg constructor
```

`Vehicle()` never runs at all, and the instance initializer runs exactly once, inside `Car(String)` rather than inside the `Car()` the caller actually invoked.

</details>

---

### Picture it

A relay where only the last runner carries the baton to the line, and the handovers happen in the opposite order to the finishing.

You call for a car with no arguments. That constructor does not build anything; **its first act is to hand the job to a better-equipped colleague**, the one that takes a model name, with "Sedan" filled in as the default. So `Car()` immediately stops and waits.

The colleague does build something, and its first act is also a handover, but **upward rather than sideways**: it asks the superclass to construct the part of the object that `Vehicle` owns. That is the rule that makes the whole thing orderly, because an object cannot be partly built from the top down; the inherited half has to exist before the added half can rest on it.

So the finishing order is the reverse of the calling order. **`Car()` was invoked first and prints last**, because it spent its entire existence waiting for the work it delegated.

Now the question the code is really asking, which is about the shelves.

There is a block of fitting-out work that belongs to every `Car` regardless of which constructor was called. **It must happen exactly once per car**, because a car with its shelves put up twice is as broken as one with none. And two `Car` constructors are involved in building this single car.

So the language has to pick one of them to be responsible, and the choice is not arbitrary. **The one that talks to the superclass is the one that does it**, because that is the moment the inherited half is finished and the added half can begin. A constructor that merely hands sideways to a sibling has not reached that moment and must not do the work; the sibling will.

That single rule explains the position of line 2 in the output, and it is the thing most answers get wrong by putting the initializer either first or last.

---

### The proper terms

#### The two kinds of delegation

An **explicit constructor invocation** is a call to another constructor as the **first statement** of a constructor body. There are exactly two forms:

**`this(...)`** delegates **sideways**, to another constructor of the same class. This is **constructor chaining**, the usual way to express default arguments in a language that has none.

**`super(...)`** delegates **upward**, to a constructor of the direct superclass.

**JLS §8.8.7** requires it to be the first statement, and that single requirement is the whole answer to why you cannot have both: there is only one first statement. It is not an arbitrary prohibition, it falls out of the grammar.

If a constructor body begins with neither, the compiler inserts an implicit `super()` with no arguments. If the superclass has no accessible no-argument constructor, that insertion fails and you get a compile error, which is the real reason adding a parameterised constructor to a superclass can break subclasses that previously compiled.

#### Where the instance initializers go

**JLS §12.5** is precise, and the clause that decides this problem is easy to miss. During instance creation, after the superclass constructor completes, the JVM runs **this class's instance initializers and instance field initializers in textual order**, and then the rest of the constructor body.

Critically, that step belongs to the constructor that invoked `super(...)`, explicitly or implicitly. A constructor whose first statement is `this(...)` skips the step entirely, because the constructor it delegated to will perform it.

The guarantee is therefore: **instance initializers run exactly once per object**, in the one constructor in the delegation chain that reached the superclass. Without that rule a chain of three constructors would run the initializers three times.

#### What you may not pass to the delegate

**JLS §8.8.7.1** forbids the arguments of an explicit constructor invocation from referring to any instance variable of the class being constructed, or to `this` in any form.

The reason is a sequencing fact rather than a style preference: at that moment **the superclass constructor has not run and the instance initializers have not run**, so every instance field is still at its default value. Allowing it would let you pass a field that is guaranteed to be `null` or `0` and silently get the wrong object.

```java
class Car extends Vehicle {
    private String defaultModel = "Sedan";
    Car() {
        super(defaultModel);   // compile error: cannot reference
    }                          // defaultModel before the superclass
}                              // constructor has been called
```

The idiomatic replacement is a **static** method or a literal, since statics exist before any instance does:

```java
class Car extends Vehicle {
    private static String defaultModel() { return "Sedan"; }
    Car() { super(defaultModel()); }        // legal
}
```

#### Cycles

A delegation cycle is a **compile-time** error, not a runtime stack overflow:

```java
class Cycle {
    Cycle()        { this(1); }
    Cycle(int x)   { this(); }     // error: recursive constructor invocation
}
```

The compiler can see the whole graph of `this(...)` edges within a class, so it rejects any cycle statically. This is one of the places where Java detects unbounded recursion at compile time, which it cannot do for ordinary method calls.

---

### Why it does that, step by step

| Step | What runs | Why | Output |
| :---: | :--- | :--- | :--- |
| 1 | `new Car()` enters `Car()` | | |
| 2 | first statement is `this("Sedan")`, so `Car()` **delegates and stops** | §8.8.7 | |
| 3 | `Car(String model)` begins with `model = "Sedan"` | | |
| 4 | first statement is `super("Car - " + model)`, so the argument is evaluated to `"Car - Sedan"` | | |
| 5 | `Vehicle(String type)` runs | the `String` overload is selected, so `Vehicle()` never runs | `1. Vehicle: Car - Sedan` |
| 6 | the superclass is complete, so **`Car`'s instance initializers run here** | §12.5, and this constructor is the one that called `super` | `2. Car instance initializer` |
| 7 | the remainder of `Car(String)`'s body runs | | `3. Car parameterized: Sedan` |
| 8 | control returns to `Car()`, which **does not** run the initializers | it delegated with `this(...)` | |
| 9 | the remainder of `Car()`'s body runs | | `4. Car no-arg constructor` |

Three things in that trace are worth stating separately, because each is a place answers go wrong.

**`Vehicle()` is never called.** The `super("Car - " + model)` call selects the `String` overload. People expect the no-argument superclass constructor to run because `new Car()` had no arguments, but overload selection happens at the `super` call site and knows nothing about how the chain started.

**The instance initializer appears between two `Car` constructors in the output.** Not before them, not after them. It runs at the exact moment the inherited half of the object is finished, which is inside `Car(String)` after `super(...)` returns and before that constructor's own body.

**The declared order of the constructors in the file is irrelevant.** `Car()` is written above `Car(String)`, and the output ends with `Car()`'s line. The order is determined by the delegation graph, not by textual position.

#### Why the output numbering is reversed from the call order

| Invoked | Prints | Position in the output |
| :--- | :--- | :---: |
| `Car()` first | `4. Car no-arg constructor` | last |
| `Car(String)` second | `3. Car parameterized` | third |
| `Vehicle(String)` third | `1. Vehicle: Car - Sedan` | **first** |

**The call order and the completion order are exact opposites**, because a delegating constructor's body is everything after the handover. `Car()` is on the stack for the whole run and contributes its line only when everything it waited for has finished. This is the same shape as any nested call, and it reads as a surprise only because constructors feel like they should run in the order you named them.

#### What a third link would do

```java
Car()               { this("Sedan"); ... }
Car(String model)   { this(model, 4); ... }
Car(String m, int d){ super("Car - " + m); ... }   // only this one
```

With three links, only `Car(String, int)` calls `super`, so **the instance initializer still runs exactly once**, inside that constructor. The other two contribute only their own bodies, in reverse order of invocation. The guarantee holds for a chain of any length, which is precisely what the §12.5 rule is for.

---

### What they ask next

**"Why can a constructor never call both `this()` and `super()`?"**
Because **JLS §8.8.7** requires an explicit constructor invocation to be the **first statement**, and a body has only one first statement. It is a consequence of the grammar rather than a special prohibition. The deeper reason it is harmless is that `this(...)` guarantees the superclass will be reached by the constructor it delegates to, so the superclass is still constructed exactly once.

**"How many times does the instance initializer run, and where?"**
**Exactly once per object**, in whichever constructor in the chain invoked `super(...)`. Here that is `Car(String)`, not the `Car()` the caller actually invoked. A constructor beginning with `this(...)` skips the step entirely, which is what keeps the count at one however long the chain is.

**"Why does the output start with `Vehicle`'s line and end with `Car()`'s?"**
Because the call order and completion order are opposites. `Car()` hands off as its first statement, so its own body is the last thing to run; `Vehicle(String)` is the deepest call and finishes first. **A delegating constructor's body is everything after the handover**, so it contributes at the end.

**"Which `Vehicle` constructor runs?"**
Only `Vehicle(String)`. **`Vehicle()` is never called.** Overload selection happens at the `super("Car - " + model)` call site and is unaffected by the fact that `new Car()` took no arguments.

**"Why is `super(defaultModel)` a compile error?"**
**JLS §8.8.7.1** forbids the arguments of an explicit constructor invocation from referring to any instance variable or to `this`. At that point the superclass constructor has not run and the instance initializers have not run, so **every instance field is still at its default**, and passing one would silently pass `null` or `0`. The fix is a `static` method or a literal, because statics exist before any instance does.

**"What happens if the chain forms a cycle?"**
A **compile-time** error, `recursive constructor invocation`, not a runtime `StackOverflowError`. The compiler can see every `this(...)` edge within a class, so it rejects the cycle statically. It is one of the few places Java detects unbounded recursion at compile time.

**"What if the superclass has no no-argument constructor?"**
Then a subclass constructor that begins with neither `this(...)` nor `super(...)` fails to compile, because the compiler's **implicit `super()`** has nothing to bind to. This is the mechanism by which adding a parameterised constructor to a superclass, which removes the default one, breaks subclasses that previously compiled, and it is a genuinely surprising source of build failures in a large hierarchy.

**"Is constructor chaining the right way to express default arguments?"**
It is the conventional way, and it scales poorly. With several optional parameters you get a telescoping family of constructors that is hard to read at the call site, because the arguments are positional and unlabelled. **That is the problem the Builder pattern addresses**, and in Java the honest answer is that chaining is fine for two or three and a builder or a parameter object is better beyond that.

**"Does the order the constructors are declared in matter?"**
No. `Car()` is declared above `Car(String)` and prints last. The sequence follows the delegation graph, not textual position. The one place textual order does matter is **among the instance initializers and field initializers themselves**, which run in the order they appear.

**The common wrong answer** is putting the instance initializer first, as though it ran before any constructor, or last, as though it were cleanup. It runs inside `Car(String)`, between the superclass completing and that constructor's own body. Next is reporting `1. Vehicle no-arg`, on the assumption that `new Car()` with no arguments selects the no-argument superclass constructor. Third is running the initializer twice, once per `Car` constructor involved. And last is claiming a cycle produces a `StackOverflowError`, when the compiler rejects it outright.

---

### Say this in the interview

*"The output is Vehicle's parameterised line, then the Car instance initializer, then Car's parameterised constructor, then Car's no-arg constructor. Two rules produce that, and the second one is the interesting one.*

*First, delegation. An explicit constructor invocation has to be the first statement of a constructor body, per JLS 8.8.7, and there are exactly two forms: this, which delegates sideways to another constructor of the same class and is what constructor chaining means, and super, which delegates upward. That single first-statement requirement is also the complete answer to why you can never have both: a body has only one first statement, so it falls out of the grammar rather than being a special prohibition. And it is harmless, because a this delegation guarantees the constructor it hands to will reach the superclass, so the superclass is still constructed exactly once.*

*So new Car enters the no-arg constructor, whose first statement is this of "Sedan", and it immediately delegates and stops. Car of String begins, its first statement is super of "Car - Sedan", so Vehicle's String constructor runs and prints first. Worth saying explicitly: Vehicle's no-arg constructor is never called at all. Overload selection happens at the super call site and knows nothing about the fact that new Car took no arguments.*

*Now the second rule, which is the one the question is really about. JLS 12.5 says that after the superclass constructor completes, this class's instance initializers and instance field initializers run in textual order, and then the rest of the constructor body. The clause people miss is that this step belongs to the constructor that invoked super. A constructor whose first statement is this skips it entirely, because the constructor it delegated to will do it. So the guarantee is that instance initializers run exactly once per object, in whichever constructor in the chain reached the superclass. Here that is Car of String, not the Car the caller actually invoked. Without that rule, a chain of three constructors would run the initializers three times.*

*That is why the initializer line sits between the two Car constructor lines: it runs at the exact moment the inherited half of the object is finished and the added half can begin. And the overall order is reversed from the call order because a delegating constructor's body is everything after the handover, so the no-arg constructor is on the stack the whole time and contributes its line last. The declared order of the constructors in the file is irrelevant; the delegation graph decides.*

*Three follow-ups I would have ready. Passing an instance field to super is a compile error under 8.8.7.1, because at that point the superclass constructor has not run and the instance initializers have not run, so every instance field is still at its default and you would be silently passing null or zero. The fix is a static method or a literal, since statics exist before any instance does. A delegation cycle is a compile-time error, recursive constructor invocation, not a runtime StackOverflowError, because the compiler can see every this edge within the class and rejects it statically. And if the superclass has no accessible no-argument constructor, a subclass constructor that starts with neither this nor super fails to compile, because the compiler's implicit super call has nothing to bind to, which is exactly how adding a parameterised constructor to a superclass breaks subclasses that used to compile.*

*If they push on design, chaining is the conventional way to express default arguments in a language that has none, and it scales badly: several optional parameters give you a telescoping family of constructors whose call sites are rows of unlabelled positional arguments. That is the problem the Builder pattern exists to solve, and I would say chaining is fine for two or three parameters and a builder or a parameter object is better beyond that."*
