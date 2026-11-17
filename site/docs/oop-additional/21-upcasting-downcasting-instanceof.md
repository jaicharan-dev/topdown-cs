---
id: 21-upcasting-downcasting-instanceof
title: "Upcasting, Downcasting & instanceof"
description: "Narrowing your view of an object is always safe, claiming to know what it really is is a promise checked at runtime"

sidebar_position: 21
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Explain upcasting vs downcasting in Java. Why is downcasting prone to `ClassCastException`, how does `instanceof` prevent it, and what are the subtle rules regarding interfaces and `null` values?"

---

### Picture it

A parcel arrives with a label on it.

**Relabelling it "contents: an object"** is always safe. Whatever is inside, it is certainly an object. You have not changed the parcel, only **narrowed what you are claiming to know** about it. Nothing can go wrong, because every stronger claim already implies this weaker one.

**Relabelling it "contents: a vase"** is a very different act. You are **asserting something specific** about what is inside. If you are right, nothing happens. If you are wrong, you will find out **when somebody opens it**, not when you write the label.

That is the whole asymmetry. Going up is **discarding information**, which can never be false. Going down is **adding a claim**, which might be.

**The clerk at the desk can only catch some mistakes.** If you label a parcel of books as "a vase", the clerk has no way to know and will let it through; the problem appears later, on opening. But if you label it "a vase and also a submarine", the clerk can see **that combination is impossible** and refuses immediately. So some wrong labels are rejected at the desk and others only at the moment of opening, depending on whether the impossibility is **visible from the paperwork alone**.

**The safe way is to look first.** Open the lid a crack, check it really is a vase, and only then write the label.

**And the empty parcel.** A parcel with nothing in it is **not a vase**, so checking "is this a vase?" gives **no**. It does not explode, it does not complain, it simply answers no. But you **may** write any label you like on an empty parcel, because the label is a claim about contents that do not exist, and nothing will ever contradict it.

---

### The proper terms

#### Upcasting

**Upcasting** converts a reference from a **subtype to a supertype**. It is **implicit**, needs no cast operator, and is **always safe**.

Nothing happens to the object. Only the **static type of the reference** changes, which **narrows what the compiler will let you call**. A `Dog` stored in an `Animal` reference is still entirely a `Dog`, and an overridden method still runs `Dog`'s version, because **method dispatch uses the object, not the reference**.

It is verified **entirely at compile time**, and it is what makes polymorphism usable: a `List<Animal>` can hold dogs and cats, and a method taking an `Animal` accepts both.

#### Downcasting

**Downcasting** converts a reference from a **supertype to a subtype**. It requires an **explicit cast**, and it is checked **at runtime**.

The compiler performs only a **plausibility check**: it verifies that the cast **could** succeed, meaning the two types are in the same hierarchy. It cannot verify that it **will**, because the actual class of the object is not known until the program runs.

So a downcast is a **promise to the compiler**, verified by the JVM, and a broken promise is a **`ClassCastException`**.

```java
Object o = "hello";
Integer i = (Integer) o;   // compiles. Throws ClassCastException.
```

That compiles because `Object` to `Integer` is plausible: an `Object` reference **might** hold an `Integer`. The JVM checks the real object, finds a `String`, and throws.

#### When the compiler can reject it instead

Not every bad cast reaches runtime, and knowing which is which is the interesting part.

**If the compiler can prove the cast is impossible, it is a compile error**, reported as **inconvertible types**. `(String) someInteger` fails to compile, because `String` and `Integer` are unrelated final-ish class types with no possible common object.

**Casting to an interface is almost always allowed to compile**, which is the important special case. For any **non-final** class type, the compiler must assume some subclass might implement that interface, so it cannot prove impossibility:

```java
Object o = new Object();
Runnable r = (Runnable) o;   // COMPILES. Fails at runtime.
```

The exception is a **`final`** class, where no subclass can exist, so the compiler **can** prove it and rejects the cast outright.

