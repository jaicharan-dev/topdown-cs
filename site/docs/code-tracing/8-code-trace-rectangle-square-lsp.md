---
id: 8-code-trace-rectangle-square-lsp
title: "Code Trace: Rectangle, Square and the Liskov Substitution Principle"
description: "A square really is a rectangle; what it is not is a mutable rectangle, and the whole violation lives in the setters rather than in the taxonomy"

sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What does each call print? Explain why this code violates Barbara Liskov's formal definition of the Liskov Substitution Principle (LSP), why real-world mathematical taxonomy fails in OOP, and how you would architecturally refactor this system."

```java
class Rectangle {
    protected int width;
    protected int height;

    void setWidth(int width)   { this.width = width; }
    void setHeight(int height) { this.height = height; }
    int getArea()              { return width * height; }
}

class Square extends Rectangle {
    @Override
    void setWidth(int width)   { this.width = width; this.height = width; }
    @Override
    void setHeight(int height) { this.width = height; this.height = height; }
}

void resizeRectangle(Rectangle r) {
    r.setWidth(5);
    r.setHeight(10);
    System.out.println(r.getArea());
}

resizeRectangle(new Rectangle());
resizeRectangle(new Square());
```

**Before you scroll.** Two numbers print. The first is the one `resizeRectangle` was written to produce. For the second, trace both setter calls in order and notice that the second one overwrites what the first one did. Then ask the harder question the code is really posing: is the bug in `Square`, in `Rectangle`, or in `resizeRectangle`?

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
50
100
```

`resizeRectangle` asked for a 5 by 10 shape and got a 10 by 10 one. Nothing threw, nothing was overridden incorrectly by its own lights, and `Square.setHeight` did exactly what a square requires. **The defect is distributed across three files, none of which is individually wrong.**

</details>

---

### Picture it

A hire agreement that says you may adjust the seat and, separately, adjust the mirror.

Someone hires you a vehicle where **adjusting the seat also moves the mirror**, and adjusting the mirror moves the seat back. Every individual action does something sensible. There is no fault in the mechanism, and if the vehicle had been advertised as having linked controls you would have no complaint at all.

The complaint is about the agreement. **You were promised two independent adjustments and given one coupled one**, and code written against the promise now produces a result nobody asked for. Note where the surprise lands: not in the mechanism, and not in the agreement, but in **the person who read the agreement and relied on it.**

That is the shape of this question, and the thing most answers get wrong is locating the fault.

**The fault is not that a square is not a rectangle.** It is. Every square satisfies every geometric property of a rectangle, and no amount of object-oriented reasoning changes that. If the inheritance were modelling the mathematics, it would be correct.

**The fault is that the class does not model the mathematics.** `Rectangle` as written is not the set of rectangles; it is **a rectangle you can stretch in one direction**, and the ability to stretch one side without the other is part of what it promises. A square cannot keep that promise, because the promise is incompatible with being a square. So the subtyping fails on the contract, not on the shape.

The sharpest way to put it: **a square is a rectangle, but a square is not a mutable rectangle.** The word doing the damage is "mutable". Delete the setters, make both types immutable, and the inheritance becomes unobjectionable and stays unobjectionable forever, because there is no longer any promise about changing one dimension independently.

And that reframes what the principle is for. It is not a rule about whether your class names match reality. **It is a rule about whether the promises a base type makes are promises every subtype can keep**, and mutability is the usual way a base type makes promises it should not have made.

---

### The proper terms

#### The principle, formally

The informal version, from Liskov's 1987 keynote, is that if `S` is a subtype of `T` then objects of type `T` may be replaced by objects of type `S` **without altering any desirable property of the program**.

The formal version, from Liskov and Wing's 1994 paper *A Behavioral Notion of Subtyping*, gives four obligations on a subtype's methods:

**Preconditions may not be strengthened.** A subtype may not demand more of its callers than the supertype did.

**Postconditions may not be weakened.** A subtype must guarantee at least what the supertype guaranteed.

**Invariants of the supertype must be preserved.** Anything always true of a `T` must remain always true of an `S`.

**The history constraint must hold.** A subtype may not permit state changes that the supertype's own methods could not have produced. This is the clause that is specific to mutable objects, and it is the one violated here.

#### Which clause this code breaks

`Rectangle.setWidth` carries an **implied postcondition** that is never written down but is relied upon by every caller:

```text
after setWidth(w):   this.width == w   AND   this.height is unchanged
```

`Square.setWidth` satisfies the first conjunct and violates the second. That is a weakened postcondition, which is clause two.

It also violates the **history constraint**, clause four. A plain `Rectangle` has no state transition in which `height` changes while only `setWidth` was called. `Square` introduces one. A caller holding a `Rectangle` reference can therefore observe a transition the type's own contract says is impossible.

Note what is **not** violated: no precondition is strengthened, since `Square.setWidth` accepts every `int` that `Rectangle.setWidth` does, and no exception is introduced. **The violation is entirely in what the method guarantees afterwards**, which is why nothing throws and why the compiler is silent.

#### Why the contract is invisible

The decisive postcondition, "the other dimension is unchanged", appears nowhere in the source. It is not in the signature, the return type, any annotation, or the type system. **Java can express that a method takes an `int` and returns `void`; it cannot express that it leaves `height` alone.**

That is the general lesson about this class of bug: **LSP is a constraint on behaviour, and behaviour is exactly the part a type system does not check.** Hence the principle is a design discipline rather than something a compiler enforces, and hence the errors surface as wrong values rather than as failures to compile.

#### The real culprit

Three places could be called wrong and only one of them is:

**`Square` is not wrong.** Given that it must always be square, its setters are the only implementation available.

**`resizeRectangle` is not wrong.** It relies on exactly the contract its parameter type advertises.

**`Rectangle` is wrong**, for declaring independent mutators on a type it intends to be subclassed by shapes that cannot support them. **The defect is in the base type's contract**, which is why fixing it means changing `Rectangle` rather than patching `Square`.

#### The invariant each type wants

`Rectangle` wants `width` and `height` to be independently settable. `Square` wants `width == height` as an **invariant**. These are not merely different; they are contradictory, and no inheritance arrangement reconciles them while both types remain mutable.

---

### Why it does that, step by step

#### The `Rectangle` call

| Step | Statement | `width` | `height` | Output |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `new Rectangle()` | 0 | 0 | |
| 2 | `r.setWidth(5)` | **5** | 0 | |
| 3 | `r.setHeight(10)` | 5 | **10** | |
| 4 | `r.getArea()` | 5 | 10 | **50** |

As intended, and this is the behaviour `resizeRectangle` was written against.

#### The `Square` call

| Step | Statement | `width` | `height` | Output |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `new Square()` | 0 | 0 | |
| 2 | `r.setWidth(5)` dispatches to `Square.setWidth` | **5** | **5** | |
| 3 | `r.setHeight(10)` dispatches to `Square.setHeight` | **10** | **10** | |
| 4 | `r.getArea()` | 10 | 10 | **100** |

**Step 3 is where the damage is done**, and specifically the `this.width = height` line. `setHeight` writes *both* fields, so it silently discards the width that step 2 established. The caller's two instructions were not two instructions; the second undid the first.

Notice the static type throughout: `r` is declared `Rectangle`, and virtual dispatch sends both calls to `Square`'s overrides. **The caller cannot see which implementation it is talking to**, which is the point of polymorphism and, here, the mechanism of the bug.

#### Why patching it does not work

The instinct is to make `resizeRectangle` defensive:

```java
void resizeRectangle(Rectangle r) {
    if (r instanceof Square) {        // the smell that proves the violation
        ...
    }
}
```

An `instanceof` check on a subtype inside a method that accepts the supertype is **the diagnostic symptom of an LSP violation**, not a fix. It means the abstraction does not hold, and it transfers the cost to every present and future caller: each must know the full set of subtypes, and adding a `Rhombus` breaks all of them. **If polymorphism required the caller to know the concrete type, it would have no purpose.**

The other instinct, making the setters throw in `Square`, is worse:

```java
@Override
void setWidth(int width) {
    throw new UnsupportedOperationException();   // strengthens the precondition
}
```

This violates clause one as well, so now the subtype breaks two of the four obligations. A caller holding a `Rectangle` cannot call a documented method without risking an exception, which is strictly worse than a wrong number because it converts a silent logic error into a crash in code that was correct.

#### Refactor 1: make them immutable

```java
final class Rectangle {
    private final int width, height;

