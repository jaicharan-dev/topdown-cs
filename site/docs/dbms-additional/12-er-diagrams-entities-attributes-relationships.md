---
id: 12-er-diagrams-entities-attributes-relationships
title: "ER Diagrams: Entities, Attributes & Relationships"
description: "Modelling the business before any table exists, and the mechanical rules that turn the picture into a schema"

sidebar_position: 12
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is an ER diagram? Compare Chen's notation with Crow's Foot notation, explain strong vs. weak entities and participation constraints, and detail the exact rules for converting an ER model into a relational database schema."

---

### Picture it

Before anyone builds a filing system, somebody sits down and writes out **what the business actually deals with**.

There are **things**: customers, orders, products. There are **facts about those things**: a customer has a name and an address. And there are **connections**: a customer places an order, an order contains products.

That is the entire vocabulary, and the point of writing it down first is that it is about **the business**, not about tables. You can show it to someone who has never seen a database and ask "is this right?"

**Two details turn out to matter more than they look.**

**Some things cannot stand alone.** "Line 3" of an order is not a thing in the world; it is meaningless without the order it belongs to, and "line 3" of a different order is something else entirely. Identifying it requires naming the order **and** the line number together, and if the order is destroyed, line 3 goes with it. That is different in kind from a customer, who exists whether or not they ever order anything.

**And some connections are compulsory while others are not.** Every order **must** belong to a customer; an order with no customer is nonsense. But a customer need not have placed an order. Same connection, compulsory from one end and optional from the other, and that asymmetry has to be written down because it decides whether a field may be left blank.

**Then comes the mechanical part.** Turning the picture into tables is not a matter of judgement; it is a short list of rules applied in order. The one worth understanding rather than memorising is this: when one customer has many orders, the **link is recorded on the order**, because a single field can hold one value, so an order can name one customer and no more. **The structure itself enforces the "one" side.** Try to record it on the customer and you would need somewhere to put many values, which is exactly the mess the rules exist to prevent.

---

### The proper terms

#### What an ER diagram is

An **ER diagram**, an entity-relationship diagram, models data at the **conceptual level**, before any schema exists. It has three building blocks:

**Entities**, the things of interest: `Customer`, `Order`, `Product`. An entity type is the template; an entity instance is one occurrence.

**Attributes**, the properties of an entity: `name`, `price`, `order_date`. One or more form the **key**.

**Relationships**, the associations between entities: a customer places an order.

Its value is that it is about the **business domain** rather than storage, so a non-technical stakeholder can read it and tell you it is wrong, which is far cheaper than discovering it after the schema is built.

Attributes come in kinds that each convert differently:

**Simple**, atomic: `age`.

**Composite**, decomposable: `address` into street, city, postcode.

**Multivalued**, several values per instance: `phone_numbers`.

**Derived**, computable from others: `age` from `date_of_birth`.

**Key**, uniquely identifying an instance.

#### Chen notation against Crow's Foot

**Chen's notation**, the original, gives **every element its own shape**:

**Rectangles** for entities, **ellipses** for attributes, **diamonds** for relationships, connected by lines, with cardinality written on the lines as `1`, `N` or `M`.

**Double rectangle** for a weak entity, **double diamond** for an identifying relationship, **double line** for total participation, a **dashed underline** for a partial key.

It is **explicit and complete**, and it is **enormous**: every attribute is a separate bubble, so a ten-entity model will not fit on a page. It survives mainly in teaching.

**Crow's Foot notation**, the practical standard, is compact:

**Rectangles for entities with attributes listed inside**, which removes most of the clutter at a stroke.

**Relationships are lines**, and the symbols **at each end** encode **cardinality and participation together**:

```text
  ||     exactly one          (one, mandatory)
  O|     zero or one          (one, optional)
  }|     one or more          (many, mandatory)
  }O     zero or more         (many, optional)
```

The **crow's foot**, the three prongs, means **many**. The **bar** means **one**. The **circle** means **zero**, that is, optional. The symbol **nearest the entity** describes **participation**; the outer part describes **cardinality**.

Every modern modelling tool uses it, which is the practical reason to know it.

#### Strong and weak entities

**A strong entity** has a key made of **its own attributes** and exists independently. `Customer` is identified by `customer_id` and needs nothing else.

