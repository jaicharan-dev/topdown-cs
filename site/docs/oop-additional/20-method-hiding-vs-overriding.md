---
id: 20-method-hiding-vs-overriding
title: "Method Hiding vs Method Overriding"
description: "One replaces behaviour for an object, the other just obscures a name for a reference, and the compiler refuses to let you confuse them"

sidebar_position: 20
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact mechanical difference between method overriding and method hiding? Why can't a static method be overridden, what does the JVM bytecode reveal, and what happens if a child class tries to redefine an instance method as static?"

---

### Picture it

A family firm with a sign on the door and employees inside.

**An employee's skill** belongs to the person. When you ask "whoever is handling this, do the thing", the person who actually turns up does it **their own way**. If the son does it differently from the father, you get the son's version, because **the son is the one standing there**.

**The sign on the door** belongs to the building, not to anyone in it. The son may put up his own sign on his own building, but that has **nothing to do with the father's sign**. Which sign you read depends entirely on **which building you walked up to**, not on who is inside.

So: ask a person, get that person's behaviour. Read a sign, get **that building's** sign. The second is not a replacement of the first at all; the son's sign does not supersede his father's, it just happens to **share a name**.

**And the thing the firm will not allow.** You cannot turn a skill into a sign or a sign into a skill. A skill is exercised by asking whoever shows up; a sign is read off a wall. If the son tried to replace his father's *skill* with a *sign*, there would be no answer to "whoever is handling this, do the thing", because a sign cannot turn up and do anything. The two mechanisms are incompatible, so the rulebook forbids the swap outright rather than letting you discover it later.

---

### The proper terms

#### The mechanical difference

**Overriding** is a subclass providing a new implementation of an **inherited instance method** with the same signature. The call is **dynamically bound**, so the **actual class of the object** selects the implementation. The parent's version is **replaced** for that object.

**Hiding** is a subclass declaring a **`static` method** with the same signature as a static method in the parent. The call is **statically bound**, so the **declared type of the reference** selects the implementation. The parent's version is **not replaced**; it is merely **obscured** through one reference type, and remains reachable through another.

| | **Overriding** | **Hiding** |
| --- | --- | --- |
| Applies to | **instance** methods | **`static`** methods, and **fields** |
| Resolved | at **runtime** | at **compile time** |
| Selected by | the **object's actual class** | the **reference's declared type** |
| Parent's version | **replaced** | still reachable via a parent reference |
| Polymorphic | yes | **no** |
| Bytecode | `invokevirtual` | `invokestatic` |

#### Why a static method cannot be overridden

Two reasons, and they are the same reason from different angles.

**There is no receiver to dispatch on.** A static method belongs to the **class**, not to any instance. Overriding is the act of choosing an implementation **based on which object you have**, and a static call has no object. There is nothing for the decision to be made from.

**The target is resolved at compile time and written into the constant pool.** `javac` emits **`invokestatic`** naming a specific class and method. There is no lookup at runtime, so there is nothing a subclass could intercept.

The confusing consequence is that calling a static method **through an instance reference** is legal and looks polymorphic:

```java
Parent p = new Child();
p.staticMethod();   // calls PARENT'S version
```

This compiles because Java permits it, and `javac` ignores the object entirely, resolving against the **declared type** `Parent`. Most IDEs warn here, and the code should be written `Parent.staticMethod()` to make the intent plain.

#### What the bytecode reveals

This is the decisive evidence and worth being able to state exactly.

An **overridden instance call** compiles to `invokevirtual Parent.speak()`. The constant pool names `Parent`, but `invokevirtual` performs **virtual dispatch**: at runtime the JVM uses the object's actual class to find the implementation through the **v-table**, so `Child.speak` runs.

A **hidden static call** compiles to `invokestatic Parent.info()`. There is **no dispatch step at all**. The named method **is** the method that runs.

So the difference is not a rule bolted on by the language; it is **two different instructions with different resolution semantics**. The language rule is a description of what the bytecode already does.

#### Redefining an instance method as static, or the reverse

Both are **compile errors**, which is the answer to the last part of the question.

**Instance in the parent, `static` in the child:**

```text
error: static method cannot hide instance method from Parent
```

**`static` in the parent, instance in the child:**

```text
error: instance method cannot override static method from Parent
```

The reason is exactly the incompatibility above: the two forms are resolved by **different instructions** with **different inputs**, one needing a receiver and one having none. There is no coherent meaning for a call that could be either, so the Java Language Specification forbids the declaration rather than leaving it to be discovered at a call site.

Three related rules that round the answer out:

**`private` methods are neither overridden nor hidden.** They are not inherited at all, so a method of the same name in a subclass is simply a new, unrelated method. Attempting `@Override` on it fails to compile, which is one of the clearest arguments for always writing the annotation.

**`final` methods cannot be overridden**, by definition.

