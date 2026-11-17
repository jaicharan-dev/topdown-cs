---
id: 29-stringbuilder-vs-stringbuffer
title: "StringBuilder vs StringBuffer"
description: "Why concatenating in a loop is quadratic, and why the thread-safe one is almost never the right answer"

sidebar_position: 29
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "We always hear that you shouldn't concatenate strings in a loop. Why is that, and how do `StringBuilder` and `StringBuffer` solve the problem differently?"

---

### Picture it

You are writing a shopping list, and the paper you are writing on **cannot be altered once written**.

So to add "milk" to a list that already says "bread, eggs", you cannot simply write it at the bottom. You must take a **fresh sheet**, **copy out everything already on the old one**, add "milk", and throw the old sheet away.

For a two-item list that is trivial. But notice what happens as the list grows. Adding the hundredth item means **copying ninety-nine items first**. Adding the thousandth means copying nine hundred and ninety-nine. The work for each addition grows with the length of the list, so the **total** work grows like the **square** of the number of items, and the bin fills with discarded sheets, each one nearly as long as the final list.

Writing a thousand short items this way means copying something like **half a million items** and throwing away a thousand sheets of paper.

**The obvious fix** is to use a notepad you **can** write on. Keep one sheet, add to the end, and only when it runs out of room do you move to a larger one, taking a bigger jump each time so that it happens rarely. The total work is now proportional to the number of items, not their square.

**And the historical oddity.** There are two notepads in the drawer. One has **a lock on it** that you must open and close for every single line you write, in case someone else is writing on the same pad. The other has no lock.

Almost nobody ever shares a notepad. You pick one up, fill it in, tear off the result and discard it, all without anyone else touching it. So for decades everyone paid for a lock they never needed, and eventually someone added the unlocked version.

And the deeper point, which is the interesting half: **the lock does not actually make sharing safe.** It stops two people writing in the exact same instant, but if two people are writing alternate lines, the result is still a jumble. A per-line lock gives you an uncorrupted pad full of nonsense, which is rarely what anyone wanted.

---

### The proper terms

#### Why concatenation in a loop is quadratic

**`String` is immutable in Java.** There is no operation that modifies a `String`; every operation that appears to produces a new one.

So `s += x` cannot append. It must:

**Allocate a new character array** long enough for both.

**Copy the entire existing content** into it.

**Copy the new content** after it.

**Construct a new `String`** around it, leaving the old `String` and its array garbage.

In a loop of **n** iterations where the result grows to length **n**, iteration **i** copies **i** characters. The total is `1 + 2 + 3 + ... + n`, which is `n(n+1)/2`, so the work is `O(n^2)`, and it allocates `O(n)` dead objects along the way.

Concretely: 10,000 concatenations of 10 characters each copies roughly 500 million characters and discards 10,000 `String` objects plus 10,000 character arrays, to produce a 100 KB result.

#### Why `String` is immutable at all

Worth answering, because the quadratic behaviour is a **consequence** of a deliberate design choice rather than an oversight:

**Thread safety for free.** An immutable object can be shared between threads with no synchronisation at all.

**The string pool works.** Identical literals can be **interned** to one object only because nobody can change it underneath other holders.

**Safe as a hash key.** The hash can be computed once and cached, and a key cannot change after insertion, which is the bug that ruins `HashMap` with mutable keys.

**Security.** A filename, URL or SQL fragment that has been validated cannot be mutated between the check and the use, which would otherwise be a time-of-check to time-of-use hole.

#### What the compiler does, and what it cannot do

This is the part that explains why the loop case is special.

**A single concatenation expression is optimised.** `"a" + b + "c"` in one expression does **not** produce intermediate strings. Before Java 9, `javac` rewrote it into a `StringBuilder` with chained `append` calls and a final `toString`. Since Java 9 it compiles to **`invokedynamic`** bound to **`StringConcatFactory`**, which generates an optimised method handle at runtime, often sizing the buffer exactly.

**The compiler cannot hoist that out of a loop.** Each iteration is a **separate expression**, so it creates a new `StringBuilder`, appends the entire accumulated string plus the new piece, calls `toString`, and discards the builder. Every iteration.

So `a + b + c` in one statement is fine, and the same operation spread across loop iterations is quadratic, and the difference is entirely about **expression boundaries**.

#### StringBuilder

**`StringBuilder`** is a **mutable** character sequence backed by a **resizable array**.

