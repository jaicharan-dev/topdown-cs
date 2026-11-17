---
id: 26-object-creation-ways
title: "Ways to Create an Object in Java"
description: "Six mechanisms, and the three that produce a fully formed object without ever running its constructor"

sidebar_position: 26
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are all the distinct ways to instantiate an object in Java? Crucially: which of these mechanisms invoke constructors, which do not, and what is the exact constructor behavior during Deserialization?"

---

### Picture it

A workshop that makes chairs.

**The front door** is the order desk. You place an order, the chair is **built from scratch** on the workshop floor, and every step of the build process runs: the quality checks, the stamping, the "no chair leaves here with fewer than four legs" rule. This is the normal way and it is the only one that runs **the build process**.

**The photocopier in the corner** produces a chair by **duplicating an existing one**, part for part. It never consults the build process at all. Whatever the original was, the copy is, including things the build process would have forbidden. If the original was somehow defective, so is the copy.

**The crate from the warehouse** holds a chair that was **flat-packed years ago** and is now reassembled from its parts list. Here is the part that surprises people: the reassembly also **skips the build process**, so none of the quality checks run. A crate containing "a chair with one leg" produces exactly that, and the rule about four legs never gets a chance to object. Whoever packed the crate effectively decides what comes out.

**The side door** that only the workshop's own engineers use lets you take a **chair-shaped blank** off the shelf with no parts, no process and no checks whatsoever. It exists because the people who build the crates need it.

So the real division is not six doors, it is **two groups**: the ones that **run the build process** and the ones that **assemble a finished object without it**. And every rule the workshop enforces during building is only enforced for the first group, which is why the second group is where the security problems live.

---

### The proper terms

#### The mechanisms

**1. The `new` operator.** The ordinary way. Allocates the object and **invokes a constructor**, which in turn runs the whole initialisation chain: field initialisers, initialiser blocks, and every superclass constructor up to `Object`.

**2. Reflection.** `Constructor.newInstance(...)` **invokes a constructor**, and can invoke **any** constructor including a **private** one after `setAccessible(true)`. This is exactly how Spring, Hibernate, Jackson and JUnit instantiate your classes. The older **`Class.newInstance()`** is **deprecated**, because it could only call a no-arg constructor and it **swallowed checked exceptions**, rethrowing them undeclared.

**3. `clone()`.** **Does not invoke any constructor.** It allocates memory and copies the fields directly from the original. The class must implement **`Cloneable`**, which is a **marker interface** with no methods, or `CloneNotSupportedException` is thrown. The default is a **shallow copy**: references are copied, not the objects they point to.

**4. Deserialisation.** **`ObjectInputStream.readObject()`**. It **does not invoke the class's own constructor**, and the exact rule is below, because this is what the question is really after.

**5. `Unsafe.allocateInstance()`.** Allocates a **zeroed instance** with **no constructor at all** and no field initialisers. It is not public API, and it exists precisely so that serialisation frameworks, mocking libraries and object-graph tools can build objects the normal rules forbid.

**6. Factory methods and builders.** `List.of(...)`, `Integer.valueOf(...)`, `String.valueOf(...)`, any builder's `build()`. These **do** ultimately use `new`, so they are not a distinct creation mechanism, but they matter because they may **return a cached instance** rather than a new one, which is why `Integer.valueOf(127) == Integer.valueOf(127)` is `true` and `128` is not.

Two more that create objects without any explicit call: string literals, which are interned so that identical literals are the same object, and autoboxing, which routes through `valueOf` and therefore through the cache.

#### Which invoke a constructor

This is the division that matters:

| Mechanism | Constructor? |
| --- | --- |
| `new` | yes, the full chain |
| `Constructor.newInstance` | yes, including private ones |
| Factory methods and builders | yes, internally, possibly returning a cached instance |
| `clone()` | **no** |
| Deserialisation | **no**, with one important exception |
| `Unsafe.allocateInstance` | **no**, and no field initialisers either |

The consequence is the point: **any invariant enforced in a constructor is not enforced by the three mechanisms in the lower half.** A class that validates in its constructor can still be produced in an invalid state by `clone`, by deserialisation, or by `Unsafe`.

