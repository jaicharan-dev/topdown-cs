---
id: 14-pass-by-value-vs-reference
title: "Pass by Value vs. Pass by Reference: The Java Object Trap"
description: "Java copies the reference, not the object, which explains both things people find contradictory"

sidebar_position: 14
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Explain the difference between pass-by-value and pass-by-reference. If passing an object into a Java method allows me to modify its fields, doesn't that mean Java is pass-by-reference? How does this differ from C++?"

---

### Picture it

Think of a house and a piece of paper with its address written on it.

You write the address on a slip and hand the slip to a decorator. Now two slips exist, yours and theirs, both naming the same house.

**The decorator can repaint the house.** They follow the address, go inside, and paint the walls. You visit later and the walls are a different colour. The house changed, because you both have directions to the same one.

**The decorator cannot move you to a different house.** If they scribble out their slip and write a different address on it, their slip now names somewhere else. Yours still says what it always said. Nothing you own has changed.

That is the whole of Java's behaviour. The thing handed over is a **copy of the address**, never the house, and never your slip. Fields can change because both slips point at one house. Reassignment cannot be seen because each side scribbles only on its own slip.

---

### The proper terms

#### The two mechanisms

**Pass by value** means the argument's value is **copied** into the parameter. Changes to the parameter do not affect the caller's variable.

**Pass by reference** means the parameter is an **alias** for the caller's variable itself. Assigning to the parameter changes the caller's variable.

#### What Java does

**Java is always pass by value, without exception.** The confusion comes from what that value is.

For a **primitive**, the value is the number itself, so a copy of it is passed.

For an **object**, the variable does not hold the object. It holds a **reference**, which is a handle to an object living on the **heap**. What gets passed is a copy of that reference. Both the caller's variable and the parameter now refer to the same object.

So the two observed behaviours follow from one rule. Mutation is visible because both references lead to the same object. Reassignment is not visible because the method reassigns only its own copy of the reference.

The sharpest phrasing: Java passes object references by value.

#### The swap test

The decisive demonstration is a method that tries to swap two objects. In a genuinely pass-by-reference language the swap works. In Java it cannot, because the method only ever exchanges its own two local copies and the caller's variables are untouched. If Java were pass by reference, swap would work, and it does not.

#### How C++ differs

C++ offers all three explicitly.

**Pass by value**, `void f(Obj o)`, copies the whole object using its copy constructor. Java never does this.

**Pass by pointer**, `void f(Obj* o)`, copies the pointer. This is the closest match to Java's behaviour: the pointee can be modified, and reassigning the pointer inside is invisible outside.

**Pass by reference**, `void f(Obj& o)`, makes a genuine alias. Assigning to `o` changes the caller's object, and a real swap is possible. This is the one Java has no equivalent of.

So Java behaves like C++ pass by pointer, always, with no syntax to choose otherwise.

#### A related trap

Because wrappers like `Integer` and `String` are immutable, nothing done inside a method can change the object either. With no mutation possible and reassignment invisible, a method appears to have no effect at all, which reinforces the mistaken belief that primitives and objects behave differently. They do not. The rule is the same; the objects just have no mutators.

---

### In code

```java
class House { String colour = "white"; }

public class Demo {

    static void repaint(House h) {
        h.colour = "blue";            // follows the reference: visible outside
    }

    static void rehouse(House h) {
        h = new House();              // reassigns the local copy only
        h.colour = "green";           // paints the new one, not the caller's
    }

    static void swap(House a, House b) {
        House temp = a;               // swaps two local copies
        a = b;
        b = temp;                     // caller sees nothing
    }

    static void bump(int n) {
        n = n + 1;                    // a copy of the number
    }

    public static void main(String[] args) {
        House mine = new House();

        repaint(mine);
        System.out.println(mine.colour);     // blue: the object was mutated

        rehouse(mine);
        System.out.println(mine.colour);     // still blue: reassignment was local

        House other = new House();
        other.colour = "red";
        swap(mine, other);
        System.out.println(mine.colour);     // still blue: swap cannot work

        int count = 1;
        bump(count);
        System.out.println(count);           // 1: the primitive was copied
    }
}
```

The failed swap is the proof to reach for. It is impossible to write a working two-object swap in Java, and that is only true of a pass-by-value language.

---

### What they ask next

**"If I can change the object's fields, how is that not pass by reference?"**
Because pass by reference is about the **variable**, not the object. The test is whether assigning to the parameter changes the caller's variable. In Java it never does.

**"Does Java pass large objects efficiently?"**
Yes. Only the reference is copied, which is a machine word, so passing a huge object costs the same as passing a small one. C++ pass by value would copy the whole object.

**"What about arrays?"**
Arrays are objects, so the same rule applies. Changing `arr[0]` inside a method is visible; assigning `arr = new int[5]` is not.

**"How do you return two values if swap is impossible?"**
Return an object or record holding both, use an array or a mutable holder, or make the method return the new value and let the caller assign it. The last is usually cleanest.

**"Is C# the same?"**
By default yes, but C# has `ref` and `out` parameters that give true pass by reference, so a real swap can be written there.

**The common wrong answer** is "primitives are pass by value and objects are pass by reference". Everything is pass by value; what varies is whether the value is a number or a reference.

---

### Say this in the interview

*"Java is always pass by value. The subtlety is what the value is. For a primitive it is the number itself. For an object the variable holds a reference to something on the heap, and what gets copied into the parameter is a copy of that reference.*

*That single rule explains both behaviours people find contradictory. Mutation is visible outside the method because both the caller's reference and the parameter point to the same object. Reassignment is invisible because the method only reassigns its own copy of the reference. The decisive test is a swap method: in a genuine pass-by-reference language it would work, and in Java it cannot, because only the local copies are exchanged.*

*In C++ all three exist explicitly. Pass by value copies the whole object via its copy constructor. Pass by pointer copies the pointer and behaves like Java. Pass by reference, with an ampersand, creates a true alias where assignment affects the caller and a swap works. Java has no equivalent of that last one.*

*The phrase I would use is that Java passes object references by value."*