**A weak entity cannot be identified by its own attributes alone.** It depends on an **owner**, reached through an **identifying relationship**, and its key is the **owner's key plus its own partial key**, also called a **discriminator**.

The classic examples: an `OrderLine` is weak with respect to `Order`, since "line 3" means nothing without the order; a `Room` is weak with respect to `Building`; a `Dependent` is weak with respect to `Employee`.

Three properties follow, and all three carry into the schema:

**Its participation in the identifying relationship is always total.** A weak entity cannot exist unowned.

**Its key is composite**, combining the owner's key with the discriminator.

**It is deleted with its owner**, which becomes `ON DELETE CASCADE`.

The test to apply: **is this thing identifiable without naming its owner?** If not, it is weak.

#### Participation constraints

**Participation** says whether an entity **must** take part in a relationship.

**Total**, or mandatory: **every** instance participates. Drawn in Chen as a **double line**, and in Crow's Foot by the **bar** nearest the entity.

**Partial**, or optional: participation is optional. Chen uses a **single line**; Crow's Foot uses the **circle**.

It is normally **asymmetric**, which is exactly why it has to be recorded: every `Loan` must have a `Customer`, while a `Customer` need not have a `Loan`.

And the reason it matters mechanically: **participation decides nullability.** Total participation on the side carrying the foreign key means the column is **`NOT NULL`**; partial means it is nullable.

#### Converting an ER model to a relational schema

The rules, in the order you apply them.

**1. Strong entity.** One table. Simple attributes become columns, and the key becomes the **primary key**.

**2. Weak entity.** One table whose **primary key is the owner's key plus the discriminator**, with a foreign key to the owner, declared `NOT NULL` and usually `ON DELETE CASCADE`.

**3. Composite attribute.** Flatten it into separate columns, `address` becoming `street`, `city`, `postcode`. Give it its own table only if you must query or reuse the parts independently.

**4. Multivalued attribute.** A **separate table** holding the owner's key and the value, with both together as the primary key. This is simply 1NF: a repeating group cannot live in a column.

**5. Derived attribute.** Normally **not stored**. Compute it on read, or use a **generated column** so the engine maintains it.

**6. One-to-one relationship.** Put the foreign key on **either** side, preferring the side with **total participation** so the column can be `NOT NULL`, and add a **`UNIQUE`** constraint on it, which is what makes it one-to-one rather than one-to-many. If **both** sides are total, consider merging the two entities into one table.

**7. One-to-many relationship.** Put the foreign key on the **many** side, referencing the one side. Never create a separate table for it: a junction table would permit a child to have two parents, which is exactly the cardinality you are trying to forbid. **`NOT NULL`** if the many side's participation is total. The structure enforces the cardinality, because a column holds one value.

**8. Many-to-many relationship.** A **junction table** with foreign keys to both entities and a composite primary key of the two. Any attributes **of the relationship itself**, such as `quantity` on "order contains product", belong here, because they are properties of the pairing rather than of either entity.

**9. Relationship attributes.** On the **junction table** for many-to-many, on the **many side** for one-to-many.

**10. Ternary relationships.** A junction table with **three** foreign keys. Use one only when the relationship genuinely cannot be decomposed into binary relationships without losing meaning, which is rarer than people think.

**11. Generalisation and specialisation**, an **ISA** hierarchy, has three options:

**Single table** with a discriminator column and nullable columns for every subtype's attributes. Fast, no joins, and permits nulls that nothing prevents being wrong.

**Table per subtype**, each sharing the supertype's primary key as its own and as a foreign key. Normalised and null-free, at the cost of a join per query.

**Table per concrete class**, duplicating the supertype's columns in each. No joins, and the supertype's attributes are duplicated, so a query across all subtypes needs a `UNION`.

The trade is **nulls against joins against duplication**, and the right answer depends on how often you query across the whole hierarchy.

---

### In code

```text
The three building blocks, and why you draw this before any schema:

  ENTITIES       the things: Customer, Order, Product
  ATTRIBUTES     their properties: name, price, order_date
  RELATIONSHIPS  the associations: a customer PLACES an order

  its value is that it is about the BUSINESS DOMAIN rather than
  storage, so a non-technical stakeholder can read it and tell you
  it is wrong, which is far cheaper than discovering it after the
  schema is built.

  attribute kinds, each of which converts differently:
     SIMPLE       atomic                     age
     COMPOSITE    decomposable               address -> street, city
     MULTIVALUED  several per instance       phone_numbers
     DERIVED      computable from others     age from date_of_birth
     KEY          uniquely identifying
```

