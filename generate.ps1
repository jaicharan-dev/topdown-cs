$dir = 'D:\csf website\site\docs\oop'
New-Item -ItemType Directory -Force -Path $dir

$c16 = @'
---
id: 16-generics-and-type-erasure
title: Generics and type erasure
sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** Why do generics exist in Java? What problem did they solve, and what is type erasure?

### The Interview Quick-Hit

"Generics were introduced to provide compile-time type safety and eliminate the need for manual downcasting. They solved the massive problem of runtime `ClassCastException`s when dealing with collections. Type Erasure is the compiler trick Java uses to implement generics; it enforces the generic rules during compilation, but then completely erases the type parameters in the final bytecode to maintain backward compatibility with older versions of Java."

### Part 1: The Problem Generics Solved (The Mystery Box Returns)

To perfectly understand generics, we have to look back at the Downcasting problem we discussed earlier.

Before Java 5 (early 2000s), Collections like `ArrayList` were completely "raw". They only accepted the root `Object` class. This meant every list was a completely unlabelled mystery box.

```java
// THE OLD WAY (Before Generics)
ArrayList myPets = new ArrayList(); 

// 1. You can put anything in it! (Because a Dog is an Object, a String is an Object)
myPets.add(new Dog());
myPets.add("This is just text"); // The compiler allows this!

// 2. Pulling things out requires risky Downcasting
Dog firstPet = (Dog) myPets.get(0); // Okay, this works.

// 3. THE CRASH
// The compiler thinks this is fine. At runtime, the program tries to 
// turn a String into a Dog, and throws a fatal ClassCastException.
Dog secondPet = (Dog) myPets.get(1); 
```

#### The Solution: Generics (`<T>`)

Generics allowed us to finally put a strict label on the box. By adding `<Dog>`, we turn the compiler into a strict bouncer.

```java
// THE MODERN WAY (With Generics)
ArrayList<Dog> myPets = new ArrayList<>();

myPets.add(new Dog());
// myPets.add("Text"); // COMPILER ERROR! Bouncer stops it immediately.

// No more downcasting required! The compiler guarantees it's a Dog.
Dog firstPet = myPets.get(0); 
```

**The Two Massive Wins:**
1. Bugs are caught immediately as you type (Compile-time), rather than crashing the server later (Runtime).
2. You never have to write an explicit downcast like `(Dog)` when getting data out of a list.

### Part 2: Type Erasure (The JVM's Secret)

If you understand Type Erasure, you sound like a senior engineer.

When the creators of Java introduced Generics in 2004, there were already millions of enterprise servers running old, non-generic Java code. If they changed how the JVM fundamentally worked in memory, it would break the global internet.

They needed a way to add Generics without changing the JVM at all.

**The Solution: Type Erasure.**

**The ELI5 Analogy:** Imagine you are at an exclusive club. There is a bouncer at the front door checking IDs. If your ticket says `<VIP>`, he lets you in. If it says `<Standard>`, he rejects you. However, once you walk through the door and get inside the club, the bouncer takes your ticket and throws it in the trash. Inside the club, everyone just looks like a generic person.

**How it works in Java:**
*   **Compile Time (The Front Door):** The Java compiler acts as the bouncer. It looks at `ArrayList<Dog>` and strictly enforces that only `Dog`s go in.
*   **Type Erasure (Throwing away the ticket):** Once the compiler is satisfied that your code is safe, it literally erases the `<Dog>` part and translates the code back into the old "raw" `ArrayList` of Objects before saving it as bytecode.
*   **Runtime (Inside the Club):** When the program actually runs on the JVM, Generics do not exist. The JVM has no idea what an `ArrayList<Dog>` is; it only sees an `ArrayList<Object>`.

Because of Type Erasure, at runtime, an `ArrayList<String>` and an `ArrayList<Integer>` are the exact same class in memory.
'@
Set-Content -Path "$dir\16-generics-and-type-erasure.md" -Value $c16 -Encoding UTF8

$c17 = @'
---
id: 17-static-nested-class-vs-inner-class
title: Static nested class vs (non-static) inner class
sidebar_position: 17
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the difference between a static nested class and a (non-static) inner class in Java? Why would you use one over the other?

### The Interview Quick-Hit

"A non-static Inner Class is inherently tied to a specific instance of its Outer Class; it holds a hidden memory reference to the parent and can directly access its private variables. A Static Nested Class is completely independent; it is simply packaged inside the Outer Class for namespace organization. You use a Static Nested Class by default for memory efficiency, and only use an Inner Class when the child absolutely requires access to the parent's internal state."

### The ELI5 Analogy

1.  **Non-Static Inner Class (The Attached Room):** Think of a House and its Living Room. The living room cannot exist floating in a void&mdash;it must physically belong to a specific house. Because it is attached, anyone standing in the living room has direct access to the house's thermostat or electrical panel (the outer class's private variables).
2.  **Static Nested Class (The Toolbox in the Garage):** Think of a Toolbox stored inside the house's garage. The toolbox is kept there for organizational convenience (namespace packaging), but it is a completely independent object. You can pick it up, carry it outside, and use it entirely on its own. It has absolutely no magical connection to the house's thermostat.

### The Code Proof (How you instantiate them)

Because the Inner class needs a specific parent, you are forced to build the parent first. The Static Nested class requires no such thing.