#### How `instanceof` prevents it

**`instanceof`** tests whether an object is an instance of a type, including any subtype, and returns a `boolean`. Checking before casting converts a potential exception into a branch.

Since **Java 16**, **pattern matching** for `instanceof` combines the test and the cast, which also removes the redundant repetition that used to invite copy-paste errors:

```java
if (o instanceof String s) {
    System.out.println(s.length());   // s is already a String, in scope
}
```

The binding variable's scope is **flow-sensitive**: it is in scope wherever the compiler can prove the test succeeded, including after an early `return` in the negative branch.

#### The `null` rules

Three rules, all of which come up, and all of which are consistent once you see why.

**`null instanceof AnyType` is always `false`.** It does not throw, it returns `false`. `null` is not an instance of anything, so the honest answer is no.

The practical consequence is significant: `instanceof` is also a null check, so `if (o instanceof String s)` needs no separate `o != null`, which is a real simplification in `equals` implementations.

**Casting `null` to any type is always legal and never throws.** `(String) null` is a perfectly good `String`-typed expression with the value `null`. There is no object whose class could contradict the claim.

**A `null` return still has a type for overload resolution**, which is why `foo((String) null)` and `foo((Integer) null)` select different overloads. The cast is doing real work for the **compiler** even though it does nothing at runtime.

#### Where this becomes a design question

Worth raising unprompted, because it elevates the answer.

**A chain of `instanceof` checks is usually a design smell.** It means behaviour that varies by type is being decided **outside** the types, which is what polymorphism exists to avoid. The normal fix is to put the behaviour on the types and call it through the supertype.

**Where the set of types is genuinely closed**, such as an expression tree or a protocol message, modern Java has a better tool: **sealed types** from Java 17 with **pattern matching in `switch`**. The compiler then **checks exhaustiveness**, so adding a new subtype produces a compile error at every place that handles them, instead of a runtime failure in whichever branch was forgotten.

**The visitor pattern** is the older solution to the same problem, and is what you would reach for in a language without sealed types.

---

### In code

```java
class Animal { void eat() {} }
class Dog extends Animal { void bark() {} }

// UPCASTING: implicit, always safe, compile-time only
Dog d = new Dog();
Animal a = d;              // no cast needed
a.eat();                   // fine
// a.bark();               // COMPILE ERROR: Animal has no bark()

// the OBJECT is unchanged. Only the REFERENCE's static type narrowed,
// which narrows what the compiler will let you call. An overridden
// method still runs Dog's version, because dispatch uses the OBJECT.

// DOWNCASTING: explicit, checked at RUNTIME
Dog back = (Dog) a;        // fine: a really does hold a Dog
back.bark();

Animal cat = new Cat();
Dog wrong = (Dog) cat;     // compiles, then throws ClassCastException
```

```text
The asymmetry, stated plainly:

  UPCASTING    discards information
               "whatever this is, it is certainly an Animal"
               -> can NEVER be false
               -> implicit, compile-time, always safe

  DOWNCASTING  adds a claim
               "this particular Animal is a Dog"
               -> MIGHT be false
               -> explicit, checked at RUNTIME, can throw

  and what the COMPILER can check is only PLAUSIBILITY:
     are these two types in the same hierarchy, so that SOME object
     could satisfy both?
  it cannot check the actual class, which is not known until the
  program runs. So a downcast is a PROMISE to the compiler, verified
  by the JVM, and a broken promise is a ClassCastException.
```

```java
// Which bad casts are caught WHEN:

Object o = "hello";
Integer i = (Integer) o;     // COMPILES  -> ClassCastException
                             // plausible: an Object MIGHT hold an Integer

String s = "hello";
Integer j = (Integer) s;     // COMPILE ERROR: inconvertible types
                             // provable: String and Integer are
                             // unrelated class types

// INTERFACES are the important special case:
Object x = new Object();
Runnable r = (Runnable) x;   // COMPILES -> fails at runtime
                             // for any NON-FINAL class the compiler
                             // must assume SOME SUBCLASS might
                             // implement Runnable, so it cannot prove
                             // impossibility

final class Money {}
Money m = new Money();
// Runnable r2 = (Runnable) m;   // COMPILE ERROR
                                 // final: no subclass can exist, so
                                 // the compiler CAN prove it
```

