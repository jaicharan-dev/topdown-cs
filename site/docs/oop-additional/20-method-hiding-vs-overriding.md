---
id: 20-method-hiding-vs-overriding
title: "Method Hiding vs. Method Overriding: Static vs. Instance Resolution"
description: "Learn why static methods are hidden rather than overridden, how bytecode disassembly confirms this, and the illegal collision rules."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact mechanical difference between method overriding and method hiding? Why can't a static method be overridden, what does the JVM bytecode reveal, and what happens if a child class tries to redefine an instance method as static?"

### The Quick Answer

Method overriding applies to instance methods and provides runtime polymorphism via dynamic dispatch (`invokevirtual`), resolving the call based on the actual object on the heap using the Virtual Method Table (v-table). Method hiding applies to static methods and provides compile-time binding (`invokestatic`), resolving the call strictly based on the declared reference type. Attempting to override a static method with an instance method, or hide an instance method with a static method, causes an immediate compile-time error.

---

### The ELI5 Analogy

* **Method Overriding (The Local Branch Policy):** Corporate headquarters (`Parent`) defines a default return-and-refund policy. When you visit the regional Tokyo branch (`Child`), that specific branch has overridden the policy with its own customized regional process. Because you are physically standing inside the Tokyo store (the actual heap object), the Tokyo branch policy executes.
* **Method Hiding (The Highway Billboard):** Corporate headquarters installs a huge advertising billboard along the turnpike (`Parent.staticMethod()`). The local branch erects its own billboard right next to it (`Child.staticMethod()`). The local billboard does not tear down corporate's billboard; it merely stands alongside it. If an observer looks through binoculars calibrated strictly toward corporate headquarters (`Parent ref = new Child()`), they see corporate's billboard, not the branch's.

---

### Conceptual Distinction

Method overriding and method hiding both involve a subclass redefining a method declared in its superclass with the exact same name and parameter list. However, their execution models are polar opposites:

* **Method Overriding (Instance Methods):** Delivers **runtime polymorphism**. The method executed depends on the **actual concrete object** allocated in heap memory, resolved dynamically via the Virtual Method Table (v-table).
* **Method Hiding (Static Methods):** Delivers **compile-time binding**. The method executed depends entirely on the **declared reference variable type**. The subclass method merely *shadows* or *hides* the superclass method; it does not replace it in the class hierarchy.

---

### Comparison: Overriding vs. Hiding

| Feature | Method Overriding | Method Hiding |
| :--- | :--- | :--- |
| **Applicable Methods** | **Instance methods** (non-static, non-private, non-final). | **Static methods** (`public` or `protected`). |
| **Binding Time** | **Runtime** (Dynamic Dispatch via V-Table). | **Compile-time** (Static Binding). |
| **Resolution Target** | Actual heap object instance. | Declared reference variable type. |
| **Bytecode Instruction** | `invokevirtual` / `invokeinterface`. | `invokestatic`. |
| **`@Override` Annotation** | **Valid** (Mandatory best practice). | **Compile Error** (`Method does not override`). |
| **Polymorphism** | True runtime polymorphism. | No polymorphism (pure shadowing). |

---

### Under the Hood: Bytecode Disassembly Proof

To see why method hiding cannot be polymorphic, examine how `javac` compiles both calls:

```java
Parent ref = new Child();
ref.staticMethod();   // Calls Parent.staticMethod()
ref.instanceMethod(); // Calls Child.instanceMethod()
```

When inspected with `javap -c`, the generated JVM bytecode reveals the truth:

```bytecode
// 1. Static Method Invocation:
invokestatic  #4 // Method Parent.staticMethod:()V

// 2. Instance Method Invocation:
aload_1          // Pushes 'ref' (Child object) onto the operand stack
invokevirtual #5 // Method Parent.instanceMethod:()V
```

#### The Architectural Insight:
* In `invokestatic`, the reference variable `ref` is **completely discarded by the compiler**! The compiler substitutes the class literal `Parent.staticMethod()` directly into the constant pool. Invoking a static method on an instance variable is merely syntactic sugar that generates an IDE compiler warning.
* In `invokevirtual`, the compiler pushes the object reference `ref` onto the stack so the JVM can inspect its runtime class header and v-table.

---

### The 3 Illegal Collision Rules

