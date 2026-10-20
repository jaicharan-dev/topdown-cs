---
id: 26-object-creation-ways
title: "5 Ways to Create an Object in Java & Constructor Invocations"
description: "Explore the 5 mechanisms for instantiating objects beyond new, which mechanisms invoke constructors, and Unsafe allocation."
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import { Diagram, Tree, Box, Field } from '@site/src/components/ConceptDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are all the distinct ways to instantiate an object in Java? Crucially: which of these mechanisms invoke constructors, which do not, and what is the exact constructor behavior during Deserialization?"

Most people only know one way to create an object in Java: `new`. There are actually five, and the question interviewers really care about is simple: **does this way run the constructor, or does it skip it?**

<Diagram>
<Tree root={
<Box title="Creating an object in Java" accent="#818cf8">
<Field icon="🏗️" code="5 mechanisms" hint="only some of them run the constructor" variant="neutral" />
</Box>
}>
<Box title="new" accent="#34d399"><Field icon="✅" code="runs the constructor" variant="public" /></Box>
<Box title="Reflection" accent="#34d399"><Field icon="✅" code="runs the constructor" variant="public" /></Box>
<Box title="clone()" accent="#fb7185"><Field icon="🚫" code="skips it — raw memory copy" variant="locked" /></Box>
<Box title="Deserialization" accent="#f59e0b"><Field icon="⚠️" code="skips it, with one exception" variant="neutral" /></Box>
<Box title="Unsafe" accent="#fb7185"><Field icon="🚫" code="skips it completely" variant="locked" /></Box>
</Tree>
</Diagram>

### The five ways

1. **`new`** — the normal way. Runs the full constructor chain.
2. **Reflection** (`Constructor.newInstance()`) — how frameworks like Spring and Jackson build objects by class name at runtime. Still runs the constructor.
3. **`Object.clone()`** — copies an existing object's memory, field by field. No constructor runs at all.
4. **Deserialization** (`readObject()`) — rebuilds an object from bytes (a file, a network stream). The constructor is skipped, with one odd exception below.
5. **`Unsafe.allocateInstance()`** — grabs raw heap memory directly, no questions asked. Used by mocking libraries like Mockito and serialization libraries like Kryo, so they can build an object without knowing what arguments its constructor expects.

### Comparison

| Creation Mechanism | Invokes Target Class Constructor? | Constructor Details |
| :--- | :---: | :--- |
| **1. `new` Keyword** | **Yes** | Standard constructor chaining down the inheritance tree (`invokespecial <init>`). |
| **2. Reflection (`Constructor.newInstance`)** | **Yes** | Programmatically resolves and invokes the targeted constructor. *(Note: `Class.newInstance()` was deprecated in Java 9).* |
| **3. `Object.clone()`** | **No** | Copies memory bit-fields directly from the source instance into new heap space. |
| **4. Deserialization (`readObject`)** | **No\*** | **The trap:** does *not* invoke the serializable class's own constructor, but **does** invoke the no-arg constructor of its first non-serializable superclass. |
| **5. `Unsafe.allocateInstance`** | **No** | Directly allocates memory on the heap. Bypasses **all** constructors and initializers entirely. |

---

### 1. The `new` keyword
The JVM allocates uninitialized heap space, pushes the reference onto the operand stack, and calls `invokespecial` to run the `<init>` constructor. Nothing surprising here.

### 2. Reflection (`java.lang.reflect.Constructor`)
Frameworks like Spring Boot, Hibernate, and Jackson build your objects for you, by name, using reflection:
```java
Constructor<User> c = User.class.getDeclaredConstructor(String.class);
c.setAccessible(true); // can even reach private constructors
User u = c.newInstance("Alice");
```
> **Deprecation note:** `Class.newInstance()` was deprecated in Java 9 — it silently swallowed checked exceptions and couldn't call constructors that take arguments. Use `Class.getDeclaredConstructor().newInstance()` instead.

### 3. `clone()`
Needs the class to implement `Cloneable` and override `clone()`. The JVM just copies the bits of the original object into a new block of memory. No constructor involved.