```java
// instanceof: turn a potential exception into a branch
if (a instanceof Dog) {
    Dog dog = (Dog) a;          // the old way: test, then repeat
    dog.bark();                 // the type. Copy-paste bait.
}

// Java 16+: pattern matching binds and scopes it in one step
if (a instanceof Dog dog) {
    dog.bark();                 // already a Dog, already in scope
}

// the binding's scope is FLOW-SENSITIVE: it is in scope wherever
// the compiler can prove the test succeeded
static void handle(Object o) {
    if (!(o instanceof String s)) return;
    System.out.println(s.length());   // s IS in scope here
}
```

```java
// The three null rules, all consistent once you see why

// 1. null instanceof ANYTHING is always FALSE. It does NOT throw.
Object n = null;
System.out.println(n instanceof String);   // false
// null is not an instance of anything, so the honest answer is "no"

// which means INSTANCEOF IS ALSO A NULL CHECK:
@Override public boolean equals(Object o) {
    if (!(o instanceof Point p)) return false;   // covers null AND
    return x == p.x && y == p.y;                 // the wrong type
}

// 2. Casting null to any type is always legal and never throws
String sn = (String) null;      // fine. There is no object whose
                                // class could contradict the claim.
Dog dn = (Dog) null;            // also fine

// 3. But a cast on null still has a TYPE for overload resolution
void foo(String s) {}
void foo(Integer i) {}
// foo(null);              // AMBIGUOUS: compile error
foo((String) null);        // picks foo(String)
// the cast does real work for the COMPILER while doing nothing at
// runtime.
```

```text
When a chain of instanceof is a design smell, and what to use instead:

  BAD: behaviour that varies by type, decided OUTSIDE the types
     if (shape instanceof Circle c)         return area(c);
     else if (shape instanceof Square sq)   return area(sq);
     else if (shape instanceof Triangle t)  return area(t);
     -> add a new shape and this silently falls through, at runtime,
        in every place anyone wrote this chain

  GOOD: put the behaviour on the type
     shape.area();            // polymorphism, as intended

  GOOD, when the set of types is genuinely CLOSED (an expression
  tree, a protocol message): SEALED TYPES + pattern matching

     sealed interface Shape permits Circle, Square, Triangle {}

     double area(Shape s) {
         return switch (s) {
             case Circle c   -> Math.PI * c.r() * c.r();
             case Square sq  -> sq.side() * sq.side();
             case Triangle t -> 0.5 * t.b() * t.h();
             // NO default needed: the compiler CHECKS EXHAUSTIVENESS
         };
     }

     -> adding a fourth shape is now a COMPILE ERROR at every switch,
        instead of a runtime failure in whichever branch was forgotten
```

---

### What they ask next

**"Why is upcasting always safe?"**
Because it discards information rather than adding a claim. A `Dog` is certainly an `Animal`, so the assertion cannot be false. Only the reference's static type narrows; the object is untouched and still dispatches its own overrides.

**"Why does `(Integer) someObject` compile but `(Integer) someString` not?"**
Because `Object` **might** hold an `Integer`, so the cast is plausible and must be checked at runtime, while `String` and `Integer` are unrelated class types with no possible common object, so the compiler can prove it impossible and reports inconvertible types.

**"Why can you cast anything to an interface?"**
Because for any non-final class the compiler must assume some subclass could implement that interface, so impossibility is unprovable. A `final` class is the exception, since no subclass can exist and the compiler rejects the cast.