`append` writes into the existing array and only **grows** it when it is full, by allocating a larger array, roughly **doubling** it, and copying across. Because growth is geometric, the copying is amortised `O(1)` per append, and building a string of length n costs `O(n)` in total rather than `O(n^2)`.

It is **not synchronised**.

Supplying an **initial capacity**, `new StringBuilder(1024)`, removes the growth copies entirely when you can estimate the size, which is a small but free win.

#### StringBuffer

**`StringBuffer`** has **the same API**, with every public method declared **`synchronized`**.

The history explains the oddity: `StringBuffer` is from **Java 1.0**, when it was assumed that a shared, thread-safe buffer was the sensible default. **`StringBuilder` was added in Java 5** as the unsynchronised version, once it was obvious that a builder is almost always a **local variable confined to one thread**, so the synchronisation was pure cost.

Two honest qualifications, and making them is what separates a current answer from folklore:

**The performance gap is smaller than people claim.** Uncontended synchronisation on a modern JVM is cheap, and **escape analysis** often proves the builder never leaves the method, allowing **lock elision** to remove the synchronisation entirely. The difference in a microbenchmark is real but modest.

**`StringBuffer`'s thread safety is not useful thread safety.** Each **method** is atomic, but a **sequence** of methods is not. Two threads appending alternately produce an uncorrupted buffer containing interleaved nonsense, and a `length()` followed by a `charAt()` can race with another thread's `delete`. So it does not give you a correct concurrent builder; it gives you a slower one with a misleading name. Genuinely shared mutable state needs **the whole logical operation** synchronised by you.

The guidance is therefore blunt: **use `StringBuilder` always, and `StringBuffer` essentially never.**

#### What to use in practice

**A single expression**: just use `+`. It is the clearest and the compiler already optimises it.

**A loop**: `StringBuilder`, with an initial capacity if you can estimate it.

**Joining a collection**: `String.join` or `Collectors.joining`, which are clearer than a manual loop and handle the separator correctly without a trailing-comma fix-up.

**A template**: **`String.format`** or `"...".formatted(...)`, and text blocks for multi-line literals.

**Genuinely concurrent accumulation**: a concurrent collection, or each thread building its own `StringBuilder` and joining the results at the end, which avoids contention entirely.

---

### In code

```java
// THE PROBLEM: String is immutable, so += cannot append
String s = "";
for (int i = 0; i < 10_000; i++) {
    s += "0123456789";     // each iteration:
}                          //   allocate a new char array for BOTH
                           //   copy the ENTIRE existing content
                           //   copy the new content after it
                           //   construct a new String
                           //   leave the old String AND its array as
                           //   garbage

// iteration i copies i characters, so the total is
//    1 + 2 + 3 + ... + n  =  n(n+1)/2   ->  O(n^2)
// and it allocates O(n) dead objects along the way.

// concretely: ~500 MILLION characters copied, 10,000 dead Strings
// and 10,000 dead char arrays, to produce a 100 KB result.
```

```java
// THE FIX: a mutable buffer
StringBuilder sb = new StringBuilder(100_000);   // capacity up front
for (int i = 0; i < 10_000; i++) {
    sb.append("0123456789");   // writes into the existing array
}                              // grows (roughly DOUBLING) only when full
String s = sb.toString();      // one copy, at the end

// geometric growth makes each append AMORTISED O(1), so building a
// string of length n costs O(n) in total rather than O(n^2).
// supplying the capacity removes the growth copies entirely.
```

```text
Why String is immutable at all, since the quadratic behaviour is a
CONSEQUENCE of a deliberate choice rather than an oversight:

  THREAD SAFETY FOR FREE   an immutable object is shareable between
                           threads with NO synchronisation

  THE STRING POOL WORKS    identical literals can be INTERNED to one
                           object only because nobody can change it
                           underneath other holders

  SAFE AS A HASH KEY       the hash is computed once and cached, and
                           the key cannot change after insertion,
                           which is the bug that ruins a HashMap with
                           mutable keys

  SECURITY                 a validated filename, URL or SQL fragment
                           cannot be mutated between the check and
                           the use (a time-of-check to time-of-use
                           hole)
```

