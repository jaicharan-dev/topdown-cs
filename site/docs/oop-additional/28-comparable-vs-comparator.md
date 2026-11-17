---
id: 28-comparable-vs-comparator
title: "Comparable vs Comparator"
description: "One natural order built into the class against any number of orderings supplied from outside, and the subtraction that silently corrupts a sort"

sidebar_position: 28
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you decide between `Comparable` and `Comparator`? What is the strict return contract, what catastrophic bug occurs when subtracting integers inside `compare()`, and how does `compareTo()` interact with `TreeSet` and `equals()`?"

---

### Picture it

A pile of books that needs putting in order.

**Some things have an obvious order built in.** Numbers go small to large, dates go early to late, words go alphabetically. Nobody has to be told; the ordering comes **with the thing**, and there is only one sensible candidate.

**Books do not.** By author? By title? By year, by thickness, by how much you liked them? There is no single right answer, so the order has to be **supplied by whoever is doing the sorting**, and different people will supply different ones on different days. You may also be sorting books published by someone else, whose covers you cannot alter even if you wanted to declare an order on them.

So: one ordering that belongs to the thing, or many orderings supplied from outside. That is the whole choice.

**Now the comparison itself, and the bug.**

Suppose you compare two books by **subtracting** their page counts and looking at the sign. Usually fine. But imagine a ledger that only holds numbers up to a certain size and **wraps around to the most negative value** when you exceed it. Compare a colossal book with one of negative thickness and the subtraction **overflows**, comes out negative, and the comparison cheerfully reports that **the huge book is smaller**.

The sort does not crash. It produces an order, and the order is wrong. And because the error appears only for extreme values, it passes every test with ordinary data and fails on the day someone enters a large number.

**And the last trap, which is about what "the same" means.**

A set is supposed to hold no duplicates, and the question is **who decides what a duplicate is**. A sorted shelf decides by **position**: if two books belong in exactly the same place, there is only room for one, so the second is turned away. That is a different test from "are these the same book". So two genuinely different books can be rejected from the sorted shelf simply because your ordering could not tell them apart, while an unsorted pile would happily hold both.

---

### The proper terms

#### Comparable

**`Comparable<T>`** declares a single method, `int compareTo(T other)`, and is implemented **by the class being sorted**.

It defines the class's **natural ordering**: the one ordering that is intrinsic to the type and that users would expect by default. `String`, `Integer`, `LocalDate` and `BigDecimal` all have one.

It is what gets used by `Collections.sort(list)`, `Arrays.sort(array)`, a **`TreeMap`** or **`TreeSet`** created without a comparator, and a **`PriorityQueue`** with no comparator supplied.

A class has exactly **one** natural ordering, because it has one `compareTo`.

#### Comparator

**`Comparator<T>`** declares `int compare(T a, T b)` and is a **separate object**, independent of the class it orders.

You may have **as many as you like**, and you choose one at the call site.

Use it when:

**The class has no single natural ordering.** A `Person` might reasonably be ordered by surname, by age or by joining date, and none of them is privileged.

**You need several orderings** in the same program.

**You do not own the class**, so you cannot add `Comparable` to it.

**You want an ordering that differs from the natural one**, for example case-insensitive strings.

The decision rule in one line: **an intrinsic, single, obvious ordering goes in `Comparable`; everything else is a `Comparator`.**

#### The return contract

Both methods return an `int`, and the contract is about the **sign only**.

**Negative** if the first argument is less than the second, **zero** if they are equal in this ordering, **positive** if greater. The **magnitude is meaningless**: returning `-1` and returning `-2000000` mean exactly the same thing.

The formal requirements:

**Antisymmetry.** `sgn(x.compareTo(y)) == -sgn(y.compareTo(x))`, and if one throws, so must the other.

**Transitivity.** If `x > y` and `y > z`, then `x > z`.

**Substitutability of equal elements.** If `x.compareTo(y) == 0`, then `sgn(x.compareTo(z)) == sgn(y.compareTo(z))` for every `z`.

**Strongly recommended: consistency with equals.** `(x.compareTo(y) == 0)` should be true exactly when `x.equals(y)` is. This is not required by the compiler, and the consequences of ignoring it are the subject of the last section.

