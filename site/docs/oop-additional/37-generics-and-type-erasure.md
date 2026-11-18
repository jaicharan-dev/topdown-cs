---
id: 37-generics-and-type-erasure
title: "Generics & Type Erasure"
description: "Type safety the compiler checks and then deletes, and the long list of things you cannot do because of it"

sidebar_position: 37
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What fundamental problems did Generics solve when introduced in Java 5? How does the JVM execute generics under the hood via Type Erasure, and what practical limitations does this architectural choice impose?"

---

### Picture it

A warehouse full of unlabelled crates.

**Before**, every crate was simply "a crate". You could put anything in any of them. When you took something out you had to **assert what it was** before you could use it, and if you were wrong, you found out by dropping it. The mistake was made at packing time, discovered at unpacking time, possibly months later and in a different part of the building.

**The fix was to write the contents on the crate** at packing time, and to have **a supervisor at the packing bench** who refuses to let you put a spanner into a crate marked "bolts". Now the mistake is caught at the moment it is made, by the person making it, and nobody downstream has to assert anything, because the label already says.

**Here is the part that surprises people.** Once the supervisor has signed everything off, **the labels are peeled off before the crates go into the warehouse.**

The checking already happened. Every packing error was caught at the bench, so the labels have done their job and the warehouse does not need them. The crates travel exactly as they always did, which means the **existing warehouse, the existing trucks and the existing paperwork all keep working unchanged** with crates from before the labels were introduced.

That was the deal, and it bought something real: a warehouse full of old crates did not have to be repacked.

**But it leaves you with a warehouse where nothing is labelled**, and the consequences are permanent.

You cannot ask a crate what it holds. You cannot say "make me another crate like this one", because nothing records what "like this one" means. You cannot have two different procedures for "crate of bolts" and "crate of spanners", because at the warehouse they are the same object. And you cannot put loose sand in a crate at all, because the whole scheme was designed around discrete items.

---

### The proper terms

#### What generics solved

Four problems, and the first two are the heart of it.

**Compile-time type safety.** Before generics, a `List` held `Object`, so nothing stopped you adding the wrong type. The error was made at **insertion** and discovered at **extraction**, often far away in the code and much later in time, as a **`ClassCastException`**. Generics move the detection to **the line that is wrong**.

**Eliminating casts.** Every retrieval used to require an explicit cast, which was noise, and worse, it was an **unchecked assertion by the programmer**. With generics the compiler **inserts the cast itself** and has already proved it correct.

**Self-documenting APIs.** `Map<String, List<Order>>` states its contents. A bare `Map` tells you nothing, and the knowledge lived in comments or in someone's head.

**Generic algorithms.** `<T extends Comparable<T>> T max(List<T>)` is written once and works for every suitable type, with the bound making the requirement explicit and checked.

#### How erasure works

Generics are a **compile-time** feature. The compiler **checks** the types and then **erases** them.

Three things happen:

**Type parameters are replaced.** An unbounded `T` becomes **`Object`**; a bounded one becomes its **leftmost bound**, so `<T extends Comparable<T>>` becomes `Comparable`. `List<String>` becomes plain `List`.

**Casts are inserted** wherever a generic value is read, which is the cast you used to write yourself. It is guaranteed correct because the compiler already verified it.

**Bridge methods are generated** where erasure would otherwise break polymorphism, for instance when a class implements `Comparable<Dog>` and the interface method erases to `compareTo(Object)`.

The consequence to state clearly: **at runtime, `List<String>` and `List<Integer>` are the same class.**

```java
new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass();
// true
```

#### Why erasure was chosen

This is the part that turns a complaint into an explanation: **migration compatibility.**

Java 5 had to add generics to a language with a **vast existing ecosystem** of compiled code and libraries using raw collections. Two requirements followed:

**Existing compiled code had to keep running unchanged** on the new JVM.

**Generic and non-generic code had to interoperate**, so a new generic method could be passed a `List` from a library compiled in 1999, and old code could receive a `List<String>`.

**Reified generics**, as in C#, where the runtime knows the type arguments, would have required a new, incompatible collection hierarchy and broken binary compatibility with everything already deployed. C# could do it because .NET was young; Java could not.

So erasure was a deliberate, **pragmatic trade**: full source-level type safety, zero runtime cost, total backward compatibility, and permanent runtime blindness. It is worth presenting it that way rather than as an oversight.

#### The limitations it imposes

Each one follows directly from "the type argument does not exist at runtime".

**No `new T()`.** The constructor to call is unknown. Pass a `Class<T>` and use `getDeclaredConstructor().newInstance()`, or better, pass a `Supplier<T>`.

