---
id: aggregation-vs-composition
title: "Aggregation vs Composition"
sidebar_position: 20
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** What is the difference between aggregation and composition? What separates aggregation from composition specifically?

### The Interview Quick-Hit

"Both Aggregation and Composition are specific types of 'Has-A' relationships between classes. The exact factor that separates them is lifecycle dependency (ownership). In Composition, the child object cannot exist independently of the parent; if the parent is destroyed, the child is destroyed. In Aggregation, the child is completely independent; if the parent is destroyed, the child continues to exist."

### The ELI5 Analogy

1. **Composition (Strong Ownership  -  "Part-of")** Think of a House and a Room. A room is a physical part of the house. If a bulldozer comes and demolishes the House (the parent), the Room (the child) is instantly destroyed with it. The room has no independent meaning or existence outside of that specific house.
2. **Aggregation (Weak Ownership  -  "Has-a")** Think of a University and a Professor. A university has a professor. However, if the university goes bankrupt and closes its doors (the parent is destroyed), the professor does not cease to exist. The professor simply packs up and gets a job at a new university. They are associated, but their lifecycles are completely independent.

### How to Tell Them Apart in Code

In technical interviews, you prove you understand the difference by how you write the constructors.

#### Composition (Child created inside the parent)

Because the child's life is strictly tied to the parent, the parent is responsible for creating it. The child is instantiated directly inside the parent's constructor.

```java
class Engine {
    public void start() { System.out.println("Engine starting..."); }
}

class Car {
    // The Car physically owns the Engine
    private Engine engine;

    public Car() {
        // COMPOSITION: The Car creates the Engine itself.
        // If this Car object is garbage collected, the Engine dies with it.
        this.engine = new Engine();
    }
}
```

#### Aggregation (Child passed into the parent)

Because the child can exist independently, it is created somewhere else in the program and simply passed into the parent (usually via constructor injection or a setter method).

```java
class Professor {
    public String name;
    public Professor(String name) { this.name = name; }
}

class University {
    // The University borrows the Professor
    private Professor professor;

    // AGGREGATION: The Professor already exists outside. 
    // We just pass the reference in.
    public University(Professor professor) {
        this.professor = professor;
    }
}

// Execution
Professor drSmith = new Professor("Dr. Smith"); // Exists independently
University nitk = new University(drSmith); // Nitk aggregates Dr. Smith

// If nitk is destroyed, drSmith still exists in memory!
```

### The Backend / Database Reality

If you want to sound like a senior backend engineer, tie this concept directly to databases:

- **Composition in SQL:** This is a **Cascading Delete**. If you delete a Post on Reddit, the database automatically deletes all the Comments attached to it. The comments cannot exist without the post.
- **Aggregation in SQL:** This is a **Nullable Foreign Key**. If you delete a Department in a company database, you do not delete the Employees inside it. You simply set their `department_id` to `NULL` so they can be reassigned later.

---

### Crucial Nuance: Domain-Driven Design (DDD) and Aggregate Roots

In modern microservices and Domain-Driven Design (DDD), Composition isn't just about memory—it's about strict **consistency boundaries**. When objects are bound by composition, they form an *Aggregate*, and the parent object becomes the *Aggregate Root*. 

The strict rule of an Aggregate is that external services are absolutely forbidden from interacting directly with the child components; they must go through the Root. For example, if a `ShoppingCart` (Root) is composed of `CartItems` (Children), an external API cannot directly modify the price of a `CartItem`. It must call `shoppingCart.updateItemPrice()`. This guarantees that the parent can enforce business rules (like recalculating the total tax or validating inventory) before the child state changes, which would be impossible to guarantee in a loose aggregation structure.
