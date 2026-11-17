---
id: 19-static-binding-vs-dynamic-binding
title: "Static Binding vs Dynamic Binding"
description: "Decided by the label on the box or by what is actually inside it, and the table the JVM uses to find out"

sidebar_position: 19
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the core difference between static and dynamic binding? How does the JVM decide which method implementation to execute at runtime, and what are the exact roles of bytecode dispatch instructions and the Virtual Method Table (v-table)?"

---

### Picture it

A box on a shelf labelled **"tool"**, with a hammer inside it.

Two different questions can be answered about that box, and they have different answers.

**"What does the label permit me to ask for?"** The label says tool, so you may ask for anything any tool can do. That is settled **the moment the label is written**, and the actual contents are irrelevant to it.

**"What happens when I ask?"** That depends entirely on the **hammer**, not on the word written outside. Asking the box to "strike" produces hammering, because a hammer is what is in there.

So one decision is made by **the label**, and the other by **the contents**. Both are real, both are necessary, and confusing them is where the bugs come from.

**A few things go by the label even though you would expect otherwise.** Anything the box itself does not have to think about: a sticker printed on the outside, or a property of **the category "tool"** rather than of any particular tool. Those were decided when the label was written, so changing the contents does not change them. **Including the writing on the box**, which is the one that catches people: if both the box label and the hammer have a serial number written on them, reading "the box's serial number" gives you **the box's**, not the hammer's.

**And the mechanical question: how is this fast?** If every request meant rummaging through the box to work out what is inside, it would be slow. Instead every category of thing keeps a **numbered list of what it can do**, and the numbering is **inherited**: "strike" is entry 3 for every tool, so a hammer's entry 3 is hammering and a screwdriver's entry 3 is whatever a screwdriver does when struck. To serve a request you look at the contents' list, go to **entry 3**, and do what is there. No searching, just two steps.

---

### The proper terms

#### The core difference

**Binding** is associating a method **call** with the method **body** that will run.

**Static binding**, also called **early binding**, is resolved at **compile time**, from the **declared type** of the reference, which is the static type.

**Dynamic binding**, also called **late binding**, is resolved at **runtime**, from the **actual class of the object**, which is the runtime type. This is what makes polymorphism work.

What is bound statically, and the list is worth memorising because each item has a reason:

**`static` methods**, because they belong to the class, not an instance, so there is no object to dispatch on.

**`private` methods**, because they are not inherited and therefore cannot be overridden.

**`final` methods**, because no override can exist, so the target is already unique.

**Constructors**, because the exact class being constructed is known at the call site.

**Fields**, always. Fields are never polymorphic, and this is the classic trap discussed below.

**Overloading**, where the choice between `f(int)` and `f(String)` is made from the **compile-time argument types**.

Bound dynamically: **overridden instance methods**, and nothing else.

#### The bytecode instructions

The JVM has five invocation instructions, and naming them precisely is what this question is testing.

**`invokestatic`.** For `static` methods. The target is fully known at compile time and there is no receiver object at all.

**`invokespecial`.** For **constructors**, **`private` methods** and `super.method()` calls. Its defining property is that it is **non-virtual**: it invokes **exactly** the named method, with no dynamic lookup. That is why `super.toString()` reaches the parent's version rather than recursing into the override.

**`invokevirtual`.** For ordinary instance methods called through a **class** type. This is the one that performs **virtual dispatch** via the v-table.

**`invokeinterface`.** For instance methods called through an **interface** type. Semantically the same as `invokevirtual`, but the lookup is different and historically slower, for reasons explained below.

**`invokedynamic`.** Added in Java 7. The call site is **unlinked** until first execution, when a **bootstrap method** decides what it should call. Lambdas and modern string concatenation are built on it, which is why a lambda is not simply an anonymous class.

#### The v-table

Each class has a **v-table**, a virtual method table, an array of pointers to method implementations.

The property that makes dispatch fast is that the table is built by **copying the superclass's table and replacing overridden entries at the same index**. So a method occupies the **same index in every class in the hierarchy**.

Dispatch is therefore three steps with no searching:

**Load the object's class pointer** from its header.

**Index the v-table** at the offset the compiler already determined for that method.

**Call** the pointer found there.

Constant time, two memory indirections, independent of hierarchy depth.

**Interfaces cannot use a fixed index**, which is the reason `invokeinterface` exists separately. A class may implement several interfaces, and their methods cannot all be assigned consistent indices, because two unrelated interfaces would claim the same slot. HotSpot therefore uses **itables**, interface method tables, which require a **search** to find the right interface's block. That is the historical performance gap, and modern JITs have largely closed it.

#### What actually happens at runtime

The v-table is the specified behaviour, not usually the executed one, and saying so is what distinguishes a current answer.

**HotSpot profiles every call site** and optimises on what it observes:

**Monomorphic**, one receiver type ever seen: the JIT installs an **inline cache**, a cheap **type guard** followed by a **direct call**, and very often inlines the method body entirely. Dynamic dispatch then costs approximately nothing.