#### The exact constructor behaviour during deserialisation

The precise rule, which is the part the question singles out:

**Deserialisation walks up the class hierarchy to find the first class that is NOT `Serializable`, and invokes that class's no-argument constructor.** Every class **below** that point, meaning every `Serializable` class in the chain, has **no constructor invoked at all**, and its fields are **written directly from the stream**.

Two consequences follow.

**If the whole chain is `Serializable` up to `Object`**, then the first non-serializable class is `Object` itself, so only `Object`'s no-arg constructor runs and nothing else. None of your initialisation code executes.

**The first non-serializable superclass must have an accessible no-arg constructor**, or deserialisation fails with **`InvalidClassException`**. This is a real and surprising constraint when adding `Serializable` to a class whose parent has only parameterised constructors.

Three important implications:

**Field initialisers and initialiser blocks do not run** for the serializable classes. A field declared as `private List<String> items = new ArrayList<>()` will be whatever the stream says, which may be `null` if the field did not exist when the stream was written.

**`final` fields are set directly**, bypassing the normal "assigned exactly once in a constructor" rule.

**`transient` fields are not written and come back as defaults**: `null`, `0`, `false`. They are not re-initialised by the field initialiser, because that does not run either.

This is why deserialisation is a **security problem**. Serialised data is **attacker-controlled input**, and it can produce an object that **no constructor would ever have permitted**. The defences:

**Implement `readObject`** and **validate** there, re-establishing the invariants the constructor would have enforced, and re-initialising any `transient` field.

**Use `readResolve`** to substitute the correct instance, which is also how a singleton survives deserialisation rather than being duplicated.

**Prefer not to use Java serialisation at all.** Bloch's advice is blunt, and the usual recommendation now is JSON, Protocol Buffers or another format where the deserialiser calls your constructor instead of bypassing it. Java 9 added serialisation filters, **`ObjectInputFilter`**, to limit what classes may be deserialised at all.

And the related point: an **enum singleton is immune**, because the JVM handles enum deserialisation specially and always returns the existing constant, which is a large part of why it is the recommended singleton form.

---

### In code

```java
// 1. new: the full constructor chain
Person p1 = new Person("Arun", 30);
// -> allocate, then: super constructors up to Object, then field
//    initialisers and initialiser blocks in source order, then the
//    constructor body

// 2. Reflection: INVOKES a constructor, including a private one
Constructor<Person> c = Person.class.getDeclaredConstructor(String.class, int.class);
Person p2 = c.newInstance("Bela", 25);

Constructor<Singleton> priv = Singleton.class.getDeclaredConstructor();
priv.setAccessible(true);
Singleton rogue = priv.newInstance();   // a SECOND "singleton"
// this is exactly how Spring, Hibernate, Jackson and JUnit
// instantiate your classes.

// Class.newInstance() is DEPRECATED: it could only call a no-arg
// constructor, and it SWALLOWED CHECKED EXCEPTIONS, rethrowing them
// undeclared.

// 3. clone(): NO constructor. Fields are copied directly.
class Person implements Cloneable {
    @Override public Person clone() throws CloneNotSupportedException {
        return (Person) super.clone();   // allocates + copies fields
    }                                    // the constructor NEVER runs
}
// Cloneable is a MARKER INTERFACE with no methods; without it
// super.clone() throws CloneNotSupportedException.
// the default is a SHALLOW copy: references are copied, not the
// objects they point to.
```

```text
Which mechanisms run a constructor:

  new                           YES, the full chain
  Constructor.newInstance       YES, including private ones
  factory methods / builders    YES internally, but may return a
                                CACHED instance rather than a new one
  ---------------------------------------------------------------
  clone()                       NO
  deserialisation               NO (with one exception, below)
  Unsafe.allocateInstance       NO, and no field initialisers either

  THE CONSEQUENCE: any invariant enforced in a constructor is NOT
  enforced by the three in the lower half. A class that validates
  in its constructor can still be produced in an INVALID STATE by
  clone, by deserialisation, or by Unsafe.
```

