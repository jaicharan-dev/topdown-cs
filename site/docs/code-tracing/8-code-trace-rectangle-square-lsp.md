---
id: 8-code-trace-rectangle-square-lsp
title: "Code Trace: Rectangle/Square Liskov Substitution Principle Violation"
description: "Analyze the classic Liskov Substitution Principle (LSP) violation, Barbara Liskov's formal contract rules, the 'Is-A' behavioral fallacy, and immutable refactoring."
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Field, Tree } from '@site/src/components/ConceptDiagram';

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

A square is mathematically a rectangle — but once you make both *mutable* objects, that relationship breaks. `Square` overrides the setters so width and height always stay equal, which quietly changes what calling `setHeight()` means. That's the whole bug, and it's the canonical example of the "L" in SOLID: the Liskov Substitution Principle.

---

### Exact Output

```text
50
100
```

---

### Step-by-Step Execution Trace

<Diagram>
<Row>
<Box title="resizeRectangle(new Rectangle())" accent="#34d399">
<Field icon="1️⃣" code="setWidth(5) → width=5, height=0" variant="neutral" />
<Field icon="2️⃣" code="setHeight(10) → width=5, height=10" variant="neutral" />
<Field icon="✅" code="getArea() = 5 × 10 = 50" variant="neutral" />
</Box>
<Box title="resizeRectangle(new Square())" accent="#fb7185">
<Field icon="1️⃣" code="setWidth(5) → width=5, height=5" hint="Square's override keeps both equal" variant="neutral" />
<Field icon="2️⃣" code="setHeight(10) → width=10, height=10" hint="setting height silently changed width too" variant="neutral" />
<Field icon="⚠️" code="getArea() = 10 × 10 = 100" hint="caller only called setWidth and setHeight — never expected width to move" variant="neutral" />
</Box>
</Row>
</Diagram>

For a plain `Rectangle`, `setWidth` and `setHeight` are independent, so the area comes out as expected: 50. For a `Square`, `setHeight(10)` has to also change `width` to keep it a square — which silently invalidates whatever `setWidth(5)` had just set, giving 100 instead.

---

### Why This Violates LSP

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

### The Fallacy: "Is-A" vs. "Behaves-Like"

Mathematically, a square is a rectangle — every square has 4 right angles and parallel sides, so the "is-a" check passes. But inheritance in OOP isn't about that kind of taxonomy; it's a promise that the subtype behaves like the supertype. `Rectangle` promises independent width/height mutation, and a mutable `Square` cannot honor that promise — so it shouldn't inherit from `Rectangle`, no matter how true the math is.

---

### Architectural Solutions That Restore LSP

#### Solution 1: Segregated Read-Only Interface (`Shape`)
Decouple the common read-only behavior (`getArea()`) from mutable dimension setters — `Rectangle` and `Square` both implement `Shape`, but neither inherits from the other:

<Diagram>
<Tree root={
<Box title="Shape «interface»" accent="#818cf8"><Field icon="🔹" code="getArea(): int" variant="neutral" /></Box>
}>
<Box title="Rectangle implements Shape" accent="#60a5fa"><Field icon="↳" code="setWidth(w), setHeight(h)" variant="neutral" /></Box>
<Box title="Square implements Shape" accent="#60a5fa"><Field icon="↳" code="setSide(s)" variant="neutral" /></Box>
</Tree>
</Diagram>

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

### Java: Runnable Verification

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

### Say this in the interview

*"The first call prints 50, the second prints 100 — that's the bug. Square breaks the contract Rectangle establishes: calling setHeight() on a Rectangle is supposed to leave width untouched, but Square's override changes both dimensions together, so width silently becomes 10 too. This is the classic 'is-a' fallacy — a square is mathematically a rectangle, but inheritance in software is about behavioral substitutability, not taxonomy, and a mutable Square can't behave like a mutable Rectangle. The fix is to stop forcing the inheritance: give both a shared read-only Shape interface with just getArea(), or make them immutable value objects so there's no in-place mutation to violate a contract over."*
