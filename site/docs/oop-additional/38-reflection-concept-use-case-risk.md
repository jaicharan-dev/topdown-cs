---
id: 38-reflection-concept-use-case-risk
title: "Java Reflection: Concept, Use Case & Risk"
description: "Indispensable in a framework that has never seen your code, and almost always the wrong tool in code that has"

sidebar_position: 38
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Explain Java Reflection to me. Frameworks like Spring, Hibernate, and JUnit use it extensively, but if you were reviewing my PR and saw I wrote custom Reflection code in a business service, why would you reject it?"

---

### Picture it

A workshop where every tool is kept behind a counter, and you ask for what you need **by name**.

**Normally you ask with a form.** You tick "hammer" from a printed list of what exists. If you tick something that is not on the list, **the form is rejected on the spot**, before anything happens. The list is checked at the counter, by a clerk who knows what the workshop holds.

**Reflection is a different window**, where you write the name of a tool **on a blank slip of paper** and push it through. Nobody checks it. If the tool exists, you get it. If you misspelled it, you find out **when you reach the bench and open the empty box**.

**Why does that window exist at all?** Because some people genuinely do not know what they will be asking for. A visiting contractor, hired to work in **any** workshop in the country, cannot possibly have a printed list of what each one stocks. They **have** to ask by name, read from a job sheet. For them the blank slip is not a shortcut, it is **the only mechanism that could work**.

**But you are not a visiting contractor.** You work here, you have the printed list, and you know what is in the next room. Choosing the blank slip means:

**Nobody checks your spelling**, so a typo becomes a failure at the bench instead of at the counter.

**Nobody can tell what you use.** If the workshop wants to know whether anyone still uses the old lathe, they look through the forms. Your slip is a handwritten name; it does not appear in any count. So the lathe gets scrapped, and your job fails next Tuesday.

**You can reach things you are not supposed to.** The slip can name something from the locked cupboard, and whoever reorganises that cupboard has no idea you depended on it.

**It is slower**, because somebody has to go and look rather than pulling a pre-indexed drawer.

And all of this buys you **nothing**, because you knew the tool's name at the time you wrote the slip. You could have ticked the box.

---

### The proper terms

#### What reflection is

**Reflection** is the ability to **inspect and manipulate classes, methods, fields and constructors at runtime**, by name, **without compile-time knowledge of them**.

The API lives in `java.lang.reflect` and around `java.lang.Class`:

**`Class<?>`**, obtained from `Object.getClass()`, a class literal, or `Class.forName("com.example.Thing")`, which loads a class **named by a string**.

**`Method`**, found with `getDeclaredMethods()` or by name and parameter types, and called with `invoke(target, args)`.

**`Field`**, read and written with `get` and `set`.

**`Constructor`**, invoked with `newInstance(args)`.

**`setAccessible(true)`**, which disables the access check so **`private` members can be read and written**.

**`Proxy`**, which creates an implementation of an interface at runtime whose calls are routed to an **`InvocationHandler`**.

The defining property: **the thing being manipulated is identified by a string**, not by a symbol the compiler resolved.

#### Why frameworks must use it

The justification is specific and it does not generalise: **a framework is compiled before your code exists.**

Spring, Hibernate, JUnit and Jackson all ship as JARs compiled long before your `OrderService` was written. They cannot name your types, call your methods or read your fields by any normal means, because **those symbols did not exist at their compile time**. Reflection is the only mechanism that can bridge that gap.

Concretely:

**Spring** scans the classpath for annotated classes, instantiates them through **`Constructor.newInstance`**, and injects dependencies by **setting fields reflectively**, including private ones. It also builds **dynamic proxies** for `@Transactional` and `@Async`, which is why those annotations only work on calls that go through the proxy.

**Hibernate** maps columns to fields, instantiates entities **bypassing your constructor**, and populates fields **directly rather than through setters**, which is why an entity's setters are not called on load.

**JUnit** finds methods annotated `@Test` and invokes them. There is no other way to run a method whose name it cannot know.

