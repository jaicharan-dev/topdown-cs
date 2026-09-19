---
id: 8-code-trace-rectangle-square-lsp
title: "Code trace: Rectangle/Square LSP violation"
description: "An interview-focused code trace demonstrating the classic Liskov Substitution Principle violation using the Rectangle and Square example."

sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** What does each call print? And explain exactly why this is a real Liskov Substitution Principle violation  -  not just "Square is weird," but why Square genuinely fails to substitute for Rectangle here, given that resizeRectangle() has no idea which one it received.
>
> ```java
> class Rectangle  {
>     protected int width;
>     protected int height;
>     void setWidth(int width)  {
>         this.width = width;
>     }
>     void setHeight(int height)  {
>         this.height = height;
>     }
>     int getArea()  {
>         return width * height;
>     }
> }
> class Square extends Rectangle  {
>     @Override void setWidth(int width)  {
>         this.width = width;
>         this.height = width;
>     }
>     @Override void setHeight(int height)  {
>         this.width = height;
>         this.height = height;
>     }
> }
> void resizeRectangle(Rectangle r)  {
>     r.setWidth(5);
>     r.setHeight(10);
>     System.out.println(r.getArea());
> }
> resizeRectangle(new Rectangle());
> resizeRectangle(new Square());
> ```

### The Interview Quick-Hit

"The first call prints 50, and the second call prints 100. This is the classic Liskov Substitution Principle violation because Square breaks the fundamental behavioral contract of Rectangle. The client method `resizeRectangle` assumes that width and height are completely independent variables. When Square silently mutates the width during a `setHeight` call, it breaks the client's expectations, proving that Square cannot safely substitute for Rectangle."

### Execution Trace & Output

```text
50
100
```

### Step-by-step breakdown:
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

### How to Fix It?
If you are asked how to fix this codebase, the answer is to remove the inheritance entirely. Both `Rectangle` and `Square` should implement a common interface called `Shape` with a `getArea()` method. They manage their own internal state independently, and the client code never assumes it can mutate them using the same rules.

---

### Crucial Nuance: Immutability as a Workaround

One often-overlooked workaround to this classic problem is making the `Rectangle` and `Square` classes entirely immutable. If neither class exposes `setWidth` or `setHeight` methods, and instead requires generating a brand new object for any dimension changes, the LSP violation disappears. Since the client can no longer mutate the state unexpectedly, `Square` can safely inherit from `Rectangle` without breaking behavioral contracts.