```java
class Outer {
    private String secretPassword = "123";

    // 1. NON-STATIC INNER CLASS
    class Inner {
        void printSecret() {
            // Has direct access to the parent's private variables!
            System.out.println(secretPassword); 
        }
    }

    // 2. STATIC NESTED CLASS
    static class StaticNested {
        void printSecret() {
            // System.out.println(secretPassword); // COMPILER ERROR! 
            // It has no idea which 'Outer' object to look at.
        }
    }
}

public class Main {
    public static void main(String[] args) {
        
        // --- Instantiating the Inner Class ---
        // Step 1: You MUST build the House first
        Outer myOuter = new Outer(); 
        
        // Step 2: Use the specific House object to build the Room
        // Notice the bizarre syntax: objectName.new ChildClass()
        Outer.Inner myInner = myOuter.new Inner(); 
        
        
        // --- Instantiating the Static Nested Class ---
        // Clean, direct, and independent. No 'Outer' object required.
        Outer.StaticNested myStatic = new Outer.StaticNested(); 
    }
}
```

### The Production Reality (The Hidden Trap)

In backend engineering interviews, this question is usually a trap to see if you understand **Memory Leaks**.

Because a non-static Inner Class holds a hidden reference to its parent (`OuterClass.this`), it acts like an anchor. If you create an Inner object and pass it to a completely different part of your application, the Garbage Collector is strictly forbidden from destroying the Outer object, because the Inner object is secretly keeping it alive. If you do this in a loop, you can crash a live server.

**The Golden Rule:** Always make your nested classes `static` by default.

The most famous example of this in industry is the **Builder Pattern** (e.g., `User.Builder()`). The Builder is always a static nested class because it needs to exist independently before the actual User is built.
'@
Set-Content -Path "$dir\17-static-nested-class-vs-inner-class.md" -Value $c17 -Encoding UTF8

$c26 = @'
---
id: 26-object-creation-ways
title: How many ways can you create an object in Java?
sidebar_position: 26
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** How many ways can you create an object in Java? Walk me through each.

### The Interview Quick-Hit

"There are exactly four ways the JVM natively creates an object in memory: using the `new` keyword, using the Reflection API (`newInstance`), using the `clone()` method, and through Deserialization. As a bonus, modern backend development relies heavily on Factory Methods or Builder patterns to wrap these native mechanisms for safer, cleaner architecture."

### The Deep Dive: The 4 Native Mechanisms

The ultimate trap interviewers set with this question is asking: "Which of these methods actually trigger the constructor?"

#### 1. The `new` Keyword (The Standard)
*   **What it does:** The standard way to allocate Heap memory and build an object from scratch.
*   **Triggers Constructor?** Yes. It is the primary trigger for a constructor.
```java
User myUser = new User("Alice");
```

#### 2. The Reflection API (The Framework Magic)
*   **What it does:** Reflection allows Java code to inspect and manipulate itself at runtime. You can pass a string of the class name, and Java will find it and build it dynamically.
*   **Why we care:** This is exactly how frameworks like Spring Boot or Hibernate work. When you send an HTTP request to a Spring server, Spring uses Reflection to automatically build your Controller objects without you ever typing `new`.
*   **Triggers Constructor?** Yes.
```java
// We build a User object using only a String of its name!
Constructor<User> constructor = User.class.getDeclaredConstructor();
User myUser = constructor.newInstance(); 
```

#### 3. The `clone()` Method (The Duplicator)
*   **What it does:** We discussed this with the `Cloneable` marker interface. It takes an existing object in memory and copies its bit-pattern to a new location on the Heap.
*   **Triggers Constructor?** No. This is a major interview gotcha. Cloning bypasses the constructor entirely because it isn't building a house from a blueprint; it is just 3D-printing an exact replica of an existing house.
```java
User originalUser = new User("Alice");
// Creates a second object in memory without calling User()
User clonedUser = (User) originalUser.clone(); 
```

#### 4. Deserialization (The Network Reassembly)
*   **What it does:** We discussed this with the `Serializable` interface. When you send an object over a network (like a server sending session data to a database), it is broken down into a stream of raw bytes. Deserialization is the act of reassembling those bytes back into a live Java object on the receiving end.
*   **Triggers Constructor?** No. Just like cloning, the JVM reassembles the object's state directly from the byte stream without firing the constructor logic.
```java
ObjectInputStream in = new ObjectInputStream(new FileInputStream("data.txt"));
// Rebuilding the object from raw bytes
User restoredUser = (User) in.readObject(); 
```

### The Architectural Bonus: Factory Methods

If you want to end the answer by sounding like a seasoned developer, pivot to how we actually write code in production.

"While the JVM natively uses those four methods, in production backend systems, we actively try to hide the `new` keyword. Instead, we use Factory Methods to create objects."

As discussed in the private constructor topic, instead of letting a developer blindly type `new User()`, you force them to use descriptive static methods:
```java
// The 'new' keyword is hidden safely inside these methods
User admin = User.createAdmin();
User guest = User.createGuest();
```

This abstracts away the complexity of object creation and makes the codebase highly readable.
'@
Set-Content -Path "$dir\26-object-creation-ways.md" -Value $c26 -Encoding UTF8

$c27 = @'
---
id: 27-reflection-concept-use-case-risk
title: Reflection - concept, use case, risk
sidebar_position: 27
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** What is Reflection in Java, at a conceptual level? Give one practical use case, and one reason it's considered risky.

### The Interview Quick-Hit

