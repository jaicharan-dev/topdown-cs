---
id: 25-object-class-methods
title: "The java.lang.Object Methods"
description: "Eleven methods every object inherits, two contracts that silently break collections, and a hash code that is not an address"

sidebar_position: 25
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Every class in Java inherits from `java.lang.Object`. What are its 11 core methods? What are the strict mathematical contracts for `equals()` and `hashCode()`, why is `hashCode()` NOT guaranteed to be a unique memory address, and how do you choose between `getClass()` and `instanceof` in equals()?"

---

### Picture it

A library where every book, no matter the subject, has the same small set of standard stamps on the inside cover.

**Two of those stamps have to agree with each other**, and this is where everything goes wrong in practice.

One stamp says **"which shelf to look on"**. Another says **"is this the same book as that one"**. The library files a book by the first stamp, and when you later ask for it, it goes to **that shelf** and then compares what it finds.

Now suppose two copies of the same book get **different shelf stamps**. Ask for the book and the librarian walks to shelf 7, looks along it, and the book is on shelf 12. **It is not found.** The book is in the library, catalogued, undamaged, and the librarian will swear it does not exist. Nothing announced an error; the lookup simply returned nothing.

So the rule is strict and one-directional: **if two books are the same, they must carry the same shelf number.** The reverse is not required: two different books may share a shelf, and the librarian just checks each one when she gets there.

**And the stamp is not the book's physical position.** It cannot be, because the library **rearranges itself**: shelves are consolidated, books are moved. If the stamp were a position it would become wrong the moment anything moved, and every catalogue entry in the building would break. So the number is **assigned once, written down, and kept**, whatever happens to the book physically.

**The last question is about strictness.** If someone takes a standard book and adds an appendix, is it the same book? Say yes and you create an awkward asymmetry: the original says "yes, that's me" while the extended one says "no, you're missing my appendix". Say no and you have decided that **any variant is a different book**, even one that changed nothing. Neither answer is free, and choosing is a design decision rather than a rule.

---

### The proper terms

#### The eleven methods

Grouped by what they are for, which is more useful than a flat list.

**Identity and state:**

**`getClass()`** returns the runtime class. It is **`final`**, so it cannot be overridden or lied about.

**`hashCode()`** returns an `int` hash.

**`equals(Object)`** tests logical equality; the default is reference identity.

**`toString()`** returns a textual representation; the default is `ClassName@hexHashCode`.

**`clone()`** creates a field-by-field copy. It is **`protected`**, and requires the class to implement **`Cloneable`** or it throws `CloneNotSupportedException`.

**Thread coordination**, all **`final`**, all requiring the object's monitor to be held:

**`wait()`**, and its two timed overloads `wait(long)` and `wait(long, int)`, release the monitor and suspend the thread.

**`notify()`** wakes one waiting thread; **`notifyAll()`** wakes all of them.

**Lifecycle:**

**`finalize()`**, called by the garbage collector before reclamation. It is **deprecated for removal** since Java 9, because it is non-deterministic, may never run, can resurrect objects and delays collection. **`Cleaner`** and **`try-with-resources`** replace it.

That is eleven, plus the no-arg constructor.

#### The equals contract

Five rules, and they are what the word "contract" means here: a class that breaks them will behave incorrectly in collections, not merely oddly.

**Reflexive.** `x.equals(x)` is `true`.

**Symmetric.** `x.equals(y)` is `true` if and only if `y.equals(x)` is.

**Transitive.** If `x.equals(y)` and `y.equals(z)`, then `x.equals(z)`.

**Consistent.** Repeated calls return the same result provided nothing used in the comparison changes.

**Non-nullity.** `x.equals(null)` is `false`, and must not throw.

#### The hashCode contract

Three rules, and the middle one is the one that breaks collections.

**Consistent within a run.** The same object returns the same hash as long as nothing used in `equals` changes.

