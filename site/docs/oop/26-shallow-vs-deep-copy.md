---
id: shallow-vs-deep-copy
title: "Shallow Copy vs Deep Copy"
sidebar_position: 26
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** What is the difference between shallow copy and deep copy?

Here is a top-down breakdown of shallow copy versus deep copy. This is a fundamental concept in programming, particularly when dealing with memory management and state in languages like JavaScript, Python, or Java.

### The Quick-Hit

"A shallow copy creates a new top-level object, but inserts references to the nested objects found in the original. A deep copy creates a new top-level object and recursively creates brand new copies of every nested object, ensuring zero shared memory addresses between the two."

### The ELI5 Analogy: The Briefcase and the House

Imagine you have a briefcase (the top-level object). Inside the briefcase is a shiny coin (a primitive value like an integer) and a piece of paper with the address to a house (a reference to a nested object).

* **Shallow Copy:** You buy a brand new briefcase. You forge a perfect replica of the shiny coin and put it inside. Then, you copy the exact same address onto a new piece of paper and put it in the new briefcase.
**The Result:** You have two briefcases, but they both point to the exact same house. If you use your copied address to go to the house and paint the kitchen red, the owner of the original briefcase will also find a red kitchen.

* **Deep Copy:** You buy a brand new briefcase. You replicate the shiny coin. But instead of copying the address, you hire a construction crew to build an exact physical replica of the entire house on a completely different street. You write this new address down and put it in the new briefcase.
**The Result:** You have two completely independent houses. If you paint the kitchen in the cloned house, the original house remains untouched.

### The Technical Breakdown

Here is how they differ at the memory level:

| Feature | Shallow Copy | Deep Copy |
| --- | --- | --- |
| Top-Level Object | New memory address allocated. | New memory address allocated. |
| Nested Objects | Shares the exact same memory addresses as the original. | New memory addresses allocated recursively. |
| Modification Impact | Changing a nested object in the copy will mutate the original. | Changing a nested object in the copy will not mutate the original. |
| Performance | Fast and uses very little memory. | Slower and consumes more memory (requires recursion and full duplication). |

### Code Proof (JavaScript Example)

Here is exactly how this behaves in code.

**The Setup:**
```javascript
const original = {
    name: "Alice",        // Primitive (like the shiny coin)
    details: {            // Nested Object (like the house address)
        city: "New York"
    }
};
```

**1. Shallow Copy in Action**
In JavaScript, using the spread operator (`...`) creates a shallow copy.
```javascript
const shallow = { ...original };

// Let's modify the copy
shallow.name = "Bob";               // Modifying a primitive
shallow.details.city = "London";    // Modifying a nested object

console.log(original.name);         // "Alice" (Primitives are safely copied)
console.log(original.details.city); // "London" (Wait! The original was mutated!)
```
Why? The `details` object in both `original` and `shallow` points to the exact same location in memory.

**2. Deep Copy in Action**
In modern JavaScript, you can use `structuredClone()` (or `JSON.parse(JSON.stringify())` historically) to create a true deep copy.
```javascript
const deep = structuredClone(original);

// Let's modify the copy
deep.name = "Charlie";
deep.details.city = "Paris";

console.log(original.name);         // "Alice" (Safe)
console.log(original.details.city); // "New York" (Safe! The original is untouched)
```
Why? `structuredClone` traversed the entire object tree and allocated brand new memory for the `details` object inside `deep`. They are completely decoupled.

### Summary for Interviews

If you are asked when to use which: "I default to shallow copies for performance reasons when dealing with flat data structures or when I am intentionally sharing state. I only use deep copies when dealing with complex, nested data where mutating the copy would cause unintended side-effects in the original state, such as in Redux reducers or when freezing initial application configurations."

---

### Crucial Nuance: The Circular Reference Trap

When interviewers ask you to physically code a custom `deepCopy()` function from scratch, they are usually waiting for you to fall into the **Circular Reference Trap**.

Imagine `Object A` has a property that points to `Object B`, and `Object B` has a property that points right back to `Object A`. If you write a naive recursive deep copy function, it will copy A, see B, go copy B, see A, go copy A... entering an infinite loop that instantly crashes the program with a `StackOverflowError`. 

To write a production-grade deep copy function, you must maintain a "visited map" (like a `WeakMap` in JavaScript or an Identity Hash Map in Java) that tracks every memory address you have already copied. Before copying an object, you check the map. If you've seen it before, you simply return the cached copy instead of recurring downwards.