**Jackson and Gson** read and write fields by name, matching them to JSON keys.

So the rule that emerges: **reflection is correct when the set of types is genuinely unknown at compile time.** That is the framework's entire situation, and it is almost never yours.

#### Why I would reject it in a business service

Seven reasons, and the first two are the ones I would lead with in a review.

**It defeats the compiler.** A method name in a string is checked by **nobody**. A typo is a `NoSuchMethodException` at runtime, and crucially an IDE **rename refactoring does not see it**, so renaming a method silently breaks the reflective call. You have converted a compile error into a production incident.

**It defeats static analysis.** "Find usages" misses it, call hierarchies are incomplete, dead-code detection reports a method as unused when it is reflectively invoked, and coverage tools mislead. **Nobody can tell what calls what**, which makes the codebase permanently harder to change.

**It is slow.** A reflective call boxes its arguments into an `Object[]`, performs access checks, and resists inlining because the target is not known at the call site. The JIT has improved it greatly and **`MethodHandle`** is faster still, but a direct call remains substantially cheaper, and in a hot path it matters.

**It breaks encapsulation.** `setAccessible(true)` reads another class's private state, so you now depend on **implementation details that may change in any release**, with no compiler error when they do.

**It breaks under modules and native images.** Under **JPMS**, reflecting into a package that is not `opens`-ed throws `InaccessibleObjectException`, which has broken a great deal of older code. And **GraalVM native image** performs closed-world analysis, so anything reached only reflectively must be **declared in configuration** or it is removed from the binary. Reflection is increasingly a **portability cost**, which is a current argument rather than a historical one.

**It is harder to read and to test.** The control flow is invisible at the call site, and a test cannot be written against a signature that does not appear anywhere.

**There is almost always a better tool.** This is the real reason, and the one to finish on.

#### What to use instead

**Polymorphism.** If the behaviour varies by type, put it on the type and call it through an interface. This is what reflection is usually being used to avoid.

**A strategy map.** `Map<String, Handler>` turns "call the method named by this string" into a lookup whose entries are real, compiler-checked references, and which "find usages" can see.

**A functional interface.** Pass a `Supplier`, `Function` or method reference instead of a method name.

**Sealed interfaces with pattern matching**, where the set of types is closed and the compiler can check exhaustiveness.

**An annotation processor**, generating real code at compile time. Lombok, MapStruct and Dagger exist precisely to do at build time what would otherwise be done reflectively, and the generated code is type-checked, debuggable, fast and visible to native image.

**`ServiceLoader`** for a genuine plugin architecture, which is reflection done once, properly, behind a typed interface.

**`MethodHandle` and `VarHandle`** when you truly need dynamic invocation, since they are JIT-friendly and can be bound once and reused.

#### When it is legitimate in application code

To be fair rather than dogmatic, there are real cases:

**A plugin system** loading implementations unknown at build time.

**A generic serialiser, mapper or diffing tool** that must work over arbitrary types.

**Test infrastructure**, where reaching into internals is acceptable and the blast radius is contained.

**A one-off migration or diagnostic tool.**

The question that decides it is a single one: **do I know these types at compile time?** If yes, reflection is the wrong tool, and in a business service the answer is yes.

---

### In code

```java
// What reflection is: everything identified by a STRING
Class<?> clazz = Class.forName("com.example.OrderService");   // by name

Object instance = clazz.getDeclaredConstructor().newInstance();

Method m = clazz.getDeclaredMethod("process", Order.class);
m.setAccessible(true);                     // disables the access check
Object result = m.invoke(instance, order); // boxed args, boxed return

Field f = clazz.getDeclaredField("repository");
f.setAccessible(true);
f.set(instance, repo);                     // writes a PRIVATE field

// and dynamic proxies, which build an implementation at runtime:
Object proxy = Proxy.newProxyInstance(
        loader, new Class<?>[]{ OrderApi.class },
        (p, method, args) -> { /* InvocationHandler */ return null; });

// THE DEFINING PROPERTY: the thing being manipulated is named by a
// STRING, not by a symbol the compiler resolved.
```