    Rectangle(int width, int height) { this.width = width; this.height = height; }

    int getArea()        { return width * height; }
    int getWidth()       { return width; }
    int getHeight()      { return height; }

    Rectangle withWidth(int w)  { return new Rectangle(w, height); }
    Rectangle withHeight(int h) { return new Rectangle(width, h); }
}

final class Square {
    private final int side;

    Square(int side) { this.side = side; }

    int getArea()            { return side * side; }
    Rectangle toRectangle()  { return new Rectangle(side, side); }
}
```

**The conflict is gone because the promise is gone.** There is no "set the width and leave the height" operation to break, since `withWidth` returns a new object and mutates nothing. A `Square` can be freely converted to a `Rectangle`, which is the honest relationship: every square **is** a rectangle, and converting says so without claiming a square can be stretched.

This is the refactor to lead with, because it removes the cause rather than working around it.

#### Refactor 2: share the interface, not the implementation

```java
interface Shape {
    int getArea();
}

final class Rectangle implements Shape {
    private final int width, height;
    public int getArea() { return width * height; }
}

final class Square implements Shape {
    private final int side;
    public int getArea() { return side * side; }
}
```

Both satisfy `Shape` completely, because `getArea` is a **query** and queries have nothing to weaken. The relationship is "both are shapes", which is true, rather than "a square is a stretchable rectangle", which is not.

The general rule this illustrates: **inherit for queries, be suspicious of inheriting for commands.** A method that only reads state can almost always be implemented by a subtype without violating anything; a method that writes state carries promises about what it leaves alone.

#### Refactor 3: if you must keep mutability, do not subtype

```java
final class Square {
    private final Rectangle box;              // composition, not inheritance

