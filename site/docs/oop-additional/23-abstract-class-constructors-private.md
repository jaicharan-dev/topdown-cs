---
id: 23-abstract-class-constructors-private
title: "Abstract Class Constructors & Private Constructors"
description: "A constructor that runs but is never called by you, the order that makes calling an overridable method from it catastrophic, and the constructor you hide on purpose"

sidebar_position: 23
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Can an abstract class have a constructor if it cannot be instantiated directly with `new`? What is the complete object initialization lifecycle, what catastrophic bug occurs if a constructor invokes an overridable method, and why would you ever declare a private constructor?"

---

### Picture it

A building is constructed in layers: **foundations, then frame, then the fit-out**.

**Nobody ever orders "a foundation".** You cannot live in one. But every house that gets built has one, and the foundation crew absolutely has a job: it is done **as part of building the house**, before anything above it. So "you cannot order it on its own" and "it has work to do" are entirely compatible, and that is the whole answer to the first part.

The order is strict and it is **bottom-up**: the foundation is finished before the frame starts, and the frame is finished before the fit-out.

**Now the disaster.**

Suppose the foundation crew's checklist ends with "**ring the owner's decorator and ask them to hang the curtains**". The decorator arrives, goes to the window, and there is no window. There is no wall. **The fit-out has not happened**, because the foundation is not even finished yet.

And the decorator does not fail loudly. They hang the curtains on nothing, report success, and leave. Later the owner looks round and finds the curtains missing, and **everything in the fit-out paperwork says they were hung**. The owner swears they specified curtains; the paperwork agrees; the curtains are not there.

The cause is that the foundation crew called **forward in time**, to work that is scheduled to happen later. The fix is that the foundation crew only ever rings people whose work is **already complete**, or does the job itself.

**And the locked door.** Sometimes a building is designed so that **nobody can order one directly** on purpose: perhaps because it should only ever be built through a specific agent, or because there should only ever be one of them, or because it is not a building at all but a toolshed full of equipment that nobody is meant to live in. Locking the front door from the inside is how you enforce that, and it has the useful side effect that **nobody can build an extension on it either**, because an extension has to connect to the original through that door.

---

### The proper terms

#### Yes, an abstract class has a constructor

An **abstract class can and usually should have a constructor**. It is never invoked by `new AbstractThing()`, which is forbidden, but it **is** invoked as part of constructing a **concrete subclass**, through the subclass's implicit or explicit `super(...)` call.

Its purpose is to initialise the abstract class's own state: its fields, its invariants, anything every subclass needs. Putting that in one place means every subclass inherits it rather than repeating it, and it lets the abstract class enforce an invariant on construction, for example by rejecting a null required argument.

If you write no constructor, the compiler inserts a **default no-arg constructor**, exactly as for any class. And if your abstract class declares **only** a constructor taking arguments, every subclass **must** call it explicitly, which is a useful way of forcing subclasses to supply something.

#### The complete initialisation lifecycle

The order matters enormously, and it is the key to the next section.

**Before anything, once per class:** **static** fields are given default values, then **static initialisers and static field initialisers** run in **source order**, at **class initialisation** time. This happens once, not per instance.

Then, per instance:

**1. Memory is allocated and every instance field is set to its default**: `0`, `false`, `null`. This happens **before any user code runs**, which is why a field is never truly uninitialised.

**2. The most-derived constructor is entered.**

**3. It calls `this(...)` or `super(...)`.** If neither is written, the compiler inserts an implicit **`super()`**. This recurses **all the way up to `java.lang.Object`**, so nothing below has executed yet.

**4. `Object`'s constructor completes.**

**5. Then, on the way back down, for each class in turn:** its **instance initialiser blocks and instance field initialisers** run **in source order**, and **then** the rest of its constructor body.

**6. Repeat down the chain** until the most-derived class's constructor body finishes.

The consequence to hold onto: **a superclass is fully constructed, including its field initialisers and its constructor body, before any subclass field initialiser runs.**

#### The catastrophic bug

**Never invoke an overridable method from a constructor.** This is one of Joshua Bloch's rules in *Effective Java*, and the lifecycle above is exactly why.

If a superclass constructor calls an overridable method, **the subclass's override runs**, because Java dispatches **virtually from the very start of construction**. But at that moment the subclass's **field initialisers have not run**, so every field it relies on is still at its **default**: `null`, `0`, `false`.

