---
id: 34-throw-vs-throws-finally-return
title: "throw vs throws, and finally with return"
description: "One raises an exception and one declares it, and a finally block that runs after the return value has already been decided"

sidebar_position: 34
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "`throw` vs `throws`, and does a `finally` block execute if the `try` block contains an early `return` statement?"

---

### Picture it

A sign on a door and the act of walking through it.

**"This door may set off an alarm"** is a **warning printed on the door**. It is there whether or not anyone ever opens the door. It tells you what **could** happen so you can prepare, and it is checked by the building inspector before anyone is allowed in.

**Setting off the alarm** is a thing that actually happens, once, at a particular moment, because someone did something specific.

One is a **declaration about possibilities**; the other is an **event**. They are spelled almost identically in Java and they are not related operations.

**Now the part about leaving the room.**

There is a rule that **the lights must be switched off** whenever you leave, however you leave: walking out normally, running out because the alarm went off, or leaving early because you found what you came for.

The interesting case is leaving early **carrying something**. You pick up the book you came for, and **the moment you pick it up, that is the book you are leaving with**. Then you switch off the lights. If, while reaching for the switch, you notice a better book on the shelf, **it is too late**: your hands are already full with the first one. Changing your mind about which book you wanted does not change the book you are holding.

Unless, of course, you **put the first book down and pick up a different one on your way out**. That is allowed, and it is a terrible idea, because now somebody watching will see you leave with a book nobody asked for. Worse: if you were running out **because of the alarm**, and you stop to pick up a book instead, you leave **calmly, with a book**, and **nobody ever hears about the alarm**.

---

### The proper terms

#### throw

**`throw`** is a **statement** that raises an exception. It takes **one** instance of `Throwable` and transfers control immediately.

```java
throw new IllegalArgumentException("age must be positive");
```

It happens **at runtime**, at that point in the code, exactly once per execution. Everything after it in that block is unreachable, and the compiler enforces that.

#### throws

**`throws`** is a **clause in a method signature** declaring which exceptions the method **may propagate** to its caller. It takes a comma-separated list of types.

```java
void load(String path) throws IOException, SQLException { ... }
```

It **throws nothing by itself**. It is part of the method's **contract**, serving two purposes: documenting what callers must handle, and letting the **compiler enforce** that they do.

The distinction in one line: **`throw` is an action, `throws` is a declaration.**

| | **`throw`** | **`throws`** |
| --- | --- | --- |
| What it is | a statement | a signature clause |
| Where | inside a method body | in the method header |
| Operand | **one** exception instance | a **list** of exception types |
| When | at **runtime** | at compile time |
| Effect | raises the exception | declares what may propagate |

#### Which exceptions must be declared

Only **checked** exceptions require a `throws` clause.

**Checked exceptions** extend `Exception` but **not** `RuntimeException`. The compiler requires every one to be either **caught** or **declared**, which is the handle-or-declare rule. `IOException` and `SQLException` are the familiar examples.

**Unchecked exceptions** are `RuntimeException` and its subclasses, plus `Error` and its subclasses. They need no declaration. You **may** list them in `throws` purely as documentation, and it has no effect on the compiler.

The design intent, which is worth stating: **checked for recoverable conditions the caller can reasonably act on**, such as a missing file; **unchecked for programming errors**, such as a null dereference or an invalid argument, where the right response is to fix the code rather than catch anything.

#### Does finally run after an early return? Yes

**Yes.** `finally` runs whether the `try` block completes normally, throws, or **returns**. Its purpose is to guarantee cleanup on **every** exit path.

What makes the question interesting is when it runs relative to the return, and the sequence is precise:

**1. The return expression is evaluated**, and its value is stored in a temporary slot.

**2. The `finally` block runs.**

**3. The method returns the value stored in step 1.**

That ordering produces the behaviour that catches people out:

```java
int f() {
    int x = 1;
    try {
        return x;        // evaluates x -> 1, stores 1
    } finally {
        x = 2;           // changes the LOCAL, not the stored value
    }
}                        // returns 1
```