"Reflection is an API that allows a Java program to inspect and manipulate its own internal structure&mdash;classes, methods, and fields&mdash;at runtime. Its primary use case is powering modern frameworks like Spring or JUnit, which need to dynamically instantiate objects or read annotations without knowing the class details at compile time. It is considered risky because it completely bypasses standard Object-Oriented access controls, allowing developers to forcefully modify private variables, which breaks encapsulation and degrades performance."

### The ELI5 Analogy: The X-Ray Master Key

Imagine you build a highly secure Bank Vault (a Java Class). You design it perfectly using Object-Oriented principles: the vault door is public, but the safe inside is marked `private`. The compiler acts as the security guard. If anyone tries to touch the private safe directly, the compiler stops them.

Reflection is a master key and an X-ray machine combined. It allows code to run, walk right past the compiler's security guard, X-ray the vault to see exactly what is inside, and use the master key to unlock and change the private safe anyway.

### The Practical Use Case: Framework Magic

As a fresher, you will almost never write custom Reflection code yourself, but you will use it every single day without realizing it.

*   **Example: JUnit Testing:** When you write tests for your backend, you just put `@Test` above a method, click "Run," and magically only those specific methods execute. How does the system know?
    The JUnit framework uses Reflection. At runtime, it scans your compiled `.class` file, asks the JVM, "Give me a list of all the methods in this class," looks for the ones tagged with `@Test`, and dynamically invokes them.
*   **Example: Spring Boot Dependency Injection:** If you have ever seen a Spring backend, developers use `@Autowired` to magically link a Database Repository to a Service class without ever writing `new Repository()`. Spring uses Reflection to find that private field and forcefully inject the database connection into it at runtime.

### The Risk: Why Architects Hate Overusing It

If you are asked this in an interview, hitting these two points proves you have a mature engineering mindset:

#### 1. It Destroys Encapsulation
We spent hours studying how `private` fields and getter/setter methods protect our data from being corrupted. Reflection throws all of that out the window.
```java
class Wallet {
    // Highly secure! No setter provided.
    private int balance = 100; 
}

// THE REFLECTION HACK:
Wallet myWallet = new Wallet();
Field secretBalance = Wallet.class.getDeclaredField("balance");

// We forcefully disable the Java security check
secretBalance.setAccessible(true); 

// We just altered a private variable from the outside!
secretBalance.set(myWallet, 999999); 
```
If a rogue script or a junior developer uses Reflection to change a private database connection state, the application will behave unpredictably, and the bug will be incredibly hard to trace.

#### 2. The Performance Penalty
Normally, the Java compiler heavily optimizes your code before it runs. Because Reflection resolves everything dynamically at runtime (the JVM has to pause, inspect memory, check permissions, and invoke the method), it is significantly slower than calling a method directly.

### The Interview Takeaway
You can summarize your stance on Reflection like this: "Reflection is an incredibly powerful tool for framework developers who need to build dynamic, generalized tools, but it should be strictly avoided in standard business logic because it sacrifices compile-time safety, performance, and encapsulation."
'@
Set-Content -Path "$dir\27-reflection-concept-use-case-risk.md" -Value $c27 -Encoding UTF8

$c36 = @'
---
id: 36-enums-as-classes-singleton
title: Enums as classes, enum constructors/fields/methods, enum Singleton idiom
sidebar_position: 36
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** In Java, an enum is actually a special kind of class, not just a list of constants. What does that mean practically &mdash; can an enum have constructors, fields, and methods? And what is the "enum Singleton" idiom you mentioned earlier as a fix for thread safety?

### The Interview Quick-Hit

"Unlike other languages where enums are just labels for integers, a Java enum is a fully functional class that pre-instantiates a strict, fixed set of objects. It can have private fields, custom methods, and constructors. The 'Enum Singleton' is the industry-standard way to create a Singleton pattern because the JVM internally guarantees that an enum value is instantiated exactly once, natively preventing multithreading bugs and reflection attacks."

### Part 1: Enums as Rich Objects (The Money Tracker Example)

In a typical backend system, you don't just want a label; you want data attached to that label.

Imagine you are logging a payment. You need a `TransactionStatus`. If an enum were just a label, you would have to write messy if/else blocks everywhere to figure out the HTTP status code or user message for a "FAILED" transaction.

Because Java enums are classes, you can bake that data directly into the enum itself. The JVM calls the private constructor for you exactly once when the program starts.

```java
public enum TransactionStatus {
    // 1. These are actually pre-built objects!
    SUCCESS(200, "Payment cleared successfully"),
    FAILED(400, "Insufficient funds"),
    PENDING(202, "Awaiting bank confirmation");

    // 2. Enums can have fields
    private final int statusCode;
    private final String description;

    // 3. Enums can have constructors (Implicitly private)
    TransactionStatus(int statusCode, String description) {
        this.statusCode = statusCode;
        this.description = description;
    }

    // 4. Enums can have methods
    public int getStatusCode() { 
        return this.statusCode; 
    }
}

// Execution in your backend route:
// System.out.println(TransactionStatus.FAILED.getStatusCode()); // Prints 400
```

### Part 2: The Enum Singleton (The Ultimate Fix)

Earlier, we looked at a traditional Singleton for a Database Connection using a private constructor and a `getInstance()` method.

Here is the dirty secret of traditional Singletons: they are fragile.
*   If two threads call `getInstance()` at the exact same millisecond, they can accidentally create two separate database connections (breaking the pattern).
*   A malicious user can use Java's "Reflection" API to hack into the private constructor and force it to build a second instance anyway.

