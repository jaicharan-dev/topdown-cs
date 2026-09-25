---
id: 2-primary-unique-foreign-key
title: "Primary Key vs. Unique Key vs. Foreign Key"
description: "Master the architectural differences between Primary, Unique, and Foreign Keys, including surrogate keys, indexing, and referential integrity."
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a Primary Key, Unique Key, and Foreign Key? When should you choose a Surrogate Key over a Natural Key, and why is it critical in production to manually index Foreign Key columns?"

### The Quick Answer

"A **Primary Key** uniquely identifies each row in a table, enforces `NOT NULL`, and establishes the physical clustered index on disk. A **Unique Key** prevents duplicate non-null values across candidate columns (allowing multiple keys per table). A **Foreign Key** links a child column to a parent Primary or Unique Key, enforcing referential integrity to prevent orphan rows."

---

### The Three Keys Compared

| Dimension | Primary Key (PK) | Unique Key (UK) | Foreign Key (FK) |
|---|---|---|---|
| **Primary Purpose** | Unique row identity | Enforces uniqueness on business attributes | Enforces referential integrity between tables |
| **Quantity per Table** | Exactly **one** (single or composite) | **Multiple** allowed per table | **Multiple** allowed per table |
| **NULL Handling** | **Never allowed** (`NOT NULL` mandatory) | Allowed (Standard SQL permits multiple `NULL`s; SQL Server allows one) | Allowed (a `NULL` indicates no parent relationship) |
| **Default Index** | Automatically creates a **Clustered Index** (InnoDB & SQL Server) | Automatically creates a **Non-Clustered (Secondary) Index** | Does **NOT** auto-create an index in most RDBMS |
| **Target of References**| Primary target of foreign keys | Can also be the target of foreign keys | References a parent PK or UK |

---

### System Design: Surrogate Key vs. Natural Key

A classic interview debate focuses on what column(s) should form the Primary Key:

#### 1. Natural Keys (e.g., Email, Social Security Number, SKU)
* Attributes that already exist in the real world and are inherently unique.
* **The Fatal Flaw:** Real-world identifiers change. If a user updates their email or a company rebrands an SKU, the database must execute massive cascading foreign key updates across millions of child records, creating lock contention.

#### 2. Surrogate Keys (e.g., Auto-Increment `BIGINT`, UUID)
* Artificially generated, meaningless keys introduced solely for database architecture.
* **Advantages:** Fixed byte width, completely immutable, and decouples database schema from business logic shifts.

#### 3. Auto-Increment vs. UUID (B+ Tree Performance Trap)
* **Auto-Increment (`BIGINT`):** Sequential integers append directly to the rightmost leaf of the B+ tree index, causing zero page splits. However, sequential numbers leak business metrics (e.g., `/orders/105` reveals order volume) and cannot be generated independently across distributed multi-region databases.
* **Random UUIDv4:** Globally unique without coordination, but completely random bits cause **severe B+ tree page splits** and cache pollution on write-heavy tables.
* **Modern Solution (UUIDv7):** Combines a 48-bit UNIX timestamp with random bits, producing globally unique identifiers that remain **time-ordered**, preserving sequential B+ tree insertion speed.

---

### The Production Performance Trap: Indexing Foreign Keys

While creating a Primary or Unique Key automatically builds an underlying B-Tree index, **creating a Foreign Key does NOT automatically index the child column** in engines like PostgreSQL and MySQL:

```sql
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

* **Why this destroys performance:**
  When a record in the `users` table is deleted or updated (`DELETE FROM users WHERE id = 10`), the database must check the `orders` table to enforce referential integrity.
* Without an explicit index on `orders.user_id`, the database must execute a **Full Table Scan on the entire `orders` table**, locking thousands of pages and triggering deadlocks under high concurrency.
* **The Rule:** In production, **always create an explicit index on foreign key columns**:
  ```sql
  CREATE INDEX idx_orders_user_id ON orders(user_id);
  ```

---

### Referential Integrity Actions

When a parent row is deleted or updated, the foreign key defines how the database reacts:
* **`ON DELETE RESTRICT / NO ACTION`:** Aborts and rejects the parent delete if child records exist.
* **`ON DELETE CASCADE`:** Automatically deletes all referencing child rows when the parent is deleted.
* **`ON DELETE SET NULL`:** Retains child records but sets the foreign key column to `NULL` (requires column to be nullable).

---

### The ELI5 Analogy: Passports and Citizens

* **Primary Key (Passport Number):** Every citizen has exactly one passport number. No two citizens can share one, and nobody can have a "blank" passport number. It is your permanent physical identifier.
* **Unique Key (Phone Number & Email):** You can have a unique phone number and unique email. You might have zero phone numbers (NULL), but if you do have one, no other person can share your exact number.
* **Foreign Key (Parent Guardian ID):** On a child's school application, the "Guardian ID" references the Parent's Passport Number. The school will not allow a child to register with a guardian ID that does not exist in the citizen database.

---

### Crucial Nuance: Composite Primary Key vs. Multiple Primary Keys

Interviewers often ask: *"Can a table have multiple primary keys?"* 
The strict technical answer is **No**—a table can only have **one** primary key. However, that single primary key can consist of **multiple columns** working together, known as a **Composite Primary Key** (e.g., `PRIMARY KEY (order_id, product_id)`). Do not confuse having multiple columns in one composite key with having multiple distinct primary keys.
