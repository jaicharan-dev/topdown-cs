---
id: access-modifiers
title: "Access Modifiers"
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** What are access modifiers in Java  -  list all four, what do they control, and which one is the default if you don't specify anything?

"Access modifiers are keywords in Java that determine the visibility and accessibility of classes, methods, and variables. They act as the gatekeepers of encapsulation, strictly controlling which parts of your application are allowed to interact with the internal data of an object."

### The Four Access Modifiers

| Modifier | Same Class | Same Package | Subclasses (Different Package) | Global (Anywhere) |
|---|---|---|---|---|
| `private` | &#x2705; Yes | &#x274C; No | &#x274C; No | &#x274C; No |
| `default` (None) | &#x2705; Yes | &#x2705; Yes | &#x274C; No | &#x274C; No |
| `protected` | &#x2705; Yes | &#x2705; Yes | &#x2705; Yes | &#x274C; No |
| `public` | &#x2705; Yes | &#x2705; Yes | &#x2705; Yes | &#x2705; Yes |

### The ELI5 Analogy: Information Privacy
- **private (Your personal diary):** The most restrictive. Only you (the exact class where the variable/method is defined) can read it or change it. No one else, not even your children (subclasses), can see it.
- **default (A neighborhood block party):** Anyone living in your exact neighborhood (the same Java package) can attend and interact. But if someone lives outside the neighborhood, they have no access.
- **protected (A family heirloom):** Anyone in your house (same package) has access to it. Additionally, your descendants (subclasses) have access to it, even if they move to a different city (a different package).
- **public (A public billboard):** The least restrictive. Anyone in the world, from any class or any package, can see and interact with it.

### The "Trap" Answer: What is the default?
If you do not specify an access modifier (e.g., you just write `int age = 25;`), Java automatically applies **default** access.
In professional environments, this is more commonly referred to as **package-private**.

*Interview Tip:* Do not just say "default." Say, "If you omit the modifier, Java applies default visibility, which is formally known as package-private. This means the member is only accessible to other classes within the exact same package." This specific phrasing demonstrates a deeper familiarity with professional Java terminology.

---

### Crucial Nuance: Top-Level Class Restrictions

A very common "gotcha" interview question is: *"Can a class be marked as private or protected?"*

The answer depends on what kind of class it is:
* **Variables and Methods** can use all four modifiers.
* **Inner (Nested) Classes** can also use all four modifiers.
* **Top-Level Classes** (the main class in a `.java` file) can **ONLY** be `public` or `default` (package-private). 

Why? Because marking a top-level class as `private` would make it completely invisible and unusable to the rest of the application, rendering it useless. Marking it `protected` makes no sense because there is no "parent" package concept in Java routing that would logically enforce protected access at the top level.
