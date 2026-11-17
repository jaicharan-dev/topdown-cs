---
id: 22-covariant-return-type
title: "Covariant Return Types"
description: "Promising something more specific than you were asked for, and the invisible method the compiler writes to make it work"

sidebar_position: 22
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a covariant return type in Java? How does it honor the Liskov Substitution Principle, why does the compiler generate synthetic bridge methods under the hood, and do covariant returns apply to primitives?"

---

### Picture it

A contract says: **"when asked, you will supply a vehicle."**

A taxi firm signing that contract can honestly promise **"when asked, I will supply a car"**. That is not a breach, it is a **stronger version of the same promise**. Anyone relying on the contract asked for a vehicle and will certainly be satisfied by a car, so **no existing arrangement breaks**. Promising more than required is always safe.

Now reverse it. Suppose the firm instead said **"I will only accept requests from people holding a gold card"**. That **is** a breach, because the contract said anyone could ask. Being **more demanding about what comes in** breaks callers; being **more generous about what goes out** does not. That asymmetry is the whole rule, and it is not a Java quirk.

**And now the awkward bookkeeping underneath.**

Suppose the filing clerk indexes contracts by **both** what goes in and what comes out. The original is filed under "takes nothing, returns a vehicle". The taxi firm's is filed under "takes nothing, returns a car". To the clerk these are **two different contracts**, so when somebody looks up the original they do not find the firm's version at all, and the stronger promise is invisible.

The fix is a small piece of paperwork: the firm also files a **stub** under the original heading, "takes nothing, returns a vehicle", which simply says **"see our car contract"**. Anyone looking up the old heading finds the stub, follows it, and gets the car. Nobody reads the stub deliberately; it exists purely to make the filing system work.

**One last thing.** This only works because a car **is a kind of** vehicle. If the contract promised "a number between 1 and 100" and the firm offered "a number between 1 and 10", that is also a stronger promise in spirit, but the filing system has **no notion of one number type being a kind of another**, so the trick does not apply.

---

### The proper terms

#### What it is

A **covariant return type** means an **overriding method may return a subtype** of the type declared by the method it overrides.

Before **Java 5** the return type had to match **exactly**, which forced callers to downcast constantly. Java 5 relaxed it, and the effect is visible everywhere in the standard library: **`Object.clone()`** returns `Object`, but an overriding `clone()` returns the actual class, so no cast is needed.

```java
class Animal { Animal reproduce() { return new Animal(); } }
class Dog extends Animal {
    @Override Dog reproduce() { return new Dog(); }   // covariant
}

Dog puppy = new Dog().reproduce();   // no cast. That is the benefit.
```

#### How it honours the Liskov Substitution Principle

The **LSP** requires that an object of a subtype can be substituted wherever the supertype is expected, **without breaking any caller**. Formally, an override may:

**Weaken preconditions**, accepting at least as much as before.

**Strengthen postconditions**, promising at least as much as before.

A covariant return is exactly a **strengthened postcondition**. The parent promised "an `Animal` comes back"; the child promises "a `Dog` comes back", which **implies** the parent's promise, since every `Dog` is an `Animal`. Every existing caller, written against `Animal`, still gets something it can use. **Nothing that compiled before can break.**

The asymmetry is the part worth stating, because it explains why Java allows one and not the other:

**Return types are covariant**, meaning more specific is allowed, because the caller **receives** the value and a stronger guarantee cannot hurt it.

**Parameter types are invariant** in Java, and would need to be **contravariant**, meaning more general, to be safe. Narrowing a parameter **strengthens a precondition** and would break callers legitimately passing the wider type. Java does not permit contravariant parameters at all; declaring a different parameter type produces an **overload**, not an override, which is one of the most common accidental bugs and the strongest argument for always writing `@Override`.

#### Why bridge methods exist

This is the mechanical half of the question.

**The JVM identifies a method by name plus descriptor, and the descriptor includes the return type.** So at the bytecode level:

```text
Animal.reproduce : ()LAnimal;
Dog.reproduce    : ()LDog;
```

These are **two different methods**. The JVM's override rules work on **name and descriptor**, so `Dog.reproduce()LDog;` does **not** override `Animal.reproduce()LAnimal;` as far as the JVM is concerned.

Without further help, calling `reproduce()` through an `Animal` reference would dispatch to **`Animal`'s** version, silently defeating the override.

