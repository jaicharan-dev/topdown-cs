---
id: 36-static-nested-class-vs-inner-class
title: "Static Nested Class vs Inner Class"
description: "One keyword decides whether every instance secretly holds its enclosing object alive, which is how small objects leak large ones"

sidebar_position: 36
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through the difference between a static nested class and a non-static inner class. In production architectures, why is choosing the wrong one a severe memory leak hazard?"

---

### Picture it

Two ways of putting a small office inside a large building.

**One is simply a room with its own door to the street.** It happens to be located inside the building, which is useful for finding it and for keeping related things together, but it operates independently. If the building is demolished, the room goes too, but the room never needed the building for anything except an address.

**The other is a desk belonging to a specific manager.** It is not merely located near them, it is **attached to them**. It can reach into their filing cabinet, use their phone line, read their notes. To create one at all, you must name **which manager**, because a desk with no manager makes no sense.

That attachment is **invisible**: nothing on the desk says "property of manager 7", but the connection is real and it points **from the desk to the manager**.

**And here is the hazard.**

Suppose the manager has an enormous office: filing cabinets, archives, forty years of records. The desk is tiny, a single drawer.

Now you lend **the desk** to an off-site contractor who keeps it in their warehouse for six months. The desk is small, so this seems harmless.

But the desk **is attached to the manager**, so the manager cannot leave. And the manager's **entire office** comes with them. For six months, a warehouse full of archives is held in place by a one-drawer desk that nobody thought twice about.

Nothing looks wrong. The thing that is obviously still in use is tiny. The thing being held hostage is enormous, invisible from the desk, and connected only by a link nobody wrote down.

---

### The proper terms

#### Static nested class

A **static nested class** is declared **`static`** inside another class. It is effectively a **top-level class that happens to be scoped inside another**, for namespacing and to show that the two belong together.

**It has no reference to an enclosing instance.** None is created, none is stored, none exists.

**It can only access the outer class's static members directly.** To reach instance state, it must be given a reference explicitly, like any unrelated class, although it may access **private** static members of the outer class.

**It is instantiated without an enclosing instance**: `new Outer.Nested()`.

**It may declare static members** of its own.

#### Inner class

A **non-static inner class** has an **implicit reference to the instance of the enclosing class that created it**.

**The compiler generates a synthetic field** for it, conventionally named **`this$0`**, and a **synthetic constructor parameter** to populate it. You never write either, and they are visible in `javap`.

**It can access the enclosing instance's members, including private ones**, which is the feature it exists for.

**It requires an enclosing instance to create.** From inside the outer class, `new Inner()` uses `this` implicitly; from outside you must write **`outer.new Inner()`**, which is unusual syntax people rarely see.

**It could not declare static members** before Java 16, which relaxed the restriction.

#### The same distinction in disguise

Three other constructs are **inner classes** and inherit the same hazard:

**Local classes**, declared inside a method, capture the enclosing instance **if they reference it**, and capture effectively final locals.

**Anonymous classes**, the classic `new Runnable() { ... }`, likewise.

**Lambdas are different**, and this is worth knowing. A lambda is **not** an inner class and does not generate one. It captures `this` **only if it actually refers to it**, so a lambda that uses no instance state **holds no reference to the enclosing object**. Converting an anonymous inner class to a lambda can therefore remove a leak outright, which is a genuinely useful fact in a code review.

#### The memory leak

Here is the mechanism stated plainly: **an inner class instance keeps its entire enclosing object reachable for as long as the inner instance is reachable**, through `this$0`.

The danger is a **lifetime mismatch**. A small, long-lived inner object pins a large, short-lived outer object, and the leak is invisible because the thing you can see is tiny.

The classic cases:

**Android.** A non-static `Handler`, `AsyncTask` or `Runnable` declared inside an `Activity`. The message is queued on a looper that **outlives the activity**, so the activity, its **entire view hierarchy** and every bitmap it holds, often megabytes, cannot be collected. Rotating the screen repeatedly leaks a whole activity each time. This is the single most reported Android leak, and the lint warning for it exists precisely because the code looks harmless.