**No `new T[]`.** Generic array creation is a compile error, because arrays are **reified** and would need a runtime type that does not exist. The standard workaround is `(T[]) new Object[n]` with a suppressed warning, which is exactly what `ArrayList` does internally.

**No `instanceof List<String>`.** Only `instanceof List<?>` is permitted, since the runtime cannot distinguish them.

**No overloads differing only in type argument.** `f(List<String>)` and `f(List<Integer>)` **erase to the same signature**, so it is a compile error reported as a **name clash**.

**No primitives as type arguments.** `List<int>` is illegal, so you box, paying an object header and a pointer dereference per element. **Project Valhalla** aims to address this.

**No static members of a type parameter's type.** A `static T field` is impossible, because statics are per-class and there is one class for every parameterisation.

**Cannot catch or throw a generic exception type**, since `catch` dispatches on the runtime type.

**Heap pollution.** Mixing raw and generic types lets a `List<String>` acquire an `Integer`, producing a `ClassCastException` somewhere else entirely, at the compiler-inserted cast. `@SafeVarargs` exists for the generic-varargs case, where the array creation is unavoidable.

#### What survives erasure

A distinction worth drawing, because "generics are erased" is often stated too strongly.

**Generic signatures are kept in the class file**, in the **`Signature` attribute**. So **declarations** retain their type arguments, and reflection can report them:

A **field's** declared type, through `Field.getGenericType()`.

A **method's** parameter and return types, through `Method.getGenericReturnType()`.

A **class's** declared superclass and interfaces.

What is **not** retained is the type argument of an **individual object**. A `List` instance does not know it was created as a `List<String>`.

That split is exactly what frameworks exploit. Jackson and Spring resolve generic types from declarations, and the "super type token" trick works by creating an **anonymous subclass** so that the type argument is recorded in that subclass's `Signature` attribute, which is a **declaration** and therefore survives.

---

### In code

```java
// BEFORE generics: the error is made at INSERTION and discovered
// at EXTRACTION
List list = new ArrayList();
list.add("hello");
list.add(42);                           // nothing complains
Integer i = (Integer) list.get(0);      // ClassCastException, HERE,
                                        // possibly months later and
                                        // far away in the code

// AFTER: the error is caught on THE LINE THAT IS WRONG
List<String> list2 = new ArrayList<>();
list2.add("hello");
// list2.add(42);                       // COMPILE ERROR
String s = list2.get(0);                // no cast: the compiler
                                        // inserts it, already proved
                                        // correct
```

```text
The four problems generics solved:

  COMPILE-TIME TYPE SAFETY  the error moves from the extraction site
                            to THE LINE THAT IS WRONG
  ELIMINATING CASTS         the compiler inserts them, and has
                            already PROVED them correct, instead of
                            you ASSERTING them
  SELF-DOCUMENTING APIs     Map<String, List<Order>> states its
                            contents; a bare Map tells you nothing
  GENERIC ALGORITHMS        <T extends Comparable<T>> T max(List<T>)
                            written once, with the requirement
                            explicit and checked
```

```java
// WHAT YOU WRITE
class Box<T extends Comparable<T>> {
    private T value;
    T get()          { return value; }
    void set(T v)    { this.value = v; }
}
Box<String> b = new Box<>();
String s = b.get();

// WHAT THE COMPILER PRODUCES, after ERASURE
class Box {
    private Comparable value;              // T -> its LEFTMOST BOUND
    Comparable get()        { return value; }
    void set(Comparable v)  { this.value = v; }
}
Box b = new Box();
String s = (String) b.get();               // THE CAST IS INSERTED

// three things happen:
//   TYPE PARAMETERS ARE REPLACED: unbounded T -> Object,
//     bounded -> the leftmost bound; List<String> -> List
//   CASTS ARE INSERTED wherever a generic value is read
//   BRIDGE METHODS are generated where erasure would otherwise
//     break polymorphism

new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass();
// TRUE. At runtime they are THE SAME CLASS.
```

```text
Why erasure was chosen: MIGRATION COMPATIBILITY

  Java 5 had to add generics to a language with a VAST EXISTING
  ECOSYSTEM of compiled code and libraries using raw collections.
  Two requirements followed:

     EXISTING COMPILED CODE had to keep running unchanged
     GENERIC AND NON-GENERIC CODE had to interoperate, so a new
        generic method could accept a List from a library compiled
        in 1999, and old code could receive a List<String>

  REIFIED GENERICS (as in C#, where the runtime knows the type
  arguments) would have required a NEW, INCOMPATIBLE COLLECTION
  HIERARCHY and broken binary compatibility with everything already
  deployed.
  C# could do it because .NET was young. Java could not.

  so erasure was a deliberate PRAGMATIC TRADE:
     full source-level type safety
     zero runtime cost
     total backward compatibility
     and PERMANENT RUNTIME BLINDNESS

  which is an explanation, not an oversight.
```

