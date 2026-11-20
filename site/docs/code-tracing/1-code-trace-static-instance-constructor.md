---
id: 1-code-trace-static-instance-constructor
title: "Code Trace: Static Block, Instance Block and Constructor Order"
description: "Two separate phases with different rules: the class is set up once before anyone touches it, and each object is built from the bottom of the hierarchy up"

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the following Java code involving inheritance, static initializer blocks, instance initializer blocks, and constructors, what is the exact output in order? Explain why static blocks run when they do, and how the JVM compiler synthesizes `<clinit>` and `<init>` methods."

```java
class Parent {
    static {
        System.out.println("1. Parent Static Block");
    }
    {
        System.out.println("3. Parent Instance Block");
    }
    Parent() {
        System.out.println("4. Parent Constructor");
    }
}

class Child extends Parent {
    static {
        System.out.println("2. Child Static Block");
    }
    {
        System.out.println("5. Child Instance Block");
    }
    Child() {
        System.out.println("6. Child Constructor");
    }
    public static void main(String[] args) {
        System.out.println("--- Main Starts ---");
        new Child();
        System.out.println("--- Second Instantiation ---");
        new Child();
    }
}
```

**Before you scroll.** Twelve lines print. The numbers in the labels are a hint about textual position, not about order, and two of them are deliberately misleading. Decide three things: what prints before `--- Main Starts ---`, which class's work comes first inside one `new Child()`, and what is different about the second `new Child()`.

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
1. Parent Static Block
2. Child Static Block
--- Main Starts ---
3. Parent Instance Block
4. Parent Constructor
5. Child Instance Block
6. Child Constructor
--- Second Instantiation ---
3. Parent Instance Block
4. Parent Constructor
5. Child Instance Block
6. Child Constructor
```

Ten lines of output from the six labelled blocks, because four of them run twice and two of them do not.

</details>

---

### Picture it

A block of flats, and two completely separate jobs that happen at different times to different things.

**The first job is done once to the building.** Before anybody moves in, someone unlocks the front door, turns on the water, and gets the lift working. That happens one time, ever. The second tenant does not arrive to find the water being connected again, and if the building is never occupied, it may never be done at all.

**The second job is done every time to a flat.** Each new tenant fits out their own kitchen, puts up their own shelves. That happens once per flat, as many times as there are flats.

Keeping those two apart is most of this question, and the thing that makes it a question rather than a definition is that **the code for both lives in the same file, a few lines apart.** A `static` block and an instance block look almost identical. One belongs to the building and one belongs to the flat.

Then there is the ordering within each job, and here the building gives you the right intuition for both.

**The ground floor has to be finished before the first floor can stand on it.** You cannot fit out a flat on the first floor while the structure below it is still going up. So in both jobs, the work for the part you inherited from happens before the work for the part you added. That is true of the one-time building work and it is true of every flat.

And one asymmetry that catches people. Within a single flat, the fitting-out happens in a fixed order relative to the tenant moving in: **the shelves go up before the tenant unpacks**, not after. An instance block is not a thing that runs alongside the constructor or after it; it runs before the constructor's own body, every time, and that is the one detail the labels in this code are arranged to disguise.

---

### The proper terms

#### Two phases, two synthesised methods

**Class initialization** happens once per class per class loader. The compiler gathers every `static` initializer block and every static field initializer, **in textual order**, into one synthesised method called **`<clinit>`**, the class initializer. You cannot call it; the JVM does.

**Instance initialization** happens once per object. The compiler gathers every instance initializer block and every instance field initializer, again **in textual order**, and splices them into **`<init>`**, which is what a constructor compiles to. One `<init>` exists per declared constructor.

The names are not valid Java identifiers, which is deliberate: `<` and `>` cannot appear in a source-level method name, so nothing you write can collide with them.

#### When `<clinit>` runs, precisely

**JLS §12.4.1** lists the triggers. A class is initialized on first **active use**:

- an instance is created
- a static method is invoked
- a non-constant static field is read or assigned
- certain reflective calls

And JLS §12.4.2 gives the rule that decides this problem: **initializing a class first initializes its superclass.** That is why `Parent`'s static work precedes `Child`'s without anybody writing an ordering.

Two triggers that are **not** on the list, and both are asked about:

**Reading a `static final` compile-time constant does not initialize the class.** `static final int X = 42;` is inlined by the compiler into the calling code, so the class is never touched at runtime. Change it to `static final int X = compute();` and it is no longer a compile-time constant, so the access does trigger initialization. This surprises people because the source looks the same.

**Declaring a variable of the type, or using it in an array type, does not initialize it.** Only an active use does.

#### What `<init>` does, in order

For a constructor whose first statement is `super(...)`, explicit or implicit, JLS §12.5 fixes the sequence:

1. evaluate the arguments to `super(...)`
2. run the superclass constructor to completion
3. run this class's **instance initializers and instance field initializers, in textual order**
4. run the rest of this constructor's body

Step 3 is the one that trips people. The instance block is not "part of the constructor" in the sense of running where it appears relative to the constructor; it runs **after the superclass is fully built and before the constructor body**, no matter where in the class it is written.

#### What happens when initialization fails

A class is initialized **once**, and the JVM records the outcome. If `<clinit>` throws:

- the throwable is wrapped in an **`ExceptionInInitializerError`**, unless it is already an `Error`
- the class is marked **erroneous**
- **every later attempt to use it throws `NoClassDefFoundError`**, not the original error

That asymmetry is a real debugging trap: the first stack trace tells you what went wrong, and every subsequent one tells you almost nothing. The message is typically `Could not initialize class Foo`.

Class initialization is also **thread-safe and exactly-once** by specification. The JVM holds a per-class initialization lock, so two threads racing to first-use a class result in one running `<clinit>` and the other blocking until it completes. This is what makes the holder idiom a correct lazy singleton with no explicit locking.

---

### Why it does that, step by step

#### Phase 1: loading `Child` so that `main` can run

Running `java Child` must invoke `Child.main`, which is an active use of `Child`, so `Child` must be initialized first. By §12.4.2 that means initializing `Parent` first.

| Step | What the JVM does | Output |
| :---: | :--- | :--- |
| 1 | `Child` needs initializing, so `Parent` is initialized first | |
| 2 | `Parent.<clinit>` runs its static block | `1. Parent Static Block` |
| 3 | `Child.<clinit>` runs its static block | `2. Child Static Block` |
| 4 | `main` is now callable and begins | `--- Main Starts ---` |

**Nothing here involves an object.** No `Parent` or `Child` instance exists yet, which is exactly why a static block cannot refer to `this` or to any instance field.

#### Phase 2: the first `new Child()`

`Child()` has no explicit `super(...)`, so the compiler inserts an implicit `super()` as its first statement.

| Step | What the JVM does | Output |
| :---: | :--- | :--- |
| 5 | `Child.<init>` begins, immediately calls `super()` | |
| 6 | `Parent.<init>` begins, calls `Object()` which returns | |
| 7 | **Parent's instance initializers run**, in textual order | `3. Parent Instance Block` |
| 8 | Parent's constructor **body** runs | `4. Parent Constructor` |
| 9 | control returns to `Child.<init>`; **Child's instance initializers run** | `5. Child Instance Block` |
| 10 | Child's constructor **body** runs | `6. Child Constructor` |

The pattern to say out loud is "up, then down": the chain of `super()` calls walks all the way up to `Object` before any initializer body executes, and then the work unwinds downward, one class at a time, each doing its initializers and then its constructor body.

Note what this means about `Parent`'s instance block at step 7: it runs before `Child`'s constructor body, so if `Parent`'s constructor calls an overridable method, it runs against a `Child` whose own fields are still at their defaults. That is the subject of a separate trace on this site.

#### Phase 3: the second `new Child()`

| Step | What the JVM does | Output |
| :---: | :--- | :--- |
| 11 | `main` continues | `--- Second Instantiation ---` |
| 12 | `Child` is **already initialized**, so no `<clinit>` runs | |
| 13 | steps 5 to 10 repeat exactly | `3.` `4.` `5.` `6.` |

**The static blocks do not run again**, and this is the heart of the question. `<clinit>` is guarded by the class's initialization state, which is recorded once. `<init>` has no such guard, because there is nothing to guard: a new object genuinely needs initializing.

#### Why the labels are misleading

The numbers in the source are in textual order, and the output is not in textual order:

| Label | Appears in the source as | Runs |
| :--- | :--- | :--- |
| `1. Parent Static Block` | first in `Parent` | once, at class load |
| `2. Child Static Block` | first in `Child` | once, at class load |
| `3. Parent Instance Block` | second in `Parent` | twice, before each Parent constructor body |
| `4. Parent Constructor` | third in `Parent` | twice |
| `5. Child Instance Block` | second in `Child` | twice |
| `6. Child Constructor` | third in `Child` | twice |

The trap is that labels 1 and 2 appear twice in the file but print once in the run, and labels 3 to 6 appear once in the file but print twice. **Counting print statements in the source gives six; the output has ten lines.**

#### Interleaving, which the question hints at

Instance blocks and field initializers are gathered together in textual order, not in two groups. So:

```java
class Demo {
    int a = report("field a");
    { report("block 1"); }
    int b = report("field b");
    { report("block 2"); }