```java
// What the COMPILER does, and what it CANNOT do

// A SINGLE EXPRESSION is already optimised:
String msg = "Hello, " + name + "! You have " + count + " messages.";
//   pre-Java 9:  javac rewrites it into one StringBuilder with
//                chained appends and a final toString
//   Java 9+:     invokedynamic bound to StringConcatFactory, which
//                generates an optimised method handle at runtime,
//                often sizing the buffer EXACTLY
//   -> NO intermediate Strings. This line is fine.

// A LOOP cannot be optimised the same way:
for (...) {
    s += x;          // a SEPARATE EXPRESSION each iteration, so:
}                    //   new StringBuilder
                     //   append the ENTIRE accumulated string
                     //   append x
                     //   toString()
                     //   discard the builder
                     // EVERY ITERATION.

// so a + b + c in one statement is fine, and the same operation
// spread across iterations is quadratic. The difference is entirely
// about EXPRESSION BOUNDARIES.
```

```text
StringBuilder vs StringBuffer:

                       StringBuilder        StringBuffer
  API                  identical            identical
  synchronised         NO                   YES, every public method
  introduced           Java 5               Java 1.0
  intended use         a LOCAL variable     a shared buffer
                       in one thread
  default choice       YES                  essentially never

  the history explains the oddity: StringBuffer came first, when a
  thread-safe buffer was assumed to be the sensible default.
  StringBuilder was added once it was obvious that a builder is
  almost always a local variable confined to one thread, so the
  synchronisation was pure cost.
```

```java
// Two honest qualifications, which separate a current answer
// from folklore:

// 1. THE PERFORMANCE GAP IS SMALLER THAN PEOPLE CLAIM
//    uncontended synchronisation on a modern JVM is cheap, and
//    ESCAPE ANALYSIS often proves the builder never leaves the
//    method, allowing LOCK ELISION to remove it entirely.
//    The difference in a microbenchmark is real but modest.

// 2. StringBuffer's THREAD SAFETY IS NOT USEFUL THREAD SAFETY
StringBuffer shared = new StringBuffer();

// thread A:                     thread B:
shared.append("hello");          shared.append("world");
// each METHOD is atomic, so the buffer is not CORRUPTED...
// ...but the ORDER is arbitrary, and:

if (shared.length() > 0) {       shared.delete(0, shared.length());
    shared.charAt(0);            // <- races with this
}                                // StringIndexOutOfBoundsException

// a SEQUENCE of methods is not atomic. So StringBuffer gives you an
// uncorrupted buffer full of interleaved nonsense: a slower builder
// with a misleading name. Genuinely shared mutable state needs the
// WHOLE LOGICAL OPERATION synchronised by you.
```

```java
// What to use in practice

// a single expression: just use +
String msg = "Hello, " + name + "!";

// a loop: StringBuilder, with a capacity if you can estimate it
StringBuilder sb = new StringBuilder(expectedSize);
for (var item : items) sb.append(item).append('\n');

// joining a collection: clearer, and no trailing-separator fix-up
String csv = String.join(", ", names);
String csv2 = names.stream().collect(Collectors.joining(", ", "[", "]"));

// a template
String out = String.format("%s has %d items", name, count);
String out2 = "%s has %d items".formatted(name, count);

// concurrent accumulation: do NOT share a buffer.
// each thread builds its own and the results are joined at the end,
// which avoids contention entirely.
```

---

### What they ask next

**"Why is `String` immutable in the first place?"**
For thread safety without synchronisation, so that the string pool can intern literals safely, so that the hash can be cached and a key cannot change after insertion, and for security, since a validated string cannot be mutated between the check and the use. The quadratic concatenation is the price of those guarantees.

**"Is `a + b + c` in one line slow?"**
No. A single concatenation expression compiles to one builder, or since Java 9 to `invokedynamic` with `StringConcatFactory`, which often sizes the buffer exactly. There are no intermediate strings. Only concatenation **across statements**, typically in a loop, is quadratic.

**"Why can the compiler not optimise the loop?"**
Because each iteration is a separate expression, so the builder it creates cannot outlive the statement. It would have to prove the loop's only purpose is accumulation and restructure the control flow, which is far beyond a source-to-source rewrite.

**"How does `StringBuilder` avoid the copying?"**
It keeps a mutable array and appends into it, growing geometrically, roughly doubling, only when full. That makes each append amortised constant time and the whole build linear. Giving it an initial capacity removes the growth copies altogether.