```text
Why frameworks MUST use it, and why the justification does not
generalise:

  A FRAMEWORK IS COMPILED BEFORE YOUR CODE EXISTS.

  Spring, Hibernate, JUnit and Jackson all ship as JARs compiled
  long before your OrderService was written. They cannot name your
  types, call your methods or read your fields by any normal means,
  because THOSE SYMBOLS DID NOT EXIST AT THEIR COMPILE TIME.

  SPRING     scans the classpath for annotated classes, instantiates
             them with Constructor.newInstance, injects dependencies
             by SETTING FIELDS REFLECTIVELY (including private ones),
             and builds DYNAMIC PROXIES for @Transactional and @Async
             -> which is why those annotations only work on calls
                that go THROUGH the proxy

  HIBERNATE  maps columns to fields, instantiates entities BYPASSING
             YOUR CONSTRUCTOR, and populates fields DIRECTLY rather
             than through setters
             -> which is why an entity's setters are not called on load

  JUNIT      finds methods annotated @Test and invokes them. There is
             no other way to run a method whose name it cannot know.

  JACKSON    reads and writes fields by name, matching JSON keys

  so the rule: REFLECTION IS CORRECT WHEN THE SET OF TYPES IS
  GENUINELY UNKNOWN AT COMPILE TIME. That is the framework's entire
  situation, and it is almost never yours.
```

```java
// WHY I WOULD REJECT THIS IN A BUSINESS SERVICE
public class OrderService {
    public void handle(String action, Order order) throws Exception {
        Method m = this.getClass().getMethod("do" + action, Order.class);
        m.invoke(this, order);        // "doShip", "doCancel", ...
    }
    public void doShip(Order o)   { /* ... */ }
    public void doCancel(Order o) { /* ... */ }
}

// 1. IT DEFEATS THE COMPILER
//    "do" + action is checked by NOBODY. A typo is a
//    NoSuchMethodException at runtime, and crucially an IDE RENAME
//    REFACTORING DOES NOT SEE IT: rename doShip and this silently
//    breaks. A compile error has become a production incident.

// 2. IT DEFEATS STATIC ANALYSIS
//    "find usages" on doShip returns NOTHING.
//    dead-code detection reports it as unused.
//    call hierarchies are incomplete, coverage misleads.
//    NOBODY CAN TELL WHAT CALLS WHAT.
```

```text
The seven reasons, in review order:

  1. DEFEATS THE COMPILER      a string method name is checked by
                               nobody; rename refactoring cannot see
                               it; a compile error becomes a runtime
                               one

  2. DEFEATS STATIC ANALYSIS   find-usages, call hierarchies,
                               dead-code detection and coverage all
                               break. The codebase becomes
                               permanently harder to change.

  3. SLOW                      arguments are boxed into an Object[],
                               access checks run, and the call
                               resists inlining because the target
                               is unknown at the call site.
                               The JIT has improved it greatly and
                               MethodHandle is faster still, but a
                               direct call remains substantially
                               cheaper.

  4. BREAKS ENCAPSULATION      setAccessible(true) reads another
                               class's private state, so you now
                               depend on implementation details that
                               may change in any release, with no
                               compile error when they do

  5. BREAKS MODULES AND        under JPMS, reflecting into a package
     NATIVE IMAGES             that is not `opens`-ed throws
                               InaccessibleObjectException.
                               GraalVM native image does closed-world
                               analysis, so anything reached only
                               reflectively must be DECLARED IN
                               CONFIGURATION or it is stripped from
                               the binary.
                               -> a PORTABILITY cost, and a current
                                  argument rather than a historical one

  6. HARDER TO READ AND TEST   control flow is invisible at the call
                               site; you cannot test against a
                               signature that appears nowhere

  7. THERE IS A BETTER TOOL    which is the real reason
```

