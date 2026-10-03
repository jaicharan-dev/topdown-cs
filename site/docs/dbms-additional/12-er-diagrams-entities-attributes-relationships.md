---
id: 12-er-diagrams-entities-attributes-relationships
title: "ER Modeling: Entities, Attributes, Cardinalities & Schema Translation"
description: "Understand Entity-Relationship (ER) diagrams, Chen vs. Crow's Foot notations, weak entities, and rules for converting ER models into relational SQL schemas."
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is an ER diagram? Compare Chen's notation with Crow's Foot notation, explain strong vs. weak entities and participation constraints, and detail the exact rules for converting an ER model into a relational database schema."

---

### What is an Entity-Relationship (ER) Diagram?

An **Entity-Relationship (ER) Diagram** is a conceptual blueprint that models the logical structure of a database system before physical implementation. It defines:
- **Entities:** Real-world domain objects (e.g., `Customer`, `Order`, `Product`).
- **Attributes:** Properties and characteristics of entities (e.g., `email`, `unit_price`).
- **Relationships:** Associations connecting entities (e.g., *Customer places Order*).

---

### Notation Standards: Chen's Notation vs. Crow's Foot

Database architects primarily encounter two visual modeling standards:

```mermaid
graph TD
    subgraph "Chen's Notation (Academic / Conceptual)"
        E1[Rectangle: Entity] --- R1{Diamond: Relationship}
        R1 --- E2[Rectangle: Entity]
        E1 --- A1((Oval: Attribute))
        E1 --- A2(((Double Oval: Multi-valued)))
    end

    subgraph "Crow's Foot Notation (Industry / Physical)"
        T1["Table A (PK, FK)"] -->|}| T2["Table B (Many side)"]
    end
```

| Element | Chen's Notation (Conceptual) | Crow's Foot Notation (Industry Physical) |
| :--- | :--- | :--- |
| **Strong Entity** | Single Rectangle | Box with Entity Name header |
| **Weak Entity** | **Double Rectangle** | Rounded box or dependent line |
| **Relationship** | **Diamond** | Connecting line labeled with verb phrase |
| **Identifying Relationship**| **Double Diamond** | Solid line (child table contains parent PK) |
| **Key Attribute** | Underlined text inside Oval (`name`) | `PK` symbol in top compartment |
| **Multivalued Attribute** | **Double Oval** | Normalized into a separate child table |
| **Derived Attribute** | **Dashed Oval** | Computed column or not modeled |

#### Crow's Foot Cardinality Symbols:
- `||` : **Exactly One** (Mandatory, Single)
- `|o` : **Zero or One** (Optional, Single)
- `}|` : **One or More** (Mandatory, Many)
- `}o` : **Zero or More** (Optional, Many)

---

### Entity Classifications & Participation

#### 1. Strong vs. Weak Entities
- **Strong Entity:** Possesses an independent identity. Its primary key consists entirely of its own attributes (e.g., `Employee(emp_id)`).
- **Weak Entity:** Cannot be uniquely identified by its own attributes alone. It depends on the existence of an identifying parent strong entity (e.g., `Dependent(emp_id, dependent_name)`). It uses a **partial key (discriminator)** combined with the parent's primary key to form a composite identifier.

#### 2. Total vs. Partial Participation Constraints
- **Total Participation (Mandatory, double line in Chen):** Every instance of the entity **must** participate in the relationship. For example, every `Order` must be placed by a `Customer` (translates to a `NOT NULL` foreign key in SQL).
- **Partial Participation (Optional, single line in Chen):** An entity instance can exist without participating. For example, a `Customer` can exist in the system without having placed any `Order` yet.

---

### The 6 Rules for Converting an ER Model to a Relational Schema

Interviewers frequently ask candidates to convert conceptual ER diagrams into production DDL tables:

#### Rule 1: Strong Entities
Convert each strong entity into a distinct table. The primary key of the entity becomes the `PRIMARY KEY` of the table.

#### Rule 2: Weak Entities
Create a table for the weak entity. Its primary key is a **composite key** composed of the identifying parent's primary key plus the weak entity's partial key:
$$\text{PK}(\text{Weak}) = \text{Parent\_PK} + \text{Partial\_Key}$$
The parent foreign key must include `ON DELETE CASCADE`.

#### Rule 3: 1:1 Relationships
Place the primary key of one entity as a foreign key in the other table, marking it `UNIQUE`.
- *Optimization:* If participation is total on one side, place the `NOT NULL UNIQUE` foreign key on the total side to eliminate `NULL` values.

#### Rule 4: 1:N Relationships
Place the primary key of the entity on the **"One" side** as a foreign key in the table on the **"Many" side**.

#### Rule 5: M:N (Many-to-Many) Relationships
Relational databases cannot represent M:N directly. Create an **Associative / Junction Table**:
- The junction table contains foreign keys referencing both participating entities.
- The `PRIMARY KEY` of the junction table is the **composite pair of both foreign keys**.

#### Rule 6: Multivalued Attributes
Extract the multivalued attribute into a new child table consisting of the parent's primary key (as a foreign key) and the attribute value.

---

### The Interview Answer (60-90 seconds)

> "An ER diagram is a high-level conceptual model representing real-world entities, attributes, and relationship cardinalities.
>
> While Chen's notation uses geometric shapes (rectangles for entities, diamonds for relationships, and ovals for attributes), Crow's Foot notation is the industry standard for physical relational design.
>
> In ER modeling, strong entities have independent primary keys, whereas weak entities rely on an identifying strong entity, combining the parent's primary key with a local discriminator to form a composite key with cascading deletes. Participation constraints dictate whether a relationship is mandatory (`NOT NULL`) or optional (`NULL` allowed).
>
> When translating an ER model to SQL tables: strong entities become standalone tables; 1:N relationships place the 'one' side's primary key as a foreign key on the 'many' side; and M:N relationships require creating an associative junction table with a composite primary key consisting of both foreign keys."

---

### Code Demonstration: Translating Complete ER Model into SQL Schema

The following executable SQL DDL translates a complete ER diagram (Customer, Order, Product, OrderLineItem weak entity, and Student-Course M:N junction) into PostgreSQL/MySQL schema with proper primary, composite, and foreign key constraints.

```sql
-- 1. Strong Entity: Customers
CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL
);

-- 2. Strong Entity: Products
CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

-- 3. 1:N Relationship: Orders placed by Customers (Total Participation: customer_id NOT NULL)
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) 
        ON DELETE RESTRICT
);

-- 4. Weak Entity / M:N Junction Component: OrderLineItems
-- Relies on identifying parent 'Orders'; Composite PK = (order_id, item_seq)
CREATE TABLE OrderLineItems (
    order_id INT NOT NULL,
    item_seq INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_at_order NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (order_id, item_seq),
    CONSTRAINT fk_lineitem_order 
        FOREIGN KEY (order_id) REFERENCES Orders(order_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_lineitem_product 
        FOREIGN KEY (product_id) REFERENCES Products(product_id) 
        ON DELETE RESTRICT
);

-- 5. M:N Relationship: Students to Courses (Junction Table)
CREATE TABLE Students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE Courses (
    course_code VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL
);

-- Associative Table resolving M:N
CREATE TABLE CourseEnrollments (
    student_id INT NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (student_id, course_code),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES Courses(course_code) ON DELETE CASCADE
);
```
