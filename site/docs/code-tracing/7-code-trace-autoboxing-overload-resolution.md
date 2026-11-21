---
id: 7-code-trace-autoboxing-overload-resolution
title: "Code Trace: Autoboxing and Overload Resolution Priority"
description: "Widening beats boxing because boxing arrived in Java 5 and was not allowed to change the meaning of code written before it"

sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Given the following Java class with overloaded methods, which overload gets called, and why? What happens if `process(int x)` is deleted? Explain the formal 3-phase overload resolution algorithm defined in JLS §15.12.2, why widening beats autoboxing, and the 'ambiguous method call' traps."

```java
class Calc {
    void process(int x) {
        System.out.println("int version: " + x);
    }
    void process(Integer x) {
        System.out.println("Integer version: " + x);
    }
    void process(long x) {
        System.out.println("long version: " + x);
    }
    public static void main(String[] args) {
        Calc c = new Calc();
        c.process(5);
    }
}
```

**Before you scroll.** The first answer is easy and the second is the question. Decide what `c.process(5)` prints, then decide what it prints if `process(int x)` is **deleted**, with `Integer` and `long` the only candidates left. One of those two requires a conversion to a wider primitive and the other requires wrapping in an object; decide which the language prefers, and why it would have a preference at all.

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
int version: 5
```

With `process(int x)` deleted:

```text
long version: 5
```

**`long` wins over `Integer`.** The compiler would rather convert your `int` to a 64-bit primitive it has nothing to do with than wrap it in the object type that represents exactly the value you passed.

</details>

---

### Picture it

A sorting office with three trays, worked strictly in order, and a rule that it never looks in a later tray while an earlier one has anything in it.

The first tray is for deliveries it can make **without repackaging anything**. The second is for deliveries that need an item put in a box or taken out of one. The third is for everything else.

A clerk takes your parcel and checks the first tray. If anything there can accept it, the job is done; the second and third trays are never opened. Only when the first tray is completely empty does the clerk look in the second.

That procedure explains the surprising answer completely. **Converting an `int` to a `long` needs no repackaging**: it is the same kind of thing in a bigger container, and the language has treated that as free since before boxing existed. **Converting an `int` to an `Integer` means putting it in a box.** So widening sits in the first tray and boxing sits in the second, and the first tray is checked first. The clerk never finds out that the second tray held a far more natural fit.

Now the question worth asking, because "that is the rule" is not an answer: **why would anyone design it that way?**

Because of when boxing arrived. Autoboxing was added in Java 5, and millions of lines of Java had already been compiled against the older rules, where `process(5)` with an `int` and a `long` overload unambiguously meant the `int` one. **If boxing had been allowed to compete on equal terms, adding it would have silently changed the meaning of existing programs.** So it was slotted in as a strictly later phase, which guarantees that any call that compiled before Java 5 still resolves to exactly the same method.

So the rule is not an aesthetic judgement that primitives are better than objects. **It is a compatibility guarantee**, and once you see it that way the whole algorithm stops being arbitrary and becomes the only thing the designers could have done.

And the same structure explains the third tray. Varargs also arrived in Java 5, so it too had to be unable to steal calls from existing code, which is why it is last and why a `process(int...)` overload loses to every fixed-arity candidate.

---

### The proper terms

#### The three phases

**JLS §15.12.2** resolves an overloaded call in up to three passes, and **stops at the first pass that finds any applicable method**:

**Phase 1, §15.12.2.2, strict invocation.** A method is applicable if every argument is assignable to the corresponding parameter by subtyping and widening primitive conversion, with **no boxing, no unboxing and no varargs**.

**Phase 2, §15.12.2.3, loose invocation.** As phase 1, but boxing and unboxing are now permitted. Still no varargs.

**Phase 3, §15.12.2.4, variable arity invocation.** Varargs methods are finally considered.

The stopping rule is what matters. **A single applicable method in an earlier phase ends the search**, so a better fit in a later phase is never examined.

#### Choosing among several in one phase

If a phase yields more than one candidate, §15.12.2.5 picks the **most specific**: the method whose parameter types could be passed to every other candidate. For primitives that follows the widening chain, so `int` is more specific than `long`, which is more specific than `float`.

If no candidate is most specific, the call is **ambiguous** and is a compile error. Ambiguity is a property of the candidate set, not of the argument.

#### The conversions, and which phase each lives in

| Conversion | Example | Phase |
| :--- | :--- | :---: |
| identity | `int` to `int` | 1 |
| **widening primitive** | `int` to `long`, `float`, `double` | **1** |
| widening reference | `Integer` to `Number`, `Object` | 1 |
| **boxing** | `int` to `Integer` | **2** |
| boxing then widening reference | `int` to `Number`, `Object` | 2 |
| unboxing | `Integer` to `int` | 2 |
| unboxing then widening primitive | `Integer` to `long` | 2 |
| varargs | `int` to `int...` | 3 |

The two bolded rows are the whole question: widening is phase 1 and boxing is phase 2, so **widening always wins when both are possible.**

Two combinations are explicitly **not** available, and both are asked about:

**No widening then boxing.** `short` to `Integer` is not a legal method invocation conversion in any phase. `short` boxes only to `Short`, and `Short` is not an `Integer`. This is why the chain cannot be composed in that direction.

**No boxing then widening to an unrelated wrapper.** `int` boxes to `Integer` and `Integer` widens to `Number` or `Object` by reference conversion, but never to `Long`.

#### Why the phases exist

**Backward compatibility.** Boxing and varargs were both introduced in **Java 5**, and the language could not allow either to change the method selected by code that already compiled. Making them strictly later phases guarantees that every pre-Java-5 call resolves identically. **The rule is a compatibility constraint, not a preference for primitives.**

---

### Why it does that, step by step

#### The call as written

`c.process(5)`, where `5` has type `int`. Candidates: `process(int)`, `process(Integer)`, `process(long)`.

**Phase 1**, strict, no boxing:

| Candidate | `int` assignable to it without boxing? | Applicable |
| :--- | :--- | :---: |
| `process(int)` | yes, identity conversion | **yes** |
| `process(long)` | yes, widening primitive conversion | **yes** |
| `process(Integer)` | no, that requires boxing | no |

Two candidates, so **§15.12.2.5** picks the most specific. An `int` can be passed to a method expecting `long`, but a `long` cannot be passed to one expecting `int`, so `int` is more specific.

**Result: `process(int)`.** Output `int version: 5`.

Phases 2 and 3 are never reached. `process(Integer)` was never in the running.

#### With `process(int)` deleted

**Phase 1** again, with only two candidates:

| Candidate | Applicable in phase 1 | Why |
| :--- | :---: | :--- |
| `process(long)` | **yes** | widening primitive is a phase 1 conversion |
| `process(Integer)` | no | boxing is a phase 2 conversion |

Phase 1 finds exactly one applicable method, so **the search stops** and phase 2 is never entered.

**Result: `process(long)`.** Output `long version: 5`.

This is the answer that makes the question worth asking. The compiler converts your `int` into a 64-bit primitive rather than wrapping it in `Integer`, **not because `long` is a better fit but because it is a phase-1 fit**, and `Integer` never gets considered.

#### With both `int` and `long` deleted

Phase 1 finds nothing, so phase 2 runs with boxing permitted, finds `process(Integer)`, and selects it. Output `Integer version: 5`.

So all three overloads are reachable; **which one you get depends entirely on which of the others exist.** Adding a `long` overload to an existing class silently redirects every `int` call away from a pre-existing `Integer` overload, with no warning and no source change at the call site.

#### The three traps

**A narrower primitive cannot reach a wrapper.**

```java
void test(Integer x) { ... }

