---
id: 31-marker-interface
title: "Marker Interfaces"
description: "An interface with no methods, used to attach a fact to a type, and the annotation that replaced it everywhere except one case"

sidebar_position: 31
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly is a marker interface? Tell me why we used them historically with things like `Serializable`, and how we handle that same metadata problem in modern Java."

---

### Picture it

A warehouse where some crates carry a **coloured sticker**.

The sticker says nothing. It has no instructions, no weight limit, no handling notes. It is simply **present or absent**, and the forklift driver's rule is "if it has the sticker, load it onto the export lorry; if not, refuse it".

So the sticker is not information, it is a **fact about the crate**, and the behaviour lives entirely with whoever is reading it.

**Why a sticker rather than a note in a file somewhere?** Because the sticker travels **on the crate**. Anyone can see it at a glance, it cannot be separated from the crate, and crucially the **loading bay can be built so that only stickered crates physically fit through the door**. That last property is the one that matters: the restriction is enforced at the **entrance**, before anything is loaded, rather than discovered by a driver halfway to the port.

**But a sticker is a crude thing**, and the problems show up quickly.

It cannot say **anything**. Not "fragile", not "this side up", not "export to Germany only". One bit, and if you need a second fact you need a second sticker.

It cannot be put on **part** of a crate. You can mark the crate; you cannot mark one item inside it.

And worst, a sticker can promise something the crate **cannot deliver**. Put an "openable from the top" sticker on a crate that has no lid, and the sticker is a lie that nothing checks. The sticker only means what the reader decides it means, and nothing in the crate's construction has to agree.

**So the warehouse moved to printed labels** that can carry text, can be stuck on individual items, and can say which depot they apply to. Richer, and they lose one thing: **the loading-bay door can no longer be built to reject the wrong crates**, because the door can only check shape, not read.

---

### The proper terms

#### What a marker interface is

A **marker interface** is an interface that **declares no methods**. Implementing it adds **no behaviour and no obligation**; it attaches a **fact** to the type, which code can then test with **`instanceof`**.

The JDK's examples:

**`Serializable`**, meaning "instances may be written to an `ObjectOutputStream`".

**`Cloneable`**, meaning "`Object.clone()` is permitted on instances of this class".

**`RandomAccess`**, meaning "indexed access is fast", which `Collections.binarySearch` tests to choose between an index-based and an iterator-based algorithm.

**`Remote`**, in RMI, meaning "methods of this interface may be called remotely".

The mechanism is always the same: some library checks the type and changes its behaviour, and the marked class contributes nothing but the marking.

```java
// ObjectOutputStream, in effect:
if (!(obj instanceof Serializable)) {
    throw new NotSerializableException(obj.getClass().getName());
}
```

#### Why an interface rather than a flag

Three genuine advantages, and the first is the only one that still matters:

**Compile-time checking of parameters.** Because the marker is a **type**, you can declare a parameter of that type, and the compiler **rejects unmarked arguments at the call site**:

```java
void persist(Serializable value) { ... }
persist(new Object());    // COMPILE ERROR, not a runtime failure
```

**No annotation can do this.** This is the whole remaining case for marker interfaces.

**Automatic inheritance.** A subclass of a marked class is marked, with nothing to write. Annotations are not inherited unless declared `@Inherited`, and even then only for classes, not interfaces.

**Participation in the type system.** The marker can be used in generic bounds, such as `<T extends Serializable>`, and in collection element types.

#### The problems

**No methods means no contract**, and **`Cloneable` is the canonical disaster**. It is the example to give, because it shows the failure precisely:

`Cloneable` **does not declare `clone()`**. Implementing it gives you **no method at all**. What it actually does is change the behaviour of `Object.clone()`, which is **`protected`**, from "throw `CloneNotSupportedException`" to "perform a field-by-field copy".

So the interface **modifies the behaviour of a protected method in another class**, which is not what an interface is for, and a class can implement `Cloneable` without being cloneable by anyone, because `clone` is still protected. Bloch calls it an atypical use of interfaces and explicitly not one to emulate.

**A marker carries no data.** `Serializable` cannot express "version 3", "exclude this field" or "use this custom writer", which is why Java serialisation needed a whole shadow convention alongside it: the magic field **`serialVersionUID`**, the **`transient`** keyword, and the specially named methods **`readObject`**, **`writeObject`**, **`readResolve`** and **`writeReplace`**, none of which the interface declares. The marker could not carry the configuration, so the configuration went into naming conventions.

**It can only mark a type.** There is no way to mark a method, a field, a parameter or a package.