The result is the worst kind of bug:

**It does not throw at the point of the mistake.** The override simply sees nulls and zeros.

**The code looks obviously correct.** The subclass clearly initialises the field, on the line above or below, and the debugger shows the value present **afterwards**.

**It can corrupt `final` fields**, which is particularly disorienting, since a `final` field is observed holding `null` despite being assigned exactly once.

This is a **Java-specific hazard** worth naming. **C++ does the opposite**: during base-class construction the object's dynamic type is the base class, so a virtual call reaches the **base** version. Java dispatches to the override from the first instruction, so the window is wide open.

The same trap applies to **`clone()`** and **`readObject()`**, because both also produce an object whose subclass state is not yet established.

The fixes:

**Make the method `private`, `static` or `final`**, so no override can exist.

**Pass the value up** through the `super(...)` arguments, so the superclass has what it needs without asking.

**Use a static factory or builder**, constructing the object and then calling an initialisation method once it is fully built, which also removes the half-constructed object from view entirely.

#### Why declare a private constructor

Six reasons, and they come up in different guises.

**A utility class.** A class of only static members, such as `java.lang.Math` or `Collections`, should never be instantiated. A private constructor prevents it **and** suppresses the implicit public no-arg constructor the compiler would otherwise generate. Adding `throw new AssertionError()` inside also defeats reflective instantiation from within the class.

**A singleton.** The constructor is private so the class fully controls how many instances exist, exposing one through a static field or method.

**Static factory methods.** Forcing construction through named methods such as `of`, `valueOf` or `from` gives you meaningful names, the freedom to **return a cached instance** rather than a new one, and the ability to return a subtype. `Integer.valueOf` and `List.of` both do this.

**The builder pattern.** The object is constructible only through its builder, which lets the builder validate everything before any object exists.

**Preventing subclassing.** A class whose constructors are all private cannot be subclassed, because a subclass constructor must call `super(...)` and cannot reach a private one. This is an alternative to `final`, and it is how classes such as `java.lang.Void` work.

**Constructor chaining.** A private constructor holding the common logic, with the public constructors delegating to it through `this(...)`, which removes duplication without exposing the general form.

One caution worth adding: a private constructor **does not stop reflection**. `Constructor.setAccessible(true)` will invoke it, which is why a singleton that must be genuinely unbreakable is written as an **enum**, since the JVM guarantees enum instantiation cannot be subverted by reflection or deserialisation.

---

### In code

```java
// An abstract class absolutely has a constructor, and it runs
abstract class Shape {
    private final String name;

    protected Shape(String name) {                  // never called by new
        if (name == null) throw new IllegalArgumentException();
        this.name = name;                           // but ALWAYS runs,
    }                                               // as part of building
                                                    // a subclass
    abstract double area();
    public String getName() { return name; }
}

class Circle extends Shape {
    private final double r;
    Circle(double r) {
        super("circle");       // REQUIRED: Shape has no no-arg constructor
        this.r = r;
    }
    @Override double area() { return Math.PI * r * r; }
}

// new Shape("x");   // COMPILE ERROR: Shape is abstract
new Circle(2.0);     // runs Shape's constructor, then Circle's
```

```text
The complete initialisation order:

  ONCE PER CLASS, at class initialisation:
     static fields -> defaults
     static initialisers and static field initialisers, IN SOURCE ORDER

  PER INSTANCE:
   1. memory allocated; EVERY instance field set to its default
      (0, false, null) BEFORE any user code runs
   2. the MOST-DERIVED constructor is entered
   3. it calls this(...) or super(...); if neither is written, an
      implicit super() is inserted
      -> this recurses ALL THE WAY UP to java.lang.Object
         (nothing below has executed yet)
   4. Object's constructor completes
   5. on the way back DOWN, for each class in turn:
         its instance initialiser blocks and field initialisers,
         IN SOURCE ORDER
         THEN the rest of its constructor body
   6. repeat down the chain to the most-derived class

  THE CONSEQUENCE THAT MATTERS:
     a superclass is FULLY constructed, including its field
     initialisers and constructor body, BEFORE any subclass field
     initialiser runs.
```