The return value was already decided before `finally` ran. Reassigning the local afterwards changes the variable and not the pending result.

But with a **mutable object** the outcome differs, and the reason is the same rule applied to a reference:

```java
List<String> g() {
    List<String> list = new ArrayList<>();
    try {
        return list;         // the REFERENCE is stored
    } finally {
        list.add("x");       // mutates the OBJECT the reference points to
    }
}                            // returns a list containing "x"
```

The stored value is the **reference**, which has not changed. The object it points at has, and the caller sees that.

#### return inside finally, and why it is banned by every linter

A `return`, `break`, `continue` or `throw` **inside** `finally` **discards whatever was pending**, which includes an in-flight exception.

```java
int h() {
    try {
        throw new IllegalStateException("something is badly wrong");
    } finally {
        return 42;        // SWALLOWS the exception entirely
    }
}                         // returns 42. No exception. No trace.
```

The exception does not propagate, is not logged, and leaves no evidence that anything went wrong. Combined with a `return` in `try`, the `finally` return simply overrides it.

This is why static analysis tools flag any abrupt completion inside `finally`, and why the rule is simply never return from a finally block.

#### When finally does not run

It is a strong guarantee, not an absolute one. The cases:

**`System.exit()`** inside `try`. The JVM terminates and `finally` is skipped.

**The JVM crashes or is killed**, by `SIGKILL`, a hardware fault or an internal error.

**The thread never leaves `try`**, through an infinite loop or a deadlock, so there is no exit path to run `finally` on.

**A daemon thread is abandoned** when the JVM exits because only daemon threads remain.

Note what is **not** on the list: an exception being thrown. That is exactly the case `finally` exists for.

#### try-with-resources, and why it is strictly better

Since Java 7, resource cleanup should use **try-with-resources** rather than a `finally` block, and the reason is a bug most hand-written `finally` blocks contain.

If the **body** throws and then **`close()`** also throws, a manual `finally` **replaces** the original exception with the one from `close()`. The real cause is **lost**, and you are left debugging a misleading "failed to close stream" while the actual failure is invisible.

**Try-with-resources inverts this.** The body's exception is the **primary**, and the one from `close()` is **suppressed** and attached to it, retrievable through **`getSuppressed()`**. Nothing is lost.

It also closes resources **in reverse order of creation**, and does so **before** any `catch` or `finally` block attached to the same `try` runs, which is almost always what you want.

---

### In code

```java
// throw: a STATEMENT that raises ONE exception, at runtime
void setAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("age must be positive");
    }                      // everything after this is unreachable,
    this.age = age;        // and the compiler enforces that
}

// throws: a CLAUSE declaring what MAY propagate, at compile time
void load(String path) throws IOException, SQLException {
    // throws NOTHING by itself. It is part of the method's CONTRACT:
    //   it documents what callers must handle, and
    //   it lets the COMPILER ENFORCE that they do
}

// in one line: throw is an ACTION, throws is a DECLARATION.
```

```text
Which exceptions must be declared:

  CHECKED      extends Exception but NOT RuntimeException
               the compiler requires every one to be CAUGHT or
               DECLARED: the "handle or declare" rule
               IOException, SQLException, InterruptedException

  UNCHECKED    RuntimeException and its subclasses,
               plus Error and its subclasses
               need NO declaration.
               you MAY list them in throws as documentation, and it
               has no effect on the compiler

  the design intent:
     CHECKED   for recoverable conditions the caller can act on
               (a missing file, a closed connection)
     UNCHECKED for PROGRAMMING ERRORS (a null dereference, an invalid
               argument), where the right response is to FIX THE CODE
               rather than catch anything
```

