---
id: 35-enums-as-classes-singleton
title: "Java Enums as Classes & the Enum Singleton"
description: "Constants that are real objects with constructors and methods, and the only singleton the JVM itself protects"

sidebar_position: 35
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Unlike in C/C++, Java enums are fully-fledged classes. How do constructors, fields, and methods work in Java enums, and why does Joshua Bloch famously advocate the Enum Singleton idiom over traditional Double-Checked Locking (DCL) or Bill Pugh holder singletons?"

---

### Picture it

In older languages, a named constant is **a number wearing a label**. `RED` is really `0`. You can add one to it, compare it to an unrelated constant, pass it where a quantity was expected, and nothing complains, because underneath it was only ever a number.

**A Java enum is a different thing entirely: each constant is a real object.** `RED` is not `0`; it is an instance, created once, that can **hold data** of its own ("the hex code is `#FF0000`"), **answer questions** ("are you a warm colour?"), and **behave differently from its siblings** ("when asked to apply yourself, here is what I specifically do"). The set of them is fixed and known at compile time, which is the only thing it shares with the old idea.

**And now the second half, which is about making exactly one of something.**

Suppose you want a single, unique object that everybody shares. The obvious approaches all have the same shape: **hide the way of making one, and hand out the one you already made.** And they all leak, because hiding something in Java is a convention rather than a wall.

**Somebody can pick the lock.** Reflection opens a private constructor as easily as a public one, and makes a second instance.

**Somebody can reconstitute one from storage.** Writing the object out and reading it back produces a **new** object, so your "one" quietly becomes two.

**And the careful versions are easy to get subtly wrong.** The classic double-check-then-build is famously broken in a way that was invisible for years, needing one keyword nobody remembers.

So people kept building more careful locks on the front door while the window stayed open.

**The enum is different because the guarantee is not in your code.** The language itself says there is exactly one of each constant, and the **lock picker is refused by the JVM**, and the **reconstitution returns the original rather than a copy**. You did not implement uniqueness; you declared it, and something underneath you enforces it.

---

### The proper terms

#### An enum is a class

A Java **enum** is a full class, with a few rules layered on:

**It implicitly extends `java.lang.Enum`**, which is why an enum cannot extend any other class. It **can** implement interfaces, and often should.

**Each constant is a `public static final` instance** of the enum type, created when the class is **initialised**.

**It is implicitly `final`**, unless a constant has a body, in which case the enum is effectively abstract and each such constant is an anonymous subclass.

**Its constructors are implicitly `private`.** You cannot write `new Colour(...)`, and declaring a constructor `public` is a compile error.

#### Constructors, fields and methods

**Constructors** run **once per constant**, in **declaration order**, during class initialisation. The arguments are the ones in parentheses after the constant name.

**Fields** work as in any class, and should be **`final`**: an enum constant is a shared singleton, so mutable state on it is shared global mutable state, which is almost always a bug.

**Methods** work normally, and an enum can implement an interface, which is the idiomatic way to give a family of constants a shared contract.

**Constant-specific method bodies** are the feature that distinguishes Java enums most sharply. Each constant may **override a method with its own implementation**, which compiles to an **anonymous subclass** of the enum:

```java
public enum Operation {
    PLUS  { public int apply(int a, int b) { return a + b; } },
    MINUS { public int apply(int a, int b) { return a - b; } };

    public abstract int apply(int a, int b);
}
```

This is the **strategy-per-constant** idiom, and it is much better than a `switch` over the enum, because adding a constant becomes a **compile error** until you implement the method, rather than a silently unhandled case.

One restriction worth knowing: a constructor **cannot access a static field** of the enum, because the constants are themselves static fields still being initialised. The usual workaround is a `static` block or a nested holder class.

#### The built-in members

**`values()`** returns an array of the constants. It is **synthesised by the compiler** and returns a **fresh copy each call**, so it is not free in a hot loop and should not be called repeatedly.

