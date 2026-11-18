---
id: 30-packages-in-java
title: "Packages in Java"
description: "A namespace that is also an access boundary, which is why two of the four access levels are defined in terms of it"

sidebar_position: 30
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What exactly is a package in Java? More specifically, how does the concept of a package dictate how the 'default' and 'protected' access modifiers actually behave?"

---

### Picture it

An office building divided into departments.

**The obvious purpose is naming.** There is a "Kumar" in accounts and a "Kumar" in legal, and nobody is confused, because the department is part of how you refer to them. Without departments every name in the building would have to be unique.

**The less obvious purpose is trust.** People in the same department share things they would not share with the rest of the building: a shared whiteboard, internal drafts, the working assumptions that have not been written up properly. **Being in the same room is itself a permission**, and it is granted by location rather than by rank.

So there are two different ways to be allowed to see something.

**"Anyone in this room."** Location only. Your seniority is irrelevant; what matters is that you are here.

**"Anyone in this room, plus my trainees wherever they work."** Location, **plus** a relationship. A trainee who has transferred to another floor still gets this, because the material was given to them **for the purpose of doing the job they were trained to do**.

**And the restriction on that second one, which is the part people miss.** The trainee who moved away may use the inherited material **in their own work**. What they may **not** do is use it to rummage through **somebody else's** files back in the old department. The permission was "you may do your job with this", not "you now have the run of the old office". If it were the latter, anyone could become a trainee for a day purely to get access to everything the department holds, and the room's privacy would mean nothing.

**One last thing that surprises people.** A sub-department is **not** inside its parent. "Accounts, Payroll" sounds like a room within a room, and it is not; it is simply another room whose name happens to start the same way. Being in Payroll gives you no automatic access to anything in Accounts.

---

### The proper terms

#### What a package is

A **package** is a **namespace** that groups related types, declared with a **`package` statement** at the top of a file and corresponding by convention to a directory structure.

It does three jobs:

**Namespacing.** `java.util.List` and `java.awt.List` coexist because the package is part of the name. A type's **fully qualified name** is its package plus its simple name.

**Access control.** The package is a **boundary**, and this is the half the question is about.

**Organisation.** Grouping types that change together, which is what makes a codebase navigable.

Worth knowing precisely: the JVM's notion of type identity is actually the pair (class loader, fully qualified name). Two classes with the same fully qualified name loaded by **different class loaders are different types**, which is how application servers isolate deployed applications from one another and why a `ClassCastException` can occur between two classes that appear identical.

#### The four access levels

| Modifier | Same class | Same package | Subclass, other package | Anywhere |
| --- | --- | --- | --- | --- |
| **`private`** | yes | no | no | no |
| **default**, no keyword | yes | yes | no | no |
| **`protected`** | yes | yes | yes, with a restriction | no |
| **`public`** | yes | yes | yes | yes |

The point the question is driving at is visible in the table: **the two middle levels are both defined in terms of the package**, and `protected` is **package access plus something extra**, not a level that supersedes it.

#### Default, or package-private

Writing no modifier gives **package-private** access: visible to **every class in the same package**, and to nothing else.

Three things follow:

**Inheritance is irrelevant to it.** A subclass in a **different** package cannot see a package-private member, even though it extends the class. Membership of the package is the **only** criterion.

**It is the natural "internal API" level.** It lets a group of collaborating classes share something without exposing it to the rest of the program, which is exactly what you want for a helper class, a factory used only by its siblings, or a method that exists for a neighbour's benefit.

**It is the default deliberately.** Java makes the **most restrictive useful** level the one you get by accident, encouraging minimal visibility. The usual advice is to make everything as private as possible, and reach for package-private before `public`.

It is also what makes testing in the same package work: a test placed in the same package can reach package-private members without anything being made public for the test's sake.

#### Protected, and its restriction

**`protected`** grants **everything package-private grants, plus access to subclasses in other packages.**

The first clause surprises people: a `protected` member is visible to **any class in the same package**, related or not. So within a package, `protected` and package-private behave identically.

The second clause carries a restriction that is the real content of this question:

**A subclass in a different package may access a protected member only through a reference of its own type, or a subtype. Not through a reference of the superclass type.**

```java
package a;
public class Parent { protected int value; }

package b;
public class Child extends a.Parent {
    void f(a.Parent other, Child sibling) {
        this.value;      // OK
        sibling.value;   // OK: a Child reference
        // other.value;  // COMPILE ERROR: a Parent reference
    }
}
```

The reason is a precise statement of what `protected` means: **"this is provided so you can implement a subclass"**, not **"you may now manipulate any instance of the parent"**.

Without the restriction, encapsulation would be trivially defeated. Anyone could write a one-line subclass in their own package purely to gain access to the protected state of **every** instance of the parent, including instances they did not create. The restriction confines the privilege to **the subclass's own inherited state**, which is what it was granted for.

#### Packages are not hierarchical

This catches people constantly and is worth stating flatly: **sub-packages have no special access to their parent package.**