```java
// THE LIMITATIONS, each following from "the type argument does not
// exist at runtime"

// 1. NO new T()
class Factory<T> {
    // T create() { return new T(); }        // COMPILE ERROR
    T create(Class<T> type) throws Exception {
        return type.getDeclaredConstructor().newInstance();   // pass it
    }
    T create(Supplier<T> supplier) { return supplier.get(); } // better
}

// 2. NO new T[]
class Container<T> {
    // private T[] items = new T[10];         // COMPILE ERROR:
                                              // generic array creation
    @SuppressWarnings("unchecked")
    private T[] items = (T[]) new Object[10]; // what ArrayList does
}                                             // internally

// 3. NO instanceof with a type argument
// if (o instanceof List<String>) { }         // COMPILE ERROR
if (o instanceof List<?>) { }                 // the only form allowed

// 4. NO overloads differing only in type argument
// void f(List<String> l) { }
// void f(List<Integer> l) { }                // COMPILE ERROR:
//    "name clash: both methods have the same erasure"

// 5. NO primitives as type arguments
// List<int> nums;                            // COMPILE ERROR
List<Integer> nums;                           // boxed: an object
                                              // header and a pointer
                                              // dereference per element
                                              // (Project Valhalla aims
                                              //  to fix this)

// 6. NO static member of a type parameter's type
class Holder<T> {
    // static T shared;                       // COMPILE ERROR
}                                             // statics are per-CLASS,
                                              // and there is ONE class
                                              // for every parameterisation

// 7. CANNOT catch or throw a generic exception type
// catch (T e) { }                            // COMPILE ERROR:
                                              // catch dispatches on the
                                              // RUNTIME type
```

```java
// HEAP POLLUTION: mixing raw and generic types
List<String> strings = new ArrayList<>();
List raw = strings;              // unchecked, but legal
raw.add(42);                     // an Integer is now in a List<String>

String s = strings.get(0);       // ClassCastException HERE, at the
                                 // compiler-inserted cast, nowhere
                                 // near the line that caused it

// @SafeVarargs exists for the generic-varargs case, where the array
// creation is unavoidable:
@SafeVarargs
static <T> List<T> listOf(T... items) { return Arrays.asList(items); }
```

```java
// WHAT SURVIVES ERASURE: "generics are erased" is often stated
// too strongly

class Service {
    private List<String> names;                       // a DECLARATION
    public Map<String, List<Order>> lookup() { ... }  // a DECLARATION
}

Field f = Service.class.getDeclaredField("names");
f.getGenericType();        // java.util.List<java.lang.String>
                           // RETAINED, in the class file's
                           // Signature attribute

List<String> instance = new ArrayList<>();
// instance.???            // the OBJECT does not know. Nothing on an
                           // instance records its type argument.

// DECLARATIONS keep their type arguments. INSTANCES do not.

// which is exactly what frameworks exploit. The "super type token"
// trick creates an ANONYMOUS SUBCLASS so the type argument is
// recorded in THAT SUBCLASS'S declaration, which survives:
var ref = new TypeReference<Map<String, List<Order>>>() { };
//                                                     ^^^ the braces
//        make an anonymous subclass, whose Signature attribute
//        records the type argument. Jackson and Spring both do this.
```

---

### What they ask next

**"What problem did generics actually solve?"**
They moved type errors from runtime to compile time. Before, an error made at insertion surfaced as a `ClassCastException` at extraction, often far away and much later. They also removed the casts, which were unchecked assertions by the programmer, and made APIs self-documenting.

**"Why was erasure chosen over reified generics?"**
Migration compatibility. Java had an enormous base of compiled code using raw collections that had to keep working, and generic and non-generic code had to interoperate. Reification would have needed a new incompatible collection hierarchy. C# could reify because .NET was young.

**"Why can you not write `new T()`?"**
Because `T` does not exist at runtime, so there is no constructor to call. You pass a `Class<T>` and use `getDeclaredConstructor().newInstance()`, or better a `Supplier<T>`, which is also type-safe and does not throw reflective exceptions.