```java
// DOES finally RUN AFTER AN EARLY RETURN? YES.
// and the ORDER is what makes it interesting:
//
//   1. the return EXPRESSION IS EVALUATED and stored in a temporary
//   2. the finally block RUNS
//   3. the method returns THE VALUE STORED IN STEP 1

int f() {
    int x = 1;
    try {
        return x;        // step 1: evaluates x -> 1, STORES 1
    } finally {
        x = 2;           // step 2: changes the LOCAL VARIABLE
    }                    // step 3: returns the STORED 1
}
// returns 1, not 2.
// the return value was ALREADY DECIDED before finally ran.
```

```java
// but with a MUTABLE OBJECT the outcome differs, by the SAME rule
List<String> g() {
    List<String> list = new ArrayList<>();
    try {
        return list;         // the REFERENCE is stored
    } finally {
        list.add("x");       // mutates the OBJECT it points to
    }
}
// returns a list containing "x".
//
// the stored value is the REFERENCE, which has not changed.
// the OBJECT has, and the caller sees that.
// -> "finally cannot change the return value" is only true for
//    PRIMITIVES and for reassigning the reference itself.
```

```java
// return INSIDE finally: discards whatever was pending
int h() {
    try {
        throw new IllegalStateException("something is badly wrong");
    } finally {
        return 42;        // SWALLOWS THE EXCEPTION ENTIRELY
    }
}
// returns 42. No exception propagates. Nothing is logged.
// NO EVIDENCE THAT ANYTHING WENT WRONG.

int i() {
    try {
        return 1;
    } finally {
        return 2;         // simply OVERRIDES the pending return
    }
}
// returns 2.

// which is why every static analysis tool flags abrupt completion
// inside finally, and why the rule is simply:
//     NEVER return, break, continue or throw from a finally block.
```

```text
When finally does NOT run (a strong guarantee, not an absolute one):

  System.exit() inside try      the JVM terminates; finally is skipped
  the JVM crashes or is killed  SIGKILL, a hardware fault, an
                                internal error
  the thread never leaves try   an infinite loop or a deadlock: there
                                is no exit path to run finally on
  a daemon thread is abandoned  the JVM exits because only daemon
                                threads remain

  NOTE WHAT IS NOT ON THE LIST: an exception being thrown.
  That is exactly the case finally exists for.
```

```java
// try-with-resources, and the bug most hand-written finally blocks have

// WRONG: the real cause is LOST
InputStream in = null;
try {
    in = new FileInputStream(path);
    process(in);                      // throws "disk corrupt"
} finally {
    if (in != null) in.close();       // ALSO throws "device gone"
}
// the close() exception REPLACES the original.
// you debug "device gone" while "disk corrupt" is invisible.

// RIGHT: the body's exception is PRIMARY, close()'s is SUPPRESSED
try (InputStream in = new FileInputStream(path)) {
    process(in);
}
// propagates "disk corrupt", with "device gone" attached:
catch (IOException e) {
    e.getMessage();                   // "disk corrupt"
    e.getSuppressed();                // [ "device gone" ]
}
// NOTHING IS LOST.

// it also closes resources IN REVERSE ORDER OF CREATION, and does so
// BEFORE any catch or finally attached to the same try runs, which
// is almost always what you want.
try (var conn = pool.get(); var stmt = conn.prepare(sql)) {
    // closes stmt, THEN conn
}
```

---

### What they ask next

**"Does `throws` throw anything?"**
No. It is a declaration in the signature stating which exceptions may propagate. It is checked by the compiler and documents the contract; raising an exception is `throw`'s job and happens at runtime.

**"Do you have to declare unchecked exceptions?"**
No. Only checked exceptions, meaning subclasses of `Exception` that are not `RuntimeException`, must be caught or declared. You may list unchecked ones as documentation, and the compiler ignores it.

**"Does `finally` run if `try` returns early?"**
Yes, always, barring `System.exit`, a JVM crash or a thread that never leaves `try`. The subtlety is the order: the return expression is evaluated and stored first, then `finally` runs, then the stored value is returned.

**"Can `finally` change the returned value?"**
Not by reassigning a local, because the value was already captured. It can if the return value is a **reference to a mutable object**, since mutating that object is visible to the caller. And it can replace the result entirely by containing its own `return`, which is why that is banned.

