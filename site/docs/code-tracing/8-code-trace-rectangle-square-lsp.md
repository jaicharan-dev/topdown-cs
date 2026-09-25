---
id: 8-code-trace-rectangle-square-lsp
title: "Code Trace: Rectangle/Square Liskov Substitution Principle Violation"
description: "Analyze the classic Liskov Substitution Principle (LSP) violation, Barbara Liskov's formal contract rules, the 'Is-A' behavioral fallacy, and immutable refactoring."
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What does each call print? Explain why this code violates Barbara Liskov's formal definition of the Liskov Substitution Principle (LSP), why real-world mathematical taxonomy fails in OOP, and how you would architecturally refactor this system."
>
> ```java
> class Rectangle {
>     protected int width;
>     protected int height;
> 
>     void setWidth(int width) {
>         this.width = width;
>     }
>     void setHeight(int height) {
>         this.height = height;
>     }
>     int getArea() {
>         return width * height;
>     }
> }
> 
> class Square extends Rectangle {
>     @Override
>     void setWidth(int width) {
>         this.width = width;
>         this.height = width;
>     }
> 
>     @Override
>     void setHeight(int height) {
>         this.width = height;
>         this.height = height;
>     }
> }
> 
> void resizeRectangle(Rectangle r) {
>     r.setWidth(5);
>     r.setHeight(10);
>     System.out.println(r.getArea());
> }
> 
> resizeRectangle(new Rectangle());
> resizeRectangle(new Square());
> ```

---

The Rectangle/Square dilemma is the canonical illustration of the **Liskov Substitution Principle (LSP)**—the "L" in the SOLID design principles. 

While candidates easily notice that `resizeRectangle(new Square())` outputs 100 instead of 50, staff-level interviewers expect you to articulate the violation using formal **Design by Contract** terminology (preconditions, postconditions, and invariants).

---

### 1. Exact Output

```text
50
100
```

---

### 2. Step-by-Step Execution Trace

1. **`resizeRectangle(new Rectangle())`:**
   - `r.setWidth(5)` $\implies$ `width = 5, height = 0`.
   - `r.setHeight(10)` $\implies$ `width = 5, height = 10`.
   - `r.getArea()` returns $5 \times 10 = \mathbf{50}$.
2. **`resizeRectangle(new Square())`:**
   - `r.setWidth(5)` invokes `Square.setWidth(5)` $\implies$ `width = 5, height = 5`.
   - `r.setHeight(10)` invokes `Square.setHeight(10)` $\implies$ `width = 10, height = 10`. (Setting height silently mutates width!).
   - `r.getArea()` returns $10 \times 10 = \mathbf{100}$.

---

### 3. Formal Analysis: Why This Violates LSP

Barbara Liskov and Jeannette Wing (1994) formally defined subtyping:
> *Let $\phi(x)$ be a property provable about objects $x$ of type $T$. Then $\phi(y)$ should be true for objects $y$ of type $S$ where $S$ is a subtype of $T$.*

In software engineering, this is enforced via **Design by Contract**:

| Contract Rule | Supertype (`Rectangle`) | Subtype (`Square`) | LSP Status |
| :--- | :--- | :--- | :--- |
| **Preconditions** | Cannot be strengthened | Accepts any integer width/height | Satisfied |
| **Postconditions** | **Cannot be weakened** | `setHeight(h)` breaks $\text{width} = \text{width}_{\text{old}}$ | **VIOLATED** |
| **Invariants** | Independent dimensions | Dimensions are locked together | **VIOLATED** |
| **History Constraint** | Width does not mutate on height change | Mutates width on height change | **VIOLATED** |

#### The Weakened Postcondition Violation:
In `Rectangle`, the method contract for `setHeight(int h)` has an explicit postcondition:
$$\text{Postcondition: } \text{height} == h \land \text{width} == \text{width}_{\text{initial}}$$

The client function `resizeRectangle` relies on this exact contract:
```java
r.setWidth(5);   // Expects width to remain 5 forever unless setWidth is called again!
r.setHeight(10); // Contract guarantees height is 10, and width remains 5.
assert r.getArea() == 50; // FAILS with Square!
```

`Square` weakens this postcondition by silently overwriting `width` during `setHeight()`. Consequently, `Square` cannot be substituted for `Rectangle` without breaking client program correctness.

---

### 4. The Senior Architectural Fallacy: "Is-A" vs. "Behaves-Like"