**The Fix:** Joshua Bloch (author of *Effective Java*) introduced the Enum Singleton. You just declare your Singleton as an enum with a single value.

```java
public enum DatabaseConnection {
    // This is the ONE and ONLY instance. 
    INSTANCE; 

    // You can add your normal class variables here
    private String connectionUrl = "jdbc:postgresql://localhost:5432/wallet";

    // You can add normal methods here
    public void executeQuery(String sql) {
        System.out.println("Executing: " + sql);
    }
}

// Client code simply calls:
// DatabaseConnection.INSTANCE.executeQuery("SELECT * FROM users");
```

**Why is this the gold standard for production code?**
*   **Thread-Safe by Default:** The JVM strictly locks enum initialization. It is mathematically impossible for two threads to create a duplicate `INSTANCE`.
*   **Reflection-Proof:** The Java source code physically prevents the Reflection API from instantiating an enum.
*   **Serialization-Safe:** If you send this object across a network, Java guarantees it won't accidentally spawn a duplicate object when reassembled.
'@
Set-Content -Path "$dir\36-enums-as-classes-singleton.md" -Value $c36 -Encoding UTF8

$c37 = @'
---
id: 37-code-trace-static-instance-constructor
title: Code trace: static block vs instance block vs constructor execution order
sidebar_position: 37
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** `class Demo { static { System.out.println("Static block"); } { System.out.println("Instance block"); } Demo() { System.out.println("Constructor"); } public static void main(String[] args) { System.out.println("Main starts"); new Demo(); new Demo(); } }` What is the exact output, in order? Explain why static blocks and instance blocks run when they do.

### The Interview Quick-Hit

"The exact order of execution is determined by the JVM's lifecycle: class loading happens first (triggering static blocks exactly once), followed by the main method. Then, every time a new object is instantiated, the instance block runs immediately before the constructor."

### Execution Trace & Output

```text
Static block
Main starts
Instance block
Constructor
Instance block
Constructor
```

**Step-by-step breakdown:**

1.  **The Static Block (The One-Time Setup):** When the `Demo` class is loaded into the JVM's memory, before any objects are created and even before the `main` method starts executing, the static block runs exactly once.
2.  **The main Method:** After the class is loaded and static blocks are finished, the JVM looks for the `main` method to begin the actual program execution, printing `"Main starts"`.
3.  **The Instance Block (The Pre-Constructor):** The `new Demo()` call triggers object creation. The instance block runs every single time you use the `new` keyword, executing immediately before the constructor.
4.  **The Constructor (The Final Polish):** After the instance block sets up the baseline, the specific constructor you called executes to finish building that exact object.
5.  **Repeat:** Because your code calls `new Demo();` twice, the Instance Block -> Constructor sequence repeats twice. The Static Block ignores the second object creation because the class was already loaded.

**The "Why":**
*   **Static block:** It is used for one-time, class-level initialization. In a backend system, you might use a static block to load a JDBC driver just once when the server starts.
*   **Instance block:** Imagine you have a class with three different overloaded constructors. Instead of copy-pasting the exact same setup code into all three, you put it in an instance block. The Java compiler automatically copies it into the very beginning of every constructor, keeping your code clean and DRY.
'@
Set-Content -Path "$dir\37-code-trace-static-instance-constructor.md" -Value $c37 -Encoding UTF8

$c38 = @'
---
id: 38-code-trace-this-super-chaining
title: Code trace: `this()` and `super()` chaining together
sidebar_position: 38
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** `class Vehicle { Vehicle() { System.out.println("Vehicle no-arg"); } Vehicle(String type) { System.out.println("Vehicle: " + type); } } class Car extends Vehicle { Car() { this("Sedan"); System.out.println("Car no-arg"); } Car(String model) { super("Car - " + model); System.out.println("Car: " + model); } public static void main(String[] args) { new Car(); } }` What is the exact output, in order? Trace how `this()` and `super()` interact here &mdash; which one actually reaches the parent class, and why doesn't `Car()` call `super()` directly itself?

### The Interview Quick-Hit

"The output prints the parent's parameterized constructor first, then the child's parameterized constructor, and finally the child's no-arg constructor. Java enforces a strict rule: a constructor's very first line must be either `this()` OR `super()`, never both. When the `Car()` no-arg constructor uses `this()` to delegate to its sibling, it intentionally hands off the responsibility of calling `super()` to that sibling to prevent the parent object from being built twice."

### Execution Trace & Output

```text
Vehicle: Car - Sedan
Car: Sedan
Car no-arg
```

**Step-by-step breakdown:**

1.  **The Trigger:** `new Car();` calls the child's no-arg constructor `Car()`.
2.  **The Hand-off (`this`):** The very first line is `this("Sedan");`. This pauses the current constructor and immediately jumps to the sibling constructor: `Car(String model)`.
3.  **Reaching the Parent (`super`):** Inside `Car(String model)`, the first line is `super("Car - Sedan");`. This pauses the child completely and jumps up to the parent's parameterized constructor: `Vehicle(String type)`.
4.  **The Execution (Top-Down):** The `Vehicle` constructor finishes its setup and prints: `"Vehicle: Car - Sedan"`.
5.  Control returns to where it left off in `Car(String model)`, which prints: `"Car: Sedan"`.
6.  Control finally returns to the original `Car()` constructor, which prints: `"Car no-arg"`.

**The Core Concept: Why doesn't `Car()` call `super()` directly?**

If an interviewer asks you to explain the underlying mechanics, it comes down to memory safety and preventing double-initialization.