**"What happens if `finally` contains a `return` while an exception is in flight?"**
The exception is discarded completely. The method returns normally, nothing is logged, and there is no trace that anything failed. This is the strongest argument against abrupt completion in `finally`.

**"When does `finally` genuinely not run?"**
`System.exit`, a JVM crash or kill, an infinite loop or deadlock inside `try` so there is no exit path, and a daemon thread abandoned at JVM shutdown. An exception is not one of them.

**"Why prefer try-with-resources to a `finally` block?"**
Because if the body throws and `close` also throws, a manual `finally` replaces the real exception with the one from `close`, losing the actual cause. Try-with-resources keeps the body's exception as primary and attaches `close`'s as suppressed, so nothing is lost. It also closes in reverse order of creation, before any attached `catch` runs.

**"Why are checked exceptions controversial?"**
Because they propagate through signatures and force intermediate methods to declare or wrap exceptions they cannot handle, which encourages `catch (Exception e) { }`. Most modern Java APIs, and languages such as Kotlin and C#, use unchecked exceptions for that reason, while keeping checked ones for genuinely recoverable conditions.

**The common wrong answer** is "`throw` throws and `throws` declares", then "yes, `finally` always runs", stopping there. The content the question is after is the **exact ordering**: the return value is **captured before `finally` runs**, so reassigning a local cannot change it while mutating a returned object can, and a `return` inside `finally` **silently destroys a pending exception**.

---

### Say this in the interview

*"throw is a statement that raises one exception instance at runtime and transfers control immediately, so everything after it in that block is unreachable and the compiler enforces that. throws is a clause in a method signature listing which exception types may propagate to the caller. It throws nothing by itself; it is part of the method's contract, documenting what callers must handle and letting the compiler enforce that they do. In one line, throw is an action and throws is a declaration.*

*Only checked exceptions need declaring. Checked ones extend Exception but not RuntimeException, and the compiler requires each to be caught or declared, which is the handle-or-declare rule. Unchecked ones are RuntimeException and Error and their subclasses, and need no declaration, though you may list them purely as documentation. The design intent is checked for recoverable conditions the caller can act on, like a missing file, and unchecked for programming errors like a null dereference, where the right response is to fix the code rather than catch anything.*

*On the second part: yes, finally runs if try returns early. It runs whether the block completes normally, throws, or returns, because its purpose is to guarantee cleanup on every exit path. What makes the question interesting is the ordering, which is precise: the return expression is evaluated and its value stored in a temporary, then the finally block runs, then the method returns the stored value.*

*That produces the behaviour that catches people out. If you return a local int and then reassign that local inside finally, the method still returns the original value, because the value was already captured before finally ran. But with a mutable object the outcome differs, by exactly the same rule: the stored value is the reference, which has not changed, so mutating the object it points at is visible to the caller. So the folklore that finally cannot change the return value is only true for primitives and for reassigning the reference itself.*

*And a return, break, continue or throw inside finally discards whatever was pending, which includes an in-flight exception. If the try block throws and finally returns 42, the method returns 42, the exception does not propagate, nothing is logged, and there is no evidence anything went wrong. That is why every static analysis tool flags abrupt completion in a finally block, and the rule is simply never to return from one.*

*finally is a strong guarantee but not absolute. It does not run on System.exit, on a JVM crash or kill, if the thread never leaves try because of an infinite loop or deadlock, or if a daemon thread is abandoned at shutdown. An exception being thrown is not on that list, since that is the case it exists for.*

*Finally, since Java 7 resource cleanup should use try-with-resources rather than a finally block, and the reason is a bug most hand-written finally blocks contain. If the body throws and close also throws, a manual finally replaces the original exception with the one from close, so the real cause is lost and you end up debugging a misleading failed-to-close message. Try-with-resources keeps the body's exception as primary and attaches close's as suppressed, retrievable through getSuppressed, so nothing is lost. It also closes resources in reverse order of creation, and does so before any catch or finally attached to the same try runs."*