**Fields are hidden, never overridden**, and follow exactly the static rule: the reference's declared type selects the field, which is why `p.x` and `p.getX()` can disagree about the same object.

#### The rules for a legal override

Worth listing, because interviewers often follow up with them:

**The signature must match**, meaning the same name and parameter types. A different parameter list is **overloading**, not overriding.

**The return type must be the same or a subtype**, which is the covariant return.

**Access cannot be narrowed.** A `public` method cannot be overridden as `protected`, because that would break substitutability.

**No broader checked exceptions.** The override may throw fewer or narrower checked exceptions, or none, but not wider ones. Unchecked exceptions are unrestricted.

**`static`, `final` and `private` methods cannot be overridden.**

And the practical rule: **always write `@Override`**. It costs nothing and turns an entire class of silent bugs, such as a typo in a method name or an accidental overload, into a compile error.

---

### In code

```java
class Parent {
    void instanceMethod()        { System.out.println("Parent instance"); }
    static void staticMethod()   { System.out.println("Parent static"); }
    String field = "Parent field";
}

class Child extends Parent {
    @Override
    void instanceMethod()        { System.out.println("Child instance"); }
    static void staticMethod()   { System.out.println("Child static"); }
    //                             ^ HIDES. @Override here would NOT compile.
    String field = "Child field";
}

Parent p = new Child();

p.instanceMethod();   // "Child instance"   OVERRIDDEN -> the OBJECT decides
p.staticMethod();     // "Parent static"    HIDDEN     -> the REFERENCE decides
p.field;              // "Parent field"     HIDDEN     -> the REFERENCE decides

// and the parent's static is still perfectly reachable:
Parent.staticMethod();   // "Parent static"
Child.staticMethod();    // "Child static"
// hiding OBSCURES a name through one reference type.
// It does not REPLACE anything.
```

```text
What the bytecode reveals, which is the decisive evidence:

  p.instanceMethod()
      invokevirtual  Parent.instanceMethod:()V
                     ^ the constant pool names Parent...
                     ...but invokevirtual performs VIRTUAL DISPATCH:
                     at runtime the JVM uses the OBJECT'S ACTUAL CLASS
                     to look the method up in the v-table
                     -> Child.instanceMethod runs

  p.staticMethod()
      invokestatic   Parent.staticMethod:()V
                     ^ NO DISPATCH STEP AT ALL.
                     The named method IS the method that runs.
                     The object is ignored entirely.

  so the difference is not a language rule bolted on top. It is TWO
  DIFFERENT INSTRUCTIONS with different resolution semantics, and the
  language rule simply describes what the bytecode already does.
```

```java
// Calling a static through an instance reference: legal, and misleading
Parent p = new Child();
p.staticMethod();          // compiles. Calls PARENT'S version.
                           // javac IGNORES the object and resolves
                           // against the DECLARED type.
                           // most IDEs warn here.

Parent.staticMethod();     // write this instead: the intent is plain

// and the genuinely alarming version:
Parent q = null;
q.staticMethod();          // NO NullPointerException. It prints
                           // "Parent static", because the reference is
                           // never dereferenced: only its TYPE is used.
```

```java
// Trying to change the staticness: both are COMPILE ERRORS
class A {
    void foo()        { }
    static void bar() { }
}

class B extends A {
    static void foo() { }   // error: static method cannot hide
                            //        instance method from A
    void bar()        { }   // error: instance method cannot override
                            //        static method from A
}

// the reason is exactly the incompatibility: the two forms are
// resolved by DIFFERENT INSTRUCTIONS with DIFFERENT INPUTS, one
// needing a receiver and one having none. There is no coherent
// meaning for a call that could be either, so the JLS forbids the
// DECLARATION rather than leaving it to be discovered at a call site.
```

```java
// private methods are NEITHER overridden NOR hidden
class P {
    private void secret() { System.out.println("P"); }
    void callIt()         { secret(); }      // invokespecial: always P's
}
class C extends P {
    // @Override                             // would NOT compile
    private void secret() { System.out.println("C"); }
    //          ^ not inherited, so this is a NEW, UNRELATED method
}

new C().callIt();   // prints "P"

// which is one of the clearest arguments for always writing
// @Override: it turns a silent surprise into a compile error.
```

```text
The rules for a LEGAL override, which is the usual follow-up:

  SIGNATURE     same name and parameter types.
                a different parameter list is OVERLOADING, not
                overriding, and is a very common accidental bug

  RETURN TYPE   the same, or a SUBTYPE (the covariant return)

  ACCESS        cannot be NARROWED. public cannot become protected,
                because that would break substitutability

  EXCEPTIONS    no BROADER checked exceptions. Fewer or narrower is
                fine, none is fine. Unchecked are unrestricted

  FORBIDDEN     static, final and private methods cannot be overridden

  and the practical rule: ALWAYS WRITE @Override. It costs nothing
  and turns a typo'd name or an accidental overload into a compile
  error instead of a silent behavioural bug.
```