**Server-side.** A non-static `Runnable`, listener or callback registered with a **long-lived executor, cache or event bus**, holding the enclosing service alive, and with it any connection pool, cache or large state the service owns.

**Swing and desktop UIs.** A listener registered on a long-lived model keeping a disposed window alive.

The reason it survives review is that **the reference is never written down**. There is no field in the source, no assignment, nothing to notice. A heap dump shows it immediately as `this$0`, which is why "find a path to a GC root" in a profiler is the standard diagnostic.

#### The rule, and the fix

**Make every nested class `static` unless it genuinely needs access to the enclosing instance.** That is *Effective Java* item 24, and it is one of the few rules with no real exceptions.

Besides preventing leaks, it is cheaper: no hidden field per instance, and no time spent populating it.

The fix when you need some outer state is to pass exactly what is needed, and if the enclosing object itself is genuinely required, hold it through a **`WeakReference`** so it can still be collected:

```java
private static final class SafeHandler extends Handler {
    private final WeakReference<MyActivity> ref;
    SafeHandler(MyActivity a) { this.ref = new WeakReference<>(a); }

    @Override public void handleMessage(Message msg) {
        MyActivity a = ref.get();
        if (a == null) return;      // already collected: nothing to do
        a.update(msg);
    }
}
```

The practical review heuristic: **if a nested class is not `static`, ask what enclosing state it uses.** If the answer is "nothing", add `static`. If something, ask whether it can outlive the enclosing object, and if it can, you have found a leak.

---

### In code

```java
public class Outer {
    private int instanceField = 1;
    private static int staticField = 2;

    // STATIC NESTED: effectively a top-level class, scoped inside
    static class Nested {
        void f() {
            staticField;          // OK: a static member
            // instanceField;     // COMPILE ERROR: no enclosing
        }                         // instance exists
    }

    // INNER: implicitly attached to an Outer instance
    class Inner {
        void f() {
            instanceField;        // OK: via the hidden this$0
            staticField;          // OK
            Outer.this.instanceField;   // the explicit form
        }
    }
}

// creating them:
Outer.Nested n = new Outer.Nested();     // NO enclosing instance

Outer o = new Outer();
Outer.Inner i = o.new Inner();           // REQUIRES one.
                                         // Unusual syntax people
                                         // rarely see.
```

```text
What the compiler actually generates for an inner class:

  class Outer$Inner {
      final Outer this$0;              // SYNTHETIC FIELD
                                       // you never wrote this
      Outer$Inner(Outer outer) {       // SYNTHETIC PARAMETER
          this.this$0 = outer;
      }
      void f() {
          this.this$0.instanceField;   // every access goes through it
      }
  }

  visible with:  javap -p Outer\$Inner.class

  THE REFERENCE POINTS FROM THE INNER OBJECT TO THE OUTER ONE,
  and nothing in your source mentions it.
```

```text
The two, side by side:

                        STATIC NESTED        INNER (non-static)
  reference to outer    NONE                 implicit this$0
  access outer instance only if passed one   directly, incl. private
  creation              new Outer.Nested()   outer.new Inner()
  static members        yes                  not before Java 16
  memory footprint      no hidden field      one hidden reference
                                             per instance
  leak hazard           NONE                 pins the ENTIRE outer
                                             object

  and three constructs that ARE inner classes and share the hazard:
     LOCAL CLASSES       declared in a method; capture the enclosing
                         instance IF they reference it
     ANONYMOUS CLASSES   new Runnable() { ... }, likewise
     LAMBDAS ARE NOT     a lambda is not an inner class and captures
                         `this` ONLY IF IT ACTUALLY REFERS TO IT,
                         so a lambda using no instance state holds
                         NO reference to the enclosing object
                         -> converting an anonymous class to a lambda
                            can remove a leak outright
```