Every object in Java must have its parent's foundation poured before it can build its own walls. If you don't explicitly write `super()`, the Java compiler silently inserts an invisible `super();` (no-arg) on line 1 for you.

However, if you explicitly write `this()`, the compiler deletes that invisible `super()`.

Why? Because if `Car()` called `super()` to build the parent, and then called `this()` to jump to the sibling, the sibling also has a `super()` call. The JVM would attempt to build the `Vehicle` foundation twice for a single car, completely corrupting the object in memory.

By enforcing the rule that you can only choose one, Java ensures that the parent constructor is only ever triggered exactly once per object creation.
'@
Set-Content -Path "$dir\38-code-trace-this-super-chaining.md" -Value $c38 -Encoding UTF8

$c43 = @'
---
id: 43-code-trace-autoboxing-overload-resolution
title: Code trace: autoboxing and overload resolution priority
sidebar_position: 43
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** `class Calc { void process(int x) { System.out.println("int version: " + x); } void process(Integer x) { System.out.println("Integer version: " + x); } void process(long x) { System.out.println("long version: " + x); } public static void main(String[] args) { Calc c = new Calc(); c.process(5); } }` Which overload gets called, and why? What does this tell you about the compiler's priority order when resolving overloaded methods?

### The Interview Quick-Hit

"The code will print `int version: 5`. The compiler always prioritizes an 'exact primitive match' first. This question tests your knowledge of Java's strict method resolution hierarchy, which dictates that the compiler prefers widening a primitive over autoboxing it into a wrapper class."

### Execution Trace & Output

```text
int version: 5
```

**Step-by-step breakdown:**

1.  **Exact Match (The first choice):** Because the literal `5` is a primitive `int` by default in Java, the compiler sees `process(int x)` and immediately recognizes it as a 100% perfect match.

**The Interview Trap: The Priority Order**

Interviewers rarely stop at the exact match. As soon as you answer correctly, they will verbally erase the `process(int)` method from the whiteboard and ask: "Okay, what if I delete the `int` method? Now it only has `process(Integer)` and `process(long)`. Which one does it call?"

Most students guess `process(Integer)` because they think, "5 is an integer, so it should become an `Integer` object."

They are wrong. The code will print `long version: 5`.

Here is the exact priority order the Java compiler uses to resolve overloaded methods. You should memorize this hierarchy:

1.  **Exact Match (The first choice):** The compiler looks for the exact primitive type. (e.g., `int` to `int`).
2.  **Widening (The fallback):** If the exact primitive isn't found, the compiler looks for a larger primitive that can safely hold the value without losing data. It implicitly widens the `int` (32 bits) into a `long` (64 bits). Why? Because widening is a highly efficient, CPU-level native operation that has existed since Java 1.0.
3.  **Autoboxing (The expensive operation):** If no suitable primitive methods exist at all, the compiler falls back to Autoboxing. It takes the primitive `int`, pauses to allocate memory on the Heap, and creates a brand new `Integer` object. Why is this lower priority? Because allocating memory for an object is significantly slower and more resource-intensive than just padding a primitive with extra zeros (widening).
4.  **Varargs (The last resort):** If none of the above exist, it will look for a variable argument method like `process(int... x)`. This is the absolute lowest priority because it requires the JVM to instantiate a brand new array under the hood just to hold your single value.

**The Backend / Production Reality**
Understanding this hierarchy is critical for writing high-performance backend code. If you accidentally write your methods in a way that forces Java to Autobox thousands of integers into `Integer` objects inside a `while` loop, you will flood the Heap memory and trigger a massive Garbage Collection pause, degrading your server's performance.
'@
Set-Content -Path "$dir\43-code-trace-autoboxing-overload-resolution.md" -Value $c43 -Encoding UTF8

$c44 = @'
---
id: 44-code-trace-rectangle-square-lsp
title: Code trace: Rectangle/Square LSP violation
sidebar_position: 44
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** `class Rectangle { protected int width; protected int height; void setWidth(int width) { this.width = width; } void setHeight(int height) { this.height = height; } int getArea() { return width * height; } } class Square extends Rectangle { @Override void setWidth(int width) { this.width = width; this.height = width; } @Override void setHeight(int height) { this.width = height; this.height = height; } } void resizeRectangle(Rectangle r) { r.setWidth(5); r.setHeight(10); System.out.println(r.getArea()); } resizeRectangle(new Rectangle()); resizeRectangle(new Square());` What does each call print? And explain exactly why this is a real Liskov Substitution Principle violation &mdash; not just "Square is weird," but why Square genuinely fails to substitute for Rectangle here, given that resizeRectangle() has no idea which one it received.

### The Interview Quick-Hit

"The first call prints 50, and the second call prints 100. This is the classic Liskov Substitution Principle violation because Square breaks the fundamental behavioral contract of Rectangle. The client method `resizeRectangle` assumes that width and height are completely independent variables. When Square silently mutates the width during a `setHeight` call, it breaks the client's expectations, proving that Square cannot safely substitute for Rectangle."

### Execution Trace & Output

```text
50
100
```

**Step-by-step breakdown:**

1.  **`resizeRectangle(new Rectangle());`:**
    *   Sets width to 5. Sets height to 10.
    *   Area is 5 * 10.
    *   Prints: `50`
2.  **`resizeRectangle(new Square());`:**
    *   `setWidth(5)` sets both width and height to 5.
    *   `setHeight(10)` triggers the Square's overridden method, setting both width and height to 10.
    *   Area is 10 * 10.
    *   Prints: `100`