**Bimorphic**, two types: a two-way guarded dispatch, still far cheaper than a table lookup.

**Megamorphic**, three or more: it falls back to a real v-table or itable dispatch.

**Class Hierarchy Analysis** goes further. If only **one** implementation of a method is loaded, the JIT may devirtualise speculatively, compiling a direct call and deoptimising if a second implementation is ever loaded. That is why `final` rarely helps performance in modern Java: the JIT already knows.

#### The field trap

Fields use static binding, always, so the **declared type of the reference** selects the field.

```java
Parent p = new Child();
System.out.println(p.x);        // Parent's x, not Child's
System.out.println(p.getX());   // Child's getX(), via dynamic binding
```

Two lines, two different rules, which is exactly why fields should be **private** and accessed through methods. Shadowing a field is **hiding**, not overriding, and almost always a mistake.

---

### In code

```java
class Animal {
    String name = "animal";                 // field: STATIC binding
    void speak()        { System.out.println("..."); }
    static void info()  { System.out.println("Animal class"); }
    final void breathe(){ System.out.println("breathing"); }
}

class Dog extends Animal {
    String name = "dog";                    // HIDES, does not override
    @Override void speak() { System.out.println("Woof"); }
    static void info()     { System.out.println("Dog class"); }
}

Animal a = new Dog();

a.speak();     // "Woof"          DYNAMIC: the object decides
a.name;        // "animal"        STATIC:  the REFERENCE decides
Animal.info(); // "Animal class"  STATIC:  no receiver at all
a.breathe();   // STATIC: final, so the target is already unique
```

```text
The decision table, with the reason for each row:

  BOUND STATICALLY (compile time, from the DECLARED type)
    static methods     belong to the CLASS; there is no object to
                       dispatch on
    private methods    not inherited, so no override can exist
    final methods      no override can exist, so the target is unique
    constructors       the exact class being built is known here
    FIELDS             always, with no exception
    overload choice    f(int) vs f(String) is picked from the
                       COMPILE-TIME argument types

  BOUND DYNAMICALLY (runtime, from the ACTUAL class)
    overridden instance methods, and nothing else
```

```text
The five invocation instructions:

  invokestatic      static methods
                    target fully known at compile time, NO receiver

  invokespecial     constructors, private methods, super.method()
                    NON-VIRTUAL: invokes EXACTLY the named method
                    -> which is why super.toString() reaches the
                       parent instead of recursing into the override

  invokevirtual     instance methods via a CLASS type
                    VIRTUAL DISPATCH through the v-table

  invokeinterface   instance methods via an INTERFACE type
                    same semantics, different lookup (itable), and
                    historically slower

  invokedynamic     Java 7. The call site is UNLINKED until first
                    execution, when a BOOTSTRAP METHOD decides what
                    it calls.
                    -> lambdas and modern string concatenation,
                       which is why a lambda is not just an
                       anonymous class
```

```text
The v-table, and why dispatch is constant time:

  class Animal              class Dog extends Animal
  vtable:                   vtable:  (a COPY, with overrides replaced
    [0] Object.toString       [0] Object.toString     AT THE SAME INDEX)
    [1] Object.equals         [1] Object.equals
    [2] Animal.speak          [2] Dog.speak        <-- REPLACED
    [3] Animal.breathe        [3] Animal.breathe       (inherited)

  a method occupies THE SAME INDEX in every class in the hierarchy.

  so a.speak() with invokevirtual is:
     1. load the object's CLASS POINTER from its header
     2. index the v-table at offset 2  (known at COMPILE time)
     3. call the pointer found there

  constant time, two indirections, independent of hierarchy depth.
  No searching.

  INTERFACES CANNOT USE A FIXED INDEX: a class may implement several
  interfaces, and two unrelated ones would claim the same slot.
  So HotSpot uses ITABLES, which need a SEARCH to find the right
  interface's block. That is the historical cost of invokeinterface.
```

```text
What the JIT actually does, which is not the v-table:

  HotSpot PROFILES every call site:

  MONOMORPHIC   one receiver type ever seen
                -> INLINE CACHE: a cheap TYPE GUARD + a DIRECT CALL
                -> very often the method body is INLINED ENTIRELY
                -> dynamic dispatch costs approximately NOTHING

  BIMORPHIC     two types
                -> a two-way guarded dispatch, still far cheaper
                   than a table lookup

  MEGAMORPHIC   three or more
                -> fall back to real v-table or itable dispatch

  and CLASS HIERARCHY ANALYSIS goes further: if only ONE
  implementation is loaded, the JIT DEVIRTUALISES SPECULATIVELY,
  compiling a direct call and DEOPTIMISING if a second one is
  ever loaded.

  which is why `final` rarely helps performance in modern Java:
  the JIT already knows.
```