```text
The exact deserialisation rule:

  walk UP the hierarchy to the FIRST class that is NOT Serializable,
  and invoke THAT class's NO-ARGUMENT CONSTRUCTOR.
  Every class BELOW that point has NO constructor invoked at all,
  and its fields are written DIRECTLY FROM THE STREAM.

  CASE A: the whole chain is Serializable
     Object                      <- first non-serializable
       Base    implements Serializable
         Child implements Serializable

     -> ONLY Object's no-arg constructor runs.
     -> NONE of your initialisation code executes.

  CASE B: a non-serializable class in the middle
     Object
       Base                      <- NOT Serializable
         Child implements Serializable

     -> Base's NO-ARG constructor runs (and Object's above it)
     -> Child's constructor does NOT
     -> and if Base has no accessible no-arg constructor,
        deserialisation fails with InvalidClassException
     -> which is a real and surprising constraint when adding
        Serializable to a class whose parent has only parameterised
        constructors
```

```java
// Three implications, all of which bite in practice
class Config implements Serializable {
    private List<String> items = new ArrayList<>();  // field initialiser
    private final int limit;                         // final
    private transient Connection conn;               // transient

    Config(int limit) {
        if (limit <= 0) throw new IllegalArgumentException();  // INVARIANT
        this.limit = limit;
        this.conn = connect();
    }
}

// after deserialisation:
//   items  -> whatever the STREAM says. The field initialiser did NOT
//             run, so it may be null if the field did not exist when
//             the stream was written.
//   limit  -> set DIRECTLY from the stream, bypassing the "assigned
//             exactly once in a constructor" rule. It may be -5.
//             The constructor's check never ran.
//   conn   -> null. transient fields are not written, come back as
//             defaults, and are NOT re-initialised, because the
//             field initialiser does not run either.
```

```java
// So deserialisation is a SECURITY problem: the stream is
// ATTACKER-CONTROLLED INPUT that produces an object no constructor
// would ever have permitted.

// defence 1: validate in readObject, re-establishing the invariants
private void readObject(ObjectInputStream in)
        throws IOException, ClassNotFoundException {
    in.defaultReadObject();
    if (limit <= 0) throw new InvalidObjectException("limit must be > 0");
    if (items == null) items = new ArrayList<>();
    this.conn = connect();          // transient fields must be redone
}

// defence 2: readResolve, to substitute the correct instance.
// this is also how a singleton survives deserialisation instead of
// being duplicated:
private Object readResolve() { return INSTANCE; }

// defence 3: prefer not to use Java serialisation at all.
// JSON, Protocol Buffers and similar formats call YOUR CONSTRUCTOR
// instead of bypassing it. Java 9 added ObjectInputFilter to limit
// which classes may be deserialised at all.

// and an ENUM SINGLETON is immune: the JVM handles enum
// deserialisation specially and always returns the existing
// constant, which is much of why it is the recommended form.
```

```java
// Factory methods are not a distinct mechanism, but they matter
Integer a = Integer.valueOf(127);
Integer b = Integer.valueOf(127);
a == b;                 // TRUE: the IntegerCache returns the SAME object

Integer c = Integer.valueOf(128);
Integer d = Integer.valueOf(128);
c == d;                 // FALSE: outside the cache range, new objects

// which is also why autoboxing comparisons with == are a classic bug,
// since autoboxing routes through valueOf and therefore the cache.

// string literals are INTERNED, so identical literals are one object:
"hello" == "hello";                  // true
new String("hello") == "hello";      // false: new ALWAYS allocates
```

---

### What they ask next

**"Does `clone()` call a constructor?"**
No. `Object.clone` allocates memory and copies the fields directly, so no constructor and no field initialiser runs. That is also why a class with a validating constructor can be cloned into an invalid state, and part of why `clone` is widely regarded as a broken design.

**"What exactly runs during deserialisation?"**
The no-argument constructor of the **first non-serializable class** in the hierarchy, and nothing below it. If the whole chain is `Serializable`, that is `Object`, so only `Object`'s constructor runs and none of your code executes. Fields of the serializable classes are written directly from the stream.

**"What if the first non-serializable superclass has no no-arg constructor?"**
Deserialisation fails with `InvalidClassException`. This surprises people when they add `Serializable` to a class whose parent only has parameterised constructors, and it is a genuine constraint on retrofitting serialisation.