**"Why is generic array creation forbidden?"**
Because arrays are **reified**: an array carries its component type and checks every store. A `T[]` would need a runtime component type that erasure has removed. The workaround is `(T[]) new Object[n]` with a suppressed warning, which is what `ArrayList` does.

**"Why can you not overload on `List<String>` and `List<Integer>`?"**
Because both erase to `f(List)`, so the two methods have identical signatures in the class file. The compiler reports it as a name clash, and there is no way around it other than renaming.

**"What is heap pollution?"**
A situation where a variable of a parameterised type refers to an object that is not of that type, usually from mixing raw and generic types. The failure appears later at a compiler-inserted cast, far from the line that caused it, which is what makes unchecked warnings worth taking seriously.

**"Is anything about generics available at runtime?"**
Yes, and the distinction matters: **declarations** keep their type arguments in the class file's `Signature` attribute, so reflection can report a field's or method's generic type. **Instances** do not, so an object cannot tell you its type argument. The super type token trick exploits exactly this by creating an anonymous subclass whose declaration records the type.

**"Does erasure cost performance?"**
No, it is free at runtime, which was part of the appeal. The cost is **boxing**, since primitives cannot be type arguments, so `List<Integer>` pays an object header and a pointer dereference per element where an `int[]` would not. Project Valhalla is aimed at that.

**The common wrong answer** is "generics are compile-time only and erased, so you cannot use the type at runtime", which is right and incomplete. The answer wanted explains **why** erasure was chosen, which is migration compatibility with a huge existing ecosystem, and notes that **declarations keep their generic signatures** even though instances do not, which is the basis of every framework that resolves generic types reflectively.

---

### Say this in the interview

*"Generics solved four problems. Compile-time type safety: before, a List held Object, so the error was made at insertion and discovered at extraction as a ClassCastException, often far away in the code and much later in time, and generics move the detection to the line that is wrong. Eliminating casts: every retrieval used to need an explicit cast, which was noise and, worse, an unchecked assertion by the programmer, whereas the compiler now inserts the cast itself having already proved it correct. Self-documenting APIs, since Map of String to List of Order states its contents where a bare Map tells you nothing. And generic algorithms, so a max method bounded by Comparable is written once and works for every suitable type with the requirement explicit and checked.*

*Erasure means generics are a compile-time feature: the compiler checks the types and then removes them. Type parameters are replaced, with an unbounded T becoming Object and a bounded one its leftmost bound, so List of String becomes plain List. Casts are inserted wherever a generic value is read, which is the cast you used to write. And bridge methods are generated where erasure would otherwise break polymorphism, for example when a class implements Comparable of Dog and the interface method erases to compareTo of Object. The consequence is that at runtime List of String and List of Integer are the same class, and getClass on both returns the same object.*

*Erasure was chosen for migration compatibility. Java 5 had to add generics to a language with a vast existing ecosystem of compiled code using raw collections, so existing compiled code had to keep running unchanged and generic and non-generic code had to interoperate, meaning a new generic method could accept a List from a library compiled years earlier. Reified generics, as in C#, would have required a new incompatible collection hierarchy and broken binary compatibility with everything deployed. C# could do it because .NET was young and Java could not. So it was a deliberate pragmatic trade: full source-level type safety, zero runtime cost, total backward compatibility, and permanent runtime blindness.*

*The limitations all follow from the type argument not existing at runtime. No new T, because there is no constructor to call, so you pass a Class or better a Supplier. No new T array, because arrays are reified and would need a runtime component type, so the workaround is casting a new Object array with a suppressed warning, which is what ArrayList does internally. No instanceof with a type argument, only with a wildcard. No overloads differing only in type argument, because they erase to the same signature and the compiler reports a name clash. No primitives as type arguments, so you box and pay an object header and a pointer dereference per element, which Project Valhalla aims to address. No static member of a type parameter's type, since statics are per class and there is one class for all parameterisations. No catching or throwing a generic exception type, because catch dispatches on the runtime type. And heap pollution, where mixing raw and generic types lets a List of String acquire an Integer, with the ClassCastException surfacing later at a compiler-inserted cast far from the cause, which is why @SafeVarargs exists for the generic varargs case.*

*One distinction I would add, because people state erasure too strongly: generic signatures are kept in the class file in the Signature attribute, so declarations retain their type arguments and reflection can report a field's generic type or a method's generic return type. What is not retained is the type argument of an individual object, so a List instance does not know it was created as a List of String. That split is exactly what frameworks exploit: the super type token trick creates an anonymous subclass so the type argument is recorded in that subclass's declaration, which survives, and Jackson and Spring both rely on it."*