#### The subtraction bug

```java
// NEVER do this
public int compare(Item a, Item b) {
    return a.value - b.value;
}
```

It looks like a clean idiom and it is broken by integer overflow.

`int` arithmetic in Java **wraps silently**. If `a.value` is `Integer.MAX_VALUE` and `b.value` is `-1`, then `MAX_VALUE - (-1)` overflows to `Integer.MIN_VALUE`, which is **negative**, so the comparator declares that `MAX_VALUE` is less than `-1`.

The comparator now violates **both antisymmetry and transitivity**, and the consequences are unusually nasty:

**It does not throw at the point of the mistake.** The sort runs and produces an order, and the order is simply wrong.

**It usually passes testing.** Overflow needs operands more than `Integer.MAX_VALUE` apart, which ordinary test data never produces. The failure arrives in production, with real data.

**When it does fail, it fails somewhere else.** Since Java 7 the sort is **TimSort**, which **detects** contract violations during merging and throws **`IllegalArgumentException: Comparison method violates its general contract!`**. Crucially this only happens on inputs large enough for TimSort to merge, above roughly 32 elements, so a small test sorts fine and a real list explodes, with a stack trace pointing at the sort rather than the comparator.

**In a `TreeMap` it may not throw at all.** A broken ordering can cause entries to be **unreachable**: present in the tree, but `get` returns `null` because the search descends the wrong branch.

The fix is always the same: **use the static `compare` methods and never subtract.**

```java
return Integer.compare(a.value, b.value);
```

`Integer.compare`, `Long.compare` and `Double.compare` are overflow-free, and `Double.compare` additionally handles **`NaN`** and the distinction between `-0.0` and `0.0` correctly, which subtraction does not: `NaN - NaN` is `NaN`, whose sign tells you nothing, and `0.0 - (-0.0)` is `0.0`, so plain subtraction calls them equal while `Double.compare` orders them.

#### compareTo, TreeSet and equals

This is the subtlest part, and it rests on one fact:

**`TreeSet` and `TreeMap` determine membership using `compareTo` or `compare`, not `equals`.**

They are sorted structures, so they locate an element by **comparing**, and two elements that compare as `0` occupy the same position. The second one is therefore treated as a **duplicate** and rejected, regardless of what `equals` says.

`HashSet` and `HashMap` do the opposite, using **`hashCode` and `equals`** and never comparing.

So a class whose `compareTo` is **inconsistent with `equals`** behaves **differently in the two collections**, which is exactly the kind of bug that survives review.

The canonical example is in the JDK:

```java
BigDecimal a = new BigDecimal("1.0");
BigDecimal b = new BigDecimal("1.00");

a.equals(b);        // FALSE: equals compares value AND SCALE
a.compareTo(b);     // 0:     compareTo compares NUMERIC VALUE only

new HashSet<>(List.of(a, b)).size();   // 2
new TreeSet<>(List.of(a, b)).size();   // 1
```

The same two objects, two collections, two different answers about how many distinct elements exist. `BigDecimal`'s javadoc warns about this explicitly, and it is why the contract calls consistency with `equals` strongly recommended.

The guidance:

**Make `compareTo` consistent with `equals`** unless there is a deliberate reason not to.

**If they must differ, document it loudly**, as `BigDecimal` does.

**Be aware which collection you are using.** If you need `equals` semantics in a sorted structure, add a **tie-breaker** to the comparator so that distinct objects never compare as zero, for example by comparing an identifier last.

#### The modern API

Worth showing, because hand-written comparators are now rarely the right answer:

**`Comparator.comparing(Person::getLastName)`** builds one from a key extractor.

**`.thenComparing(...)`** chains tie-breakers.

**`.reversed()`** inverts an ordering.

**`comparingInt`, `comparingLong`, `comparingDouble`** avoid boxing in the key extractor.

**`Comparator.nullsFirst(...)`** and `nullsLast(...)` handle nulls without a hand-written check.

These are correct by construction, since they delegate to `Integer.compare` and friends internally, so they sidestep the subtraction bug entirely.

---