`com.example.app.service` is **not inside** `com.example.app`. They are two unrelated namespaces whose names happen to share a prefix. A class in the first has **no** package-private access to a class in the second.

The dotted names suggest a tree, and for access control there is no tree at all, only exact string equality of the package name.

#### Packages are not sealed, and what fixed that

A genuine weakness of package-private access: **anyone can declare a class in your package.** Writing `package com.yourcompany.internal;` in their own source file gives an outsider package-private access to everything in it.

Two mechanisms address this:

**Sealed packages**, declared in a **JAR manifest**, which require all classes in the package to come from the same JAR.

**JPMS modules**, from **Java 9**, which are the real answer. A module declares which packages it **`exports`**, and a package that is not exported is **completely inaccessible** outside the module, even if its types are `public`. This finally gives a level of encapsulation above the package. Modules also **forbid split packages**, where the same package is contributed to by more than one module, precisely because split packages broke package-private's assumptions.

So the modern layering is: `private` within a class, package-private within a package, `public` within a module, and **exported** beyond it.

---

### In code

```java
// A package is declared at the top of the file and maps to a directory
package com.example.billing;      // -> com/example/billing/Invoice.java

public class Invoice { }

// the FULLY QUALIFIED NAME is package + simple name:
//     com.example.billing.Invoice
// which is why java.util.List and java.awt.List coexist happily.

// and precisely: the JVM's type identity is (CLASS LOADER, FQN).
// two classes with the same fully qualified name loaded by DIFFERENT
// class loaders are DIFFERENT TYPES, which is how application servers
// isolate deployments, and why a ClassCastException can occur between
// two classes that look identical.
```

```text
The four access levels, with the package in the middle of everything:

                 same     same      subclass in    anywhere
                 class    package   another pkg
  private        yes      no        no             no
  (default)      yes      YES       no             no
  protected      yes      YES       YES*           no
  public         yes      yes       yes            yes

                                    * with a restriction, below

  THE POINT: the two MIDDLE levels are both defined in terms of the
  PACKAGE, and protected is PACKAGE ACCESS PLUS SOMETHING EXTRA,
  not a level that supersedes it.
```

```java
// DEFAULT / PACKAGE-PRIVATE: membership of the package is the ONLY
// criterion. Inheritance is irrelevant.

package a;
public class Parent {
    int packagePrivate = 1;          // no modifier
}

package a;
class Neighbour {
    void f(Parent p) {
        p.packagePrivate;            // OK: same package, no
    }                                // inheritance needed
}

package b;
public class Child extends a.Parent {
    void f() {
        // this.packagePrivate;      // COMPILE ERROR
    }                                // a SUBCLASS, and still no access:
}                                    // different package
```

```java
// PROTECTED: package access PLUS subclasses elsewhere,
// with the restriction that is the real content of the question

package a;
public class Parent {
    protected int value;
}

package a;
class Neighbour {
    void f(Parent p) { p.value; }    // OK: protected includes
}                                    // PACKAGE access, related or not

package b;
public class Child extends a.Parent {
    void f(a.Parent other, Child sibling, GrandChild gc) {
        this.value;         // OK
        sibling.value;      // OK: a Child reference
        gc.value;           // OK: a SUBTYPE of Child
        // other.value;     // COMPILE ERROR: a PARENT reference
    }
}
```

```text
Why that restriction exists:

  protected means:
     "this is provided SO YOU CAN IMPLEMENT A SUBCLASS"
  it does NOT mean:
     "you may now manipulate ANY INSTANCE of the parent"

  without the restriction, encapsulation would be trivially defeated:

     package attacker;
     class Peek extends a.Parent {        // a one-line subclass...
         int steal(a.Parent victim) {
             return victim.value;         // ...purely to read the
         }                                // protected state of EVERY
     }                                    // instance, including ones
                                          // it did not create

  the restriction confines the privilege to THE SUBCLASS'S OWN
  INHERITED STATE, which is what it was granted for.
```

```text
PACKAGES ARE NOT HIERARCHICAL, which catches people constantly:

  com.example.app
  com.example.app.service

  these look like a tree. For access control THERE IS NO TREE.
  They are two unrelated namespaces whose names share a prefix, and
  access is decided by EXACT STRING EQUALITY of the package name.

  package com.example.app;
  class Config { int secret = 1; }          // package-private

  package com.example.app.service;
  class Handler {
      void f(com.example.app.Config c) {
          // c.secret;     // COMPILE ERROR
      }                    // a "sub-package" has NO special access
  }
```

```java
// PACKAGES ARE NOT SEALED: anyone can join yours
package com.yourcompany.internal;   // written in SOMEBODY ELSE'S file

public class Intruder {
    void f(YourInternalClass c) {
        c.packagePrivateField;      // works. They are in your package.
    }
}

// two mechanisms address this:
//   SEALED PACKAGES, declared in a JAR manifest, requiring all
//   classes in the package to come from the same JAR
//
//   JPMS MODULES (Java 9+), which are the real answer:

module com.yourcompany.app {
    exports com.yourcompany.api;     // visible outside the module
    // com.yourcompany.internal is NOT exported, so it is COMPLETELY
    // INACCESSIBLE outside the module, even though its types are
    // public
    requires java.sql;
}

// modules also FORBID SPLIT PACKAGES, where the same package is
// contributed to by more than one module, precisely because split
// packages broke package-private's assumptions.

// so the modern layering is:
//     private          within a class
//     package-private  within a package
//     public           within a module
//     exported         beyond it
```