```text
Chen vs Crow's Foot:

  CHEN: every element gets its own shape

     [ Customer ]-----<places>-----[ Order ]
          |         1          N        |
       (name)                        (order_date)
          |
       (address)--(street)
                --(city)

     double rectangle   weak entity
     double diamond     identifying relationship
     double line        total participation
     dashed underline   partial key

     EXPLICIT AND COMPLETE, and ENORMOUS: every attribute is a
     separate bubble, so a ten-entity model will not fit on a page.
     It survives mainly in teaching.

  CROW'S FOOT: the practical standard

     +--------------+                    +--------------+
     | Customer     |                    | Order        |
     |--------------|||------------O{    |--------------|
     | customer_id  |                    | order_id     |
     | name         |                    | order_date   |
     | address      |                    | customer_id  |
     +--------------+                    +--------------+
       "exactly one customer"        "zero or more orders"

     attributes LISTED INSIDE the rectangle, removing the clutter.
     the symbols AT EACH END encode CARDINALITY AND PARTICIPATION
     TOGETHER:

        ||    exactly one      (one, mandatory)
        O|    zero or one      (one, optional)
        }|    one or more      (many, mandatory)
        }O    zero or more     (many, optional)

     the CROW'S FOOT (three prongs) = MANY
     the BAR                        = ONE
     the CIRCLE                     = ZERO, i.e. optional
     the symbol NEAREST THE ENTITY describes PARTICIPATION
```

```text
Strong vs weak entities:

  STRONG   keyed by ITS OWN attributes, exists independently
           Customer(customer_id) needs nothing else

  WEAK     CANNOT be identified by its own attributes alone
           depends on an OWNER via an IDENTIFYING RELATIONSHIP
           key = OWNER'S KEY + its own PARTIAL KEY (discriminator)

           OrderLine is weak w.r.t. Order:
              "line 3" means NOTHING without the order, and line 3
              of another order is a different thing entirely
           Room is weak w.r.t. Building
           Dependent is weak w.r.t. Employee

  three properties, all of which carry into the schema:
     participation in the identifying relationship is ALWAYS TOTAL
        (a weak entity cannot exist unowned)
     the key is COMPOSITE: owner's key + discriminator
     it is DELETED WITH ITS OWNER -> ON DELETE CASCADE

  the test: IS THIS THING IDENTIFIABLE WITHOUT NAMING ITS OWNER?
            if not, it is weak.
```

```text
Participation constraints, and why they matter mechanically:

  TOTAL (mandatory)   EVERY instance participates
                      Chen: DOUBLE LINE
                      Crow's Foot: the BAR nearest the entity

  PARTIAL (optional)  participation is optional
                      Chen: SINGLE LINE
                      Crow's Foot: the CIRCLE

  it is normally ASYMMETRIC, which is exactly why it must be
  recorded:
     every Loan MUST have a Customer        total on Loan
     a Customer NEED NOT have a Loan        partial on Customer

  and the mechanical consequence:
     PARTICIPATION DECIDES NULLABILITY.
     total participation on the side carrying the FK -> NOT NULL
     partial -> nullable
```

```sql
-- RULE 1: strong entity -> a table, its key -> the PK
CREATE TABLE customers (
    customer_id BIGINT PRIMARY KEY,
    name        TEXT NOT NULL,
    -- RULE 3: composite attribute -> FLATTENED into columns
    street      TEXT, city TEXT, postcode TEXT
);

-- RULE 4: multivalued attribute -> a SEPARATE TABLE.
-- this is simply 1NF: a repeating group cannot live in a column.
CREATE TABLE customer_phones (
    customer_id BIGINT REFERENCES customers(customer_id),
    phone       TEXT,
    PRIMARY KEY (customer_id, phone)
);

-- RULE 7: one-to-many -> the FK goes on the MANY side
CREATE TABLE orders (
    order_id    BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL      -- NOT NULL because an order's
                REFERENCES customers(customer_id),   -- participation
    order_date  DATE NOT NULL        -- is TOTAL
);
-- THE STRUCTURE ENFORCES THE CARDINALITY: a column holds ONE value,
-- so an order can name one customer and no more.
-- NEVER use a junction table here: it would permit a child to have
-- TWO parents, which is exactly the cardinality you are forbidding.

-- RULE 2: weak entity -> PK is the owner's key + the discriminator
CREATE TABLE order_lines (
    order_id    BIGINT REFERENCES orders(order_id) ON DELETE CASCADE,
    line_no     INT,                        -- the DISCRIMINATOR
    product_id  BIGINT NOT NULL REFERENCES products(product_id),
    quantity    INT NOT NULL,
    PRIMARY KEY (order_id, line_no)         -- COMPOSITE
);
```