```java
// THE LEAK, in its most reported form: Android
public class MyActivity extends Activity {
    // the Activity holds the ENTIRE VIEW HIERARCHY and its bitmaps:
    // often MEGABYTES

    private class LeakyHandler extends Handler {     // NOT static
        @Override public void handleMessage(Message msg) {
            updateUi(msg);          // uses the enclosing instance
        }
    }

    void start() {
        new LeakyHandler().sendMessageDelayed(msg, 10 * 60 * 1000);
        //  ^ this message sits on a LOOPER THAT OUTLIVES THE ACTIVITY
    }
}

// the Handler is tiny. It holds this$0 -> the Activity.
// the Activity holds the whole view hierarchy and every bitmap.
// for ten minutes, OR until the message runs, none of it can be
// collected.
//
// rotate the screen repeatedly and you leak a WHOLE ACTIVITY each
// time. This is the single most reported Android leak, and the lint
// warning exists precisely because THE CODE LOOKS HARMLESS.
```

```java
// THE SAME LEAK, server-side
public class OrderService {
    private final ConnectionPool pool;      // large
    private final Cache<String, Order> cache;   // larger

    class RetryTask implements Runnable {   // NOT static
        public void run() { retry(); }
    }

    void schedule() {
        GLOBAL_EXECUTOR.schedule(new RetryTask(), 1, TimeUnit.HOURS);
        //  ^ a LONG-LIVED executor now holds a RetryTask,
        //    which holds this$0 -> the OrderService,
        //    which holds the pool and the cache.
        //
        //    the service cannot be collected for an hour, and if the
        //    task is re-scheduled, ever.
    }
}
```

```text
Why it survives code review:

  THE REFERENCE IS NEVER WRITTEN DOWN.
     no field in the source
     no assignment
     nothing to notice

  THE SIZES ARE INVERTED.
     the object you can SEE is tiny (a Handler, a Runnable)
     the object being HELD is enormous (an Activity, a Service)
     and it is invisible from the inner class

  the standard diagnostic is a HEAP DUMP: ask the profiler for the
  path from the retained object to a GC ROOT, and this$0 appears
  immediately.
```

```java
// THE FIX: static, plus exactly what is needed
private static final class SafeHandler extends Handler {
    private final WeakReference<MyActivity> ref;

    SafeHandler(MyActivity a) { this.ref = new WeakReference<>(a); }

    @Override public void handleMessage(Message msg) {
        MyActivity a = ref.get();
        if (a == null) return;        // already collected: nothing to do
        a.updateUi(msg);
    }
}
// static -> no this$0 -> the Activity is NOT pinned
// WeakReference -> it can still be reached WHILE it is alive, and
//                  collected the moment nothing else holds it

// and the simplest fix of all, where it applies:
executor.schedule(() -> doSomethingStateless(), 1, TimeUnit.HOURS);
//                ^ a lambda referring to NO instance state captures
//                  NOTHING. No enclosing object is held at all.
```

```text
The rule (Effective Java, item 24):

  MAKE EVERY NESTED CLASS static UNLESS IT GENUINELY NEEDS ACCESS
  TO THE ENCLOSING INSTANCE.

  one of the few rules with no real exceptions. Besides preventing
  leaks it is simply cheaper: no hidden field per instance, and no
  time spent populating it.

  the practical review heuristic:
     if a nested class is NOT static, ask WHAT ENCLOSING STATE IT USES
        nothing       -> add static
        something     -> can it OUTLIVE the enclosing object?
                         if yes, you have found a leak
```

---

### What they ask next

**"What does `static` on a nested class actually do?"**
It removes the implicit reference to an enclosing instance. The compiler then generates no `this$0` field and no hidden constructor parameter, so the nested class is a top-level class that merely happens to be scoped inside another.

**"Why can you not instantiate an inner class without an outer instance?"**
Because its generated constructor takes the enclosing instance as a parameter to populate `this$0`. There is no object to supply, so `new Outer.Inner()` cannot compile; you need `outer.new Inner()`.

**"How exactly does the leak happen?"**
The inner instance holds `this$0` pointing at the enclosing object, so the enclosing object stays reachable for as long as the inner one does. When the inner object is handed to something long-lived, such as a message queue or a global executor, the enclosing object and everything it owns cannot be collected.

**"Why is it so hard to spot?"**
Because the reference is synthetic and appears nowhere in the source, and the sizes are inverted: the visible object is tiny while the retained object is enormous. A heap dump showing the path to a GC root reveals it immediately as `this$0`.