    Square(int side) { this.box = new Rectangle(side, side); }

    int getArea() { return box.getArea(); }
    // no setWidth, no setHeight: the type simply does not offer them
}
```

A `Square` is not passable to `resizeRectangle` at all, which is correct: it genuinely cannot satisfy what that method needs. **A compile error is the right outcome**, and it is better than any runtime behaviour, because the mistake is caught where it is made.

#### Where this appears in real code

The pattern is not a classroom curiosity, and naming a real instance helps.

**`java.sql.Timestamp` extends `java.util.Date`** and breaks `equals` symmetry: `date.equals(timestamp)` and `timestamp.equals(date)` can disagree, so the two are not interchangeable despite the inheritance. Its own Javadoc warns against using them interchangeably.

**`Arrays.asList`** returns a fixed-size `List` whose `add` throws `UnsupportedOperationException`, strengthening a precondition on the `List` contract. The same applies to the collections from `List.of` and to `Collections.unmodifiableList`, which is why defensive code checks capability rather than type.

**Rectangular selection in a UI** is the genuine version of this exercise: a drag handle that resizes one edge is precisely the independent mutator a square cannot support, which is why such toolkits model aspect-ratio locking as a mode rather than as a subclass.

---

### What they ask next

**"What does each call print?"**
`50` then `100`. For the `Square`, `setWidth(5)` sets both fields to 5, and then `setHeight(10)` sets both to 10, **discarding the width that the first call established**. The caller's two instructions were not independent; the second undid the first.

**"Which formal clause is violated?"**
Two of the four from Liskov and Wing. **Postconditions may not be weakened**: `Rectangle.setWidth` carries the implied postcondition that `width == w` **and `height` is unchanged**, and `Square` satisfies only the first half. And **the history constraint**: a plain `Rectangle` has no transition in which `height` changes under a `setWidth` call, and `Square` introduces one. **No precondition is strengthened and nothing throws**, which is exactly why the compiler is silent and the symptom is a wrong number.

**"Where is the bug: `Square`, `Rectangle`, or the caller?"**
**`Rectangle`.** `Square`'s setters are the only implementation available to a type that must stay square, and `resizeRectangle` relies on precisely the contract its parameter type advertises. The fault is in the base type for **declaring independent mutators on a type it intends to be subclassed by shapes that cannot support them.** That is why the fix changes `Rectangle` rather than patching `Square`.

**"Is it wrong to say a square is a rectangle?"**
No, and this is the part most answers get backwards. Mathematically a square **is** a rectangle and the taxonomy is correct. What fails is that the class does not model the mathematics: `Rectangle` as written is **a rectangle you can stretch in one direction**, and that capability is part of its contract. **A square is a rectangle; a square is not a mutable rectangle.** The word doing the damage is "mutable".

**"So is LSP about taxonomy at all?"**
No. It is about whether **the promises a base type makes are promises every subtype can keep**. The usual way a base type makes promises it should not have made is by exposing mutators, because a command carries implicit guarantees about what it leaves alone, and those guarantees are invisible to the type system.

**"Why does the compiler not catch it?"**
Because the decisive postcondition, "the other dimension is unchanged", is not expressible. **Java can state that a method takes an `int` and returns `void`; it cannot state that it leaves `height` alone.** LSP constrains behaviour, and behaviour is precisely what a type system does not check, which is why the principle is a design discipline and the failures show up as wrong values.

**"What about an `instanceof` check in the caller?"**
That is the **diagnostic symptom** of an LSP violation rather than a fix. It admits the abstraction does not hold, and it pushes the cost onto every caller present and future: each must know the complete set of subtypes, and adding a `Rhombus` breaks all of them. **If polymorphism required the caller to know the concrete type, it would serve no purpose.**

**"What about making `Square`'s setters throw?"**
Worse. That **strengthens a precondition**, breaking clause one in addition to clause two, so the subtype now violates two obligations instead of one. A caller holding a `Rectangle` can no longer invoke a documented method without risking an exception, which converts a silent logic error into a crash in code that was correct.

**"How would you refactor it?"**
**Make both immutable**, so `withWidth` returns a new object and there is no promise about leaving the other dimension alone; a `Square` then converts to a `Rectangle`, which states the true relationship. Failing that, **share an interface rather than an implementation**, since `getArea` is a query and queries have nothing to weaken. Or **use composition** and let `Square` not be passable to `resizeRectangle` at all, where a compile error is the right outcome.

**"Is there a general rule to extract?"**
**Inherit for queries, be suspicious of inheriting for commands.** A method that only reads state can nearly always be implemented by a subtype without violating anything. A method that writes state carries promises about what it does not touch, and those are the promises subtypes break. Immutability sidesteps the whole category, which is the practical reason value types are easier to subtype safely.

**"Does this happen in real libraries?"**
Yes. **`java.sql.Timestamp` extends `java.util.Date`** and breaks `equals` symmetry, so the two are not interchangeable despite the inheritance, as its own Javadoc admits. **`Arrays.asList`** returns a fixed-size list whose `add` throws, strengthening a precondition on `List`, as do `List.of` and `Collections.unmodifiableList`. Both are the same mistake as `Square`: a subtype that cannot honour the supertype's contract.

**The common wrong answer** is `50` then `50`, by tracing only `setWidth` and missing that `Square.setHeight` writes both fields and undoes it. Next, and more importantly, is explaining the violation as "a square is not really a rectangle", when mathematically it is and the actual conflict is with mutability. Third is locating the bug in `Square` or in the caller rather than in `Rectangle`'s contract. And last is proposing an `instanceof` check or a throwing setter, both of which make the violation worse while appearing to address it.

---

### Say this in the interview

*"It prints 50 then 100. For the square, setWidth of five sets both fields to five, and then setHeight of ten sets both to ten, which discards the width the first call established. So the caller's two instructions were not independent: the second undid the first.*

*On the principle, the formal version from Liskov and Wing's 1994 paper gives four obligations on a subtype: preconditions may not be strengthened, postconditions may not be weakened, the supertype's invariants must be preserved, and the history constraint must hold, meaning a subtype may not permit state changes the supertype's own methods could not have produced.*

*Two of those are broken here. Rectangle's setWidth carries an implied postcondition that width equals the argument and height is unchanged, and Square satisfies only the first half, so that is a weakened postcondition. And the history constraint is broken too: a plain Rectangle has no transition in which height changes under a setWidth call, and Square introduces one. Worth noting what is not broken: no precondition is strengthened and nothing throws. The violation is entirely in what the method guarantees afterwards, which is exactly why the compiler is silent and the symptom is a wrong number rather than a crash.*

*Now the part I think most answers get backwards. The violation is not that a square is not really a rectangle. Mathematically it is, and the taxonomy is correct. The problem is that the class does not model the mathematics. Rectangle as written is not the set of rectangles, it is a rectangle you can stretch in one direction, and the ability to change one side without the other is part of what it promises. A square cannot keep that promise because the promise is incompatible with being a square. So the sharp version is: a square is a rectangle, but a square is not a mutable rectangle, and the word doing the damage is mutable.*

*That also locates the bug. Square is not wrong, because given that it must stay square, its setters are the only implementation available. The caller is not wrong, because it relies on exactly the contract its parameter type advertises. Rectangle is wrong, for declaring independent mutators on a type it intends to be subclassed by shapes that cannot support them. So the fix changes Rectangle, not Square.*

*And the reason the compiler cannot help is that the decisive postcondition, that the other dimension is unchanged, is not expressible. Java can say a method takes an int and returns void; it cannot say it leaves height alone. LSP constrains behaviour, and behaviour is precisely the part a type system does not check, which is why this is a design discipline rather than something enforced.*

*Two tempting non-fixes. An instanceof check on Square inside a method that accepts Rectangle is the diagnostic symptom of the violation, not a cure: it admits the abstraction does not hold and pushes the cost onto every caller, each of which now has to know the full set of subtypes, so adding a Rhombus breaks all of them. And making Square's setters throw is worse, because that strengthens a precondition, so the subtype now breaks two obligations instead of one, and a caller holding a Rectangle cannot invoke a documented method without risking an exception.*

*For the refactor I would lead with making both types immutable, because that removes the cause rather than working around it: withWidth returns a new object, so there is no promise about leaving the other dimension alone, and a Square can simply convert to a Rectangle, which states the true relationship honestly. Failing that, have both implement a Shape interface with getArea, which works because getArea is a query and queries have nothing to weaken. Or use composition, where Square holds a Rectangle and offers no setters, so passing a Square to resizeRectangle is a compile error, which is the right outcome because it genuinely cannot do what that method needs.*

*The general rule I would extract is: inherit for queries, be suspicious of inheriting for commands. A method that only reads state can nearly always be implemented by a subtype safely; a method that writes state carries promises about what it does not touch, and those are the promises subtypes break. And this is not a classroom curiosity: java.sql.Timestamp extends java.util.Date and breaks equals symmetry, so the two are not interchangeable despite the inheritance, which its own Javadoc admits, and Arrays.asList returns a fixed-size list whose add throws, strengthening a precondition on the List contract. Both are the same mistake as Square."*