```sql
-- RULE 8: many-to-many -> a JUNCTION TABLE, PK = both FKs
CREATE TABLE student_courses (
    student_id BIGINT REFERENCES students(student_id),
    course_id  BIGINT REFERENCES courses(course_id),
    -- RULE 9: attributes OF THE RELATIONSHIP live here, because they
    -- are properties of the PAIRING rather than of either entity
    enrolled_on DATE NOT NULL,
    grade       TEXT,
    PRIMARY KEY (student_id, course_id)
);
CREATE INDEX ON student_courses (course_id);   -- the other direction

-- RULE 6: one-to-one -> FK on EITHER side, preferring the TOTAL one
-- so it can be NOT NULL, plus UNIQUE, which is what makes it 1:1
CREATE TABLE user_profiles (
    profile_id BIGINT PRIMARY KEY,
    user_id    BIGINT NOT NULL UNIQUE      -- UNIQUE: 1:1, not 1:N
               REFERENCES users(user_id),
    bio        TEXT
);
-- if BOTH sides are total, consider merging into one table.

-- RULE 5: derived attribute -> not stored, or a GENERATED column
ALTER TABLE customers
  ADD COLUMN age INT GENERATED ALWAYS AS
      (EXTRACT(YEAR FROM age(date_of_birth))) STORED;
```

```text
RULE 11: generalisation / specialisation (an ISA hierarchy),
         three options and the trade between them:

  SINGLE TABLE + DISCRIMINATOR
     vehicles(id, type, wheels, cargo_capacity, passenger_seats, ...)
     + fast, NO JOINS, one place to query
     - NULLS everywhere, and nothing prevents a car having a
       cargo_capacity

  TABLE PER SUBTYPE (each shares the supertype's PK)
     vehicles(id, make, model)
     cars(id -> vehicles.id, passenger_seats)
     trucks(id -> vehicles.id, cargo_capacity)
     + normalised, NULL-FREE, constraints enforceable per subtype
     - A JOIN per query

  TABLE PER CONCRETE CLASS
     cars(id, make, model, passenger_seats)
     trucks(id, make, model, cargo_capacity)
     + no joins
     - the supertype's columns are DUPLICATED, and a query across
       all subtypes needs a UNION

  the trade is NULLS vs JOINS vs DUPLICATION, and the right answer
  depends on how often you query ACROSS the whole hierarchy.
```

---

### What they ask next

**"Why use Crow's Foot rather than Chen?"**
Compactness. Chen gives every attribute its own ellipse, so a realistic model does not fit on a page, while Crow's Foot lists attributes inside the entity box and encodes cardinality and participation in a single symbol at each line end. Every modern tool uses it.

**"What makes an entity weak?"**
That it cannot be identified by its own attributes alone. It needs its owner's key plus a discriminator, its participation in the identifying relationship is always total, and it is deleted with its owner. The test is whether the thing is identifiable without naming its owner.

**"Where does the foreign key go in a one-to-many?"**
On the many side. A column holds one value, so a child can name one parent and no more, which means the structure itself enforces the cardinality. Putting it on the one side would require storing many values, and a junction table would allow a child to have two parents.

**"How do you represent a many-to-many relationship?"**
A junction table with foreign keys to both entities and a composite primary key of the two. Attributes of the relationship itself, such as a quantity or an enrolment date, belong on that table because they are properties of the pairing rather than of either entity.

**"How does participation affect the schema?"**
It decides nullability. Total participation on the side holding the foreign key means `NOT NULL`; partial means nullable. That is the whole mechanical consequence, and it is why the asymmetry has to be recorded on the diagram.

