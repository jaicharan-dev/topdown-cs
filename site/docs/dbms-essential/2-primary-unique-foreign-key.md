---
id: 2-primary-unique-foreign-key
title: "Primary Key vs. Unique Key vs. Foreign Key"
description: "The practical differences between Primary, Unique, and Foreign keys, including surrogate keys, indexing, and referential integrity."
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a Primary Key, Unique Key, and Foreign Key? When should you choose a Surrogate Key over a Natural Key, and why is it critical in production to manually index Foreign Key columns?"

Think about a passport, a phone number, and a guardian's ID on a school form. A passport number is one-per-person and never blank — that's a primary key. A phone number is also one-per-person, but you're allowed to not have one — that's a unique key. And the "guardian ID" on a child's form only works if that ID actually exists in the parent records — that's a foreign key, pointing back to someone else's primary key.

### The three keys, side by side

<Diagram>
<Row>
<Box label="Primary Key" sub="never NULL" />
<Box label="Unique Key" sub="can be NULL" />
<Box label="Foreign Key" sub="points to a parent" />
</Row>
</Diagram>

| Dimension | Primary Key (PK) | Unique Key (UK) | Foreign Key (FK) |
|---|---|---|---|
| **Purpose** | Identifies each row | Stops duplicates on a business column | Links a child row to a parent row |
| **How many per table** | Exactly one (can span multiple columns) | As many as you want | As many as you want |
| **Can it be NULL?** | Never | Yes (most databases allow several NULLs; SQL Server allows one) | Yes — NULL just means "no parent yet" |
| **Index created automatically?** | Yes, a clustered index (InnoDB, SQL Server) | Yes, a secondary index | No — you have to add one yourself |
| **Can other tables point to it?** | Yes, the usual target | Yes, also a valid target | References someone else's PK or UK |

---

### Picking the primary key: natural vs. surrogate

The real design question isn't "what's a primary key" — it's "which column should it be."

**Natural keys** are real-world values that happen to be unique — email, SSN, a product SKU. The problem: real-world values change. If a user changes their email, every table that references it needs updating, and on a big table that means slow, lock-heavy cascading updates.

**Surrogate keys** are made-up IDs that exist only for the database — an auto-increment integer, or a UUID. They never change, so nothing downstream ever needs to update because of a business change. Most production schemas use these.

Within surrogate keys, there's a performance wrinkle:
- **Auto-increment integers** insert efficiently because each new row just appends to the end of the index — no reshuffling. The downside: sequential IDs leak information (`/orders/105` tells a competitor roughly how many orders you've had), and they're awkward to generate across multiple regions without coordination.
- **Random UUIDs** solve the "generate anywhere" problem, but because the values are random, new rows land all over the index instead of at the end — this causes expensive index rewrites on write-heavy tables.
- **UUIDv7** is the newer middle ground: it starts with a timestamp and adds randomness after, so IDs stay roughly sorted by time (fast to insert) while still being safe to generate independently anywhere.

---

### The trap: foreign keys don't index themselves

Creating a primary or unique key automatically builds an index for you. Creating a foreign key does **not** — not in PostgreSQL, not in MySQL:

```sql
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Here's why that matters: when a row in `users` gets deleted or updated, the database has to check `orders` for anything referencing it. Without an index on `orders.user_id`, that check is a full table scan — on every delete, locking a lot of rows and inviting deadlocks under load.

The fix is simple and easy to forget:

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

**Rule of thumb: always index your foreign key columns yourself.**

---

### What happens when the parent row disappears

A foreign key also defines what the database should do if the row it points to gets deleted or changed:
- **`RESTRICT` / `NO ACTION`** — refuse the delete if children still reference it.
- **`CASCADE`** — delete the children too.
- **`SET NULL`** — keep the children, just clear the foreign key column (the column has to allow NULL).

---

### "Can a table have multiple primary keys?"

No — a table has exactly one primary key. But that one primary key can be made of several columns together, called a **composite primary key**:

```sql
PRIMARY KEY (order_id, product_id)
```

That's one key with two columns, not two keys. Interviewers ask this specifically to see if you confuse the two.

---

### Say this in the interview

*"A Primary Key uniquely identifies a row and can't be NULL. A Unique Key also prevents duplicates but allows NULLs and you can have several. A Foreign Key links a child row to a parent's Primary or Unique Key, and — unlike the other two — it doesn't get an index automatically, so you have to add one yourself."*
