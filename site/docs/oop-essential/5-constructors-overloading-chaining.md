---
id: 5-constructors-overloading-chaining
title: "Constructors, Overloading, and Chaining"
description: "What runs when you write new, in what order, and the default constructor that quietly disappears"

sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What's a constructor, and how does overloading work for it? Walk me through chaining with `this()` and `super()`, the disappearing default constructor, and the exact order things get initialized in."

---

### Picture it

Think of building a house rather than buying one.

**Nothing is handed over half-finished.** Before anyone can live in the house, the foundation has to be poured, then the frame, then the fittings. The order is fixed because each stage stands on the one below it.

**There are several ways to order the same house.** You can give only the address, or the address and a colour, or the address, a colour and a garden. These are not different houses, just different amounts of detail at the start, and the shorter orders quietly fill in the rest.

**The foundation is never your own work.** Every house is built on ground prepared by someone else. Your part of the building starts only once that ground is ready.

A constructor is the building process for one object. Overloading is the several ways to order it. Chaining is the rule that the ground is prepared first.

---

### The proper terms

#### What a constructor is

A **constructor** is a special block that runs once, when an object is created, to put it into a valid starting state. It has the same name as the class and **no return type**, which is how the compiler tells it apart from a method.

#### Constructor overloading

**Constructor overloading** is several constructors in one class with different parameter lists, resolved by the compiler exactly like method overloading. It lets callers supply as much or as little detail as they have.

#### Chaining with this() and super()

**Constructor chaining** is one constructor calling another so the setup is written once.

**`this(...)`** calls another constructor in the same class, which is how a short form delegates to the full one.

**`super(...)`** calls a constructor in the superclass. If you write neither, the compiler inserts a no-argument `super()` for you.

Two rules govern both. The call must be the **first statement** in the constructor, because the object has to be built from the bottom up and nothing may touch a field before its initialiser has run. And you may use only one of them in a given constructor, since the first statement can only be one thing.

#### The default constructor that disappears

If a class declares no constructor at all, the compiler supplies a **default constructor**: no arguments, empty body. The moment you declare **any** constructor, that gift is withdrawn.

This is where it bites. A subclass constructor begins with an implicit `super()`, so if the parent declared only a constructor taking arguments, there is no no-argument constructor to call and the code will not compile. The fix is to call `super(...)` explicitly with the arguments the parent needs.

#### The order of initialisation

Writing `new Child()` runs these steps in this exact order:

1. Memory is allocated and every field is set to its **default value**: zero, `false`, or `null`.
2. The chain climbs to the top. `Object`'s constructor runs first, then each class's downward.
3. For each class, in order: its **instance variable initialisers** and **instance initialiser blocks** run, in the order they appear in the source.
4. Then that class's **constructor body** runs.
5. Control returns down the chain, repeating steps 3 and 4 for each subclass.

**Static** members are separate and earlier. A class's `static` fields and **static initialiser blocks** run once, when the class is first loaded, before any instance of it exists.

The consequence worth remembering: a parent constructor runs **before** the child's fields are initialised. If a parent constructor calls an overridable method, the override runs against a child that is not ready yet, and will see fields still holding their defaults.

---

### In code

```java
class Vehicle {
    private final String registration;

    Vehicle(String registration) {       // no no-arg constructor exists here
        this.registration = registration;
        describe();                      // dangerous: see the output below
    }

    void describe() {
        System.out.println("a vehicle");
    }
}

class Car extends Vehicle {
    private String colour = "red";       // field initialiser
    private final int wheels;

    { wheels = 4; }                      // instance initialiser block

    Car(String registration) {
        this(registration, "red");       // delegate to the fuller constructor
    }

    Car(String registration, String colour) {
        super(registration);             // must be first; parent built first
        this.colour = colour;
    }

    @Override
    void describe() {
        System.out.println("a car painted " + colour);
    }
}

public class Demo {
    public static void main(String[] args) {
        new Car("AB-1234");
        // prints: a car painted null
        //
        // The parent constructor called describe(), the override ran, but
        // Car's field initialisers had not executed yet, so colour was null.
    }
}
```

That output is the reason "never call an overridable method from a constructor" is standard advice.

---

### What they ask next

**"Can a constructor be `private`?"**
Yes, and it is deliberate in two patterns. A singleton uses it to stop outside code creating instances, and a class exposing static factory methods uses it to force callers through those.

**"Can a constructor be `static`, `final` or `abstract`?"**
No to all three. It is implicitly tied to an instance, so `static` is contradictory. It is not inherited, so `final` and `abstract` have nothing to act on.

**"Why must `this()` or `super()` be the first statement?"**
Because an object is built from its base upward. Any statement before the call would be able to read fields the parent has not initialised yet.

**"What is the difference between a copy constructor and `clone()`?"**
A copy constructor is an ordinary constructor taking another instance and copying from it, which is explicit and type-safe. `clone()` relies on `Cloneable`, returns `Object`, and performs a shallow copy by default. A copy constructor is preferred in modern code.

**"Does a constructor return anything?"**
Not in the language sense. It has no return type and you cannot declare one, though a bare `return;` to exit early is legal.

**The common wrong answer** is that the child's fields are ready when the parent constructor runs. They are not, and the `null` above is the proof.

---

### Say this in the interview

*"A constructor runs once when an object is created, to put it in a valid state. It shares the class name and has no return type. Constructor overloading provides several versions with different parameter lists, resolved by the compiler like any overload.*

*Constructor chaining lets one constructor call another: this(...) for the same class, super(...) for the superclass. Either must be the first statement, because the object is built from the base upward, and only one may appear. If I write neither, the compiler inserts a no-argument super().*

*If a class declares no constructor, the compiler provides a default constructor with no arguments. Declaring any constructor removes it, which is why a subclass fails to compile when its parent only has a constructor taking arguments: the implicit super() has nothing to call.*

*The order is: fields take their default values, the chain runs upward to Object, then for each class downward the instance variable initialisers and instance initialiser blocks run before that class's constructor body. Static fields and static initialiser blocks run earlier still, once at class loading. A practical consequence is that a parent constructor runs before the child's fields are initialised, so calling an overridable method from a constructor sees the subclass in an incomplete state."*