**`valueOf(String)`** looks a constant up by name, throwing `IllegalArgumentException` if there is none.

**`name()`** returns the declared identifier, and **`ordinal()`** its zero-based declaration position.

**`compareTo`** orders by `ordinal`, and enums are `Comparable`.

**`EnumSet`** and **`EnumMap`** are specialised and genuinely fast: `EnumSet` is a **bit vector**, so membership tests are a bit mask, and `EnumMap` is backed by an array indexed by ordinal, so it beats `HashMap` substantially.

A caution: never persist or depend on `ordinal()`. Reordering constants silently changes every stored value. If you need a stable number, declare an explicit `final int code` field.

#### Why the enum singleton

The question is about three idioms, and the clearest way to answer is to show what each one fails to defend against.

**Double-checked locking.**

```java
private static volatile Singleton instance;
public static Singleton getInstance() {
    if (instance == null) {
        synchronized (Singleton.class) {
            if (instance == null) instance = new Singleton();
        }
    }
    return instance;
}
```

It was **outright broken before Java 5**. Without `volatile`, the memory model permitted the reference to be **published before the constructor finished**, so another thread could see a non-null, **partially constructed** object. **JSR-133** in Java 5 fixed the semantics of `volatile` so the idiom became correct, but:

It is verbose and easy to get wrong, and omitting `volatile` still silently breaks it.

It is not reflection-proof or **serialisation-proof**.

**The Bill Pugh holder idiom.**

```java
private static class Holder {
    static final Singleton INSTANCE = new Singleton();
}
public static Singleton getInstance() { return Holder.INSTANCE; }
```

This is genuinely **elegant and correct**. The JVM guarantees that class initialisation is **thread-safe and happens exactly once**, and the nested class is not initialised until first referenced, so it is **lazy with no synchronisation at all**.

But it is **still vulnerable to both attacks**:

**Reflection** can call the private constructor with `setAccessible(true)` and produce a second instance.

**Serialisation** creates a **new** instance on every `readObject` unless you remember to write `readResolve`.

**The enum singleton.**

```java
public enum Singleton {
    INSTANCE;
    public void doWork() { ... }
}
```

It closes both holes because the JVM enforces them, not because of anything you wrote:

**Reflection-proof.** `Constructor.newInstance` explicitly **refuses enum types**, throwing `IllegalArgumentException: Cannot reflectively create enum objects`. This is a check in the JDK itself and cannot be bypassed by `setAccessible`.

**Serialisation-proof.** Enums have a **special serialised form**: only the **name** is written, and deserialisation calls **`valueOf`**, which returns the **existing constant**. No `readResolve` is needed, and no second instance can be created. The serialisation mechanism's usual constructor-bypassing does not apply.

**Thread-safe and lazy for free**, through the same class-initialisation guarantee the holder idiom relies on.

**One line of code**, with no synchronisation, no `volatile`, no holder class and no `readResolve` to forget.

Bloch's conclusion in *Effective Java*, item 3, is the sentence to be able to quote: **a single-element enum type is often the best way to implement a singleton.**

The honest costs, which a complete answer includes:

**It cannot extend a class**, since it already extends `Enum`. It can implement interfaces, which covers most needs.

**Initialisation is tied to class loading**, so laziness is coarser than a holder's if the class is touched for other reasons.

**Some people find it semantically odd** to declare something an enumeration when there is nothing to enumerate, which is a readability objection rather than a technical one.

And the general caveat worth adding: **the singleton pattern itself makes testing harder**, because global state cannot easily be substituted. Dependency injection with a single instance managed by a container usually gives the same benefit with none of the rigidity.

---

### In code