### The Core Problem: The Client's Perspective

To truly explain why this is an LSP violation, you have to look at it exclusively through the eyes of the `resizeRectangle(Rectangle r)` method.

This method does not know what a `Square` is. It only knows the contract provided by the `Rectangle` class.

The implicit contract of a `Rectangle` is: "If you change my height, my width remains exactly what it was."

The client code writes its business logic banking on that promise:
1. I set the width to 5. (Width is now 5).
2. I set the height to 10. (Height is now 10, Width is still 5).
3. I expect an area of 50.

When we pass a `Square` into this method, the `Square` secretly rewrites the width back to 10 during step 2. The method gets an area of 100 and panics. The program fails, not because the code won't compile, but because the business logic is completely corrupted.

### The Senior-Level Pivot: The "Is-A" Fallacy

If you get this whiteboard question, this is the exact phrase you use to close out your answer and show you understand architecture:

"This problem highlights the biggest trap in Object-Oriented Design: confusing real-world taxonomy with software behavior. 

In mathematics and geometry, a Square is a Rectangle. But in OOP, inheritance is not about what things *are*; it is strictly about how things *behave*. A square does not behave like a rectangle because its dimensions are locked together. Therefore, having `Square extends Rectangle` is architecturally incorrect."

**How to Fix It?**
If you are asked how to fix this codebase, the answer is to remove the inheritance entirely. Both `Rectangle` and `Square` should implement a common interface called `Shape` with a `getArea()` method. They manage their own internal state independently, and the client code never assumes it can mutate them using the same rules.
'@
Set-Content -Path "$dir\44-code-trace-rectangle-square-lsp.md" -Value $c44 -Encoding UTF8

$c47 = @'
---
id: 47-builder-pattern-implementation
title: Builder pattern - telescoping constructor problem, implementation
sidebar_position: 47
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the Builder pattern? Why would you use it over a constructor with many parameters (the "telescoping constructor" problem)? Show me a Python implementation &mdash; use a scenario involving building an immutable User object with several optional fields (name required, email/phone/address optional).

### The Interview Quick-Hit

"The Builder pattern is a creational design pattern used to construct complex objects step-by-step. It solves the 'telescoping constructor' problem&mdash;where you are forced to write dozens of overloaded constructors for optional parameters. More importantly, it is the perfect mechanism for creating completely Immutable objects that require complex, multi-step configuration before instantiation."

```mermaid
classDiagram
    class User {
        -String name
        -String email
        -String phone
        -String address
        +__init__(builder: UserBuilder)
        +name() String
        +email() String
        +phone() String
        +address() String
    }
    class UserBuilder {
        +String name
        +String email
        +String phone
        +String address
        +__init__(name: String)
        +set_email(email: String) UserBuilder
        +set_phone(phone: String) UserBuilder
        +set_address(address: String) UserBuilder
        +build() User
    }
    UserBuilder ..> User : creates
```

### The "Why": Immutability & The Scaffolding

If an interviewer asks, "Why not just use a no-argument constructor and a bunch of setter methods to configure the object?"

This is where you bridge design patterns with backend thread-safety. An immutable object (like a User or Transaction) has no setters. It must be created fully formed and valid in a single step. You cannot build it piece-by-piece.

The Builder pattern solves this by acting as mutable scaffolding. You do all your conditional logic, multi-step piecing together, and validation on the mutable Builder object. Once the configuration is perfect, you call `build()`. The scaffolding is thrown away, and you are left with a thread-safe, permanently immutable final object.

### The ELI5 Analogy: Ordering at Subway

Imagine walking into a Subway sandwich shop. You do not hand the employee a piece of paper with 15 fields filled out with "Yes, No, Null, Null, Yes" for every possible ingredient.

Instead, you use a Builder. You start with the required foundation: "I want a 6-inch sub." Then, you chain optional steps together: "Add lettuce." -> "Add tomatoes." -> "Skip the mayo." Finally, you call the termination method: "Toast it and wrap it up!" The final product is assembled cleanly based only on the steps you invoked.

### The Python Implementation (Fluent API Style)

Here is how you build an immutable User object using method chaining, with all properties correctly mapped.

```python
class User:
    # 1. The constructor takes the Builder object as its only parameter
    def __init__(self, builder):
        self._name = builder.name
        self._email = builder.email
        self._phone = builder.phone
        self._address = builder.address

    # 2. Getters only (No setters) makes the resulting object completely Immutable
    @property
    def name(self): return self._name
    
    @property
    def email(self): return self._email
    
    @property
    def phone(self): return self._phone
    
    @property
    def address(self): return self._address

    def __str__(self):
        return f"User(name={self.name}, email={self.email}, phone={self.phone})"


class UserBuilder:
    # 1. Required fields go in the Builder's constructor
    def __init__(self, name):
        self.name = name
        self.email = None
        self.phone = None
        self.address = None

    # 2. Optional fields get setter methods that return 'self' to allow chaining
    def set_email(self, email):
        self.email = email
        return self

    def set_phone(self, phone):
        self.phone = phone
        return self
        
    def set_address(self, address):
        self.address = address
        return self

    # 3. The build method actually creates the final immutable object
    def build(self):
        return User(self)


# --- Execution ---
# Clean, readable, and handles optional parameters perfectly
admin = (UserBuilder("Alice")
         .set_email("alice@test.com")
         .set_phone("555-0192")
         .build())

print(admin)
```

