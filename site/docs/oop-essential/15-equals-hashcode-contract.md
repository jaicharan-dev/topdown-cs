---
id: 15-equals-hashcode-contract
title: "The equals() and hashCode() Contract"
description: "Why overriding one and not the other loses objects inside a HashMap"

sidebar_position: 15
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly is the contract between equals() and hashCode()? If you override equals() without hashCode(), what silently breaks in a HashMap? Also, why is 31 used in standard hash algorithms?"

---

### Picture it

Think of a cloakroom with numbered racks.

When you hand in a coat, the attendant computes a rack number from something quick about it, say its colour, and hangs it there. When you come back, they recompute the rack number the same way, walk to that rack, and compare the coats hanging on it one by one until they find yours.

Two rules make this work, and they are not the same rule.

**Identical coats must produce the same rack number.** Otherwise your coat goes to rack 4 on the way in and the attendant looks on rack 9 on the way out. It is still hanging there, perfectly findable by hand, but the system will never look in the right place. The coat is lost without being missing.

**The same rack number does not mean identical coats.** Plenty of blue coats share rack 4, which is why the attendant still compares them individually once they arrive.

Rack number is `hashCode`. The one-by-one comparison is `equals`. Overriding one without the other breaks the first rule, and that is the bug.

---

### The proper terms

#### The contract

The **equals and hashCode contract** has two clauses that matter.

**If two objects are equal by `equals`, they must return the same `hashCode`.** This is mandatory.

**If two objects have the same `hashCode`, they need not be equal.** That is a **hash collision**, and it is expected and handled.

So equality implies equal hashes, and the reverse does not hold.

`equals` itself must also be **reflexive**, **symmetric**, **transitive**, **consistent**, and `x.equals(null)` must be false.

#### What breaks in a HashMap

A **HashMap** stores entries in **buckets**. To insert, it computes the key's hash code, derives a bucket index from it, and places the entry there. To look up, it does the same arithmetic and searches only that one bucket, comparing candidates with `equals`.

Override `equals` alone and two logically equal objects still inherit `Object.hashCode`, which is based on **identity** and differs per object. The lookup computes a different index from the one used at insertion, goes to the wrong bucket, and finds nothing. The entry is still in the map, reachable by iteration, but `get` and `containsKey` both report absence.

That is the silent breakage: no exception, just a map that appears to have lost the value. The same applies to `HashSet`, which is backed by a `HashMap`.

#### Why 31

`String.hashCode` and most generated implementations use `31` as a multiplier, for two reasons.

It is an **odd prime**. Odd matters because multiplying by an even number shifts bits leftwards and discards high bits, losing information and clustering results. Prime helps spread values across buckets.

It is cheap. `31 * i` can be computed by the JVM as `(i << 5) - i`, a shift and a subtraction instead of a multiply. The value is small enough to keep intermediate results from overflowing too quickly while still mixing the bits well.

It is convention rather than a requirement. Any odd prime works; 31 is simply what the standard library chose.

#### Writing them correctly

The two must use **the same fields**. Any field in `equals` but missing from `hashCode` breaks the contract immediately.

Use fields that are **stable**. A mutable field used in the hash means that modifying an object already inside a map changes its bucket and strands the entry, which is why immutable keys are preferred.

For `equals`, check reference identity first as a fast path, then the type, then compare fields. Use `getClass()` when subclasses must not be equal to their parent, or `instanceof` when they may, accepting that `instanceof` can break symmetry if a subclass adds fields to the comparison.

`Objects.equals` and `Objects.hash` handle nulls and give readable implementations, with the caveat that `Objects.hash` allocates an array, so hand-written arithmetic is preferred on very hot paths.

---

### In code

```java
import java.util.*;

final class Isbn {
    private final String code;

    Isbn(String code) { this.code = code; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;                      // fast path
        if (o == null || getClass() != o.getClass()) return false;
        Isbn other = (Isbn) o;
        return Objects.equals(code, other.code);         // same field as below
    }

    @Override
    public int hashCode() {
        return Objects.hash(code);                       // same field as above
    }
}

final class BadIsbn {
    private final String code;

    BadIsbn(String code) { this.code = code; }

    @Override
    public boolean equals(Object o) {                    // equals only
        return o instanceof BadIsbn b && Objects.equals(code, b.code);
    }
    // no hashCode: inherits identity-based Object.hashCode
}

public class Demo {
    public static void main(String[] args) {
        Map<Isbn, String> good = new HashMap<>();
        good.put(new Isbn("978-1"), "Clean Code");
        System.out.println(good.get(new Isbn("978-1")));     // Clean Code

        Map<BadIsbn, String> bad = new HashMap<>();
        bad.put(new BadIsbn("978-1"), "Clean Code");
        System.out.println(bad.get(new BadIsbn("978-1")));   // null
        System.out.println(bad.size());                      // 1: still in there
    }
}
```

The last two lines are the symptom exactly: the map holds one entry, and the key that is `equals` to it cannot retrieve it.

---

### What they ask next

**"What if you override `hashCode` but not `equals`?"**
Less damaging but still wrong. Objects land in the right bucket, then fail the identity-based `equals`, so lookups still miss. Returning a constant from `hashCode` is technically legal and puts every entry in one bucket, degrading the map to a list.

**"Does a `TreeMap` have this problem?"**
No, because it never hashes. It orders keys with `compareTo` or a `Comparator`, so its equivalent requirement is that the ordering be consistent with `equals`.

**"Why is `getClass()` sometimes preferred over `instanceof`?"**
Because `instanceof` lets a subclass be equal to its parent, which can break symmetry when the subclass adds fields. `getClass()` keeps equality strictly within one class, at the cost of rejecting proxies and subclasses that are genuinely equivalent.

**"What happens if a key is mutated after insertion?"**
Its hash changes, so it belongs in a different bucket, but the map does not move it. The entry becomes unreachable by `get`. This is why immutable keys are the rule.

**"How does Java 8 change collision handling?"**
Once a bucket exceeds eight entries and the table is large enough, the chain becomes a red-black tree, improving worst-case lookup from linear to logarithmic.

**The common wrong answer** is "if hash codes are equal the objects are equal". That is the reverse of the contract and the reason `equals` is still consulted.

---

### Say this in the interview

*"The equals and hashCode contract is that if two objects are equal according to equals, they must return the same hashCode. The converse does not hold: equal hash codes do not imply equality, which is just a hash collision. equals must also be reflexive, symmetric, transitive and consistent, and false against null.*

*If I override equals without hashCode, two logically equal objects inherit identity-based hash codes. A HashMap stores entries in buckets and computes one from the hash at insertion and recomputes it at lookup, so the lookup goes to a different bucket and finds nothing. The entry is still in the map and visible by iteration, but get and containsKey report absence. There is no exception, which is what makes it dangerous, and HashSet inherits the same problem.*

*31 is used because it is an odd prime, which spreads values well, and because the JVM can compute 31 times i as a shift left by five minus i. It is convention rather than a requirement.*

*Practically, both methods must use the same fields, and those fields should be stable, which is why immutable keys are preferred: mutating a key after insertion strands the entry in the wrong bucket."*