```java
// The field trap, in full
class Parent { String id = "P"; String getId() { return id; } }
class Child extends Parent {
    String id = "C";
    @Override String getId() { return id; }
}

Parent p = new Child();
p.id;                     // "P"   field    -> the REFERENCE decides
p.getId();                // "C"   method   -> the OBJECT decides
((Child) p).id;           // "C"   a different reference type, so a
                          //       different field

// two lines, two different rules. This is exactly why fields should
// be private and reached through methods. Shadowing a field is
// HIDING, not overriding, and is almost always a mistake.
```

---

### What they ask next

**"Why can a static method not be overridden?"**
Because overriding requires an object to dispatch on, and a static call has no receiver. The compiler emits `invokestatic` with the target resolved against the declared class, so there is no runtime decision to make. Redeclaring one in a subclass is **hiding**, resolved from the reference type.

**"Is overloading static or dynamic?"**
Static. The compiler picks the overload from the **compile-time types** of the arguments, so `f(Object)` is chosen for `Object o = "s"; f(o);` even though the object is a `String` at runtime. Only **which override runs** is decided dynamically.

**"Why does `invokespecial` exist?"**
Because constructors, private methods and `super` calls must reach **exactly** the named method with no dynamic lookup. If `super.toString()` dispatched virtually it would find the override and recurse for ever.

**"Why was `invokeinterface` slower?"**
Because interface methods cannot be assigned a consistent v-table index, since a class may implement several unrelated interfaces that would claim the same slot. The JVM uses itables and must search for the right block. Modern JITs close the gap with inline caches.

**"Does `final` make methods faster?"**
Rarely, in modern Java. HotSpot's class hierarchy analysis already devirtualises when only one implementation is loaded, and deoptimises if that changes. `final` is worth using for **design** reasons, not performance ones.

**"What is `invokedynamic` for?"**
Leaving a call site unlinked until first execution, when a bootstrap method decides what it calls. Lambdas use it, which is why a lambda does not generate an anonymous class file, and so does string concatenation since Java 9.

**"What happens with fields and inheritance?"**
Fields are hidden rather than overridden and are always bound statically, so the reference's declared type selects the field. This is why `p.x` and `p.getX()` can disagree on the same object, and why fields should be private.

**The common wrong answer** is "static binding is compile time, dynamic binding is runtime", stopping there. The question is asking for the **mechanism**: five distinct bytecode instructions with different resolution rules, a **v-table whose indices are consistent across the hierarchy** so dispatch is two indirections, a separate **itable** path for interfaces, and a JIT that **mostly bypasses all of it** with inline caches and speculative devirtualisation.

---

### Say this in the interview

*"Binding is associating a call with the method body that runs. Static or early binding is resolved at compile time from the declared type of the reference, and dynamic or late binding is resolved at runtime from the actual class of the object, which is what makes polymorphism work.*

*Bound statically: static methods, because they belong to the class and there is no object to dispatch on; private methods, because they are not inherited so no override can exist; final methods, because no override can exist so the target is already unique; constructors, because the exact class is known at the call site; fields, always, with no exception; and overload selection, which is made from the compile-time argument types. Bound dynamically: overridden instance methods, and nothing else.*

*The JVM has five invocation instructions. invokestatic for static methods, where the target is fully known and there is no receiver. invokespecial for constructors, private methods and super calls, and its defining property is that it is non-virtual, invoking exactly the named method, which is why super.toString reaches the parent rather than recursing into the override. invokevirtual for instance methods through a class type, which does the virtual dispatch. invokeinterface for instance methods through an interface type, semantically the same but with a different lookup. And invokedynamic from Java 7, where the call site is unlinked until first execution and a bootstrap method decides what it calls, which is what lambdas and modern string concatenation are built on.*

*The v-table is an array of method pointers per class, and the thing that makes dispatch fast is that a subclass's table is a copy of its superclass's with overridden entries replaced at the same index, so a method occupies the same index throughout the hierarchy. So invokevirtual is: load the object's class pointer from its header, index the v-table at an offset the compiler already knows, and call. Constant time, two indirections, independent of depth, with no searching. Interfaces cannot use a fixed index because a class may implement several unrelated interfaces that would claim the same slot, so HotSpot uses itables, which need a search, and that is the historical cost of invokeinterface.*

*What actually happens at runtime is usually not the v-table at all. HotSpot profiles each call site. If it is monomorphic, with one receiver type ever seen, it installs an inline cache, a cheap type guard plus a direct call, and very often inlines the body entirely, so dynamic dispatch costs approximately nothing. Bimorphic sites get a two-way guarded dispatch, and only megamorphic sites fall back to a real table lookup. Class hierarchy analysis goes further: if only one implementation is loaded, the JIT devirtualises speculatively and deoptimises if a second one is ever loaded, which is why final rarely helps performance in modern Java.*

*The trap worth mentioning is fields. Fields are always bound statically, so the declared type of the reference selects the field. With Parent p = new Child, p.x gives Parent's x while p.getX gives Child's result. Two lines, two different rules, which is exactly why fields should be private and reached through methods, and why shadowing a field is hiding rather than overriding and is almost always a mistake."*