```java
// An enum is a FULL CLASS: fields, a constructor, and methods
public enum Planet {
    MERCURY (3.303e+23, 2.4397e6),      // the constructor arguments
    VENUS   (4.869e+24, 6.0518e6),
    EARTH   (5.976e+24, 6.37814e6);     // semicolon: more follows

    private final double mass;          // FINAL: a constant is shared,
    private final double radius;        // so mutable state here is
                                        // shared GLOBAL mutable state
    Planet(double mass, double radius) {   // implicitly PRIVATE
        this.mass = mass;
        this.radius = radius;
    }

    public double surfaceGravity() {
        return 6.67300E-11 * mass / (radius * radius);
    }
}

// the constructor runs ONCE PER CONSTANT, in DECLARATION ORDER,
// during class initialisation. You cannot call new Planet(...), and
// declaring the constructor public is a compile error.
```

```java
// CONSTANT-SPECIFIC BODIES: each constant overrides the method,
// compiling to an ANONYMOUS SUBCLASS of the enum
public enum Operation {
    PLUS   { public int apply(int a, int b) { return a + b; } },
    MINUS  { public int apply(int a, int b) { return a - b; } },
    TIMES  { public int apply(int a, int b) { return a * b; } };

    public abstract int apply(int a, int b);
}

Operation.PLUS.apply(2, 3);     // 5

// this is the STRATEGY-PER-CONSTANT idiom, and it beats a switch:
//   adding a constant is a COMPILE ERROR until you implement the
//   method, rather than a silently unhandled case.

// and an enum can implement an interface, which is the idiomatic
// way to give a family of constants a shared contract:
public enum Status implements Predicate<Order> {
    OPEN   { public boolean test(Order o) { return o.isOpen(); } },
    CLOSED { public boolean test(Order o) { return !o.isOpen(); } };
}
```

```text
The built-in members, with the cautions:

  values()        an array of the constants.
                  SYNTHESISED by the compiler, and it returns a
                  FRESH COPY EACH CALL, so it is not free in a hot
                  loop. Cache it if you call it repeatedly.
  valueOf(String) look up by name; IllegalArgumentException if none
  name()          the declared identifier
  ordinal()       the zero-based declaration position
  compareTo       orders by ordinal; enums are Comparable

  EnumSet         a BIT VECTOR, so membership is a bit mask
  EnumMap         backed by an ARRAY INDEXED BY ORDINAL
                  both beat HashSet and HashMap substantially

  CAUTION: NEVER persist or depend on ordinal().
     reordering constants silently changes every stored value.
     if you need a stable number, declare an explicit final int field.

  and a restriction: a constructor CANNOT access a static field of
  the enum, because the constants are themselves static fields still
  being initialised. Use a static block or a nested holder.
```

```java
// IDIOM 1: double-checked locking
public class DclSingleton {
    private static volatile DclSingleton instance;   // volatile is
                                                     // NOT optional
    private DclSingleton() { }

    public static DclSingleton getInstance() {
        if (instance == null) {
            synchronized (DclSingleton.class) {
                if (instance == null) instance = new DclSingleton();
            }
        }
        return instance;
    }
}
// OUTRIGHT BROKEN before Java 5: without volatile the memory model
// permitted the reference to be PUBLISHED BEFORE THE CONSTRUCTOR
// FINISHED, so another thread could see a non-null, PARTIALLY
// CONSTRUCTED object. JSR-133 in Java 5 fixed volatile's semantics.
//
// even now: verbose, easy to get wrong (omit volatile and it
// silently breaks), and NOT reflection-proof or serialisation-proof.
```

```java
// IDIOM 2: the Bill Pugh holder. Genuinely elegant and correct.
public class HolderSingleton {
    private HolderSingleton() { }

    private static class Holder {
        static final HolderSingleton INSTANCE = new HolderSingleton();
    }
    public static HolderSingleton getInstance() { return Holder.INSTANCE; }
}
// the JVM guarantees class initialisation is THREAD-SAFE and happens
// EXACTLY ONCE, and the nested class is not initialised until first
// referenced, so it is LAZY WITH NO SYNCHRONISATION AT ALL.

// BUT it is still vulnerable to BOTH attacks:
Constructor<HolderSingleton> c =
        HolderSingleton.class.getDeclaredConstructor();
c.setAccessible(true);
HolderSingleton rogue = c.newInstance();      // A SECOND INSTANCE

// and deserialisation creates a NEW instance on every readObject
// unless you remember to write:
private Object readResolve() { return getInstance(); }
```