---

### What they ask next

**"What is the default access level, and why that one?"**
Package-private, meaning visible within the same package only. It is the default deliberately, so that the most restrictive useful level is what you get by accident, which pushes code towards minimal visibility.

**"Can a subclass in another package see a package-private member?"**
No. Package-private is decided solely by package membership, and inheritance plays no part. This is the cleanest demonstration that the two concepts are independent.

**"Is `protected` more permissive than package-private?"**
Yes, strictly: it grants everything package-private grants **and** subclass access in other packages. Within a package the two behave identically, which surprises people who think `protected` means "subclasses only".

**"Why can a subclass not access `protected` through a parent reference?"**
Because `protected` means "provided so you can implement a subclass", not "you may manipulate any parent instance". Without the restriction, anyone could write a trivial subclass purely to read the protected state of every instance of the parent, defeating encapsulation entirely.

**"Does `com.example.app.service` get access to `com.example.app`?"**
No. Packages are not hierarchical for access purposes; the dotted name only looks like a tree. Access is decided by exact equality of the package name, so a sub-package is simply a different package.

**"Can someone outside your project join your package?"**
Yes, unless you prevent it. Declaring the same package name in their own file gives them package-private access to everything in it. Sealed packages in a JAR manifest stop it, and JPMS modules solve it properly by making unexported packages inaccessible regardless of their members' modifiers.

**"How does testing use package-private?"**
A test class placed in the same package can reach package-private members directly, so nothing has to be made public merely to be testable. This is why the standard Maven and Gradle layouts mirror the package structure under a separate test source root.

**"What do modules add that packages did not have?"**
A level of encapsulation above the package. A `public` type in an unexported package is unreachable from outside the module, which was impossible before, since `public` previously meant genuinely public to everything on the classpath.

**The common wrong answer** is describing a package only as a namespace or a folder. The question is asking about it as an **access boundary**: **package-private is decided purely by package membership with inheritance playing no part**, and **`protected` is package access plus a restricted subclass grant**, restricted precisely so that a throwaway subclass cannot be used to read any parent instance's state.

---

### Say this in the interview

*"A package is a namespace grouping related types, declared with a package statement and mapping by convention to a directory. It does three things: namespacing, so java.util.List and java.awt.List coexist because the package is part of the fully qualified name; access control, since the package is a boundary; and organisation. One precise point worth knowing is that the JVM's type identity is actually the pair of class loader and fully qualified name, so two classes with the same name loaded by different class loaders are different types, which is how application servers isolate deployments and why you can get a ClassCastException between two classes that look identical.*

*There are four access levels. private is the declaring class only. Default, with no keyword, is the same package only. protected is the same package plus subclasses in other packages, with a restriction. And public is everywhere. The point the question is driving at is that the two middle levels are both defined in terms of the package, and protected is package access plus something extra rather than a level that supersedes it.*

*Package-private is visible to every class in the same package and nothing else, and three things follow. Inheritance is irrelevant to it, so a subclass in a different package cannot see a package-private member even though it extends the class, because package membership is the only criterion. It is the natural internal API level, letting collaborating classes share something without exposing it to the rest of the program. And it is the default deliberately, so the most restrictive useful level is what you get by accident. It is also what makes same-package testing work, since a test can reach package-private members without anything being made public for its sake.*

*protected grants everything package-private grants plus access to subclasses in other packages. The first clause surprises people: a protected member is visible to any class in the same package, related or not, so within a package protected and package-private behave identically. The second clause carries the restriction that is the real content: a subclass in a different package may access a protected member only through a reference of its own type or a subtype, never through a reference of the superclass type. So this.value and a Child reference work, and a Parent reference is a compile error.*

*The reason is a precise statement of what protected means: it is provided so you can implement a subclass, not so you may manipulate any instance of the parent. Without the restriction, encapsulation would be trivially defeated, because anyone could write a one-line subclass purely to read the protected state of every instance of the parent, including instances it did not create. The restriction confines the privilege to the subclass's own inherited state, which is what it was granted for.*

*Two more things worth adding. Packages are not hierarchical: com.example.app.service is not inside com.example.app, they are unrelated namespaces whose names share a prefix, and access is decided by exact string equality, so a sub-package has no special access. And packages are not sealed, so anyone can declare a class in your package and gain package-private access to it. Sealed packages in a JAR manifest address that, and JPMS modules from Java 9 solve it properly: a module declares which packages it exports, and an unexported package is completely inaccessible outside the module even if its types are public. Modules also forbid split packages, precisely because those broke package-private's assumptions. So the modern layering is private within a class, package-private within a package, public within a module, and exported beyond it."*