### In code

```java
// COMPARABLE: the class defines its ONE natural ordering
final class Version implements Comparable<Version> {
    private final int major, minor;

    @Override public int compareTo(Version other) {
        int c = Integer.compare(major, other.major);
        return c != 0 ? c : Integer.compare(minor, other.minor);
    }
}

Collections.sort(versions);              // uses compareTo
new TreeSet<>(versions);                 // uses compareTo
new PriorityQueue<Version>();            // uses compareTo

// COMPARATOR: supplied from outside, and you may have many
Comparator<Person> byLastName = Comparator.comparing(Person::getLastName);
Comparator<Person> byAge      = Comparator.comparingInt(Person::getAge);

list.sort(byLastName);
list.sort(byAge.reversed());
list.sort(byLastName.thenComparing(Person::getFirstName));
```

```text
Choosing between them:

  COMPARABLE when:
     there is ONE intrinsic, obvious ordering users would expect
     (String, Integer, LocalDate, BigDecimal all have one)
     you own the class

  COMPARATOR when:
     there is no single natural ordering (a Person by surname? age?
     joining date? none is privileged)
     you need SEVERAL orderings
     you do NOT own the class, so you cannot add Comparable
     you want an ordering DIFFERENT from the natural one
     (case-insensitive strings, say)

  in one line: an intrinsic, single, obvious ordering goes in
  Comparable; everything else is a Comparator.

  note: a class has EXACTLY ONE natural ordering, because it has
  one compareTo.
```

```text
The return contract: the SIGN only

  negative   first < second
  zero       equal IN THIS ORDERING
  positive   first > second

  THE MAGNITUDE IS MEANINGLESS. Returning -1 and returning -2000000
  mean exactly the same thing.

  formal requirements:
     ANTISYMMETRY     sgn(x.compareTo(y)) == -sgn(y.compareTo(x))
                      and if one throws, so must the other
     TRANSITIVITY     x > y and y > z implies x > z
     SUBSTITUTABILITY if x.compareTo(y) == 0 then
                      sgn(x.compareTo(z)) == sgn(y.compareTo(z))
                      for every z
     STRONGLY RECOMMENDED: consistency with equals
                      (x.compareTo(y) == 0) exactly when x.equals(y)
                      -> not enforced by the compiler, and the
                         consequences of ignoring it are below
```

```java
// THE SUBTRACTION BUG
public int compare(Item a, Item b) {
    return a.value - b.value;          // NEVER DO THIS
}

// int arithmetic in Java WRAPS SILENTLY:
int big   = Integer.MAX_VALUE;         //  2147483647
int small = -1;
big - small;                           // -2147483648  (MIN_VALUE)
                                       // NEGATIVE!

// so the comparator declares that MAX_VALUE is LESS THAN -1,
// violating BOTH antisymmetry and transitivity.
```

```text
Why the subtraction bug is unusually nasty:

  1. IT DOES NOT THROW AT THE MISTAKE
        the sort runs, produces an order, and the order is wrong

  2. IT USUALLY PASSES TESTING
        overflow needs operands more than Integer.MAX_VALUE apart,
        which ordinary test data never produces
        -> it arrives in production, with real data

  3. WHEN IT FAILS, IT FAILS SOMEWHERE ELSE
        since Java 7 the sort is TIMSORT, which DETECTS contract
        violations during merging:
           IllegalArgumentException:
              "Comparison method violates its general contract!"
        but ONLY on inputs big enough for TimSort to merge, above
        roughly 32 elements
        -> a small test sorts fine, a real list explodes, and the
           stack trace points at the SORT rather than the comparator

  4. IN A TreeMap IT MAY NOT THROW AT ALL
        a broken ordering leaves entries UNREACHABLE: present in the
        tree, but get() returns null because the search descends the
        wrong branch
```

```java
// THE FIX: use the static compare methods, never subtract
return Integer.compare(a.value, b.value);
return Long.compare(a.id, b.id);
return Double.compare(a.score, b.score);

// Double.compare also handles cases subtraction gets WRONG:
//   NaN - NaN   is NaN, whose sign tells you nothing
//   0.0 - -0.0  is 0.0, so subtraction calls them EQUAL
// Double.compare orders NaN consistently and distinguishes
// -0.0 from 0.0.

// and the modern API is correct by construction, because it
// delegates to these internally:
Comparator.comparingInt(Item::getValue);    // no subtraction anywhere
```