**"Are lambdas affected?"**
No, and this is a useful distinction. A lambda is not an inner class and captures `this` only if it actually references instance state. A lambda using no instance state holds nothing, so converting an anonymous inner class into a lambda can eliminate a leak outright.

**"What about anonymous and local classes?"**
They are inner classes and carry the same hazard whenever they reference the enclosing instance. An anonymous `Runnable` inside an instance method is the most common accidental form.

**"What is the fix when the nested class genuinely needs the outer object?"**
Make it `static` and pass what it needs explicitly, holding the enclosing object through a `WeakReference` if the object itself is required. The callback then checks whether the referent is still alive and does nothing if it has been collected.

**"Is there a cost beyond the leak?"**
Yes, a small one: every inner instance carries an extra reference field and the constructor must populate it. It is negligible individually and measurable when millions of instances are created, which is another reason the rule is simply to default to `static`.

**The common wrong answer** is "an inner class can access the outer class's members and a static nested class cannot". True, and it misses the consequence. The access is implemented by a **hidden reference from the inner object to the outer one**, so the inner object **keeps the outer object alive**, and handing a small inner object to anything long-lived pins an arbitrarily large outer object that nothing in the source points to.

---

### Say this in the interview

*"A static nested class is declared static inside another class and is effectively a top-level class that happens to be scoped inside another, for namespacing and to show the two belong together. It has no reference to an enclosing instance at all, it can only access the outer class's static members directly, it is instantiated as new Outer.Nested with no enclosing instance, and it may declare static members of its own.*

*A non-static inner class has an implicit reference to the instance of the enclosing class that created it. The compiler generates a synthetic field, conventionally this$0, and a synthetic constructor parameter to populate it, neither of which you write and both of which are visible in javap. That is what lets it access the enclosing instance's members including private ones, and it is why it requires an enclosing instance to create, so from outside you must write outer.new Inner, which is syntax people rarely see. It also could not declare static members before Java 16.*

*Three other constructs are inner classes and inherit the same behaviour: local classes declared inside a method, which capture the enclosing instance if they reference it; anonymous classes, the classic new Runnable with a body; and I would add that lambdas are different. A lambda is not an inner class and captures this only if it actually refers to it, so a lambda using no instance state holds no reference to the enclosing object, which means converting an anonymous inner class to a lambda can remove a leak outright.*

*The leak mechanism stated plainly is that an inner class instance keeps its entire enclosing object reachable for as long as the inner instance is reachable, through this$0. The danger is a lifetime mismatch: a small, long-lived inner object pins a large, short-lived outer object, and it is invisible because the thing you can see is tiny.*

*The classic case is Android, where a non-static Handler, AsyncTask or Runnable inside an Activity is queued on a looper that outlives the activity, so the activity, its entire view hierarchy and all its bitmaps, often megabytes, cannot be collected. Rotating the screen repeatedly leaks a whole activity each time, and the lint warning exists precisely because the code looks harmless. Server-side it is the same shape: a non-static Runnable, listener or callback registered with a long-lived executor, cache or event bus, holding the enclosing service alive along with its connection pool and caches. Swing has the same thing with listeners on long-lived models.*

*It survives review because the reference is never written down. There is no field in the source, no assignment, nothing to notice, and the sizes are inverted, with the visible object tiny and the retained one enormous. The standard diagnostic is a heap dump: ask the profiler for the path from the retained object to a GC root and this$0 appears immediately.*

*So the rule, which is Effective Java item 24, is to make every nested class static unless it genuinely needs access to the enclosing instance. It is one of the few rules with no real exceptions, and besides preventing leaks it is cheaper, with no hidden field per instance. When some outer state is genuinely needed, make the class static and pass exactly what it needs, and if the enclosing object itself is required, hold it through a WeakReference so the callback can check whether it is still alive and do nothing if it has been collected. My review heuristic is: if a nested class is not static, ask what enclosing state it uses. Nothing means add static; something means ask whether it can outlive the enclosing object, and if it can, you have found a leak."*