### The Senior-Level Pivots (Bonus Points)

Drop these at the end of your explanation to show deep architectural maturity:

1.  **Python Native Alternative:** "While building an explicit Builder class is great for complex validation (e.g., verifying the email format before allowing the object to build), Python natively handles the telescoping constructor problem beautifully using Keyword Arguments (`**kwargs`). In Java, however, this pattern is strictly necessary."
2.  **The Gang of Four "Director":** "If we look at the original Gang of Four textbook definition, the Builder pattern originally included a separate Director class. The Director memorized a standard sequence of steps (like `build_admin_user()`) to automate common configurations. In modern backend practice, the Director is largely skipped in favor of the fluent-chaining style you see above, which offers more flexible, readable client code."
'@
Set-Content -Path "$dir\47-builder-pattern-implementation.md" -Value $c47 -Encoding UTF8

$c48 = @'
---
id: 48-decorator-pattern-ocp
title: Decorator pattern - OCP, coffee order implementation
sidebar_position: 48
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the Decorator pattern? How does it let you "add behavior without modifying the class" &mdash; tying back to OCP? Show me a Python implementation &mdash; use a coffee order system (base Coffee, then decorators like Milk, Sugar, WhippedCream that each add cost/description).

### The Interview Quick-Hit

"The Decorator pattern is a structural design pattern that allows you to dynamically attach new behaviors or state to an object at runtime by wrapping it in an object of a similar type. It perfectly embodies the Open/Closed Principle (OCP) because you can infinitely extend an object's behavior using new wrappers without ever modifying the original underlying class code."

```mermaid
classDiagram
    class Coffee {
        <<interface>>
        +get_cost() float
        +get_description() String
    }
    class SimpleCoffee {
        +get_cost() float
        +get_description() String
    }
    class CoffeeDecorator {
        #Coffee _coffee
        +__init__(coffee: Coffee)
        +get_cost() float
        +get_description() String
    }
    class Milk {
        +get_cost() float
        +get_description() String
    }
    class Sugar {
        +get_cost() float
        +get_description() String
    }
    class WhippedCream {
        +get_cost() float
        +get_description() String
    }
    
    Coffee <|.. SimpleCoffee
    Coffee <|.. CoffeeDecorator
    CoffeeDecorator o-- Coffee
    CoffeeDecorator <|-- Milk
    CoffeeDecorator <|-- Sugar
    CoffeeDecorator <|-- WhippedCream
```

### The Problem: Subclass Explosion (Failing OCP)

Imagine building a coffee shop checkout system. You start with a `Coffee` class. Then someone wants Milk. So you create `CoffeeWithMilk extends Coffee`. Then someone wants Sugar. You create `CoffeeWithSugar`. Then someone wants Milk and Sugar. You create `CoffeeWithMilkAndSugar`.

If you add just three more ingredients (Caramel, Vanilla, Whipped Cream), you suddenly need dozens of subclasses to handle every possible combination. If the base price of coffee changes, you have to modify 50 different classes. This completely violates the Open/Closed Principle.

### The ELI5 Analogy: The Russian Nesting Dolls

Instead of creating a permanent, rigidly baked-in subclass, think of the Decorator pattern like Russian Nesting Dolls.

You start with the smallest solid doll (the `SimpleCoffee`).
You place it inside a hollow doll called `Milk`. The Milk doll knows it costs $0.50, but it asks the doll inside it for the base price and adds them together.
You place that whole thing inside another hollow doll called `Sugar`.

When the cashier asks the outermost doll for the final price, the request is passed all the way to the center and calculated on the way back out.
If you invent a new ingredient tomorrow, you just create a new hollow doll. The inner dolls never change.

### The Python Implementation

Notice how the `CoffeeDecorator` implements the exact same interface as the base `Coffee`. This is the secret to the pattern: The wrapper must look identical to the thing it is wrapping so the client code doesn't know the difference.

```python
from abc import ABC, abstractmethod

# 1. The Base Component (The Interface)
class Coffee(ABC):
    @abstractmethod
    def get_cost(self) -> float:
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        pass

# 2. The Concrete Component (The innermost doll)
class SimpleCoffee(Coffee):
    def get_cost(self) -> float:
        return 2.00
    
    def get_description(self) -> str:
        return "Espresso"

# 3. The Base Decorator (The hollow doll blueprint)
class CoffeeDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        # The wrapper holds a reference to the inner object
        self._coffee = coffee

    def get_cost(self) -> float:
        return self._coffee.get_cost()
        
    def get_description(self) -> str:
        return self._coffee.get_description()

# 4. Concrete Decorators (The specific hollow dolls)
class Milk(CoffeeDecorator):
    def get_cost(self) -> float:
        return self._coffee.get_cost() + 0.50
        
    def get_description(self) -> str:
        return self._coffee.get_description() + ", Milk"

class Sugar(CoffeeDecorator):
    def get_cost(self) -> float:
        return self._coffee.get_cost() + 0.25
        
    def get_description(self) -> str:
        return self._coffee.get_description() + ", Sugar"

class WhippedCream(CoffeeDecorator):
    def get_cost(self) -> float:
        return self._coffee.get_cost() + 0.75
        
    def get_description(self) -> str:
        return self._coffee.get_description() + ", Whipped Cream"


# --- Execution ---
# 1. Start with the base object
my_order = SimpleCoffee()

# 2. Wrap it dynamically at runtime!
my_order = Milk(my_order)
my_order = Sugar(my_order)
my_order = WhippedCream(my_order)

# The outermost wrapper (WhippedCream) triggers the chain reaction
print(f"Order: {my_order.get_description()}")
print(f"Total: ${my_order.get_cost():.2f}")

# Output: 
# Order: Espresso, Milk, Sugar, Whipped Cream
# Total: $3.50
```

