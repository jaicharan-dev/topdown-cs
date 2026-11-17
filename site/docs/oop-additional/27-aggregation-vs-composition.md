---
id: 27-aggregation-vs-composition
title: "Aggregation vs Composition"
description: "Both are has-a, and the line between them is whether the part can outlive the whole"

sidebar_position: 27
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Both aggregation and composition represent a 'has-a' association. What is the precise boundary separating them in terms of lifecycle dependency, UML notation, and defensive copying?"

---

### Picture it

A house has rooms. A department has professors. Both are "has-a", and they are not the same kind of having.

**Demolish the house and the rooms are gone.** Not relocated, not reassigned: they stop existing, because a room was never a thing that could exist on its own. It was **made as part of** the house, it belongs to that house and no other, and the house's end is its end.

**Close the department and the professors are still there.** They go elsewhere. They existed before the department, they may already belong to two other departments, and the department's end is not theirs. The department **referred to** them; it never **owned** them.

So the boundary is a single question: **can the part survive the whole?** If no, the whole owns it. If yes, the whole merely refers to it.

**And now the part that makes it a real engineering question rather than a vocabulary one.**

Suppose the house claims to own its rooms, but the rooms were **built by someone else and handed over**, and that person **kept their own key**. The house's claim of exclusive ownership is now a fiction: at any moment the builder can let themselves in and move a wall. Every rule the house enforces about its own rooms can be broken from outside, without the house ever knowing.

To own something genuinely, you cannot accept it from outside and keep the same thing. You have to **make your own copy** of it, and when somebody asks to see it, **show them a copy** rather than the original. That is the whole of defensive copying, and the reason it belongs to composition and not to aggregation: aggregation **wants** the sharing, so copying would defeat the point.

---

### The proper terms

#### The association family

Both are forms of **association**, which is a **has-a** relationship between objects, as distinct from **inheritance**, which is **is-a**.

**Composition** is a **strong has-a**, where the whole **owns** the part.

**Aggregation** is a **weak has-a**, where the whole **references** the part.

#### The precise boundary: lifecycle dependency

The single discriminator is **whether the part can exist independently of the whole**.

**Composition:**

The part cannot exist without the whole. It is created by the whole and ceases to be meaningful when the whole ends.

Ownership is **exclusive**: a part belongs to **exactly one** whole, and is not shared.

The relationship reads as "part-of".

Examples: a `House` and its `Room`s, an `Order` and its `OrderLine`s, a `Human` and a `Heart`.

**Aggregation:**

The part **can exist** independently. It was created elsewhere, and outlives the whole.

Ownership is **shared or absent**: the same part may be referenced by many wholes.

The relationship reads as "has-a" or "uses".

Examples: a `Department` and its `Professor`s, a `Playlist` and its `Song`s, a `Team` and its `Player`s.

One honest caveat worth making: **Java has no destructors**, so "the part is destroyed" really means the part becomes **unreachable and eligible for collection** when the whole does. The distinction is therefore about the **design contract** rather than a language mechanism, and it is enforced by how you write the class, not by the runtime.

#### UML notation

Both use a **diamond at the whole's end** of the line, and the fill is the entire difference.

**Composition: a filled, black diamond.**

**Aggregation: a hollow, white diamond.**

```text
  House ◆────── Room       filled   = composition
  Department ◇────── Professor   hollow = aggregation
```

A useful memory aid: the **filled** diamond is "solid ownership", and the **hollow** one is "a loose reference".

#### What it looks like in code

The structural markers are reliable and worth listing, because they are how you recognise which one a class is actually implementing regardless of what the comments claim.

**Composition:**

The whole constructs the parts itself, typically in its own constructor.

The parts are **not passed in** from outside.

The parts are **not exposed** to callers, or are exposed only as copies or unmodifiable views.

In an ORM this maps to **cascade delete** and an owned collection; in a database, to a child table with `ON DELETE CASCADE`.

**Aggregation:**

The parts are **passed in** through a constructor or setter.

They **originate outside** the whole.

