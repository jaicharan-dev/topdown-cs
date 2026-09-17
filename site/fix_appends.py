import os

files_to_fix = {
    r"docs\oop\2-constructors-overloading-chaining.md": """

---

### Crucial Nuance: Copy Constructors & Private Constructors

While default and parameterized constructors are standard, interviewers often ask about two specific edge cases:

1. **Copy Constructors:** Unlike C++, Java does not provide a default copy constructor. If you want to create a clone of an object using a constructor, you must write it yourself by passing an object of the same type: `User(User existingUser) { this.name = existingUser.name; }`. (Though in modern Java, implementing the `Cloneable` interface or using copy methods is often preferred).
2. **Private Constructors:** If a constructor is marked `private`, no other class can instantiate it. This isn't a mistake—it's a deliberate design choice used in the **Singleton Pattern** (ensuring only one instance of the class ever exists) or in **Utility Classes** (like `java.lang.Math`, which only contains static methods and should never be instantiated).
""",
    r"docs\oop\3-access-modifiers.md": """

---

### Crucial Nuance: Top-Level Class Restrictions

A very common "gotcha" interview question is: *"Can a class be marked as private or protected?"*

The answer depends on what kind of class it is:
* **Variables and Methods** can use all four modifiers.
* **Inner (Nested) Classes** can also use all four modifiers.
* **Top-Level Classes** (the main class in a `.java` file) can **ONLY** be `public` or `default` (package-private). 

Why? Because marking a top-level class as `private` would make it completely invisible and unusable to the rest of the application, rendering it useless. Marking it `protected` makes no sense because there is no "parent" package concept in Java routing that would logically enforce protected access at the top level.
""",
    r"docs\oop\4-packages-in-java.md": """

---

### Crucial Nuance: The Implicit Imports

A common piece of trivia in interviews is: *"Why don't you have to import the `String` or `System` classes in Java?"*

The answer lies in how Java handles its core package. The package `java.lang` (which contains fundamental classes like `String`, `Math`, `System`, and `Thread`) is **implicitly imported** into every single Java file by the compiler. You never have to manually type `import java.lang.*;` because Java does it for you automatically behind the scenes.
""",
    r"docs\oop\5-this-keyword.md": """

---

### Crucial Nuance: The Static Context Trap

A guaranteed follow-up question regarding `this` is: *"Can you use the `this` keyword inside a static method?"*

**No, you cannot.** 
A `static` method belongs to the class itself, not to any specific instance (object). Because `this` specifically means "the current object", it makes no sense inside a static method—there is no object! If you try to write `this.name` inside `public static void main(...)`, the Java compiler will throw an error immediately: *non-static variable this cannot be referenced from a static context.*
""",
    r"docs\oop\6-coupling-and-cohesion.md": """

---

### Crucial Nuance: Dependency Injection (DI)

When interviewers ask *how* you actually achieve "loose coupling" in modern Java frameworks, the golden answer is **Dependency Injection (DI)** combined with **Interfaces**. 

Instead of a class creating its own dependencies (`Database db = new MySQLDatabase();`), you pass an interface into the constructor (`public UserService(IDatabase db)`). The class now has zero knowledge of the specific database implementation. If you swap MySQL for PostgreSQL tomorrow, the `UserService` class doesn't need a single line of code changed. This is the exact principle that powers frameworks like Spring Boot.
""",
    r"docs\oop\7-upcasting-downcasting-instanceof.md": """

---

### Crucial Nuance: Pattern Matching for `instanceof` (Java 16+)

If you want to impress an interviewer, mention that modern Java has largely eliminated the bulky syntax of explicit downcasting using **Pattern Matching**. 

Instead of doing the check and the cast on two separate lines:
```java
if (mysteryBox instanceof Dog) {
    Dog myDog = (Dog) mysteryBox;
    myDog.bark();
}
```

In Java 16+, you can do it securely in one line. If the check passes, it automatically casts it and assigns it to a new variable (`myDog`):
```java
if (mysteryBox instanceof Dog myDog) {
    myDog.bark(); // No explicit cast needed!
}
```
""",
    r"docs\oop\8-interface-vs-abstract-class.md": """

---

### Crucial Nuance: The Java 8 "Default" Blurring

An interviewer will almost certainly challenge you: *"But wait, Java 8 added `default` methods to interfaces. Doesn't that make them exactly the same as abstract classes now?"*

**The Answer:** No, the absolute defining boundary is **State**. 
While it is true that interfaces can now hold concrete implementation logic (via `default` and `static` methods), an interface can **never** hold instance variables (object state). All variables in an interface are strictly `public static final` (constants). An abstract class is the only one of the two that can declare instance variables, have a constructor, and maintain mutable state across its children.
"""
}

for path, correct_append in files_to_fix.items():
    filepath = os.path.join(r"D:\csf website\site", path)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Split out the broken append (which starts with "\n---\n\n### Crucial Nuance:")
    # We will search for "---" after the frontmatter
    # The safest way is to split by "Crucial Nuance:" and then remove the trailing "---"
    if "Crucial Nuance:" in content:
        # Find the last "---" before "Crucial Nuance:"
        parts = content.split("### Crucial Nuance:")
        original_content = parts[0].rstrip()
        # Remove the "---" that was added right before it
        if original_content.endswith("---"):
            original_content = original_content[:-3].rstrip()
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(original_content + correct_append)