```java
// THE CATASTROPHIC BUG
class Base {
    Base() {
        init();                  // calls an OVERRIDABLE method
    }
    void init() { }
}

class Derived extends Base {
    private final String value = "ready";    // field initialiser
    private final List<String> items = new ArrayList<>();

    @Override void init() {
        System.out.println(value);           // prints NULL
        items.add("x");                      // NullPointerException
    }
}

new Derived();

// WHY: Base's constructor runs BEFORE Derived's field initialisers.
// Java dispatches VIRTUALLY FROM THE VERY START OF CONSTRUCTION, so
// Derived.init() runs against an object whose fields are still at
// their DEFAULTS.
//
// and note how bad the failure mode is:
//   - it does not throw at the point of the mistake
//   - the code looks obviously correct: value IS initialised, and
//     the debugger shows it present afterwards
//   - a FINAL field is observed holding null despite being assigned
//     exactly once
```

```text
Why this is a JAVA-SPECIFIC hazard:

  C++     during base-class construction the object's DYNAMIC TYPE
          is the base class, so a virtual call reaches the BASE
          version. The language closes the window.

  JAVA    dispatches to the OVERRIDE from the first instruction of
          construction. The window is wide open.

  and the same trap applies to clone() and readObject(), because
  both also produce an object whose subclass state is not yet
  established.
```

```java
// The three fixes
class Base1 {
    Base1() { init(); }
    private void init() { }         // 1. private: no override possible
}                                   //    (final or static also work)

class Base2 {
    private final String value;
    Base2(String value) {           // 2. pass the value UP, so the
        this.value = value;         //    superclass never has to ask
    }
}

// 3. a static factory: construct, THEN initialise once fully built
class Widget {
    private Widget() { }
    static Widget create() {
        Widget w = new Widget();    // fully constructed first
        w.init();                   // only now, and it may be virtual
        return w;
    }
    protected void init() { }
}
```

```java
// Why a private constructor, with six reasons

// 1. UTILITY CLASS: never instantiate
public final class MathUtils {
    private MathUtils() {
        throw new AssertionError("no instances");   // defeats reflection
    }                                               // from inside too
    public static int clamp(int v, int lo, int hi) { /* ... */ return v; }
}
// without the private constructor the compiler generates a PUBLIC
// no-arg one, and `new MathUtils()` compiles. java.lang.Math does
// exactly this.

// 2. SINGLETON: control how many exist
// 3. STATIC FACTORY: named, may return a CACHED instance or a SUBTYPE
public final class Money {
    private final long cents;
    private Money(long cents) { this.cents = cents; }

    public static Money ofCents(long c) { return new Money(c); }
    public static Money zero()          { return ZERO; }   // cached
    private static final Money ZERO = new Money(0);
}
// Integer.valueOf and List.of both do this.

// 4. BUILDER: constructible only through the builder, which can
//    validate before any object exists

// 5. PREVENTING SUBCLASSING: a class whose constructors are ALL
//    private cannot be subclassed, because a subclass constructor
//    must call super(...) and cannot reach a private one.
//    An alternative to `final`, and how java.lang.Void works.

// 6. CONSTRUCTOR CHAINING: the common logic in one private
//    constructor that the public ones delegate to with this(...)
class Range {
    private final int lo, hi;
    public Range(int hi)             { this(0, hi); }
    public Range(int lo, int hi)     { this(lo, hi, true); }
    private Range(int lo, int hi, boolean validate) {
        if (validate && lo > hi) throw new IllegalArgumentException();
        this.lo = lo; this.hi = hi;
    }
}
```

```text
One caution: a private constructor does NOT stop reflection

  Constructor<Singleton> c = Singleton.class.getDeclaredConstructor();
  c.setAccessible(true);
  Singleton rogue = c.newInstance();     // a SECOND instance

  which is why a singleton that must be genuinely unbreakable is
  written as an ENUM: the JVM guarantees enum instantiation cannot be
  subverted by reflection OR deserialisation.
```

---

### What they ask next

**"If it cannot be instantiated, what is the constructor for?"**
To initialise the abstract class's own fields and enforce its invariants, as part of constructing a concrete subclass through `super(...)`. "Cannot be ordered on its own" and "has work to do during construction" are entirely compatible.

**"What runs first, a field initialiser or the constructor body?"**
The field initialisers and instance initialiser blocks, in source order, **then** the constructor body, and both only **after** the `super(...)` call has returned. That ordering is the whole reason the overridable-method bug exists.