```java
// WHAT TO USE INSTEAD

// 1. A STRATEGY MAP: real, compiler-checked references that
//    "find usages" can see
private final Map<String, Consumer<Order>> actions = Map.of(
    "SHIP",   this::doShip,          // a METHOD REFERENCE: checked,
    "CANCEL", this::doCancel         // visible, refactorable
);

public void handle(String action, Order order) {
    Consumer<Order> handler = actions.get(action);
    if (handler == null) throw new IllegalArgumentException(action);
    handler.accept(order);
}
// rename doShip and the IDE updates the map. A typo in the map is a
// compile error. Find-usages works. It is also faster.

// 2. POLYMORPHISM, if the behaviour belongs to a type
interface OrderAction { void apply(Order o); }

// 3. SEALED INTERFACES + PATTERN MATCHING, where the set is closed
sealed interface Action permits Ship, Cancel { }
String describe(Action a) {
    return switch (a) {
        case Ship s   -> "shipping";
        case Cancel c -> "cancelling";
        // NO default needed: exhaustiveness is CHECKED
    };
}

// 4. AN ANNOTATION PROCESSOR, generating real code at compile time
//    Lombok, MapStruct and Dagger exist precisely to do at BUILD
//    time what would otherwise be done reflectively, and the
//    generated code is type-checked, debuggable, fast, and visible
//    to native image.

// 5. ServiceLoader for a genuine plugin architecture: reflection
//    done ONCE, properly, behind a TYPED interface
ServiceLoader.load(PaymentProvider.class).forEach(p -> register(p));

// 6. MethodHandle / VarHandle when dynamic invocation is genuinely
//    needed: JIT-friendly, and bindable once then reused
```

```text
When reflection IS legitimate in application code, to be fair
rather than dogmatic:

  a PLUGIN SYSTEM loading implementations unknown at build time
  a GENERIC SERIALISER, mapper or diffing tool over arbitrary types
  TEST INFRASTRUCTURE, where reaching into internals is acceptable
     and the blast radius is contained
  a ONE-OFF MIGRATION or diagnostic tool

  and the question that decides it is a single one:

     DO I KNOW THESE TYPES AT COMPILE TIME?

     yes -> reflection is the wrong tool
     no  -> it may be the only tool

  in a business service the answer is YES.
```

---

### What they ask next

**"Why can frameworks not avoid reflection?"**
Because they are compiled before your code exists. Spring cannot name your `OrderService`, and JUnit cannot call a method whose name it has never seen. Reflection is the only mechanism that bridges that gap, and the justification is specific to that situation.

**"What is the single strongest argument against it in application code?"**
That it converts a compile error into a runtime one. A method name in a string is checked by nothing, and an IDE rename does not see it, so a refactoring that the compiler would otherwise have verified silently breaks production.

**"Is it still slow on a modern JVM?"**
Less than it used to be. The JIT optimises hot reflective call sites and `MethodHandle` is faster still, but arguments are boxed into an `Object[]`, access checks run, and inlining is harder because the target is unknown at the call site. A direct call is still substantially cheaper.

**"What breaks under JPMS?"**
Reflecting into a package that the owning module has not `opens`-ed throws `InaccessibleObjectException`. This is why frameworks ask you to open packages to them, and why a lot of older reflective code stopped working on Java 9 and later.

**"Why does GraalVM care?"**
Native image performs closed-world analysis and strips anything unreachable. Code reached only reflectively looks unreachable, so it must be declared in reflection configuration or it disappears from the binary. This makes reflection a portability cost today rather than only a historical complaint.

**"What would you suggest instead of dispatching by method name?"**
A `Map<String, Consumer<...>>` of method references. The entries are real, compiler-checked references, so renaming works, a typo is a compile error, find-usages sees them, and it is faster. The dynamic behaviour is preserved and the compile-time checking is restored.

**"Is `setAccessible(true)` ever acceptable?"**
In test code and in frameworks whose job is exactly this, yes. In a business service it means depending on another class's private implementation details, which can change in any release with no compile error, and under modules it may simply throw.

**"What is the one-question test?"**
Do I know these types at compile time? If yes, reflection is the wrong tool. A framework's answer is no, which is why it is right for them and almost never right for you.

