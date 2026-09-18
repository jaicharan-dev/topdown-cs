---
id: 14-pass-by-value-vs-reference
title: "Pass by Value vs. Pass by Reference: The Java Object Trap"
sidebar_position: 14
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Explain the difference between pass-by-value and pass-by-reference. If I pass an object into a method in Java and modify it, the original object changes—so doesn't that mean Java is pass-by-reference?"

### The Interview Quick-Hit

"Java is strictly pass-by-value. There is absolutely no pass-by-reference in Java. When you pass a primitive, you are passing a copy of the actual value. When you pass an object, you are passing a copy of the reference (the memory address) to that object, not the object itself. This is the biggest 'gotcha' question in Java interviews."

### The ELI5 Analogy

Let's break down exactly what these terms mean using physical objects.

1. **Pass by Value (The Photocopy)** Imagine you have a highly confidential blueprint drawn on a piece of paper. You hand your friend a photocopy of the blueprint. If your friend takes a red marker and scribbles all over their photocopy, your original blueprint remains perfectly safe. You passed them the value, not the original.
2. **Pass by Reference (The Shared Original)** Imagine you hand your friend the actual original blueprint. If they draw on it with a red marker, your blueprint is permanently changed because you both share the exact same physical piece of paper. (Languages like C++ allow this. Java does not).
3. **The Java Object Trap (The Duplicate Remote Control)** This is where 90% of students fail the interview. They say, "But wait! If I pass an array or an object into a method and change it, the original changes! Isn't that pass by reference?"

No. It is passing a **copy of the reference by value**.

Imagine you have a TV (the Object in memory). You have a remote control that points to it (your reference variable). When you pass that object into a method, Java creates a brand new, **duplicate remote control** and hands it to the method.
If the method presses the "Change Channel" button on the duplicate remote, the TV changes. (Mutating the object state).
**The Proof:** If the method takes its duplicate remote and reprograms it to point to a completely different TV, your original remote still points to your original TV.

### The Code Proof

If an interviewer asks you to prove that Java is pass-by-value, write this exact code. It perfectly demonstrates the "Duplicate Remote Control" concept.

```java
class Dog {
    String name;
    public Dog(String name) { this.name = name; }
}

public class Main {
    public static void main(String[] args) {
        // 1. Primitive Test
        int x = 5;
        modifyPrimitive(x);
        System.out.println(x); // Output: 5 (The original is untouched)

        // 2. Object Test (The Trap)
        Dog myDog = new Dog("Spot");
        modifyObject(myDog);
        
        // Output: Max (The TV channel was changed!)
        System.out.println(myDog.name); 
    }

    // --- The Methods ---

    public static void modifyPrimitive(int number) {
        // We are modifying the photocopy.
        number = 10; 
    }

    public static void modifyObject(Dog methodDog) {
        // methodDog is a DUPLICATE remote control.
        
        // 1. Pressing the button (Changes the actual TV)
        methodDog.name = "Max"; 
        
        // 2. Reprogramming the duplicate remote!
        // We point it to a brand new TV in memory.
        methodDog = new Dog("Buster"); 
        
        // If Java was Pass-By-Reference, 'myDog' in the main method 
        // would now be Buster. But it's not! It's still Max.
    }
}
```

### The Interview Takeaway

If you are asked this, confidently state: "Java is strictly pass-by-value. For primitives, it passes a copy of the actual value. For objects, it passes a copy of the reference pointer. Because we have a copy of the pointer, we can mutate the original object's internal state, but we cannot reassign the original variable to point to a new object in memory."

---

### Crucial Nuance: The Immutability Illusion (`String` and Wrappers)

Interviewers will frequently try to trick you by passing a `String` or an `Integer` object into a method and changing it. Since they are objects, you expect the original to mutate, but it doesn't!

Why? Because `String` and wrapper classes like `Integer` are immutable. When the method attempts to change the value, it doesn't mutate the original object; it creates a brand-new object in memory and updates the duplicate reference to point to it. The original object remains entirely untouched, creating an illusion that looks exactly like passing a primitive by value.