**"Is `StringBuffer` ever the right choice?"**
Almost never. Its per-method synchronisation does not make a sequence of operations atomic, so it does not give you a correct concurrent builder, only a slower one. If state really is shared, you must synchronise the whole logical operation yourself, and then the buffer's own locking is redundant.

**"Has the performance gap changed?"**
Yes. Uncontended locks are cheap on modern JVMs, and escape analysis frequently proves a local buffer never escapes, so lock elision removes the synchronisation entirely. The gap is real but much smaller than the folklore suggests, which is why the argument against `StringBuffer` is now about **misleading semantics** rather than speed.

**"What would you use to join a list?"**
`String.join` or `Collectors.joining`. They are clearer than a manual loop and get the separator right without the usual trailing-comma correction, and `joining` additionally takes a prefix and suffix.

**"How do you build a string from many threads?"**
Give each thread its own `StringBuilder` and join the results at the end. Sharing one buffer serialises the threads on a lock and still gives interleaved output, so the accumulation should be per-thread and the combination explicit.

**The common wrong answer** is "use `StringBuilder` because concatenation is slow". The question wants the **mechanism**: `String` is immutable, so `+=` copies the whole accumulated content each time, making the loop `O(n^2)` with `O(n)` garbage, while a mutable builder with geometric growth is `O(n)`. And the second half wants the honest point that **`StringBuffer`'s synchronisation is per-method, not per-sequence**, so it never actually solved the sharing problem it appears to.

---

### Say this in the interview

*"The reason is that String is immutable. There is no operation that modifies a String, so s plus equals x cannot append: it allocates a new character array big enough for both, copies the entire existing content, copies the new content after it, constructs a new String, and leaves the old String and its array as garbage. In a loop of n iterations where the result grows to length n, iteration i copies i characters, so the total is one plus two plus three up to n, which is n times n plus one over two, so the work is order n squared and it allocates order n dead objects along the way. Concretely, ten thousand concatenations of ten characters copies about five hundred million characters and discards ten thousand Strings and ten thousand char arrays to produce a hundred kilobyte result.*

*It is worth saying that this is a consequence of a deliberate design choice rather than an oversight. Immutability gives thread safety for free, makes the string pool possible since literals can only be interned if nobody can change them, allows the hash to be cached and prevents a key changing after insertion, and gives security, because a validated filename or URL cannot be mutated between the check and the use.*

*The compiler already optimises a single concatenation expression. Before Java 9 javac rewrote a plus b plus c into one StringBuilder with chained appends and a final toString, and since Java 9 it compiles to invokedynamic bound to StringConcatFactory, which generates an optimised method handle at runtime and often sizes the buffer exactly. What it cannot do is hoist that out of a loop, because each iteration is a separate expression, so it creates a new builder, appends the whole accumulated string plus the new piece, calls toString and discards the builder, every iteration. So the same operation is fine in one statement and quadratic across iterations, and the difference is entirely about expression boundaries.*

*StringBuilder is a mutable character sequence backed by a resizable array. append writes into the existing array and only grows it when full, by allocating a larger array, roughly doubling, and copying across. Because growth is geometric each append is amortised constant time and the whole build is linear. It is not synchronised, and giving it an initial capacity removes the growth copies entirely when you can estimate the size.*

*StringBuffer has exactly the same API with every public method synchronized. The history explains it: StringBuffer is from Java 1.0, when a thread-safe buffer was assumed to be the sensible default, and StringBuilder was added in Java 5 once it was obvious that a builder is almost always a local variable confined to one thread, so the synchronisation was pure cost.*

*Two honest qualifications. First, the performance gap is smaller than people claim, because uncontended synchronisation on a modern JVM is cheap and escape analysis often proves the builder never leaves the method, allowing lock elision to remove it entirely. Second, and more importantly, StringBuffer's thread safety is not useful thread safety: each method is atomic but a sequence of methods is not, so two threads appending alternately produce an uncorrupted buffer full of interleaved nonsense, and a length followed by a charAt can race with another thread's delete. So it does not give you a correct concurrent builder, it gives you a slower one with a misleading name, and genuinely shared mutable state needs the whole logical operation synchronised by you.*

*So in practice: use plus for a single expression, StringBuilder for a loop with a capacity where you can estimate it, String.join or Collectors.joining for a collection since they handle the separator without a trailing-comma fix-up, String.format or formatted for templates, and for concurrent accumulation give each thread its own builder and join the results at the end rather than sharing one."*