```java
// compareTo, TreeSet and equals: the JDK's own example

BigDecimal a = new BigDecimal("1.0");
BigDecimal b = new BigDecimal("1.00");

a.equals(b);        // FALSE  equals compares value AND SCALE
a.compareTo(b);     // 0      compareTo compares NUMERIC VALUE only

new HashSet<>(List.of(a, b)).size();   // 2   hashCode + equals
new TreeSet<>(List.of(a, b)).size();   // 1   compareTo

// the same two objects. Two collections. Two different answers about
// how many distinct elements exist.
// BigDecimal's javadoc warns about this explicitly.
```

```text
Why: the two collection families ask DIFFERENT QUESTIONS

  HashSet / HashMap      use hashCode() and equals()
                         never compare anything

  TreeSet / TreeMap      use compareTo() or compare()
                         NEVER call equals() at all

  a TreeSet is a SORTED structure, so it locates an element by
  COMPARING. Two elements that compare as 0 occupy the SAME
  POSITION, so the second is treated as a DUPLICATE and rejected,
  whatever equals says.

  so a class whose compareTo is inconsistent with equals behaves
  DIFFERENTLY in the two collections, which is exactly the kind of
  bug that survives review.

  guidance:
     make compareTo consistent with equals unless you have a
     deliberate reason not to
     if they must differ, DOCUMENT IT LOUDLY, as BigDecimal does
     if you need equals semantics in a sorted structure, add a
     TIE-BREAKER so distinct objects never compare as zero:
        Comparator.comparing(Item::getName)
                  .thenComparing(Item::getId)   // <- the tie-breaker
```

```java
// The modern API: rarely write a comparator by hand
Comparator.comparing(Person::getLastName)
          .thenComparing(Person::getFirstName)
          .thenComparingInt(Person::getAge)     // no boxing
          .reversed();

Comparator.nullsFirst(Comparator.comparing(Person::getLastName));
Comparator.comparing(Person::getName, String.CASE_INSENSITIVE_ORDER);

// and for a natural ordering:
list.sort(Comparator.naturalOrder());
list.sort(Comparator.reverseOrder());
```

---

### What they ask next

**"Can a class have two natural orderings?"**
No. `Comparable` declares one `compareTo`, so there is exactly one natural ordering. Any further orderings must be comparators, which is precisely why `Comparator` exists as a separate concept.

**"Does the magnitude of the return value matter?"**
No, only the sign. Returning `-1` and `-2000000` are identical in meaning. This matters because it means you never need to compute a difference, which is what makes the subtraction idiom tempting and unnecessary.

**"Why is subtracting ints in `compare` broken?"**
Because `int` arithmetic wraps silently, so operands far apart overflow and the sign flips. `Integer.MAX_VALUE - (-1)` is negative, so the comparator reports the largest value as the smallest, breaking antisymmetry and transitivity.

**"Where does that bug actually surface?"**
Usually as `IllegalArgumentException: Comparison method violates its general contract!` from TimSort, and only on lists large enough to merge, above roughly 32 elements. Small tests pass, production fails, and the stack trace points at the sort rather than the comparator.

**"Why does `TreeSet` ignore `equals`?"**
Because it is a sorted structure and locates elements by comparing. Two elements comparing as zero belong in the same position, so the second is a duplicate by definition. `equals` is never consulted, which is why it can disagree with `HashSet` about how many distinct elements a collection holds.

**"Give a real example of inconsistency with equals."**
`BigDecimal`. `new BigDecimal("1.0").equals(new BigDecimal("1.00"))` is false because `equals` compares scale, while `compareTo` returns zero because it compares numeric value. A `HashSet` holds both and a `TreeSet` holds one.

**"How do you keep a sorted set from collapsing distinct elements?"**
Add a tie-breaker to the comparator so that no two distinct objects ever compare as zero, typically by comparing a unique identifier last. That restores the behaviour you expect from a set without changing `equals`.