So `javac` generates a **bridge method**: a synthetic method in `Dog` with the **parent's descriptor**, which simply **delegates** to the real one and returns its result.

```text
// generated in Dog, not written by you
Animal reproduce() {          // ACC_BRIDGE | ACC_SYNTHETIC
    return this.reproduce();  // calls Dog reproduce()LDog;
}
```

It carries the flags **`ACC_BRIDGE`** and **`ACC_SYNTHETIC`**, marking it as compiler-generated. Now `Animal.reproduce()LAnimal;` **is** properly overridden, virtual dispatch finds the bridge, and the bridge calls the real method.

The same mechanism is what makes **generics** work after **type erasure**, and this is the connection worth making because it explains a real exception:

```java
class DogComparator implements Comparable<Dog> {
    @Override public int compareTo(Dog other) { ... }
}
```

The interface erases to `compareTo(Object)`, so `javac` generates a bridge `compareTo(Object)` that **casts the argument to `Dog`** and delegates. That cast is where a **`ClassCastException` from a raw-type misuse actually originates**: the exception is thrown inside a method you never wrote, in a stack frame that looks inexplicable until you know bridges exist.

Bridges are visible in `javap -v` and through reflection as `Method.isBridge()`, which matters because **reflection sees both methods**, and frameworks that scan methods must filter bridges out or they process everything twice.

#### Do covariant returns apply to primitives?

**No**, and the reason is precise: **covariance requires a subtype relationship, and primitives have no inheritance hierarchy.**

`int` is not a subtype of `long`. Converting between them is a **widening primitive conversion**, which is a **value conversion** performed by the compiler, not a subtyping relationship. So an override returning `int` where the parent returns `long` is simply a **return type mismatch** and fails to compile.

```java
class A { long value() { return 1L; } }
class B extends A {
    @Override int value() { return 1; }   // COMPILE ERROR
}
```

Nor does **autoboxing** create covariance. `Integer` is a subtype of `Object` and of `Number`, so `Object` to `Integer` is genuinely covariant, but **`int` to `Integer` is a boxing conversion**, not subtyping, so it does not satisfy the override rule either.

The same logic answers the related question about **arrays**: arrays **are** covariant in Java, so `String[]` is a subtype of `Object[]`. That was a deliberate early decision and is now considered a **flaw**, because it is not type-safe:

```java
Object[] objects = new String[1];
objects[0] = 42;    // compiles, throws ArrayStoreException at runtime
```

**Generics are invariant precisely to avoid this**, which is why `List<String>` is not a `List<Object>`, and why wildcards exist to recover the flexibility safely.

---

### In code

```java
// Before Java 5: exact return types, so callers downcast constantly
class Animal { Animal reproduce() { return new Animal(); } }
class Dog extends Animal {
    @Override Animal reproduce() { return new Dog(); }
}
Dog puppy = (Dog) new Dog().reproduce();   // a cast on every call site

// Java 5+: covariant return, no cast anywhere
class Dog2 extends Animal {
    @Override Dog2 reproduce() { return new Dog2(); }
}
Dog2 puppy2 = new Dog2().reproduce();      // clean

// the standard library's canonical example:
// Object.clone() returns Object, but every override returns its own
// type, so clone() has not needed a cast since Java 5
```

```text
Why LSP permits this, and why parameters are different:

  LSP: a subtype must be substitutable for its supertype without
       breaking any caller. An override may:
          WEAKEN preconditions    (accept at least as much)
          STRENGTHEN postconditions (promise at least as much)

  RETURN TYPES -> COVARIANT (more specific is allowed)
     parent promises "an Animal comes back"
     child  promises "a Dog comes back"
     -> a Dog IS an Animal, so the child's promise IMPLIES the
        parent's
     -> every existing caller, written against Animal, still gets
        something it can use
     -> NOTHING THAT COMPILED BEFORE CAN BREAK

  PARAMETER TYPES -> would need to be CONTRAVARIANT (more general)
     narrowing a parameter STRENGTHENS A PRECONDITION and breaks
     callers legitimately passing the wider type

     class A { void feed(Animal a) {} }
     class B extends A { void feed(Dog d) {} }   // NOT an override!
                                                 // it is an OVERLOAD

     A ref = new B();
     ref.feed(new Cat());    // calls A.feed. Silently.

     -> Java does not allow contravariant parameters at all, and a
        different parameter type silently becomes an OVERLOAD.
        This is the single strongest argument for @Override.
```