### 4. Deserialization (`ObjectInputStream.readObject()`)
When an object is read back from a byte stream, the JVM fills in its fields directly from those bytes — again, no constructor for that class. But there's a catch: the JVM walks up the class hierarchy looking for the **first non-serializable superclass**, and it *does* call that class's no-arg constructor, to make sure any inherited non-serializable state gets set up properly. If that superclass has no accessible no-arg constructor, deserialization fails with `InvalidClassException`.

### 5. `Unsafe.allocateInstance()`
```java
// Skips the constructor, field initializers, and security checks entirely
User u = (User) unsafe.allocateInstance(User.class);
```
The object exists, but every field holds its raw default value (`0`, `null`, `false`) until something else sets them.

---

### The singleton trap: why `readResolve()` exists

Here's where this actually bites you. If a Singleton gets serialized and then deserialized, deserialization quietly creates a **second instance** — bypassing the private constructor that was supposed to guarantee there's only ever one. That breaks the entire point of a singleton.

The fix is a `readResolve()` hook that swaps in the real instance right after deserialization:

```java
public class DatabasePool implements Serializable {
    private static final DatabasePool INSTANCE = new DatabasePool();
    private DatabasePool() {}
    public static DatabasePool getInstance() { return INSTANCE; }

    // JVM calls this right after deserializing
    protected Object readResolve() {
        // throw away the freshly deserialized duplicate, hand back the real singleton
        return INSTANCE;
    }
}
```

---

### Say this in the interview

*"Java has five ways to create an object. `new` and Reflection both run the constructor. `clone()`, deserialization, and `Unsafe.allocateInstance()` all skip it. The trap worth knowing: deserialization skips the target class's own constructor, but still runs the no-arg constructor of its first non-serializable superclass — if that constructor doesn't exist, you get an `InvalidClassException`. That same gap is also why singletons need a `readResolve()` method; otherwise deserializing one silently creates a second instance."*

---

### Code: tracing constructor calls across `new`, Reflection, `clone()`, and Deserialization

<Tabs>
<TabItem value="java" label="ObjectCreationDemo.java" default>

```java
import java.io.*;
import java.lang.reflect.Constructor;

public class ObjectCreationDemo {

    // First non-serializable superclass in hierarchy
    static class SuperNonSerializable {
        public SuperNonSerializable() {
            System.out.println("   [Constructor] SuperNonSerializable() FIRED!");
        }
    }

    // Serializable and Cloneable child class
    static class Entity extends SuperNonSerializable implements Cloneable, Serializable {
        private static final long serialVersionUID = 1L;
        public String name;

        public Entity(String name) {
            super();
            System.out.println("   [Constructor] Entity(String) FIRED for: " + name);
            this.name = name;
        }

        @Override
        public Object clone() throws CloneNotSupportedException {
            return super.clone();
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("--- 1. Using 'new' Keyword ---");
        Entity e1 = new Entity("NewInstance");

        System.out.println("\n--- 2. Using Reflection ---");
        Constructor<Entity> cons = Entity.class.getDeclaredConstructor(String.class);
        Entity e2 = cons.newInstance("ReflectedInstance");

        System.out.println("\n--- 3. Using clone() ---");
        System.out.println("Calling e1.clone()...");
        Entity e3 = (Entity) e1.clone();
        System.out.println("Cloned Entity Name: " + e3.name + " (Notice NO constructor fired!)");

        System.out.println("\n--- 4. Using Deserialization ---");
        // Serialize e1 to byte array
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(baos)) {
            oos.writeObject(e1);
        }

        // Deserialize
        System.out.println("Deserializing Entity from bytes...");
        ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());
        try (ObjectInputStream ois = new ObjectInputStream(bais)) {
            Entity e4 = (Entity) ois.readObject();
            System.out.println("Deserialized Entity Name: " + e4.name);
            System.out.println("Notice: SuperNonSerializable constructor fired, but Entity constructor was bypassed!");
        }
    }
}
```

</TabItem>
</Tabs>