---

### What they ask next

**"Why does `p.staticMethod()` call the parent's version?"**
Because `javac` resolves a static call against the **declared type** of the reference and ignores the object entirely, emitting `invokestatic Parent.staticMethod`. There is no runtime lookup to intercept.

**"What happens with `null.staticMethod()`?"**
It works and prints normally. No `NullPointerException`, because the reference is never dereferenced: only its **type** is used, at compile time. This surprises people and is a good illustration that static calls do not involve the object at all.

**"Can you use `@Override` on a hidden static method?"**
No, it is a compile error. `@Override` asserts that the method overrides something, and a static method hides rather than overrides. That the annotation **rejects** it is the cleanest proof that the two are different mechanisms.

**"What if the child's static method had a different return type?"**
The same rules as overriding apply to hiding for return types: it must be the same or covariant, otherwise it is a compile error. Hiding is not a free-for-all; it is still checked for compatibility.

**"Are fields overridden?"**
Never. Fields are **hidden**, and resolved from the reference's declared type exactly as static methods are. This is why `p.x` and `p.getX()` can report different values for the same object, and why fields should be private.

**"Why are private methods not overridable?"**
Because they are not **inherited**, so there is nothing to override. A method of the same name in a subclass is a new, unrelated method, and calls to the private method from within the parent use `invokespecial`, which always reaches the parent's version.

**"Why can an override not narrow access?"**
Because it would break the Liskov Substitution Principle. Code holding a `Parent` reference may legally call a `public` method, so if `Child` made it `protected`, substituting a `Child` would break a caller that the type system said was safe.

**The common wrong answer** is "static methods can be overridden but it does not do anything useful". They **cannot be overridden at all**. Redeclaring one is **hiding**, a different mechanism with a different bytecode instruction, resolved from the reference rather than the object, and leaving the parent's version fully reachable. The compiler proves this by rejecting both `@Override` on it and any attempt to change the staticness.

---

### Say this in the interview

*"Overriding is a subclass providing a new implementation of an inherited instance method with the same signature. The call is dynamically bound, so the actual class of the object selects the implementation, and the parent's version is replaced for that object. Hiding is a subclass declaring a static method with the same signature as one in the parent. The call is statically bound, so the declared type of the reference selects it, and the parent's version is not replaced, only obscured through one reference type while remaining reachable through another.*

*So: overriding applies to instance methods, hiding to static methods and to fields; overriding is resolved at runtime and hiding at compile time; overriding is selected by the object's actual class and hiding by the reference's declared type; overriding replaces the parent's version while hiding leaves it reachable; and only overriding is polymorphic.*

*A static method cannot be overridden for two reasons that are really the same reason. There is no receiver to dispatch on, since a static method belongs to the class rather than any instance, and overriding is choosing an implementation based on which object you have. And the target is resolved at compile time and written into the constant pool, so there is no runtime lookup a subclass could intercept.*

*The bytecode is the decisive evidence. An overridden instance call compiles to invokevirtual naming Parent, but invokevirtual performs virtual dispatch, so at runtime the JVM uses the object's actual class to find the method in the v-table and Child's version runs. A hidden static call compiles to invokestatic naming Parent, and there is no dispatch step at all: the named method is the method that runs. So the difference is not a language rule bolted on top, it is two different instructions with different resolution semantics, and the language rule describes what the bytecode already does.*

*A consequence worth mentioning is that calling a static through an instance reference is legal and misleading: Parent p = new Child, then p.staticMethod, compiles and calls Parent's version because javac ignores the object and resolves against the declared type. Most IDEs warn, and it should be written as Parent.staticMethod. Even more strikingly, calling a static method through a null reference works fine and throws nothing, because the reference is never dereferenced and only its type is used.*

*If a child tries to redefine an instance method as static, or a static method as an instance method, both are compile errors: static method cannot hide instance method, and instance method cannot override static method. The reason is exactly that incompatibility: the two forms are resolved by different instructions with different inputs, one needing a receiver and one having none, so there is no coherent meaning for a call that could be either, and the specification forbids the declaration rather than leaving it to be discovered at a call site.*

*Three related rules round it out. Private methods are neither overridden nor hidden, because they are not inherited at all, so a same-named method in a subclass is a new unrelated method and @Override on it fails to compile. Final methods cannot be overridden by definition. And fields are hidden rather than overridden, following the static rule, which is why p.x and p.getX can disagree about the same object. For a legal override: the signature must match, or it is overloading; the return type must be the same or covariant; access cannot be narrowed, since that would break substitutability; no broader checked exceptions; and static, final and private are excluded. And I would always write @Override, because it turns a typo or an accidental overload into a compile error instead of a silent bug."*
