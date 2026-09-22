---
id: 2-primary-unique-foreign-key
title: "Primary Key vs. Unique Key vs. Foreign Key"
description: "Master the architectural differences between Primary, Unique, and Foreign Keys, including indexing, nullability, and referential actions."
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a Primary Key, Unique Key, and Foreign Key? Can a table have multiple Primary Keys or Unique Keys, and how do they handle NULL values?"

In relational database design, constraints enforce entity integrity and referential relationships across tables. The three fundamental keys are **Primary Key**, **Unique Key**, and **Foreign Key**.

---

### The Three Keys Compared

| Dimension | Primary Key (PK) | Unique Key (UK) | Foreign Key (FK) |
| :--- | :--- | :--- | :--- |
| **Primary Purpose** | Uniquely identifies every record in a table | Enforces uniqueness on candidate attributes | Enforces referential integrity between two tables |
| **Quantity per Table** | Exactly **one** (single or composite) | **Multiple** allowed per table | **Multiple** allowed per table |
| **NULL Handling** | **Never allowed** (`NOT NULL` strictly enforced) | Allowed (Standard SQL permits multiple NULLs; SQL Server permits only one) | Allowed (a NULL indicates no associated parent record) |
| **Default Index** | Automatically creates a **Clustered Index** (in MySQL InnoDB & SQL Server) | Automatically creates a **Non-Clustered (Secondary) Index** | Does **not** auto-create an index in most RDBMS; must be indexed manually |
| **Referenced By** | Often target of Foreign Keys | Can also be the target of Foreign Keys | References a PK or UK in a parent table |

---

### Technical Breakdown

#### 1. Primary Key
A Primary Key is the unique identifier chosen by the schema designer as the primary handle for a record. 
- In MySQL InnoDB, the Primary Key defines the **physical organization** of the table on disk (the clustered B+ tree). If you do not define a Primary Key, InnoDB searches for the first `UNIQUE NOT NULL` column, or silently creates an internal 6-byte row ID (`DB_ROW_ID`).

```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY, -- Clustered Index, NOT NULL
    email VARCHAR(255) NOT NULL UNIQUE, -- Secondary Index
    referral_code VARCHAR(50) UNIQUE, -- Secondary Index, allows NULL
    referred_by_user_id BIGINT,
    CONSTRAINT fk_referral FOREIGN KEY (referred_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);
```

#### 2. Unique Key
A Unique Key ensures that no two rows have matching non-null values in the specified column(s). Unlike a Primary Key:
- A table can have dozens of Unique Keys (e.g., `email`, `phone_number`, `ssn`).
- Standard ANSI SQL allows multiple `NULL` values in a unique column because `NULL != NULL` (unknown is not equal to unknown). However, Microsoft SQL Server strictly permits only a single `NULL` under a standard unique constraint.

#### 3. Foreign Key & Referential Actions
A Foreign Key links a child table's column to a parent table's Primary or Unique Key. It prevents **orphan records**.
When a parent record is updated or deleted, the Foreign Key's referential action dictates database behavior:
- `ON DELETE RESTRICT / NO ACTION`: Rejects the parent deletion if any child rows reference it.
- `ON DELETE CASCADE`: Automatically deletes all referencing child rows when the parent row is deleted.
- `ON DELETE SET NULL`: Sets the child column's value to `NULL` (requires the child column to be nullable).

---

### The ELI5 Analogy: Passports and Citizens

- **Primary Key (Passport Number):** Every citizen has exactly one passport number. No two citizens can share one, and nobody can have a "blank" passport number. It is your ultimate physical identifier.
- **Unique Key (Phone Number & Email):** You can have a unique phone number and unique email. You might have zero phone numbers (NULL), but if you do have one, no other person can share your exact number.
- **Foreign Key (Parent Guardian ID):** On a child's school application, the "Guardian ID" references the Parent's Passport Number. The school will not allow a child to register with a guardian ID that does not exist in the citizen database.

---

### Summary
"A Primary Key uniquely identifies rows, prohibits NULLs, and dictates the table's clustered index. A Unique Key prevents duplicate non-null entries across secondary columns, permitting multiple keys per table. A Foreign Key enforces referential integrity by pointing to a parent table's primary or unique key, preventing orphaned data."

---

### Crucial Nuance: Composite Primary Key vs. Multiple Primary Keys
Interviewers often ask: *"Can a table have multiple primary keys?"* 
The strict technical answer is **No**—a table can only have **one** primary key. However, that single primary key can consist of **multiple columns** working together, known as a **Composite Primary Key** (e.g., `PRIMARY KEY (order_id, product_id)`). Do not confuse having multiple columns in one composite key with having multiple distinct primary keys.