**"Why prefer `Comparator.comparing` over writing one by hand?"**
It is correct by construction. The key-extractor form delegates to `Integer.compare` and friends internally, so it cannot contain the subtraction bug, and chaining with `thenComparing` and `reversed` is clearer than a hand-rolled cascade of ifs.

**The common wrong answer** is "`Comparable` is internal and `Comparator` is external", stopping at the definition. The three things the question is really testing are that only the **sign** of the return value is meaningful, that **subtracting ints overflows** and produces a comparator which breaks sorts in production rather than in testing, and that **sorted collections use `compareTo` rather than `equals`**, so an inconsistent ordering makes `TreeSet` and `HashSet` disagree about what a duplicate is.

---

### Say this in the interview

*"Comparable declares compareTo and is implemented by the class being sorted, defining its natural ordering, the one intrinsic ordering users would expect. It is what Collections.sort, Arrays.sort, a TreeMap or TreeSet without a comparator, and a PriorityQueue with no comparator all use, and a class has exactly one, because it has one compareTo. Comparator declares compare, is a separate object independent of the class, and you can have as many as you like, choosing one at the call site. I would use a Comparator when there is no single natural ordering, when I need several orderings, when I do not own the class so cannot add Comparable, or when I want an ordering different from the natural one. In one line: an intrinsic, single, obvious ordering goes in Comparable, everything else is a Comparator.*

*The return contract is about the sign only: negative if the first is less, zero if equal in that ordering, positive if greater, and the magnitude is meaningless, so returning minus one and minus two million mean the same thing. Formally it requires antisymmetry, so the sign of x compareTo y is the negation of y compareTo x and if one throws so must the other; transitivity; and substitutability, so if x and y compare as zero they must compare the same way against every z. And it strongly recommends consistency with equals, meaning compareTo returns zero exactly when equals is true, which is not enforced by the compiler.*

*The catastrophic bug is returning a minus b. int arithmetic wraps silently, so if a is Integer.MAX_VALUE and b is minus one, the subtraction overflows to MIN_VALUE, which is negative, and the comparator declares the largest value smaller than minus one, breaking both antisymmetry and transitivity. It is unusually nasty for four reasons. It does not throw at the mistake, it just produces a wrong order. It usually passes testing, because overflow needs operands more than MAX_VALUE apart, which ordinary test data never produces. When it does fail it fails elsewhere: since Java 7 the sort is TimSort, which detects contract violations during merging and throws IllegalArgumentException, comparison method violates its general contract, but only on inputs big enough to merge, above roughly 32 elements, so small tests pass and the stack trace points at the sort rather than the comparator. And in a TreeMap it may not throw at all, leaving entries unreachable, present in the tree but with get returning null because the search descends the wrong branch. The fix is always Integer.compare, Long.compare or Double.compare, never subtraction, and Double.compare additionally handles NaN and distinguishes negative zero from zero, which subtraction gets wrong.*

*On TreeSet and equals: TreeSet and TreeMap determine membership using compareTo or compare and never call equals, because they are sorted structures that locate elements by comparing, so two elements comparing as zero occupy the same position and the second is treated as a duplicate. HashSet and HashMap do the opposite, using hashCode and equals and never comparing. So a class whose compareTo is inconsistent with equals behaves differently in the two collections. The JDK's own example is BigDecimal: one point zero equals one point zero zero is false, because equals compares value and scale, while compareTo returns zero because it compares numeric value, so a HashSet of both has size two and a TreeSet has size one. BigDecimal's javadoc warns about it explicitly. So make compareTo consistent with equals unless you have a deliberate reason not to, document it loudly if they must differ, and if you need equals semantics in a sorted structure add a tie-breaker, comparing a unique identifier last, so distinct objects never compare as zero.*

*Finally, I would rarely write a comparator by hand now. Comparator.comparing with a key extractor, thenComparing for tie-breakers, reversed, comparingInt and friends to avoid boxing, and nullsFirst or nullsLast for nulls. They are correct by construction, because they delegate to Integer.compare internally, so they sidestep the subtraction bug entirely."*