**"What happens to `transient` fields?"**
They are not written to the stream and come back as defaults: `null`, `0` or `false`. They are **not** restored by their field initialiser, because field initialisers do not run either, so anything transient must be re-established in `readObject`.

**"Why is deserialisation a security risk?"**
Because the stream is attacker-controlled input that bypasses every constructor, so it can produce objects in states no constructor would permit, and in a large classpath it can trigger gadget chains during reconstruction. The mitigations are validating in `readObject`, `ObjectInputFilter`, and preferring formats that call your constructor.

**"How does an enum singleton survive all of this?"**
The JVM treats enums specially: reflection cannot instantiate them, and deserialisation returns the existing constant rather than constructing a new one. That immunity to both attack routes is Bloch's main argument for the enum singleton.

**"Is a factory method a distinct way of creating an object?"**
Not mechanically, since it uses `new` internally. It is worth mentioning because it may return a **cached** instance, which is why `Integer.valueOf(127) == Integer.valueOf(127)` is true while `128` is false, and why `==` on boxed values is a classic bug.

**"What is `Unsafe.allocateInstance` for?"**
Allocating a zeroed instance with no constructor and no field initialisers. It is not public API and exists so that serialisation frameworks, mocking libraries and object-graph tools can build objects the normal rules forbid.

**The common wrong answer** is listing five or six ways without the division the question is actually asking for. The point is that **three of them produce a fully formed object without running any of your constructor code**, so every invariant enforced in a constructor is silently unenforced for them, and the exact deserialisation rule, the **first non-serializable superclass's no-arg constructor**, is what makes that concrete.

---

### Say this in the interview

*"There are six mechanisms. The new operator, which allocates and invokes a constructor, running the whole chain of superclass constructors, field initialisers and initialiser blocks. Reflection through Constructor.newInstance, which invokes a constructor and can reach a private one after setAccessible, and is exactly how Spring, Hibernate, Jackson and JUnit instantiate your classes; the older Class.newInstance is deprecated because it could only call a no-arg constructor and swallowed checked exceptions. clone, which invokes no constructor at all and copies fields directly, requiring Cloneable, a marker interface with no methods, and giving a shallow copy by default. Deserialisation through ObjectInputStream.readObject. Unsafe.allocateInstance, which allocates a zeroed instance with no constructor and no field initialisers, and exists so serialisation frameworks, mocking libraries and object-graph tools can build what the normal rules forbid. And factory methods and builders, which do use new internally so are not a distinct mechanism, but matter because they may return a cached instance.*

*So the division that matters is that new, reflection and factories run constructors, while clone, deserialisation and Unsafe do not. The consequence is that any invariant enforced in a constructor is not enforced by those three, so a class that validates on construction can still be produced in an invalid state.*

*The exact deserialisation rule is that it walks up the hierarchy to the first class that is not Serializable and invokes that class's no-argument constructor. Every class below that point has no constructor invoked at all, and its fields are written directly from the stream. So if the whole chain is Serializable up to Object, only Object's no-arg constructor runs and none of your code executes. And if the first non-serializable superclass has no accessible no-arg constructor, deserialisation fails with InvalidClassException, which is a surprising constraint when adding Serializable to a class whose parent has only parameterised constructors.*

*Three implications. Field initialisers and initialiser blocks do not run, so a field declared with an initialiser is whatever the stream says and may be null. Final fields are set directly, bypassing the assigned-exactly-once rule, so a final field can hold a value the constructor would have rejected. And transient fields come back as defaults, null, zero or false, and are not restored by their initialiser because that does not run either.*

*That is why deserialisation is a security problem: the stream is attacker-controlled input that produces an object no constructor would ever have permitted. The defences are implementing readObject and validating there, re-establishing the invariants and re-initialising transient fields; using readResolve to substitute the correct instance, which is also how a singleton survives deserialisation rather than being duplicated; and preferring not to use Java serialisation at all, since JSON or Protocol Buffers call your constructor instead of bypassing it, with ObjectInputFilter from Java 9 limiting what may be deserialised. And an enum singleton is immune to both reflection and deserialisation, because the JVM handles enums specially and always returns the existing constant, which is much of why it is the recommended form."*
