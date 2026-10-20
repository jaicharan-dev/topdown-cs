---
id: 12-er-diagrams-entities-attributes-relationships
title: "ER Modeling: Entities, Attributes, Cardinalities & Schema Translation"
description: "Understand Entity-Relationship (ER) diagrams, Chen vs. Crow's Foot notations, weak entities, and rules for converting ER models into relational SQL schemas."
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is an ER diagram? Compare Chen's notation with Crow's Foot notation, explain strong vs. weak entities and participation constraints, and detail the exact rules for converting an ER model into a relational database schema."

Before you write a single `CREATE TABLE`, you sketch the shape of your data: what things exist, what they're called, and how they connect to each other. That sketch is an **ER (Entity-Relationship) diagram** — a blueprint you draw before the real tables exist.

<Diagram>
<Row>
<Box title="Customer" accent="#60a5fa">
<Field icon="👤" code="customer_id (PK)" variant="neutral" />
</Box>
<Arrow label="places" />
<Box title="Order" accent="#34d399">
<Field icon="📦" code="order_id (PK), customer_id (FK)" variant="neutral" />
</Box>
</Row>
</Diagram>

That picture already has all three ER building blocks:
- **Entities** — the things: `Customer`, `Order`, `Product`.
- **Attributes** — their properties: `email`, `unit_price`.
- **Relationships** — how they connect: *Customer places Order*.

---

### Two ways people draw this: Chen's notation vs. Crow's Foot

Chen's notation is the academic one — rectangles for entities, diamonds for relationships, ovals for attributes. Crow's Foot is what you'll actually see in real tools (dbdiagram, MySQL Workbench) — plain boxes with a fork-shaped ("crow's foot") symbol showing "many."

| Element | Chen's Notation | Crow's Foot Notation |
| :--- | :--- | :--- |
| **Strong entity** | Single rectangle | Box with an entity-name header |
| **Weak entity** | Double rectangle | Rounded box or dependent line |
| **Relationship** | Diamond | Connecting line labeled with a verb |
| **Identifying relationship** | Double diamond | Solid line (child table holds parent's PK) |
| **Key attribute** | Underlined text in an oval (`name`) | `PK` symbol in the header |
| **Multivalued attribute** | Double oval | Normalized into its own child table |
| **Derived attribute** | Dashed oval | Computed column, or not modeled at all |

**Crow's foot cardinality symbols**, read at the end nearest the "many" side:
- `||` — exactly one (mandatory, single)
- `|o` — zero or one (optional, single)
- `}|` — one or more (mandatory, many)
- `}o` — zero or more (optional, many)

---

### Strong vs. weak entities, and "does this have to exist?"

**Strong entity:** stands on its own. Its primary key comes entirely from its own columns — `Employee(emp_id)`.

**Weak entity:** can't be identified by itself. It only makes sense attached to a parent — a `Dependent` only exists because an `Employee` exists. Its key is a **partial key** combined with the parent's primary key.

**Total vs. partial participation** is just "does every row of this entity have to be in the relationship?"
- **Total (mandatory):** every `Order` must belong to a `Customer` — becomes a `NOT NULL` foreign key.
- **Partial (optional):** a `Customer` can exist with zero orders — the foreign key can be nullable, or there's simply no row yet.

---

### Turning the diagram into real tables: 6 rules

#### Rule 1: Strong entities
One table per strong entity. The entity's key becomes the table's `PRIMARY KEY`.

#### Rule 2: Weak entities
One table, whose primary key is the **parent's key + the partial key**:
$$\text{PK}(\text{Weak}) = \text{Parent\_PK} + \text{Partial\_Key}$$
The foreign key back to the parent should use `ON DELETE CASCADE`, since a weak entity can't outlive its parent.

#### Rule 3: 1:1 relationships
Put one entity's primary key as a foreign key in the other table, and mark it `UNIQUE`. If one side has total participation, put the `NOT NULL UNIQUE` foreign key there to avoid nulls.

#### Rule 4: 1:N relationships
Put the primary key from the "one" side as a foreign key on the "many" side.

#### Rule 5: M:N relationships
You can't represent many-to-many directly in a relational table. Create a **junction table** holding foreign keys to both sides, with the pair of them as its composite primary key.

#### Rule 6: Multivalued attributes
Pull it out into its own child table: the parent's primary key (as a foreign key), plus the value.

---

### Say this in the interview

*"An ER diagram models entities, their attributes, and how they relate, before you write any SQL. Chen's notation is the academic, geometric version — rectangles, diamonds, ovals. Crow's Foot is what's actually used in industry tools. Strong entities have their own key; weak entities borrow their parent's key plus a partial key, and cascade-delete with it. To turn the diagram into tables: strong entities become standalone tables, 1:N relationships put the 'one' side's key on the 'many' side, and M:N relationships need a junction table whose primary key is both foreign keys together."*

---

### Code: a full ER model translated into SQL

The following SQL DDL translates a complete ER model — Customer, Order, Product, a weak-entity line item, and a Student-Course M:N junction — into real tables with primary, composite, and foreign key constraints.

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