**It pollutes the type hierarchy.** Every marker is a supertype, so hierarchies accumulate types that mean nothing behaviourally, and a class may need several.

#### The modern answer: annotations

**Annotations**, from Java 5, solve the metadata problem properly, and almost every modern framework uses them: **`@Entity`**, **`@Test`**, **`@Autowired`**, **`@JsonIgnore`**, and in the language itself **`@Override`**, `@Deprecated`, **`@FunctionalInterface`** and `@SafeVarargs`.

What they fix:

**They carry data.** Elements let an annotation say `@Column(name = "user_id", nullable = false)`, which a marker interface can never express.

**They target anything.** **`@Target`** permits types, methods, fields, parameters, constructors, local variables, packages and even type uses.

**They do not affect the type hierarchy.** An annotated class gains no supertype, so no hierarchy pollution and no accidental generic bound.

**Their lifetime is controllable.** **`@Retention`** chooses `SOURCE`, discarded after compilation and useful for tools such as `@Override`; `CLASS`, present in the file but not loaded; or `RUNTIME`, visible to reflection, which is what frameworks need.

**They can be processed at compile time.** An **annotation processor** can validate usage or generate code, which is how Lombok, Dagger, MapStruct and the JPA metamodel work.

What they lose: no compile-time checking of parameters. You cannot declare a method that accepts only `@Entity`-annotated objects and have the compiler enforce it; the check must happen at runtime by reflection.

#### The rule for choosing

Bloch's guidance in *Effective Java*, item 41, is the sentence to be able to produce:

**Use a marker interface when you want to define a type that has no new methods and you want the compiler to check it. Use a marker annotation otherwise.**

The practical test is one question: **will you ever write a method that should accept only marked objects?**

**Yes**, and a marker interface gives you a parameter type the compiler enforces.

**No**, and an annotation is better in every other respect.

Two closing observations worth having:

**`Serializable` is now widely regarded as a design mistake**, independent of the marker question. It bypasses constructors, makes every serializable class's field layout part of its public API, and has been a persistent source of security vulnerabilities, which is why Java 9 added **`ObjectInputFilter`** and why the platform is moving towards an explicit, opt-in serialisation mechanism.

**Sealed interfaces**, from Java 17, are sometimes confused with markers and are a different thing entirely: a sealed interface restricts which types may implement it, which is about closing a hierarchy for exhaustiveness checking rather than attaching a fact.

---

### In code

```java
// A marker interface declares NOTHING
public interface Serializable { }     // that is the entire definition
public interface Cloneable    { }
public interface RandomAccess { }

// the behaviour lives entirely with whoever READS the marking:
// ObjectOutputStream, in effect:
if (!(obj instanceof Serializable)) {
    throw new NotSerializableException(obj.getClass().getName());
}

// Collections.binarySearch, in effect:
if (list instanceof RandomAccess || list.size() < THRESHOLD)
    return indexedBinarySearch(list, key);   // get(i) is cheap
else
    return iteratorBinarySearch(list, key);  // a LinkedList: walk it
```

```java
// THE ONE ADVANTAGE THAT STILL MATTERS: compile-time parameter checking
void persist(Serializable value) { /* ... */ }

persist("a string");          // OK: String implements Serializable
persist(new Object());        // COMPILE ERROR, at the CALL SITE

// NO ANNOTATION CAN DO THIS. With @Serializable instead of the
// interface, the check could only happen at runtime, by reflection,
// after the bad value had already been passed in.

// plus: automatic inheritance (a subclass of a marked class is
// marked, with nothing to write), and participation in generic
// bounds: <T extends Serializable>
```

```java
// WHY Cloneable IS THE CANONICAL DISASTER
public interface Cloneable { }       // declares NO clone() method

class Thing implements Cloneable { }

new Thing().clone();     // COMPILE ERROR: clone() is PROTECTED in
                         // Object, so implementing Cloneable gave
                         // you NO METHOD AT ALL

// what Cloneable actually does is change the behaviour of
// Object.clone(), a PROTECTED method in ANOTHER CLASS, from
// "throw CloneNotSupportedException" to "do a field-by-field copy".
//
// so the interface MODIFIES THE BEHAVIOUR OF A PROTECTED METHOD
// ELSEWHERE, which is not what an interface is for, and a class can
// implement Cloneable without being cloneable by anybody.
//
// Bloch: an atypical use of interfaces, and explicitly not one
// to emulate.

// to actually be cloneable you must ALSO widen the method yourself:
class Thing2 implements Cloneable {
    @Override public Thing2 clone() {
        try { return (Thing2) super.clone(); }
        catch (CloneNotSupportedException e) { throw new AssertionError(e); }
    }
}
```