### The Senior-Level Pivot (Python Specifics)

If you are asked about the Decorator pattern in a Python-specific interview, it is crucial to address the naming collision.

"In classical Object-Oriented Programming (like Java), the Decorator pattern uses class composition and wrapping to extend object behavior dynamically, just like this Coffee example.

However, Python has a built-in syntax feature called decorators (the `@` symbol above functions). While they share the same name and the exact same conceptual philosophy (wrapping something to add behavior without modifying the original code), Python's `@decorator` is a functional programming feature used to modify functions or methods, whereas the classic Gang of Four Decorator pattern modifies Object state and behavior at runtime."
'@
Set-Content -Path "$dir\48-decorator-pattern-ocp.md" -Value $c48 -Encoding UTF8

$c50 = @'
---
id: 50-dependency-injection
title: Dependency Injection - DI vs DIP, constructor/setter/field injection
sidebar_position: 50
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** What is Dependency Injection? How is it different from just using new to create dependencies inside a class? And how does it relate to the Dependency Inversion Principle you already know from SOLID &mdash; are they the same thing?

### The Interview Quick-Hit

"Dependency Injection (DI) is a design pattern where an object receives its required dependencies from the outside rather than instantiating them internally using the `new` keyword. It makes code loosely coupled and highly testable. Dependency Inversion (DIP from SOLID) is the theoretical principle stating that high-level modules should depend on abstractions; Dependency Injection is the actual technique used to deliver those abstractions to the class."

```mermaid
classDiagram
    class Database {
        <<interface>>
        +savePayment()
    }
    class MySQLDatabase {
        +savePayment()
    }
    class PostgresDatabase {
        +savePayment()
    }
    class PaymentProcessor {
        -Database database
        +PaymentProcessor(database: Database)
        +processTransaction()
    }
    
    Database <|.. MySQLDatabase
    Database <|.. PostgresDatabase
    PaymentProcessor o-- Database : injected
```

### The ELI5 Analogy: The Formula 1 Driver

**Without DI (Using new):** Imagine a Formula 1 Driver who is hardcoded to build their own car. Before they can race, the driver has to manufacture the engine, weld the chassis, and attach slick dry-weather tires. If it suddenly starts raining, the driver is doomed. They are tightly coupled to the slick tires they built. To change the tires, you would have to completely rewrite the Driver.

**With DI:** The Driver simply asks for a Car in their constructor. The race engineers build the car with wet-weather tires outside, and then hand it (inject it) into the Driver. The Driver doesn't care how the car was built; they just know how to drive it.

### The Code Proof: The Danger of `new`

In backend systems, tying your business logic directly to a database implementation is a classic rookie mistake.

#### 1. The Tightly Coupled Way (Bad)
Whenever you see `new` inside a class, it is a red flag. It creates a hard, unbreakable link.
```java
public class PaymentProcessor {
    // 1. The class creates its own dependency
    private MySQLDatabase database = new MySQLDatabase();

    public void processTransaction() {
        database.savePayment();
    }
}
```
**The Problem:** What if you want to switch to PostgreSQL? What if you want to write a unit test without actually hitting a live database? You can't. You are permanently glued to `MySQLDatabase`.

#### 2. The Dependency Injection Way (Good)
Instead of building the database, we ask for it in the constructor.
```java
public class PaymentProcessor {
    // 1. Depend on an abstraction (Interface), not a concrete class
    private Database database;

    // 2. DEPENDENCY INJECTION: We force the outside world to hand us the database
    public PaymentProcessor(Database database) {
        this.database = database;
    }

    public void processTransaction() {
        database.savePayment();
    }
}
```
Now, when the server starts, you can easily swap implementations: 
`PaymentProcessor myProcessor = new PaymentProcessor(new PostgresDatabase());`

### DIP vs. DI: What's the exact difference?

Interviewers love this specific trap. They want to see if you know the difference between a Concept and a Tool.

*   **Dependency Inversion Principle (DIP):** This is the Strategy. It is the "D" in SOLID. It is the architectural rule that says: "PaymentProcessor should not know about MySQL. Both should depend on a generic Database interface."
*   **Dependency Injection (DI):** This is the Tactic. It is the actual physical act of passing that Database object into the PaymentProcessor via its constructor.

You can technically achieve DIP without DI (by using a Service Locator or Factory pattern), but DI is by far the most popular way to do it.

### The Senior-Level Pivot (IoC and Testing)

To seal the deal on a backend interview, mention how this impacts day-to-day development:

1.  **The Magic of Frameworks (IoC Containers):** "In modern production systems, we rarely inject dependencies manually. Frameworks like Spring Boot (Java) or NestJS (Node) use Inversion of Control (IoC) containers. We just tag a class with `@Service`, and when the application starts, the framework automatically finds all the required dependencies and injects them for us behind the scenes."
2.  **The Unit Testing Superpower:** "The biggest practical benefit of DI is testing. If I inject my database, I can pass in a fake `MockDatabase` during my unit tests. If I used the `new` keyword, my tests would actually write garbage data to my real database."
'@
Set-Content -Path "$dir\50-dependency-injection.md" -Value $c50 -Encoding UTF8