**"What does `null instanceof String` return?"**
`false`, with no exception. `null` is not an instance of anything. The useful consequence is that `instanceof` doubles as a null check, which is why `equals` implementations written with it need no separate null test.

**"Can you cast `null`?"**
Yes, to any reference type, and it never throws. There is no object whose class could contradict the claim. The cast still matters to the compiler for overload resolution, which is why `foo((String) null)` is unambiguous where `foo(null)` is not.

**"When is `instanceof` legitimate?"**
In `equals`, when interoperating with untyped APIs or deserialised data, and when narrowing from a framework boundary. It is a smell specifically when it forms a **chain that decides behaviour by type**, because that is what polymorphism exists to replace.

**"What do sealed types add?"**
Exhaustiveness checking. With a sealed hierarchy and a pattern `switch`, the compiler verifies every case is handled, so adding a subtype breaks the build at every place that must change, rather than failing at runtime in the one branch somebody forgot.

**"Does casting change the object?"**
No. A cast is purely a statement about the reference's type. The object's class was fixed when it was created and nothing can change it, which is precisely why the JVM can check the claim and throw when it is false.

**The common wrong answer** is "upcasting is implicit and downcasting is explicit", stopping at syntax. The real content is **why**: upcasting discards information and cannot be wrong, downcasting adds a claim that only the runtime can verify, the compiler rejects only **provably** impossible casts, interfaces are almost never provable, and `null` is uniformly not-an-instance-of-anything yet castable to everything.

---

### Say this in the interview

*"Upcasting converts a reference from a subtype to a supertype. It is implicit, needs no cast, and is always safe, because nothing happens to the object: only the static type of the reference changes, which narrows what the compiler lets you call. A Dog in an Animal reference is still entirely a Dog, and an overridden method still runs Dog's version, because dispatch uses the object rather than the reference. It is verified entirely at compile time and it is what makes polymorphism usable.*

*Downcasting converts from a supertype to a subtype, requires an explicit cast, and is checked at runtime. The compiler performs only a plausibility check, verifying the cast could succeed because the types are in the same hierarchy, and it cannot verify it will succeed because the actual class is not known until the program runs. So a downcast is a promise to the compiler, verified by the JVM, and a broken promise is a ClassCastException. Object o equals hello, then casting o to Integer compiles, because an Object might hold an Integer, and throws at runtime when the JVM finds a String.*

*Not every bad cast reaches runtime. If the compiler can prove the cast impossible it is a compile error, inconvertible types, as with casting a String to an Integer. The important special case is interfaces: casting any non-final class type to any interface compiles, because the compiler must assume some subclass might implement it, so impossibility is unprovable. A final class is the exception, since no subclass can exist and the compiler rejects it.*

*instanceof tests whether an object is an instance of a type including subtypes, so checking before casting turns a potential exception into a branch. Since Java 16 pattern matching combines the test and the cast, so if o instanceof String s binds s directly, and the binding's scope is flow-sensitive, so it is in scope wherever the compiler can prove the test succeeded, including after an early return in the negative branch.*

*On null, there are three rules and they are all consistent. null instanceof anything is always false and never throws, because null is not an instance of anything, which means instanceof doubles as a null check, so an equals implementation written with it needs no separate null test. Casting null to any reference type is always legal and never throws, because there is no object whose class could contradict the claim. And a cast on null still carries a type for overload resolution, which is why foo of null is ambiguous while foo of String cast null is not, so the cast does real work for the compiler while doing nothing at runtime.*

*I would add a design point. A chain of instanceof checks is usually a smell, because behaviour that varies by type is being decided outside the types, which is what polymorphism exists to avoid, and adding a new subtype then fails silently at runtime in whichever chain somebody forgot. The normal fix is to put the behaviour on the type. Where the set of types is genuinely closed, like an expression tree or a protocol message, sealed types from Java 17 with pattern matching in switch are better still, because the compiler checks exhaustiveness, so adding a subtype becomes a compile error at every place that must change. The visitor pattern is the older solution to the same problem."*