**"What do you do with a multivalued attribute?"**
Give it its own table keyed by the owner's key plus the value. This is just 1NF: a repeating group cannot sit in a column without destroying the ability to index, join or constrain it.

**"How do you model inheritance?"**
Single table with a discriminator, table per subtype sharing the supertype's key, or table per concrete class. The trade is nulls against joins against duplication, and the deciding factor is how often you query across the whole hierarchy.

**"When is a ternary relationship justified?"**
Only when the three-way association genuinely cannot be decomposed into binary relationships without losing meaning, for example when a supplier supplies a specific part to a specific project and no pair of those alone determines the third. It is rarer than people assume, and splitting into binaries usually loses information.

**The common wrong answer** is describing the shapes and stopping. The valuable half is the **conversion rules**, and in particular the reason behind the one that matters most: in a one-to-many relationship the foreign key goes on the **many** side because **a column holds a single value**, so the structure enforces the cardinality rather than relying on a constraint.

---

### Say this in the interview

*"An ER diagram models data at the conceptual level, before any schema exists, with three building blocks: entities, the things of interest; attributes, their properties; and relationships, the associations between them. Its value is that it is about the business domain rather than storage, so a non-technical stakeholder can read it and tell you it is wrong, which is far cheaper than discovering it after the schema is built. Attributes come in kinds that each convert differently: simple, composite, multivalued, derived and key.*

*Chen's notation is the original and gives every element its own shape: rectangles for entities, ellipses for attributes, diamonds for relationships, with cardinality written on the lines, plus a double rectangle for a weak entity, a double diamond for an identifying relationship, a double line for total participation and a dashed underline for a partial key. It is explicit and complete and enormous, because every attribute is a separate bubble, so a realistic model will not fit on a page, and it survives mainly in teaching. Crow's Foot is the practical standard: rectangles with attributes listed inside, and relationships as lines whose symbols at each end encode cardinality and participation together. The crow's foot means many, the bar means one, the circle means zero or optional, and the symbol nearest the entity describes participation. So exactly one, zero or one, one or more, and zero or more.*

*A strong entity is keyed by its own attributes and exists independently. A weak entity cannot be identified by its own attributes alone: it depends on an owner through an identifying relationship, and its key is the owner's key plus its own partial key or discriminator. An OrderLine is weak with respect to an Order, because line three means nothing without the order. Three properties follow: its participation in the identifying relationship is always total, its key is composite, and it is deleted with its owner, which becomes ON DELETE CASCADE. The test is whether the thing is identifiable without naming its owner.*

*Participation says whether an entity must take part in a relationship. Total means every instance does, drawn as a double line in Chen or the bar in Crow's Foot; partial means it is optional, a single line or the circle. It is normally asymmetric, which is why it has to be recorded: every loan must have a customer, but a customer need not have a loan. And the mechanical consequence is that participation decides nullability, so total participation on the side carrying the foreign key means NOT NULL.*

*The conversion rules, in order. A strong entity becomes a table with its key as the primary key. A weak entity becomes a table whose primary key is the owner's key plus the discriminator, with a NOT NULL foreign key and usually cascade delete. A composite attribute is flattened into columns. A multivalued attribute becomes a separate table keyed by the owner's key plus the value, which is simply 1NF. A derived attribute is normally not stored, or becomes a generated column. A one-to-one relationship puts the foreign key on either side, preferring the one with total participation so it can be NOT NULL, with a UNIQUE constraint, which is what makes it one-to-one rather than one-to-many, and if both sides are total you might merge the tables. A one-to-many relationship puts the foreign key on the many side, and never uses a junction table, because that would permit a child to have two parents; the structure itself enforces the cardinality, since a column holds one value. A many-to-many relationship becomes a junction table with foreign keys to both and a composite primary key, and any attributes of the relationship itself live there because they are properties of the pairing. A ternary relationship becomes a junction table with three foreign keys, and is only justified when it genuinely cannot be decomposed into binaries.*

*And generalisation has three options: a single table with a discriminator and nullable columns, which is fast with no joins but permits nulls nothing prevents being wrong; a table per subtype sharing the supertype's primary key, which is normalised and null-free at the cost of a join; or a table per concrete class, with no joins but duplicated supertype columns and a UNION for cross-hierarchy queries. The trade is nulls against joins against duplication, and it depends on how often you query across the whole hierarchy."*