short s = 5;
test(s);      // compile error: incompatible types
```

Phase 1 fails, since `short` to `Integer` needs boxing. Phase 2 allows boxing, but `short` boxes only to `Short`, and `Short` is not an `Integer`. **There is no widen-then-box conversion**, so the call is simply inapplicable. `test(5)` with a literal `int` would compile; `test(s)` with a `short` does not.

**Boxing then widening a reference does work.**

```java
void test(Number n) { ... }

test(5);      // legal: int boxes to Integer, which widens to Number
```

Phase 1 fails, since `int` to `Number` requires boxing. Phase 2 boxes `int` to `Integer`, and `Integer` is a subtype of `Number`, so widening reference conversion finishes the job. **Box first, then widen the reference, is permitted; widen the primitive then box is not.**

**Two candidates that each need one boxing are ambiguous.**

```java
static void compute(int a, Integer b) { System.out.println("1"); }
static void compute(Integer a, int b) { System.out.println("2"); }

compute(5, 5);    // compile error: reference to compute is ambiguous
```

Phase 1 rejects both, because each needs a boxing in one position. Phase 2 accepts both. Neither is most specific, since the first is better in position one and the second is better in position two, so **§15.12.2.5 cannot choose** and the compiler reports an ambiguity. The fix is a cast at the call site, `compute(5, (Integer) 5)`, which makes one of them applicable in a way the other is not.

#### Where varargs sit

```java
void process(int x)    { }
void process(int... x) { }