```text
A marker carries NO DATA, and Serializable shows what that costs:

  the interface says only "this may be serialised".
  it cannot say:
     which version this is
     which fields to skip
     how to write a particular field
     what to substitute on read

  so the configuration went into NAMING CONVENTIONS instead, none of
  which the interface declares:

     private static final long serialVersionUID = 1L;   // a MAGIC
                                                        // FIELD NAME
     private transient Connection conn;                 // a KEYWORD
     private void writeObject(ObjectOutputStream out)   // MAGIC
     private void readObject(ObjectInputStream in)      // METHOD
     private Object readResolve()                       // NAMES
     private Object writeReplace()

  none of these is checked by anything. Misspell readObject and it
  is silently never called.
  THE MARKER COULD NOT CARRY THE CONFIGURATION, SO THE CONFIGURATION
  BECAME A CONVENTION.
```

```java
// THE MODERN ANSWER: annotations carry data and target anything
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.FIELD})
public @interface Auditable {
    String category() default "general";     // CARRIES DATA
    boolean includePayload() default false;
}

@Auditable(category = "billing", includePayload = true)
class Invoice {
    @Auditable(category = "sensitive")       // on a FIELD
    private String accountNumber;
}

// what annotations fix:
//   DATA          elements, as above
//   TARGETS       @Target: types, methods, fields, parameters,
//                 constructors, local variables, packages, type uses
//   NO HIERARCHY  an annotated class gains no supertype
//   LIFETIME      @Retention: SOURCE (tools, like @Override),
//                 CLASS (in the file, not loaded),
//                 RUNTIME (visible to reflection: what frameworks need)
//   COMPILE-TIME  an ANNOTATION PROCESSOR can validate usage or
//   PROCESSING    generate code, which is how Lombok, Dagger,
//                 MapStruct and the JPA metamodel work

// what they LOSE: no compile-time checking of PARAMETERS.
// you cannot declare a method that accepts only @Auditable objects
// and have the compiler enforce it.
```

```text
The rule for choosing (Effective Java, item 41):

  USE A MARKER INTERFACE when you want to define a TYPE that has no
  new methods AND you want the COMPILER TO CHECK IT.
  USE A MARKER ANNOTATION otherwise.

  the practical test is ONE QUESTION:
     WILL YOU EVER WRITE A METHOD THAT SHOULD ACCEPT ONLY MARKED
     OBJECTS?

     YES -> marker interface. It gives you a PARAMETER TYPE the
            compiler enforces, which no annotation can.
     NO  -> annotation. Better in every other respect.

  and in practice the answer is almost always NO, which is why
  annotations have replaced markers nearly everywhere.
```

```text
Two closing observations:

  SERIALIZABLE IS NOW REGARDED AS A DESIGN MISTAKE, independent of
  the marker question:
     it BYPASSES CONSTRUCTORS, so invariants go unenforced
     it makes every serializable class's FIELD LAYOUT part of its
     PUBLIC API, so refactoring breaks compatibility
     it has been a persistent source of SECURITY VULNERABILITIES,
     which is why Java 9 added ObjectInputFilter and why the
     platform is moving to an explicit, opt-in mechanism

  SEALED INTERFACES (Java 17) ARE A DIFFERENT THING, often confused
  with markers:
     sealed interface Shape permits Circle, Square { }
     this RESTRICTS WHICH TYPES MAY IMPLEMENT IT, which is about
     closing a hierarchy for exhaustiveness checking, not about
     attaching a fact to a type.
```

---

### What they ask next

**"What does implementing `Serializable` actually give you?"**
Nothing, in the class itself. It changes how `ObjectOutputStream` treats instances: without it you get `NotSerializableException`, with it the stream writes the fields. The class contributes only the marking.

**"Why is `Cloneable` considered broken?"**
Because it declares no `clone` method, so implementing it gives you nothing callable, since `Object.clone` is `protected`. What it really does is alter the behaviour of a protected method in another class, which is not what interfaces are for, and a class can implement it while being uncloneable by anyone.

**"What can an annotation do that a marker interface cannot?"**
Carry data through elements, target methods, fields, parameters and packages rather than only types, stay out of the type hierarchy, control its own retention, and be processed at compile time to validate or generate code.

**"What can a marker interface do that an annotation cannot?"**
Give you a **parameter type the compiler enforces**. `void persist(Serializable s)` rejects an unmarked argument at the call site, where an annotation could only be checked reflectively at runtime. That is the single remaining reason to use one.

