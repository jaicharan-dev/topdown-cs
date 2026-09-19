---
id: 1-code-trace-static-instance-constructor
title: "Code trace: static block vs instance block vs constructor execution order"
description: "Learn the exact execution order of static blocks, instance blocks, and constructors in Java with a step-by-step code tracing walkthrough."

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the exact output, in order? Explain why static blocks and instance blocks run when they do.
>
> ```java
> class Demo  {
>     static  {
>         System.out.println("Static block");
>     }
>     {
>         System.out.println("Instance block");
>     }
>     Demo()  {
>         System.out.println("Constructor");
>     }
>     public static void main(String[] args)  {
>         System.out.println("Main starts");
>         new Demo();
>         new Demo();
>     }
> }
> ```

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

### Step-by-step breakdown:
1.  **The Static Block (The One-Time Setup):** When the `Demo` class is loaded into the JVM's memory, before any objects are created and even before the `main` method starts executing, the static block runs exactly once.
2.  **The main Method:** After the class is loaded and static blocks are finished, the JVM looks for the `main` method to begin the actual program execution, printing `"Main starts"`.
3.  **The Instance Block (The Pre-Constructor):** The `new Demo()` call triggers object creation. The instance block runs every single time you use the `new` keyword, executing immediately before the constructor.
4.  **The Constructor (The Final Polish):** After the instance block sets up the baseline, the specific constructor you called executes to finish building that exact object.
5.  **Repeat:** Because your code calls `new Demo();` twice, the Instance Block -> Constructor sequence repeats twice. The Static Block ignores the second object creation because the class was already loaded.

### The "Why":
*   **Static block:** It is used for one-time, class-level initialization. In a backend system, you might use a static block to load a JDBC driver just once when the server starts.
*   **Instance block:** Imagine you have a class with three different overloaded constructors. Instead of copy-pasting the exact same setup code into all three, you put it in an instance block. The Java compiler automatically copies it into the very beginning of every constructor, keeping your code clean and DRY.

---

### Crucial Nuance: The Danger of Throwing Exceptions in Static Blocks

While static blocks are great for one-time setup, interviewers often ask: "What happens if a static block throws an exception?" If your static block throws a `RuntimeException` (like a `NullPointerException` or `ExceptionInInitializerError`), the class loading process catastrophically fails. 

More importantly, the JVM marks the class as permanently unusable. If you try to catch the exception and instantiate the class again later in the application lifecycle, the JVM won't re-run the static block. Instead, it will immediately throw a `NoClassDefFoundError`. Because of this, it is highly recommended to wrap static block logic in robust `try-catch` blocks and handle failures gracefully to prevent your entire application from crashing on startup.