**The common wrong answer** is "reflection is slow and unsafe, so avoid it". Performance is the **weakest** of the reasons, and the JIT has largely addressed it. The real objections are that it **removes compile-time checking**, makes the code **invisible to every refactoring and analysis tool**, and now **fails outright under modules and native images**, while the behaviour it provides is almost always available from a strategy map, polymorphism or a compile-time annotation processor.

---

### Say this in the interview

*"Reflection is the ability to inspect and manipulate classes, methods, fields and constructors at runtime, by name, without compile-time knowledge of them. The API is around java.lang.Class and java.lang.reflect: Class.forName loads a class named by a string, Method.invoke calls a method found by name, Field get and set read and write fields, Constructor.newInstance builds objects, setAccessible disables the access check so private members can be read and written, and Proxy creates an implementation of an interface at runtime routed through an InvocationHandler. The defining property is that the thing being manipulated is identified by a string rather than by a symbol the compiler resolved.*

*Frameworks must use it because a framework is compiled before your code exists. Spring, Hibernate, JUnit and Jackson all ship as JARs compiled long before your OrderService was written, so they cannot name your types or call your methods by any normal means. Spring scans the classpath for annotated classes, instantiates them with Constructor.newInstance, injects dependencies by setting fields reflectively including private ones, and builds dynamic proxies for @Transactional, which is why those annotations only work on calls that go through the proxy. Hibernate maps columns to fields, instantiates entities bypassing your constructor and populates fields directly rather than through setters, which is why setters are not called on load. JUnit finds @Test methods and invokes them. So the rule is that reflection is correct when the set of types is genuinely unknown at compile time, which is the framework's entire situation and almost never yours.*

*In a business service I would reject it for seven reasons. First and strongest, it defeats the compiler: a method name in a string is checked by nobody, a typo is a NoSuchMethodException at runtime, and crucially an IDE rename refactoring does not see it, so renaming a method silently breaks the call. You have converted a compile error into a production incident. Second, it defeats static analysis: find-usages misses it, call hierarchies are incomplete, dead-code detection reports the method as unused, and coverage misleads, so nobody can tell what calls what and the codebase becomes permanently harder to change.*

*Third, it is slow: arguments are boxed into an Object array, access checks run, and the call resists inlining because the target is unknown at the call site. The JIT has improved it greatly and MethodHandle is faster still, but a direct call remains substantially cheaper. Fourth, it breaks encapsulation, because setAccessible reads another class's private state, so you depend on implementation details that can change in any release with no compile error. Fifth, it breaks under modules and native images: under JPMS, reflecting into a package that is not opened throws InaccessibleObjectException, and GraalVM native image does closed-world analysis, so anything reached only reflectively must be declared in configuration or it is stripped from the binary, which makes it a current portability cost rather than a historical complaint. Sixth, it is harder to read and to test, since the control flow is invisible at the call site. And seventh, which is the real reason, there is almost always a better tool.*

*Instead I would use a strategy map, a Map of String to Consumer holding method references, so the entries are real compiler-checked references that rename refactoring updates, a typo is a compile error, find-usages works and it is faster. Or polymorphism, putting the behaviour on the type and calling through an interface. Or sealed interfaces with pattern matching where the set of types is closed, so the compiler checks exhaustiveness. Or an annotation processor generating real code at compile time, which is what Lombok, MapStruct and Dagger exist to do, and the generated code is type-checked, debuggable, fast and visible to native image. ServiceLoader for a genuine plugin architecture, which is reflection done once behind a typed interface. And MethodHandle or VarHandle where dynamic invocation is truly needed.*

*To be fair rather than dogmatic, there are legitimate cases in application code: a plugin system loading implementations unknown at build time, a generic serialiser or mapper over arbitrary types, test infrastructure, and one-off migration or diagnostic tools. The question that decides it is a single one: do I know these types at compile time? If yes, reflection is the wrong tool, and in a business service the answer is yes."*