**Equal objects must have equal hash codes.** If `a.equals(b)`, then `a.hashCode() == b.hashCode()`. This is **mandatory** and is the rule people break.

**Unequal objects may share a hash code.** Collisions are legal and unavoidable, since there are more possible objects than `int` values. Distinct hashes are merely a performance preference.

The consequence of breaking rule two is severe and **silent**. A `HashMap` locates an entry by hashing to a bucket first and only then comparing with `equals`. If two equal objects hash differently, the lookup goes to the **wrong bucket**, finds nothing, and reports **absent**. The entry is in the map, intact, and `get` returns `null`. Nothing throws.

The practical rule: **override `equals` and `hashCode` together, always, from the same fields.** Use `Objects.equals` and `Objects.hash`, or let the IDE generate them, or use a **record**, which generates both from its components.

And the related trap: a **mutable field used in `equals`** will break a `HashSet` or `HashMap`, because mutating it after insertion changes the hash while the entry remains in the old bucket. Hash keys should be **effectively immutable**.

#### Why hashCode is not a memory address

The folklore is that the default `hashCode` is the object's address. It is not, and the reason is a genuinely good one.

**A moving garbage collector relocates objects.** HotSpot's collectors **compact** the heap, so an object's address changes during its lifetime, often many times.

If `hashCode` were the address, it would **change when the object moved**, which would violate the consistency rule and corrupt every hash-based collection containing it: the entry would sit in a bucket that no longer matches its hash, and would become unfindable.

So the JVM computes an **identity hash code lazily**, on first call, and **stores it** so it never changes:

It is kept in the **mark word** of the object header, or moved to a side table when the header is needed for locking.

The value is typically derived from a **thread-local pseudo-random generator**, not from the address at all. HotSpot's `-XX:hashCode` flag selects among several strategies.

Two further consequences:

**Hash codes are not unique.** An `int` has about 4.3 billion values and a program may create more objects than that, so collisions are guaranteed.

**`System.identityHashCode(obj)`** exists to reach the original identity hash even when `hashCode()` has been overridden, which is how `IdentityHashMap` works.

#### getClass versus instanceof in equals

This is the deepest part of the question, and the honest answer is that **neither is correct in all cases**.

**`getClass() != o.getClass()`**, the strict form:

**Preserves symmetry and transitivity** perfectly, even with subclasses, because an object is only ever equal to one of exactly its own class.

**Violates the Liskov Substitution Principle**, because a subclass instance is never equal to a superclass instance even when it adds **no state at all**. A `Point` and a trivial `ColourlessPoint extends Point` can never be equal, which surprises callers and breaks code that works through the supertype.

**`o instanceof MyClass`**, the permissive form:

**Honours LSP**, letting a subclass instance compare equal to a superclass instance.

**Breaks symmetry** as soon as a subclass overrides `equals` to include extra state: `parent.equals(child)` can be `true` while `child.equals(parent)` is `false`, which silently corrupts collections, since `contains` may return different answers depending on which object it is called on.

Bloch's conclusion in *Effective Java* is the sentence to quote: **there is no way to extend an instantiable class and add a value component while preserving the `equals` contract.**

So the practical guidance:

**Favour composition over inheritance for value classes.** Hold the superclass instance as a field and expose a view, which sidesteps the problem entirely.

**Use `instanceof` and make the class `final`**, so no subclass can break symmetry. This is what most well-designed value classes do.

**Use `getClass()`** when subclasses genuinely exist and strictness is what you want, accepting the LSP cost.

**Use an abstract base whose subclasses add no value components**, which is the one case where `instanceof` is safe with an open hierarchy.

**Use a `record`** where it fits. Records are implicitly `final` and generate `equals` and `hashCode` from their components, which removes the whole question.

---

### In code