process(5);        // calls process(int): phase 1 beats phase 3
```

Varargs are phase 3, so a fixed-arity candidate always wins. This is the same compatibility story: varargs arrived in Java 5 and could not be allowed to capture calls that already resolved to a fixed-arity method. It also means a varargs overload is only ever selected when nothing else is applicable at all, which is usually what you want and is occasionally surprising when you intended the varargs version.

#### What to do about it

The practical conclusion is not to memorise the phases but to **avoid writing overload sets that depend on them**:

**Do not overload on a primitive and its own wrapper.** `process(int)` and `process(Integer)` is the exact shape that produces unreadable call sites, because the selected method depends on the argument's static type rather than on its value.

**Do not overload on several primitives in the same widening chain** unless the behaviour is genuinely identical.

**Give the methods different names** when the behaviour differs. `processInt` and `processBoxed` is uglier and has no resolution surprises at all, which for a library API is the right trade.

**Cast at the call site** when you must disambiguate, since that is the only tool the language gives you after the fact.

---

### What they ask next

**"Which overload runs, and why?"**
`process(int)`, printing `int version: 5`. Phase 1 of **§15.12.2** finds both `process(int)` by identity and `process(long)` by **widening primitive conversion**, since both are permitted without boxing; `process(Integer)` needs boxing and so is not a phase 1 candidate. Among the two, **§15.12.2.5** picks `int` as the most specific, because an `int` can be passed where a `long` is expected but not the reverse.

**"And if `process(int)` is deleted?"**
`process(long)`, printing `long version: 5`. Phase 1 still finds `process(long)`, since widening is a phase 1 conversion, so **the search stops before phase 2 is entered** and `process(Integer)` is never considered. The compiler converts your `int` to a 64-bit primitive rather than wrapping it in the object type that represents exactly that value.

**"Why does widening beat boxing? Is that not backwards?"**
It is **backward compatibility**, not a preference. Boxing arrived in **Java 5**, and code compiled before then had already resolved `process(5)` to the `int` or `long` overload. Letting boxing compete on equal terms would have silently changed which method existing programs called. **Making it a strictly later phase guarantees every pre-Java-5 call resolves identically.** Varargs are phase 3 for exactly the same reason.

**"State the three phases."**
**Phase 1**, strict: subtyping and widening primitive conversion, **no boxing, no varargs**. **Phase 2**, loose: boxing and unboxing permitted, still no varargs. **Phase 3**: varargs. The crucial property is the stopping rule, that **a single applicable method in an earlier phase ends the search**, so a better fit in a later phase is never examined.

**"Why does `test(s)` fail for a `short` when `test(5)` compiles?"**
Because there is **no widen-then-box conversion**. `short` boxes only to `Short`, and `Short` is not an `Integer`, so neither phase makes `test(Integer)` applicable to a `short`. An `int` literal boxes directly to `Integer`, so `test(5)` is fine. The conversions do not compose in that direction, and this asymmetry catches people who expect boxing to follow the widening chain.

**"Then why does `test(5)` work for a `Number` parameter?"**
Because **boxing followed by widening a reference is permitted**: phase 2 boxes `int` to `Integer`, and `Integer` is a subtype of `Number`. So box-then-widen-reference works while widen-primitive-then-box does not. Stating both directions is what shows you know the rule rather than an example of it.

**"When is a call ambiguous?"**
When a phase yields several applicable methods and none is most specific. `compute(int, Integer)` against `compute(Integer, int)` called as `compute(5, 5)`: phase 1 rejects both, phase 2 accepts both, and neither can be passed to the other, so **§15.12.2.5** cannot choose. The only fix after the fact is a **cast at the call site**. Ambiguity is a property of the candidate set, not of the argument.

**"Does adding an overload break source compatibility?"**
Yes, silently, and this is the practical danger. Adding `process(long)` to a class that already had `process(Integer)` redirects every `process(someInt)` call from the `Integer` version to the `long` version, with no change at any call site and no warning. **Overload resolution is a compile-time decision made from static types**, so recompiling against a newer library can change which method runs.

**"Where do varargs fit?"**
Phase 3, so last. `process(int)` always beats `process(int...)` for a single `int` argument. A varargs overload is chosen only when nothing else is applicable at all, which is usually desirable and occasionally surprising when you meant the varargs one.

**"How would you avoid all of this?"**
Do not create the overload set. **Overloading a primitive against its own wrapper** is the exact shape that produces unreadable call sites, and overloading across a widening chain is nearly as bad unless the behaviour is identical. **Different method names are uglier and have no resolution surprises**, which for a library API is the better trade. `Optional` and `Stream` in the JDK take this approach with `of` against `ofNullable` and the separate `IntStream` family.

**The common wrong answer** is `Integer version: 5` for the second case, on the reasoning that `Integer` is the natural match for an `int`. It is the natural match and it is in phase 2, which is never reached. Next is explaining the preference as "primitives are cheaper", when the real reason is that boxing arrived in Java 5 and was not permitted to change existing behaviour. Third is claiming `short` boxes to `Integer` through the widening chain, when boxing does not compose with widening in that direction. And last is describing ambiguity as something about the argument, when it is a property of the candidate set and is resolved by a cast.

---

### Say this in the interview

*"As written it prints "int version: 5", and with the int overload deleted it prints "long version: 5", not the Integer one. That second answer is the interesting one.*

*JLS 15.12.2 resolves an overloaded call in up to three phases and stops at the first phase that finds anything applicable. Phase one is strict invocation: subtyping and widening primitive conversion, with no boxing, no unboxing and no varargs. Phase two is loose invocation, which is the same but with boxing and unboxing permitted. Phase three is varargs. The stopping rule is the part that decides this question: one applicable method in an earlier phase ends the search, so a better fit in a later phase is never even examined.*

*So for process of five, with the argument typed int: in phase one, process of int is applicable by identity, and process of long is applicable by widening primitive conversion, which is a phase-one conversion. Process of Integer needs boxing, so it is not a phase-one candidate at all. Two candidates, so 15.12.2.5 picks the most specific, which is int, because an int can be passed where a long is expected but not the other way round.*

*Delete the int overload and phase one still finds process of long, so the search stops and phase two is never entered. Integer is never considered. The compiler would rather convert my int into a sixty-four-bit primitive it has nothing to do with than wrap it in the object type that represents exactly the value I passed.*

*And the reason, which I think is the real content of this question: it is backward compatibility, not a preference for primitives. Autoboxing arrived in Java 5, and a great deal of Java had already been compiled where process of five with an int and a long overload unambiguously meant the int one. If boxing had been allowed to compete on equal terms, adding it would have silently changed the meaning of existing programs. Slotting it in as a strictly later phase guarantees that any call that compiled before Java 5 resolves to exactly the same method. Varargs are phase three for the same reason, which is why a process of int-ellipsis overload loses to every fixed-arity candidate.*

*Three traps I would have ready. A short cannot reach an Integer parameter at all: phase one fails because it needs boxing, and phase two fails because a short boxes only to Short, which is not an Integer. There is no widen-then-box conversion, so test of s is a compile error while test of five compiles. The reverse direction does work though: int to a Number parameter is fine, because phase two boxes int to Integer and Integer widens to Number by reference conversion. So box-then-widen-reference is permitted and widen-primitive-then-box is not. And two candidates that each need one boxing are ambiguous: compute of int and Integer against compute of Integer and int, called with two ints, is rejected in phase one, accepted for both in phase two, and neither is most specific because each is better in a different position, so the compiler reports an ambiguity and the only fix is a cast at the call site.*

*One practical danger worth volunteering: adding an overload is a silent source-compatibility break. Add process of long to a class that already had process of Integer and every process call with an int argument is redirected to the long version, with no change at any call site and no warning, because overload resolution is a compile-time decision made from static types.*

*Which is why my actual advice is not to memorise the phases but to avoid writing overload sets that depend on them. Overloading a primitive against its own wrapper is exactly the shape that produces unreadable call sites, since the method selected depends on the argument's static type rather than its value. Different method names are uglier and have no resolution surprises at all, and for a library API that is the better trade. The JDK does this itself with Optional's of against ofNullable and with the separate IntStream family."*