The root cause of this design failure is confusing **mathematical taxonomy** with **software behavioral modeling**:

```text
MATHEMATICAL REALITY (Static Taxonomy):
  A Square IS-A Rectangle (Every square has 4 right angles and parallel sides).

OBJECT-ORIENTED REALITY (Behavioral Contracts):
  A mutable Square DOES NOT BEHAVE LIKE a mutable Rectangle!
  Because Rectangle promises independent dimension mutability,
  Square CANNOT safely inherit from Rectangle.
```

In Object-Oriented Programming, inheritance must model **behavioral substitutability**, not ontological classification.

---

### 5. Architectural Solutions That Restore LSP

#### Solution 1: Segregated Read-Only Interface (`Shape`)
Decouple the common read-only behavior (`getArea()`) from mutable dimension setters:

```text
              <<interface>>
                 Shape
             + getArea(): int
               ^        ^
               |        |
        +------+        +------+
        |                      |
    Rectangle                Square
  + width: int            + side: int
  + height: int           + setSide(s: int)
  + setWidth(w: int)
  + setHeight(h: int)
```

```java
public interface Shape {
    int getArea();
}

public class Rectangle implements Shape {
    private int width;
    private int height;

    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }
    public void setWidth(int width) { this.width = width; }
    public void setHeight(int height) { this.height = height; }
    @Override public int getArea() { return width * height; }
}

public class Square implements Shape {
    private int side;

    public Square(int side) { this.side = side; }
    public void setSide(int side) { this.side = side; }
    @Override public int getArea() { return side * side; }
}
```

#### Solution 2: Immutability (Java Records / Value Objects)
If shapes are **immutable value objects**, dimension mutation methods do not exist; instead, methods return fresh instances:

```java
public record ImmutableRectangle(int width, int height) {
    public int getArea() { return width * height; }
    public ImmutableRectangle withWidth(int w) { return new ImmutableRectangle(w, height); }
    public ImmutableRectangle withHeight(int h) { return new ImmutableRectangle(width, h); }
}
```
Without in-place state mutation, postcondition contradictions disappear.

---

### 6. Runnable Java Verification Code

```java
/**
 * Standalone verification for Liskov Substitution Principle violation.
 * Run with: javac LspViolationDemo.java && java LspViolationDemo
 */
public class LspViolationDemo {

    static class Rectangle {
        protected int width;
        protected int height;

        void setWidth(int width) { this.width = width; }
        void setHeight(int height) { this.height = height; }
        int getArea() { return width * height; }
    }

    static class Square extends Rectangle {
        @Override
        void setWidth(int width) {
            this.width = width;
            this.height = width;
        }

        @Override
        void setHeight(int height) {
            this.width = height;
            this.height = height;
        }
    }

    static void resizeRectangle(Rectangle r, String shapeName) {
        r.setWidth(5);
        r.setHeight(10);
        int area = r.getArea();
        System.out.println(shapeName + " area: " + area);
        
        // Behavioral assertion:
        if (area != 50) {
            System.out.println("  -> LSP VIOLATION DETECTED! Expected 50, but got " + area);
        } else {
            System.out.println("  -> Behavioral contract respected.");
        }
    }

    public static void main(String[] args) {
        System.out.println("--- Testing Rectangle Substitution ---");
        resizeRectangle(new Rectangle(), "Rectangle");

        System.out.println("\n--- Testing Square Substitution ---");
        resizeRectangle(new Square(), "Square");
    }
}
```

---

### 7. Concise Staff-Level Interview Answer

> "The first call prints `50`, and the second call prints `100`.
>
> This is a canonical Liskov Substitution Principle (LSP) violation because `Square` breaks the behavioral contract established by `Rectangle`. In Design by Contract, a subtype is forbidden from weakening supertype postconditions. When `Rectangle.setHeight(10)` is invoked, it guarantees the postcondition that `height == 10` and `width == width_initial`. 
>
> However, `Square` overrides `setHeight` to mutate both dimensions simultaneously, corrupting the width to 10 and resulting in an unexpected area of 100.
>
> This exposes the classic 'Is-A' taxonomy fallacy: while a square is mathematically a rectangle, in software engineering, inheritance is strictly about behavioral compatibility. A mutable square cannot behave like a mutable rectangle. 
>
> To resolve this, we remove the inheritance hierarchy between them, have both implement a shared read-only `Shape` interface with `getArea()`, or model them as immutable value objects where dimensions cannot be mutated in place."