```java
// The eleven methods, grouped by purpose

// IDENTITY AND STATE
public final native Class<?> getClass();     // final: cannot be lied about
public native int hashCode();
public boolean equals(Object obj);           // default: reference identity
public String toString();                    // default: Name@hexHashCode
protected native Object clone()              // protected; needs Cloneable
        throws CloneNotSupportedException;

// THREAD COORDINATION (all final; all require the object's monitor)
public final void wait() throws InterruptedException;
public final void wait(long timeoutMillis) throws InterruptedException;
public final void wait(long timeoutMillis, int nanos)
        throws InterruptedException;
public final native void notify();           // wakes ONE waiter
public final native void notifyAll();        // wakes ALL waiters

// LIFECYCLE
protected void finalize() throws Throwable;  // DEPRECATED FOR REMOVAL
// non-deterministic, may never run, can RESURRECT objects, and delays
// collection. Use Cleaner or try-with-resources instead.
```

```text
The two contracts:

  equals(), five rules
     REFLEXIVE      x.equals(x) is true
     SYMMETRIC      x.equals(y) iff y.equals(x)
     TRANSITIVE     x.equals(y) && y.equals(z) -> x.equals(z)
     CONSISTENT     repeated calls agree, if nothing used changes
     NON-NULLITY    x.equals(null) is false, and must not throw

  hashCode(), three rules
     CONSISTENT     same object -> same hash within a run
     EQUAL => EQUAL HASH     if a.equals(b) then a.hashCode()
                             == b.hashCode()      <-- MANDATORY
     UNEQUAL MAY COLLIDE     legal and unavoidable: there are more
                             possible objects than int values.
                             Distinct hashes are only a PERFORMANCE
                             preference.
```

```java
// Why breaking rule two is severe AND SILENT
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof Point p && p.x == x && p.y == y;
    }
    // hashCode() NOT overridden -> inherits identity hash
}

Map<Point, String> map = new HashMap<>();
map.put(new Point(1, 2), "origin-ish");
map.get(new Point(1, 2));     // null

// the two Points ARE equal, but have DIFFERENT identity hashes.
// HashMap hashes to a BUCKET FIRST and only then compares with
// equals, so the lookup goes to the WRONG BUCKET, finds nothing,
// and reports ABSENT.
//
// the entry is in the map, intact. get returns null. Nothing throws.
```

```java
// So: always override them TOGETHER, from THE SAME FIELDS
final class Point2 {
    private final int x, y;
    Point2(int x, int y) { this.x = x; this.y = y; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;                 // cheap fast path
        if (!(o instanceof Point2 p)) return false; // covers null too
        return x == p.x && y == p.y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}

// or let the language do it:
record Point3(int x, int y) { }
// implicitly final, with equals and hashCode generated from the
// components. The whole question disappears.

// AND THE RELATED TRAP: a MUTABLE field used in equals
Set<MutableKey> set = new HashSet<>();
MutableKey k = new MutableKey("a");
set.add(k);
k.setName("b");          // the hash changed; the entry did NOT move
set.contains(k);         // false. The object is in the set.
// hash keys must be EFFECTIVELY IMMUTABLE.
```

```text
Why hashCode is NOT a memory address:

  the folklore says the default hashCode is the object's address.
  It is not, and the reason is a good one:

  A MOVING GARBAGE COLLECTOR RELOCATES OBJECTS.
     HotSpot's collectors COMPACT the heap, so an object's address
     changes during its lifetime, often many times.

  if hashCode were the address:
     it would CHANGE when the object moved
     -> violating the consistency rule
     -> and CORRUPTING every hash-based collection holding it: the
        entry would sit in a bucket that no longer matches its hash
        and become unfindable

  so the JVM computes an IDENTITY HASH CODE LAZILY, on first call,
  and STORES it so it never changes:
     kept in the MARK WORD of the object header, or moved to a side
     table when the header is needed for locking
     typically derived from a THREAD-LOCAL PRNG, not from the
     address at all (HotSpot's -XX:hashCode selects the strategy)

  two consequences:
     hash codes are NOT unique: an int has ~4.3 billion values and a
     program may create more objects than that, so collisions are
     guaranteed
     System.identityHashCode(obj) reaches the ORIGINAL identity hash
     even when hashCode() is overridden, which is how
     IdentityHashMap works
```