```java
// IDIOM 3: the enum singleton. One line, and the JVM enforces it.
public enum EnumSingleton {
    INSTANCE;

    private final Connection conn = connect();
    public void doWork() { /* ... */ }
}

EnumSingleton.INSTANCE.doWork();
```

```text
Why the enum closes both holes, and it is the JVM doing it:

  REFLECTION-PROOF
     Constructor.newInstance EXPLICITLY REFUSES enum types:
        IllegalArgumentException: Cannot reflectively create enum
        objects
     this is a check in the JDK itself and CANNOT be bypassed by
     setAccessible.

  SERIALISATION-PROOF
     enums have a SPECIAL SERIALISED FORM: only the NAME is written,
     and deserialisation calls valueOf, which returns THE EXISTING
     CONSTANT.
     no readResolve is needed, no second instance can be created, and
     serialisation's usual constructor-bypassing does not apply.

  THREAD-SAFE AND LAZY FOR FREE
     the same class-initialisation guarantee the holder idiom uses.

  ONE LINE
     no synchronisation, no volatile, no holder class, and no
     readResolve to forget.

  Bloch, Effective Java item 3:
     "A single-element enum type is often the best way to implement
      a singleton."

  the honest costs:
     it CANNOT EXTEND A CLASS (it already extends Enum), though it
        can implement interfaces, which covers most needs
     initialisation is tied to CLASS LOADING, so laziness is coarser
        than a holder's if the class is touched for other reasons
     some find it SEMANTICALLY ODD to declare an enumeration when
        there is nothing to enumerate: a readability objection
        rather than a technical one

  and the general caveat: the SINGLETON PATTERN ITSELF makes testing
  harder, because global state cannot easily be substituted.
  Dependency injection with a single container-managed instance
  usually gives the same benefit with none of the rigidity.
```

---

### What they ask next

**"Can an enum extend a class?"**
No. It implicitly extends `java.lang.Enum`, and Java has single inheritance, so the slot is taken. It can implement any number of interfaces, which covers almost every case where you would have wanted a base class.

**"When does an enum constructor run?"**
Once per constant, in declaration order, during class initialisation, before any constant is accessible. A constructor cannot read a static field of its own enum, because the constants are themselves static fields still being initialised.

**"Why avoid `ordinal()`?"**
Because it is derived from declaration order, so inserting or reordering constants silently changes every value derived from it. Anything persisted or exchanged must use an explicit `final int` or `String` field whose value you control.

**"Why is `values()` not free?"**
Because arrays are mutable, so the compiler-synthesised method returns a defensive copy on every call. Calling it inside a loop allocates repeatedly, and the fix is to cache it in a private static final array.

**"What was broken about double-checked locking?"**
Before Java 5, without `volatile`, the memory model permitted the reference to be published before the constructor completed, so another thread could observe a non-null but partially constructed object. JSR-133 fixed `volatile`'s semantics, so with it the idiom is now correct, but omitting it still breaks silently.

**"Is the holder idiom wrong, then?"**
No, it is correct, lazy and unsynchronised, and relies on the JVM's guarantee that class initialisation happens exactly once. It simply does not defend against reflection or serialisation, which the enum does.

**"How exactly does the enum resist reflection?"**
`Constructor.newInstance` contains an explicit check that throws `IllegalArgumentException` for enum types. It is in the JDK rather than in your class, so `setAccessible` cannot work around it.

**"And serialisation?"**
Enums have a special serialised form: only the name is written, and reading calls `valueOf`, which returns the existing constant. The usual constructor-bypassing behaviour of deserialisation does not apply, so no `readResolve` is needed.

