---
id: marker-interface
title: "Marker Interface"
sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is a marker interface? Give an example and explain why it exists.

### The Interview Quick-Hit

"A marker interface is an interface that is completely empty - it contains absolutely no methods and no fields. Its sole purpose is to provide metadata to the JVM or the compiler, 'marking' a class as eligible for a specific system-level operation, such as serialization or cloning."

### The ELI5 Analogy: The VIP Wristband

Imagine you are at a music festival and want to enter the backstage VIP area. The bouncer doesn't ask you to sing, dance, or perform any specific action (which is what a normal Interface does by forcing you to implement a method). Instead, the bouncer just looks at your wrist. If you are wearing the neon VIP wristband, you get in. If not, you are rejected.

The wristband itself doesn't do anything. It has no buttons, batteries, or functions. It is purely a marker that tells the security guard you have special permissions.

### The Classic Example: Serializable

The most famous marker interface in Java is `java.io.Serializable`.

If you are building a backend and you need to save a Java object to a hard drive, or send it across a network to another server, the object needs to be converted into a stream of raw bytes. This process is called **Serialization**.

But the JVM will not serialize just any random object. Some objects hold sensitive memory pointers (like an active database connection or a file stream) that will instantly crash if you try to turn them into byte streams and send them away. The JVM needs explicit permission to serialize a class.

To give permission, you just add the VIP wristband:

```java
import java.io.Serializable;

// We "mark" this class by implementing the completely empty interface
public class UserSession implements Serializable {
    public String username;
    public String token;
    
    public UserSession(String username, String token) {
        this.username = username;
        this.token = token;
    }
    // Notice: We didn't have to Override any methods at all!
}
```

Under the hood, before the JVM tries to save the object, it acts like the bouncer. It runs a simple safety check using the `instanceof` keyword we discussed earlier:

```java
// Inside the JVM's internal code:
if (myObject instanceof Serializable) {
    // Process it, convert to bytes, and save to disk
} else {
    // Throw a NotSerializableException!
}
```

### The Senior-Level Pivot (Bonus Points)

If you want to show architectural maturity in a placement interview, add this exact thought at the end of your answer:

"While built-in marker interfaces like `Serializable` and `Cloneable` are still heavily used by the JVM under the hood, in modern backend development, we rarely write custom marker interfaces anymore. Instead, we use Annotations. If I want to mark a class as a database table today, I don't use a marker interface; I just put `@Entity` at the top of the class. It accomplishes the exact same metadata tagging, but is much cleaner."

---

### Crucial Nuance: The `Cloneable` Antipattern

While `Serializable` is the most common example, the `Cloneable` marker interface is notorious in Java interviews for being a broken design pattern. Even if you mark a class as `Cloneable`, the `clone()` method actually lives on the `Object` class and is `protected`. This means simply implementing the interface doesn't automatically give public access to clone the object. You still have to manually override the `clone()` method and make it `public`. Because of this clunky and confusing design, most modern Java developers avoid `Cloneable` entirely and prefer using custom "Copy Constructors" or factory methods to duplicate objects.