```java
// getClass() vs instanceof: neither is correct in all cases

// STRICT: getClass()
@Override public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    Point p = (Point) o;
    return x == p.x && y == p.y;
}
// + preserves SYMMETRY and TRANSITIVITY perfectly, even with subclasses
// - VIOLATES LSP: a subclass instance is never equal to a superclass
//   instance even if it adds NO STATE AT ALL

// PERMISSIVE: instanceof
@Override public boolean equals(Object o) {
    if (!(o instanceof Point p)) return false;
    return x == p.x && y == p.y;
}
// + honours LSP
// - BREAKS SYMMETRY as soon as a subclass adds value state:

class ColourPoint extends Point {
    final String colour;
    @Override public boolean equals(Object o) {
        return o instanceof ColourPoint c && super.equals(c)
               && colour.equals(c.colour);
    }
}

Point p = new Point(1, 2);
ColourPoint c = new ColourPoint(1, 2, "red");
p.equals(c);     // TRUE   (Point only checks x and y)
c.equals(p);     // FALSE  (ColourPoint also checks colour)
// -> asymmetric. And List.contains can now give different answers
//    depending on which object it is called on.
```

```text
Bloch's conclusion, which is the sentence to quote:

  "There is no way to extend an INSTANTIABLE class and add a VALUE
   COMPONENT while preserving the equals contract."

  so, in practice:

  FAVOUR COMPOSITION      hold the superclass instance as a field and
                          expose a view. Sidesteps it entirely.
  instanceof + final      no subclass can break symmetry.
                          What most well-designed value classes do.
  getClass()              when subclasses genuinely exist and
                          strictness is what you want, accepting the
                          LSP cost.
  abstract base, no       the one case where instanceof is safe with
  value components in     an open hierarchy
  subclasses
  RECORD                  implicitly final, equals and hashCode
                          generated from the components.
                          The question disappears.
```

---

### What they ask next

**"What happens if you override `equals` but not `hashCode`?"**
Hash-based collections break silently. Two equal objects get different identity hashes, so a `HashMap` lookup goes to the wrong bucket, finds nothing and returns `null` even though the entry is present. Nothing throws, which is what makes it so hard to find.

**"Must unequal objects have different hash codes?"**
No. Collisions are explicitly permitted and unavoidable, since there are more possible objects than `int` values. Only the forward direction is mandatory: equal objects **must** share a hash code.

**"Why is the default hash code not the address?"**
Because a compacting collector moves objects, so an address-based hash would change during an object's lifetime, violating consistency and corrupting every hash-based collection holding it. The JVM computes the identity hash lazily and stores it in the object header, typically from a thread-local PRNG.

**"Why are `wait` and `notify` on `Object` rather than `Thread`?"**
Because they operate on an object's **monitor**, and in Java every object has one. The waiting is on a specific lock, not on a thread, so the methods belong where the lock does. They must be called while holding that monitor, or they throw `IllegalMonitorStateException`.

**"Why is `finalize` deprecated?"**
It is non-deterministic, may never run at all, can **resurrect** an object by storing `this` somewhere, adds at least one extra GC cycle before reclamation, and swallows exceptions. `Cleaner` and `try-with-resources` give deterministic, reliable cleanup instead.

**"Which should `equals` use, `getClass` or `instanceof`?"**
Neither is universally right. `getClass` preserves symmetry and transitivity but violates LSP; `instanceof` honours LSP but breaks symmetry once a subclass adds value state. In practice use `instanceof` and make the class `final`, or use a record, or prefer composition over inheritance for value types.