The same instance **may legitimately be referenced elsewhere**, and that is the intent.

In an ORM this maps to a **many-to-many** or an unowned reference, with no cascade delete.

#### Defensive copying, and why it belongs to composition

This is the part that turns the distinction into something that affects correctness.

If a class claims composition, meaning **exclusive ownership and responsibility for its own invariants**, but accepts a **mutable** object from outside and stores the reference, then the claim is **false**. The caller **retains a reference** and can mutate the supposedly owned state at any time, from outside, with no way for the owner to notice.

So a composing class must copy in both directions:

**Copy mutable arguments on the way in.** Store a copy, never the caller's object.

**Copy mutable internal state on the way out.** Return a copy or an unmodifiable view, never the live object, otherwise a getter hands the caller a key to your internals.

Two subtleties that distinguish a careful answer:

**Make the defensive copy before validating, and validate the copy.** If you validate the caller's object and then copy it, a hostile or merely concurrent caller can **mutate it between the check and the copy**, so the stored value was never validated. This is a **time-of-check to time-of-use** window, and the fix is simply to reverse the two steps.

**Do not use `clone()` on an argument whose type is not `final`.** The argument may be an attacker-written subclass whose `clone` returns an object that **keeps a live reference** to something it can still mutate. Use a constructor or a static factory of the known type instead.

And the symmetric point: **aggregation deliberately does not copy.** Sharing the same instance is the entire purpose, and copying a `Professor` into each `Department` would create several diverging people. Copying where you meant to share is as much a bug as sharing where you meant to own.

The practical shortcut: **if a field is mutable and the class claims to own it, there must be a copy at the boundary in both directions.** If there is not, the class is doing aggregation while believing it is doing composition, and its invariants are unenforceable.

---

### In code

```java
// COMPOSITION: the whole CREATES the parts, and nothing leaks
final class House {
    private final List<Room> rooms;

    House(int count) {
        List<Room> r = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            r.add(new Room(i));           // CREATED HERE, by the whole
        }
        this.rooms = r;                   // not passed in from outside
    }

    // exposed only as an UNMODIFIABLE VIEW: no key to the internals
    List<Room> getRooms() { return Collections.unmodifiableList(rooms); }
}
// no House, no Rooms. A Room belongs to exactly one House and is
// not shared. The relationship reads as PART-OF.

// AGGREGATION: the parts come from OUTSIDE and outlive the whole
final class Department {
    private final List<Professor> staff;

    Department(List<Professor> staff) {
        this.staff = staff;               // PASSED IN. Deliberately
    }                                     // the same objects.
}

Professor p = new Professor("Rao");
Department physics  = new Department(List.of(p));
Department maths    = new Department(List.of(p));
// ONE professor, in TWO departments. That is the point.
// Close both departments and the professor still exists.
```

```text
The boundary, as one question:

  CAN THE PART SURVIVE THE WHOLE?

     no  -> COMPOSITION    the whole OWNS it
     yes -> AGGREGATION    the whole merely REFERENCES it

                        COMPOSITION         AGGREGATION
  part exists without   NO                  YES
  the whole
  ownership             EXCLUSIVE, one      SHARED or none
                        owner only
  created by            the whole           elsewhere
  reads as              "part-of"           "has-a" / "uses"
  example               House / Room        Department / Professor
                        Order / OrderLine   Playlist / Song
  UML                   FILLED diamond      HOLLOW diamond
  in an ORM             cascade delete,     many-to-many,
                        owned collection    NO cascade

  caveat: Java has no destructors, so "destroyed" really means
  "unreachable and eligible for collection". The distinction is a
  DESIGN CONTRACT enforced by how you write the class, not by the
  runtime.
```

```text
UML: both put a diamond at the WHOLE'S end. The fill is everything.

     House  <>------- Room          hollow  = AGGREGATION
     House  <#>------ Room          filled  = COMPOSITION

  drawn properly:
     House ◆────────── Room         filled, black  -> composition
     Department ◇────── Professor   hollow, white  -> aggregation

  memory aid: FILLED is solid ownership, HOLLOW is a loose reference.
```