**"Why does the field appear `null` in the override?"**
Because the superclass constructor runs before the subclass's field initialisers, and Java dispatches virtually from the first instruction of construction. The override therefore sees the subclass's fields at their defaults.

**"How does C++ avoid this?"**
During base-class construction the object's dynamic type is the base class, so a virtual call reaches the base version rather than the derived override. Java deliberately dispatches to the override from the start, which is why the rule "never call an overridable method from a constructor" is Java-specific advice.

**"What stops a class with only private constructors from being subclassed?"**
A subclass constructor must invoke `super(...)`, and it cannot reach a private constructor, so the class cannot be extended. It is an alternative to `final`, used by classes like `java.lang.Void`.

**"Why does a utility class need a private constructor at all?"**
Because without any declared constructor the compiler generates a **public** no-arg one, so `new MathUtils()` would compile. Declaring it private removes that, and throwing an `AssertionError` inside also blocks reflective instantiation from within the class.

**"Does a private constructor guarantee a singleton?"**
No. Reflection with `setAccessible(true)` can invoke it, and deserialisation can create another instance. An enum singleton is the only form the JVM guarantees, which is exactly Bloch's argument for it.

**The common wrong answer** is "an abstract class cannot have a constructor because you cannot instantiate it". It can, it usually should, and it always runs during subclass construction. The valuable parts are the **exact initialisation order**, which explains why a constructor calling an overridable method sees the subclass's fields at their defaults, and the fact that a **private constructor is a design tool** rather than merely a way to block `new`.

---

### Say this in the interview

*"Yes, an abstract class can and usually should have a constructor. It is never invoked by new, which is forbidden, but it is invoked as part of constructing a concrete subclass through the subclass's implicit or explicit super call. Its purpose is to initialise the abstract class's own fields and enforce its invariants in one place, so every subclass inherits that rather than repeating it. If you write none, the compiler inserts a default no-arg constructor, and if the abstract class declares only a constructor taking arguments, every subclass must call it explicitly.*

*The lifecycle matters because of the next part. Once per class, static fields get defaults and then static initialisers and static field initialisers run in source order at class initialisation. Then per instance: memory is allocated and every instance field is set to its default, zero, false or null, before any user code runs. The most-derived constructor is entered. It calls this or super, and if neither is written an implicit super is inserted, which recurses all the way up to java.lang.Object, so nothing below has executed yet. Object's constructor completes. Then on the way back down, for each class in turn, its instance initialiser blocks and field initialisers run in source order, and then the rest of its constructor body. That repeats down to the most-derived class. The consequence that matters is that a superclass is fully constructed, including its field initialisers and constructor body, before any subclass field initialiser runs.*

*So the catastrophic bug is calling an overridable method from a constructor. If a superclass constructor does that, the subclass's override runs, because Java dispatches virtually from the very start of construction, but at that moment the subclass's field initialisers have not run, so every field it relies on is still null, zero or false. The failure mode is the worst kind: it does not throw at the point of the mistake, the code looks obviously correct because the field clearly is initialised and the debugger shows it present afterwards, and it can leave a final field observed holding null despite being assigned exactly once. It is a Java-specific hazard, because C++ does the opposite: during base-class construction the dynamic type is the base class, so a virtual call reaches the base version. The same trap applies to clone and readObject. The fixes are to make the method private, static or final so no override exists; to pass the value up through the super arguments; or to use a static factory or builder that constructs the object and then initialises it once it is fully built.*

*As for private constructors, there are six reasons. A utility class of only static members, like java.lang.Math, should never be instantiated, and without a declared constructor the compiler generates a public no-arg one, so declaring it private removes that, with an AssertionError inside to defeat reflection from within the class. A singleton, to control how many instances exist. Static factory methods, so construction goes through named methods like of or valueOf, which gives meaningful names and the freedom to return a cached instance or a subtype, as Integer.valueOf and List.of do. The builder pattern, so the object is constructible only through a builder that validates before any object exists. Preventing subclassing, since a class whose constructors are all private cannot be extended because a subclass constructor must call super and cannot reach a private one, which is how java.lang.Void works. And constructor chaining, with the common logic in one private constructor that the public ones delegate to.*

*One caution I would add: a private constructor does not stop reflection, since setAccessible will invoke it, which is why a singleton that must be genuinely unbreakable is written as an enum, because the JVM guarantees enum instantiation cannot be subverted by reflection or deserialisation."*