**"Why is `getClass()` final?"**
So an object cannot misreport its own type. Reflection, security checks and `equals` implementations all rely on it being truthful, and allowing an override would let a class impersonate another.

**"What can break a `HashSet` after insertion?"**
Mutating a field that `equals` and `hashCode` use. The object's hash changes but the entry does not move buckets, so `contains` returns `false` for an object that is demonstrably in the set. Hash keys must be effectively immutable.

**The common wrong answer** is listing the methods and reciting "equal objects must have equal hash codes" without the **consequence**. The content worth having is that breaking it fails **silently** in collections, that the hash is **not an address** because a compacting collector would invalidate it, and that `getClass` versus `instanceof` is a genuine **trade between symmetry and substitutability** with no universally correct answer.

---

### Say this in the interview

*"Object's eleven methods group into three sets. Identity and state: getClass, which is final so it cannot be lied about; hashCode; equals; toString, defaulting to class name at hex hash; and clone, which is protected and requires Cloneable. Thread coordination, all final and all requiring the object's monitor: three overloads of wait, plus notify and notifyAll. And lifecycle: finalize, which is deprecated for removal since Java 9 because it is non-deterministic, may never run, can resurrect objects and delays collection, with Cleaner and try-with-resources replacing it.*

*The equals contract has five rules: reflexive, so x equals x; symmetric, so x equals y if and only if y equals x; transitive; consistent, so repeated calls agree if nothing used changes; and non-nullity, so x equals null is false and must not throw. The hashCode contract has three: consistent within a run; equal objects must have equal hash codes, which is the mandatory one people break; and unequal objects may share a hash code, since collisions are legal and unavoidable because there are more possible objects than int values.*

*Breaking the second hashCode rule is severe and silent. A HashMap hashes to a bucket first and only then compares with equals, so two equal objects with different hashes send the lookup to the wrong bucket, where it finds nothing and reports absent. The entry is in the map, intact, and get returns null with nothing thrown. So override equals and hashCode together, always, from the same fields, using Objects.equals and Objects.hash, or a record. The related trap is a mutable field used in equals, which breaks a HashSet because mutating it after insertion changes the hash while the entry stays in the old bucket, so hash keys must be effectively immutable.*

*On the address question: the default hash code is not the object's address, and the reason is that a moving garbage collector relocates objects. HotSpot's collectors compact the heap, so an address changes during an object's lifetime, often repeatedly. If hashCode were the address it would change when the object moved, violating the consistency rule and corrupting every hash-based collection holding it, since the entry would sit in a bucket that no longer matched its hash. So the JVM computes an identity hash code lazily on first call and stores it so it never changes, in the mark word of the object header or in a side table when the header is needed for locking, and the value typically comes from a thread-local pseudo-random generator rather than the address. Two consequences: hash codes are not unique, and System.identityHashCode exists to reach the original identity hash even when hashCode is overridden, which is how IdentityHashMap works.*

*On getClass versus instanceof, the honest answer is that neither is correct in all cases. getClass preserves symmetry and transitivity perfectly even with subclasses, but violates the Liskov Substitution Principle, because a subclass instance is never equal to a superclass instance even when it adds no state at all. instanceof honours LSP but breaks symmetry as soon as a subclass overrides equals with extra state, so parent equals child can be true while child equals parent is false, which silently corrupts collections because contains can give different answers depending on which object it is called on.*

*Bloch's conclusion is the sentence to quote: there is no way to extend an instantiable class and add a value component while preserving the equals contract. So in practice I would favour composition over inheritance for value classes; or use instanceof and make the class final, which is what most well-designed value classes do; or use getClass when subclasses genuinely exist and strictness is what I want, accepting the LSP cost; or use an abstract base whose subclasses add no value components, which is the one case where instanceof is safe with an open hierarchy. And where it fits, a record removes the question entirely, since it is implicitly final and generates both methods from its components."*