```text
Why bridge methods are necessary:

  the JVM identifies a method by NAME + DESCRIPTOR, and the
  DESCRIPTOR INCLUDES THE RETURN TYPE:

     Animal.reproduce : ()LAnimal;
     Dog.reproduce    : ()LDog;

  to the JVM these are TWO DIFFERENT METHODS. Its override rules
  work on name and descriptor, so Dog's version does NOT override
  Animal's.

  without help, calling reproduce() through an Animal reference would
  dispatch to ANIMAL'S version, silently defeating the override.

  so javac GENERATES a bridge in Dog:

     Animal reproduce() {           // ACC_BRIDGE | ACC_SYNTHETIC
         return this.reproduce();   // calls Dog reproduce()LDog;
     }

  now Animal.reproduce()LAnimal; IS properly overridden, virtual
  dispatch finds the bridge, and the bridge calls the real method.

  you can see it:  javap -v Dog.class
  and in reflection: Method.isBridge()
  -> which matters, because REFLECTION SEES BOTH METHODS, so
     frameworks scanning methods must filter bridges out or they
     process everything twice.
```

```java
// The same mechanism makes GENERICS work after type erasure,
// and explains a ClassCastException people find inexplicable
class DogComparator implements Comparable<Dog> {
    @Override public int compareTo(Dog other) { return 0; }
}

// Comparable<Dog> ERASES to Comparable, so the interface method is
// compareTo(Object). javac generates:
//
//     public int compareTo(Object o) {      // ACC_BRIDGE
//         return this.compareTo((Dog) o);   // <-- THE CAST
//     }
//
// that cast is where a ClassCastException from a raw-type misuse
// ACTUALLY ORIGINATES: it is thrown inside a method you never wrote,
// in a stack frame that looks inexplicable until you know bridges
// exist.

Comparable raw = new DogComparator();
raw.compareTo("not a dog");     // ClassCastException, inside the bridge
```

```java
// Primitives: NO, and the reason is precise
class A { long value() { return 1L; } }
class B extends A {
    @Override int value() { return 1; }   // COMPILE ERROR
}
// covariance requires a SUBTYPE relationship.
// int is NOT a subtype of long: converting between them is a
// WIDENING PRIMITIVE CONVERSION, a value conversion done by the
// compiler, not subtyping. So this is just a return type mismatch.

// nor does autoboxing help:
class C { Object get() { return null; } }
class D extends C {
    @Override Integer get() { return 1; }   // FINE: Integer IS a
}                                           // subtype of Object
class E extends C {
    // @Override int get() { return 1; }    // ERROR: int is a
}                                           // primitive, not a subtype
```

```java
// The related question: ARRAYS are covariant, and that is a known flaw
Object[] objects = new String[1];   // compiles: String[] IS an Object[]
objects[0] = 42;                    // compiles...
                                    // ...throws ArrayStoreException

// the type system said this was safe and it is not, so the check had
// to be moved to RUNTIME. Every array store carries that check.

// GENERICS ARE INVARIANT PRECISELY TO AVOID THIS:
List<Object> list = new ArrayList<String>();   // COMPILE ERROR
// caught at compile time instead, which is why List<String> is not
// a List<Object>, and why wildcards exist to recover the
// flexibility safely:
void printAll(List<? extends Object> anyList) { }   // read-only, safe
```

---

### What they ask next

**"Why are return types covariant but parameters not?"**
Because the caller **receives** the return value, so a stronger guarantee cannot hurt it, while the caller **supplies** the arguments, so narrowing a parameter breaks callers legitimately passing the wider type. Covariance strengthens a postcondition, which LSP allows; narrowing a parameter strengthens a precondition, which it forbids.

**"What happens if you change a parameter type in a subclass?"**
You get an **overload**, not an override, and it compiles silently. Calls through a supertype reference then reach the parent's method, which is one of the most common accidental bugs in Java and the reason `@Override` should always be present.

**"Why does the JVM need a bridge method?"**
Because a method's identity includes its **return type** in the descriptor, so `()LDog;` and `()LAnimal;` are different methods and the JVM would not see the override. The bridge has the parent's descriptor and delegates to the real method, restoring correct virtual dispatch.

**"How can you see a bridge method?"**
`javap -v` shows it flagged `ACC_BRIDGE` and `ACC_SYNTHETIC`, and reflection exposes it with `Method.isBridge()`. It matters in practice because reflection returns **both** methods, so framework code scanning a class must filter bridges out or handle each method twice.

