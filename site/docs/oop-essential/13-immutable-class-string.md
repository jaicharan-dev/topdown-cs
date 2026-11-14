---
id: 13-immutable-class-string
title: "Immutability in Java: Designing Safe Classes and the String Pool"
description: "Objects that never change after construction, the leaks that undo them, and why String is one"

sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through how you design a strictly immutable class in Java. Why is String immutable, how do you handle defensive copying properly, and how do Java 14+ Records fit in?"

---

### Picture it

Think of a printed certificate rather than a whiteboard.

Once a certificate is printed, nobody can change it. If a detail is wrong you print a new one; the old one keeps saying what it always said. That is worth something: you can hand copies to as many people as you like and never worry that one of them has altered it, and you never have to ask "is this still current?"

The catch is subtler than it looks. If the certificate has a **pocket** holding a loose sheet, and you hand out the certificate with the pocket still reachable, someone can swap the sheet. The certificate itself is unaltered, yet what it effectively says has changed. Keeping a thing truly fixed means the parts it holds must be fixed too, or must never be handed out directly.

That pocket is a mutable field, and it is where most attempts at immutability leak.

---

### The proper terms

#### What makes a class immutable

An **immutable** object cannot change state after construction. Java requires several things together:

Make the class `final` so no subclass can add mutable state or override behaviour to fake a change.

Make every field `private final`. Final prevents reassignment; private prevents outside code reaching the field at all.

Provide no setters, and no method of any kind that alters state. Operations that look like changes return a **new instance** instead.

Defensively copy on the way in. If a constructor accepts a mutable object, store a copy. Otherwise the caller keeps a reference to the same object and can modify it afterwards.

Defensively copy on the way out. If a getter returns a mutable field, return a copy or an unmodifiable view. Otherwise the caller receives the internals and can modify them directly.

That pair of copies is **defensive copying**, and missing either one makes the class immutable in appearance only.

#### Why immutability is worth it

An immutable object is **inherently thread-safe**: with no writes after construction, there are no race conditions and no synchronisation needed. It is safe to share and cache freely. It is also safe as a **HashMap key**, because its **hash code** cannot change after insertion, which would otherwise leave the entry stranded in the wrong bucket.

The cost is allocation. Every modification creates an object, which is why `StringBuilder` exists for repeated string concatenation.

#### Why String is immutable

Four reasons, and interviewers usually want more than one.

**The string pool.** Java keeps a **string constant pool** so identical literals share one object. That sharing is only safe if nobody can modify a shared string.

**Security.** File paths, URLs and credentials are passed as strings. If they were mutable, a value could be validated and then altered before use, a time-of-check-to-time-of-use attack.

**Hash caching.** `String` caches its hash code after first use, which is only correct because the contents can never change. This makes strings excellent map keys.

**Thread safety.** Strings can be shared across threads with no synchronisation at all.

Note that `new String("x")` deliberately bypasses the pool and creates a separate object, which is why comparing strings with `==` is unreliable and `equals` is used instead. `intern()` puts a string back into the pool.

#### Records

A **record**, standard since Java 16, is a concise declaration of a transparent data carrier. The compiler generates a constructor, accessors, `equals`, `hashCode` and `toString`, and the fields are final.

Records give **shallow immutability**: the references cannot be reassigned, but a record holding a `List` still exposes that same list. To make a record genuinely immutable you add a **compact constructor** that copies incoming mutable arguments, and override the accessor to return a copy. Records remove the boilerplate; they do not remove the need to think about defensive copying.

---

### In code

```java
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public final class Booking {                    // final: no subclass can break it
    private final String reference;             // safe: String is immutable
    private final Date travelDate;              // unsafe type: must be copied
    private final List<String> passengers;      // unsafe type: must be copied

    public Booking(String reference, Date travelDate, List<String> passengers) {
        this.reference = reference;
        this.travelDate = new Date(travelDate.getTime());   // copy in
        this.passengers = List.copyOf(passengers);          // copy in
    }

    public String getReference() { return reference; }

    public Date getTravelDate() {
        return new Date(travelDate.getTime());              // copy out
    }

    public List<String> getPassengers() {
        return passengers;                       // already unmodifiable
    }

    public Booking withReference(String newReference) {     // change by replacement
        return new Booking(newReference, travelDate, passengers);
    }
}

// A record, with a compact constructor restoring the copy-in step
record Trip(String code, List<String> stops) {
    Trip {
        stops = List.copyOf(stops);              // without this, the caller
    }                                            // keeps a live reference
}
```

Remove either `new Date(...)` call and the class quietly stops being immutable. A caller holding the original `Date` could change it after construction, or mutate the one a getter handed back.

---

### What they ask next

**"Is a `final` class with `final` fields automatically immutable?"**
No. `final` fixes the reference, not the object behind it. A `final List` field can still have elements added, so the mutable parts must be copied in and out.

**"Why is `StringBuilder` needed if String is immutable?"**
Because concatenating in a loop creates a new string on every iteration, which is quadratic in the total length. `StringBuilder` keeps one mutable buffer and produces a string once at the end.

**"What is the difference between `==` and `equals` for strings?"**
`==` compares references, so it can be true for two pooled literals and false for an equal string created with `new`. `equals` compares contents and is what you want.

**"Are records fully immutable?"**
Only shallowly. Fields cannot be reassigned, but mutable contents remain reachable unless a compact constructor copies them and the accessor returns a copy.

**"Can an immutable class have a mutable field internally?"**
Yes, provided it never escapes. A cached hash code is the standard example, and `String` does exactly that.

**The common wrong answer** is listing `final` and "no setters" and stopping there. The defensive copying pair is the part being tested.

---

### Say this in the interview

*"To make a class immutable I mark the class final so no subclass can introduce mutable state, make every field private final, provide no setters, and return a new instance for anything that looks like a modification. Crucially I use defensive copying in both directions: copy any mutable argument in the constructor, and copy any mutable field returned from a getter. Missing either leaves a reference the caller can modify, so the class is only immutable in appearance.*

*The benefits are that the object is inherently thread-safe with no synchronisation, can be shared and cached freely, and is safe as a HashMap key because its hash code cannot change after insertion.*

*String is immutable for four reasons: the string constant pool lets identical literals share one object, which is only safe if nobody can alter it; security, since paths and credentials are strings and mutability would allow a value to change between validation and use; hash caching, which is correct only because the contents are fixed; and thread safety.*

*A record gives shallow immutability. The compiler generates the constructor, accessors, equals, hashCode and toString with final fields, but a record holding a List still exposes that list, so I add a compact constructor that copies it."*
