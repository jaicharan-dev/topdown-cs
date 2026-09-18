---
id: 4-interface-vs-abstract-class-java8
title: "Interfaces vs. Abstract Classes: Modern Java Differences"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Since Java 8 introduced default methods, the lines between interfaces and abstract classes have blurred. How do they actually differ now when it comes to constructors and multiple inheritance?"

Here is a top-down, interview-ready breakdown focusing exactly on the three areas you highlighted.

The introduction of Java 8 blurred the lines between interfaces and abstract classes by allowing interfaces to have implemented methods. However, the fundamental design philosophy remains entirely different.

### The Interview Quick-Hit

"While Java 8 introduced default methods to interfaces, the core distinction remains about state. Abstract classes can hold instance state and use constructors to initialize it, meaning a class can only extend one abstract class. Interfaces remain strictly stateless contracts; they have no constructors, and a class can implement multiple interfaces simultaneously."

### The Three Core Differences

| Feature | Abstract Class | Interface (Java 8+) |
| --- | --- | --- |
| 1. Constructors | ✅ Has constructors. Executed via `super()` when a child class is instantiated. | ❌ No constructors. Cannot be instantiated directly or via `super()`. |
| 2. Multiple Inheritance | ❌ Single inheritance only. A class can `extends` only one abstract class. | ✅ Multiple inheritance supported. A class can `implements` multiple interfaces. |
| 3. Implemented Methods | ✅ Regular concrete methods. These methods can read and modify instance variables (state). | ✅ `default` methods. These methods cannot hold or modify instance state. |

### Deep Dive & ELI5 Explanations

#### 1. Constructors (The "Why")
* **Abstract Classes:** Because an abstract class represents an "IS-A" lineage, it can have instance variables (e.g., an `Employee` abstract class might have a `name` and `baseSalary`). It needs a constructor to initialize those variables when the child object (like `SoftwareEngineer`) is created.
* **Interfaces:** Interfaces are strictly stateless. They can only hold constants (`public static final`). Because there are no instance variables to initialize, an interface literally has no use for a constructor.

#### 2. Multiple Inheritance (The "Why")
* **Abstract Classes:** Java explicitly forbids multiple inheritance of classes to avoid the Diamond Problem. If a class extended two abstract classes that both had a `balance` variable, the JVM wouldn't know which `balance` the child class was referring to.
* **Interfaces:** Because interfaces have no state (no instance variables), the Diamond Problem of state is impossible. If you implement a `Swimmable` interface and a `Flyable` interface, you are just signing two different behavioral contracts.
* **Note on the Java 8 Exception:** If two interfaces have the exact same default method signature, the compiler will throw an error until you explicitly override that method in your child class to resolve the conflict.

#### 3. Default Methods in Java 8+ (The "Why")
This is the biggest trap for modern Java interviews. Why did Java 8 add default methods to interfaces if we already had abstract classes?

The real reason is backward compatibility. Imagine the creators of Java wanting to add the `.forEach()` method to the massive `List` interface. If they added a standard abstract method, it would instantly break millions of codebases worldwide because every developer's custom `List` class would suddenly be missing an implementation.

By using the `default` keyword, Java could add new behaviors to old interfaces, providing a fallback implementation so existing code wouldn't break.

### The ELI5 Analogy:
* **Abstract Class Concrete Method:** A parent handing down a fully functioning recipe and the kitchen appliances to make it.
* **Interface Default Method:** A governing board updating the safety regulations. They provide a "default" safety manual, but they don't give you any physical tools. You have the behavior, but zero physical state.

### Summary for Interviews

If you are asked to synthesize this in an interview, frame it like this: "Even with Java 8 default methods, I choose an abstract class when I need to share core state, fields, and a constructor across closely related child classes. I choose an interface when I need to define a stateless capability that can be applied across entirely unrelated classes using multiple inheritance."

---

### Crucial Nuance: Default Methods Cannot Override `Object` Methods

A major interview trap is asking if you can define a `default` method in an interface for `equals`, `hashCode`, or `toString`. The answer is no! Interfaces are not allowed to provide default implementations for methods belonging to `java.lang.Object`. The design rationale is that any class implementing the interface will already inherit these methods from `Object`, and class inheritance always wins over interface defaults.