**"How do you decide between them?"**
Ask whether you will ever write a method that should accept only marked objects. If yes, a marker interface, for the compile-time parameter check. If no, an annotation. In practice the answer is almost always no.

**"Why did `Serializable` need `serialVersionUID` and `readObject`?"**
Because a marker carries no data, so none of the configuration could live in the interface. It went into naming conventions instead, which nothing checks: misspell `readObject` and it is silently never called.

**"Is `RandomAccess` a good use of the pattern?"**
It is the best one in the JDK. It conveys a genuine performance fact with no behaviour attached, and `Collections.binarySearch` uses it to choose between an index-based and an iterator-based algorithm, which is a real decision that cannot be made from the interface's methods.

**"Are sealed interfaces a kind of marker?"**
No. A sealed interface restricts **which types may implement it**, which closes a hierarchy so the compiler can check exhaustiveness in a pattern `switch`. A marker attaches a fact and restricts nothing.

**The common wrong answer** is "a marker interface is an empty interface used for metadata, and annotations replaced it". That is the right shape and misses both halves of the detail: **why the interface form was ever better**, which is the compile-time parameter check nothing else provides, and **why `Cloneable` is the cautionary example**, since a marker that promises behaviour it cannot declare is a contract nothing enforces.

---

### Say this in the interview

*"A marker interface is an interface that declares no methods. Implementing it adds no behaviour and no obligation; it attaches a fact to the type, which code can test with instanceof. The JDK's examples are Serializable, meaning instances may be written to an ObjectOutputStream; Cloneable, meaning Object.clone is permitted; RandomAccess, meaning indexed access is fast, which Collections.binarySearch tests to choose between an index-based and an iterator-based algorithm; and Remote in RMI. The mechanism is always the same: some library checks the type and changes behaviour, and the marked class contributes nothing but the marking.*

*There were three reasons to use an interface rather than a flag. Compile-time checking of parameters, because the marker is a type, so you can declare a parameter of that type and the compiler rejects unmarked arguments at the call site, which no annotation can do. Automatic inheritance, since a subclass of a marked class is marked with nothing to write, whereas annotations are not inherited unless declared @Inherited and even then only for classes. And participation in the type system, so the marker can be used in generic bounds.*

*The problems are serious. No methods means no contract, and Cloneable is the canonical disaster: it does not declare clone, so implementing it gives you no method at all, because Object.clone is protected. What it actually does is change the behaviour of a protected method in another class from throwing CloneNotSupportedException to doing a field-by-field copy, which is not what an interface is for, and a class can implement Cloneable while being uncloneable by anybody. Bloch calls it an atypical use of interfaces and explicitly not one to emulate. A marker also carries no data, which is why Serializable needed a whole shadow convention alongside it: the magic field serialVersionUID, the transient keyword, and specially named methods like readObject, writeObject, readResolve and writeReplace, none of which the interface declares, and none of which anything checks, so misspelling readObject means it is silently never called. A marker can also only mark a type, never a method, field, parameter or package, and it pollutes the type hierarchy, since every marker is a supertype that means nothing behaviourally.*

*Annotations, from Java 5, solve the metadata problem properly, and every modern framework uses them: @Entity, @Test, @Autowired, @JsonIgnore, and in the language @Override and @FunctionalInterface. They carry data through elements, so an annotation can say column name equals user_id and nullable equals false. They target anything through @Target: types, methods, fields, parameters, packages, even type uses. They do not affect the type hierarchy. Their lifetime is controllable through @Retention, which is SOURCE for tools like @Override, CLASS, or RUNTIME for frameworks using reflection. And they can be processed at compile time by an annotation processor to validate usage or generate code, which is how Lombok, Dagger and MapStruct work. What they lose is compile-time checking of parameters: you cannot declare a method that accepts only annotated objects and have the compiler enforce it.*

*Bloch's rule, item 41, is the sentence to give: use a marker interface when you want to define a type that has no new methods and you want the compiler to check it, and a marker annotation otherwise. The practical test is one question, whether you will ever write a method that should accept only marked objects. If yes, the interface gives you a parameter type the compiler enforces. If no, the annotation is better in every other respect, and in practice the answer is almost always no.*

*Two closing observations. Serializable is now widely regarded as a design mistake independent of the marker question, because it bypasses constructors so invariants go unenforced, makes every serializable class's field layout part of its public API, and has been a persistent source of security vulnerabilities, which is why Java 9 added ObjectInputFilter. And sealed interfaces from Java 17 are often confused with markers but are a different thing: they restrict which types may implement an interface, which closes a hierarchy for exhaustiveness checking rather than attaching a fact."*
