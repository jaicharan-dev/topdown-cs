---
id: 27-aggregation-vs-composition
title: "Aggregation vs. Composition: Lifecycle & Encapsulation"
description: "Clarify aggregation vs composition, lifecycle ownership, UML notations, defensive copying, and Domain-Driven Design aggregate roots."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Both aggregation and composition represent a 'has-a' association. What is the precise boundary separating them in terms of lifecycle dependency, UML notation, and defensive copying?"

Both describe one object holding onto another. The only question that actually separates them: **if the container is destroyed, does the part die with it, or does it keep existing on its own?**

- A `Department` has `Professor`s. Close the department, and the professors still exist — they just move elsewhere. That's **aggregation**: a weak "has-a".
- A `House` has `Room`s. Demolish the house, and the rooms go with it — they can't exist on their own. That's **composition**: a strong "has-a".

### The ownership spectrum

<Diagram>
<Row>
<Box title="Association" accent="#a1a1aa"><Field icon="🔗" code="just interacts with another object" hint="e.g. a Student and a Course — neither owns the other" variant="neutral" /></Box>
<Arrow />
<Box title="Aggregation" accent="#f59e0b"><Field icon="📎" code="HAS-A, but can live independently" hint="e.g. a Department has Professors who outlive it" variant="neutral" /></Box>
<Arrow />
<Box title="Composition" accent="#fb7185"><Field icon="🔒" code="HAS-A, and owns the lifecycle" hint="e.g. a House's Rooms die with the House" variant="neutral" /></Box>
</Row>
</Diagram>

- **Association:** the loosest link. Two classes just interact — a `Customer` places an `Order`. Neither one owns the other.
- **Aggregation (weak has-a):** a whole/part relationship where the part survives on its own.
- **Composition (strong has-a):** real ownership. The part's lifetime is tied to the whole.

### Comparison

| Feature | Aggregation (Weak Association) | Composition (Strong Association) |
| :--- | :--- | :--- |
| **Relationship** | "Has-A" | "Part-Of" |
| **Lifecycle Dependency** | **Independent**: Child survives parent's destruction. | **Bound**: Child dies when parent is garbage collected. |
| **Ownership** | **Shared**: Multiple objects can hold references to the child. | **Exclusive**: The parent is the sole owner of the child component. |
| **UML Symbol** | **Hollow Diamond (`◇`)** on the owner side. | **Filled/Solid Diamond (`♦`)** on the owner side. |
| **Instantiation** | Passed in from outside (constructor/setter injection). | Instantiated internally inside parent or created via private factory. |
| **Database Equivalent** | **Nullable Foreign Key** (deleting a Department sets `dept_id = NULL`). | **Cascading Delete** (`ON DELETE CASCADE` deletes child rows). |

---

### How this looks on a UML whiteboard

Interviewers like you to draw this, so it's worth knowing the two symbols by heart:

- **Hollow diamond (`◇`)** on the owner side → aggregation. The professor exists outside the department.
- **Solid diamond (`♦`)** on the owner side → composition. A room can't float in a vacuum without a house.

```text
Department ◇──── Professor      (aggregation — the professor survives)
House      ♦──── Room           (composition — the room is destroyed with the house)
```

---

### The trap: a getter can quietly turn composition into aggregation

> **Staff-level trap:** creating a child object inside a parent class does **not** automatically give you composition — not if you leak a reference to it.

```java
public class Car {
    private final Engine engine = new Engine();
    public Engine getEngine() { return this.engine; } // LEAK!
}
```

Anyone can now do `Engine leaked = car.getEngine()`. Even after `car` is garbage collected, that `Engine` object is still alive and reachable — it survived the thing that supposedly "owned" it. The relationship has quietly degraded from composition into aggregation, by accident.

#### The fix: defensive copying

1. **Don't accept external mutable references directly** — copy them deeply in the constructor instead.
2. **Don't return internal mutable references directly** — return a deep copy, or an unmodifiable view, from getters.

---

### A modern version of the same idea: DDD Aggregate Roots

Domain-Driven Design uses the same ownership rule at a bigger scale. The parent object becomes the **Aggregate Root**, and nothing outside is allowed to touch its children directly — no holding a pointer to a child, no mutating one on the side. Every change (adding an item, recalculating a total) has to go through the root, so it can enforce its own business rules and keep everything consistent.

---

### Say this in the interview

*"Aggregation and composition both model whole-part relationships, but they differ in lifecycle. In aggregation (hollow diamond `◇`), the child has an independent lifecycle and can be shared — a University has Professors, and if the University closes, the Professors keep existing. In composition (solid diamond `♦`), the child is exclusively owned and dies with the parent — like `ON DELETE CASCADE` in a database. The trap is that composition is easy to break by accident: if a class builds a child internally but leaks the raw reference through a getter, external code can keep that child alive past the parent's lifetime, quietly turning composition into aggregation."*

---

### Code: composition, aggregation, and defensive copying side by side

<Tabs>
<TabItem value="java" label="AssociationDemo.java" default>

```java
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AssociationDemo {

    // 1. Independent Component
    static class Professor {
        public String name;
        public Professor(String name) { this.name = name; }
    }

    // 2. AGGREGATION: University aggregates Professor (Weak Ownership)
    static class University {
        private final List<Professor> faculty;

        // Injected from outside: University does not own the professor's lifecycle
        public University(List<Professor> faculty) {
            this.faculty = faculty;
        }

        public List<Professor> getFaculty() { return faculty; }
    }

    // 3. Dependent Component
    static class Room {
        public String roomNumber;
        public Room(String roomNumber) { this.roomNumber = roomNumber; }
        // Copy constructor for defensive copying
        public Room(Room other) { this.roomNumber = other.roomNumber; }
    }

    // 4. COMPOSITION: House exclusively owns Rooms (Strong Ownership)
    static class House {
        private final List<Room> rooms = new ArrayList<>();

        public House(List<String> roomNumbers) {
            // Internally manages lifecycle
            for (String num : roomNumbers) {
                this.rooms.add(new Room(num));
            }
        }

        // DEFENSIVE COPYING: Prevents callers from escaping internal state
        public List<Room> getRoomsDefensive() {
            List<Room> copies = new ArrayList<>();
            for (Room r : rooms) copies.add(new Room(r));
            return Collections.unmodifiableList(copies);
        }
    }

    public static void main(String[] args) {
        System.out.println("--- 1. Testing Aggregation ---");
        Professor drSmith = new Professor("Dr. Smith");
        List<Professor> profs = new ArrayList<>();
        profs.add(drSmith);

        University uni = new University(profs);
        uni = null; // University destroyed!

        // drSmith still exists independently in memory!
        System.out.println("Professor survived university destruction: " + drSmith.name);

        System.out.println("\n--- 2. Testing Composition & Encapsulation ---");
        List<String> rooms = List.of("Master Bedroom", "Kitchen", "Living Room");
        House house = new House(rooms);

        // Accessing rooms defensively
        List<Room> safeRooms = house.getRoomsDefensive();
        System.out.println("House contains " + safeRooms.size() + " rooms.");
        // safeRooms cannot mutate house internals!
    }
}
```

</TabItem>
</Tabs>
