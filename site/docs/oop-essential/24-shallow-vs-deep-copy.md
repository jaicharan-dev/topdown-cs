---
id: 24-shallow-vs-deep-copy
title: "Shallow Copy vs. Deep Copy"
description: "Copying the box against copying what is inside it, and what happens when the contents loop back"

sidebar_position: 19
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Can you explain the difference between a shallow copy and a deep copy? If I modify a nested object in a shallow copy, what happens to the original, and how do you handle circular references during deep copies?"

---

### Picture it

Think of duplicating a folder of documents.

**A shallow copy duplicates the folder, not the documents.** You get a second folder, and inside it are notes saying "see document 47", exactly the same notes as in the first folder. Two folders now, one set of documents. Scribble on document 47 and both folders show the change, because there was only ever one of it.

**A deep copy duplicates everything.** A new folder, and a fresh photocopy of every document, and if a document points to another, that one gets copied too. Two completely independent sets. Scribbling on one changes nothing in the other.

The subtlety arrives when documents reference each other in a loop: 47 points to 48, and 48 points back to 47. A copier working naively copies 47, sees it needs 48, copies 48, sees it needs 47, and copies 47 again, forever. It has to remember what it has already copied.

---

### The proper terms

#### The two kinds of copy

A **shallow copy** duplicates the object's own fields. For **primitives** the value is genuinely duplicated. For **reference** fields only the reference is duplicated, so the copy and the original point at the **same** nested object. The two share their contents, which is why modifying a nested object through one is visible through the other.

A **deep copy** recursively duplicates the nested objects too, so the result shares **nothing mutable** with the original. The two can be changed independently.

Nested immutable objects, such as `String`, need no copying. They cannot change, so sharing is harmless, which is why a deep copy only has to recurse through **mutable** fields.

#### How Java does each

`Object.clone()` with **`Cloneable`** performs a **field-by-field shallow copy**. `Cloneable` is a **marker interface** that declares no methods: it merely signals that `clone` is permitted, and calling `clone` without it throws `CloneNotSupportedException`.

The clone mechanism is widely regarded as a design mistake. It bypasses constructors, interacts badly with `final` fields, and returns `Object` in older code. A **copy constructor**, which takes an instance of the same class and copies from it, is explicit and type-safe, and is the preferred approach.

**Serialization**, writing an object to bytes and reading it back, produces a deep copy as a side effect. It is simple to apply but slow, requires every class to be `Serializable`, and silently skips `transient` fields.

#### Circular references

A naive recursive deep copy of a **cyclic object graph** never terminates, because following the cycle leads back to an object already being copied, which triggers copying it again.

The fix is a **visited map**, usually an **IdentityHashMap**, from each original object to its copy. Before copying anything, check the map: if the object is already there, return the existing copy instead of making a new one. This both stops the infinite recursion and preserves the shape of the graph, so two fields pointing at the same object still point at the same copy afterwards.

`IdentityHashMap` is the right choice because it compares with `==` rather than `equals`. Two distinct but equal objects must be copied separately, and an ordinary `HashMap` would conflate them.

Serialization handles cycles automatically, since the protocol already tracks object identity through back-references.

---

### In code

```java
import java.util.*;

class Address {
    String city;
    Address(String city) { this.city = city; }
}

class Person {
    String name;            // immutable: safe to share
    Address address;        // mutable: the field that decides shallow or deep

    Person(String name, Address address) {
        this.name = name;
        this.address = address;
    }

    Person shallowCopy() {
        return new Person(name, address);                   // same Address shared
    }

    Person deepCopy() {
        return new Person(name, new Address(address.city)); // Address duplicated
    }
}

public class Demo {
    public static void main(String[] args) {
        Person original = new Person("Ada", new Address("London"));

        Person shallow = original.shallowCopy();
        shallow.address.city = "Paris";
        System.out.println(original.address.city);          // Paris: shared object

        Person reset = new Person("Ada", new Address("London"));
        Person deep = reset.deepCopy();
        deep.address.city = "Berlin";
        System.out.println(reset.address.city);             // London: independent
    }
}
```

```java
// A deep copy that survives cycles
class Node {
    List<Node> links = new ArrayList<>();

    Node copy(Map<Node, Node> seen) {
        Node existing = seen.get(this);
        if (existing != null) return existing;      // already copied: stop here

        Node fresh = new Node();
        seen.put(this, fresh);                      // record BEFORE recursing

        for (Node link : links) {
            fresh.links.add(link.copy(seen));
        }
        return fresh;
    }

    Node copy() { return copy(new IdentityHashMap<>()); }
}
```

Recording the copy **before** recursing is what breaks the cycle. Doing it afterwards leaves the recursion free to revisit this node and loop forever.

---

### What they ask next

**"Is `Object.clone()` shallow or deep?"**
Shallow. It copies fields bit by bit, so nested objects are shared. A deep version requires overriding `clone` and copying mutable fields explicitly.

**"Why is `Cloneable` considered broken?"**
It declares no methods, so it does not actually enforce anything. `clone` bypasses constructors, so invariants and `final` fields are awkward, and the contract is informal. A copy constructor or static factory is preferred.

**"Does `Arrays.copyOf` give a deep copy?"**
No. It is shallow: a new array holding the same references. For an array of mutable objects you must copy each element yourself.

**"What is the difference between a copy constructor and a clone method?"**
A copy constructor is an ordinary constructor taking the same type, so it is explicit, type-safe and runs normal initialisation. `clone` is a protected `Object` method relying on a marker interface and bypassing constructors.

**"Why `IdentityHashMap` rather than `HashMap` for the visited map?"**
Because identity is what matters. Two distinct objects that happen to be `equals` must still be copied separately, and a `HashMap` would treat them as the same entry.

**The common wrong answer** is that a shallow copy is "just a reference to the same object". It is a genuinely new object; what is shared is what its reference fields point at.

---

### Say this in the interview

*"A shallow copy duplicates the object's own fields. Primitives are copied by value, but reference fields are copied as references, so the original and the copy share the same nested objects. Modifying a nested object through one is visible through the other. A deep copy recursively duplicates the mutable nested objects too, so nothing mutable is shared. Immutable fields like String never need copying.*

*In Java, Object.clone with the Cloneable marker interface performs a field-by-field shallow copy, and calling clone without that interface throws CloneNotSupportedException. The mechanism is generally considered a design mistake because it bypasses constructors and interacts badly with final fields, so a copy constructor is preferred. Serialization produces a deep copy as a side effect, but it is slow and skips transient fields.*

*For a cyclic object graph, a naive recursive deep copy never terminates, because following the cycle revisits an object already being copied. The fix is a visited map, typically an IdentityHashMap from original to copy, consulted before copying and populated before recursing. That stops the recursion and preserves the graph's shape, so shared references stay shared in the copy. IdentityHashMap is used because two distinct but equal objects must be copied separately."*