    Demo() { report("constructor body"); }

    static int report(String s) { System.out.println(s); return 0; }
}
```

prints `field a`, `block 1`, `field b`, `block 2`, then `constructor body`. The same holds for static fields and static blocks inside `<clinit>`. **Position in the file is the only thing that orders them**, which is why a field initializer that reads a field declared below it is a forward-reference error rather than a silent zero.

---

### What they ask next

**"Why do both static blocks run before `--- Main Starts ---`?"**
Because invoking `Child.main` is an **active use** of `Child` under **JLS §12.4.1**, so `Child` must be initialized before `main` can run, and **§12.4.2** requires a class's superclass to be initialized first. So `Parent.<clinit>` runs, then `Child.<clinit>`, and only then does `main` begin. Nothing about this involves an object; no instance exists yet.

**"What exactly are `<clinit>` and `<init>`?"**
Synthesised methods the compiler builds. **`<clinit>`** collects every static initializer block and static field initializer in **textual order**, runs once per class, and is invoked by the JVM rather than by you. **`<init>`** is what a constructor compiles to, one per declared constructor, with the instance initializers and instance field initializers spliced in. The angle-bracket names are intentionally not valid Java identifiers, so nothing you write can collide with them.

**"Where exactly does an instance initializer run?"**
After the superclass constructor has completed and **before this constructor's own body**, per **JLS §12.5**, regardless of where in the class it is written. That is the detail the labels in this code are arranged to hide: `3. Parent Instance Block` precedes `4. Parent Constructor` even though the block sits above the constructor in the file for unrelated reasons.

**"Why does the second `new Child()` print only four lines?"**
Because **class initialization is once per class and instance initialization is once per object.** The JVM records that `Child` is initialized, so `<clinit>` is skipped on every later use. `<init>` has no equivalent guard, because a new object genuinely needs building. Six print statements in the source produce ten lines of output for exactly this reason.

**"Is there any way to read a static field without triggering initialization?"**
Yes, and it is a favourite follow-up. **Reading a `static final` compile-time constant does not initialize the class**, because the compiler inlines the value into the caller, so the class is never touched at runtime. `static final int X = 42;` behaves that way; `static final int X = compute();` does not, because it is no longer a compile-time constant. The source looks nearly identical and the runtime behaviour differs.

**"What if a static block throws?"**
The throwable is wrapped in an **`ExceptionInInitializerError`** unless it is already an `Error`, and the class is marked erroneous. **Every subsequent use then throws `NoClassDefFoundError`** with a message like `Could not initialize class Foo`, not the original exception. So the first stack trace is informative and every one after it is nearly useless, which is why these failures are hard to diagnose from a log that has rolled.

**"Is class initialization thread-safe?"**
Yes, by specification. The JVM takes a per-class initialization lock, so if two threads first-use a class simultaneously, one runs `<clinit>` and the other blocks until it finishes. **That guarantee is what makes the holder idiom a correct lazy singleton** with no synchronisation written by hand: a private static nested class whose static field is initialized on first access to it.

**"Do instance blocks and field initializers run as two groups?"**
No, they are interleaved **in textual order**, which is why position in the file is the only thing that orders them. A field declared after an initializer that reads it is a forward-reference compile error rather than a silent default value. The same applies to static fields and static blocks within `<clinit>`.

**"What is the practical use of an instance initializer block?"**
Rare, and worth being honest about. The legitimate cases are initialization logic shared by several constructors that cannot be expressed as a field initializer, and the double-brace idiom for anonymous classes, which is best avoided because it creates a subclass and captures the enclosing instance. **Most instance blocks are better written as a private helper called from each constructor**, which is easier to find and to test.

**"What does this question actually test?"**
Whether you distinguish the two phases rather than remembering a sequence. The giveaway answer is "statics run first", which is true and insufficient: it does not explain why the second instantiation differs, why the superclass precedes the subclass, or where an instance block sits relative to the constructor body.

**The common wrong answer** is reading the labels as the output order and reporting 1 to 6 once. Next is giving six lines instead of ten, by forgetting that the instance work repeats and the static work does not. Third is placing instance blocks after the constructor body, when §12.5 puts them before it. And last is explaining the ordering as "static before instance" without the superclass-first rule, which is the part that actually decides lines 1 and 2.

---

### Say this in the interview

*"There are two separate phases here with different rules, and keeping them apart is the whole question. Class initialization happens once per class, and instance initialization happens once per object. The confusing part is that the code for both lives a few lines apart in the same file and a static block looks almost identical to an instance block.*

*Starting with class initialization. Running Child.main is an active use of Child under JLS 12.4.1, so Child has to be initialized before main can run, and 12.4.2 says initializing a class first initializes its superclass. So Parent's static block prints, then Child's static block prints, and only then does main begin and print "Main Starts". Nothing here involves an object, which is exactly why a static block cannot touch this or any instance field.*

*The compiler gathers every static block and static field initializer, in textual order, into a synthesised method called `<clinit>`, and the JVM invokes it, not you. Likewise each constructor compiles to an `<init>` method with the instance initializers and instance field initializers spliced in. Those angle-bracket names are deliberately not valid Java identifiers so nothing you write collides with them.*

*Then the first new Child. Child's constructor has no explicit super call, so the compiler inserts an implicit one as the first statement. So init for Child begins, immediately calls super, Parent's init begins, calls Object's constructor which returns, and now the important bit: Parent's instance initializers run, then Parent's constructor body, then control returns to Child, Child's instance initializers run, then Child's constructor body. So "Parent Instance Block", "Parent Constructor", "Child Instance Block", "Child Constructor".*

*The pattern I would name is up then down. The chain of super calls walks all the way to Object before any initializer body executes, and then the work unwinds downward one class at a time, each doing its initializers and then its constructor body. And the detail the labels in this code are arranged to disguise is where an instance block sits: JLS 12.5 puts it after the superclass constructor completes and before this constructor's own body, regardless of where in the file it is written.*

*Then the second new Child prints only the four instance lines, because Child is already initialized and the JVM records that, so `<clinit>` is skipped. `<init>` has no such guard because a new object genuinely needs building. So six print statements in the source produce ten lines of output: labels one and two appear twice in the file but print once, and three to six appear once but print twice.*

*If they want the follow-ups, three I would have ready. Reading a static final compile-time constant does not initialize the class at all, because the compiler inlines the value into the caller, so static final int X equals forty-two never triggers initialization while static final int X equals compute() does, and the source looks nearly the same. If a static block throws, the throwable is wrapped in an ExceptionInInitializerError and the class is marked erroneous, and every later use throws NoClassDefFoundError saying it could not initialize the class, so the first stack trace is informative and every one after it is useless. And class initialization is thread-safe and exactly-once by specification, with a per-class initialization lock, which is precisely what makes the holder idiom a correct lazy singleton without writing any synchronisation.*

*One last thing: instance blocks and field initializers are not two groups, they are interleaved in textual order, so position in the file is the only thing that orders them, and a field initializer that reads a field declared below it is a forward-reference compile error rather than a silent zero."*