```java
// Why defensive copying belongs to composition: the claim is a LIE
// without it
final class Period {
    private final Date start, end;

    // BROKEN: claims to own its dates, and does not
    Period(Date start, Date end) {
        if (start.after(end)) throw new IllegalArgumentException();
        this.start = start;          // stores the CALLER'S object
        this.end   = end;
    }
    Date getStart() { return start; }   // hands out a LIVE reference
}

Date s = new Date(), e = new Date();
Period p = new Period(s, e);
s.setYear(99);                 // the caller still holds a key, and
                               // has just broken the invariant from
                               // outside, with no way for Period to
                               // notice
p.getStart().setYear(0);       // and so can anybody who calls a getter
```

```java
// FIXED: copy on the way IN and on the way OUT
final class Period2 {
    private final Date start, end;

    Period2(Date start, Date end) {
        // 1. COPY FIRST
        this.start = new Date(start.getTime());
        this.end   = new Date(end.getTime());
        // 2. VALIDATE THE COPY, not the argument
        if (this.start.after(this.end))
            throw new IllegalArgumentException();
    }

    Date getStart() { return new Date(start.getTime()); }  // copy OUT
    Date getEnd()   { return new Date(end.getTime());   }
}
```

```text
The two subtleties that distinguish a careful answer:

  1. COPY BEFORE VALIDATING, AND VALIDATE THE COPY

     WRONG                           RIGHT
     check(arg);                     copy = duplicate(arg);
     // <-- attacker mutates arg     check(copy);
     this.field = duplicate(arg);    this.field = copy;

     validating the caller's object and then copying leaves a window
     in which a hostile or merely concurrent caller MUTATES IT
     BETWEEN THE CHECK AND THE COPY, so the stored value was never
     validated.
     This is a TIME-OF-CHECK TO TIME-OF-USE window, and reversing
     the two steps closes it.

  2. DO NOT USE clone() ON A NON-FINAL ARGUMENT TYPE

     the argument may be an ATTACKER-WRITTEN SUBCLASS whose clone()
     returns an object that KEEPS A LIVE REFERENCE to something it
     can still mutate.
     Use a constructor or a static factory OF THE KNOWN TYPE instead:
        new Date(d.getTime())     not    d.clone()
```

```text
And the symmetric point, which is just as real a bug:

  AGGREGATION DELIBERATELY DOES NOT COPY.
  Sharing the same instance is the ENTIRE PURPOSE, and copying a
  Professor into each Department would create several diverging
  people who then drift out of sync.

  copying where you meant to SHARE is as much a bug as sharing
  where you meant to OWN.

  the practical shortcut:
     IF A FIELD IS MUTABLE AND THE CLASS CLAIMS TO OWN IT, THERE
     MUST BE A COPY AT THE BOUNDARY IN BOTH DIRECTIONS.
     If there is not, the class is doing AGGREGATION while believing
     it is doing COMPOSITION, and its invariants are unenforceable.
```

---

### What they ask next

**"What is the single question that separates them?"**
Can the part exist independently of the whole? If it cannot, it is composition; if it can, it is aggregation. Everything else, the UML, the copying, the cascade rules, follows from that answer.

**"How do you tell which one a class actually implements?"**
Look at where the parts come from. If the whole constructs them itself and never exposes them raw, it is composition. If they are passed in through a constructor or setter and may be referenced elsewhere, it is aggregation, whatever the comments say.

**"Why does composition need defensive copying?"**
Because composition claims exclusive ownership and responsibility for its invariants. Accepting a mutable object from outside and storing the reference leaves the caller holding a key, so the invariant can be broken from outside with no way for the owner to notice. The claim is only true if a copy is taken.

**"Why must you copy before validating?"**
Because validating the caller's object and then copying leaves a window in which the object can be mutated between the check and the copy, so the stored value was never the one validated. It is a time-of-check to time-of-use problem, and reversing the steps closes it.