Interviewers frequently probe edge cases where developers attempt to mix static and instance declarations:

1. **Attempting to Override Static with Instance (Illegal):**
   ```java
   class Parent { static void run() {} }
   class Child extends Parent { void run() {} } // COMPILE ERROR
   ```
   *Compiler Error:* `"This instance method cannot override the static method from Parent."`
2. **Attempting to Hide Instance with Static (Illegal):**
   ```java
   class Parent { void run() {} }
   class Child extends Parent { static void run() {} } // COMPILE ERROR
   ```
   *Compiler Error:* `"This static method cannot hide the instance method from Parent."`
3. **Contract Inheritance for Hidden Methods:**
   Even though static methods are hidden, the subclass static method **must still obey visibility and exception contracts**:
   * Cannot assign weaker access privileges (e.g., parent static method is `public`, child cannot declare it `protected` or `private`).
   * Cannot declare broader checked exceptions than the parent static method.

---

### Variable Hiding (Shadowing)

Just like static methods, **instance fields and static fields in Java are never overridden**:

```java
class Super { int score = 100; }
class Sub extends Super { int score = 200; }

Super ref = new Sub();
System.out.println(ref.score); // Outputs 100!
```

Every subclass instance physically allocates space for **both** `Super.score` and `Sub.score` in heap memory. Because field lookup is statically resolved, `ref.score` accesses `Super.score`. To access `Sub.score`, the reference must be explicitly cast to `Sub`.

---

### The Interview Answer (60-90 seconds)

> "The core mechanical difference between method overriding and method hiding lies in how the JVM resolves the call.
>
> Method overriding applies to non-static instance methods. It is resolved dynamically at runtime using the `invokevirtual` bytecode instruction, which looks up the actual object's Virtual Method Table on the heap. This enables true runtime polymorphism.
>
> Method hiding applies to static methods. Because static methods belong to the class blueprint rather than an instance, they are resolved at compile time via `invokestatic`. When you call a static method through an object reference, the compiler strips the reference entirely and binds the call to the declared reference type.
>
> Furthermore, the Java compiler strictly forbids mixing the two: you cannot override a static method with an instance method, nor can you hide an instance method with a static method. Finally, instance variables behave exactly like static methods: they cannot be overridden, only hidden."

---

### Code Demonstration: Method Hiding vs. Overriding in Action

The following Java application demonstrates how static method hiding, instance method overriding, and variable shadowing behave under polymorphic references.

```java
public class HidingVsOverridingDemo {

    static class Vehicle {
        public String type = "Generic Vehicle";

        // Static Method: Subject to Hiding
        public static void announceClass() {
            System.out.println("[Static] Vehicle: I belong to the Vehicle class.");
        }

        // Instance Method: Subject to Overriding
        public void startEngine() {
            System.out.println("[Instance] Vehicle: Generic engine started.");
        }
    }

    static class SportsCar extends Vehicle {
        public String type = "Sports Car"; // Field Hiding

        // Hiding the Parent's Static Method
        public static void announceClass() {
            System.out.println("[Static] SportsCar: I belong to the SportsCar class.");
        }

        // Overriding the Parent's Instance Method
        @Override
        public void startEngine() {
            System.out.println("[Instance] SportsCar: Twin-turbo V8 roaring to life!");
        }
    }

    public static void main(String[] args) {
        // Polymorphic reference: Reference = Vehicle, Object = SportsCar
        Vehicle carRef = new SportsCar();

        System.out.println("--- 1. Variable Access (Field Hiding) ---");
        // Output: "Generic Vehicle" (Statically bound to declared type 'Vehicle')
        System.out.println("carRef.type: " + carRef.type);

        System.out.println("\n--- 2. Static Method Call (Method Hiding) ---");
        // Output: "[Static] Vehicle..." (Statically bound to 'Vehicle', ignores object)
        carRef.announceClass();

        System.out.println("\n--- 3. Direct Static Call (Best Practice) ---");
        // Static methods should always be called directly on the class
        Vehicle.announceClass();
        SportsCar.announceClass();

        System.out.println("\n--- 4. Instance Method Call (Method Overriding) ---");
        // Output: "[Instance] SportsCar..." (Dynamically dispatched via V-Table)
        carRef.startEngine();
    }
}
```