**"Where does a generics `ClassCastException` actually come from?"**
Usually from the cast inside a generated bridge method. After erasure the interface method takes `Object`, so the bridge casts to the real type before delegating, and a raw-type misuse fails there, in a frame that was never written by hand.

**"Do covariant returns work with primitives?"**
No. Covariance needs a subtype relationship and primitives have no hierarchy, so widening `int` to `long` is a value conversion rather than subtyping, and an override returning `int` for a declared `long` simply fails to compile. Autoboxing does not help either, since `int` to `Integer` is a boxing conversion.

**"Why are arrays covariant if that is unsafe?"**
It was an early decision made before generics existed, so that methods like `Arrays.sort(Object[])` could work on any array. The cost is that every array store needs a runtime check and `ArrayStoreException` exists at all, which is precisely why generics were made invariant.

**The common wrong answer** is "a covariant return lets you return a subclass, which is convenient". The question is really about three things: **why it is safe**, which is LSP's rule that postconditions may be strengthened; **how it works**, which is a compiler-generated bridge method with the parent's descriptor, because the JVM's method identity includes the return type; and **why it stops at primitives**, which is that covariance needs subtyping and primitives have none.

---

### Say this in the interview

*"A covariant return type means an overriding method may return a subtype of the type declared by the method it overrides. Before Java 5 the return type had to match exactly, so callers downcast constantly. The canonical example is Object.clone, which returns Object while every override returns its own class, so no cast is needed.*

*It honours the Liskov Substitution Principle because LSP says a subtype must be substitutable for its supertype without breaking any caller, and formally an override may weaken preconditions and strengthen postconditions. A covariant return is exactly a strengthened postcondition: the parent promised an Animal comes back, the child promises a Dog comes back, and since every Dog is an Animal the child's promise implies the parent's, so every existing caller written against Animal still gets something it can use and nothing that compiled before can break.*

*The asymmetry is the part worth stating. Return types are covariant, meaning more specific is allowed, because the caller receives the value and a stronger guarantee cannot hurt it. Parameters would have to be contravariant, more general, to be safe, because narrowing a parameter strengthens a precondition and breaks callers legitimately passing the wider type. Java does not allow contravariant parameters at all, and declaring a different parameter type silently produces an overload rather than an override, which is one of the most common accidental bugs and the strongest argument for always writing @Override.*

*Bridge methods exist because the JVM identifies a method by name plus descriptor, and the descriptor includes the return type. So Animal.reproduce returning Animal and Dog.reproduce returning Dog are two different methods at the bytecode level, and the JVM's override rules work on name and descriptor, so Dog's version does not override Animal's. Without help, calling reproduce through an Animal reference would dispatch to Animal's version and silently defeat the override. So javac generates a synthetic bridge method in Dog with the parent's descriptor, which simply delegates to the real one and returns its result, flagged ACC_BRIDGE and ACC_SYNTHETIC. Now the parent's method is properly overridden, virtual dispatch finds the bridge, and the bridge calls the real method.*

*The same mechanism is what makes generics work after type erasure, and it explains a real exception. If a class implements Comparable of Dog, the interface erases to compareTo of Object, so javac generates a bridge compareTo of Object that casts the argument to Dog and delegates. That cast is where a ClassCastException from raw-type misuse actually originates, thrown inside a method you never wrote, in a stack frame that looks inexplicable until you know bridges exist. They are visible with javap -v and through Method.isBridge, which matters because reflection sees both methods, so frameworks scanning a class must filter bridges out or they process everything twice.*

*Covariant returns do not apply to primitives, and the reason is precise: covariance requires a subtype relationship and primitives have no inheritance hierarchy. int is not a subtype of long; converting between them is a widening primitive conversion, a value conversion the compiler performs, not subtyping. So an override returning int where the parent returns long is simply a return type mismatch and fails to compile. Autoboxing does not create covariance either, since int to Integer is a boxing conversion rather than subtyping, though Integer to Object is genuinely covariant because Integer really is a subtype of Object.*

*The related point is arrays, which are covariant in Java, so String array is a subtype of Object array. That was a deliberate early decision and is now considered a flaw, because you can assign a String array to an Object array reference and then store an Integer into it, which compiles and throws ArrayStoreException at runtime. Generics were made invariant precisely to avoid that, which is why List of String is not a List of Object, and why wildcards exist to recover the flexibility safely."*
