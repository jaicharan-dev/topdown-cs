---
id: diamond-problem
title: "Diamond Problem and Multiple Inheritance"
sidebar_position: 33
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** Why does Java not support multiple inheritance for classes but supports it for interfaces? And what exactly is the diamond problem?

**The Quick-Hit:**
Java does not support multiple inheritance for classes to completely prevent the "Diamond Problem" - a scenario where a child class inherits two conflicting implementations of the exact same method from two different parents, causing the compiler to panic. Java allows multiple inheritance for interfaces because traditionally, interfaces only contain empty method signatures, meaning the child provides the single, definitive implementation, leaving zero ambiguity.

**The Analogy: Conflicting Bosses**
Imagine you are a Junior Engineer. You report directly to two different managers: the Civil Manager and the Software Manager.
Both managers send you an email with the exact same subject line: `executeProject()`.
The Civil Manager's instructions say: "Go to the site and survey the land."
The Software Manager's instructions say: "Open your laptop and write Python code."
You sit at your desk and panic. Which instructions are you supposed to follow? You have two conflicting sets of logic for the exact same command.
This is the Diamond Problem. (It gets its name because if you draw this hierarchy out on a whiteboard - one Grandparent class at the top, two Parent classes in the middle, and one Child class at the bottom - the arrows form a diamond shape).

**Why Classes Fail (The Diamond Problem in Code)**
If Java allowed multiple class inheritance, this is exactly what would break the compiler:

```java
class Device {
    void turnOn() { System.out.println("Starting device..."); }
}

class Camera extends Device {
    // Camera's specific implementation
    void click() { System.out.println("Taking a photo!"); } 
}

class Phone extends Device {
    // Phone's specific implementation
    void click() { System.out.println("Hanging up the call!"); } 
}

// THIS IS ILLEGAL IN JAVA (But imagine if it wasn't)
class SmartPhone extends Camera, Phone {
    // I inherit from both!
}

// Execution:
SmartPhone myPhone = new SmartPhone();

// THE CRASH:
// Does it take a photo? Or does it hang up a call? 
// The compiler has no idea which inherited code block to run.
myPhone.click();
```

Because the compiler cannot safely resolve this ambiguity, the creators of Java simply banned `extends ClassA, ClassB` entirely.

**Why Interfaces Succeed (The Contract)**
Interfaces bypass the Diamond Problem entirely because they are just contracts. They don't give you instructions (implementation); they just give you a to-do list.

```java
interface Camera {
    void click(); // Empty! No body.
}

interface Phone {
    void click(); // Empty! No body.
}

// Legal! You can implement as many interfaces as you want.
class SmartPhone implements Camera, Phone {
    
    // The compiler forces YOU to write the logic.
    @Override
    public void click() {
        System.out.println("Taking a photo and sending it over network!");
    }
}
```

Now, when someone calls `myPhone.click()`, there is no confusion. There is only one set of instructions - the one you explicitly wrote inside the `SmartPhone` class.

## Follow-up

**Wait, Java 8 introduced default methods in interfaces, which actually contain logic. Doesn't that bring the Diamond Problem back?**

It introduces the potential for it, yes. If a class implements two interfaces that both have a default method with the exact same name, the Java compiler will immediately throw a fatal error. It forces the developer to manually `@Override` the method in the child class and explicitly state which interface's default method they want to use (e.g., `Camera.super.click();`). Java prioritizes developer intent over compiler guesswork.

---

### Crucial Nuance: The "Class Always Wins" Rule

If a scenario arises where a child class extends a parent class *and* implements an interface, and both provide a default/concrete implementation of the exact same method, there is no compiler error. 

The JVM resolves this ambiguity using a strict rule: "Class Always Wins." The implementation provided by the parent class will completely override and ignore the interface's default method. This rule was established to ensure backward compatibility for legacy Java codebases that existed long before interfaces were allowed to have logic.
