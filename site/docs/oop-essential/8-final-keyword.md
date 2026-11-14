---
id: 8-final-keyword
title: "The final Keyword: Variables, Methods, Classes & Immutability"
description: "One keyword, three meanings, and the reference it freezes is not the object"

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "`final` can go on variables, methods, and classes. What does it do in each case? And how is it different from `finally` and `finalize()`?"

---

### Picture it

`final` means "this cannot be changed again", but what counts as "this" depends on where you write it.

**On a variable, it freezes the label, not the thing.** Imagine a luggage tag tied to a suitcase. Making the tag permanent means it can never be moved to a different suitcase. It says nothing about what is inside: you can still open the case and repack it. This is the single most tested point on the whole topic.

**On a method, it stops redefinition.** A step in a published procedure that says "this part is fixed, do not redefine it in your branch".

**On a class, it stops extension.** A procedure that may be used but never used as the basis for a variant.

And then there are two words that sound related and are not: `finally` is about cleaning up after a block, `finalize()` was about cleaning up before an object was collected. Neither has anything to do with `final`.

---

### The proper terms

#### final on a variable

A **final variable** can be assigned **once** and never reassigned. For a **primitive**, that genuinely freezes the value.

For a **reference type**, it freezes only the **reference**, not the object it points at. The variable can never point somewhere else, while the object's own fields remain as mutable as they ever were. A `final List` can still have items added to it. This is the gap between a final reference and **immutability**.

A final field that is not assigned at its declaration is a **blank final**. It must be definitely assigned exactly once by the end of every constructor, which the compiler verifies. This is what lets a value depend on constructor arguments while staying final.

A local variable that is never reassigned, even without the keyword, is **effectively final**. That is the condition for using it inside a lambda or an anonymous inner class.

#### final on a method

A **final method** cannot be overridden. It removes that method from **dynamic dispatch**, so the implementation is fixed for every subclass.

The usual reason is correctness rather than speed: a method that a constructor calls, or one that enforces an invariant, is unsafe to let a subclass replace.

#### final on a class

A **final class** cannot be extended. `String` is the best-known example. Classes are made final to guarantee behaviour cannot be altered by subclassing, which matters for security and for immutability, since a mutable subclass would otherwise break the guarantee.

A final class makes every one of its methods effectively final too.

#### Why it helps performance and threads

For performance, the JIT compiler can inline a final method's body at the call site, since there is no possibility of another implementation. Modern JVMs often achieve the same for non-final methods through speculative optimisation, so this is a smaller advantage than it used to be.

For concurrency the guarantee is real and specific. The **Java Memory Model** promises that final fields set in a constructor are **safely published**: any thread that sees a correctly constructed object is guaranteed to see its final fields fully initialised, with no synchronisation. Non-final fields carry no such promise.

#### The three lookalikes

**`final`** is a modifier that prevents reassignment, overriding or extension.

**`finally`** is a block attached to `try` that runs whether or not an exception was thrown, used to release resources.

**`finalize()`** was a method on `Object` that the garbage collector could call before reclaiming an object. It was unpredictable, is deprecated since Java 9, and has been removed. Use try-with-resources or a `Cleaner` instead.

They share a prefix and nothing else.

---

### In code

```java
import java.util.ArrayList;
import java.util.List;

final class Config {                       // final class: cannot be extended
    private final String name;             // blank final: assigned in constructor
    private final List<String> tags = new ArrayList<>();
    private static final int MAX = 100;    // constant: final and static

    Config(String name) {
        this.name = name;                  // the one permitted assignment
    }

    void demo() {
        tags.add("new");                   // allowed: the object is mutable
        // tags = new ArrayList<>();       // compile error: the reference is final
    }

    final String identity() {              // final method: no override possible
        return name;
    }
}
```

The two lines inside `demo` are the point of the whole page. `final` stopped the variable pointing elsewhere, and did nothing at all to the contents of the list.

To make the list genuinely unmodifiable you need something else, such as `List.copyOf(tags)` or `Collections.unmodifiableList`, returned instead of the field itself.

---

### What they ask next

**"Does `final` make an object immutable?"**
No. It makes the reference unchangeable. Immutability requires that the object has no way to change its own state: private final fields, no setters, a final class so behaviour cannot be overridden, and defensive copies of any mutable fields on the way in and the way out.

**"Can a final method be overloaded?"**
Yes. Overloading adds a new method with a different signature and does not replace anything, so `final` has no bearing on it.

**"Can a constructor be final?"**
No. Constructors are not inherited, so there is nothing for the keyword to prevent.

**"What is the difference between `final`, `effectively final`, and a constant?"**
A final variable is declared with the keyword. An effectively final one is never reassigned, which is enough for lambdas and anonymous classes. A constant is `static final` with a compile-time value, and the compiler may inline it directly into calling code.

**"Can an abstract method be final?"**
No, they contradict each other. Abstract means a subclass must supply the body, final means no subclass may.

**The common wrong answer** is treating `final` and immutable as the same word. The `tags.add` line above is the counterexample to keep ready.

---

### Say this in the interview

*"`final` means something cannot be changed again, and what that covers depends on where it is applied.*

*A final variable allows a single assignment. For a primitive that fixes the value, but for a reference type it fixes only the reference, not the object, so a final List can still have elements added. A field left unassigned at declaration is a blank final and must be definitely assigned once in every constructor. A local never reassigned is effectively final, which is what lambdas require.*

*A final method cannot be overridden, which removes it from dynamic dispatch, usually to protect an invariant or a method called from a constructor. A final class cannot be extended, as with String, which is how immutability can be guaranteed.*

*For concurrency the Java Memory Model guarantees that final fields set in a constructor are safely published, so another thread seeing a properly constructed object sees them fully initialised without synchronisation.*

*finally is an unrelated block attached to try that always runs, and finalize() was a garbage-collection hook that is deprecated and removed. The three only sound alike."*