**"When would you not use a singleton at all?"**
Whenever testability matters, which is usually. Global state cannot be substituted in a test, so a container-managed single instance injected as a dependency gives the same single-instance benefit while remaining replaceable.

**The common wrong answer** is "enums are type-safe constants, and the enum singleton is thread-safe". Both are true and neither is the point. The question is after the fact that **each constant is a real object** with its own data and possibly its own method body, and that the enum singleton wins specifically because **reflection and serialisation are blocked by the JVM** rather than by code you had to remember to write.

---

### Say this in the interview

*"A Java enum is a full class. It implicitly extends java.lang.Enum, which is why it cannot extend anything else, though it can implement interfaces. Each constant is a public static final instance created when the class is initialised, the enum is implicitly final unless a constant has a body, and the constructors are implicitly private, so you cannot write new and declaring one public is a compile error.*

*Constructors run once per constant, in declaration order, during class initialisation, with the arguments in parentheses after the constant name. Fields work as in any class and should be final, because a constant is a shared singleton so mutable state on it is shared global mutable state. Methods work normally. The feature that distinguishes Java enums most sharply is constant-specific method bodies, where each constant overrides a method with its own implementation, compiling to an anonymous subclass. That is the strategy-per-constant idiom, and it beats a switch over the enum because adding a constant becomes a compile error until you implement the method rather than a silently unhandled case. One restriction worth knowing is that a constructor cannot access a static field of the enum, because the constants are themselves static fields still being initialised.*

*The built-ins are values, which is synthesised by the compiler and returns a fresh copy each call so it is not free in a hot loop; valueOf, which looks up by name; name and ordinal; and compareTo, which orders by ordinal. EnumSet is a bit vector and EnumMap is array-backed by ordinal, so both beat the hash-based equivalents substantially. And the caution is never to persist or depend on ordinal, because reordering constants silently changes every stored value; use an explicit final int field if you need a stable number.*

*On the singleton, the clearest way to answer is by what each idiom fails to defend against. Double-checked locking was outright broken before Java 5: without volatile the memory model permitted the reference to be published before the constructor finished, so another thread could see a non-null but partially constructed object. JSR-133 fixed volatile's semantics so it is now correct, but it is verbose, omitting volatile still breaks it silently, and it is neither reflection-proof nor serialisation-proof.*

*The Bill Pugh holder idiom is genuinely elegant and correct: the JVM guarantees class initialisation is thread-safe and happens exactly once, and the nested class is not initialised until first referenced, so it is lazy with no synchronisation at all. But it is still vulnerable to both attacks: reflection can call the private constructor with setAccessible and produce a second instance, and deserialisation creates a new instance on every readObject unless you remember to write readResolve.*

*The enum singleton closes both holes, and crucially the JVM enforces them rather than anything you wrote. It is reflection-proof because Constructor.newInstance explicitly refuses enum types, throwing IllegalArgumentException saying it cannot reflectively create enum objects, and that check is in the JDK so setAccessible cannot bypass it. It is serialisation-proof because enums have a special serialised form where only the name is written and deserialisation calls valueOf, returning the existing constant, so no readResolve is needed and serialisation's usual constructor-bypassing does not apply. It is thread-safe and lazy for free through the same class-initialisation guarantee, and it is one line with no synchronisation, no volatile, no holder and nothing to forget. Bloch's item 3 says a single-element enum type is often the best way to implement a singleton.*

*The honest costs are that it cannot extend a class, since it already extends Enum, though interfaces cover most needs; initialisation is tied to class loading so laziness is coarser than a holder's; and some people find it semantically odd to declare an enumeration when there is nothing to enumerate, which is a readability objection rather than a technical one. And I would add the general caveat that the singleton pattern itself makes testing harder, because global state cannot easily be substituted, so dependency injection with a single container-managed instance usually gives the same benefit with none of the rigidity."*