**"Why not use `clone()` for the defensive copy?"**
Because if the argument's type is not `final`, it may be a subclass whose `clone` returns something that retains a live reference to mutable state. A constructor or static factory of the known type produces an object you control.

**"Should aggregation also copy?"**
No, and doing so is a bug of its own. Sharing is the point, and copying would create several diverging instances of what should be one entity. Copying where you meant to share is as wrong as sharing where you meant to own.

**"How does this map to a database?"**
Composition maps to a child table with `ON DELETE CASCADE` and an owned collection in the ORM; aggregation maps to a many-to-many or an unowned reference with no cascade, since deleting a department must not delete the professors.

**"Does Java enforce any of this?"**
No. Java has no destructors, so a part is simply unreachable when the whole is. The distinction lives entirely in how you write the class: who constructs the parts, whether they are accepted from outside, and whether copies are taken at the boundary.

**The common wrong answer** is "composition is a stronger has-a than aggregation", which is a restatement rather than a boundary. The answer wanted is the **lifecycle test**, the **filled versus hollow diamond**, and above all that **composition without defensive copying is not composition**: if a caller keeps a reference to supposedly owned mutable state, the ownership is a fiction and the class's invariants cannot be enforced.

---

### Say this in the interview

*"Both are forms of association, a has-a relationship, as distinct from inheritance which is is-a. Composition is a strong has-a where the whole owns the part, and aggregation is a weak has-a where the whole references it.*

*The precise boundary is lifecycle dependency: can the part exist independently of the whole? Under composition it cannot. It is created by the whole, ownership is exclusive so a part belongs to exactly one whole and is not shared, and the relationship reads as part-of, like a House and its Rooms or an Order and its OrderLines. Under aggregation the part can exist independently, it was created elsewhere and outlives the whole, ownership is shared or absent so the same part may be referenced by many wholes, and it reads as has-a or uses, like a Department and its Professors or a Playlist and its Songs. One honest caveat: Java has no destructors, so destroying the part really means it becomes unreachable and eligible for collection, which makes this a design contract enforced by how you write the class rather than a language mechanism.*

*In UML both put a diamond at the whole's end of the line, and the fill is the whole difference: a filled black diamond is composition, a hollow white diamond is aggregation. Filled is solid ownership, hollow is a loose reference.*

*Structurally you recognise which one a class actually implements by where the parts come from. Composition: the whole constructs them itself, usually in its constructor, they are not passed in, and they are not exposed raw, only as copies or unmodifiable views. In an ORM that is a cascade delete and an owned collection. Aggregation: the parts are passed in through a constructor or setter, they originate outside, and the same instance may legitimately be referenced elsewhere, which is the intent. In an ORM that is a many-to-many or an unowned reference with no cascade.*

*Defensive copying is what turns this into a correctness issue. If a class claims composition, meaning exclusive ownership and responsibility for its own invariants, but accepts a mutable object from outside and stores the reference, then the claim is false: the caller retains a reference and can mutate the supposedly owned state at any time with no way for the owner to notice. So a composing class must copy mutable arguments on the way in, storing a copy rather than the caller's object, and copy mutable internal state on the way out, returning a copy or an unmodifiable view rather than the live object.*

*Two subtleties. First, make the copy before validating, and validate the copy: if you validate the argument and then copy it, a hostile or merely concurrent caller can mutate it between the check and the copy, so the stored value was never validated, which is a time-of-check to time-of-use window closed simply by reversing the steps. Second, do not use clone on an argument whose type is not final, because it may be an attacker-written subclass whose clone returns something that keeps a live reference; use a constructor or static factory of the known type instead.*

*And the symmetric point: aggregation deliberately does not copy, because sharing the same instance is the entire purpose, and copying a Professor into each Department would create several diverging people. Copying where you meant to share is as much a bug as sharing where you meant to own. The practical shortcut is that if a field is mutable and the class claims to own it, there must be a copy at the boundary in both directions, and if there is not, the class is doing aggregation while believing it is doing composition, and its invariants are unenforceable."*
